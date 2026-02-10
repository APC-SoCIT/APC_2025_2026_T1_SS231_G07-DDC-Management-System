# 🚀 Quick Start: Testing Email Notifications

## Step 1: Activate Virtual Environment

```bash
cd C:\Users\Ezekiel\Downloads\original repo\APC_2025_2026_T1_SS231_G07-DDC-Management-System\dorotheo-dental-clinic-website\backend

.\venv\Scripts\activate
```

## Step 2: Verify Email Settings

Your `.env` file should have:
```env
# For development - emails print to console
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
```

## Step 3: Run the Test Script

```bash
python test_emails.py
```

This will test **all 10 email types** and show results in your console.

## Step 4: Check the Output

You should see emails printed in your console like this:

```
📧 EMAIL NOTIFICATION TESTING
============================================================

✓ Using test patient: John Doe (john@example.com)
✓ Using test dentist: Dr. Jane Smith
✓ Using test service: Dental Cleaning

1️⃣  Testing: Appointment Confirmation Email
   ✅ SUCCESS - Check your email output

Content-Type: text/html; charset="utf-8"
MIME-Version: 1.0
Subject: Appointment Confirmed - February 15, 2026
From: Dorotheo Dental Clinic <noreply@dorothedentallossc.com.ph>
To: john@example.com

<html>
  <body>
    <h2>✅ Appointment Confirmed</h2>
    ...
  </body>
</html>
```

## Step 5: Test Individual Emails (Optional)

```bash
# Open Django shell
python manage.py shell
```

```python
# Test a single email type
from api.models import Appointment
from api.email_service import send_appointment_confirmation

appointment = Appointment.objects.filter(status='confirmed').first()
send_appointment_confirmation(appointment)
```

## Step 6: Test Management Commands

```bash
# Test appointment reminders (for tomorrow's appointments)
python manage.py send_appointment_reminders

# Test payment reminders (for overdue invoices)
python manage.py send_payment_reminders
```

---

## 🎯 What You Should See

### ✅ If everything works:
- Console shows "✅ SUCCESS" for each email type
- Full HTML email content printed to console
- Test summary shows "🎉 All tests passed!"

### ❌ If something fails:
- Check that you have test data (patients, appointments, etc.)
- Verify EMAIL_BACKEND is set correctly in `.env`
- Check for error messages in the output

---

## 🔄 Next Steps

### For Development (Current):
✅ You're all set! Emails will print to console.

### For Production (Later):
1. Sign up for [Mailtrap](https://mailtrap.io/) (free)
2. Update `.env` with Mailtrap credentials:
   ```env
   EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
   EMAIL_HOST=smtp.mailtrap.io
   EMAIL_PORT=2525
   EMAIL_HOST_USER=your_username
   EMAIL_HOST_PASSWORD=your_password
   EMAIL_USE_TLS=True
   ```
3. Run tests again - emails will appear in Mailtrap inbox

---

## 📚 Full Documentation

See `EMAIL_NOTIFICATIONS_SETUP_AND_TESTING.md` for:
- Complete setup instructions
- All testing methods
- Production email services
- Troubleshooting guide
- Automated cron job setup

---

**Need Help?**
- Check the console output for error messages
- Verify you have test data in the database
- Make sure Django server is running
- Review the full documentation
