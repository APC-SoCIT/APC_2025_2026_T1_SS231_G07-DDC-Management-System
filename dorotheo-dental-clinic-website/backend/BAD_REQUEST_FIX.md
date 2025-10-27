# Bad Request (400) - Troubleshooting Guide

## ✅ What Was Fixed

### Issue 1: API Permissions
**Problem:** API was set to `IsAuthenticated` by default, blocking all unauthenticated access.

**Fix:** Changed to `AllowAny` to allow public browsing of the API.

### Issue 2: CSRF Cookie Settings
**Problem:** Secure CSRF settings were too strict for the browsable API.

**Fix:** Made CSRF cookies more permissive with proper SameSite settings.

---

## 🧪 Test Your Backend (After Deploy - Wait 2-3 Minutes)

### Test 1: Root Endpoint ✅
```
https://apc2025202611ss231g07-ddc-management-system-production.up.railway.app/
```

**Expected Response:**
```json
{
  "message": "Dental Clinic API Server",
  "status": "running",
  "version": "1.0",
  "endpoints": {
    "admin": "/admin/",
    "api": "/api/",
    "register": "/api/register/",
    "login": "/api/login/"
  }
}
```

### Test 2: API Root (Browsable Interface) ✅
```
https://apc2025202611ss231g07-ddc-management-system-production.up.railway.app/api/
```

**Expected:** Django REST Framework browsable API interface showing all endpoints.

### Test 3: Services Endpoint ✅
```
https://apc2025202611ss231g07-ddc-management-system-production.up.railway.app/api/services/
```

**Expected:** JSON list of services (might be empty if no data yet).

### Test 4: Users Endpoint ✅
```
https://apc2025202611ss231g07-ddc-management-system-production.up.railway.app/api/users/
```

**Expected:** JSON list of users.

---

## 🔧 If You Still Get Bad Request

### Option 1: Clear Browser Cache
1. Press `Ctrl + Shift + Delete` (Chrome/Edge)
2. Select "Cached images and files"
3. Click "Clear data"
4. Try accessing the API again

### Option 2: Try in Incognito/Private Mode
- Chrome: `Ctrl + Shift + N`
- Edge: `Ctrl + Shift + P`
- Firefox: `Ctrl + Shift + P`

### Option 3: Use cURL to Test
```powershell
# Test root endpoint
curl https://apc2025202611ss231g07-ddc-management-system-production.up.railway.app/

# Test API endpoint
curl https://apc2025202611ss231g07-ddc-management-system-production.up.railway.app/api/

# Test services endpoint
curl https://apc2025202611ss231g07-ddc-management-system-production.up.railway.app/api/services/
```

### Option 4: Check Railway Logs
1. Go to Railway Dashboard
2. Click on your service
3. Click "Logs" tab
4. Look for errors related to CSRF or Bad Request

### Option 5: Verify Environment Variables
Make sure these are set in Railway:
```
DATABASE_URL=postgresql://... (your Supabase connection string)
SECRET_KEY=<your secret key>
DEBUG=False
ALLOWED_HOSTS=*.railway.app
```

---

## 🚀 After the API Works

### Step 1: Create Initial Data
You need to populate your database with initial accounts and services.

**Option A: Using Railway CLI**
```powershell
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Run the initial accounts script
railway run python create_initial_accounts.py
```

**Option B: Create Superuser Manually**
```powershell
railway run python manage.py createsuperuser
```

### Step 2: Access Admin Panel
```
https://apc2025202611ss231g07-ddc-management-system-production.up.railway.app/admin/
```

Login with the credentials from `create_initial_accounts.py`:
- **Username:** `admin`
- **Password:** `admin123!@#`

### Step 3: Test Registration and Login

**Register a New User:**
```bash
curl -X POST https://apc2025202611ss231g07-ddc-management-system-production.up.railway.app/api/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "testpass123",
    "first_name": "Test",
    "last_name": "User",
    "role": "patient"
  }'
```

**Login:**
```bash
curl -X POST https://apc2025202611ss231g07-ddc-management-system-production.up.railway.app/api/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "testpass123"
  }'
```

### Step 4: Update Your Frontend
Update your frontend's API URL to point to Railway:

**File:** `frontend/lib/api.ts` or your API config file

```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://apc2025202611ss231g07-ddc-management-system-production.up.railway.app/api';
```

Then deploy your frontend to Vercel with this environment variable:
```
NEXT_PUBLIC_API_URL=https://apc2025202611ss231g07-ddc-management-system-production.up.railway.app/api
```

---

## 📊 Common Responses Explained

### ✅ 200 OK
Everything worked! Your request was successful.

### ❌ 400 Bad Request
- Missing CSRF token
- Invalid request data
- Malformed JSON
- Check the response body for details

### ❌ 401 Unauthorized
- No authentication token provided
- Invalid token
- Token expired

### ❌ 403 Forbidden
- Valid token but insufficient permissions
- CSRF validation failed

### ❌ 404 Not Found
- Endpoint doesn't exist
- Check your URL

### ❌ 500 Internal Server Error
- Server-side error
- Check Railway logs for details

---

## 🎯 Quick Reference

**Your Backend URL:**
```
https://apc2025202611ss231g07-ddc-management-system-production.up.railway.app
```

**Main Endpoints:**
- Root: `/`
- API Root: `/api/`
- Admin: `/admin/`
- Register: `/api/register/`
- Login: `/api/login/`
- Logout: `/api/logout/`
- Current User: `/api/me/`
- Services: `/api/services/`
- Appointments: `/api/appointments/`
- Users: `/api/users/`

**Authentication:**
- Register → Get token
- Login → Get token
- Include token in headers: `Authorization: Token <your-token>`

---

## 💡 Tips

1. **Always check Railway logs** when something doesn't work
2. **Use the browsable API** to test endpoints in the browser
3. **Test with cURL first** before integrating with frontend
4. **Keep DEBUG=False in production** for security
5. **Use environment variables** for sensitive data

---

## Need Help?

If you're still getting errors:
1. Check Railway logs for detailed error messages
2. Try the cURL examples above
3. Verify all environment variables are set correctly
4. Make sure database migrations ran successfully
5. Check that your Supabase database is accessible

---

**Last Updated:** After fixing Bad Request (400) issues
**Status:** API should now be publicly accessible! 🎉
