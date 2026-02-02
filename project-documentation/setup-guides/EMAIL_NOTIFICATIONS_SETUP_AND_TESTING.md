# Email Notifications - Testing Guide

## 📧 Testing Email Notifications During Development

### ✅ **Method 1: Console Backend (Easiest)**

Emails are printed to your terminal/console instead of being sent.

**Setup (Already Configured):**
```env
# .env file
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
```

**How to Test:**
1. Start your Django server:
   ```bash
   python manage.py runserver
   ```

2. Trigger an email action (book appointment, etc.)

3. Check your console/terminal - the email will be printed there

**Example Output:**
```
Content-Type: text/plain; charset="utf-8"
MIME-Version: 1.0
Content-Transfer-Encoding: 7bit
Subject: Appointment Confirmed - February 15, 2026
From: Dorotheo Dental Clinic <noreply@dorothedentallossc.com.ph>
To: patient@example.com
Date: Sun, 02 Feb 2026 10:30:00 -0000
Message-ID: <...>

Dear John Doe,

Your appointment has been confirmed...
```

---

### ✅ **Method 2: File Backend (Save to Files)**

Emails are saved as `.log` files in a directory.

**Setup:**
```env
# .env file
EMAIL_BACKEND=django.core.mail.backends.filebased.EmailBackend
EMAIL_FILE_PATH=/tmp/app-emails  # or C:/temp/app-emails on Windows
```

**How to Test:**
1. Create the directory:
   ```bash
   # Windows
   mkdir C:\temp\app-emails
   
   # Linux/Mac
   mkdir -p /tmp/app-emails
   ```

2. Start server and trigger emails

3. Check the directory - each email is saved as a file

---

### ✅ **Method 3: Mailtrap (Recommended for Development)**

Mailtrap is a fake SMTP server that catches emails - perfect for testing!

**Setup:**
1. Go to [mailtrap.io](https://mailtrap.io/) and create a free account

2. Get your SMTP credentials from the inbox

3. Update `.env`:
   ```env
   EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
   EMAIL_HOST=smtp.mailtrap.io
   EMAIL_PORT=2525
   EMAIL_HOST_USER=your_mailtrap_username
   EMAIL_HOST_PASSWORD=your_mailtrap_password
   EMAIL_USE_TLS=True
   DEFAULT_FROM_EMAIL=Dorotheo Dental Clinic <noreply@dorothedentallossc.com.ph>
   ```

4. Restart your server

**Benefits:**
- ✅ See emails in a real inbox interface
- ✅ Test HTML rendering
- ✅ Check spam scores
- ✅ Test with multiple recipients
- ✅ No emails actually sent to real addresses

---

### ✅ **Method 4: MailHog (Local SMTP Server)**

Run your own local email server.

**Setup:**
1. Download MailHog:
   - Windows: Download from [GitHub releases](https://github.com/mailhog/MailHog/releases)
   - Mac: `brew install mailhog`
   - Linux: Download binary

2. Start MailHog:
   ```bash
   mailhog
   ```

3. Update `.env`:
   ```env
   EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
   EMAIL_HOST=localhost
   EMAIL_PORT=1025
   EMAIL_USE_TLS=False
   ```

4. View emails at: http://localhost:8025

---

## 🧪 **Testing Scenarios**

### 1. Test Appointment Confirmation Email

```python
# In Django shell (python manage.py shell)
from api.models import Appointment
from api.email_service import send_appointment_confirmation

# Get an appointment
appointment = Appointment.objects.filter(status='confirmed').first()

# Send email
send_appointment_confirmation(appointment)
```

### 2. Test Appointment Reminder Email

```python
from api.email_service import send_appointment_reminder

appointment = Appointment.objects.filter(status='confirmed').first()
send_appointment_reminder(appointment)
```

### 3. Test Invoice Email

```python
from api.models import Billing
from api.email_service import send_invoice

billing = Billing.objects.first()
send_invoice(billing)
```

### 4. Test Payment Confirmation

```python
from api.email_service import send_payment_confirmation

# Get a paid billing record
billing = Billing.objects.filter(status='paid').first()
send_payment_confirmation(billing)
```

### 5. Test Low Stock Alert

```python
from api.models import InventoryItem, User
from api.email_service import send_low_stock_alert

# Get low stock item
item = InventoryItem.objects.filter(quantity__lte=models.F('minimum_stock')).first()

# Get staff emails
staff_emails = list(User.objects.filter(user_type='staff').values_list('email', flat=True))

send_low_stock_alert(item, staff_emails)
```

### 6. Test Management Commands

**Test Appointment Reminders:**
```bash
# Send reminders for appointments tomorrow
python manage.py send_appointment_reminders

# Send reminders for appointments in 48 hours
python manage.py send_appointment_reminders --hours=48
```

**Test Payment Reminders:**
```bash
# Send reminders for invoices older than 7 days
python manage.py send_payment_reminders

# Send reminders for invoices older than 30 days
python manage.py send_payment_reminders --days=30
```

---

## 🔧 **Manual Testing Workflow**

### Complete Test Sequence:

```bash
# 1. Activate virtual environment
.\venv\Scripts\activate  # Windows
source venv/bin/activate  # Mac/Linux

# 2. Start Django server (in one terminal)
python manage.py runserver

# 3. Open Django shell (in another terminal)
python manage.py shell

# 4. Run test commands (in shell)
from api.models import *
from api.email_service import *

# Create test appointment
patient = User.objects.filter(user_type='patient').first()
dentist = User.objects.filter(user_type='staff', role='dentist').first()
service = Service.objects.first()

appointment = Appointment.objects.create(
    patient=patient,
    dentist=dentist,
    service=service,
    date='2026-02-15',
    time='10:00 AM',
    status='confirmed'
)

# Test sending confirmation
send_appointment_confirmation(appointment)

# Check your console/Mailtrap to see the email!
```

---

## 📝 **Test Checklist**

### Appointment Emails:
- [ ] Appointment confirmation (status = confirmed)
- [ ] Appointment reminder (24h before)
- [ ] Appointment cancelled (by patient or staff)
- [ ] Reschedule approved
- [ ] Reschedule rejected

### Billing Emails:
- [ ] New invoice created
- [ ] Payment confirmation (paid)
- [ ] Payment reminder (pending, overdue)

### Inventory Emails:
- [ ] Low stock alert to staff

### Staff Notifications:
- [ ] New appointment request notification

---

## 🚀 **Production Setup (When Ready)**

### Option 1: Gmail SMTP

```env
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-clinic-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password  # Use App Password, not regular password
DEFAULT_FROM_EMAIL=Dorotheo Dental Clinic <your-clinic-email@gmail.com>
```

**Gmail App Password Setup:**
1. Go to Google Account Settings
2. Security → 2-Step Verification (enable if not enabled)
3. App Passwords → Generate new app password
4. Use that password in `EMAIL_HOST_PASSWORD`

### Option 2: SendGrid (Recommended for Production)

```env
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=apikey
EMAIL_HOST_PASSWORD=your-sendgrid-api-key
DEFAULT_FROM_EMAIL=Dorotheo Dental Clinic <noreply@dorothedentallossc.com.ph>
```

**SendGrid Setup:**
1. Sign up at [sendgrid.com](https://sendgrid.com/) (free tier: 100 emails/day)
2. Create an API key
3. Verify your sender email/domain
4. Use API key as password

### Option 3: AWS SES (Amazon Simple Email Service)

```env
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=email-smtp.us-east-1.amazonaws.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-ses-smtp-username
EMAIL_HOST_PASSWORD=your-ses-smtp-password
DEFAULT_FROM_EMAIL=Dorotheo Dental Clinic <noreply@dorothedentallossc.com.ph>
```

---

## 🔄 **Automated Reminders (Cron Jobs)**

### For Production Servers:

**Linux/Mac (crontab):**
```bash
# Edit crontab
crontab -e

# Add these lines:
# Send appointment reminders daily at 9 AM
0 9 * * * cd /path/to/project && python manage.py send_appointment_reminders

# Send payment reminders weekly on Monday at 10 AM
0 10 * * 1 cd /path/to/project && python manage.py send_payment_reminders
```

**Windows (Task Scheduler):**
1. Open Task Scheduler
2. Create Basic Task
3. Name: "Send Appointment Reminders"
4. Trigger: Daily at 9:00 AM
5. Action: Start a program
6. Program: `C:\path\to\python.exe`
7. Arguments: `C:\path\to\manage.py send_appointment_reminders`
8. Working directory: `C:\path\to\backend\`

**Railway/Render (Cron Jobs):**
Add to your deployment configuration:
```yaml
# render.yaml or railway.toml
services:
  - type: cron
    name: appointment-reminders
    schedule: "0 9 * * *"
    command: python manage.py send_appointment_reminders
    
  - type: cron
    name: payment-reminders
    schedule: "0 10 * * 1"
    command: python manage.py send_payment_reminders
```

---

## 🐛 **Troubleshooting**

### Email not appearing in console?
- Check that `EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend` in `.env`
- Restart Django server after changing `.env`
- Check terminal/console where `runserver` is running

### SMTP connection error?
- Check firewall/antivirus blocking port 587/465
- Verify credentials are correct
- Try `EMAIL_USE_SSL=True` with `EMAIL_PORT=465`
- Check if SMTP server allows connection from your IP

### Gmail "Less secure app" error?
- Don't use regular password - use App Password
- Enable 2-Step Verification first
- Generate App Password in Google Account settings

### Emails going to spam?
- Set up SPF, DKIM, DMARC records (for production)
- Use verified sender domain
- Avoid spam trigger words
- Test with Mailtrap spam score checker

---

## 📚 **Next Steps**

1. ✅ Start with Console Backend (easiest)
2. ✅ Sign up for Mailtrap (free)
3. ✅ Test all email types
4. ✅ Integrate email calls into your views
5. ✅ Set up cron jobs for automated reminders
6. ✅ Switch to production SMTP when deploying

---

## 💡 **Tips**

- **Development**: Use Console or Mailtrap
- **Testing**: Use real email addresses with Mailtrap
- **Production**: Use SendGrid, AWS SES, or Gmail SMTP
- **Always test emails before going live!**
- **Monitor email delivery rates in production**

---

**Created:** February 2, 2026  
**For:** Dorotheo Dental Clinic Management System
