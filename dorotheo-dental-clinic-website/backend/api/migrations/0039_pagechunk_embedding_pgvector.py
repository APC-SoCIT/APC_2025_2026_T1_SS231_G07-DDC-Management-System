"""
Migration: Upgrade PageChunk.embedding from JSONField → pgvector VectorField

Steps:
  1. Enable pgvector extension in Postgres (idempotent)
  2. Add temp column 'embedding_vec' (VectorField, nullable)
  3. Backfill — copy existing JSON embeddings into the vector column
  4. Drop the old 'embedding' JSONField
  5. Rename 'embedding_vec' → 'embedding'
  6. Create ivfflat cosine-similarity index

⚠️  Run in Supabase BEFORE deploying:
      CREATE EXTENSION IF NOT EXISTS vector;
    (This migration also runs it, but having it pre-enabled is safer.)

⚠️  EMBEDDING DIMENSION must match your model.
    gemini-embedding-001 → 3072 dims (default below).
    Verify: open Django shell → from api.rag.embedding_service import generate_embedding
            e = generate_embedding("test"); print(len(e))
    If different, change EMBEDDING_DIM below AND in api/models.py BEFORE migrating.
"""

from django.db import migrations
from pgvector.django import VectorField

# ── CHANGE THIS if your embedding dimension differs ─────────────────────────
EMBEDDING_DIM = 3072


def _is_postgres(schema_editor):
    return schema_editor.connection.vendor == 'postgresql'


def enable_pgvector(apps, schema_editor):
    if _is_postgres(schema_editor):
        schema_editor.execute("CREATE EXTENSION IF NOT EXISTS vector;")


def backfill_embeddings(apps, schema_editor):
    """
    Copy existing JSON embeddings into the new vector column using raw SQL.
    Postgres only — jsonb::text is already '[1.0, 2.0, ...]' which pgvector accepts.
    """
    if not _is_postgres(schema_editor):
        return
    schema_editor.execute("""
        UPDATE api_pagechunk
        SET embedding_vec = CASE
            WHEN embedding IS NOT NULL
                 AND jsonb_typeof(embedding) = 'array'
                 AND jsonb_array_length(embedding) > 0
            THEN embedding::text::vector
            ELSE NULL
        END
    """)


def add_vector_field(apps, schema_editor):
    """Add VectorField column on PostgreSQL, skip on SQLite."""
    if not _is_postgres(schema_editor):
        return
    PageChunk = apps.get_model('api', 'PageChunk')
    field = VectorField(dimensions=EMBEDDING_DIM, null=True, blank=True)
    field.set_attributes_from_name('embedding_vec')
    with schema_editor.connection.schema_editor() as se:
        se.add_field(PageChunk, field)


def remove_old_field(apps, schema_editor):
    """Remove old JSONField and rename vec field on PostgreSQL, skip on SQLite."""
    if not _is_postgres(schema_editor):
        return
    PageChunk = apps.get_model('api', 'PageChunk')
    # Drop old embedding JSONField
    for f in PageChunk._meta.local_fields:
        if f.name == 'embedding':
            with schema_editor.connection.schema_editor() as se:
                se.remove_field(PageChunk, f)
            break


def rename_vec_field(apps, schema_editor):
    """Rename embedding_vec → embedding on PostgreSQL, skip on SQLite."""
    if not _is_postgres(schema_editor):
        return
    schema_editor.execute(
        "ALTER TABLE api_pagechunk RENAME COLUMN embedding_vec TO embedding;"
    )


def create_ivfflat_index(apps, schema_editor):
    if not _is_postgres(schema_editor):
        return
    schema_editor.execute("""
        CREATE INDEX IF NOT EXISTS pagechunk_embedding_cosine_idx
        ON api_pagechunk
        USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 50);
    """)


class Migration(migrations.Migration):
    """
    Upgrade PageChunk.embedding from JSONField → pgvector VectorField.
    Completely skipped on non-PostgreSQL backends (e.g. SQLite for tests).
    """

    dependencies = [
        ('api', '0038_add_patient_pagination_indexes'),
    ]

    operations = [
        # ── 1. Enable pgvector ─────────────────────────────────────────────
        migrations.RunPython(enable_pgvector, migrations.RunPython.noop),

        # ── 2-6. All pgvector operations wrapped in RunPython for safety ───
        # On SQLite these are all no-ops; the model keeps JSONField
        migrations.RunPython(add_vector_field, migrations.RunPython.noop),
        migrations.RunPython(backfill_embeddings, migrations.RunPython.noop),
        migrations.RunPython(remove_old_field, migrations.RunPython.noop),
        migrations.RunPython(rename_vec_field, migrations.RunPython.noop),
        migrations.RunPython(create_ivfflat_index, migrations.RunPython.noop),
    ]
