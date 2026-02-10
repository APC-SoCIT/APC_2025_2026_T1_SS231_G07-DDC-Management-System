# Remove Automated Tasks
# Run as Administrator in PowerShell:
# .\remove_scheduled_tasks.ps1

Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "Removing Dental Clinic Automated Tasks" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host ""

$taskNames = @(
    "DentalClinic-AppointmentReminders",
    "DentalClinic-PaymentReminders",
    "DentalClinic-LowStockAlerts"
)

foreach ($taskName in $taskNames) {
    try {
        $task = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
        if ($task) {
            Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
            Write-Host "  ✓ Removed: $taskName" -ForegroundColor Green
        } else {
            Write-Host "  ⚠ Not found: $taskName" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "  ✗ Error removing $taskName : $_" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "✅ Task removal complete!" -ForegroundColor Green
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host ""
