# Database Setup Guide

## Initial Setup

The application uses SQLite3 database which is included with Django. No additional database installation is required.

### Step 1: Create Database Tables

Navigate to the backend directory and run migrations:

\`\`\`bash
cd backend
python manage.py makemigrations
python manage.py migrate
\`\`\`

This will create all the necessary tables in the SQLite database (`db.sqlite3`).

### Step 2: Create Superuser (Owner Account)

Create your first owner account to access the Django admin panel:

\`\`\`bash
python manage.py createsuperuser
\`\`\`

You'll be prompted to enter:
- Username
- Email
- Password

**Important:** After creating the superuser, you need to set the user_type to 'owner':

\`\`\`bash
python manage.py shell
\`\`\`

Then in the Python shell:
\`\`\`python
from api.models import User
user = User.objects.get(username='your_username')
user.user_type = 'owner'
user.save()
exit()
\`\`\`

### Step 3: Access Django Admin

Start the Django server:
\`\`\`bash
python manage.py runserver
\`\`\`

Access the admin panel at: `http://localhost:8000/admin`

Login with your superuser credentials.

## Adding Data Through Django Admin

### 1. Services
- Go to Services section
- Click "Add Service"
- Fill in: Name, Category, Description
- Upload service image
- Save

### 2. Clinic Locations
- Go to Clinic Locations
- Add your 3 clinic locations with:
  - Name
  - Address
  - Phone
  - Latitude/Longitude (optional, for Google Maps)

### 3. Staff Accounts
- Go to Users section
- Click "Add User"
- Set user_type to "staff" (Receptionist/Dentist)
- Fill in all required information
- Save

### 4. Patient Accounts
Patients can register through the website, or you can add them manually:
- Go to Users section
- Click "Add User"
- Set user_type to "patient"
- Fill in patient information
- Save

### 5. Inventory Items
- Go to Inventory Items
- Add dental supplies with:
  - Name
  - Category
  - Quantity
  - Minimum Stock level
  - Cost (in PHP)
  - Supplier

### 6. Appointments
- Go to Appointments
- Create appointments for patients
- Select patient, dentist, service, date, time
- Set status (pending/confirmed/cancelled/completed)

## Database Location

The SQLite database file is located at:
\`\`\`
backend/db.sqlite3
\`\`\`

## Backup Your Database

To backup your database, simply copy the `db.sqlite3` file:
\`\`\`bash
cp backend/db.sqlite3 backend/db.sqlite3.backup
\`\`\`

## Reset Database (if needed)

To start fresh:
\`\`\`bash
cd backend
rm db.sqlite3
python manage.py migrate
python manage.py createsuperuser
\`\`\`

## Testing the API

Once you have data in the database, you can test the API endpoints:

- Services: `http://localhost:8000/api/services/`
- Appointments: `http://localhost:8000/api/appointments/`
- Patients: `http://localhost:8000/api/patients/`
- Inventory: `http://localhost:8000/api/inventory/`

All endpoints require authentication except for services (public).
