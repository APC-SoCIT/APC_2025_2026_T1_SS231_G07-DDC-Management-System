# Django Backend Deployment to Vercel

## 📋 Environment Variables for Vercel

Add these in the Vercel dashboard under "Environment Variables":

### Required Variables:

```env
DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true
SECRET_KEY=<generate-a-secure-random-key>
DEBUG=False
ALLOWED_HOSTS=.vercel.app
CORS_ALLOW_ALL_ORIGINS=True
PYTHONUNBUFFERED=1
```

### How to Get Each Value:

#### 1. DATABASE_URL
From your Supabase dashboard:
1. Go to **Project Settings** → **Database**
2. Under **Connection string** → Select **"Connection pooling"**
3. Copy the **URI** format (port 6543, not 5432)
4. Replace `[YOUR-PASSWORD]` with your actual database password
5. Add `?pgbouncer=true` at the end

**Example:**
```
postgresql://postgres.hibubbtncxcfvhkrbtsb:mypassword123@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

#### 2. SECRET_KEY
Generate a new secure key:
```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

Copy the output and use it as your SECRET_KEY.

#### 3. DEBUG
Always set to `False` for production.

#### 4. ALLOWED_HOSTS
Use `.vercel.app` to allow all Vercel subdomains.
For custom domains, add them: `.vercel.app,yourdomain.com`

#### 5. CORS_ALLOW_ALL_ORIGINS
Set to `True` for development.
For production, consider setting specific origins via `CORS_ALLOWED_ORIGINS`.

#### 6. PYTHONUNBUFFERED
Set to `1` to see real-time logs in Vercel.

---

## 🚀 Deployment Steps

### Step 1: Prepare Files

Make sure these files exist in your backend directory:
- ✅ `vercel.json` (created)
- ✅ `build_files.sh` (created)
- ✅ `requirements.txt` (exists)
- ✅ `manage.py` (exists)

### Step 2: Set Root Directory in Vercel

In Vercel project settings:
1. Go to **Settings** → **General**
2. Set **Root Directory** to: `dorotheo-dental-clinic-website/backend`
3. Click **Save**

### Step 3: Configure Build Settings

In Vercel:
1. **Framework Preset:** Other
2. **Build Command:** `bash build_files.sh`
3. **Output Directory:** Leave empty or set to `staticfiles`
4. **Install Command:** `pip install -r requirements.txt`

### Step 4: Add Environment Variables

Go to **Settings** → **Environment Variables** and add all the variables listed above.

**Important:** Add them to all environments (Production, Preview, Development).

### Step 5: Deploy

1. Click **Deploy** in Vercel
2. Wait for the build to complete (2-5 minutes)
3. Check the deployment logs for errors

### Step 6: Run Migrations (After First Deploy)

You'll need to run migrations manually. Options:

**Option A: Using Vercel CLI**
```bash
npm i -g vercel
vercel login
vercel link
vercel env pull
python manage.py migrate
```

**Option B: Run Locally with Production DB**
```bash
# Set DATABASE_URL to your Supabase connection string
python manage.py migrate
python create_initial_accounts.py
```

**Option C: Use Railway for Initial Setup**
If you already have Railway deployed, the database is already migrated!

---

## 🧪 Testing Your Vercel Deployment

After deployment, test these endpoints:

### 1. Root Endpoint
```
https://your-backend.vercel.app/
```

Should return:
```json
{
  "message": "Dental Clinic API Server",
  "status": "running",
  "version": "1.0"
}
```

### 2. API Root
```
https://your-backend.vercel.app/api/
```

Should show the browsable API.

### 3. Services
```
https://your-backend.vercel.app/api/services/
```

---

## ⚠️ Important Limitations of Vercel for Django

### 1. **Serverless Functions**
- Each request runs in a serverless function
- Functions have a 10-second timeout on Hobby plan
- 50-second timeout on Pro plan

### 2. **No Persistent Filesystem**
- Media files (user uploads) won't persist
- Use cloud storage (S3, Cloudinary, Supabase Storage)

### 3. **Cold Starts**
- First request may be slow (1-3 seconds)
- Subsequent requests are faster

### 4. **Database Connections**
- Use connection pooling (Supabase pooler port 6543)
- Limited concurrent connections

### 5. **Background Tasks**
- No support for Celery or background workers
- Use external services for scheduled tasks

---

## 🔄 Recommended: Use Railway Instead

**Railway is better suited for Django** because:
- ✅ Always-on server (no cold starts)
- ✅ Persistent filesystem
- ✅ Better for WebSockets
- ✅ Easier database migrations
- ✅ Better logs and monitoring
- ✅ More generous timeouts

**Vercel is great for:**
- ✅ Next.js frontend
- ✅ Static sites
- ✅ Serverless APIs with low complexity

---

## 🎯 Best Architecture

### Recommended Setup:
```
Frontend (Vercel) → Backend (Railway) → Database (Supabase)
```

**Why?**
- Next.js on Vercel = Optimal performance
- Django on Railway = Full-featured backend
- PostgreSQL on Supabase = Managed database

### Environment Variables Summary:

**Vercel (Frontend):**
```env
NEXT_PUBLIC_API_URL=https://your-backend.railway.app/api
```

**Railway (Backend):**
```env
DATABASE_URL=postgresql://... (Supabase connection string)
SECRET_KEY=<random-key>
DEBUG=False
ALLOWED_HOSTS=*.railway.app
CORS_ALLOWED_ORIGINS=https://your-frontend.vercel.app
```

---

## 📚 Alternative: If You Still Want Vercel Backend

If you must use Vercel for the backend:

1. **Add all environment variables** as shown above
2. **Set Root Directory** to `dorotheo-dental-clinic-website/backend`
3. **Deploy** and check logs
4. **Run migrations** manually after first deploy
5. **Use Supabase Storage** for media files

---

## 🆘 Troubleshooting

### Error: "Application failed to start"
- Check environment variables are set correctly
- Verify DATABASE_URL is using connection pooler (port 6543)
- Check Vercel function logs

### Error: "Module not found"
- Ensure `requirements.txt` includes all dependencies
- Check `vercel.json` configuration

### Error: "Connection timeout"
- Use Supabase connection pooler (port 6543, not 5432)
- Add `?pgbouncer=true` to connection string

### Error: "Static files not loading"
- Run `python manage.py collectstatic` locally first
- Check `STATIC_ROOT` and `STATIC_URL` in settings.py

---

## 📞 Need Help?

If deployment fails:
1. Check Vercel function logs
2. Verify all environment variables
3. Test DATABASE_URL connection locally
4. Consider using Railway instead for Django backend

---

**Current Status:** Files created, ready to deploy to Vercel!
**Recommended:** Use Railway for backend, Vercel for frontend.
