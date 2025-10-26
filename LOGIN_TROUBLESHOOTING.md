# Login Issue - Backend Server Not Running

## 🔍 Problem Identified

**Issue:** Cannot login with `owner@admin.dorotheo.com` and password `owner123`

**Root Cause:** The Django backend server was not running, so the frontend couldn't communicate with the API to authenticate users.

---

## ✅ Solution

### **Both servers are now running:**

1. **Backend (Django):** `http://127.0.0.1:8000/`
   - API endpoint: `http://localhost:8000/api/`
   - Started with: `python manage.py runserver`

2. **Frontend (Next.js):** `http://localhost:3000/`
   - Started with: `node node_modules/next/dist/bin/next dev`

---

## 🔑 Correct Owner Credentials

**Email:** `owner@admin.dorotheo.com`  
**Password:** `owner123`

### Verification in Database:
```bash
✅ Account exists: True
✅ Email: owner@admin.dorotheo.com
✅ Username: owner@admin.dorotheo.com
✅ User type: owner
✅ Password check: True
```

---

## 🎯 How to Login Now

1. Open browser: `http://localhost:3000`
2. Click **"Login"** link in navbar
3. Enter credentials:
   - **Email:** `owner@admin.dorotheo.com`
   - **Password:** `owner123`
4. Click **"Login"** button
5. ✅ You should be redirected to Owner Dashboard

---

## 🚀 Starting the Servers

### **Backend Server (Terminal 1):**
```bash
cd backend
python manage.py runserver
```
**Output:**
```
Starting development server at http://127.0.0.1:8000/
Quit the server with CTRL-BREAK.
```

### **Frontend Server (Terminal 2):**

**Option 1 - Using Node directly (if npm/pnpm has issues):**
```bash
cd frontend
node node_modules/next/dist/bin/next dev
```

**Option 2 - Using npm (requires PowerShell execution policy):**
```bash
cd frontend
npm run dev
```

**Option 3 - Using pnpm (if installed):**
```bash
cd frontend
pnpm dev
```

**Output:**
```
▲ Next.js 15.2.4
- Local:        http://localhost:3000
- Network:      http://192.168.127.1:3000

✓ Starting...
✓ Ready in [time]
```

---

## 🧪 Testing the Login

### **Test 1: API Direct Test**
```powershell
$body = @{username='owner@admin.dorotheo.com'; password='owner123'} | ConvertTo-Json
Invoke-WebRequest -Uri 'http://127.0.0.1:8000/api/login/' -Method POST -Body $body -ContentType 'application/json'
```

**Expected Response:**
```json
{
  "token": "1234567890abcdef...",
  "user": {
    "id": 1,
    "username": "owner@admin.dorotheo.com",
    "email": "owner@admin.dorotheo.com",
    "user_type": "owner",
    "first_name": "Dr. Marvin",
    "last_name": "Dorotheo"
  }
}
```

### **Test 2: Frontend Login**
1. Navigate to `http://localhost:3000/login`
2. Enter `owner@admin.dorotheo.com` and `owner123`
3. Check browser console (F12) for logs:
   ```
   [v0] Attempting login to: http://localhost:8000/api/login/
   [v0] Login response status: 200
   ```
4. Should redirect to `/owner/dashboard`

---

## 🛠️ Troubleshooting

### **Problem: "Unable to connect to the remote server"**
**Solution:** Backend server is not running
```bash
# Start backend in a new terminal
cd backend
python manage.py runserver
```

### **Problem: "Invalid credentials"**
**Possible causes:**
1. Wrong email/password
   - ✅ Correct: `owner@admin.dorotheo.com` / `owner123`
   - ❌ Wrong: `owner@dorotheo.com` / `owner123` (missing "admin")

2. Account doesn't exist in database
   ```bash
   # Check if account exists
   cd backend
   python manage.py shell -c "from api.models import User; print(User.objects.filter(email='owner@admin.dorotheo.com').exists())"
   ```

3. Database was cleared
   ```bash
   # Recreate initial accounts
   cd backend
   python create_initial_accounts.py
   ```

### **Problem: Frontend shows "Network Error"**
**Solution:** Check if both servers are running
- Backend: `http://127.0.0.1:8000/api/` should respond
- Frontend: `http://localhost:3000/` should load

### **Problem: PowerShell script execution disabled**
**Error:** `File cannot be loaded because running scripts is disabled`

**Solution:** Use node directly instead of npm
```bash
cd frontend
node node_modules/next/dist/bin/next dev
```

---

## 📋 All Available Accounts

### **Owner Account:**
- Email: `owner@admin.dorotheo.com`
- Password: `owner123`
- Type: Owner
- Dashboard: `/owner/dashboard`

### **Staff Account:**
- Email: `staff@dorotheo.com`
- Password: `staff123`
- Type: Staff
- Dashboard: `/staff/dashboard`

### **Patient Accounts:**
- Registered through the website
- Dashboard: `/patient/dashboard`

---

## 🎉 Summary

### **Issue Fixed:**
✅ Backend server is now running on port 8000  
✅ Frontend server is now running on port 3000  
✅ Login credentials verified in database  
✅ API authentication endpoint working  

### **You can now:**
✅ Login with `owner@admin.dorotheo.com` / `owner123`  
✅ Access Owner Dashboard at `/owner/dashboard`  
✅ Manage patients, appointments, billing, etc.  
✅ Test all owner-side features  

---

## 🔗 Quick Links

- **Homepage:** http://localhost:3000/
- **Login Page:** http://localhost:3000/login
- **Owner Dashboard:** http://localhost:3000/owner/dashboard
- **API Base:** http://localhost:8000/api/
- **Django Admin:** http://localhost:8000/admin/

---

## 📝 Next Steps

1. ✅ Both servers are running
2. ✅ Login with owner credentials
3. ✅ Test the owner dashboard features
4. ✅ Add/edit/remove patients, appointments, etc.
5. ✅ Use the logout button when done testing

**Happy testing! 🚀**
