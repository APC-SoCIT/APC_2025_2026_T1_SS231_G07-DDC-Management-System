# Supabase Integration Guide

This guide explains how to connect your Django backend to Supabase PostgreSQL.

## Step 1: Get Your Supabase Connection String

1. Go to your Supabase project dashboard
2. Click on "Connect" or "Database Settings"
3. Copy the **PostgreSQL Connection String** (Direct connection)
4. It should look like: `postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres`

## Step 2: Update the .env File

1. Open `backend/.env` file
2. Replace the `DATABASE_URL` value with your actual Supabase connection string
3. Make sure to replace `[YOUR_PASSWORD]` with your actual database password

```env
DATABASE_URL=postgresql://postgres:YOUR_ACTUAL_PASSWORD@db.h1bubkbncxcfvhbrbtsb.supabase.co:5432/postgres
```

## Step 3: Install Dependencies

```powershell
cd "C:\Users\Ezekiel\Downloads\forked repo\APC_2025_2026_T1_SS231_G07-DDC-Management-System\dorotheo-dental-clinic-website\backend"
pip install -r requirements.txt
```

## Step 4: Run Migrations

This will create all tables in your Supabase PostgreSQL database:

```powershell
python manage.py makemigrations
python manage.py migrate
```

## Step 5: Create Initial Admin Account

```powershell
python create_initial_accounts.py
```

Or create a superuser manually:

```powershell
python manage.py createsuperuser
```

## Step 6: Test the Connection

Start the development server:

```powershell
python manage.py runserver
```

Visit `http://localhost:8000/admin/` and log in with your credentials.

## Verification Checklist

- [ ] `.env` file has correct DATABASE_URL
- [ ] All dependencies installed (`pip install -r requirements.txt`)
- [ ] Migrations ran successfully (`python manage.py migrate`)
- [ ] Can log into Django admin
- [ ] Check Supabase Table Editor - you should see ~25 tables created

## Troubleshooting

### Error: "could not connect to server"
- Check your Supabase database password is correct in `.env`
- Ensure Supabase database is running
- Check your internet connection

### Error: "relation does not exist"
- Run migrations: `python manage.py migrate`

### Error: "Import dotenv could not be resolved"
- Install python-dotenv: `pip install python-dotenv`

## What Tables Will Be Created?

Django will automatically create these tables in Supabase:

### Core Application Tables (from api/models.py):
1. api_user
2. api_service
3. api_appointment
4. api_toothchart
5. api_dentalrecord
6. api_document
7. api_inventoryitem
8. api_billing
9. api_cliniclocation
10. api_treatmentplan
11. api_teethimage
12. api_staffavailability
13. api_appointmentnotification
14. api_dentistnotification
15. api_passwordresettoken
16. api_patientintakeform
17. api_fileattachment
18. api_clinicalnote
19. api_treatmentassignment

### Django System Tables:
20. auth_group
21. auth_group_permissions
22. auth_permission
23. django_admin_log
24. django_content_type
25. django_migrations
26. django_session
27. authtoken_token

## Next Steps

After successfully connecting to Supabase:

1. **Update your frontend API URL** to point to your backend
2. **Test all CRUD operations** (Create, Read, Update, Delete)
3. **Deploy your backend** to Railway (it will use the same Supabase database)
4. **Set up environment variables** in Railway deployment

## Important Notes

- ✅ Your Django models define the database schema
- ✅ Migrations automatically create tables
- ✅ You DON'T need to manually create tables in Supabase
- ✅ The same .env file works for local development
- ✅ For production, use environment variables (not .env file)

## Security

⚠️ **NEVER commit your .env file to Git!**

The `.env` file is already in `.gitignore`. Make sure it stays there.

For production deployments (Railway):
- Set DATABASE_URL as an environment variable in Railway dashboard
- Don't use the .env file in production
