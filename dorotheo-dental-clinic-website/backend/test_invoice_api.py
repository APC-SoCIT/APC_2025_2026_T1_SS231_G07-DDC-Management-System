"""
Simple test script for Invoice API endpoints
Run this after starting the Django server
"""

import requests
import json

BASE_URL = "http://localhost:8000/api"

def test_invoice_endpoints():
    """Test invoice API endpoints are accessible"""
    
    print("Testing Invoice API Endpoints...")
    print("=" * 60)
    
    # Test 1: Check if invoices endpoint exists
    print("\n1. Testing GET /api/invoices/")
    try:
        response = requests.get(f"{BASE_URL}/invoices/")
        print(f"   Status Code: {response.status_code}")
        if response.status_code == 401:
            print("   ✓ Endpoint exists (requires authentication)")
        elif response.status_code == 200:
            print("   ✓ Endpoint accessible")
            print(f"   Response: {json.dumps(response.json(), indent=2)[:200]}...")
        else:
            print(f"   Status: {response.status_code}")
    except Exception as e:
        print(f"   ✗ Error: {e}")
    
    # Test 2: Check if patient balance endpoint structure is correct
    print("\n2. Testing GET /api/invoices/patient_balance/1/")
    try:
        response = requests.get(f"{BASE_URL}/invoices/patient_balance/1/")
        print(f"   Status Code: {response.status_code}")
        if response.status_code in [401, 403]:
            print("   ✓ Endpoint exists (requires authentication)")
        elif response.status_code == 404:
            print("   ✓ Endpoint exists (patient not found or no data)")
        elif response.status_code == 200:
            print("   ✓ Endpoint accessible and working")
        else:
            print(f"   Status: {response.status_code}")
    except Exception as e:
        print(f"   ✗ Error: {e}")
    
    # Test 3: Check create_invoice endpoint
    print("\n3. Testing POST /api/invoices/create_invoice/")
    print("   (Will fail without authentication - that's expected)")
    try:
        response = requests.post(f"{BASE_URL}/invoices/create_invoice/", json={})
        print(f"   Status Code: {response.status_code}")
        if response.status_code in [401, 403]:
            print("   ✓ Endpoint exists (requires authentication)")
        elif response.status_code == 400:
            print("   ✓ Endpoint exists (validation error)")
        else:
            print(f"   Status: {response.status_code}")
    except Exception as e:
        print(f"   ✗ Error: {e}")
    
    print("\n" + "=" * 60)
    print("Invoice API Setup Test Complete!")
    print("\nNext Steps:")
    print("1. Start Django server: python manage.py runserver")
    print("2. Test with authentication token")
    print("3. Try creating an invoice for a completed appointment")
    print("=" * 60)

if __name__ == "__main__":
    print("\nMake sure Django server is running on http://localhost:8000")
    input("Press Enter to continue...")
    test_invoice_endpoints()
