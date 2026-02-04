#!/bin/bash

# First-Time Backend Setup Script for Windows (Git Bash/WSL)
# This script automates the entire backend setup process

set -e  # Exit on error

echo "========================================================================"
echo "🚀 DOROTHEO DENTAL CLINIC - BACKEND FIRST-TIME SETUP"
echo "========================================================================"
echo ""

# Check if Python is installed
echo "📌 Step 1/7: Checking Python installation..."
if ! command -v python &> /dev/null && ! command -v python3 &> /dev/null; then
    echo "❌ Python is not installed!"
    echo "Please install Python 3.11+ from https://www.python.org/downloads/"
    exit 1
fi

PYTHON_CMD="python"
if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
fi

PYTHON_VERSION=$($PYTHON_CMD --version 2>&1 | awk '{print $2}')
echo "✅ Found Python $PYTHON_VERSION"
echo ""

# Check if we're in the backend directory
if [ ! -f "manage.py" ]; then
    echo "❌ Error: manage.py not found!"
    echo "Please run this script from the backend/ directory"
    exit 1
fi

# Step 2: Create virtual environment
echo "📌 Step 2/7: Creating virtual environment..."
if [ -d "venv" ]; then
    echo "⚠️  Virtual environment already exists. Skipping creation."
else
    $PYTHON_CMD -m venv venv
    echo "✅ Virtual environment created!"
fi
echo ""

# Step 3: Activate virtual environment and install dependencies
echo "📌 Step 3/7: Installing dependencies..."
if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
    # Windows Git Bash
    source venv/Scripts/activate
else
    # Linux/Mac
    source venv/bin/activate
fi

pip install --upgrade pip
pip install -r requirements.txt
echo "✅ All dependencies installed!"
echo ""

# Step 4: Run migrations
echo "📌 Step 4/7: Setting up database..."
python manage.py migrate --noinput
echo "✅ Database created and migrations applied!"
echo ""

# Step 5: Create clinic locations
echo "📌 Step 5/7: Creating clinic locations..."
python manage.py create_clinics
echo "✅ Clinic locations configured!"
echo ""

# Step 6: Create initial accounts
echo "📌 Step 6/7: Creating initial user accounts..."
if [ -f "create_initial_accounts.py" ]; then
    python create_initial_accounts.py
    echo "✅ Initial accounts created!"
else
    echo "⚠️  create_initial_accounts.py not found. Skipping..."
fi
echo ""

# Step 7: Summary
echo "========================================================================"
echo "✅ BACKEND SETUP COMPLETE!"
echo "========================================================================"
echo ""
echo "📋 What was set up:"
echo "   ✅ Virtual environment (venv/)"
echo "   ✅ Python dependencies installed"
echo "   ✅ Database created (db.sqlite3)"
echo "   ✅ All migrations applied"
echo "   ✅ 3 clinic locations created (Bacoor, Alabang, Poblacion)"
echo "   ✅ Initial user accounts created"
echo ""
echo "🔐 Login Credentials:"
echo "   Owner:        owner@admin.dorotheo.com / owner123"
echo "   Receptionist: receptionist@gmail.com / Receptionist2546!"
echo "   Dentist:      dentist@gmail.com / Dentist2546!"
echo "   Patient:      airoravinera@gmail.com / Airo2546!"
echo ""
echo "🚀 To start the development server:"
echo "   1. Activate virtual environment:"
if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
    echo "      source venv/Scripts/activate"
else
    echo "      source venv/bin/activate"
fi
echo "   2. Run server:"
echo "      python manage.py runserver"
echo ""
echo "🌐 Server will be available at: http://localhost:8000"
echo "🔧 Django Admin Panel: http://localhost:8000/admin"
echo ""
echo "========================================================================"
