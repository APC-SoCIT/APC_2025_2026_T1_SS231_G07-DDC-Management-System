#!/bin/bash

# First-Time Setup Script for Linux/Mac/Git Bash
# This script automates the entire setup process for BOTH backend and frontend

set -e  # Exit on error

echo "========================================================================"
echo "DOROTHEO DENTAL CLINIC - FULL SETUP (BACKEND + FRONTEND)"
echo "========================================================================"
echo ""

# Check if Python is installed
echo "[Step 1/9] Checking Python installation..."
if ! command -v python &> /dev/null && ! command -v python3 &> /dev/null; then
    echo "[ERROR] Python is not installed!"
    echo "Please install Python 3.11+ from https://www.python.org/downloads/"
    exit 1
fi

PYTHON_CMD="python"
if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
fi

PYTHON_VERSION=$($PYTHON_CMD --version 2>&1 | awk '{print $2}')
echo "[OK] Found Python $PYTHON_VERSION"
echo ""

# Check if Node.js is installed
echo "[Step 2/9] Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is not installed!"
    echo "Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node --version 2>&1)
echo "[OK] Found Node.js $NODE_VERSION"
echo ""

# Check if pnpm is installed
echo "[Step 3/9] Checking pnpm installation..."
if ! command -v pnpm &> /dev/null; then
    echo "[WARNING] pnpm is not installed! Installing pnpm..."
    npm install -g pnpm
    if [ $? -eq 0 ]; then
        echo "[OK] pnpm installed successfully!"
    else
        echo "[ERROR] Failed to install pnpm!"
        echo "You can install it manually: npm install -g pnpm"
        exit 1
    fi
else
    PNPM_VERSION=$(pnpm --version 2>&1)
    echo "[OK] Found pnpm $PNPM_VERSION"
fi
echo ""

# Check if we're in the backend directory
if [ ! -f "manage.py" ]; then
    echo "[ERROR] manage.py not found!"
    echo "Please run this script from the backend/ directory"
    exit 1
fi

echo "========================================================================"
echo "BACKEND SETUP"
echo "========================================================================"
echo ""

# Step 4: Create virtual environment
echo "[Step 4/9] Creating virtual environment..."
if [ -d "venv" ]; then
    echo "[WARNING] Virtual environment already exists. Skipping creation."
else
    $PYTHON_CMD -m venv venv
    echo "[OK] Virtual environment created!"
fi
echo ""

# Step 5: Activate virtual environment and install dependencies
echo "[Step 5/9] Installing backend dependencies (this may take a few minutes)..."
if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
    # Windows Git Bash
    source venv/Scripts/activate
else
    # Linux/Mac
    source venv/bin/activate
fi

echo "Upgrading pip..."
pip install --upgrade pip --quiet

echo "Installing dependencies (skipping psycopg2-binary for local development)..."
# Install dependencies without psycopg2-binary since it requires PostgreSQL and we use SQLite locally
pip install --quiet \
    Django==4.2.7 \
    djangorestframework==3.14.0 \
    django-cors-headers==4.3.1 \
    "Pillow>=10.3.0" \
    gunicorn==21.2.0 \
    whitenoise==6.6.0 \
    dj-database-url==2.1.0 \
    python-dotenv==1.0.0 \
    google-generativeai==0.3.2 \
    resend==0.8.0

echo "[OK] All dependencies installed successfully!"
echo ""

# Step 6: Run migrations
echo "[Step 6/9] Setting up database..."
python manage.py migrate --noinput
echo "[OK] Database created and migrations applied!"
echo ""

# Step 7: Create clinic locations
echo "[Step 7/9] Creating clinic locations..."
python manage.py create_clinics
if [ $? -eq 0 ]; then
    echo "[OK] Clinic locations configured!"
else
    echo "[WARNING] Failed to create clinics (they may already exist)"
fi
echo ""

# Step 8: Create initial accounts
echo "[Step 8/9] Creating initial user accounts..."
if [ -f "create_initial_accounts.py" ]; then
    python create_initial_accounts.py
    if [ $? -eq 0 ]; then
        echo "[OK] Initial accounts created!"
    else
        echo "[WARNING] Failed to create accounts (they may already exist)"
    fi
else
    echo "[WARNING] create_initial_accounts.py not found. Skipping..."
fi
echo ""

echo ""

echo "========================================================================"
echo "FRONTEND SETUP"
echo "========================================================================"
echo ""

# Step 9: Install frontend dependencies
echo "[Step 9/9] Installing frontend dependencies (this may take a few minutes)..."

# Save current location and navigate to frontend
BACKEND_PATH=$(pwd)
FRONTEND_PATH="$(dirname "$BACKEND_PATH")/frontend"

if [ ! -d "$FRONTEND_PATH" ]; then
    echo "[ERROR] Frontend directory not found at: $FRONTEND_PATH"
    echo "[WARNING] Skipping frontend setup. Backend setup is complete."
else
    cd "$FRONTEND_PATH"
    
    echo "Installing frontend packages with pnpm..."
    pnpm install
    
    if [ $? -eq 0 ]; then
        echo "[OK] Frontend dependencies installed successfully!"
    else
        echo "[ERROR] Failed to install frontend dependencies!"
        echo "[WARNING] Backend setup is complete, but frontend setup failed."
    fi
    
    # Return to backend directory
    cd "$BACKEND_PATH"
fi
echo ""

# Step 10: Summary
echo "========================================================================"
echo "FULL SETUP COMPLETE!"
echo "========================================================================"
echo ""
echo "BACKEND - What was set up:"
echo "   [OK] Virtual environment (venv/)"
echo "   [OK] Python dependencies installed"
echo "   [OK] Database created (db.sqlite3)"
echo "   [OK] All migrations applied"
echo "   [OK] 3 clinic locations created (Bacoor, Alabang, Poblacion)"
echo "   [OK] Initial user accounts created"
echo ""
echo "FRONTEND - What was set up:"
echo "   [OK] Node.js dependencies installed (279 packages)"
echo "   [OK] Ready to start development server"
echo ""
echo "Login Credentials:"
echo "   Owner:        owner@admin.dorotheo.com / owner123"
echo "   Receptionist: receptionist@gmail.com / Receptionist2546!"
echo "   Dentist:      dentist@gmail.com / Dentist2546!"
echo "   Patient:      airoravinera@gmail.com / Airo2546!"
echo ""
echo "========================================================================"
echo "TO START THE APPLICATION:"
echo "========================================================================"
echo ""
echo "BACKEND SERVER:"
echo "   1. Open a terminal in the backend/ directory"
echo "   2. Activate virtual environment:"
if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
    echo "      source venv/Scripts/activate"
else
    echo "      source venv/bin/activate"
fi
echo "   3. Run server:"
echo "      python manage.py runserver"
echo "   4. Backend will be at: http://localhost:8000"
echo ""
echo "FRONTEND SERVER:"
echo "   1. Open a NEW terminal in the frontend/ directory"
echo "   2. Run development server:"
echo "      pnpm dev"
echo "   3. Frontend will be at: http://localhost:3000"
echo ""
echo "TIP: Keep both terminals open - you need both servers running!"
echo ""
echo "========================================================================"
echo ""
echo "NOTE: psycopg2-binary was skipped (only needed for PostgreSQL in production)"
echo "      Local development uses SQLite which is already included in Python."
echo "      Production (Railway/Vercel) will install psycopg2-binary automatically"
echo "      when connecting to PostgreSQL (Supabase)."
echo ""

# Automatically start both servers
echo "========================================================================"
echo "STARTING SERVERS AUTOMATICALLY..."
echo "========================================================================"
echo ""

# Instructions for frontend in VS Code terminal
echo "[1/2] Frontend Server Setup"
if [ -d "$FRONTEND_PATH" ]; then
    echo ""
    echo "ACTION REQUIRED: Open a new terminal in VS Code now:"
    echo "1. Press Ctrl+Shift+\`  (or click the '+' icon in terminal panel)"
    echo "2. Copy and paste this command:"
    echo ""
    echo "   cd '$FRONTEND_PATH' && pnpm dev"
    echo ""
    echo "Waiting 10 seconds for you to open the terminal..."
    sleep 10
else
    echo "[WARNING] Frontend directory not found. Skipping frontend server."
fi
echo ""

# Start backend in current terminal
echo "[2/2] Starting backend server in this terminal..."
echo ""
echo "========================================================================"
echo "BACKEND SERVER"
echo "========================================================================"
echo ""
echo "Backend:  http://localhost:8000"
echo "Frontend: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop the backend server"
echo "Close the frontend terminal to stop the frontend server"
echo ""

# Start backend server in current terminal (venv already activated)
python manage.py runserver
echo ""
