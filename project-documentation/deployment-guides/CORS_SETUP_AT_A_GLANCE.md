# CORS Setup at a Glance

**Azure Backend (Django) ↔️ Vercel Frontend (Next.js)**

---

## Backend (Azure)

**Package:** `django-cors-headers==4.3.1`

**settings.py:**
```python
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # ← MUST BE FIRST
    # ... rest
]

CORS_ALLOWED_ORIGINS = [
    'https://your-app.vercel.app',
    'http://localhost:3000',
]

CORS_ALLOW_CREDENTIALS = True
```

**Azure Environment Variables:**
```bash
CORS_ALLOWED_ORIGINS=https://your-app.vercel.app  # Optional: adds to list
ALLOWED_HOSTS=your-backend.azurewebsites.net
```

---

## Frontend (Vercel)

**api.ts:**
```typescript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL

fetch(url, {
  credentials: 'include',  // ← For cookies/auth
  // ...
})
```

**Vercel Environment Variables:**
```bash
NEXT_PUBLIC_API_URL=https://your-backend.azurewebsites.net
```

---

## ⚠️ Critical

**❌ REMOVE THIS from Azure:**
```bash
CORS_ALLOW_ALL_ORIGINS=True  # ← Security risk! Delete it!
```

---

## How They Work Together

1. **Hardcoded list** in settings.py = base origins (dev + stable prod URLs)
2. **Environment variable** = adds extra origins (preview deployments)
3. Both lists are **combined** (not replaced)

---

## Quick Test

**Browser DevTools (F12) → Network → Check response headers:**
```
Access-Control-Allow-Origin: https://your-app.vercel.app ✅
Access-Control-Allow-Credentials: true ✅
```

---
