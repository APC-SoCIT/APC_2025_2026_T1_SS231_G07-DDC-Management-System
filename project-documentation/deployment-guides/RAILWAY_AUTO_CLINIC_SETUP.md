# Automatic Clinic Setup on Railway Deployment

**Last Updated:** February 4, 2026  
**Status:** ✅ Configured

---

## 🎯 Overview

Every time you deploy to Railway, the system automatically:
1. ✅ Runs database migrations
2. ✅ Creates/updates all 3 clinic locations with proper names & colors
3. ✅ Collects static files
4. ✅ Starts the server

**No manual intervention needed!** 🎉

---

## 🏥 Clinics Created Automatically

| Clinic | Color | Name in Database |
|--------|-------|------------------|
| **Bacoor (Main)** | 🟢 GREEN | `Dorotheo Dental Clinic - Bacoor (Main)` |
| **Alabang** | 🔵 BLUE | `Dorotheo Dental Clinic - Alabang` |
| **Poblacion** | 🟣 PURPLE | `Dorotheo Dental Clinic - Poblacion` |

---

## 📁 Configuration Files

### 1. **nixpacks.toml** (Railway's Build Config)
```toml
[start]
cmd = "chmod +x release.sh && ./release.sh && gunicorn dental_clinic.wsgi --bind 0.0.0.0:$PORT --workers 2"
```

### 2. **release.sh** (Deployment Script)
```bash
#!/bin/bash
python manage.py migrate --noinput
python manage.py create_clinics --skip-services
python manage.py collectstatic --noinput --clear
```

### 3. **Procfile** (Backup Config)
```
web: python manage.py migrate && python manage.py create_clinics --skip-services && ...
```

---

## 🔧 How It Works

### On Every Deployment:

1. **Railway builds** your Docker container
2. **Before starting the server**, Railway runs `release.sh`:
   - Migrates database schema
   - Runs `create_clinics` command (creates/updates clinics)
   - Collects static files
3. **Server starts** with Gunicorn

### The `create_clinics` Command:

- **Creates** clinics if they don't exist
- **Updates** existing clinics with correct names/addresses
- **Uses `--skip-services`** flag (services are assigned separately)
- **Idempotent**: Safe to run multiple times

---

## 🎨 Color Coding

Colors are **automatic** based on clinic names:

```typescript
// In frontend/components/clinic-badge.tsx
if (name.includes('bacoor') || name.includes('main'))  → 🟢 GREEN
if (name.includes('alabang'))                           → 🔵 BLUE
if (name.includes('poblacion') || name.includes('makati')) → 🟣 PURPLE
```

As long as the command creates clinics with these names, the frontend automatically applies the right colors!

---

## 🧪 Testing Locally

### Run the full release process locally:
```bash
cd backend
chmod +x release.sh
./release.sh
```

### Or run individual commands:
```bash
python manage.py migrate
python manage.py create_clinics
python manage.py collectstatic --noinput
```

---

## 🚀 Manual Run on Railway (If Needed)

If you ever need to run it manually:

```bash
# Option 1: Railway CLI
railway run python manage.py create_clinics

# Option 2: Railway Shell
railway shell
python manage.py create_clinics
```

---

## 📊 Verification

After deployment, check the Railway logs:

```
🚀 Starting Railway Release Process...
================================================
📦 Running database migrations...
✅ Migrations complete!

🏥 Setting up clinic locations...
======================================================================
🏥 CREATING CLINIC LOCATIONS
======================================================================
✓ Updated Main Clinic (Bacoor) - ID: 1
  Color: GREEN 🟢
✓ Alabang Clinic already exists - ID: 2
  Color: BLUE 🔵
✓ Poblacion Clinic already exists - ID: 3
  Color: PURPLE 🟣
...
✅ CLINIC SETUP COMPLETE!
======================================================================
```

---

## ⚠️ Important Notes

1. **`--skip-services` flag**: The command skips service assignment during deployment to avoid conflicts. Services should be managed through the admin panel or separately.

2. **Idempotent**: Running the command multiple times is safe. It will update existing clinics instead of creating duplicates.

3. **Database must exist**: Make sure Railway PostgreSQL is connected and environment variables are set before first deployment.

4. **New Railway Project**: When forking to a new Railway account, the clinics will be automatically created on first deployment.

---

## 🔄 Updating Clinic Information

### To change clinic addresses/phone numbers:

**Option 1: Update the command file**
1. Edit `backend/api/management/commands/create_clinics.py`
2. Update the address/phone in the command
3. Commit and push to GitHub
4. Railway will redeploy and update the clinics

**Option 2: Django Admin**
1. Go to `https://your-app.railway.app/admin/`
2. Navigate to **Api > Clinic Locations**
3. Edit the clinic records directly

---

## 📝 Adding More Clinics

To add a 4th clinic location:

1. Edit `create_clinics.py` command
2. Add new clinic creation code:
```python
new_clinic, created = ClinicLocation.objects.get_or_create(
    name="Dorotheo Dental Clinic - NewBranch",
    defaults={
        'address': "...",
        'phone': "..."
    }
)
```
3. Update `clinic-badge.tsx` with new color mapping:
```typescript
else if (lowerName.includes('newbranch')) {
    return 'bg-red-100 text-red-800 ...'; // 🔴 RED
}
```

---

## ✅ Deployment Checklist

- [x] `release.sh` created and executable
- [x] `nixpacks.toml` updated to run release script
- [x] `Procfile` updated as backup
- [x] `create_clinics.py` command created
- [x] Color mappings in `clinic-badge.tsx`
- [x] Tested locally
- [ ] Commit and push to GitHub
- [ ] Railway auto-deploys
- [ ] Verify in Railway logs
- [ ] Check frontend displays correct colors

---

## 🆘 Troubleshooting

### Clinics not created on deployment?

1. Check Railway logs for errors
2. Verify `release.sh` has execute permissions
3. Check if migrations ran successfully
4. Manually run: `railway run python manage.py create_clinics`

### Colors not showing correctly?

1. Verify clinic names match the patterns (Bacoor, Alabang, Poblacion)
2. Check `frontend/components/clinic-badge.tsx` color mapping
3. Clear browser cache and refresh

### Command fails during deployment?

1. Check if Django app is in `INSTALLED_APPS`
2. Verify `api/management/commands/` directory structure
3. Check Railway environment variables are set
4. Test command locally first

---

## 📚 Related Files

- `backend/api/management/commands/create_clinics.py` - Main command
- `backend/release.sh` - Deployment script
- `backend/nixpacks.toml` - Railway build config
- `backend/Procfile` - Alternative process config
- `frontend/components/clinic-badge.tsx` - Color mapping logic
- `backend/api/models.py` - ClinicLocation model
