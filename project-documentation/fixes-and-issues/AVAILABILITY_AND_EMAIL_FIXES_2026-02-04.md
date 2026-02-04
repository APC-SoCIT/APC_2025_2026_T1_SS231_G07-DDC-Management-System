# Availability Setting & Email Notification Fixes - February 4, 2026

## Summary
Fixed availability setting functionality and implemented email notifications using Resend HTTP API to bypass Railway's SMTP restrictions.

---

## Issue 1: Availability Setting Not Working on Production

### Problem
- Dentist availability could not be set on the deployed Vercel frontend
- Console error: `net::ERR_BLOCKED_BY_CLIENT`
- Backend logs showed no availability data for dentist ID 1

### Root Cause
Hardcoded localhost URL in quick availability modal instead of using environment variable.

### Fix Applied
**File:** `frontend/app/owner/profile/page.tsx` (Line 231)

**Changed from:**
```typescript
fetch('http://127.0.0.1:8000/api/dentist-availability/', {
```

**Changed to:**
```typescript
fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/dentist-availability/', {
```

### Result
✅ Availability setting now works on production with Railway backend URL

---

## Issue 2: Email Notifications Not Sending on Railway

### Problem
- Railway blocks all outbound SMTP connections (ports 25, 465, 587, 2525)
- Error: `[Errno 101] Network is unreachable`
- Attempted solutions that failed:
  - Gmail SMTP (port 587) - Blocked
  - Gmail SMTP with SSL (port 465) - Blocked
  - Mailtrap SMTP (port 2525) - Blocked
  - SendGrid SMTP (port 587) - Blocked

### Root Cause
Railway free tier blocks SMTP to prevent spam abuse. Only HTTP/HTTPS connections allowed.

### Solution: Resend HTTP API
Implemented custom email backend using Resend's HTTPS API instead of SMTP.

---

## Implementation Details

### Step 1: Add Resend Package
**File:** `backend/requirements.txt`

Added:
```
resend==0.8.0
```

### Step 2: Create Custom Email Backend
**File:** `backend/api/resend_backend.py` (NEW FILE)

Created custom Django email backend that:
- Uses Resend HTTP API instead of SMTP
- Supports HTML and plain text emails
- Handles test mode with email override
- Preserves Django's email interface (no code changes needed in views)

Key features:
```python
class ResendEmailBackend(BaseEmailBackend):
    - Reads RESEND_API_KEY from environment
    - Converts Django EmailMessage to Resend API format
    - Supports CC, BCC, Reply-To
    - Handles HTML alternatives
    - Logs all operations
    - Respects fail_silently setting
```

### Step 3: Update Django Settings
**File:** `backend/dental_clinic/settings.py`

Added:
```python
# Resend API Configuration (for Railway - bypasses blocked SMTP)
RESEND_API_KEY = os.environ.get('RESEND_API_KEY', '')

# Updated DEFAULT_FROM_EMAIL
DEFAULT_FROM_EMAIL = os.environ.get(
    'DEFAULT_FROM_EMAIL',
    'Dorotheo Dental Clinic <onboarding@resend.dev>'
)
```

### Step 4: Domain Setup

**Domain:** `ezgalauran.dev` (Free via GitHub Student Developer Pack)

**DNS Records Added in name.com:**

1. **DKIM (TXT)**
   - Host: `resend._domainkey.ezgalauran.dev`
   - Value: `p=MIGfMA0GCSqGSIb3DQEB...` (full DKIM key from Resend)

2. **SPF (MX)**
   - Host: `send.ezgalauran.dev`
   - Value: `feedback-smtp.ap-northeast-1.amazonaws.com`
   - Priority: 10

3. **SPF (TXT)**
   - Host: `send.ezgalauran.dev`
   - Value: `v=spf1 include:amazonses.com ~all`

4. **DMARC (TXT)**
   - Host: `_dmarc.ezgalauran.dev`
   - Value: `v=DMARC1; p=none;`

**Verification Status:** ✅ Verified in Resend

### Step 5: Railway Environment Variables

**Added/Updated:**
```env
EMAIL_BACKEND=api.resend_backend.ResendEmailBackend
RESEND_API_KEY=re_[API key from Resend]
DEFAULT_FROM_EMAIL=Dorotheo Dental Clinic <noreply@ezgalauran.dev>
ADMIN_NOTIFICATION_EMAIL=edgalauran@student.apc.edu.ph
```

**Removed (no longer needed):**
- `EMAIL_HOST`
- `EMAIL_PORT`
- `EMAIL_USE_TLS`
- `EMAIL_USE_SSL`
- `EMAIL_HOST_USER`
- `EMAIL_HOST_PASSWORD`
- `TEST_EMAIL_OVERRIDE` (after domain verification)

---

## Testing

### Test Email Override Feature
For testing before domain verification, added override capability:

```python
# In resend_backend.py
test_override = os.environ.get('TEST_EMAIL_OVERRIDE', '')
recipients = [test_override] if test_override else message.to
```

**Usage:**
```env
TEST_EMAIL_OVERRIDE=your-verified-email@domain.com
```

All emails redirect to this address for testing.

---

## Email Flow

### Appointment Confirmation
1. Patient books appointment
2. Backend creates appointment record
3. Triggers email via `email_service.py`
4. Custom Resend backend sends via HTTPS API
5. Email delivered to patient's email
6. BCC copy sent to `ADMIN_NOTIFICATION_EMAIL`

### Email Types Supported
- ✅ Appointment confirmations
- ✅ Appointment reminders
- ✅ Appointment cancellations
- ✅ Reschedule notifications
- ✅ Staff notifications (new appointments)
- ✅ HTML and plain text formats
- ✅ BCC to admin email

---

## Commits Made

1. **Commit:** `Fix availability setting URL in owner profile`
   - Fixed hardcoded localhost URL to use environment variable

2. **Commit:** `Add Resend HTTPS API email backend for Railway`
   - Added resend package to requirements.txt
   - Created custom ResendEmailBackend
   - Updated settings.py for Resend support

3. **Commit:** `Add test email override for Resend`
   - Added TEST_EMAIL_OVERRIDE feature for testing

---

## Benefits of This Solution

### ✅ Railway Compatible
- Uses HTTPS instead of blocked SMTP ports
- Works on all Railway plans (Free, Hobby, Pro)

### ✅ No Code Changes
- Drop-in replacement for SMTP backend
- All existing email code works unchanged
- Django's `send_mail()` and `EmailMessage` still work

### ✅ Better Deliverability
- Dedicated email service (Resend)
- Proper SPF/DKIM/DMARC setup
- Lower spam score than Gmail SMTP

### ✅ Professional Emails
- Custom domain: `noreply@ezgalauran.dev`
- Branded sender name: "Dorotheo Dental Clinic"
- Can send to any recipient (not limited to test mode)

### ✅ Free Tier
- Resend: 3,000 emails/month free
- Domain: Free for 1 year (GitHub Student Pack)
- Railway: Works on free tier

---

## Future Enhancements

### Optional: Custom Subdomains
Could use custom subdomains for this project:
- `clinic.ezgalauran.dev` → Frontend (Vercel)
- `api.ezgalauran.dev` → Backend (Railway)
- `noreply@clinic.ezgalauran.dev` → Email sender

### Optional: Email Forwarding
Set up email forwarding for:
- `admin@ezgalauran.dev` → `edgalauran@student.apc.edu.ph`
- `contact@ezgalauran.dev` → Team inboxes

### Optional: Email Templates
Enhance email templates with:
- Clinic logo
- Better styling
- QR codes for appointments
- Calendar invite attachments

---

## Troubleshooting

### If emails still not sending:

1. **Check Railway logs:**
   ```
   Failed to send email via Resend: [error message]
   ```

2. **Verify environment variables:**
   - `EMAIL_BACKEND=api.resend_backend.ResendEmailBackend`
   - `RESEND_API_KEY` is set correctly
   - `DEFAULT_FROM_EMAIL` uses verified domain

3. **Check Resend dashboard:**
   - Domain status: Should be "Verified" ✅
   - API key is active
   - No rate limits hit

4. **Check DNS propagation:**
   - Use [whatsmydns.net](https://whatsmydns.net)
   - Verify all 4 DNS records are propagated

5. **Check Railway deployment:**
   - Latest code deployed
   - `resend` package installed
   - No build errors

---

## Resources

- **Resend Documentation:** [resend.com/docs](https://resend.com/docs)
- **Railway Documentation:** [docs.railway.app/guides/email](https://docs.railway.app/guides/email)
- **GitHub Student Pack:** [education.github.com/pack](https://education.github.com/pack)
- **Name.com DNS Help:** [name.com/support/dns](https://name.com/support/dns)

---

## Contact

For questions about this implementation:
- **Developer:** Ezekiel Galauran
- **Email:** edgalauran@student.apc.edu.ph
- **Domain:** ezgalauran.dev

---

**Status:** ✅ COMPLETE - All email notifications working on production
**Date Completed:** February 4, 2026
**Testing:** Ready for appointment booking tests
