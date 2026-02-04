#!/bin/bash

# Railway Release Script
# This runs automatically on every deployment before the app starts

set -e  # Exit on error

echo "🚀 Starting Railway Release Process..."
echo "================================================"

# 1. Run database migrations
echo "📦 Running database migrations..."
python manage.py migrate --noinput
echo "✅ Migrations complete!"
echo ""

# 2. Create/Update clinic locations with color-coding
echo "🏥 Setting up clinic locations..."
python manage.py create_clinics --skip-services
echo "✅ Clinics configured!"
echo ""

# 3. Collect static files (if needed)
echo "📁 Collecting static files..."
python manage.py collectstatic --noinput --clear
echo "✅ Static files collected!"
echo ""

echo "================================================"
echo "✅ Release process complete! Starting server..."
