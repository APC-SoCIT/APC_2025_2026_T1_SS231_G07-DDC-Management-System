# CORS Configuration Guide: Azure Web App Service & Vercel

## Overview

This document explains how Cross-Origin Resource Sharing (CORS) is configured between the **Django backend** (deployed on Azure Web App Service) and the **Next.js frontend** (deployed on Vercel) for Dorotheo Dental Clinic Management System.

**CORS** allows your frontend application to make requests to your backend API from a different domain, which is essential for production deployment where the frontend and backend are hosted on separate services.

---

## Architecture

```
┌─────────────────────────────┐         CORS-enabled        ┌──────────────────────────────┐
│   Frontend (Vercel)         │ ────────────────────────►  │  Backend (Azure Web App)     │
│   Next.js Application       │     HTTP Requests           │  Django REST API             │
│                             │                             │                              │
│   Domain:                   │                             │  Domain:                     │
│   *.vercel.app              │                             │  *.azurewebsites.net         │
└─────────────────────────────┘                             └──────────────────────────────┘
```

---

## Backend Configuration (Azure)

### 1. Django CORS Headers Package

The backend uses `django-cors-headers` (v4.3.1) to handle CORS requests.

**Installation:**
```python
# requirements.txt
django-cors-headers==4.3.1
```

### 2. Django Settings Configuration

**Location:** `backend/dental_clinic/settings.py`

#### Middleware Setup
```python
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # Must be first!
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    # ... other middleware
]
```

**⚠️ Important:** `CorsMiddleware` must be placed **before** any middleware that can generate responses (like `CommonMiddleware`).

#### CORS Configuration Settings

```python
# CORS Configuration - Use specific allowed origins when credentials are needed
# Cannot use CORS_ALLOW_ALL_ORIGINS with CORS_ALLOW_CREDENTIALS due to browser security
CORS_ALLOWED_ORIGINS = [
    'https://apc-2025-2026-t1-ss-231-g07-ddc-man-xi.vercel.app',  # Production Vercel URL
    'https://*.vercel.app',                                        # All Vercel preview deployments
    'http://localhost:3000',                                       # Local development (frontend)
    'http://localhost:8000',                                       # Local development (backend)
]

# Allow additional origins from environment variable
custom_cors_origins = os.environ.get('CORS_ALLOWED_ORIGINS', '')
if custom_cors_origins:
    CORS_ALLOWED_ORIGINS.extend(custom_cors_origins.split(','))

# Enable sending cookies and authentication headers
CORS_ALLOW_CREDENTIALS = True

# Allowed HTTP headers in requests
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]

# Allowed HTTP methods
CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]

# Cache preflight requests for 24 hours
CORS_PREFLIGHT_MAX_AGE = 86400
```

#### ALLOWED_HOSTS Configuration

```python
# ALLOWED_HOSTS configuration - support Azure and custom hosts
ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', '*').split(',')

# Add Azure hostname if running on Azure
if 'WEBSITE_HOSTNAME' in os.environ:
    ALLOWED_HOSTS.append(os.environ['WEBSITE_HOSTNAME'])

# Clean up empty strings and duplicates
ALLOWED_HOSTS = list(set(filter(None, ALLOWED_HOSTS)))
```

### 3. Azure Environment Variables

**Set in Azure Portal → App Service → Environment variables:**

| Variable | Value | Purpose |
|----------|-------|---------|
| `CORS_ALLOWED_ORIGINS` | `https://dorotheodentalclinic-awh63hzhaiasgt.azurewebsites.net,https://*.vercel.app,https://vercel.app,https://your-app.vercel.app` | Comma-separated list of allowed frontend origins |
| `ALLOWED_HOSTS` | `dorotheodentalclinic-awh63hzhaiasgt.azurewebsites.net` | Django allowed hosts |
| `WEBSITE_HOSTNAME` | (Auto-set by Azure) | Used to dynamically add Azure hostname |

## Frontend Configuration (Vercel)

### 1. API Base URL Configuration

**Location:** `frontend/lib/api.ts`

```typescript
// Normalize API base to always point to the backend API
const rawBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"
const trimmedBase = rawBase.replace(/\/+$/, "")
const API_BASE_URL = trimmedBase.endsWith("/api") ? trimmedBase : `${trimmedBase}/api`
```

### 2. Fetch Requests with Credentials

The frontend makes API requests using the `fetch` API with **credentials enabled**:

```typescript
const response = await fetch(`${API_BASE_URL}/login/`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",  // Sends cookies with request
  body: JSON.stringify({ username, password }),
})
```

**Key Points:**
- `credentials: "include"` ensures cookies (like session tokens) are sent with cross-origin requests
- This requires `CORS_ALLOW_CREDENTIALS = True` on the backend

### 3. Vercel Environment Variables

**Set in Vercel Dashboard → Project Settings → Environment Variables:**

| Variable | Value | Purpose |
|----------|-------|---------|
| `NEXT_PUBLIC_API_URL` | `https://dorotheodentalclinic-awh63hzhaiasgt.azurewebsites.net/api` | Azure backend URL |

**From your screenshot:**
- `NEXT_PUBLIC_API_URL` = `https://dorothdental.clinic-awh63thzhaiasgt.southeastasia-01.azurewebsites.net`

**Environment scopes:**
- Production
- Preview
- Development

---

## How CORS Works in This Setup

### Preflight Requests (OPTIONS)

For non-simple requests (POST, PUT, DELETE, or custom headers), the browser sends a **preflight request**:

```http
OPTIONS /api/appointments/ HTTP/1.1
Origin: https://apc-2025-2026-t1-ss-231-g07-ddc-man-xi.vercel.app
Access-Control-Request-Method: POST
Access-Control-Request-Headers: content-type, authorization
```

**Backend Response:**
```http
HTTP/1.1 200 OK
Access-Control-Allow-Origin: https://apc-2025-2026-t1-ss-231-g07-ddc-man-xi.vercel.app
Access-Control-Allow-Methods: POST, GET, OPTIONS, PUT, DELETE, PATCH
Access-Control-Allow-Headers: content-type, authorization, x-csrftoken
Access-Control-Allow-Credentials: true
Access-Control-Max-Age: 86400
```

### Actual Request

After preflight succeeds, the browser sends the actual request:

```http
POST /api/appointments/ HTTP/1.1
Origin: https://apc-2025-2026-t1-ss-231-g07-ddc-man-xi.vercel.app
Content-Type: application/json
Cookie: sessionid=...
```

**Backend Response:**
```http
HTTP/1.1 201 Created
Access-Control-Allow-Origin: https://apc-2025-2026-t1-ss-231-g07-ddc-man-xi.vercel.app
Access-Control-Allow-Credentials: true
Content-Type: application/json
```

---

## Security Considerations

### 1. ❌ AVOID: `CORS_ALLOW_ALL_ORIGINS = True`

**Why?** This allows **any** website to make requests to your API, potentially exposing sensitive data.

### 2. ✅ USE: Specific Origins

Always list specific origins:

```python
CORS_ALLOWED_ORIGINS = [
    'https://your-production-app.vercel.app',
    'https://*.vercel.app',  # Preview deployments
]
```

### 3. ⚠️ Wildcard Subdomains

Django CORS headers supports wildcards in subdomains:
- `https://*.vercel.app` allows all Vercel preview deployments
- This is useful for PR previews but consider the security implications

### 4. Credentials and Origins Compatibility

**Browser requirement:** When `credentials: 'include'` is used in frontend:
- Backend **MUST** set `CORS_ALLOW_CREDENTIALS = True`
- Backend **CANNOT** use `Access-Control-Allow-Origin: *`
- Backend **MUST** specify exact origin or use wildcard patterns

---

## Troubleshooting CORS Issues

### Common Error: "CORS policy blocked"

**Browser Console:**
```
Access to fetch at 'https://backend.azurewebsites.net/api/login/' from origin 
'https://frontend.vercel.app' has been blocked by CORS policy: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

**Solutions:**

1. **Check Backend Logs:**
   - Azure Portal → App Service → Log stream
   - Verify the request is reaching Django

2. **Verify Origins Match:**
   ```python
   # Backend - check what origin is being sent
   print(f"Request origin: {request.META.get('HTTP_ORIGIN')}")
   ```

3. **Check Environment Variables:**
   - Azure: Verify `CORS_ALLOWED_ORIGINS` includes Vercel URL
   - Vercel: Verify `NEXT_PUBLIC_API_URL` points to Azure backend

4. **Clear Browser Cache:**
   - CORS headers are cached by browsers
   - Use incognito/private browsing to test

5. **Verify Middleware Order:**
   - `CorsMiddleware` must be first in `MIDDLEWARE` list

### Error: "Credentials flag is true, but Access-Control-Allow-Credentials is not"

**Cause:** Backend doesn't allow credentials but frontend sends them.

**Fix:**
```python
# backend/dental_clinic/settings.py
CORS_ALLOW_CREDENTIALS = True
```

### Error: "Wildcard origin with credentials"

**Cause:** Cannot use `CORS_ALLOW_ALL_ORIGINS = True` with `CORS_ALLOW_CREDENTIALS = True`.

**Fix:** Use specific origins:
```python
CORS_ALLOW_ALL_ORIGINS = False  # or remove this line entirely
CORS_ALLOWED_ORIGINS = [
    'https://your-app.vercel.app',
]
```

## Recommended Production Setup

### Azure Environment Variables

```bash
# Set specific origins (replace with your actual URLs)
CORS_ALLOWED_ORIGINS=https://dorotheodentalclinic.vercel.app,https://dorotheodentalclinic-preview.vercel.app

# Allowed hosts
ALLOWED_HOSTS=dorotheodentalclinic-awh63hzhaiasgt.azurewebsites.net

# Do NOT set CORS_ALLOW_ALL_ORIGINS=True in production!
```

### Vercel Environment Variables

```bash
# Production environment
NEXT_PUBLIC_API_URL=https://dorotheodentalclinic-awh63hzhaiasgt.azurewebsites.net

# Preview/Development environments (can point to staging backend if available)
NEXT_PUBLIC_API_URL=https://dorotheodentalclinic-staging.azurewebsites.net
```

---

## Testing CORS Configuration

### Using curl

```bash
# Test preflight request
curl -X OPTIONS https://your-backend.azurewebsites.net/api/appointments/ \
  -H "Origin: https://your-app.vercel.app" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type" \
  -v

# Test actual request
curl -X GET https://your-backend.azurewebsites.net/api/appointments/ \
  -H "Origin: https://your-app.vercel.app" \
  -v
```

### Using Browser DevTools

1. Open your Vercel app in browser
2. Open DevTools (F12) → Network tab
3. Make a request to the backend
4. Check Response Headers for:
   - `Access-Control-Allow-Origin`
   - `Access-Control-Allow-Credentials`
   - `Access-Control-Allow-Methods`

---

## Additional Resources

- [Django CORS Headers Documentation](https://github.com/adamchainz/django-cors-headers)
- [MDN CORS Documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [Azure Web App Configuration](https://docs.microsoft.com/en-us/azure/app-service/configure-common)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)

---

## Summary

Dorotheo Dental Clinic Management System's current setup uses:
1. **Backend (Azure):** Django with `django-cors-headers` to control which domains can access the API
2. **Frontend (Vercel):** Next.js that makes API calls with credentials to the Azure backend
3. **Environment Variables:** Control the allowed origins and API URLs for different environments

The key to successful CORS configuration is ensuring:
- Backend explicitly allows the frontend's domain in `CORS_ALLOWED_ORIGINS`
- Frontend knows the correct backend URL via `NEXT_PUBLIC_API_URL`
- Credentials are properly configured on both ends when using authentication

---

**Last Updated:** February 2026  
**Project:** Dorotheo Dental Clinic Management System
