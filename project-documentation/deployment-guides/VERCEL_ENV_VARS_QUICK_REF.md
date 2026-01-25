# Quick Reference: Vercel Backend Environment Variables

## 🔧 Copy-Paste Environment Variables for Vercel

Add these in your Vercel project settings → Environment Variables:

---

### Variable 1: DATABASE_URL
**Key:** `DATABASE_URL`

**Value:** (Get from Supabase - Connection Pooling URI)
```
postgresql://postgres.[YOUR-PROJECT]:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

**How to get:**
1. Go to Supabase Dashboard
2. Project Settings → Database
3. Connection string → **"Connection pooling"**
4. Copy URI (port 6543)
5. Replace `[YOUR-PASSWORD]` with actual password
6. Add `?pgbouncer=true` at the end

---

### Variable 2: SECRET_KEY
**Key:** `SECRET_KEY`

**Value:** Generate by running this in PowerShell:
```powershell
cd "c:\Users\Ezekiel\Downloads\original repo\APC_2025_2026_T1_SS231_G07-DDC-Management-System\dorotheo-dental-clinic-website\backend"
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

Copy the output and use it as the value.

---

### Variable 3: DEBUG
**Key:** `DEBUG`

**Value:** `False`

---

### Variable 4: ALLOWED_HOSTS
**Key:** `ALLOWED_HOSTS`

**Value:** `.vercel.app`

(For custom domains, add: `.vercel.app,yourdomain.com`)

---

### Variable 5: CORS_ALLOW_ALL_ORIGINS
**Key:** `CORS_ALLOW_ALL_ORIGINS`

**Value:** `True`

(For production, set to `False` and use `CORS_ALLOWED_ORIGINS` instead)

---

### Variable 6: PYTHONUNBUFFERED
**Key:** `PYTHONUNBUFFERED`

**Value:** `1`

---

## 📦 Vercel Project Settings

### Root Directory:
```
dorotheo-dental-clinic-website/backend
```

### Framework Preset:
```
Other
```

### Build Command:
```
bash build_files.sh
```

### Install Command:
```
pip install -r requirements.txt
```

### Output Directory:
```
(leave empty)
```

---

## ✅ Deployment Checklist

- [ ] All 6 environment variables added in Vercel
- [ ] Root directory set to `dorotheo-dental-clinic-website/backend`
- [ ] Framework preset set to "Other"
- [ ] Build command set to `bash build_files.sh`
- [ ] Files created: `vercel.json`, `build_files.sh`
- [ ] Database already migrated (via Railway or local)
- [ ] Click "Deploy" in Vercel

---

## 🎯 After Deployment

Your backend will be available at:
```
https://your-project-name.vercel.app
```

Test endpoints:
- `/` - API info
- `/api/` - Browsable API
- `/admin/` - Django admin
- `/api/services/` - Services list

---

## ⚠️ Important Note

**Railway is recommended for Django backend** because:
- No cold starts
- Persistent filesystem
- Better for long-running processes
- Easier migrations

**Vercel is better for:**
- Next.js frontend (optimal)
- Serverless functions
- Static sites

**Ideal Setup:**
```
Frontend (Vercel) ← → Backend (Railway) ← → Database (Supabase)
```

But if you want backend on Vercel too, use the variables above! 🚀
