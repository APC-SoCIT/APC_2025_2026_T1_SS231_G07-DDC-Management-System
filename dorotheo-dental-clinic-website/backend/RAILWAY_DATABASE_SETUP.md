# Railway Database Setup - Fix Bad Request (400) Error

## Problem
Your Railway backend is returning "Bad Request (400)" HTML instead of JSON when trying to login. This is because the database hasn't been set up yet on Railway.

## Solution: Run Migrations on Railway

### Option 1: Using Railway Dashboard (Easiest)

1. Go to your Railway project dashboard
2. Click on your service
3. Go to the **"Settings"** tab
4. Find **"Deploy" section**
5. Click **"Redeploy"** - this will run migrations automatically

### Option 2: Using Railway CLI

```powershell
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Link to your project (run this in your backend directory)
cd "C:\Users\Ezekiel\Downloads\forked repo\APC_2025_2026_T1_SS231_G07-DDC-Management-System\dorotheo-dental-clinic-website\backend"
railway link

# Run migrations
railway run python manage.py migrate

# Create initial admin account
railway run python create_initial_accounts.py
```

### Option 3: Add PostgreSQL Database (Required for Production)

⚠️ **IMPORTANT:** Your current deployment might be using SQLite, which doesn't work on Railway!

1. In Railway, click **"+ New"** → **"Database"** → **"Add PostgreSQL"**
2. Railway will automatically create a `DATABASE_URL` environment variable
3. Your Django app will automatically use PostgreSQL
4. Click **"Redeploy"** to rebuild with the database

## Verify Database is Working

After running migrations, test these URLs:

```
https://apc20252026t1ss231g07-ddc-management-system-production.up.railway.app/api/
https://apc20252026t1ss231g07-ddc-management-system-production.up.railway.app/admin/
```

Both should return proper JSON/HTML responses instead of "Bad Request (400)".

## Create Initial User Accounts

Once migrations are done, create initial accounts:

```powershell
# Using Railway CLI
railway run python create_initial_accounts.py
```

Or manually create a superuser:

```powershell
railway run python manage.py createsuperuser
```

## Test Login

Once everything is set up, your frontend should be able to login successfully!

Test credentials (if you ran `create_initial_accounts.py`):
- **Owner:** owner / pass123
- **Staff:** staff / pass123
- **Patient:** patient / pass123

## Common Issues

### Issue: "No module named 'psycopg2'"
**Solution:** Add PostgreSQL database in Railway. It's required for production.

### Issue: "OperationalError: no such table: auth_user"
**Solution:** Run migrations: `railway run python manage.py migrate`

### Issue: Still getting Bad Request
**Solution:** 
1. Check Railway logs for detailed errors
2. Ensure `DEBUG=False` in environment variables
3. Ensure `ALLOWED_HOSTS=*` or includes your Railway domain
4. Check CORS settings allow your frontend domain

## Next Steps

1. ✅ Add PostgreSQL database to Railway
2. ✅ Run migrations
3. ✅ Create initial accounts
4. ✅ Test login from frontend
5. ✅ Celebrate! 🎉
