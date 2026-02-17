# Test Data Fixtures

This directory contains Django fixture files for setting up test data.

## What's Included in `test_data.json`

- **51 users** (owners, staff, dentists, patients)
- **8 services** with custom colors
- **3 clinic locations** (Alabang, Calamba, Biñan)
- **14 sample appointments** with various statuses
- Inventory items, invoices, and other related data

## How to Use

### First Time Setup (Fresh Database)

1. Run migrations:
   ```bash
   python manage.py migrate
   ```

2. Load the test data:
   ```bash
   python manage.py loaddata fixtures/test_data.json
   ```

### Reset Database to Test Data

If you need to reset your database:

```bash
# Windows PowerShell
rm db.sqlite3
python manage.py migrate
python manage.py loaddata fixtures/test_data.json
```

```bash
# Mac/Linux
rm db.sqlite3
python manage.py migrate
python manage.py loaddata fixtures/test_data.json
```

## Test Accounts

After loading, you can login with:

- **Owner**: `owner@admin.dorotheo.com` / `owner123`
- **Staff**: Various staff accounts (check database)
- **Dentist**: Various dentist accounts (check database)
- **Patient**: Check `api_user` table for patient emails

## Notes

- This fixture excludes content types, permissions, and sessions to avoid conflicts
- The database file (`db.sqlite3`) is in `.gitignore` and should never be committed
- Always use fixtures or setup scripts to share test data
