# Dental Clinic Management System - API Documentation

## Base URL
\`\`\`
http://localhost:8000/api/
\`\`\`

## Authentication

All endpoints except registration and login require JWT authentication.

### Headers
\`\`\`
Authorization: Bearer <access_token>
Content-Type: application/json
\`\`\`

## Authentication Endpoints

### Register User
\`\`\`http
POST /api/auth/register/
\`\`\`

**Request Body:**
\`\`\`json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "securepassword123",
  "password_confirm": "securepassword123",
  "first_name": "John",
  "last_name": "Doe"
}
\`\`\`

**Response:** `201 Created`
\`\`\`json
{
  "user": {
    "id": 1,
    "username": "johndoe",
    "email": "john@example.com",
    "first_name": "John",
    "last_name": "Doe"
  },
  "message": "User registered successfully"
}
\`\`\`

### Login
\`\`\`http
POST /api/auth/login/
\`\`\`

**Request Body:**
\`\`\`json
{
  "username": "johndoe",
  "password": "securepassword123"
}
\`\`\`

**Response:** `200 OK`
\`\`\`json
{
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
\`\`\`

### Refresh Token
\`\`\`http
POST /api/auth/refresh/
\`\`\`

**Request Body:**
\`\`\`json
{
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
\`\`\`

## Patient Endpoints

### List Patients
\`\`\`http
GET /api/patients/
\`\`\`

**Query Parameters:**
- `search` - Search by name, email, patient_id, or contact
- `ordering` - Order by name, last_visit, or created_at
- `page` - Page number (default: 1)

**Response:** `200 OK`
\`\`\`json
{
  "count": 6,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "patient_id": "DD - 00001",
      "name": "Bary Reyes",
      "email": "baryreyes@gmail.com",
      "age": 100,
      "contact": "(555) 123-4567",
      "last_visit": "2024-05-15",
      "initials": "BR",
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    }
  ]
}
\`\`\`

### Create Patient
\`\`\`http
POST /api/patients/
\`\`\`

**Request Body:**
\`\`\`json
{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "age": 35,
  "contact": "(555) 999-8888",
  "last_visit": "2024-10-08"
}
\`\`\`

### Get Patient
\`\`\`http
GET /api/patients/{id}/
\`\`\`

### Update Patient
\`\`\`http
PUT /api/patients/{id}/
PATCH /api/patients/{id}/
\`\`\`

### Delete Patient
\`\`\`http
DELETE /api/patients/{id}/
\`\`\`

### Patient Statistics
\`\`\`http
GET /api/patients/statistics/
\`\`\`

**Response:** `200 OK`
\`\`\`json
{
  "total": 150,
  "this_week": 12,
  "this_month": 45
}
\`\`\`

## Appointment Endpoints

### List Appointments
\`\`\`http
GET /api/appointments/
\`\`\`

**Query Parameters:**
- `status` - Filter by status (scheduled, completed, cancelled, pending)
- `date` - Filter by date (YYYY-MM-DD)
- `search` - Search by appointment_id, patient name, doctor, or status
- `ordering` - Order by date, time, or created_at

### Create Appointment
\`\`\`http
POST /api/appointments/
\`\`\`

**Request Body:**
\`\`\`json
{
  "patient": 1,
  "date": "2024-10-15",
  "time": "14:30:00",
  "doctor": "Dr. Smith",
  "status": "scheduled",
  "treatment": "Root Canal",
  "notes": "Patient prefers afternoon appointments"
}
\`\`\`

### Appointment Statistics
\`\`\`http
GET /api/appointments/statistics/
\`\`\`

**Response:** `200 OK`
\`\`\`json
{
  "total": 250,
  "today": 5,
  "scheduled": 45,
  "completed": 180,
  "cancelled": 25
}
\`\`\`

### Upcoming Appointments
\`\`\`http
GET /api/appointments/upcoming/
\`\`\`

## Inventory Endpoints

### List Inventory Items
\`\`\`http
GET /api/inventory/
\`\`\`

**Query Parameters:**
- `category` - Filter by category (anesthetics, restorative, ppe, imaging, other)
- `search` - Search by name, category, or supplier

### Create Inventory Item
\`\`\`http
POST /api/inventory/
\`\`\`

**Request Body:**
\`\`\`json
{
  "name": "Dental Floss",
  "category": "other",
  "quantity": 100,
  "min_stock": 50,
  "unit": "box",
  "supplier": "DentalSupplies Inc",
  "cost_per_unit": "5.99",
  "notes": "Store in cool, dry place"
}
\`\`\`

### Update Quantity
\`\`\`http
POST /api/inventory/{id}/update_quantity/
\`\`\`

**Request Body:**
\`\`\`json
{
  "delta": -5
}
\`\`\`

### Low Stock Items
\`\`\`http
GET /api/inventory/low_stock/
\`\`\`

### Stock Alerts
\`\`\`http
GET /api/inventory/alerts/
\`\`\`

**Response:** `200 OK`
\`\`\`json
{
  "critical": [...],
  "low_stock": [...]
}
\`\`\`

## Billing Endpoints

### List Billing Records
\`\`\`http
GET /api/billing/
\`\`\`

### Create Billing Record
\`\`\`http
POST /api/billing/
\`\`\`

**Request Body:**
\`\`\`json
{
  "patient": 1,
  "last_payment": "2024-10-08",
  "amount": "350.00",
  "payment_method": "Credit Card",
  "notes": "Paid in full"
}
\`\`\`

### Billing Statistics
\`\`\`http
GET /api/billing/statistics/
\`\`\`

## Financial/Analytics Endpoints

### List Financial Records
\`\`\`http
GET /api/financial/
\`\`\`

**Query Parameters:**
- `type` - Filter by record_type (revenue, expense)
- `year` - Filter by year

### Revenue Data
\`\`\`http
GET /api/financial/revenue/
\`\`\`

**Query Parameters:**
- `year` - Year (default: current year)

### Expenses Data
\`\`\`http
GET /api/financial/expenses/
\`\`\`

### Dashboard Overview
\`\`\`http
GET /api/dashboard/overview/
\`\`\`

**Response:** `200 OK`
\`\`\`json
{
  "appointments_today": 5,
  "patients_today": 7,
  "walk_ins": 2,
  "patients_this_week": 45,
  "patients_this_month": 187,
  "total_patients": 2847,
  "upcoming_appointments": [...],
  "stock_alerts": [...]
}
\`\`\`

## Error Responses

### 400 Bad Request
\`\`\`json
{
  "field_name": ["Error message"]
}
\`\`\`

### 401 Unauthorized
\`\`\`json
{
  "detail": "Authentication credentials were not provided."
}
\`\`\`

### 404 Not Found
\`\`\`json
{
  "detail": "Not found."
}
\`\`\`

### 500 Internal Server Error
\`\`\`json
{
  "detail": "Internal server error."
}
