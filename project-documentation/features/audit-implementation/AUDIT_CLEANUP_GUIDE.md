# Audit Log Cleanup Command - Usage Guide

## Overview
The `cleanup_audit_logs` management command handles data retention for HIPAA compliance by removing audit logs older than the specified retention period (default: 6 years).

## Basic Usage

### 1. Preview What Would Be Deleted (Dry Run)
```bash
python manage.py cleanup_audit_logs --dry-run
```

**Output Example:**
```
============================================================
Audit Log Cleanup
============================================================
Retention period: 2190 days
Cutoff date: 2020-02-14 13:07:40
Mode: DRY RUN

Audit logs to be deleted:
Action Type               Count
--------------------------------
DELETE                       66
UPDATE                        2
CREATE                        1
--------------------------------
TOTAL                        69

Oldest log: 2020-02-10
Newest log to delete: 2020-02-14

✓ DRY RUN MODE: No records were deleted.
  Run without --dry-run to perform actual deletion.
```

### 2. Delete Old Logs (with Confirmation)
```bash
python manage.py cleanup_audit_logs
```

This will:
- Show summary of logs to be deleted
- Ask for confirmation: "Type 'DELETE' to confirm"
- Delete logs in batches
- Show progress and final count

### 3. Delete Old Logs (Automated - No Confirmation)
```bash
python manage.py cleanup_audit_logs --force
```

Use `--force` for automated scripts/cron jobs that shouldn't require user input.

### 4. Custom Retention Period
```bash
# Delete logs older than 30 days
python manage.py cleanup_audit_logs --days=30 --dry-run

# Delete logs older than 1 year
python manage.py cleanup_audit_logs --days=365 --force
```

### 5. Adjust Batch Size
```bash
# Process 5000 records at a time (default is 1000)
python manage.py cleanup_audit_logs --batch-size=5000 --force
```

## Command Options

| Option | Description | Default |
|--------|-------------|---------|
| `--days` | Retention period in days | 2190 (6 years) |
| `--dry-run` | Preview without deleting | False |
| `--force` | Skip confirmation prompt | False |
| `--batch-size` | Records per batch | 1000 |

## Scheduling Automatic Cleanup

### Windows (Task Scheduler)
```powershell
# Run monthly on the 1st at 2 AM
$action = New-ScheduledTaskAction -Execute "python" `
    -Argument "manage.py cleanup_audit_logs --force" `
    -WorkingDirectory "C:\path\to\backend"

$trigger = New-ScheduledTaskTrigger -Monthly -DaysOfMonth 1 -At 2am

Register-ScheduledTask -TaskName "Django Audit Cleanup" `
    -Action $action -Trigger $trigger
```

### Linux (crontab)
```bash
# Add to crontab (crontab -e)
# Run monthly on the 1st at 2 AM
0 2 1 * * cd /path/to/backend && ./venv/bin/python manage.py cleanup_audit_logs --force >> /var/log/audit_cleanup.log 2>&1
```

### Railway/Heroku (Scheduler Add-on)
```bash
# Add as scheduled job
python manage.py cleanup_audit_logs --force
# Schedule: Daily at 02:00 (or monthly)
```

## HIPAA Compliance Notes

- **Default retention: 6 years** (2190 days) meets HIPAA requirements
- **Do NOT reduce below 6 years** unless you have legal guidance
- **Audit the cleanup:** Each run logs to Django's logging system
- **Test first:** Always use `--dry-run` before actual deletion
- **Backup before cleanup:** Consider database backups before large deletions

## Troubleshooting

### "No module named 'django'"
Activate your virtual environment first:
```bash
# Windows
.\venv\Scripts\Activate.ps1

# Linux/Mac
source venv/bin/activate
```

### Performance Issues with Large Deletions
Adjust batch size:
```bash
python manage.py cleanup_audit_logs --batch-size=500 --force
```

### Verify Deletion Success
Check remaining logs:
```bash
python manage.py shell -c "from api.models import AuditLog; print(f'Total logs: {AuditLog.objects.count()}')"
```

## Example Scenarios

### Scenario 1: First-time Cleanup (Test)
```bash
# 1. Preview what 6 years would delete
python manage.py cleanup_audit_logs --dry-run

# 2. If safe, proceed with deletion
python manage.py cleanup_audit_logs
# Type: DELETE
```

### Scenario 2: Testing with Recent Data
```bash
# Preview last 7 days (for testing)
python manage.py cleanup_audit_logs --days=7 --dry-run

# If happy, delete them
python manage.py cleanup_audit_logs --days=7
```

### Scenario 3: Automated Monthly Cleanup
```bash
# Add to cron or Task Scheduler
python manage.py cleanup_audit_logs --force
```

## Success Indicators

✅ Command runs without errors  
✅ Summary shows expected number of deletions  
✅ Progress indicator shows batches being processed  
✅ Final message confirms deletion count  
✅ Remaining logs are preserved (newer than cutoff date)

## Validation Checklist

After running cleanup:

- [ ] Total audit logs reduced appropriately
- [ ] Oldest remaining log is after cutoff date
- [ ] Recent logs (< 6 years) are intact
- [ ] Database size decreased (if significant deletion)
- [ ] Application still functions normally
