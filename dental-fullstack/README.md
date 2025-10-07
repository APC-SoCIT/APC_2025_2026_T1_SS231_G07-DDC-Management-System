Combined Fullstack (Restored Original Frontend + Django Backend)
----------------------------------------------------------------
- frontend/  -> original Next.js app (kept exactly as in your uploaded zip)
- backend/   -> Django REST backend (api for patients, dentists, appointments)

Notes:
- If 'npm install' fails due to React/Next.js version mismatch (React 19 vs Next expecting React 18),
  you can fix locally by running in the frontend folder:
    npm uninstall react react-dom
    npm install react@18.2.0 react-dom@18.2.0
  Then run `npm install` again.
- Start backend first then frontend for development:
    cd backend; python -m venv venv; source venv/bin/activate; pip install -r requirements.txt; python manage.py migrate; python manage.py runserver
    cd ../frontend; npm install; npm run dev
