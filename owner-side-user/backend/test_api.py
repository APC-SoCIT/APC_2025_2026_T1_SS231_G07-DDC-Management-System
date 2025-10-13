#!/usr/bin/env python3
"""
Simple API test script to verify endpoints are working
"""
import requests
import json

# API base URL
BASE_URL = "http://127.0.0.1:8000"

def test_endpoint(endpoint, description):
    """Test a single endpoint"""
    try:
        response = requests.get(f"{BASE_URL}{endpoint}", timeout=5)
        print(f"✅ {description}")
        print(f"   URL: {BASE_URL}{endpoint}")
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            try:
                data = response.json()
                if isinstance(data, dict) and len(data) <= 3:
                    print(f"   Response: {json.dumps(data, indent=2)}")
                elif isinstance(data, list):
                    print(f"   Response: List with {len(data)} items")
                else:
                    print(f"   Response: {str(data)[:100]}...")
            except:
                print(f"   Response: {response.text[:100]}...")
        print()
        return response.status_code == 200
    except requests.exceptions.ConnectionError:
        print(f"❌ {description}")
        print(f"   URL: {BASE_URL}{endpoint}")
        print(f"   Error: Could not connect to server")
        print()
        return False
    except Exception as e:
        print(f"⚠️  {description}")
        print(f"   URL: {BASE_URL}{endpoint}")
        print(f"   Error: {str(e)}")
        print()
        return False

def main():
    print("=== Django API Endpoint Tests ===\n")
    
    # Test endpoints
    endpoints = [
        ("/", "Root API Documentation"),
        ("/api/", "API Base (might 404, that's normal)"),
        ("/api/users/", "Users (UserProfile) API"),
        ("/api/services/", "Services API"),
        ("/api/appointments/", "Appointments API"),
        ("/api/patients/", "Legacy Patients API"),
        ("/api/dashboard/overview/", "Dashboard Overview"),
        ("/admin/", "Django Admin (should redirect to login)"),
    ]
    
    working_endpoints = 0
    total_endpoints = len(endpoints)
    
    for endpoint, description in endpoints:
        if test_endpoint(endpoint, description):
            working_endpoints += 1
    
    print(f"=== Summary ===")
    print(f"Working endpoints: {working_endpoints}/{total_endpoints}")
    
    if working_endpoints > 0:
        print("\n🎉 Your Django server is running successfully!")
        print(f"🌐 Main URL: {BASE_URL}")
        print("📋 Available endpoints are listed above")
    else:
        print("\n❌ Server appears to be down or not responding")

if __name__ == "__main__":
    main()