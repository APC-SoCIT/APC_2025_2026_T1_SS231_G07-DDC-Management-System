# Production Deployment Checklist - Audit Logging Merge
**Date**: February 15, 2026  
**Latest Commit SHA**: a7868b22bd7d59cd256b7b7e52aa0895021edec1  
**Branch**: main (merged from Audit_Logging)  

## ⚠️ Overview
This checklist covers all necessary steps to deploy the Audit Logging feature to production after merging to main. Your deployment stack:
- **Backend**: Azure Web App (Python/Django)
- **Frontend**: Vercel (Next.js)
- **Database**: Supabase (PostgreSQL)
- **Forked Repo**: apcedgalauran/APC_2025_2026_T1_SS231_G07-DDC-Management-System

---

## 🔥 IMMEDIATE FIXES (Already Applied)

### ✅ 1. Fixed Missing Sentry SDK
**Issue**: `ModuleNotFoundError: No module named 'sentry_sdk'`  
**Solution**: Added `sentry-sdk==2.19.2` to [requirements.txt](dorotheo-dental-clinic-website/backend/requirements.txt)

### ✅ 2. Updated Environment Variable Documentation
**Solution**: Added audit logging configuration variables to [.env.example](dorotheo-dental-clinic-website/backend/.env.example)

---

## 📋 CRITICAL DEPLOYMENT STEPS

### Step 1: Push Fixed Code to Your Fork
```bash
# Commit the fixes (sentry_sdk in requirements.txt)
git add dorotheo-dental-clinic-website/backend/requirements.txt
git add dorotheo-dental-clinic-website/backend/.env.example
git commit -m "fix: add sentry-sdk to requirements and update env example"

# Push to your fork's main branch
git push origin main
```

### Step 2: Update Azure App Service Environment Variables
Add these NEW environment variables in Azure Portal:

**Navigate to**: Azure Portal → Your App Service → Configuration → Application settings

```env
# === REQUIRED: AUDIT LOGGING ===
AUDIT_MIDDLEWARE_ENABLED=True
AUDIT_ASYNC_LOGGING=False
AUDIT_LOG_RETENTION_DAYS=2190
AUDIT_MAX_LOGS_PER_MINUTE=100
```

**⚠️ VERIFY EXISTING CRITICAL VARIABLES** (make sure these are still set):
```env
SECRET_KEY=<your-production-secret-key>
DEBUG=False
DATABASE_URL=<your-supabase-postgresql-url>
ALLOWED_HOSTS=<your-azure-hostname>.azurewebsites.net
FRONTEND_URL=<your-vercel-frontend-url>

# Email Configuration
EMAIL_BACKEND=api.resend_backend.ResendEmailBackend
RESEND_API_KEY=<your-resend-api-key>
DEFAULT_FROM_EMAIL=Dorotheo Dental Clinic <noreply@yourdomain.com>

# CORS and CSRF
CORS_ALLOWED_ORIGINS=https://<your-vercel-app>.vercel.app,http://localhost:3000
CSRF_TRUSTED_ORIGINS=https://<your-azure-app>.azurewebsites.net,https://<your-vercel-app>.vercel.app
```

**Action**: Click "Save" after adding variables, then restart the app service.

---

### Step 3: Run Database Migrations on Supabase

The Audit Logging feature added a new `AuditLog` model (migration `0036_auditlog.py`).

**Option A: Via Azure SSH Console (Recommended)**
```bash
# SSH into your Azure Web App
# Navigate to your app directory
cd /home/site/wwwroot/dorotheo-dental-clinic-website/backend

# Activate virtual environment
source antenv/bin/activate  # or wherever your venv is

# Run migrations
python manage.py migrate

# Verify the migration
python manage.py showmigrations api
```

**Option B: Via Local Django Connected to Supabase**
```bash
# In your local backend directory
cd dorotheo-dental-clinic-website/backend

# Temporarily set DATABASE_URL to your Supabase URL
$env:DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres"

# Run migrations
python manage.py migrate

# Verify
python manage.py showmigrations api
```

**Expected Output**: You should see `[X] 0036_auditlog` checked.

**⚠️ What This Migration Does**:
- Creates new table: `audit_logs`
- Adds indexes for performance
- Fields: log_id, action_type, target_table, target_record_id, timestamp, ip_address, user_agent, changes, reason, actor, patient_id

---

### Step 4: Verify Azure Deployment Build

After pushing to your fork, Azure will automatically trigger a deployment. Monitor it:

1. **Azure Portal** → Your App Service → Deployment Center → Logs
2. Check for these steps:
   - ✅ Installing dependencies from requirements.txt
   - ✅ `sentry-sdk` should install successfully
   - ✅ `python manage.py collectstatic --noinput`
   - ✅ Deployment successful

**If build still fails**:
- Check the full build log in Azure
- Ensure your GitHub connection is syncing from the correct branch (main)
- Try manual redeployment: Deployment Center → Sync

---

### Step 5: Verify Vercel Frontend Deployment

Vercel should auto-deploy when you push to main. Verify:

1. **Vercel Dashboard** → Your Project → Deployments
2. Check latest deployment status

**Required Environment Variable** (should already be set):
```env
NEXT_PUBLIC_API_URL=https://<your-azure-backend>.azurewebsites.net
```

**Verify in Vercel**:
- Settings → Environment Variables
- Ensure `NEXT_PUBLIC_API_URL` points to your Azure backend

**Frontend Note**: The audit logging features are backend-only. No frontend code changes needed.

---

### Step 6: Test Audit Logging in Production

After successful deployment:

1. **Test Basic Login Audit**:
   ```
   - Go to your frontend: https://<your-app>.vercel.app
   - Log in as a user
   - Log out
   ```

2. **Verify Audit Logs in Admin Panel**:
   ```
   - Go to: https://<your-backend>.azurewebsites.net/admin/
   - Log in with superuser account
   - Navigate to: API → Audit Logs
   - You should see LOGIN_SUCCESS, LOGOUT entries
   ```

3. **Test Audit Dashboard**:
   ```
   - In admin, click "Audit Log Dashboard" (purple banner)
   - Or go to: https://<your-backend>.azurewebsites.net/admin/api/auditlog/dashboard/
   - Verify statistics are displayed
   ```

4. **Test CRUD Operations**:
   ```
   - Create a new patient record
   - Update patient information
   - View patient records
   - Check Admin → Audit Logs for CREATE, UPDATE, READ entries
   ```

---

## 🔍 VERIFICATION CHECKLIST

### Backend (Azure) Verification
- [ ] Azure deployment completed without errors
- [ ] No `ModuleNotFoundError: No module named 'sentry_sdk'`
- [ ] Static files collected successfully
- [ ] Database migrations applied (migration 0036)
- [ ] Environment variables configured
- [ ] App service is running
- [ ] Health check responds: `https://<backend>/api/health/`

### Database (Supabase) Verification
- [ ] New table `audit_logs` exists
- [ ] Table has correct schema (log_id, action_type, target_table, etc.)
- [ ] Indexes created successfully

### Audit Logging Verification
- [ ] Login/Logout creates audit entries
- [ ] Patient CRUD operations logged
- [ ] Audit dashboard accessible
- [ ] No performance degradation observed
- [ ] Failed login attempts logged correctly

### Frontend (Vercel) Verification
- [ ] Latest deployment successful
- [ ] Application loads without errors
- [ ] API calls to backend working
- [ ] Authentication flow working
- [ ] No console errors related to missing endpoints

---

## 📊 NEW FEATURES AVAILABLE

### 1. Audit Log Model
Tracks all system activities:
- User actions (CREATE, READ, UPDATE, DELETE)
- Authentication (LOGIN_SUCCESS, LOGIN_FAILED, LOGOUT)
- Access attempts (ACCESS_DENIED)
- Exports (EXPORT)

**Fields Logged**:
- Who did it (actor)
- What was done (action_type)
- When (timestamp)
- Where from (ip_address, user_agent)
- What changed (changes JSON)
- Why (optional reason)
- Patient affected (patient_id)

### 2. Audit Middleware
Automatically logs ALL API requests/responses:
- Enabled via `AUDIT_MIDDLEWARE_ENABLED=True`
- Skips: /admin/, /static/, /media/, /api/login/, /api/logout/, /api/health/
- Rate limiting: 100 logs/user/minute (configurable)

### 3. Audit Dashboard
Visual analytics dashboard for administrators:
- URL: `/admin/api/auditlog/dashboard/`
- Features:
  - Total logs, today's count, monthly count
  - Failed login detection
  - Action type breakdown
  - Most active users
  - Most accessed patient records
  - Suspicious activity alerts

### 4. Management Command: cleanup_audit_logs
Automated log retention management:
```bash
# Dry run (preview what will be deleted)
python manage.py cleanup_audit_logs --dry-run

# Delete logs older than 6 years (HIPAA compliance)
python manage.py cleanup_audit_logs --force

# Custom retention period
python manage.py cleanup_audit_logs --days=365 --force
```

**Schedule this command** (monthly recommended):
- Windows: Task Scheduler
- Linux: cron job
- Azure: Azure Automation or cron job

---

## 🚨 TROUBLESHOOTING

### Issue: "collectstatic" fails with sentry_sdk error
**Solution**: ✅ Already fixed - sentry-sdk added to requirements.txt

### Issue: Migration 0036_auditlog not applied
**Symptoms**: Database errors about missing `audit_logs` table
**Solution**:
```bash
# Connect to production database and run:
python manage.py migrate api 0036
python manage.py migrate
```

### Issue: Audit logs not being created
**Check**:
1. `AUDIT_MIDDLEWARE_ENABLED=True` in Azure environment variables
2. Middleware is in settings.py after AuthenticationMiddleware
3. Database migration 0036 applied successfully
4. No errors in application logs

**Debug**:
```bash
# Check if middleware is loaded
python manage.py shell
>>> from django.conf import settings
>>> settings.MIDDLEWARE
# Should include 'api.middleware.AuditMiddleware'
```

### Issue: Audit dashboard shows 500 error
**Possible causes**:
- Migration not run (audit_logs table missing)
- Database permission issues
- Sentry SDK not installed

**Check Azure logs**:
Azure Portal → App Service → Log Stream

### Issue: Performance degradation
**Cause**: Audit logging adds overhead to every request  
**Solutions**:
1. Disable for specific paths via `AUDIT_SKIP_PATHS` in settings.py
2. Set `AUDIT_MIDDLEWARE_ENABLED=False` temporarily
3. Reduce rate limit: `AUDIT_MAX_LOGS_PER_MINUTE=50`
4. Enable async logging (requires Celery setup): `AUDIT_ASYNC_LOGGING=True`

### Issue: Database size growing rapidly
**Cause**: Audit logs accumulate over time  
**Solution**: Schedule cleanup command monthly
```bash
# Delete logs older than 6 years
python manage.py cleanup_audit_logs --force
```

---

## 📚 ADDITIONAL DOCUMENTATION

Refer to these files for more details:
- [AUDIT_DASHBOARD_GUIDE.md](dorotheo-dental-clinic-website/backend/AUDIT_DASHBOARD_GUIDE.md) - Dashboard usage
- [AUDIT_CLEANUP_GUIDE.md](dorotheo-dental-clinic-website/backend/AUDIT_CLEANUP_GUIDE.md) - Log retention management
- [.env.example](dorotheo-dental-clinic-website/backend/.env.example) - All environment variables

---

## ✅ POST-DEPLOYMENT VALIDATION

After completing all steps, perform these final checks:

### 1. Smoke Test
```bash
# Test backend health
curl https://<your-backend>.azurewebsites.net/api/health/

# Test frontend
curl https://<your-frontend>.vercel.app/
```

### 2. Authentication Test
- Log in to frontend
- Perform basic operations
- Check audit logs in admin panel

### 3. Monitor for Errors
- Azure: Monitor → Logs → Check for exceptions
- Sentry: Should send error reports if configured
- Frontend: Check browser console for errors

### 4. Performance Check
- Monitor response times (should not increase significantly)
- Check database query performance
- Verify audit log table size

---

## 🎯 NEXT STEPS AFTER DEPLOYMENT

1. **Set up automated cleanup** (Optional but recommended):
   ```bash
   # Schedule monthly cleanup of logs older than 6 years
   # Use Azure Automation Runbooks or WebJob
   ```

2. **Review audit logs regularly**:
   - Check dashboard weekly for suspicious activity
   - Monitor failed login attempts
   - Review access patterns for HIPAA compliance

3. **Configure Sentry properly** (if monitoring errors):
   - Update DSN in settings.py if needed
   - Configure alert rules
   - Set up team notifications

4. **Document admin procedures**:
   - Train administrators on audit dashboard usage
   - Establish review schedule for compliance
   - Create incident response procedures

---

## 📞 SUPPORT

If you encounter issues:
1. Check Azure App Service logs
2. Check Supabase database logs
3. Review Vercel deployment logs
4. Check this guide's troubleshooting section

**Key Files Changed in Audit Logging Merge**:
- `api/models.py` - Added AuditLog model
- `api/middleware.py` - Added AuditMiddleware
- `api/admin.py` - Added audit dashboard
- `api/views.py` - Added audit context decorators
- `dental_clinic/settings.py` - Added Sentry SDK, audit config
- `requirements.txt` - Added dependencies
- `api/migrations/0036_auditlog.py` - Database migration

---

**Status**: Ready for deployment ✅  
**Estimated Time**: 30-45 minutes  
**Complexity**: Medium  
**Risk Level**: Low (mainly additive changes)
