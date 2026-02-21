import os, sys, django
sys.stdout.reconfigure(encoding='utf-8')
os.environ['DJANGO_SETTINGS_MODULE'] = 'dental_clinic.settings'
django.setup()
from api.services import rag_service

for q in ['is doc marvin available', 'available si doc marvin sa march', 'what time is doc marvin available']:
    print(f"\n{'='*60}\nQ: {q}")
    print(rag_service.build_db_context(q))
