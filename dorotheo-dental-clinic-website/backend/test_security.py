#!/usr/bin/env python
"""
Security Verification Tests for RBAC Implementation
Tests the following:
1. /api/login/ works without authentication (AllowAny)
2. /api/inventory_items/ returns 401 for anonymous users
3. Patient users cannot create inventory items (403)
"""
import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def print_test(test_num, description):
    print(f"\n{'='*60}")
    print(f"TEST {test_num}: {description}")
    print('='*60)

def test_1_login_public():
    """Test that login endpoint is publicly accessible"""
    print_test(1, "Login endpoint should be public (AllowAny)")
    
    url = f"{BASE_URL}/api/login/"
    data = {"username": "invaliduser", "password": "wrongpass"}
    
    try:
        response = requests.post(url, json=data)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        
        # Check if the response contains an authentication error vs invalid credentials
        response_data = response.json()
        
        if response.status_code == 400 or (response.status_code == 401 and 'invalid' in str(response_data).lower()):
            print("✓ PASS: Login endpoint is public (bad credentials)")
            return True
        elif 'Authentication credentials were not provided' in str(response_data):
            print("✗ FAIL: Login endpoint requires authentication")
            return False
        elif response.status_code == 200:
            print("? Unexpected: Login succeeded with invalid credentials")
            return False
        else:
            print(f"? Status: {response.status_code}")
            return False
    except Exception as e:
        print(f"✗ ERROR: {e}")
        return False

def test_2_inventory_requires_auth():
    """Test that inventory endpoint requires authentication"""
    print_test(2, "Inventory endpoint should return 401 for anonymous users")
    
    url = f"{BASE_URL}/api/inventory/"
    
    try:
        response = requests.get(url)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 401:
            print("✓ PASS: Inventory requires authentication (401)")
            print("Response:", response.json() if response.headers.get('content-type') == 'application/json' else response.text)
            return True
        elif response.status_code == 200:
            print("✗ FAIL: Inventory is publicly accessible (200)")
            print("This is a SECURITY VULNERABILITY!")
            return False
        else:
            print(f"? Unexpected status: {response.status_code}")
            print("Response:", response.text)
            return False
    except Exception as e:
        print(f"✗ ERROR: {e}")
        return False

def create_test_patient_if_needed():
    """Create a test patient account if it doesn't exist"""
    url = f"{BASE_URL}/api/register/"
    data = {
        "username": "patient_test",
        "email": "patient_test@test.com",
        "password": "testpass123",
        "user_type": "patient",
        "first_name": "Test",
        "last_name": "Patient"
    }
    
    try:
        response = requests.post(url, json=data)
        if response.status_code == 201:
            print("✓ Created test patient account")
            return True
        elif response.status_code == 400 and 'username' in str(response.json()).lower():
            print("✓ Test patient account already exists")
            return True
        else:
            print(f"? Registration response: {response.status_code} - {response.json()}")
            return False
    except Exception as e:
        print(f"✗ Error creating test patient: {e}")
        return False

def test_3_patient_cannot_create_inventory():
    """Test that patient users cannot create inventory items"""
    print_test(3, "Patient user should not be able to create inventory (403)")
    
    # First, ensure test patient exists
    print("\nStep 0: Ensure test patient account exists...")
    if not create_test_patient_if_needed():
        print("⚠ WARNING: Could not create/verify test patient account")
        return None
    
    # Try to login with the patient account
    login_url = f"{BASE_URL}/api/login/"
    patient_credentials = {"username": "patient_test", "password": "testpass123"}
    
    print("\nStep 1: Attempt to login as patient...")
    try:
        login_response = requests.post(login_url, json=patient_credentials)
        print(f"Login Status: {login_response.status_code}")
        
        if login_response.status_code == 200:
            token = login_response.json().get('token')
            print(f"✓ Logged in as patient (token: {token[:20]}...)")
            
            # Now try to create an inventory item
            print("\nStep 2: Attempt to create inventory item as patient...")
            inventory_url = f"{BASE_URL}/api/inventory/"
            headers = {"Authorization": f"Token {token}"}
            inventory_data = {
                "name": "Test Item",
                "category": "supplies",
                "quantity": 10,
                "min_stock": 5,
                "clinic": 1
            }
            
            inventory_response = requests.post(inventory_url, json=inventory_data, headers=headers)
            print(f"Create Inventory Status: {inventory_response.status_code}")
            
            if inventory_response.status_code == 403:
                print("✓ PASS: Patient cannot create inventory (403 Forbidden)")
                print("Response:", inventory_response.json())
                return True
            elif inventory_response.status_code == 201:
                print("✗ FAIL: Patient CAN create inventory (201 Created)")
                print("This is a SECURITY VULNERABILITY - RBAC not working!")
                return False
            else:
                print(f"? Unexpected status: {inventory_response.status_code}")
                print("Response:", inventory_response.text)
                return False
        elif login_response.status_code == 400:
            print("⚠ WARNING: Patient test account doesn't exist or wrong credentials")
            print("Please create a patient account with:")
            print("  Username: patient_test")
            print("  Password: testpass123")
            print("  User Type: patient")
            print("\nSkipping test...")
            return None
        else:
            print(f"? Unexpected login status: {login_response.status_code}")
            return None
    except Exception as e:
        print(f"✗ ERROR: {e}")
        return False

def main():
    print("\n" + "="*60)
    print("RBAC SECURITY VERIFICATION TEST SUITE")
    print("="*60)
    
    results = []
    
    # Run all tests
    results.append(("Login Public Access", test_1_login_public()))
    results.append(("Inventory Requires Auth", test_2_inventory_requires_auth()))
    results.append(("Patient Cannot Create Inventory", test_3_patient_cannot_create_inventory()))
    
    # Print summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    
    for test_name, result in results:
        if result is True:
            status = "✓ PASS"
        elif result is False:
            status = "✗ FAIL"
        else:
            status = "⚠ SKIP"
        print(f"{status}: {test_name}")
    
    # Count results
    passed = sum(1 for _, r in results if r is True)
    failed = sum(1 for _, r in results if r is False)
    skipped = sum(1 for _, r in results if r is None)
    
    print(f"\nResults: {passed} passed, {failed} failed, {skipped} skipped")
    
    if failed > 0:
        print("\n⚠ Security issues detected! Please review failed tests.")
        return 1
    elif skipped > 0:
        print("\n⚠ Some tests were skipped. Please complete setup and re-run.")
        return 0
    else:
        print("\n✓ All security tests passed!")
        return 0

if __name__ == "__main__":
    import sys
    sys.exit(main())
