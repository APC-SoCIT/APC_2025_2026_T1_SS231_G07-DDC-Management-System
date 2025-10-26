# Dental Clinic Backend API

## Setup Instructions

1. Install dependencies:
\`\`\`bash
pip install -r requirements.txt
\`\`\`

2. Run migrations:
\`\`\`bash
python manage.py makemigrations
python manage.py migrate
\`\`\`

3. Create superuser (owner account):
\`\`\`bash
python manage.py createsuperuser
\`\`\`

4. Run the development server:
\`\`\`bash
python manage.py runserver
\`\`\`

## API Endpoints

- `/api/register/` - Patient registration
- `/api/login/` - User login
- `/api/logout/` - User logout
- `/api/me/` - Get current user
- `/api/users/` - User management
- `/api/services/` - Service management
- `/api/appointments/` - Appointment management
- `/api/dental-records/` - Dental records
- `/api/documents/` - Patient documents
- `/api/inventory/` - Inventory management
- `/api/billing/` - Billing and SOA
- `/api/locations/` - Clinic locations
- `/api/treatment-plans/` - Treatment plans
- `/api/analytics/` - Analytics data (owner only)
