# Clinic Management System – Backend (Django REST Framework)

This is the backend API for our Clinic Management System, built using **Django** and **Django REST Framework**. It powers the owner-side frontend and handles core data operations for patients, appointments, inventory, billing, and financial reporting.

---

## 🧩 Tech Stack

- **Framework**: Django
- **API Layer**: Django REST Framework
- **Auth**: JWT (via `rest_framework_simplejwt`)
- **Database**: SQLite (dev) / Postgres (production-ready)
- **CORS**: Configured for frontend on Vercel

---

## 📁 Key Features

- RESTful API endpoints:

POST   /api/register/          - User registration
POST   /api/login/             - User login
GET    /api/user/              - Current user details
PATCH  /api/user/              - Update profile




- JWT-based authentication
- Pagination and error handling
- CORS and environment variable support via `python-decouple`
