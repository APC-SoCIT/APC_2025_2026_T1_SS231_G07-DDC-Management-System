# Local Development - Automated Tasks Setup Guide

## 🎯 Overview

This guide shows you how to set up **automated tasks** during **local development** on Windows to test:
- 📅 Appointment reminders
- 💰 Payment reminders  
- 📦 Low stock alerts

**Cost**: ✅ **100% FREE** - Uses built-in Windows Task Scheduler

---

## 🪟 Windows Task Scheduler Setup

### Method 1: Using Task Scheduler GUI (Easiest)

#### Step 1: Open Task Scheduler

1. Press `Win + R`
2. Type: `taskschd.msc`
3. Press Enter

#### Step 2: Create Appointment Reminders Task

1. **Right-click** "Task Scheduler Library"
2. Select **"Create Basic Task..."**
3. **Name**: `Dental Clinic - Appointment Reminders`
4. **Description**: `Send appointment reminder emails daily`
5. Click **Next**

**Trigger:**
- Select: **Daily**
- Start: Today
- Time: `09:00:00` (9:00 AM)
- Recur every: `1` days
- Click **Next**

**Action:**
- Select: **Start a program**
- Click **Next**

**Program/script:**
```
C:\Users\Ezekiel\Downloads\original repo\APC_2025_2026_T1_SS231_G07-DDC-Management-System\dorotheo-dental-clinic-website\backend\venv\Scripts\python.exe
```

**Add arguments:**
```
manage.py send_appointment_reminders
```

**Start in:**
```
C:\Users\Ezekiel\Downloads\original repo\APC_2025_2026_T1_SS231_G07-DDC-Management-System\dorotheo-dental-clinic-website\backend
```

- Click **Next** → **Finish**

#### Step 3: Create Payment Reminders Task

Repeat Step 2 with these settings:
- **Name**: `Dental Clinic - Payment Reminders`
- **Trigger**: Weekly, Every Monday at 10:00 AM
- **Arguments**: `manage.py send_payment_reminders`

#### Step 4: Create Low Stock Alerts Task

Repeat Step 2 with these settings:
- **Name**: `Dental Clinic - Low Stock Alerts`
- **Trigger**: Daily at 8:00 AM
- **Arguments**: `manage.py send_low_stock_alerts`

#### Step 5: Configure Advanced Settings

For each task:
1. **Right-click** the task → **Properties**
2. **General tab**:
   - ☑ Run whether user is logged on or not
   - ☐ Do not store password
   - ☑ Run with highest privileges
3. **Conditions tab**:
   - ☐ Start only if the computer is on AC power
   - ☑ Wake the computer to run this task
4. **Settings tab**:
   - ☑ Allow task to be run on demand
   - ☑ Run task as soon as possible after scheduled start is missed
   - ☐ Stop the task if it runs longer than: (uncheck or set to 1 hour)
5. Click **OK**

---

### Method 2: Using PowerShell Script (Advanced)

Create `setup_scheduled_tasks.ps1` in your backend folder:

```powershell
# Setup Automated Tasks for Local Development
# Run as Administrator: .\setup_scheduled_tasks.ps1

$ProjectRoot = "C:\Users\Ezekiel\Downloads\original repo\APC_2025_2026_T1_SS231_G07-DDC-Management-System\dorotheo-dental-clinic-website\backend"
$PythonExe = "$ProjectRoot\venv\Scripts\python.exe"

# Task 1: Appointment Reminders (Daily 9 AM)
$Action1 = New-ScheduledTaskAction -Execute $PythonExe `
    -Argument "manage.py send_appointment_reminders" `
    -WorkingDirectory $ProjectRoot

$Trigger1 = New-ScheduledTaskTrigger -Daily -At 9:00AM

Register-ScheduledTask -TaskName "Dental-AppointmentReminders" `
    -Action $Action1 `
    -Trigger $Trigger1 `
    -Description "Send appointment reminder emails daily at 9 AM" `
    -Force

Write-Host "✓ Created: Appointment Reminders (Daily 9 AM)" -ForegroundColor Green

# Task 2: Payment Reminders (Weekly Monday 10 AM)
$Action2 = New-ScheduledTaskAction -Execute $PythonExe `
    -Argument "manage.py send_payment_reminders" `
    -WorkingDirectory $ProjectRoot

$Trigger2 = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday -At 10:00AM

Register-ScheduledTask -TaskName "Dental-PaymentReminders" `
    -Action $Action2 `
    -Trigger $Trigger2 `
    -Description "Send payment reminder emails weekly on Monday at 10 AM" `
    -Force

Write-Host "✓ Created: Payment Reminders (Weekly Monday 10 AM)" -ForegroundColor Green

# Task 3: Low Stock Alerts (Daily 8 AM)
$Action3 = New-ScheduledTaskAction -Execute $PythonExe `
    -Argument "manage.py send_low_stock_alerts" `
    -WorkingDirectory $ProjectRoot

$Trigger3 = New-ScheduledTaskTrigger -Daily -At 8:00AM

Register-ScheduledTask -TaskName "Dental-LowStockAlerts" `
    -Action $Action3 `
    -Trigger $Trigger3 `
    -Description "Send low stock alert emails daily at 8 AM" `
    -Force

Write-Host "✓ Created: Low Stock Alerts (Daily 8 AM)" -ForegroundColor Green

Write-Host "`n✅ All scheduled tasks created successfully!" -ForegroundColor Cyan
Write-Host "Open Task Scheduler (taskschd.msc) to view/manage tasks" -ForegroundColor Yellow
```

**To run:**
```powershell
# Open PowerShell as Administrator
cd "C:\Users\Ezekiel\Downloads\original repo\APC_2025_2026_T1_SS231_G07-DDC-Management-System\dorotheo-dental-clinic-website\backend"
.\setup_scheduled_tasks.ps1
```

**To remove tasks:**
```powershell
Unregister-ScheduledTask -TaskName "Dental-AppointmentReminders" -Confirm:$false
Unregister-ScheduledTask -TaskName "Dental-PaymentReminders" -Confirm:$false
Unregister-ScheduledTask -TaskName "Dental-LowStockAlerts" -Confirm:$false
```

---

## 🐍 Method 3: Python Scheduler (For Testing)

Create `run_scheduler.py` in backend folder:

```python
"""
Local development task scheduler
Run: python run_scheduler.py
Keep this running in a separate terminal during development
"""
import os
import django
import schedule
import time
from datetime import datetime

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'dental_clinic.settings')
django.setup()

from django.core.management import call_command

def send_appointment_reminders():
    """Run appointment reminders"""
    print(f"[{datetime.now()}] Running appointment reminders...")
    try:
        call_command('send_appointment_reminders')
        print("✓ Appointment reminders completed")
    except Exception as e:
        print(f"✗ Error: {e}")

def send_payment_reminders():
    """Run payment reminders"""
    print(f"[{datetime.now()}] Running payment reminders...")
    try:
        call_command('send_payment_reminders')
        print("✓ Payment reminders completed")
    except Exception as e:
        print(f"✗ Error: {e}")

def send_low_stock_alerts():
    """Run low stock alerts"""
    print(f"[{datetime.now()}] Running low stock alerts...")
    try:
        call_command('send_low_stock_alerts')
        print("✓ Low stock alerts completed")
    except Exception as e:
        print(f"✗ Error: {e}")

# Schedule tasks
schedule.every().day.at("09:00").do(send_appointment_reminders)
schedule.every().monday.at("10:00").do(send_payment_reminders)
schedule.every().day.at("08:00").do(send_low_stock_alerts)

print("=" * 60)
print("📅 LOCAL DEVELOPMENT TASK SCHEDULER")
print("=" * 60)
print("Scheduled tasks:")
print("  • Appointment Reminders: Daily at 9:00 AM")
print("  • Payment Reminders: Monday at 10:00 AM")
print("  • Low Stock Alerts: Daily at 8:00 AM")
print("=" * 60)
print("⏰ Scheduler is running... Press Ctrl+C to stop")
print("=" * 60 + "\n")

# Run scheduler
while True:
    schedule.run_pending()
    time.sleep(60)  # Check every minute
```

**Install required package:**
```bash
pip install schedule
```

**Run the scheduler:**
```bash
cd dorotheo-dental-clinic-website\backend
venv\Scripts\activate
python run_scheduler.py
```

**Advantages:**
- ✅ No administrator privileges needed
- ✅ Easy to see output in real-time
- ✅ Can modify schedule on the fly
- ✅ Good for testing

**Disadvantages:**
- ❌ Must keep terminal window open
- ❌ Won't run if terminal is closed
- ❌ Not suitable for production

---

## 🧪 Testing Tasks Manually

### Test via Django Shell

```bash
cd dorotheo-dental-clinic-website\backend
venv\Scripts\activate
python manage.py shell
```

```python
# Test appointment reminders
from django.core.management import call_command
call_command('send_appointment_reminders')

# Test payment reminders
call_command('send_payment_reminders')

# Test low stock alerts
call_command('send_low_stock_alerts')
```

### Test via Command Line

```bash
cd dorotheo-dental-clinic-website\backend
venv\Scripts\activate

# Test appointment reminders
python manage.py send_appointment_reminders

# Test payment reminders
python manage.py send_payment_reminders

# Test with custom parameters
python manage.py send_appointment_reminders --hours=48
python manage.py send_payment_reminders --days=30

# Test low stock alerts
python manage.py send_low_stock_alerts
```

---

## 🔍 Monitoring & Logs

### View Task History (Task Scheduler)

1. Open Task Scheduler
2. Select your task
3. Click **History** tab (bottom panel)
4. Review execution logs

### View Django Output

**Enable logging in Task Scheduler:**

1. Right-click task → **Properties**
2. **Actions** tab → **Edit**
3. Update **Add arguments** to:
```
manage.py send_appointment_reminders >> logs\scheduler.log 2>&1
```

Create `logs` folder in backend:
```bash
mkdir logs
```

View logs:
```bash
cd dorotheo-dental-clinic-website\backend
type logs\scheduler.log
# Or use PowerShell
Get-Content logs\scheduler.log -Tail 50
```

### Real-time Monitoring (Python Scheduler)

When using `run_scheduler.py`, you'll see output directly in the terminal:
```
[2026-02-10 09:00:00] Running appointment reminders...
Found 3 confirmed appointments
✓ Sent reminder to patient1@example.com
✓ Sent reminder to patient2@example.com
✓ Sent reminder to patient3@example.com
✓ Appointment reminders completed
```

---

## 🚨 Troubleshooting

### Task Not Running

**Issue**: Task shows in scheduler but doesn't execute

**Solution**:
1. Check task **Last Run Result** (0x0 = success)
2. Verify Python path is correct
3. Ensure virtual environment is activated (use full path to venv Python)
4. Check "Run whether user is logged on or not" is enabled
5. Review History tab for error codes

### No Emails Sent

**Issue**: Task runs but no emails delivered

**Solution**:
1. Check email configuration in `settings.py`
2. Verify `EMAIL_HOST_USER` and `EMAIL_HOST_PASSWORD`
3. Test email manually:
   ```python
   from django.core.mail import send_mail
   send_mail('Test', 'Body', 'from@example.com', ['to@example.com'])
   ```
4. Check logs for error messages

### Database Locked Error

**Issue**: `sqlite3.OperationalError: database is locked`

**Solution**:
1. Ensure Django development server is not running during scheduled tasks
2. Use PostgreSQL instead of SQLite for production-like testing
3. Add delay between tasks:
   ```python
   schedule.every().day.at("09:00").do(send_appointment_reminders)
   schedule.every().day.at("09:05").do(send_low_stock_alerts)  # 5 min gap
   ```

### Permission Denied

**Issue**: `Access is denied` when running task

**Solution**:
1. Run Task Scheduler as Administrator
2. Set task to run with highest privileges
3. Ensure Python executable is accessible
4. Check file permissions on manage.py

---

## 📋 Quick Reference

### Common Time Settings

| Schedule | Task Scheduler | Python Schedule |
|----------|---------------|-----------------|
| Daily 9 AM | Trigger: Daily at 09:00 | `schedule.every().day.at("09:00")` |
| Every Monday | Trigger: Weekly, Monday | `schedule.every().monday.at("10:00")` |
| Every 6 hours | Trigger: Daily, repeat every 6 hours | `schedule.every(6).hours` |
| Hourly | Trigger: Daily, repeat every 1 hour | `schedule.every().hour` |
| Every 15 min | Trigger: Daily, repeat every 15 minutes | `schedule.every(15).minutes` |

### Useful Commands

```bash
# Activate virtual environment
cd dorotheo-dental-clinic-website\backend
venv\Scripts\activate

# Run commands manually
python manage.py send_appointment_reminders
python manage.py send_payment_reminders
python manage.py send_low_stock_alerts

# View recent appointments
python manage.py shell
>>> from api.models import Appointment
>>> Appointment.objects.filter(status='confirmed').count()

# Check email settings
python manage.py shell
>>> from django.conf import settings
>>> print(settings.EMAIL_HOST, settings.EMAIL_HOST_USER)
```

---

## 💡 Best Practices

### For Development

1. **Use Python Scheduler** during active development
2. **Use Task Scheduler** for long-term local testing
3. **Test manually first** before scheduling
4. **Keep logs** to debug issues
5. **Use test emails** to avoid spamming real users

### Testing Schedule

During development, use shorter intervals:
```python
# Test mode: Run every 5 minutes
schedule.every(5).minutes.do(send_appointment_reminders)
```

Change back to real schedule before deployment:
```python
# Production: Daily at 9 AM
schedule.every().day.at("09:00").do(send_appointment_reminders)
```

---

## 🔗 Additional Resources

- [Windows Task Scheduler Guide](https://learn.microsoft.com/en-us/windows/win32/taskschd/task-scheduler-start-page)
- [Python Schedule Library](https://schedule.readthedocs.io/)
- [Django Management Commands](https://docs.djangoproject.com/en/4.2/howto/custom-management-commands/)

---

**Last Updated**: February 10, 2026  
**Tested On**: Windows 11 with Python 3.11
