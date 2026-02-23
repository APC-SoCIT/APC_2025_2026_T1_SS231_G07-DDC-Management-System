#!/bin/bash

# Build script for Vercel
echo "Installing dependencies..."
pip install -r requirements.txt

echo "Collecting static files..."
python manage.py collectstatic --noinput

echo "Running migrations..."
python manage.py migrate --noinput

echo "Setting up clinic locations..."
python manage.py create_clinics --skip-services || echo "Clinics already exist or command failed (non-fatal)"

echo "Updating patient statuses..."
python manage.py update_patient_status || echo "update_patient_status failed (non-fatal)"

echo "Build complete!"
