# Dentist Side (Codespaces-ready)

This repository contains two parts:
- `backend/` — Django backend (uses SQLite, port **8000**)
- `frontend/` — Next.js frontend (port **3000**). All frontend files are contained here.

## How to open in GitHub Codespaces (recommended)

1. Upload this repository to GitHub (or use Codespaces with the zipped project).
2. Open the repository in **GitHub Codespaces** (click **Code → Open with Codespaces**).
3. Once the Codespace is created, open the terminal.

## Run with TWO terminals (one for backend, one for frontend)

### Terminal 1 — Django backend
```bash
# From project root
cd backend
python -m venv .venv
# activate the venv:
# Linux/macOS
source .venv/bin/activate
# Windows (PowerShell)
.\.venv\Scripts\Activate.ps1

pip install -r requirements.txt

# Apply migrations and create superuser if you want
python manage.py migrate
python manage.py createsuperuser   # optional

# Run server on port 8000 (use 0.0.0.0 for Codespaces)
python manage.py runserver 0.0.0.0:8000
```

### Terminal 2 — Next.js frontend
```bash
# From project root
cd frontend
npm install

# Start Next dev server
npm run dev
```

Next will run on `http://localhost:3000`. In Codespaces the forwarded ports will be available; set them to **public** if you want to open the app in a browser.

## How the frontend talks to backend

The frontend is configured to proxy `/api/*` requests to the Django API using the Next.js rewrite rule. In Codespaces this means when the Next dev server runs, API calls to `/api/...` will be proxied to `http://localhost:8000/api/...`.

If you see CORS issues, ensure:
- Django is running and accessible on port 8000 (the backend terminal).
- `backend/dental_clinic/settings.py` includes `corsheaders` and allows `http://localhost:3000` (it is configured by default).
- Restart both servers after any settings change.

## Testing the connection

1. Open the frontend (Codespaces forwarded port for 3000) and navigate to the dentist UI.
2. Create an appointment or patient from the UI.
3. Open Django admin (Codespaces forwarded port for 8000) at `/admin/` to verify the record.
4. Or call the API endpoint directly: `http://localhost:8000/api/appointments/` to list appointments.

## Notes

- SQLite DB file is inside the `backend/` folder (default `db.sqlite3`).
- For production deployment, use environment variables for SECRET_KEY and disable DEBUG.