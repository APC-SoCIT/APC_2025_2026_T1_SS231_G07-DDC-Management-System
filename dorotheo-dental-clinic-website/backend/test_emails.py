"""
Quick Email Testing Script
Run this to test all email notifications at once

Usage:
    python test_emails.py
"""
import os
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'dental_clinic.settings')
django.setup()

from api.models import User, Appointment, Service, Billing, InventoryItem
from api.email_service import EmailService
from django.utils import timezone
from datetime import timedelta


def test_all_emails():
    """Test all email notification types"""
    
    print("\n" + "="*60)
    print("📧 EMAIL NOTIFICATION TESTING")
    print("="*60 + "\n")
    
    # Get test data
    try:
        patient = User.objects.filter(user_type='patient').first()
        dentist = User.objects.filter(user_type='staff', role='dentist').first()
        staff = User.objects.filter(user_type='staff').first()
        service = Service.objects.first()
        
        if not all([patient, dentist, service]):
            print("❌ Error: Missing test data. Please create:")
            if not patient:
                print("   - At least one patient")
            if not dentist:
                print("   - At least one dentist")
            if not service:
                print("   - At least one service")
            return
        
        print(f"✓ Using test patient: {patient.get_full_name()} ({patient.email})")
        print(f"✓ Using test dentist: Dr. {dentist.get_full_name()}")
        print(f"✓ Using test service: {service.name}\n")
        
    except Exception as e:
        print(f"❌ Error loading test data: {str(e)}")
        return
    
    # Test counter
    tests_passed = 0
    tests_failed = 0
    
    # 1. Test Appointment Confirmation
    print("1️⃣  Testing: Appointment Confirmation Email")
    try:
        appointment = Appointment.objects.filter(status='confirmed').first()
        if not appointment:
            # Create a test appointment
            appointment = Appointment.objects.create(
                patient=patient,
                dentist=dentist,
                service=service,
                date=timezone.now().date() + timedelta(days=7),
                time='10:00 AM',
                status='confirmed'
            )
        
        result = EmailService.send_appointment_confirmation(appointment)
        if result:
            print("   ✅ SUCCESS - Check your email output\n")
            tests_passed += 1
        else:
            print("   ❌ FAILED\n")
            tests_failed += 1
    except Exception as e:
        print(f"   ❌ ERROR: {str(e)}\n")
        tests_failed += 1
    
    # 2. Test Appointment Reminder
    print("2️⃣  Testing: Appointment Reminder Email")
    try:
        result = EmailService.send_appointment_reminder(appointment)
        if result:
            print("   ✅ SUCCESS - Check your email output\n")
            tests_passed += 1
        else:
            print("   ❌ FAILED\n")
            tests_failed += 1
    except Exception as e:
        print(f"   ❌ ERROR: {str(e)}\n")
        tests_failed += 1
    
    # 3. Test Appointment Cancellation
    print("3️⃣  Testing: Appointment Cancellation Email")
    try:
        result = EmailService.send_appointment_cancelled(
            appointment,
            cancelled_by="staff",
            reason="Testing email notifications"
        )
        if result:
            print("   ✅ SUCCESS - Check your email output\n")
            tests_passed += 1
        else:
            print("   ❌ FAILED\n")
            tests_failed += 1
    except Exception as e:
        print(f"   ❌ ERROR: {str(e)}\n")
        tests_failed += 1
    
    # 4. Test Reschedule Approved
    print("4️⃣  Testing: Reschedule Approved Email")
    try:
        old_date = timezone.now().date() + timedelta(days=5)
        old_time = "2:00 PM"
        result = EmailService.send_reschedule_approved(appointment, old_date, old_time)
        if result:
            print("   ✅ SUCCESS - Check your email output\n")
            tests_passed += 1
        else:
            print("   ❌ FAILED\n")
            tests_failed += 1
    except Exception as e:
        print(f"   ❌ ERROR: {str(e)}\n")
        tests_failed += 1
    
    # 5. Test Reschedule Rejected
    print("5️⃣  Testing: Reschedule Rejected Email")
    try:
        result = EmailService.send_reschedule_rejected(
            appointment,
            reason="Requested time slot not available"
        )
        if result:
            print("   ✅ SUCCESS - Check your email output\n")
            tests_passed += 1
        else:
            print("   ❌ FAILED\n")
            tests_failed += 1
    except Exception as e:
        print(f"   ❌ ERROR: {str(e)}\n")
        tests_failed += 1
    
    # 6. Test Invoice
    print("6️⃣  Testing: Invoice Email")
    try:
        billing = Billing.objects.first()
        if not billing:
            billing = Billing.objects.create(
                patient=patient,
                appointment=appointment,
                amount=1500.00,
                description="Dental Cleaning",
                status='pending'
            )
        
        result = EmailService.send_invoice(billing)
        if result:
            print("   ✅ SUCCESS - Check your email output\n")
            tests_passed += 1
        else:
            print("   ❌ FAILED\n")
            tests_failed += 1
    except Exception as e:
        print(f"   ❌ ERROR: {str(e)}\n")
        tests_failed += 1
    
    # 7. Test Payment Confirmation
    print("7️⃣  Testing: Payment Confirmation Email")
    try:
        result = EmailService.send_payment_confirmation(billing)
        if result:
            print("   ✅ SUCCESS - Check your email output\n")
            tests_passed += 1
        else:
            print("   ❌ FAILED\n")
            tests_failed += 1
    except Exception as e:
        print(f"   ❌ ERROR: {str(e)}\n")
        tests_failed += 1
    
    # 8. Test Payment Reminder
    print("8️⃣  Testing: Payment Reminder Email")
    try:
        result = EmailService.send_payment_reminder(billing, days_overdue=14)
        if result:
            print("   ✅ SUCCESS - Check your email output\n")
            tests_passed += 1
        else:
            print("   ❌ FAILED\n")
            tests_failed += 1
    except Exception as e:
        print(f"   ❌ ERROR: {str(e)}\n")
        tests_failed += 1
    
    # 9. Test Low Stock Alert
    print("9️⃣  Testing: Low Stock Alert Email")
    try:
        inventory_item = InventoryItem.objects.first()
        if not inventory_item:
            inventory_item = InventoryItem.objects.create(
                name="Dental Floss",
                category="Supplies",
                quantity=5,
                minimum_stock=10,
                supplier="Dental Supplies Co.",
                cost=50.00
            )
        
        staff_emails = [staff.email] if staff else ["staff@dorothedentallossc.com.ph"]
        result = EmailService.send_low_stock_alert(inventory_item, staff_emails)
        if result:
            print("   ✅ SUCCESS - Check your email output\n")
            tests_passed += 1
        else:
            print("   ❌ FAILED\n")
            tests_failed += 1
    except Exception as e:
        print(f"   ❌ ERROR: {str(e)}\n")
        tests_failed += 1
    
    # 10. Test Staff Notification
    print("🔟 Testing: Staff New Appointment Notification")
    try:
        staff_emails = [staff.email] if staff else ["staff@dorothedentallossc.com.ph"]
        result = EmailService.notify_staff_new_appointment(appointment, staff_emails)
        if result:
            print("   ✅ SUCCESS - Check your email output\n")
            tests_passed += 1
        else:
            print("   ❌ FAILED\n")
            tests_failed += 1
    except Exception as e:
        print(f"   ❌ ERROR: {str(e)}\n")
        tests_failed += 1
    
    # Summary
    print("="*60)
    print("📊 TEST SUMMARY")
    print("="*60)
    print(f"✅ Passed: {tests_passed}")
    print(f"❌ Failed: {tests_failed}")
    print(f"📧 Total: {tests_passed + tests_failed}")
    print("="*60 + "\n")
    
    if tests_failed == 0:
        print("🎉 All tests passed! Check your console/Mailtrap for emails.\n")
    else:
        print("⚠️  Some tests failed. Check error messages above.\n")


if __name__ == "__main__":
    test_all_emails()
