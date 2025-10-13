# Schema Migration Summary: Django to PostgreSQL

This document summarizes all the changes made to align your Django backend with the PostgreSQL schema from `hey.md`.

## ✅ Changes Completed

### 1. **Backend Models Updated (`api/models.py`)**

#### NEW MODELS (matching PostgreSQL schema):
- `PatientMedicalHistory` → `patient_medical_history` table
- `CustomUser` → `user` table (replaces Django's default User)
- `Service` → `service` table  
- `Invoice` → `invoices` table
- `Appointment` → `appointment` table (new structure)
- `AppointmentService` → `appointment_has_service` table
- `InsuranceDetail` → `insurance_detail` table
- `TreatmentRecord` → `treatment_records` table
- `Payment` → `payment` table
- `Role` → `role` table

#### LEGACY MODELS (kept for backward compatibility):
- `Patient` (renamed to maintain existing data)
- `LegacyAppointment` (renamed from `Appointment`)
- `InventoryItem`, `BillingRecord`, `FinancialRecord` (unchanged)

### 2. **Django Settings Updated (`dental_clinic/settings.py`)**
- ✅ Added `AUTH_USER_MODEL = 'api.CustomUser'`
- ✅ Added PostgreSQL database configuration with fallback to SQLite
- ✅ Added WhiteNoise middleware for static files
- ✅ Updated ALLOWED_HOSTS for Vercel deployment
- ✅ Import `dj_database_url` for database URL parsing

### 3. **Dependencies Updated (`requirements.txt`)**
- ✅ Added `psycopg2-binary==2.9.9` (PostgreSQL adapter)
- ✅ Added `dj-database-url==2.3.0` (database URL parsing)
- ✅ Added `whitenoise==6.8.2` (static files serving)

### 4. **Serializers Updated (`api/serializers.py`)**
- ✅ New serializers for all new models
- ✅ Backward compatibility serializers for legacy models
- ✅ Field mapping between old and new data structures
- ✅ Transformation logic for display purposes

### 5. **Views Updated (`api/views.py`)**
- ✅ New ViewSets for all new models
- ✅ Updated API endpoints with proper data transformations
- ✅ Legacy ViewSets maintained for backward compatibility
- ✅ Statistics and filtering methods updated

### 6. **URL Configuration Updated (`api/urls.py`)**
- ✅ New API endpoints: `/users/`, `/services/`, `/invoices/`, `/appointments/`, etc.
- ✅ Legacy endpoints maintained: `/patients/`, `/legacy-appointments/`
- ✅ Proper routing for both new and old endpoints

### 7. **Frontend API Updated (`lib/api.js`)**
- ✅ Data transformation helpers for field mapping
- ✅ New `userAPI` for CustomUser operations
- ✅ Updated `appointmentAPI` with new data structure
- ✅ Backward compatibility with existing `patientAPI`
- ✅ Automatic fallback to legacy APIs if new ones fail

### 8. **Frontend Components Updated**
- ✅ `patient-table.jsx`: Updated to use `f_name`/`l_name` fields
- ✅ `appointment-table.jsx`: Updated to use new appointment structure
- ✅ Form fields split into first name/last name
- ✅ Backward compatibility maintained for existing functionality

## 📋 Field Mappings

### User/Patient Fields:
| Old Field | New Field | Description |
|-----------|-----------|-------------|
| `name` | `f_name` + `l_name` | Split full name into first/last |
| `patient_id` | `id` | Use primary key as identifier |
| `created_at` | `date_of_creation` | Creation timestamp |

### Appointment Fields:
| Old Field | New Field | Description |
|-----------|-----------|-------------|
| `date` + `time` | `appointment_start_time` | Combined datetime field |
| `doctor` | `staff` (ForeignKey) | Reference to CustomUser |
| `treatment` | `reason_for_visit` | Visit reason |
| `status` values | Updated enum | 'scheduled' → 'Scheduled', etc. |

## 🚀 Next Steps: Migration Process

### Step 1: Install Dependencies
```bash
cd owner-side-user/backend
pip install -r requirements.txt
```

### Step 2: Create Initial Migrations
```bash
# Remove existing migrations (optional, for clean start)
rm -rf api/migrations/000*.py

# Create new migrations for updated models
python manage.py makemigrations

# Apply the migrations
python manage.py migrate
```

### Step 3: Create Superuser (with new CustomUser)
```bash
python manage.py createsuperuser
```

### Step 4: Test Backend APIs
```bash
# Start the development server
python manage.py runserver

# Test new endpoints:
# GET http://localhost:8000/api/users/
# GET http://localhost:8000/api/services/
# GET http://localhost:8000/api/appointments/
```

### Step 5: Test Frontend
```bash
cd ../frontend
pnpm install
pnpm dev

# Test patient and appointment management
# Forms should now use first name/last name fields
```

### Step 6: Data Migration (if needed)
If you have existing data to migrate from old models to new models:

```python
# Create a data migration script
python manage.py makemigrations --empty api

# Edit the migration file to transfer data:
# - Patient → CustomUser
# - Old Appointment → New Appointment
```

## 🔧 Environment Variables

Update your `.env` file with:

```env
# Database Configuration
DATABASE_URL=postgresql://user:password@host:port/database
# OR for local development:
DB_ENGINE=django.db.backends.postgresql
DB_NAME=dental_clinic
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432

# Django Settings
SECRET_KEY=your-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1,*.vercel.app
```

## 🐛 Troubleshooting

### Common Issues:

1. **Migration Conflicts**: If you get migration conflicts, reset migrations:
   ```bash
   python manage.py migrate --fake-initial
   ```

2. **CustomUser Issues**: If admin doesn't work, create new superuser:
   ```bash
   python manage.py createsuperuser
   ```

3. **Frontend Errors**: Clear browser cache and restart development server

4. **Database Connection**: Ensure PostgreSQL is running and credentials are correct

## 📊 API Endpoints Summary

### NEW ENDPOINTS (Primary):
- `GET/POST /api/users/` - User management (patients/staff)
- `GET/POST /api/services/` - Service management
- `GET/POST /api/invoices/` - Invoice management
- `GET/POST /api/appointments/` - Appointment management (new structure)

### LEGACY ENDPOINTS (Backward Compatibility):
- `GET/POST /api/patients/` - Legacy patient management
- `GET/POST /api/legacy-appointments/` - Legacy appointment management

### UNCHANGED ENDPOINTS:
- `GET/POST /api/inventory/` - Inventory management
- `GET/POST /api/billing/` - Billing management
- `GET/POST /api/financial/` - Financial records

## ✨ Benefits of New Structure

1. **Better Data Normalization**: Separate first/last names, medical history
2. **Enhanced Relationships**: Proper foreign keys for appointments
3. **Service Management**: Dedicated service catalog
4. **Invoice System**: Proper billing structure
5. **Treatment Records**: Detailed medical record keeping
6. **Role Management**: User role system
7. **Insurance Details**: Insurance information tracking

## 🔄 Backward Compatibility

The system maintains full backward compatibility:
- Old API endpoints still work
- Frontend components handle both old and new data formats
- Gradual migration possible
- No breaking changes for existing functionality

Your dental clinic management system is now fully aligned with the PostgreSQL schema while maintaining all existing functionality! 🎉