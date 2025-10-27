# Railway Deployment Guide for Django Backend

This guide will help you deploy the Dorotheo Dental Clinic backend to Railway.

## Prerequisites

- A GitHub account with your code pushed to a repository
- A Railway account (sign up at https://railway.app/)
- Your backend code ready with all the configuration files

## Step 1: Prepare Your Code

✅ **Already done!** The following files have been created/updated:

- `requirements.txt` - Updated with production dependencies
- `Procfile` - Tells Railway how to start your app
- `runtime.txt` - Specifies Python version
- `railway.json` - Railway configuration
- `nixpacks.toml` - Alternative build configuration
- `settings.py` - Updated for production environment

## Step 2: Push Your Changes to GitHub

```bash
cd "C:\Users\Ezekiel\Downloads\forked repo\APC_2025_2026_T1_SS231_G07-DDC-Management-System"
git add .
git commit -m "Add Railway deployment configuration"
git push origin main
```

## Step 3: Create a New Railway Project

1. Go to https://railway.app/ and sign in with GitHub
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose your repository: `APC_2025_2026_T1_SS231_G07-DDC-Management-System`
5. Railway will automatically detect your Django app

## Step 4: Configure Root Directory

Since your backend is in `dorotheo-dental-clinic-website/backend/`:

1. Click on your service in Railway
2. Go to **Settings** tab
3. Find **"Root Directory"** or **"Source"** settings
4. Set it to: `dorotheo-dental-clinic-website/backend`
5. Click **"Save"**

## Step 5: Add a PostgreSQL Database (Recommended)

Railway offers a free PostgreSQL database:

1. In your Railway project dashboard, click **"+ New"**
2. Select **"Database"** → **"Add PostgreSQL"**
3. Railway will automatically create a `DATABASE_URL` environment variable
4. Your Django app will automatically use it!

**Note:** SQLite won't persist data on Railway (filesystem is ephemeral). PostgreSQL is strongly recommended.

## Step 6: Set Environment Variables

In Railway, go to your service → **Variables** tab and add:

### Required Variables:
```
SECRET_KEY=your-super-secret-key-here-change-this-immediately
DEBUG=False
ALLOWED_HOSTS=*.railway.app,your-custom-domain.com
```

### Optional Variables:
```
CORS_ALLOW_ALL_ORIGINS=True
CORS_ALLOWED_ORIGINS=https://your-frontend-url.vercel.app
```

### Generate a Secret Key:
Run this in PowerShell to generate a secure secret key:
```powershell
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

## Step 7: Deploy

1. Railway will automatically deploy when you push to GitHub
2. Or click **"Deploy"** in the Railway dashboard
3. Watch the build logs for any errors

## Step 8: Create Initial Superuser (After First Deploy)

Railway doesn't support interactive commands, so you need to create accounts differently:

### Option 1: Use Django Admin Interface
1. Open your Railway service settings
2. Go to the **"Variables"** tab and temporarily set: `DEBUG=True`
3. Redeploy
4. Visit: `https://your-app.railway.app/admin/`
5. Use the registration endpoint or create users via API

### Option 2: Use Railway CLI
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Run command
railway run python manage.py createsuperuser
```

### Option 3: Create via Script
Your `create_initial_accounts.py` script can be run once after deployment:
```bash
railway run python create_initial_accounts.py
```

## Step 9: Update Frontend API URL

After deployment, Railway will give you a URL like:
```
https://your-app-name.railway.app
```

Update your frontend's API configuration:

**File:** `dorotheo-dental-clinic-website/frontend/lib/api.ts`

Change:
```typescript
const API_URL = 'http://localhost:8000/api';
```

To:
```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://your-app-name.railway.app/api';
```

Then add this to your Vercel environment variables:
```
NEXT_PUBLIC_API_URL=https://your-app-name.railway.app/api
```

## Step 10: Test Your Deployment

1. Visit your Railway URL: `https://your-app-name.railway.app`
2. Test the API endpoints: `https://your-app-name.railway.app/api/`
3. Check admin panel: `https://your-app-name.railway.app/admin/`

## Common Issues & Solutions

### Issue: "Application Error" or 500 Error
**Solution:** Check the logs in Railway dashboard for detailed errors

### Issue: Static files not loading
**Solution:** The deployment script runs `collectstatic` automatically. Check logs.

### Issue: Database connection errors
**Solution:** Make sure PostgreSQL is added and `DATABASE_URL` variable exists

### Issue: CORS errors from frontend
**Solution:** Update `CORS_ALLOWED_ORIGINS` or keep `CORS_ALLOW_ALL_ORIGINS=True`

### Issue: Media files not persisting
**Solution:** Railway's filesystem is ephemeral. For production, use:
- Railway Volumes (persistent storage)
- AWS S3
- Cloudinary
- Any cloud storage service

## Railway Free Tier Limits

- **$5 free credits per month**
- **500 hours of execution time**
- **100 GB bandwidth**
- **512 MB RAM**
- **1 GB storage**

This is perfect for development and small projects!

## Custom Domain (Optional)

1. In Railway, go to your service → **Settings**
2. Click **"Add Custom Domain"**
3. Follow the instructions to add your domain
4. Update `ALLOWED_HOSTS` with your custom domain

## Monitoring & Logs

- View real-time logs in Railway dashboard
- Monitor resource usage under **Metrics** tab
- Set up alerts for errors

## Continuous Deployment

Railway automatically redeploys when you push to your GitHub repository's main branch.

To disable auto-deploy:
1. Go to **Settings** → **Service**
2. Toggle off **"Auto Deploy"**

## Need Help?

- Railway Docs: https://docs.railway.app/
- Railway Discord: https://discord.gg/railway
- Django Deployment Checklist: https://docs.djangoproject.com/en/4.2/howto/deployment/checklist/

---

## Quick Deploy Checklist

- [ ] Push code to GitHub
- [ ] Create Railway project
- [ ] Set root directory to `dorotheo-dental-clinic-website/backend`
- [ ] Add PostgreSQL database
- [ ] Set environment variables (SECRET_KEY, DEBUG, ALLOWED_HOSTS)
- [ ] Deploy
- [ ] Create initial user accounts
- [ ] Update frontend API URL
- [ ] Test all endpoints
- [ ] Set DEBUG=False for production

---

**Your backend will be live at:** `https://your-app-name.railway.app`

Good luck with your deployment! 🚀
