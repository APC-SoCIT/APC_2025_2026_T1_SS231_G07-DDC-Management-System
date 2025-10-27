# Railway SQLite Error - IMMEDIATE FIX

## The Error You're Seeing

```
ImportError: libsqlite3.so.0: cannot open shared object file: No such file or directory
```

## Root Cause

Railway's environment is trying to use SQLite but:
1. The SQLite system library is missing
2. SQLite is NOT recommended for production (Railway filesystem is ephemeral)
3. You need to use PostgreSQL instead

## SOLUTION (Follow These Steps)

### Step 1: Clear the aptfile (DONE ✅)
The `aptfile` has been updated to remove SQLite dependencies.

### Step 2: Add PostgreSQL Database to Railway (REQUIRED)

**This is the critical step!**

1. Go to your Railway project dashboard
2. Click **"+ New"** button
3. Select **"Database"** → **"Add PostgreSQL"**
4. Wait for the database to provision (takes ~30 seconds)
5. Railway will automatically create a `DATABASE_URL` environment variable
6. Your app will automatically restart and connect to PostgreSQL

### Step 3: Verify Environment Variables

Make sure these are set in Railway → Your Service → **Variables** tab:

```env
SECRET_KEY=your-generated-secret-key-here
DEBUG=False
ALLOWED_HOSTS=*.railway.app
DATABASE_URL=(automatically set by PostgreSQL addon)
```

### Step 4: Commit and Push Changes

```bash
git add dorotheo-dental-clinic-website/backend/aptfile
git commit -m "Fix Railway SQLite error - remove SQLite dependencies"
git push origin main
```

Railway will automatically redeploy.

### Step 5: Run Migrations (After PostgreSQL is Added)

Once PostgreSQL is connected and the app is running:

```bash
# Install Railway CLI if you haven't
npm i -g @railway/cli

# Login to Railway
railway login

# Link to your project
railway link

# Run migrations
railway run python manage.py migrate

# Create initial accounts
railway run python create_initial_accounts.py
```

## Why This Happens

Your Django `settings.py` is correctly configured to use PostgreSQL when `DATABASE_URL` is set:

```python
DATABASES = {
    'default': dj_database_url.config(
        default=f'sqlite:///{BASE_DIR / "db.sqlite3"}',  # Fallback for local dev
        conn_max_age=600,
        conn_health_checks=True,
    )
}
```

**But** without PostgreSQL added to Railway:
- No `DATABASE_URL` environment variable exists
- Django tries to use SQLite as fallback
- Railway environment doesn't have SQLite libraries
- **BOOM** - ImportError

## After Fix

Once PostgreSQL is added:
- ✅ `DATABASE_URL` will be automatically set by Railway
- ✅ Django will use PostgreSQL instead of SQLite
- ✅ No more library errors
- ✅ Production-ready database with persistence

## Verification

After adding PostgreSQL, your deployment logs should show:

```
✓ Database connection successful
✓ Running migrations...
✓ Server starting...
```

Instead of the SQLite error.

## Questions?

Check the full deployment guide: `RAILWAY_DEPLOYMENT_GUIDE.md`
