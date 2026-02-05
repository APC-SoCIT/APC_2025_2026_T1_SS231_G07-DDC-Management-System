@echo off
REM First-Time Backend Setup Script for Windows (PowerShell/CMD)
REM This script automates the entire backend setup process

echo ========================================================================
echo 🚀 DOROTHEO DENTAL CLINIC - BACKEND FIRST-TIME SETUP
echo ========================================================================
echo.

REM Check if Python is installed
echo 📌 Step 1/7: Checking Python installation...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python is not installed!
    echo Please install Python 3.11+ from https://www.python.org/downloads/
    pause
    exit /b 1
)

for /f "tokens=2" %%i in ('python --version 2^>^&1') do set PYTHON_VERSION=%%i
echo ✅ Found Python %PYTHON_VERSION%
echo.

REM Check if we're in the backend directory
if not exist "manage.py" (
    echo ❌ Error: manage.py not found!
    echo Please run this script from the backend\ directory
    pause
    exit /b 1
)

REM Step 2: Create virtual environment
echo 📌 Step 2/7: Creating virtual environment...
if exist "venv\" (
    echo ⚠️  Virtual environment already exists. Skipping creation.
) else (
    python -m venv venv
    echo ✅ Virtual environment created!
)
echo.

REM Step 3: Activate virtual environment and install dependencies
echo 📌 Step 3/7: Installing dependencies...
call venv\Scripts\activate.bat

python -m pip install --upgrade pip
pip install -r requirements.txt
echo ✅ All dependencies installed!
echo.

REM Step 4: Run migrations
echo 📌 Step 4/7: Setting up database...
python manage.py migrate --noinput
echo ✅ Database created and migrations applied!
echo.

REM Step 5: Create clinic locations
echo 📌 Step 5/7: Creating clinic locations...
python manage.py create_clinics
echo ✅ Clinic locations configured!
echo.

REM Step 6: Create initial accounts
echo 📌 Step 6/7: Creating initial user accounts...
if exist "create_initial_accounts.py" (
    python create_initial_accounts.py
    echo ✅ Initial accounts created!
) else (
    echo ⚠️  create_initial_accounts.py not found. Skipping...
)
echo.

REM Step 7: Summary
echo ========================================================================
echo ✅ BACKEND SETUP COMPLETE!
echo ========================================================================
echo.
echo 📋 What was set up:
echo    ✅ Virtual environment (venv\)
echo    ✅ Python dependencies installed
echo    ✅ Database created (db.sqlite3)
echo    ✅ All migrations applied
echo    ✅ 3 clinic locations created (Bacoor, Alabang, Poblacion)
echo    ✅ Initial user accounts created
echo.
echo 🔐 Login Credentials:
echo    Owner:        owner@admin.dorotheo.com / owner123
echo    Receptionist: receptionist@gmail.com / Receptionist2546!
echo    Dentist:      dentist@gmail.com / Dentist2546!
echo    Patient:      airoravinera@gmail.com / Airo2546!
echo.
echo 🚀 To start the development server:
echo    1. Activate virtual environment:
echo       venv\Scripts\activate
echo    2. Run server:
echo       python manage.py runserver
echo.
echo 🌐 Server will be available at: http://localhost:8000
echo 🔧 Django Admin Panel: http://localhost:8000/admin
echo.
echo ========================================================================
echo.
echo ========================================================================
echo 🚀 STARTING SERVERS AUTOMATICALLY...
echo ========================================================================
echo.

REM Instructions for frontend in VS Code terminal
echo [1/2] Frontend Server Setup
cd ..
if exist "frontend" (
    echo.
    echo ACTION REQUIRED: Open a new terminal in VS Code now:
    echo 1. Press Ctrl+Shift+`  (or click the '+' icon in terminal panel)
    echo 2. Copy and paste this command:
    echo.
    echo    cd frontend ^&^& pnpm dev
    echo.
    echo Waiting 10 seconds for you to open the terminal...
    timeout /t 10 /nobreak >nul
) else (
    echo [WARNING] Frontend directory not found. Skipping frontend server.
)
cd backend
echo.

REM Start backend in current terminal
echo [2/2] Starting backend server in this terminal...
echo.
echo ========================================================================
echo BACKEND SERVER
echo ========================================================================
echo.
echo Backend: http://localhost:8000
echo Frontend: http://localhost:3000
echo.
echo Press CTRL+C to stop the backend server
echo Close the frontend terminal to stop the frontend server
echo.

call venv\Scripts\activate.bat
python manage.py runserver
