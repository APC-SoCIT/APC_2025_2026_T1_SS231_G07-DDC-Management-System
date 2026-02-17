# Backend First-Time Setup (backend/README.md)

## 🚀 Quick Start (Automated Setup)

Choose the script for your environment:

### Windows (PowerShell - Recommended)
```powershell
cd backend
.\setup.ps1
```

### Windows (Command Prompt)
```cmd
cd backend
setup.bat
```

### Linux/Mac/Git Bash
```bash
cd backend
chmod +x setup.sh
./setup.sh
```

---

## ✅ What the Setup Script Does

The automated setup script will:
1. ✅ Check Python installation (requires Python 3.11+)
2. ✅ Create virtual environment (`venv/`)
3. ✅ Install all dependencies (Django, DRF, etc.)
4. ✅ Create and migrate database
5. ✅ Set up 3 clinic locations (Bacoor 🟢, Alabang 🔵, Poblacion 🟣)
6. ✅ Create initial user accounts

**Total time: ~2-3 minutes**

---

## 🔐 Default Login Credentials

After setup completes, you can login with:

| Role | Email | Password |
|------|-------|----------|
| **Owner** | owner@admin.dorotheo.com | owner123 |
| **Receptionist** | receptionist@gmail.com | Receptionist2546! |
| **Dentist** | dentist@gmail.com | Dentist2546! |
| **Patient** | airoravinera@gmail.com | Airo2546! |

---

## 🏃 Running the Server

After setup:

1. **Activate virtual environment:**
   ```bash
   # Windows PowerShell
   .\venv\Scripts\Activate.ps1
   
   # Windows CMD
   venv\Scripts\activate.bat
   
   # Linux/Mac/Git Bash
   source venv/bin/activate
   ```

2. **Start server:**
   ```bash
   python manage.py runserver
   ```

3. **Access:**
   - API: http://localhost:8000/api/
   - Admin Panel: http://localhost:8000/admin/

---

## 📦 Manual Setup (If Scripts Don't Work)

### Step 1: Create Virtual Environment
```bash
python -m venv venv
```

### Step 2: Activate Virtual Environment
```bash
# Windows PowerShell
.\venv\Scripts\Activate.ps1

# Windows CMD
venv\Scripts\activate.bat

# Linux/Mac/Git Bash
source venv/bin/activate
```

### Step 3: Install Dependencies
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### Step 4: Run Migrations
```bash
python manage.py migrate
```

### Step 5: Create Clinics
```bash
python manage.py create_clinics
```

### Step 6: Create Initial Accounts
```bash
python create_initial_accounts.py
```

### Step 7: Run Server
```bash
python manage.py runserver
```

---

## ⚠️ Common Issues

### `python: command not found`
- Install Python 3.11+ from https://www.python.org/downloads/
- On Windows, make sure "Add Python to PATH" is checked during installation

### `venv\Scripts\activate : cannot be loaded because running scripts is disabled`
- Run PowerShell as Administrator
- Execute: `Set-ExecutionPolicy RemoteSigned`
- Try activating venv again

### `ModuleNotFoundError: No module named 'django'`
- Make sure virtual environment is activated (you should see `(venv)` in terminal)
- Run: `pip install -r requirements.txt`

### Port 8000 already in use
- Kill existing process: `Ctrl+C` in the terminal running the server
- Or use different port: `python manage.py runserver 8080`

---

## 🔧 Useful Commands

### Database Management
```bash
# Create new migration after model changes
python manage.py makemigrations

# Apply migrations
python manage.py migrate

# Open Django shell
python manage.py shell

# Reset database (WARNING: Deletes all data!)
# Delete db.sqlite3 file, then run:
python manage.py migrate
python manage.py create_clinics
python create_initial_accounts.py
```

### Testing
```bash
# Run all tests
python manage.py test

# Run specific app tests
python manage.py test api
```

---

## 📁 Project Structure

```
backend/
├── api/                    # Main Django app
│   ├── models.py          # Database models
│   ├── views.py           # API endpoints
│   ├── serializers.py     # Data serialization
│   ├── urls.py            # URL routing
│   └── management/
│       └── commands/      # Custom management commands
│           └── create_clinics.py
├── dental_clinic/         # Django project settings
│   ├── settings.py        # Configuration
│   ├── urls.py            # Root URL config
│   └── wsgi.py            # WSGI config
├── media/                 # Uploaded files
├── db.sqlite3            # SQLite database
├── manage.py             # Django management script
├── requirements.txt      # Python dependencies
```
