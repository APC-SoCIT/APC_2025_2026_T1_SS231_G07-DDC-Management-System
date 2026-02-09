#!/bin/bash
# Azure Startup Script for Django Backend

echo "Starting Django application..."
cd /home/site/wwwroot

# Run migrations
echo "Running database migrations..."
python manage.py migrate --noinput

# Create initial data if needed
echo "Setting up initial data..."
python manage.py create_clinics --skip-services || echo "Clinics already exist"

# Collect static files
echo "Collecting static files..."
python manage.py collectstatic --noinput

# Start Gunicorn
echo "Starting Gunicorn server..."
gunicorn dental_clinic.wsgi --bind=0.0.0.0:8000 --workers=4 --threads=2 --timeout=120 --log-level=info --access-logfile '-' --error-logfile '-'
