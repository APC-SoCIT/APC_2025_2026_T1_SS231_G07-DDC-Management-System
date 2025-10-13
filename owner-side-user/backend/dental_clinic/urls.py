"""
URL configuration for the dental_clinic project.
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods

@require_http_methods(["GET"])
def api_root(request):
    """API root endpoint showing available endpoints"""
    return JsonResponse({
        "message": "Dental Clinic Management System API",
        "version": "1.0.0",
        "endpoints": {
            "authentication": {
                "register": "/api/auth/register/",
                "login": "/api/auth/login/",
                "refresh": "/api/auth/refresh/"
            },
            "management": {
                "users": "/api/users/",
                "services": "/api/services/",
                "appointments": "/api/appointments/",
                "invoices": "/api/invoices/",
                "treatments": "/api/treatments/",
                "payments": "/api/payments/"
            },
            "legacy": {
                "patients": "/api/patients/",
                "legacy_appointments": "/api/legacy-appointments/",
                "inventory": "/api/inventory/",
                "billing": "/api/billing/",
                "financial": "/api/financial/"
            },
            "dashboard": {
                "overview": "/api/dashboard/overview/"
            },
            "admin": "/admin/"
        },
        "status": "running"
    })

urlpatterns = [
    # Root API documentation
    path('', api_root, name='api_root'),
    
    # Admin site
    path('admin/', admin.site.urls),

    # API endpoints (patients, appointments, inventory, billing, financial, auth, dashboard)
    path('api/', include('api.urls')),
]

# Serve media files during development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
