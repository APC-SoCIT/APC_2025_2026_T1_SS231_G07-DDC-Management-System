# Automated Tasks Quick Reference Guide

## 🎯 What You Need to Set Up

Your system needs 3 automated tasks (cron jobs):

| Task | Frequency | Purpose |
|------|-----------|---------|
| 📅 Appointment Reminders | Daily at 9 AM | Email patients 24h before appointments |
| 💰 Payment Reminders | Weekly (Monday) | Email patients about overdue invoices |
| 📦 Low Stock Alerts | Daily at 8 AM | Email staff when inventory is low |

---

## 💰 Cost: 100% FREE ✅

- **Azure Web App**: WebJobs included, no extra cost
- **Local Development**: Windows Task Scheduler is free
- **No paid services required**

---

## 🚀 Azure Web App Setup (Production)

### Quick Steps:

1. **Go to Azure Portal**: https://portal.azure.com
2. **Find your App Service** (backend)
3. **Click "WebJobs"** in left sidebar
4. **Click "+ Add"** and create each job:

#### Job 1: Appointment Reminders
- Name: `AppointmentReminders`
- File: Upload `webjobs/send_appointment_reminders.sh`
- Type: **Triggered**
- Schedule: `0 9 * * *` (Daily 9 AM UTC)

#### Job 2: Payment Reminders
- Name: `PaymentReminders`
- File: Upload `webjobs/send_payment_reminders.sh`
- Type: **Triggered**
- Schedule: `0 10 * * 1` (Monday 10 AM UTC)

#### Job 3: Low Stock Alerts
- Name: `LowStockAlerts`
- File: Upload `webjobs/send_low_stock_alerts.sh`
- Type: **Triggered**
- Schedule: `0 8 * * *` (Daily 8 AM UTC)

5. **Enable "Always On"**:
   - Go to Configuration → General Settings
   - Set "Always On" to **ON**
   - Save

### Time Zone Conversion (UTC)

Your backend is on Azure (UTC timezone). Convert local times:

| Local Time (PH) | UTC Time | CRON Expression |
|----------------|----------|-----------------|
| 9:00 AM | 1:00 AM | `0 1 * * *` |
| 10:00 AM | 2:00 AM | `0 2 * * *` |
| 8:00 AM | 12:00 AM | `0 0 * * *` |

**Example**: To run at 9 AM Philippines time (UTC+8), use `0 1 * * *`

### Testing on Azure

1. Click on WebJob name
2. Click **"Run"** button
3. Click **"Logs"** to see output
4. Check if emails were sent

📖 **Full Guide**: [AZURE_AUTOMATED_TASKS_SETUP.md](AZURE_AUTOMATED_TASKS_SETUP.md)

---

## 💻 Local Development Setup

### Option 1: Python Scheduler (Easiest for Testing)

```bash
cd dorotheo-dental-clinic-website\backend
venv\Scripts\activate

# Install schedule library
pip install schedule

# Run the scheduler
python run_scheduler.py
```

**Advantages**:
- ✅ See real-time output
- ✅ No admin privileges needed
- ✅ Easy to start/stop

**Disadvantage**:
- ❌ Must keep terminal open

---

### Option 2: Windows Task Scheduler (Production-like)

**Automated Setup** (Run as Administrator):

```powershell
cd dorotheo-dental-clinic-website\backend
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\setup_scheduled_tasks.ps1
```

This creates 3 Windows scheduled tasks automatically.

**View/Manage Tasks**:
1. Press `Win + R`
2. Type: `taskschd.msc`
3. Look for tasks starting with `DentalClinic-`

**To Remove**:
```powershell
.\remove_scheduled_tasks.ps1
```

📖 **Full Guide**: [LOCAL_AUTOMATED_TASKS_SETUP.md](LOCAL_AUTOMATED_TASKS_SETUP.md)

---

## 🧪 Testing Manually

Test commands before setting up automation:

```bash
cd dorotheo-dental-clinic-website\backend
venv\Scripts\activate

# Test appointment reminders
python manage.py send_appointment_reminders

# Test payment reminders
python manage.py send_payment_reminders

# Test low stock alerts
python manage.py send_low_stock_alerts

# Test with custom parameters
python manage.py send_appointment_reminders --hours=48
python manage.py send_payment_reminders --days=30
```

---

## 📋 CRON Expression Cheat Sheet

Format: `{minute} {hour} {day} {month} {day-of-week}`

| When | Expression | Example |
|------|-----------|---------|
| Every day at 9 AM | `0 9 * * *` | Daily reminders |
| Every Monday at 10 AM | `0 10 * * 1` | Weekly reports |
| Every 6 hours | `0 */6 * * *` | Frequent checks |
| Twice daily (9 AM, 5 PM) | `0 9,17 * * *` | Morning & evening |
| Weekdays only at 9 AM | `0 9 * * 1-5` | Business days |
| First of month at midnight | `0 0 1 * *` | Monthly tasks |

🔗 Test expressions: https://crontab.guru/

---

## ✅ Verification Checklist

After setup, verify:

### Azure (Production)
- [ ] All 3 WebJobs created in Azure Portal
- [ ] "Always On" enabled in Configuration
- [ ] Email settings configured (EMAIL_HOST_USER, EMAIL_HOST_PASSWORD)
- [ ] Test run successful (click "Run" button)
- [ ] Emails received by test recipients
- [ ] Logs show no errors

### Local Development
- [ ] Virtual environment activated
- [ ] Management commands tested manually
- [ ] Email settings configured locally
- [ ] Scheduled tasks created (Task Scheduler or Python scheduler)
- [ ] Test emails sent successfully

---

## 🚨 Common Issues & Fixes

### Issue: WebJob not running on Azure

**Fix**:
1. Enable "Always On" in Configuration
2. Check WebJob logs for errors
3. Verify Python path in scripts
4. Ensure database connection works

### Issue: No emails sent

**Fix**:
1. Check EMAIL_HOST_USER and EMAIL_HOST_PASSWORD in settings
2. Verify Gmail App Password (not regular password)
3. Test email manually:
   ```python
   python manage.py shell
   >>> from django.core.mail import send_mail
   >>> send_mail('Test', 'Body', 'from@example.com', ['to@example.com'])
   ```

### Issue: Wrong time zone

**Fix**:
- Azure uses UTC - convert your local time
- Philippines (UTC+8): Subtract 8 hours from local time
- Example: 9 AM local = 1 AM UTC = `0 1 * * *`

### Issue: Task not running on Windows

**Fix**:
1. Run Task Scheduler as Administrator
2. Check task History tab for error codes
3. Verify Python.exe path is correct
4. Ensure "Run whether user is logged on or not" is checked

---

## 📚 Files Created

### Management Commands
- ✅ `api/management/commands/send_appointment_reminders.py` (already existed)
- ✅ `api/management/commands/send_payment_reminders.py` (already existed)
- ✅ `api/management/commands/send_low_stock_alerts.py` **(NEW)**

### Azure WebJobs
- ✅ `webjobs/send_appointment_reminders.sh`
- ✅ `webjobs/send_payment_reminders.sh`
- ✅ `webjobs/send_low_stock_alerts.sh`
- ✅ `webjobs/README.md`

### Local Development
- ✅ `run_scheduler.py` - Python-based scheduler
- ✅ `setup_scheduled_tasks.ps1` - Windows Task Scheduler setup
- ✅ `remove_scheduled_tasks.ps1` - Remove tasks script

### Documentation
- ✅ `AZURE_AUTOMATED_TASKS_SETUP.md` - Full Azure guide
- ✅ `LOCAL_AUTOMATED_TASKS_SETUP.md` - Full local dev guide
- ✅ `AUTOMATED_TASKS_QUICK_REFERENCE.md` - This file

---

## 🎓 Next Steps

1. **For Local Development**:
   ```bash
   cd dorotheo-dental-clinic-website\backend
   venv\Scripts\activate
   python run_scheduler.py   # Keep this running
   ```

2. **For Azure Production**:
   - Follow the Azure WebJobs setup above
   - Upload the 3 shell scripts from `webjobs/` folder
   - Set CRON schedules
   - Enable "Always On"
   - Test each WebJob

3. **Monitor**:
   - Check WebJob logs in Azure Portal
   - Verify emails are being sent
   - Review Django application logs

---

## 📞 Need Help?

Refer to detailed guides:
- [Azure Setup Guide](AZURE_AUTOMATED_TASKS_SETUP.md)
- [Local Development Guide](LOCAL_AUTOMATED_TASKS_SETUP.md)
- [Email Notifications Testing](../setup-guides/EMAIL_NOTIFICATIONS_SETUP_AND_TESTING.md)

---

**Last Updated**: February 10, 2026  
**Status**: ✅ All files created and tested
