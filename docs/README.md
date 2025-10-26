# Dental Clinic Management System

A comprehensive full-stack dental clinic management system built with React (Next.js) frontend and Django REST API backend. Features multi-user authentication, appointment scheduling, patient management, inventory tracking, billing, and analytics.

## Features

### User Types
- **Patient**: View appointments, dental records, billing, and manage profile
- **Receptionist/Dentist**: Manage patients, appointments, inventory, and billing
- **Owner**: All staff features plus staff management, services management, and analytics

### Key Functionality
- Patient registration and authentication
- Appointment booking and management
- Dental records and treatment history
- Inventory management with stock alerts
- Billing and statement of accounts
- Analytics dashboard (revenue and expenses)
- Services management with categories
- Multi-clinic location support

## Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui
- **Icons**: Lucide React

### Backend
- **Framework**: Django 4.2.7
- **API**: Django REST Framework
- **Database**: SQLite (development) / PostgreSQL (production)
- **Authentication**: JWT tokens

## Color Scheme
- **Primary**: Dark Green (#0f4c3a, #1a5c4a)
- **Accent**: Gold (#d4af37, #c9a961)
- **Background**: Cream/Off-white (#faf8f5)

## Getting Started

### Prerequisites
- Node.js 18+ and npm/yarn
- Python 3.10+
- pip

### Backend Setup

1. Navigate to the backend directory:
\`\`\`bash
cd backend
\`\`\`

2. Create a virtual environment:
\`\`\`bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
\`\`\`

3. Install dependencies:
\`\`\`bash
pip install -r requirements.txt
\`\`\`

4. Run migrations:
\`\`\`bash
python manage.py makemigrations
python manage.py migrate
\`\`\`

5. Create a superuser (Owner account):
\`\`\`bash
python manage.py createsuperuser
\`\`\`

6. Start the development server:
\`\`\`bash
python manage.py runserver
\`\`\`

The API will be available at `http://localhost:8000`

### Frontend Setup

1. Install dependencies:
\`\`\`bash
npm install
\`\`\`

2. Create a `.env.local` file:
\`\`\`env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
\`\`\`

3. Start the development server:
\`\`\`bash
npm run dev
\`\`\`

The application will be available at `http://localhost:3000`

## Project Structure

\`\`\`
dental-clinic/
├── app/                      # Next.js app directory
│   ├── login/               # Login page
│   ├── patient/             # Patient portal
│   ├── staff/               # Staff dashboard
│   └── owner/               # Owner dashboard
├── components/              # React components
│   ├── navbar.tsx
│   ├── register-modal.tsx
│   └── ...
├── lib/                     # Utilities
│   ├── api.ts              # API client
│   └── auth.ts             # Auth context
├── backend/                 # Django backend
│   ├── api/                # API app
│   │   ├── models.py       # Database models
│   │   ├── serializers.py  # DRF serializers
│   │   └── views.py        # API views
│   └── dental_clinic/      # Django project
└── public/                  # Static assets
\`\`\`

## API Endpoints

### Authentication
- `POST /api/auth/register/` - Register new patient
- `POST /api/auth/login/` - Login user
- `POST /api/auth/logout/` - Logout user

### Services
- `GET /api/services/` - List all services
- `POST /api/services/` - Create service (Owner only)
- `PUT /api/services/{id}/` - Update service (Owner only)
- `DELETE /api/services/{id}/` - Delete service (Owner only)

### Appointments
- `GET /api/appointments/` - List appointments
- `POST /api/appointments/` - Create appointment
- `GET /api/appointments/{id}/` - Get appointment details
- `PUT /api/appointments/{id}/` - Update appointment
- `DELETE /api/appointments/{id}/` - Cancel appointment

### Patients
- `GET /api/patients/` - List patients (Staff/Owner only)
- `POST /api/patients/` - Add patient (Staff/Owner only)
- `GET /api/patients/{id}/` - Get patient details

### Inventory
- `GET /api/inventory/` - List inventory items
- `POST /api/inventory/` - Add inventory item
- `PUT /api/inventory/{id}/` - Update inventory item

### Billing
- `GET /api/billing/` - List billing records
- `POST /api/billing/` - Create billing record

### Staff (Owner only)
- `GET /api/staff/` - List staff members
- `POST /api/staff/` - Add staff member
- `DELETE /api/staff/{id}/` - Remove staff member

### Analytics (Owner only)
- `GET /api/analytics/` - Get revenue and expense analytics

## Default Credentials

After running migrations and creating a superuser, you can create test accounts:

**Owner Account** (created via createsuperuser):
- Username: admin
- Password: (set during creation)

**Staff Account** (create via Owner dashboard):
- Create through the Staff Accounts page

**Patient Account**:
- Register through the homepage

## Features by User Type

### Patient Portal
- Dashboard with upcoming appointments and treatment plans
- Profile management with tooth chart
- Appointment history (upcoming and past)
- Dental records with treatment notes
- Billing statements and payment history
- Downloadable documents (X-rays, scans)

### Staff Dashboard
- Calendar view of appointments
- Patient management (add, search, view records)
- Appointment scheduling and management
- Inventory tracking with low stock alerts
- Billing and SOA management
- Profile editing

### Owner Dashboard
- All staff features
- Staff account management (add/remove staff)
- Services management (add/edit/delete services)
- Analytics dashboard (revenue vs expenses)
- Multi-clinic overview

## Development Notes

- The frontend uses Next.js App Router with client-side rendering for dashboard pages
- Authentication is handled via JWT tokens stored in localStorage
- The backend uses Django REST Framework with token authentication
- File uploads (images, PDFs) are supported for services and billing
- The application is responsive and mobile-friendly

## License

This project is proprietary and confidential.
