Django REST backend (API):
- Run in backend directory:
  python -m venv venv
  source venv/bin/activate   # or venv\Scripts\activate on Windows
  pip install -r requirements.txt
  python manage.py migrate
  python manage.py runserver 0.0.0.0:8000
API endpoints after server runs:
- /api/patients/
- /api/dentists/
- /api/appointments/
CORS is enabled for development.
