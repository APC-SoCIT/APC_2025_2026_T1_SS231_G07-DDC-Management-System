#!/bin/bash
# Azure Startup Script for Django Backend
set -e  # Exit immediately on any unhandled error

# Change to the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "========================================"
echo "  Starting Django application"
echo "  Path: $(pwd)"
echo "========================================"

# ── 1. Required environment variable check ───────────────────────────────────
echo "[startup] Checking required environment variables..."
MISSING=()
[ -z "$SECRET_KEY" ]     && MISSING+=("SECRET_KEY")
[ -z "$DATABASE_URL" ]   && MISSING+=("DATABASE_URL")
[ -z "$GEMINI_API_KEY" ] && MISSING+=("GEMINI_API_KEY")
if [ ${#MISSING[@]} -gt 0 ]; then
  echo "❌ FATAL: Missing required environment variables: ${MISSING[*]}"
  echo "   Set them in Azure Portal → App Service → Settings → Environment variables"
  exit 1
fi
echo "✅ All required environment variables are set."

# ── 2. pgvector availability check (non-fatal, but logs clearly) ─────────────
echo "[startup] Checking pgvector availability..."
python -c "import pgvector; print('✅ pgvector available:', pgvector.__version__)" 2>/dev/null \
  || echo "⚠️  WARNING: pgvector is not installed — RAG will use slower JSON embeddings. Add pgvector to requirements.txt."

# ── 3. Run database migrations (FATAL if this fails) ─────────────────────────
echo "[startup] Running database migrations..."
python manage.py migrate --noinput
echo "✅ Migrations complete."

# ── 4. Non-fatal setup tasks ─────────────────────────────────────────────────
echo "[startup] Updating patient active statuses..."
python manage.py update_patient_status || echo "⚠️  update_patient_status failed (non-fatal)"

echo "[startup] Setting up clinic locations..."
python manage.py create_clinics --skip-services || echo "⚠️  create_clinics failed (non-fatal, may already exist)"

# ── 5. Chatbot / RAG readiness check (non-fatal, logs clearly) ───────────────
echo "[startup] Checking AI chatbot readiness..."
python -c "
import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'dental_clinic.settings')
django.setup()
from api.rag.embedding_service import generate_embedding
e = generate_embedding('startup-check')
if e:
    print(f'✅ Chatbot/RAG ready — embedding dim={len(e)}')
else:
    print('⚠️  WARNING: Chatbot embedding returned None — check GEMINI_API_KEY and RAG index')
" 2>&1 || echo "⚠️  Chatbot readiness check failed (non-fatal — app will still start)"

# Skip collectstatic - already done during build (GitHub Actions)

# ── 6. Start Gunicorn ─────────────────────────────────────────────────────────
echo "========================================"
echo "  Starting Gunicorn server"
echo "========================================"
exec gunicorn dental_clinic.wsgi \
  --bind=0.0.0.0:8000 \
  --workers=4 \
  --threads=2 \
  --timeout=120 \
  --log-level=info \
  --access-logfile '-' \
  --error-logfile '-'
