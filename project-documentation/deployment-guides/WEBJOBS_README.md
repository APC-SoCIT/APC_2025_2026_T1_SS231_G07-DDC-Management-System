# Azure WebJobs for Dorotheo Dental Clinic

This folder contains shell scripts for Azure WebJobs (scheduled tasks).

## WebJobs Included

1. **send_appointment_reminders.sh**
   - Sends appointment reminder emails
   - Schedule: Daily at 9:00 AM UTC
   - CRON: `0 9 * * *`

2. **send_payment_reminders.sh**
   - Sends payment reminder emails for overdue invoices
   - Schedule: Weekly on Monday at 10:00 AM UTC
   - CRON: `0 10 * * 1`

3. **send_low_stock_alerts.sh**
   - Sends low stock alerts to staff/owner
   - Schedule: Daily at 8:00 AM UTC
   - CRON: `0 8 * * *`

## Setup Instructions

See [AZURE_AUTOMATED_TASKS_SETUP.md](../../../project-documentation/deployment-guides/AZURE_AUTOMATED_TASKS_SETUP.md) for complete setup instructions.

### Quick Setup

1. Go to Azure Portal: https://portal.azure.com
2. Navigate to your App Service
3. Click **WebJobs** in the left sidebar
4. Click **+ Add** for each script
5. Upload the `.sh` file
6. Set Type: **Triggered**
7. Triggers: **Scheduled**
8. Enter CRON expression
9. Click **OK**

## CRON Expressions

```
0 9 * * *   - Daily at 9:00 AM UTC
0 10 * * 1  - Every Monday at 10:00 AM UTC
0 8 * * *   - Daily at 8:00 AM UTC
```

## Time Zone Notes

Azure WebJobs use UTC time by default. Convert your local time:
- Philippines (UTC+8): 1 AM UTC = 9 AM local
- Adjust CRON expressions accordingly

## Testing

After uploading:
1. Click on the WebJob name
2. Click **Run** to test immediately
3. Click **Logs** to view output
4. Verify emails are sent correctly

## Troubleshooting

If WebJob fails to run:
- Check that "Always On" is enabled in App Service Configuration
- Verify Python path in scripts
- Check Django settings for email configuration
- Review WebJob logs for error messages
