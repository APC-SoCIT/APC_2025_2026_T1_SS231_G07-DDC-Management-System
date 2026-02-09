#!/bin/bash
# Azure Startup Script for Django Backend

# Change to the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "Starting Django application from: $(pwd)"
echo "Contents: $(ls -la)"

# Run migrations only if needed (check-only mode is fast)
echo "Checking database migrations..."
python manage.py migrate --check || python manage.py migrate --noinput

# Create initial data if needed
echo "Setting up initial data..."
python manage.py create_clinics --skip-services || echo "Clinics already exist"

# Skip collectstatic - already done during build
# Static files are collected in the GitHub Action workflow

# Start Gunicorn
echo "Starting Gunicorn server..."
gunicorn dental_clinic.wsgi --bind=0.0.0.0:8000 --workers=4 --threads=2 --timeout=120 --log-level=info --access-logfile '-' --error-logfile '-'
