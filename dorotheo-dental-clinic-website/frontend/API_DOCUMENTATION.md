# API Documentation

This document describes the available API endpoints for the Dorotheo Dental Clinic Management System.

## Base URL

- **Local Development**: `http://127.0.0.1:8000/api`
- **Production**: `https://your-backend.railway.app/api`

## Authentication

Most endpoints require authentication using Token-based authentication.

### Headers
```
Authorization: Token <your-token-here>
Content-Type: application/json
```

---

## Authentication Endpoints

### Login
**POST** `/api/login/`

**Request:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "token": "string",
  "user": {
    "id": 1,
    "username": "string",
    "email": "string",
    "user_type": "patient|staff|owner",
    "first_name": "string",
    "last_name": "string"
  }
}
```

### Register
**POST** `/api/register/`

**Request:**
```json
{
  "username": "string",
  "email": "string",
  "password": "string",
  "first_name": "string",
  "last_name": "string",
  "phone": "string"
}
```

### Logout
**POST** `/api/logout/`

**Headers:** Requires authentication

---

## Appointments Endpoints

### Get Appointments
**GET** `/api/appointments/`

**Headers:** Requires authentication

**Query Parameters:**
- `clinic` (optional): Filter by clinic ID
- `page` (optional): Page number for pagination
- `page_size` (optional): Items per page (default: 20)

**Response:**
```json
{
  "count": 100,
  "next": "url|null",
  "previous": "url|null",
  "results": [
    {
      "id": 1,
      "patient": 5,
      "service": 2,
      "clinic": 1,
      "dentist": 3,
      "date": "2026-02-20",
      "time": "14:00:00",
      "status": "pending|approved|completed|cancelled|missed",
      "notes": "string"
    }
  ]
}
```

### Create Appointment
**POST** `/api/appointments/`

**Headers:** Requires authentication

**Request:**
```json
{
  "patient": 5,
  "service": 2,
  "clinic": 1,
  "dentist": 3,
  "date": "2026-02-20",
  "time": "14:00:00",
  "notes": "Optional notes"
}
```

### Update Appointment Status
**POST** `/api/appointments/{id}/approve/`
**POST** `/api/appointments/{id}/complete/`
**POST** `/api/appointments/{id}/cancel/`
**POST** `/api/appointments/{id}/mark_missed/`

---

## Patients Endpoints

### Get Patients
**GET** `/api/users/patients/`

**Headers:** Requires authentication (staff/owner only)

**Query Parameters:**
- `page` (optional): Page number
- `page_size` (optional): Items per page

**Response:**
```json
{
  "count": 50,
  "next": "url|null",
  "previous": "url|null",
  "results": [
    {
      "id": 5,
      "username": "string",
      "email": "string",
      "first_name": "string",
      "last_name": "string",
      "phone": "string",
      "date_of_birth": "1990-01-01",
      "address": "string"
    }
  ]
}
```

### Get Patient by ID
**GET** `/api/users/{id}/`

**Headers:** Requires authentication

---

## Services Endpoints

### Get Services
**GET** `/api/services/`

**Response:**
```json
[
  {
    "id": 1,
    "name": "Teeth Cleaning",
    "description": "Professional dental cleaning",
    "price": "2500.00",
    "duration": 60,
    "image": "url|null",
    "clinics_data": [
      {
        "id": 1,
        "name": "Main Clinic",
        "location": "Manila"
      }
    ]
  }
]
```

### Create Service
**POST** `/api/services/`

**Headers:** Requires authentication (owner only)

**Request:**
```json
{
  "name": "string",
  "description": "string",
  "price": "2500.00",
  "duration": 60,
  "clinics": [1, 2]
}
```

---

## Billing Endpoints

### Get Billings
**GET** `/api/billings/`

**Headers:** Requires authentication

**Query Parameters:**
- `status` (optional): `pending|paid|cancelled`
- `page` (optional): Page number
- `page_size` (optional): Items per page

**Response:**
```json
{
  "count": 25,
  "results": [
    {
      "id": 1,
      "appointment": 10,
      "amount": "2500.00",
      "status": "pending|paid|cancelled",
      "payment_method": "cash|card|gcash",
      "paid_at": "2026-02-17T10:30:00Z"
    }
  ]
}
```

### Update Billing
**PUT** `/api/billings/{id}/`
**PATCH** `/api/billings/{id}/`

---

## Inventory Endpoints

### Get Inventory Items
**GET** `/api/inventory/`

**Headers:** Requires authentication (staff/owner only)

**Response:**
```json
[
  {
    "id": 1,
    "name": "Dental Gloves",
    "quantity": 500,
    "unit": "pieces",
    "reorder_level": 100,
    "clinic": 1
  }
]
```

### Create Inventory Item
**POST** `/api/inventory/`

**Headers:** Requires authentication (owner only)

---

## Clinics Endpoints

### Get Clinics
**GET** `/api/clinics/`

**Response:**
```json
[
  {
    "id": 1,
    "name": "Main Clinic",
    "location": "Manila",
    "address": "123 Main St, Manila",
    "phone": "02-1234-5678"
  }
]
```

---

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "error": "Invalid input data",
  "details": { "field": ["error message"] }
}
```

### 401 Unauthorized
```json
{
  "detail": "Authentication credentials were not provided."
}
```

### 403 Forbidden
```json
{
  "detail": "You do not have permission to perform this action."
}
```

### 404 Not Found
```json
{
  "detail": "Not found."
}
```

### 500 Internal Server Error
```json
{
  "error": "An unexpected error occurred"
}
```

---

## Pagination

Paginated endpoints return:

```json
{
  "count": 100,
  "next": "http://api/endpoint/?page=2",
  "previous": null,
  "results": []
}
```

---

## Rate Limiting

Currently, there are no rate limits implemented. This may change in production.

---

## Need Help?

- Check the [main README](../../README.md)
- Review [backend setup](../backend/README.md)
- See [project documentation](../../project-documentation/)
