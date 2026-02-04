"""
Test script to simulate updating inventory through API to trigger low stock notification
"""
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'dental_clinic.settings')
django.setup()

from api.models import InventoryItem, AppointmentNotification

def test_api_update():
    print("\n" + "=" * 60)
    print("Testing API Update Low Stock Notification")
    print("=" * 60)
    
    # Get item ID 2 (Colgate toothpaste)
    item = InventoryItem.objects.get(id=2)
    
    print(f"\n📦 Item: {item.name}")
    print(f"   Current Quantity: {item.quantity}")
    print(f"   Min Stock: {item.min_stock}")
    print(f"   Is Low Stock: {item.is_low_stock}")
    
    # Count notifications before
    before_count = AppointmentNotification.objects.filter(
        notification_type='inventory_alert'
    ).count()
    print(f"\n📊 Notifications before update: {before_count}")
    
    # Update item to be low stock
    print(f"\n🔄 Updating item quantity to {item.min_stock - 1} (below min stock)...")
    item.quantity = item.min_stock - 1
    item.save()
    
    print(f"   New Quantity: {item.quantity}")
    print(f"   Is Low Stock: {item.is_low_stock}")
    
    # Count notifications after
    after_count = AppointmentNotification.objects.filter(
        notification_type='inventory_alert'
    ).count()
    print(f"\n📊 Notifications after update: {after_count}")
    print(f"   New notifications created: {after_count - before_count}")
    
    if after_count > before_count:
        print("\n✅ SUCCESS! Notifications were created automatically!")
        
        # Show the new notifications
        print(f"\n📧 Latest Notifications:")
        recent = AppointmentNotification.objects.filter(
            notification_type='inventory_alert'
        ).order_by('-created_at')[:5]
        
        for notif in recent:
            print(f"   - {notif.recipient.email}: {notif.message[:60]}...")
    else:
        print("\n❌ ISSUE: No new notifications were created.")
        print("   This might be because the viewset perform_update wasn't triggered.")
        print("   perform_update only triggers when using the API endpoint (DRF ViewSet).")
    
    print("\n" + "=" * 60)

if __name__ == "__main__":
    test_api_update()
