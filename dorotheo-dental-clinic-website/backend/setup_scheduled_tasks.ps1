# Setup Automated Tasks for Local Development
# Run as Administrator in PowerShell:
# Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
# .\setup_scheduled_tasks.ps1

$ProjectRoot = "C:\Users\Ezekiel\Downloads\original repo\APC_2025_2026_T1_SS231_G07-DDC-Management-System\dorotheo-dental-clinic-website\backend"
$PythonExe = "$ProjectRoot\venv\Scripts\python.exe"

Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "Setting up Automated Tasks for Dorotheo Dental Clinic" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host ""

# Check if Python exists
if (-not (Test-Path $PythonExe)) {
    Write-Host "❌ Error: Python executable not found at:" -ForegroundColor Red
    Write-Host "   $PythonExe" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please ensure:" -ForegroundColor Yellow
    Write-Host "  1. Virtual environment is created (python -m venv venv)" -ForegroundColor Yellow
    Write-Host "  2. Path is correct in this script" -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ Found Python at: $PythonExe" -ForegroundColor Green
Write-Host ""

# Create logs directory if it doesn't exist
$LogsDir = "$ProjectRoot\logs"
if (-not (Test-Path $LogsDir)) {
    New-Item -ItemType Directory -Path $LogsDir -Force | Out-Null
    Write-Host "✓ Created logs directory" -ForegroundColor Green
}

# Task 1: Appointment Reminders (Daily 9 AM)
Write-Host "Creating Task 1: Appointment Reminders..." -ForegroundColor Yellow

$Action1 = New-ScheduledTaskAction -Execute $PythonExe `
    -Argument "manage.py send_appointment_reminders" `
    -WorkingDirectory $ProjectRoot

$Trigger1 = New-ScheduledTaskTrigger -Daily -At 9:00AM

$Settings1 = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable

Register-ScheduledTask -TaskName "DentalClinic-AppointmentReminders" `
    -Action $Action1 `
    -Trigger $Trigger1 `
    -Settings $Settings1 `
    -Description "Send appointment reminder emails daily at 9 AM" `
    -Force | Out-Null

Write-Host "  ✓ Appointment Reminders (Daily at 9:00 AM)" -ForegroundColor Green

# Task 2: Payment Reminders (Weekly Monday 10 AM)
Write-Host "Creating Task 2: Payment Reminders..." -ForegroundColor Yellow

$Action2 = New-ScheduledTaskAction -Execute $PythonExe `
    -Argument "manage.py send_payment_reminders" `
    -WorkingDirectory $ProjectRoot

$Trigger2 = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday -At 10:00AM

$Settings2 = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable

Register-ScheduledTask -TaskName "DentalClinic-PaymentReminders" `
    -Action $Action2 `
    -Trigger $Trigger2 `
    -Settings $Settings2 `
    -Description "Send payment reminder emails weekly on Monday at 10 AM" `
    -Force | Out-Null

Write-Host "  ✓ Payment Reminders (Monday at 10:00 AM)" -ForegroundColor Green

# Task 3: Low Stock Alerts (Daily 8 AM)
Write-Host "Creating Task 3: Low Stock Alerts..." -ForegroundColor Yellow

$Action3 = New-ScheduledTaskAction -Execute $PythonExe `
    -Argument "manage.py send_low_stock_alerts" `
    -WorkingDirectory $ProjectRoot

$Trigger3 = New-ScheduledTaskTrigger -Daily -At 8:00AM

$Settings3 = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable

Register-ScheduledTask -TaskName "DentalClinic-LowStockAlerts" `
    -Action $Action3 `
    -Trigger $Trigger3 `
    -Settings $Settings3 `
    -Description "Send low stock alert emails daily at 8 AM" `
    -Force | Out-Null

Write-Host "  ✓ Low Stock Alerts (Daily at 8:00 AM)" -ForegroundColor Green

Write-Host ""
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "✅ All scheduled tasks created successfully!" -ForegroundColor Green
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Open Task Scheduler: Press Win+R, type 'taskschd.msc'" -ForegroundColor White
Write-Host "  2. Find tasks starting with 'DentalClinic-'" -ForegroundColor White
Write-Host "  3. Right-click any task and select 'Run' to test immediately" -ForegroundColor White
Write-Host "  4. Check the 'History' tab to see execution logs" -ForegroundColor White
Write-Host ""
Write-Host "🧪 Test Commands:" -ForegroundColor Yellow
Write-Host "  python manage.py send_appointment_reminders" -ForegroundColor White
Write-Host "  python manage.py send_payment_reminders" -ForegroundColor White
Write-Host "  python manage.py send_low_stock_alerts" -ForegroundColor White
Write-Host ""
Write-Host "🗑️  To Remove Tasks:" -ForegroundColor Yellow
Write-Host "  .\remove_scheduled_tasks.ps1" -ForegroundColor White
Write-Host ""
