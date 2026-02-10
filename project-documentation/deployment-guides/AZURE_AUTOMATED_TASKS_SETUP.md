# Azure Web App - Automated Tasks Setup Guide

## 🎯 Overview

This guide shows you how to set up **automated tasks (cron jobs)** for your Django backend on **Azure Web App** to send:
- 📅 Appointment reminders (daily)
- 💰 Payment reminders (weekly)
- 📦 Low stock alerts (daily)

**Cost**: ✅ **100% FREE** - Azure WebJobs are included with your App Service plan at no additional cost.

---

## 📌 Prerequisites

- Azure Web App (App Service) with Django backend deployed
- Python environment configured
- Management commands already exist in your codebase

---

## 🔧 Method 1: Azure WebJobs (Recommended)

Azure WebJobs allow you to run scripts on a schedule directly in your App Service.

### Step 1: Create WebJob Scripts

Create a new folder in your backend: `dorotheo-dental-clinic-website/backend/webjobs/`

#### 1.1 Appointment Reminders Script

Create `webjobs/send_appointment_reminders.sh`:

```bash
#!/bin/bash
cd /home/site/wwwroot/dorotheo-dental-clinic-website/backend
python manage.py send_appointment_reminders
```

#### 1.2 Payment Reminders Script

Create `webjobs/send_payment_reminders.sh`:

```bash
#!/bin/bash
cd /home/site/wwwroot/dorotheo-dental-clinic-website/backend
python manage.py send_payment_reminders
```

#### 1.3 Low Stock Alerts Script

Create `webjobs/send_low_stock_alerts.sh`:

```bash
#!/bin/bash
cd /home/site/wwwroot/dorotheo-dental-clinic-website/backend
python manage.py send_low_stock_alerts
```

### Step 2: Upload WebJobs to Azure

#### Option A: Via Azure Portal (Easiest)

1. **Go to Azure Portal**: https://portal.azure.com
2. **Navigate to your App Service** (backend)
3. **In left sidebar**: Click **WebJobs** (under Settings)
4. **Click "+ Add"** at the top

**For Appointment Reminders:**
- Name: `AppointmentReminders`
- File Upload: Upload `send_appointment_reminders.sh`
- Type: **Triggered**
- Triggers: **Scheduled**
- CRON Expression: `0 9 * * *` (Daily at 9:00 AM UTC)
- Click **OK**

**For Payment Reminders:**
- Name: `PaymentReminders`
- File Upload: Upload `send_payment_reminders.sh`
- Type: **Triggered**
- Triggers: **Scheduled**
- CRON Expression: `0 10 * * 1` (Every Monday at 10:00 AM UTC)
- Click **OK**

**For Low Stock Alerts:**
- Name: `LowStockAlerts`
- File Upload: Upload `send_low_stock_alerts.sh`
- Type: **Triggered**
- Triggers: **Scheduled**
- CRON Expression: `0 8 * * *` (Daily at 8:00 AM UTC)
- Click **OK**

#### Option B: Via Kudu Console

1. **Go to**: `https://YOUR-AZURE-APP-NAME.scm.azurewebsites.net`
2. **Click**: Debug Console → CMD
3. **Navigate to**: `site/wwwroot/App_Data/jobs/triggered/`
4. **Create folders**: `AppointmentReminders`, `PaymentReminders`, `LowStockAlerts`
5. **Upload** your `.sh` scripts to respective folders
6. **Create** `settings.job` file in each folder with cron expression:

**AppointmentReminders/settings.job:**
```json
{
  "schedule": "0 9 * * *"
}
```

**PaymentReminders/settings.job:**
```json
{
  "schedule": "0 10 * * 1"
}
```

**LowStockAlerts/settings.job:**
```json
{
  "schedule": "0 8 * * *"
}
```

---

## 🔄 Method 2: Azure Logic Apps (Alternative)

If you need more complex workflows:

### Step 1: Create Logic App

1. In Azure Portal, search for **Logic Apps**
2. Click **+ Create**
3. Select your resource group
4. Name: `dental-clinic-reminders`
5. Region: Same as your App Service
6. Click **Review + Create**

### Step 2: Configure Schedule

1. Open your Logic App
2. Click **Logic app designer**
3. Choose **Recurrence** trigger
4. Set frequency (Daily/Weekly)
5. Set time zone and time

### Step 3: Add HTTP Action

1. Click **+ New step**
2. Search for **HTTP**
3. Method: **POST**
4. URI: `https://YOUR-AZURE-APP.azurewebsites.net/api/trigger-reminders/`
5. Headers: `Authorization: Bearer YOUR_SECRET_TOKEN`

### Step 4: Create Trigger Endpoint in Django

Add to `api/views.py`:

```python
@api_view(['POST'])
@permission_classes([AllowAny])
def trigger_appointment_reminders(request):
    """Endpoint for Azure Logic App to trigger appointment reminders"""
    # Verify secret token
    secret = request.headers.get('Authorization', '').replace('Bearer ', '')
    if secret != settings.CRON_SECRET_TOKEN:
        return Response({"error": "Unauthorized"}, status=401)
    
    # Run the management command
    from django.core.management import call_command
    call_command('send_appointment_reminders')
    
    return Response({"status": "success"}, status=200)
```

---

## 📅 CRON Expression Guide

Azure uses standard CRON syntax: `{minute} {hour} {day} {month} {day-of-week}`

### Common Schedules

| Schedule | CRON Expression | Description |
|----------|----------------|-------------|
| Daily at 9 AM | `0 9 * * *` | Every day at 9:00 AM UTC |
| Weekly Monday 10 AM | `0 10 * * 1` | Every Monday at 10:00 AM UTC |
| Every 6 hours | `0 */6 * * *` | Every 6 hours |
| Twice daily | `0 9,17 * * *` | 9:00 AM and 5:00 PM UTC |
| Weekdays only | `0 9 * * 1-5` | Monday-Friday at 9:00 AM UTC |

**Note**: Azure uses **UTC time zone** by default. Convert your local time to UTC:
- Philippines (UTC+8): 9 AM local = 1 AM UTC = `0 1 * * *`
- US Eastern (UTC-5): 9 AM local = 2 PM UTC = `0 14 * * *`

---

## 🧪 Testing Your WebJobs

### Test Manually via Azure Portal

1. Go to **WebJobs** in Azure Portal
2. Find your WebJob in the list
3. Click on it
4. Click **Run** button at the top
5. Click **Logs** to view output
6. Check for success/error messages

### Test via Kudu Console

1. Go to: `https://YOUR-AZURE-APP.scm.azurewebsites.net`
2. Click **Tools** → **WebJobs dashboard**
3. Click on your job name
4. Click **Run** to test immediately
5. View logs to see results

### Check Email Delivery

After running:
1. Check if emails were sent to recipient addresses
2. Check spam/junk folders
3. Review Django logs in Azure for email sending status

---

## 🔍 Monitoring & Logs

### View WebJob Logs

**Via Azure Portal:**
1. Go to **WebJobs**
2. Click job name
3. Click **Logs**
4. View execution history

**Via Kudu:**
1. Go to: `https://YOUR-AZURE-APP.scm.azurewebsites.net`
2. Navigate to: `site/wwwroot/App_Data/jobs/triggered/[JobName]/`
3. View log files in the folder

### View Django Logs

```bash
# SSH into Azure Web App
az webapp ssh --name YOUR-AZURE-APP-NAME --resource-group YOUR-RESOURCE-GROUP

# View logs
cd /home/LogFiles
tail -f application.log
```

---

## 🚨 Troubleshooting

### WebJob Not Running

**Check 1: Always On Setting**
1. Go to **Configuration** → **General settings**
2. Enable **Always On**: Yes
3. Save and restart

**Check 2: File Permissions**
- Ensure `.sh` files have execute permissions
- Add to your scripts: `chmod +x send_appointment_reminders.sh`

**Check 3: Python Path**
- Verify Python is in PATH
- Use full path: `/opt/python/3.11/bin/python manage.py ...`

### No Emails Sent

**Check 1: Email Settings**
- Verify `EMAIL_HOST_USER` and `EMAIL_HOST_PASSWORD` in Azure Configuration
- Test email manually: `python manage.py shell` → `from django.core.mail import send_mail`

**Check 2: Management Command**
- Test command manually via SSH
- Check for Django errors in logs

**Check 3: Database Connection**
- Ensure Azure can connect to your database
- Check connection string in Configuration

### Wrong Time Zone

**Solution 1: Adjust CRON Expression**
- Convert your local time to UTC
- Example: 9 AM Philippines (UTC+8) = 1 AM UTC = `0 1 * * *`

**Solution 2: Set Time Zone in Script**
```bash
#!/bin/bash
export TZ="Asia/Manila"
cd /home/site/wwwroot/dorotheo-dental-clinic-website/backend
python manage.py send_appointment_reminders
```

---

## 💰 Cost Information

### Azure WebJobs Pricing

✅ **WebJobs are FREE** when using App Service plan:
- No additional cost for scheduled tasks
- Runs within your existing App Service resources
- Included in Basic, Standard, and Premium tiers

### Resource Considerations

- **CPU/Memory**: WebJobs use your App Service's allocated resources
- **Execution Time**: No time limits for triggered jobs
- **Frequency**: No limits on schedule frequency

### Scaling

If you need more resources:
- **Scale Up** (Vertical): Upgrade your App Service plan
- **Scale Out** (Horizontal): Add more instances (costs increase)

---

## 📋 Deployment Checklist

Before enabling automated tasks:

- [ ] Management commands tested locally
- [ ] Email configuration verified in Azure
- [ ] Database connection working
- [ ] CRON expressions calculated for UTC time
- [ ] WebJob scripts uploaded
- [ ] Schedule configured correctly
- [ ] "Always On" enabled in Azure
- [ ] Test run successful
- [ ] Email delivery confirmed
- [ ] Logs monitored for first 24 hours

---

## 🔗 Additional Resources

- [Azure WebJobs Documentation](https://learn.microsoft.com/en-us/azure/app-service/webjobs-create)
- [CRON Expression Generator](https://crontab.guru/)
- [Azure App Service Pricing](https://azure.microsoft.com/en-us/pricing/details/app-service/)
- [Django Management Commands](https://docs.djangoproject.com/en/4.2/howto/custom-management-commands/)

---

## 📞 Support

If you encounter issues:
1. Check WebJob logs in Azure Portal
2. Review Django application logs
3. Test management commands manually via SSH
4. Verify email configuration
5. Check Azure service health status

---

**Last Updated**: February 10, 2026  
**Tested On**: Azure App Service (Linux) with Python 3.11
