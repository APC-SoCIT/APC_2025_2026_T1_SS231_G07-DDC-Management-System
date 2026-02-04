"""
Test script to manually trigger low stock notification
"""
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'dental_clinic.settings')
django.setup()

from api.models import InventoryItem, User, AppointmentNotification
from django.db.models import Q

def test_low_stock_notification():
    print("=" * 60)
    print("Testing Low Stock Notification System")
    print("=" * 60)
    
    # Get an existing inventory item
    item = InventoryItem.objects.first()
    if not item:
        print("❌ No inventory items found. Please create one first.")
        return
    
    print(f"\n📦 Current Item: {item.name}")
    print(f"   Quantity: {item.quantity}")
    print(f"   Min Stock: {item.min_stock}")
    print(f"   Is Low Stock: {item.is_low_stock}")
    
    # Get staff and owner users
    recipients = User.objects.filter(Q(user_type='staff') | Q(user_type='owner'))
    print(f"\n👥 Found {recipients.count()} recipients (staff/owner):")
    for recipient in recipients:
        print(f"   - {recipient.email} ({recipient.user_type})")
    
    if recipients.count() == 0:
        print("\n❌ No staff or owner users found. Cannot create notifications.")
        return
    
    # Check if item is low stock
    if not item.is_low_stock:
        print(f"\n⚠️  Item is NOT low stock. Setting quantity to below min_stock...")
        old_qty = item.quantity
        item.quantity = max(0, item.min_stock - 1)
        item.save()
        print(f"   Changed quantity from {old_qty} to {item.quantity}")
    
    # Create notification manually
    message = f"Low Stock Alert: {item.name} (Category: {item.category}) has only {item.quantity} units left. Minimum stock level is {item.min_stock}."
    
    print(f"\n📧 Creating notifications...")
    created_count = 0
    for recipient in recipients:
        notification = AppointmentNotification.objects.create(
            recipient=recipient,
            appointment=None,
            notification_type='inventory_alert',
            message=message
        )
        print(f"   ✅ Created notification #{notification.id} for {recipient.email}")
        created_count += 1
    
    print(f"\n🎉 Successfully created {created_count} notifications!")
    
    # Show recent notifications
    print(f"\n📋 Recent Inventory Notifications:")
    recent = AppointmentNotification.objects.filter(
        notification_type='inventory_alert'
    ).order_by('-created_at')[:5]
    
    for notif in recent:
        status = "✓ Read" if notif.is_read else "• Unread"
        print(f"   {status} | {notif.recipient.email} | {notif.created_at.strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"      {notif.message[:80]}...")
    
    print("\n" + "=" * 60)

if __name__ == "__main__":
    test_low_stock_notification()
