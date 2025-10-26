# Backend Setup Guide - Django REST API

## ✅ Setup Complete!

The Django backend has been successfully configured and is now running.

## What Was Fixed

### 1. **Django Installation**
- ✅ Configured Python environment (Python 3.11.9)
- ✅ Installed Django 4.2.7 and dependencies
- ✅ Updated Pillow from 10.1.0 to >=10.3.0 (fixed build error)

### 2. **Project Structure**
- ✅ Created missing `__init__.py` files in api/ and dental_clinic/
- ✅ Created `apps.py` for the API app
- ✅ Created migrations folder and initial migrations

### 3. **Database Setup**
- ✅ Created fresh SQLite database
- ✅ Applied all migrations successfully
- ✅ Custom User model configured

### 4. **Server Status**
- ✅ **Django server is RUNNING at http://127.0.0.1:8000/**

## Installed Dependencies

```
Django==4.2.7
djangorestframework==3.14.0
django-cors-headers==4.3.1
Pillow>=10.3.0
```

## Database Models

The following models have been created and migrated:

1. **User** - Custom user model with roles (patient, staff, owner)
2. **Service** - Dental services catalog
3. **Appointment** - Appointment management
4. **ToothChart** - Patient tooth charts
5. **DentalRecord** - Treatment records
6. **Document** - Patient documents (X-rays, scans)
7. **InventoryItem** - Clinic inventory management
8. **Billing** - Patient billing and payments
9. **ClinicLocation** - Clinic location information
10. **TreatmentPlan** - Patient treatment plans

## Running the Backend

### Start the Server
```bash
cd backend
python manage.py runserver
```
Or with full path:
```bash
cd backend
C:/Users/Ezekiel/AppData/Local/Microsoft/WindowsApps/python3.11.exe manage.py runserver
```

### Create Superuser (Admin Account)
```bash
cd backend
python manage.py createsuperuser
```

### Access Django Admin
Once you create a superuser, you can access the admin panel at:
```
http://127.0.0.1:8000/admin/
```

## API Endpoints

The API is accessible at `http://127.0.0.1:8000/api/`

### Authentication
- Token-based authentication
- Session authentication
- CORS enabled for frontend communication

## Configuration

### Settings Location
`backend/dental_clinic/settings.py`

### Key Settings:
- **Database**: SQLite (db.sqlite3)
- **Debug Mode**: Enabled
- **CORS**: Allow all origins (for development)
- **Media Files**: `/media/` (for uploads)
- **Static Files**: `/static/`

## Common Commands

### Migrations
```bash
# Create new migrations
python manage.py makemigrations

# Apply migrations
python manage.py migrate

# Show migration status
python manage.py showmigrations
```

### Database
```bash
# Open Django shell
python manage.py shell

# Reset database (WARNING: Deletes all data)
# Delete db.sqlite3 file, then run:
python manage.py migrate
```

### Server
```bash
# Run on default port (8000)
python manage.py runserver

# Run on custom port
python manage.py runserver 8080

# Run on all interfaces
python manage.py runserver 0.0.0.0:8000
```

## Next Steps

1. ✅ Backend is running
2. 🔲 Create a superuser account
3. 🔲 Test API endpoints
4. 🔲 Connect frontend to backend
5. 🔲 Add sample data

## Troubleshooting

### ImportError: No module named 'django'
**Solution**: Make sure you're using the correct Python environment
```bash
C:/Users/Ezekiel/AppData/Local/Microsoft/WindowsApps/python3.11.exe manage.py runserver
```

### Migration Conflicts
**Solution**: Delete db.sqlite3 and run migrations again
```bash
# Delete the database file
Remove-Item db.sqlite3

# Run migrations
python manage.py migrate
```

### Port Already in Use
**Solution**: Use a different port
```bash
python manage.py runserver 8001
```

## Environment Variables

For production, set these environment variables:
- `SECRET_KEY`: Django secret key
- `DEBUG`: Set to False
- `ALLOWED_HOSTS`: Your domain names
- `DATABASE_URL`: Production database URL

---

**Status**: ✅ Backend fully operational!
**Server**: http://127.0.0.1:8000/
**Admin**: http://127.0.0.1:8000/admin/
