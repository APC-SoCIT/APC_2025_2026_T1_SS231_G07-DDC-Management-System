# Staff Login Issue - FIXED ✅

## Problem Identified

**Issue:** Staff accounts couldn't log in even with correct credentials showing "Invalid username or password"

**Root Cause:** The UserViewSet endpoint (`/api/users/`) was saving passwords as **plain text** instead of hashing them. Django's authentication system uses hashed passwords, so plain text passwords will never match.

---

## Solution Applied

### Backend Fix - Hash Passwords on Creation

Added `perform_create` method to `UserViewSet` in `backend/api/views.py`:

```python
class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer

    def perform_create(self, serializer):
        # Hash password when creating user
        user = serializer.save()
        password = self.request.data.get('password')
        if password:
            user.set_password(password)  # ← Properly hash the password
            user.save()

    @action(detail=False, methods=['get'])
    def patients(self, request):
        # ... rest of code
```

**What This Does:**
- Intercepts user creation via `/api/users/` endpoint
- Extracts password from request
- Uses Django's `set_password()` method to hash it properly
- Saves the user with hashed password

---

## How Django Authentication Works

### Password Hashing
```python
# When user is created:
user.set_password("MyPassword123")  # Hashes password
user.save()

# Password is stored in database as:
"pbkdf2_sha256$260000$randomsalt$hashedpassword..."

# When user logs in:
authenticate(username="user@example.com", password="MyPassword123")
# ✅ Django hashes "MyPassword123" and compares with stored hash
```

### Why Plain Text Fails
```python
# OLD (BROKEN) - Password saved as plain text:
User.objects.create(
    username="staff@dorotheo.com",
    password="MyPassword123"  # ❌ Stored as plain text!
)

# Database contains: "MyPassword123"
# Login attempt: authenticate() hashes input → doesn't match plain text
# Result: ❌ "Invalid credentials"
```

---

## For Existing Staff Accounts

### Problem
Staff accounts created BEFORE this fix have plain text passwords in the database and **cannot log in**.

### Solution Options

#### Option 1: Recreate Staff Accounts (Recommended)
1. Delete the old staff account from Owner → Staff Accounts
2. Create new staff account with same details
3. New account will have properly hashed password
4. Staff can now log in successfully

#### Option 2: Fix Database Passwords (Technical)
Run this Python script in your backend directory:

```python
# backend/fix_staff_passwords.py
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'dental_clinic.settings')
django.setup()

from api.models import User

# Fix all staff accounts
staff_users = User.objects.filter(user_type='staff')

for user in staff_users:
    # Check if password is not hashed (no $ symbols)
    if '$' not in user.password:
        print(f"Fixing password for: {user.username}")
        plain_password = user.password  # Get the plain text password
        user.set_password(plain_password)  # Hash it properly
        user.save()
        print(f"✅ Fixed: {user.username}")
    else:
        print(f"✅ Already hashed: {user.username}")

print("\nAll staff passwords have been fixed!")
```

Run it:
```bash
cd backend
python fix_staff_passwords.py
```

---

## Testing the Fix

### Test 1: Create New Staff Account
1. Login as Owner
2. Go to Staff Accounts → Add Staff
3. Fill in form:
   - First Name: `Test`
   - Last Name: `Staff`
   - Email: `test@personal.com`
   - Username: `teststaff` → `teststaff@dorotheo.com`
   - Password: `TestPass123`
   - Birthdate, Phone, Address, Role
4. Submit
5. **Logout**
6. Login with:
   - Email: `teststaff@dorotheo.com`
   - Password: `TestPass123`
7. **Should successfully login to Staff Dashboard** ✅

### Test 2: Fix Existing Account (ezgalauran)
If you want to fix the existing `ezgalauran@dorotheo.com` account:

**Option A - Recreate:**
1. Owner deletes `ezgalauran` from Staff Accounts
2. Owner creates new staff with username `ezgalauran`
3. New account will work

**Option B - Fix Database:**
1. Run the fix script above
2. Try logging in again with original password

---

## Current Status

### ✅ Fixed Issues:
- Backend now properly hashes passwords for new staff accounts
- `perform_create` method added to UserViewSet
- Future staff creations will work correctly

### ⚠️ Needs Attention:
- Existing staff account `ezgalauran@dorotheo.com` has plain text password
- Either recreate the account OR run the password fix script
- After fix, staff can login normally

### 🎯 Expected Behavior (After Fix):
```
Staff Login:
Email: ezgalauran@dorotheo.com
Password: [original password]
↓
✅ Login Successful
↓
Redirect to Staff Dashboard
```

---

## Code Changes Made

### File: `backend/api/views.py`

**Before:**
```python
class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer

    @action(detail=False, methods=['get'])
    def patients(self, request):
        # ...
```

**After:**
```python
class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer

    def perform_create(self, serializer):
        # Hash password when creating user
        user = serializer.save()
        password = self.request.data.get('password')
        if password:
            user.set_password(password)
            user.save()

    @action(detail=False, methods=['get'])
    def patients(self, request):
        # ...
```

---

## Verification Steps

### Check if Password is Hashed
```python
# In Django shell (backend directory):
python manage.py shell

from api.models import User

# Check a staff user:
user = User.objects.get(username='ezgalauran@dorotheo.com')
print(user.password)

# Hashed password looks like:
# "pbkdf2_sha256$260000$abc123$xyz789..."

# Plain text password looks like:
# "MyPassword123"  ← BAD!
```

---

## Summary

**Problem:** Staff passwords saved as plain text → Login fails

**Solution:** Added password hashing to UserViewSet creation

**For Existing Staff:** 
- **Quick Fix:** Delete and recreate account
- **Technical Fix:** Run password fix script

**For New Staff:** Will work automatically with fix applied

**Status:** ✅ Backend fixed, existing accounts need recreation or script

**Date:** October 17, 2025
**Files Modified:** `backend/api/views.py`
