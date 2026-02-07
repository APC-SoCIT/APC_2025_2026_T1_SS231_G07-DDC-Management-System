import os
import sys
import django

# Add the parent directory to the path
sys.path.insert(0, os.path.dirname(__file__))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'dental_clinic.settings')
django.setup()

from api.models import User, AppointmentNotification, Appointment

print("=" * 80)
print("CHECKING NOTIFICATION SYSTEM")
print("=" * 80)

# Check for owner users
print("\n1. CHECKING OWNER USERS:")
owners = User.objects.filter(user_type='owner')
print(f"Found {owners.count()} owner users:")
for owner in owners:
    print(f"  - {owner.get_full_name()} (ID: {owner.id}, Email: {owner.email})")

# Check for staff users
print("\n2. CHECKING STAFF USERS:")
staff = User.objects.filter(user_type='staff')
print(f"Found {staff.count()} staff users:")
for s in staff:
    print(f"  - {s.get_full_name()} (ID: {s.id}, Email: {s.email}, Role: {getattr(s, 'role', 'N/A')})")

# Check for appointments
print("\n3. CHECKING APPOINTMENTS:")
appointments = Appointment.objects.all()
print(f"Found {appointments.count()} appointments")
if appointments.exists():
    print("Sample appointments:")
    for apt in appointments[:5]:
        print(f"  - {apt.patient.get_full_name()} on {apt.date} at {apt.time} - Status: {apt.status}")

# Check for notifications
print("\n4. CHECKING NOTIFICATIONS:")
notifications = AppointmentNotification.objects.all()
print(f"Found {notifications.count()} total notifications")

if notifications.exists():
    print("\nNotifications by recipient:")
    from django.db.models import Count
    recipient_counts = AppointmentNotification.objects.values('recipient__first_name', 'recipient__last_name', 'recipient__user_type').annotate(count=Count('id'))
    for rc in recipient_counts:
        print(f"  - {rc['recipient__first_name']} {rc['recipient__last_name']} ({rc['recipient__user_type']}): {rc['count']} notifications")
    
    print("\nRecent notifications (last 5):")
    for notif in notifications[:5]:
        print(f"  - To: {notif.recipient.get_full_name()} | Type: {notif.notification_type} | Read: {notif.is_read}")
        print(f"    Message: {notif.message[:100]}...")
else:
    print("No notifications found in database!")
    print("\nThis is likely the issue. Notifications should be created when appointments are booked.")
    print("Let's check if there are any appointments that should have generated notifications:")
    
    recent_appointments = Appointment.objects.order_by('-created_at')[:5]
    if recent_appointments.exists():
        print("\nRecent appointments (that should have created notifications):")
        for apt in recent_appointments:
            print(f"  - {apt.patient.get_full_name()} on {apt.date} at {apt.time}")
            print(f"    Status: {apt.status}, Created: {apt.created_at}")

print("\n" + "=" * 80)
print("DIAGNOSIS:")
print("=" * 80)

if owners.count() == 0:
    print("⚠️  NO OWNER USERS FOUND! This is a problem.")
    print("   Solution: Create an owner user or update existing user to user_type='owner'")

if staff.count() == 0:
    print("⚠️  NO STAFF USERS FOUND! This might be expected for small clinics.")

if notifications.count() == 0:
    print("⚠️  NO NOTIFICATIONS FOUND! This is the main issue.")
    if appointments.exists():
        print("   There are appointments but no notifications were created.")
        print("   Solutions:")
        print("   1. Check if notifications are being created in the appointment creation code")
        print("   2. Manually create notifications for existing appointments")
        print("   3. Ensure create_appointment_notification() is called when appointments are created")
    else:
        print("   There are no appointments, so this might be expected.")
else:
    print("✓ Notifications exist in the database")
    
    # Check if the current owner has any notifications
    if owners.exists():
        owner = owners.first()
        owner_notifs = AppointmentNotification.objects.filter(recipient=owner)
        print(f"✓ Owner '{owner.get_full_name()}' has {owner_notifs.count()} notifications")
        if owner_notifs.count() == 0:
            print("  ⚠️  But they have 0 notifications! This might be why nothing shows up.")

print("=" * 80)
