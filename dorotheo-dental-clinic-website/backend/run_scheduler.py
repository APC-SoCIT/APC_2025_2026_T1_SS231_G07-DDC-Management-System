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
        print("✓ Appointment reminders completed\n")
    except Exception as e:
        print(f"✗ Error: {e}\n")

def send_payment_reminders():
    """Run payment reminders"""
    print(f"[{datetime.now()}] Running payment reminders...")
    try:
        call_command('send_payment_reminders')
        print("✓ Payment reminders completed\n")
    except Exception as e:
        print(f"✗ Error: {e}\n")

def send_low_stock_alerts():
    """Run low stock alerts"""
    print(f"[{datetime.now()}] Running low stock alerts...")
    try:
        call_command('send_low_stock_alerts')
        print("✓ Low stock alerts completed\n")
    except Exception as e:
        print(f"✗ Error: {e}\n")

# Schedule tasks
# For testing: use shorter intervals
# schedule.every(5).minutes.do(send_appointment_reminders)
# schedule.every(10).minutes.do(send_payment_reminders)
# schedule.every(3).minutes.do(send_low_stock_alerts)

# For production-like testing: use real schedule
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
try:
    while True:
        schedule.run_pending()
        time.sleep(60)  # Check every minute
except KeyboardInterrupt:
    print("\n\n⏹️  Scheduler stopped by user")
    print("=" * 60)
