"""
System Validation Service
─────────────────────────
Validates environment, database tables, and RAG readiness at startup.
Prevents the chatbot from serving degraded responses silently.

Supports:
- LOCAL (SQLite): validates db.sqlite3, required tables, embeddings
- PRODUCTION (Supabase/Postgres): validates connection, tables, embeddings

Usage:
    from api.services.system_validation import validate_environment, get_validation_status

    # Call at startup (e.g., in AppConfig.ready or wsgi.py)
    validate_environment()
"""

import logging
import os
from pathlib import Path
from typing import Dict, Any, List

from django.conf import settings

logger = logging.getLogger('chatbot.validation')

# ── Environment Detection ──────────────────────────────────────────────────

def detect_environment() -> str:
    """
    Detect current environment.

    Priority:
    1. Explicit ENV variable
    2. DATABASE_URL presence (indicates production)
    3. Default to 'local'
    """
    explicit = os.environ.get('ENV', '').lower().strip()
    if explicit in ('production', 'prod'):
        return 'production'
    if explicit in ('local', 'dev', 'development'):
        return 'local'

    # Auto-detect from DATABASE_URL
    db_url = os.environ.get('DATABASE_URL', '')
    if db_url and ('postgres' in db_url or 'supabase' in db_url):
        return 'production'

    return 'local'


def is_local() -> bool:
    return detect_environment() == 'local'


def is_production() -> bool:
    return detect_environment() == 'production'


# ── Required Tables ────────────────────────────────────────────────────────

REQUIRED_TABLES = [
    'api_user',           # patients / dentists / staff
    'api_service',        # dental services
    'api_appointment',    # appointments
    'api_pagechunk',      # RAG embeddings
]

REQUIRED_DATA_TABLES = [
    'api_service',        # must have services
]


# ── Validation Results ─────────────────────────────────────────────────────

class ValidationResult:
    """Holds validation results."""

    def __init__(self):
        self.environment: str = 'unknown'
        self.is_valid: bool = False
        self.checks: Dict[str, bool] = {}
        self.errors: List[str] = []
        self.warnings: List[str] = []
        self.rag_status: str = 'unknown'
        self.embedding_count: int = 0
        self.service_count: int = 0
        self.dentist_count: int = 0

    def to_dict(self) -> Dict[str, Any]:
        return {
            'environment': self.environment,
            'is_valid': self.is_valid,
            'checks': self.checks,
            'errors': self.errors,
            'warnings': self.warnings,
            'rag_status': self.rag_status,
            'embedding_count': self.embedding_count,
            'service_count': self.service_count,
            'dentist_count': self.dentist_count,
        }


# Module-level cache
_last_validation: ValidationResult = None


# ── Core Validation ────────────────────────────────────────────────────────

def validate_environment(raise_on_failure: bool = False) -> ValidationResult:
    """
    Validate the current environment and database state.

    Args:
        raise_on_failure: If True, raise RuntimeError on critical failures.

    Returns:
        ValidationResult with details of all checks.
    """
    global _last_validation
    result = ValidationResult()
    result.environment = detect_environment()

    logger.info("=== SYSTEM VALIDATION START (env=%s) ===", result.environment)

    try:
        if result.environment == 'local':
            _validate_local(result)
        else:
            _validate_production(result)

        # Common checks
        _validate_data_availability(result)
        _validate_rag_index(result)

    except Exception as e:
        result.errors.append(f"Validation error: {str(e)[:200]}")
        logger.error("CRITICAL_VALIDATION_ERROR: %s", e)

    # Determine overall validity
    result.is_valid = len(result.errors) == 0

    # Log results
    if result.is_valid:
        logger.info(
            "=== SYSTEM VALIDATION PASSED (env=%s, embeddings=%d, services=%d, dentists=%d) ===",
            result.environment, result.embedding_count,
            result.service_count, result.dentist_count,
        )
    else:
        for err in result.errors:
            logger.critical("SYSTEM VALIDATION FAILED: %s", err)
        if result.warnings:
            for warn in result.warnings:
                logger.warning("VALIDATION WARNING: %s", warn)

    _last_validation = result

    if raise_on_failure and not result.is_valid:
        error_msg = "; ".join(result.errors)
        if result.environment == 'local':
            raise RuntimeError(f"LOCAL DATABASE NOT INITIALIZED OR RAG EMPTY: {error_msg}")
        else:
            raise RuntimeError(f"PRODUCTION DATABASE OR VECTOR STORE NOT INITIALIZED: {error_msg}")

    return result


def _validate_local(result: ValidationResult):
    """Validate local SQLite environment."""
    from django.db import connection

    # Check db.sqlite3 exists
    db_path = settings.BASE_DIR / 'db.sqlite3'
    if db_path.exists():
        result.checks['db_file_exists'] = True
        logger.info("  [OK] db.sqlite3 exists at %s", db_path)
    else:
        result.checks['db_file_exists'] = False
        result.errors.append(f"db.sqlite3 not found at {db_path}")
        logger.error("CRITICAL_RAG_EMPTY_LOCAL: db.sqlite3 not found")
        return

    # Check required tables exist
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
            existing_tables = {row[0] for row in cursor.fetchall()}

        all_tables_exist = True
        for table in REQUIRED_TABLES:
            if table in existing_tables:
                result.checks[f'table_{table}'] = True
            else:
                result.checks[f'table_{table}'] = False
                all_tables_exist = False
                result.warnings.append(f"Table '{table}' not found in SQLite")

        if not all_tables_exist:
            result.warnings.append("Some required tables missing — run migrations")

    except Exception as e:
        result.errors.append(f"SQLite table check failed: {e}")
        logger.error("CRITICAL_RAG_EMPTY_LOCAL: table check failed: %s", e)


def _validate_production(result: ValidationResult):
    """Validate production Postgres/Supabase environment."""
    from django.db import connection

    # Check database connection
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        result.checks['db_connection'] = True
        logger.info("  [OK] Database connection successful")
    except Exception as e:
        result.checks['db_connection'] = False
        result.errors.append(f"Database connection failed: {e}")
        logger.error("CRITICAL_RAG_EMPTY_PRODUCTION: DB connection failed: %s", e)
        return

    # Check pgvector extension (optional — we use JSON embeddings as fallback)
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1 FROM pg_extension WHERE extname = 'vector'")
            has_pgvector = cursor.fetchone() is not None
        result.checks['pgvector_extension'] = has_pgvector
        if has_pgvector:
            logger.info("  [OK] pgvector extension enabled")
        else:
            result.warnings.append("pgvector extension not enabled — using JSON embeddings")
            logger.warning("pgvector not enabled — using JSON-based embeddings")
    except Exception:
        result.checks['pgvector_extension'] = False
        result.warnings.append("Could not check pgvector extension")

    # Check required tables
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
            )
            existing_tables = {row[0] for row in cursor.fetchall()}

        for table in REQUIRED_TABLES:
            if table in existing_tables:
                result.checks[f'table_{table}'] = True
            else:
                result.checks[f'table_{table}'] = False
                result.warnings.append(f"Table '{table}' not found")

    except Exception as e:
        result.errors.append(f"Table check failed: {e}")
        logger.error("CRITICAL_RAG_EMPTY_PRODUCTION: table check failed: %s", e)


def _validate_data_availability(result: ValidationResult):
    """Validate that essential data exists in the database."""
    try:
        from api.models import Service, User

        # Check services
        result.service_count = Service.objects.count()
        if result.service_count > 0:
            result.checks['services_exist'] = True
            logger.info("  [OK] %d services found", result.service_count)
        else:
            result.checks['services_exist'] = False
            result.warnings.append("No services found in database")
            logger.warning("No dental services in database — chatbot may give incomplete answers")

        # Check dentists
        result.dentist_count = User.objects.filter(role='dentist').count()
        if result.dentist_count > 0:
            result.checks['dentists_exist'] = True
            logger.info("  [OK] %d dentists found", result.dentist_count)
        else:
            result.checks['dentists_exist'] = False
            result.warnings.append("No dentists found in database")
            logger.warning("No dentists in database — chatbot may give incomplete answers")

    except Exception as e:
        result.warnings.append(f"Data availability check failed: {e}")
        logger.warning("Data availability check error: %s", e)


def _validate_rag_index(result: ValidationResult):
    """Validate RAG embeddings index."""
    try:
        from api.models import PageChunk

        total_chunks = PageChunk.objects.count()
        chunks_with_embeddings = PageChunk.objects.exclude(embedding=[]).count()

        result.embedding_count = chunks_with_embeddings

        if total_chunks > 0 and chunks_with_embeddings > 0:
            result.checks['rag_index_populated'] = True
            result.rag_status = 'ready'
            logger.info("  [OK] RAG index: %d chunks, %d with embeddings",
                        total_chunks, chunks_with_embeddings)
        elif total_chunks > 0:
            result.checks['rag_index_populated'] = False
            result.rag_status = 'chunks_no_embeddings'
            result.warnings.append(
                f"RAG: {total_chunks} chunks exist but {chunks_with_embeddings} have embeddings"
            )
            logger.warning("RAG chunks exist but lack embeddings")
        else:
            result.checks['rag_index_populated'] = False
            result.rag_status = 'empty'
            result.warnings.append("RAG index is empty — chatbot will use DB context only")
            logger.warning(
                "CRITICAL_RAG_EMPTY_%s: No page chunks indexed",
                result.environment.upper(),
            )

    except Exception as e:
        result.checks['rag_index_populated'] = False
        result.rag_status = 'error'
        result.warnings.append(f"RAG validation error: {e}")
        logger.warning("RAG validation error: %s", e)


# ── Public Accessors ───────────────────────────────────────────────────────

def get_validation_status() -> Dict[str, Any]:
    """Get the last validation result (or run validation if not yet done)."""
    global _last_validation
    if _last_validation is None:
        validate_environment()
    return _last_validation.to_dict()


def is_rag_available() -> bool:
    """Check if RAG index is populated and usable."""
    global _last_validation
    if _last_validation is None:
        validate_environment()
    return _last_validation.rag_status == 'ready'


def get_environment() -> str:
    """Get detected environment name."""
    return detect_environment()
