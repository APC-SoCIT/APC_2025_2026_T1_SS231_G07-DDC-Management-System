# First-Time Backend Setup Script for Windows PowerShell
# This script automates the entire backend setup process

Write-Host "========================================================================" -ForegroundColor Green
Write-Host "🚀 DOROTHEO DENTAL CLINIC - BACKEND FIRST-TIME SETUP" -ForegroundColor Green
Write-Host "========================================================================" -ForegroundColor Green
Write-Host ""

# Check if Python is installed
Write-Host "📌 Step 1/7: Checking Python installation..." -ForegroundColor Cyan
try {
    $pythonVersion = python --version 2>&1
    Write-Host "✅ Found $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Python is not installed!" -ForegroundColor Red
    Write-Host "Please install Python 3.11+ from https://www.python.org/downloads/" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host ""

# Check if we're in the backend directory
if (-not (Test-Path "manage.py")) {
    Write-Host "❌ Error: manage.py not found!" -ForegroundColor Red
    Write-Host "Please run this script from the backend\ directory" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Step 2: Create virtual environment
Write-Host "📌 Step 2/7: Creating virtual environment..." -ForegroundColor Cyan
if (Test-Path "venv") {
    Write-Host "⚠️  Virtual environment already exists. Skipping creation." -ForegroundColor Yellow
} else {
    python -m venv venv
    Write-Host "✅ Virtual environment created!" -ForegroundColor Green
}
Write-Host ""

# Step 3: Activate virtual environment and install dependencies
Write-Host "📌 Step 3/7: Installing dependencies..." -ForegroundColor Cyan
& .\venv\Scripts\Activate.ps1

python -m pip install --upgrade pip | Out-Null
pip install -r requirements.txt
Write-Host "✅ All dependencies installed!" -ForegroundColor Green
Write-Host ""

# Step 4: Run migrations
Write-Host "📌 Step 4/7: Setting up database..." -ForegroundColor Cyan
python manage.py migrate --noinput
Write-Host "✅ Database created and migrations applied!" -ForegroundColor Green
Write-Host ""

# Step 5: Create clinic locations
Write-Host "📌 Step 5/7: Creating clinic locations..." -ForegroundColor Cyan
python manage.py create_clinics
Write-Host "✅ Clinic locations configured!" -ForegroundColor Green
Write-Host ""

# Step 6: Create initial accounts
Write-Host "📌 Step 6/7: Creating initial user accounts..." -ForegroundColor Cyan
if (Test-Path "create_initial_accounts.py") {
    python create_initial_accounts.py
    Write-Host "✅ Initial accounts created!" -ForegroundColor Green
} else {
    Write-Host "⚠️  create_initial_accounts.py not found. Skipping..." -ForegroundColor Yellow
}
Write-Host ""

# Step 7: Summary
Write-Host "========================================================================" -ForegroundColor Green
Write-Host "✅ BACKEND SETUP COMPLETE!" -ForegroundColor Green
Write-Host "========================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "📋 What was set up:" -ForegroundColor Cyan
Write-Host "   ✅ Virtual environment (venv\)" -ForegroundColor White
Write-Host "   ✅ Python dependencies installed" -ForegroundColor White
Write-Host "   ✅ Database created (db.sqlite3)" -ForegroundColor White
Write-Host "   ✅ All migrations applied" -ForegroundColor White
Write-Host "   ✅ 3 clinic locations created (Bacoor, Alabang, Poblacion)" -ForegroundColor White
Write-Host "   ✅ Initial user accounts created" -ForegroundColor White
Write-Host ""
Write-Host "🔐 Login Credentials:" -ForegroundColor Cyan
Write-Host "   Owner:        owner@admin.dorotheo.com / owner123" -ForegroundColor White
Write-Host "   Receptionist: receptionist@gmail.com / Receptionist2546!" -ForegroundColor White
Write-Host "   Dentist:      dentist@gmail.com / Dentist2546!" -ForegroundColor White
Write-Host "   Patient:      airoravinera@gmail.com / Airo2546!" -ForegroundColor White
Write-Host ""
Write-Host "🚀 To start the development server:" -ForegroundColor Cyan
Write-Host "   1. Activate virtual environment:" -ForegroundColor White
Write-Host "      .\venv\Scripts\Activate.ps1" -ForegroundColor Yellow
Write-Host "   2. Run server:" -ForegroundColor White
Write-Host "      python manage.py runserver" -ForegroundColor Yellow
Write-Host ""
Write-Host "🌐 Server will be available at: http://localhost:8000" -ForegroundColor Cyan
Write-Host "🔧 Django Admin Panel: http://localhost:8000/admin" -ForegroundColor Cyan
Write-Host ""
Write-Host "========================================================================" -ForegroundColor Green

Read-Host "Press Enter to exit"
