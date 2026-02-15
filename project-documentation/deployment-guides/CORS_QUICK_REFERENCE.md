# CORS Configuration - Quick Reference

## 🚀 Quick Setup

### Backend (Azure)

```python
# settings.py
CORS_ALLOWED_ORIGINS = [
    'https://your-app.vercel.app',
    'http://localhost:3000',
]
CORS_ALLOW_CREDENTIALS = True
```

### Frontend (Vercel)

```typescript
// lib/api.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL

fetch(url, {
  credentials: 'include',
  // ... other options
})
```

### Environment Variables

**Azure Portal:**
```
CORS_ALLOWED_ORIGINS=https://your-app.vercel.app,https://localhost:3000
ALLOWED_HOSTS=your-backend.azurewebsites.net
```

**Vercel Dashboard:**
```
NEXT_PUBLIC_API_URL=https://your-backend.azurewebsites.net
```

---

## ⚠️ Common Issues

| Problem | Solution |
|---------|----------|
| "CORS policy blocked" | Add frontend URL to `CORS_ALLOWED_ORIGINS` |
| "Credentials not allowed" | Set `CORS_ALLOW_CREDENTIALS = True` |
| "Wildcard with credentials" | Remove `CORS_ALLOW_ALL_ORIGINS = True` |
| Preflight fails | Ensure `CorsMiddleware` is first |

---

## ✅ Security Checklist

- [ ] **Never** use `CORS_ALLOW_ALL_ORIGINS = True` in production
- [ ] Use specific origins in `CORS_ALLOWED_ORIGINS`
- [ ] Set `CORS_ALLOW_CREDENTIALS = True` for authentication
- [ ] Update origins when deploying to new domains
- [ ] Test from actual production URL, not localhost

---

## 🔍 Quick Test

### Browser DevTools
1. F12 → Network tab
2. Make API request
3. Check Response Headers:
   - `Access-Control-Allow-Origin: https://your-app.vercel.app` ✅
   - `Access-Control-Allow-Credentials: true` ✅

### Command Line
```bash
curl -X OPTIONS https://your-backend.azurewebsites.net/api/endpoint/ \
  -H "Origin: https://your-app.vercel.app" \
  -v | grep "Access-Control"
```

---

## 📚 Full Documentation

See [CORS_CONFIGURATION_AZURE_VERCEL.md](CORS_CONFIGURATION_AZURE_VERCEL.md) for detailed explanation.

---

**Current Setup:**
- Backend: Azure Web App Service (Django)
- Frontend: Vercel (Next.js)
- Package: `django-cors-headers==4.3.1`
