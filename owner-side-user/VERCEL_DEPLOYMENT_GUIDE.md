# Vercel Deployment Guide - Dental Clinic Management System

## Overview
This guide will help you deploy both the **Django Backend** and **Next.js Frontend** to Vercel.

---

## 🚀 Part 1: Deploy Django Backend API

### Step 1: Create Backend Deployment

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New Project"**
3. Select **"Import Git Repository"**
4. Choose: `APC_2025_2026_T1_SS231_G07-DDC-Management-System`

### Step 2: Configure Backend Settings

**Project Settings:**
- **Project Name**: `dental-clinic-api` (or your preferred name)
- **Root Directory**: `owner-side-user/backend`
- **Framework Preset**: Other
- **Build Command**: (leave empty - uses `build_files.sh`)
- **Output Directory**: (leave empty)
- **Install Command**: `pip install -r requirements.txt`

### Step 3: Add Environment Variables

Click **"Environment Variables"** and add:

```env
SECRET_KEY=your-super-secret-django-key-change-this
DEBUG=False
ALLOWED_HOSTS=.vercel.app
DATABASE_URL=postgresql://postgres.czghjgjhjwejvjwiwaby:S3nateHZ3XSwcTvj@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres
CORS_ALLOWED_ORIGINS=https://your-frontend-url.vercel.app
```

**Important Notes:**
- Replace `SECRET_KEY` with a new random key (generate one at https://djecrety.ir/)
- Replace `DATABASE_URL` with your actual Supabase connection string
- Update `CORS_ALLOWED_ORIGINS` after deploying frontend (Step 2)

### Step 4: Deploy Backend

1. Click **"Deploy"**
2. Wait for deployment to complete
3. Note your backend URL (e.g., `https://dental-clinic-api.vercel.app`)

---

## 🎨 Part 2: Deploy Next.js Frontend

### Step 1: Create Frontend Deployment

1. In Vercel Dashboard, click **"Add New Project"** again
2. Select the same repository: `APC_2025_2026_T1_SS231_G07-DDC-Management-System`

### Step 2: Configure Frontend Settings

**Project Settings:**
- **Project Name**: `dental-clinic-frontend` (or your preferred name)
- **Root Directory**: `owner-side-user/frontend`
- **Framework Preset**: Next.js
- **Build Command**: `pnpm build` (or `npm run build` if not using pnpm)
- **Install Command**: `pnpm install` (or `npm install`)
- **Output Directory**: `.next`

### Step 3: Add Environment Variables

Click **"Environment Variables"** and add:

```env
NEXT_PUBLIC_API_URL=https://your-backend-url.vercel.app
```

Replace `your-backend-url` with the URL from Step 1.4 above.

### Step 4: Deploy Frontend

1. Click **"Deploy"**
2. Wait for deployment to complete
3. Note your frontend URL (e.g., `https://dental-clinic-frontend.vercel.app`)

---

## 🔧 Part 3: Final Configuration

### Update Backend CORS

1. Go back to your **Backend project** in Vercel
2. Go to **Settings** → **Environment Variables**
3. Update `CORS_ALLOWED_ORIGINS`:
   ```
   CORS_ALLOWED_ORIGINS=https://your-frontend-url.vercel.app,http://localhost:3000
   ```
4. Click **"Redeploy"** to apply changes

### Update Frontend API URL (if needed)

If you need to update the API URL later:
1. Go to **Frontend project** in Vercel
2. **Settings** → **Environment Variables**
3. Update `NEXT_PUBLIC_API_URL`
4. Click **"Redeploy"**

---

## 📋 Checklist

### Backend Deployment ✅
- [ ] Backend deployed on Vercel
- [ ] Environment variables configured
- [ ] Supabase DATABASE_URL added
- [ ] SECRET_KEY generated and added
- [ ] DEBUG=False set
- [ ] ALLOWED_HOSTS includes .vercel.app
- [ ] Backend URL noted

### Frontend Deployment ✅
- [ ] Frontend deployed on Vercel
- [ ] NEXT_PUBLIC_API_URL configured
- [ ] Points to correct backend URL
- [ ] Frontend URL noted

### Final Configuration ✅
- [ ] Backend CORS updated with frontend URL
- [ ] Backend redeployed
- [ ] Test API endpoints
- [ ] Test frontend-backend connection
- [ ] All features working

---

## 🧪 Testing Your Deployment

### Test Backend API
Visit: `https://your-backend-url.vercel.app/api/users/`

Should return JSON data or authentication required message.

### Test Frontend
Visit: `https://your-frontend-url.vercel.app/`

Should load the dental clinic dashboard.

---

## 🐛 Common Issues & Solutions

### Issue 1: "CORS Error"
**Solution**: Make sure `CORS_ALLOWED_ORIGINS` in backend includes your frontend URL.

### Issue 2: "500 Internal Server Error"
**Solution**: Check backend logs in Vercel → Your Project → Deployments → Click deployment → Runtime Logs

### Issue 3: "Database Connection Failed"
**Solution**: Verify `DATABASE_URL` is correct and Supabase database is accessible.

### Issue 4: "Module Not Found"
**Solution**: Ensure `requirements.txt` (backend) or `package.json` (frontend) includes all dependencies.

### Issue 5: "Static Files Not Loading"
**Solution**: Run migrations on Supabase database:
```bash
# Locally, with DATABASE_URL pointing to Supabase
python manage.py migrate
python manage.py collectstatic --noinput
```

---

## 📝 Important Files

### Backend Files:
- `vercel.json` - Vercel configuration
- `build_files.sh` - Build script
- `requirements.txt` - Python dependencies
- `.env` - Environment variables (not committed to git)

### Frontend Files:
- `vercel.json` - Vercel configuration
- `package.json` - Node dependencies
- `.env.local` - Environment variables (not committed to git)

---

## 🔄 Redeployment

### When to Redeploy:
- Code changes pushed to GitHub (auto-deploys)
- Environment variables changed (manual redeploy needed)
- Database schema changes (run migrations first)

### How to Redeploy:
1. Go to Vercel Dashboard
2. Select your project
3. Click **"Deployments"** tab
4. Click **"..."** on latest deployment
5. Select **"Redeploy"**

---

## 📚 Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Django on Vercel](https://vercel.com/guides/deploying-django-with-vercel)
- [Next.js on Vercel](https://vercel.com/docs/frameworks/nextjs)
- [Supabase Documentation](https://supabase.com/docs)

---

## ✅ Deployment Complete!

Your dental clinic management system should now be live on Vercel! 🎉

- **Frontend**: https://your-frontend.vercel.app
- **Backend API**: https://your-backend.vercel.app

Remember to update the URLs in this document with your actual deployment URLs.
