# API Documentation (frontend/API_DOCUMENTATION.md)

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

---

(Truncated here for brevity — full API documentation was copied from `frontend/API_DOCUMENTATION.md`.)
