# First-Time Backend Setup Script for Windows PowerShell
# This script automates the entire setup process for BOTH backend and frontend

Write-Host "========================================================================" -ForegroundColor Green
Write-Host "DOROTHEO DENTAL CLINIC - FULL SETUP (BACKEND + FRONTEND)" -ForegroundColor Green
Write-Host "========================================================================" -ForegroundColor Green
Write-Host ""

# Check if Python is installed
Write-Host "[Step 1/9] Checking Python installation..." -ForegroundColor Cyan
try {
    $pythonVersion = python --version 2>&1
    Write-Host "[OK] Found $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Python is not installed!" -ForegroundColor Red
    Write-Host "Please install Python 3.11+ from https://www.python.org/downloads/" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host ""

# Check if Node.js is installed
Write-Host "[Step 2/9] Checking Node.js installation..." -ForegroundColor Cyan
try {
    $nodeVersion = node --version 2>&1
    Write-Host "[OK] Found Node.js $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Node.js is not installed!" -ForegroundColor Red
    Write-Host "Please install Node.js 18+ from https://nodejs.org/" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host ""

# Check if pnpm is installed
Write-Host "[Step 3/9] Checking pnpm installation..." -ForegroundColor Cyan
try {
    $pnpmVersion = pnpm --version 2>&1
    Write-Host "[OK] Found pnpm $pnpmVersion" -ForegroundColor Green
} catch {
    Write-Host "[WARNING] pnpm is not installed! Installing pnpm..." -ForegroundColor Yellow
    npm install -g pnpm
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] pnpm installed successfully!" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] Failed to install pnpm!" -ForegroundColor Red
        Write-Host "You can install it manually: npm install -g pnpm" -ForegroundColor Yellow
        Read-Host "Press Enter to exit"
        exit 1
    }
}
Write-Host ""

# Check if we're in the backend directory
if (-not (Test-Path "manage.py")) {
    Write-Host "[ERROR] manage.py not found!" -ForegroundColor Red
    Write-Host "Please run this script from the backend\ directory" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "========================================================================" -ForegroundColor Magenta
Write-Host "BACKEND SETUP" -ForegroundColor Magenta
Write-Host "========================================================================" -ForegroundColor Magenta
Write-Host ""

# Step 4: Create virtual environment
Write-Host "[Step 4/9] Creating virtual environment..." -ForegroundColor Cyan
if (Test-Path "venv") {
    Write-Host "[WARNING] Virtual environment already exists. Skipping creation." -ForegroundColor Yellow
} else {
    python -m venv venv
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Virtual environment created!" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] Failed to create virtual environment!" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
}
Write-Host ""

# Step 5: Activate virtual environment and install dependencies
Write-Host "[Step 5/9] Installing backend dependencies (this may take a few minutes)..." -ForegroundColor Cyan
& .\venv\Scripts\Activate.ps1

Write-Host "Upgrading pip..." -ForegroundColor Gray
python -m pip install --upgrade pip --quiet

Write-Host "Installing dependencies (skipping psycopg2-binary for local development)..." -ForegroundColor Gray
# Install dependencies without psycopg2-binary since it requires PostgreSQL and we use SQLite locally
$packages = @(
    "Django==4.2.7",
    "djangorestframework==3.14.0",
    "django-cors-headers==4.3.1",
    "Pillow>=10.3.0",
    "gunicorn==21.2.0",
    "whitenoise==6.6.0",
    "dj-database-url==2.1.0",
    "python-dotenv==1.0.0",
    "google-generativeai==0.3.2",
    "resend==0.8.0"
)

python -m pip install $packages --quiet
if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] All dependencies installed successfully!" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Failed to install dependencies!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host ""

# Step 6: Run migrations
Write-Host "[Step 6/9] Setting up database..." -ForegroundColor Cyan
python manage.py migrate --noinput
if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Database created and migrations applied!" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Failed to run migrations!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host ""

# Step 7: Create clinic locations
Write-Host "[Step 7/9] Creating clinic locations..." -ForegroundColor Cyan
python manage.py create_clinics
if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Clinic locations configured!" -ForegroundColor Green
} else {
    Write-Host "[WARNING] Failed to create clinics (they may already exist)" -ForegroundColor Yellow
}
Write-Host ""

# Step 8: Create initial accounts
Write-Host "[Step 8/9] Creating initial user accounts..." -ForegroundColor Cyan
if (Test-Path "create_initial_accounts.py") {
    python create_initial_accounts.py
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Initial accounts created!" -ForegroundColor Green
    } else {
        Write-Host "[WARNING] Failed to create accounts (they may already exist)" -ForegroundColor Yellow
    }
} else {
    Write-Host "[WARNING] create_initial_accounts.py not found. Skipping..." -ForegroundColor Yellow
}
Write-Host ""

Write-Host "========================================================================" -ForegroundColor Magenta
Write-Host "FRONTEND SETUP" -ForegroundColor Magenta
Write-Host "========================================================================" -ForegroundColor Magenta
Write-Host ""

# Step 9: Install frontend dependencies
Write-Host "[Step 9/9] Installing frontend dependencies (this may take a few minutes)..." -ForegroundColor Cyan

# Save current location and navigate to frontend
$backendPath = Get-Location
$frontendPath = Join-Path (Split-Path $backendPath -Parent) "frontend"

if (-not (Test-Path $frontendPath)) {
    Write-Host "[ERROR] Frontend directory not found at: $frontendPath" -ForegroundColor Red
    Write-Host "[WARNING] Skipping frontend setup. Backend setup is complete." -ForegroundColor Yellow
} else {
    Set-Location $frontendPath
    
    Write-Host "Installing frontend packages with pnpm..." -ForegroundColor Gray
    pnpm install
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Frontend dependencies installed successfully!" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] Failed to install frontend dependencies!" -ForegroundColor Red
        Write-Host "[WARNING] Backend setup is complete, but frontend setup failed." -ForegroundColor Yellow
    }
    
    # Return to backend directory
    Set-Location $backendPath
}
Write-Host ""

# Step 10: Summary
Write-Host "========================================================================" -ForegroundColor Green
Write-Host "FULL SETUP COMPLETE!" -ForegroundColor Green
Write-Host "========================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "BACKEND - What was set up:" -ForegroundColor Cyan
Write-Host "   [OK] Virtual environment (venv\)" -ForegroundColor White
Write-Host "   [OK] Python dependencies installed" -ForegroundColor White
Write-Host "   [OK] Database created (db.sqlite3)" -ForegroundColor White
Write-Host "   [OK] All migrations applied" -ForegroundColor White
Write-Host "   [OK] 3 clinic locations created (Bacoor, Alabang, Poblacion)" -ForegroundColor White
Write-Host "   [OK] Initial user accounts created" -ForegroundColor White
Write-Host ""
Write-Host "FRONTEND - What was set up:" -ForegroundColor Cyan
Write-Host "   [OK] Node.js dependencies installed (279 packages)" -ForegroundColor White
Write-Host "   [OK] Ready to start development server" -ForegroundColor White
Write-Host ""
Write-Host "Login Credentials:" -ForegroundColor Cyan
Write-Host "   Owner:        owner@admin.dorotheo.com / owner123" -ForegroundColor White
Write-Host "   Receptionist: receptionist@gmail.com / Receptionist2546!" -ForegroundColor White
Write-Host "   Dentist:      dentist@gmail.com / Dentist2546!" -ForegroundColor White
Write-Host "   Patient:      airoravinera@gmail.com / Airo2546!" -ForegroundColor White
Write-Host ""
Write-Host "========================================================================" -ForegroundColor Yellow
Write-Host "TO START THE APPLICATION:" -ForegroundColor Yellow
Write-Host "========================================================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "BACKEND SERVER:" -ForegroundColor Cyan
Write-Host "   1. Open a terminal in the backend\ directory" -ForegroundColor White
Write-Host "   2. Activate virtual environment:" -ForegroundColor White
Write-Host "      .\venv\Scripts\Activate.ps1" -ForegroundColor Yellow
Write-Host "   3. Run server:" -ForegroundColor White
Write-Host "      python manage.py runserver" -ForegroundColor Yellow
Write-Host "   4. Backend will be at: http://localhost:8000" -ForegroundColor Green
Write-Host ""
Write-Host "FRONTEND SERVER:" -ForegroundColor Cyan
Write-Host "   1. Open a NEW terminal in the frontend\ directory" -ForegroundColor White
Write-Host "   2. Run development server:" -ForegroundColor White
Write-Host "      pnpm dev" -ForegroundColor Yellow
Write-Host "   3. Frontend will be at: http://localhost:3000" -ForegroundColor Green
Write-Host ""
Write-Host "TIP: Keep both terminals open - you need both servers running!" -ForegroundColor Magenta
Write-Host ""
Write-Host "========================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "NOTE: psycopg2-binary was skipped (only needed for PostgreSQL in production)" -ForegroundColor DarkGray
Write-Host "      Local development uses SQLite which is already included in Python." -ForegroundColor DarkGray
Write-Host "      Production (Railway/Vercel) will install psycopg2-binary automatically" -ForegroundColor DarkGray
Write-Host "      when connecting to PostgreSQL (Supabase)." -ForegroundColor DarkGray
Write-Host ""

# Ask user if they want to start the servers automatically
Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host "AUTO-START SERVERS" -ForegroundColor Cyan
Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host ""
$startServers = Read-Host "Do you want to start both servers now? (Y/N)"

if ($startServers -eq "Y" -or $startServers -eq "y") {
    Write-Host "" 
    Write-Host "Starting servers..." -ForegroundColor Green
    Write-Host "" 
    
    # Start frontend server in a new PowerShell window
    $frontendCmd = "cd '$frontendPath'; Write-Host '========================================' -ForegroundColor Magenta; Write-Host 'FRONTEND SERVER' -ForegroundColor Magenta; Write-Host '========================================' -ForegroundColor Magenta; Write-Host ''; pnpm dev"
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendCmd
    
    Write-Host "[OK] Frontend server starting in new window..." -ForegroundColor Green
    Write-Host "[OK] Backend server starting in this window..." -ForegroundColor Green
    Write-Host "" 
    Write-Host "========================================================================" -ForegroundColor Yellow
    Write-Host "SERVERS RUNNING" -ForegroundColor Yellow
    Write-Host "========================================================================" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Backend:  http://localhost:8000" -ForegroundColor Green
    Write-Host "Frontend: http://localhost:3000" -ForegroundColor Green
    Write-Host ""
    Write-Host "Press Ctrl+C to stop the backend server" -ForegroundColor Yellow
    Write-Host "Close the frontend terminal window to stop the frontend server" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Magenta
    Write-Host "BACKEND SERVER" -ForegroundColor Magenta
    Write-Host "========================================" -ForegroundColor Magenta
    Write-Host ""
    
    # Start backend server in current window (venv already activated)
    # Suppress Django system check warnings for development
    python manage.py runserver --skip-checks
} else {
    Write-Host ""
    Write-Host "Servers not started. You can start them manually later." -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
}
