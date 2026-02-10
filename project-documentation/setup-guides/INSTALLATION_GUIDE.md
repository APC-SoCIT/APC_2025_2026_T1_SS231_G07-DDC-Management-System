# Dental Clinic Management System - Installation Guide

This guide will walk you through setting up the Dental Clinic Management System on your local machine.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **Python** (v3.10 or higher) - [Download here](https://www.python.org/)
- **pip** (Python package manager - comes with Python)
- **Git** (optional, for version control)

## Step 1: Download the Project

Download and extract the project files to your desired location.

## Step 2: Backend Setup (Django)

### 2.1 Navigate to Backend Directory

Open a terminal/command prompt and navigate to the backend folder:

\`\`\`bash
cd backend
\`\`\`

### 2.2 Create Virtual Environment

**On Windows:**
\`\`\`bash
python -m venv venv
venv\Scripts\activate
\`\`\`

**On macOS/Linux:**
\`\`\`bash
python3 -m venv venv
source venv/bin/activate
\`\`\`

You should see `(venv)` in your terminal prompt, indicating the virtual environment is active.

### 2.3 Install Python Dependencies

\`\`\`bash
pip install -r requirements.txt
\`\`\`

This will install Django, Django REST Framework, and other required packages.

### 2.4 Setup Database

Run the following commands to create the database tables:

\`\`\`bash
python manage.py makemigrations
python manage.py migrate
\`\`\`

### 2.5 Create Owner Account

Create a superuser account (this will be the Owner account):

\`\`\`bash
python manage.py createsuperuser
\`\`\`

Follow the prompts to set:
- Username (e.g., `admin`)
- Email address
- Password (minimum 8 characters)

**Important:** Remember these credentials - you'll use them to log in as the Owner.

### 2.6 Start Django Server

\`\`\`bash
python manage.py runserver
\`\`\`

The backend API should now be running at `http://localhost:8000`

**Keep this terminal window open!**

## Step 3: Frontend Setup (Next.js)

### 3.1 Open New Terminal

Open a **new** terminal/command prompt window and navigate to the project root directory (not the backend folder).

### 3.2 Install Node Dependencies

\`\`\`bash
npm install
\`\`\`

This will install Next.js, React, Tailwind CSS, and all required packages.

### 3.3 Create Environment File

Create a file named `.env.local` in the root directory with the following content:

\`\`\`env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
\`\`\`

### 3.4 Start Next.js Development Server

\`\`\`bash
npm run dev
\`\`\`

The frontend should now be running at `http://localhost:3000`

## Step 4: Access the Application

### Homepage
Open your browser and go to: `http://localhost:3000`

You should see the dental clinic homepage with:
- Navigation bar with logo
- Hero section
- Services section
- About section
- Contact information
- Clinic locations

### Login as Owner

1. Click the **Login** icon in the top right
2. Enter the superuser credentials you created in Step 2.5
3. You'll be redirected to the Owner Dashboard

### Register as Patient

1. Click **Schedule an Appointment** button on the homepage
2. Fill in the registration form with patient details
3. After registration, you can log in as a patient

### Create Staff Accounts (Owner Only)

1. Log in as Owner
2. Navigate to **Staff Accounts** in the sidebar
3. Click **Add Staff Member**
4. Fill in staff details (name, email, password, etc.)
5. Staff can now log in with their credentials

## Step 5: Django Admin Panel (Optional)

For advanced database management, you can access the Django admin panel:

1. Go to: `http://localhost:8000/admin`
2. Log in with your Owner/superuser credentials
3. You can view and manage all database records here

## Troubleshooting

### Backend Issues

**Error: "No module named 'django'"**
- Make sure your virtual environment is activated
- Run `pip install -r requirements.txt` again

**Error: "Port 8000 is already in use"**
- Another application is using port 8000
- Stop the other application or use a different port:
  \`\`\`bash
  python manage.py runserver 8001
  \`\`\`
  Then update `.env.local` to use `http://localhost:8001/api`

**Database errors**
- Delete the `db.sqlite3` file
- Run migrations again:
  \`\`\`bash
  python manage.py makemigrations
  python manage.py migrate
  python manage.py createsuperuser
  \`\`\`

### Frontend Issues

**Error: "Cannot find module"**
- Delete `node_modules` folder and `package-lock.json`
- Run `npm install` again

**Error: "Port 3000 is already in use"**
- Another application is using port 3000
- Stop the other application or use a different port:
  \`\`\`bash
  npm run dev -- -p 3001
  \`\`\`

**API connection errors**
- Make sure the Django backend is running
- Check that `.env.local` has the correct API URL
- Verify CORS settings in Django

## Default Test Data

After setup, you can add test data through:

1. **Django Admin Panel** (`http://localhost:8000/admin`)
2. **Owner Dashboard** (add services, staff, etc.)
3. **Staff Dashboard** (add patients, appointments, inventory)

## Next Steps

1. **Add Services**: Log in as Owner → Services → Add dental services
2. **Add Staff**: Log in as Owner → Staff Accounts → Add dentists/receptionists
3. **Add Patients**: Register via homepage or add via Staff Dashboard
4. **Schedule Appointments**: Use Staff Dashboard to book appointments
5. **Manage Inventory**: Add dental supplies and equipment
6. **View Analytics**: Check Owner Dashboard for revenue/expense reports

## Production Deployment

For production deployment:

1. Set `DEBUG=False` in Django settings
2. Use PostgreSQL instead of SQLite
3. Configure proper CORS settings
4. Set up environment variables securely
5. Use a production web server (Gunicorn, Nginx)
6. Deploy frontend to Vercel or similar platform

## Support

If you encounter any issues:

1. Check the terminal/console for error messages
2. Verify all prerequisites are installed correctly
3. Ensure both backend and frontend servers are running
4. Check that ports 3000 and 8000 are not blocked by firewall

## System Requirements

- **RAM**: Minimum 4GB (8GB recommended)
- **Storage**: 500MB free space
- **OS**: Windows 10/11, macOS 10.15+, or Linux
- **Browser**: Chrome, Firefox, Safari, or Edge (latest versions)

---

**Congratulations!** Your Dental Clinic Management System is now set up and ready to use.
