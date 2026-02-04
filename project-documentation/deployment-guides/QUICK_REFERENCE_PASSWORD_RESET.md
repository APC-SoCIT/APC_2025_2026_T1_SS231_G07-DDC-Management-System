# Quick Reference: Password Reset Environment Variables

## Railway (Backend) - Required Variables

```bash
# ⚠️ CRITICAL - Must be set for password reset to work
FRONTEND_URL=https://your-frontend.vercel.app
EMAIL_BACKEND=api.resend_backend.ResendEmailBackend
RESEND_API_KEY=re_your_resend_api_key_here
DEFAULT_FROM_EMAIL=Dorotheo Dental Clinic <noreply@yourdomain.com>

# Core settings
SECRET_KEY=your-secret-key
DEBUG=False
DATABASE_URL=postgresql://user:pass@db.supabase.co:5432/postgres
ALLOWED_HOSTS=*.railway.app,*.vercel.app

# CORS
CORS_ALLOWED_ORIGINS=https://your-frontend.vercel.app
CSRF_TRUSTED_ORIGINS=https://your-backend.railway.app,https://your-frontend.vercel.app
```

## Vercel (Frontend) - Required Variables

```bash
NEXT_PUBLIC_API_URL=https://your-backend.railway.app/api
```

## Testing Password Reset

```bash
# 1. Request reset
curl -X POST https://your-backend.railway.app/api/password-reset/request/ \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'

# 2. Check email for reset link

# 3. Reset password with token
curl -X POST https://your-backend.railway.app/api/password-reset/confirm/ \
  -H "Content-Type: application/json" \
  -d '{"token": "YOUR_TOKEN", "new_password": "newpass123"}'
```

## Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| Email not sending | Check `RESEND_API_KEY` in Railway |
| Link goes to localhost | Set `FRONTEND_URL` in Railway |
| CORS errors | Add Vercel URL to `CORS_ALLOWED_ORIGINS` |
| Database errors | Verify `DATABASE_URL` in Railway |
| Modal doesn't open | Check `NEXT_PUBLIC_API_URL` in Vercel |

## Resend API Setup (2 minutes)

1. Go to https://resend.com
2. Sign up (free: 100 emails/day)
3. Get API key from https://resend.com/api-keys
4. Copy key (starts with `re_`)
5. Add to Railway as `RESEND_API_KEY`

## Verify Deployment

✅ Check Railway logs: `railway logs --tail`  
✅ Check Resend dashboard: https://resend.com/emails  
✅ Test: Forgot Password → Enter email → Check inbox  
✅ Click reset link → Should redirect to your Vercel site  
✅ Reset password → Should get confirmation email

## URLs to Update

Replace these placeholders with your actual URLs:

- `your-frontend.vercel.app` → Your actual Vercel domain
- `your-backend.railway.app` → Your actual Railway domain
- `noreply@yourdomain.com` → Your actual email address

## Need Help?

- Resend docs: https://resend.com/docs
- Railway logs: `railway logs --tail`
- Check [PASSWORD_RESET_PRODUCTION_SETUP.md](./PASSWORD_RESET_PRODUCTION_SETUP.md) for detailed guide
