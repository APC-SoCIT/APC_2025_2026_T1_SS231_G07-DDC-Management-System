from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    register_user, dashboard_overview,
    # NEW MODEL VIEWSETS
    UserProfileViewSet, ServiceViewSet, InvoiceViewSet, AppointmentViewSet,
    TreatmentRecordViewSet, PaymentViewSet,
    # LEGACY VIEWSETS
    PatientViewSet, LegacyAppointmentViewSet,
    InventoryItemViewSet, BillingRecordViewSet,
    FinancialRecordViewSet
)
from .authentication import CustomTokenObtainPairView

# Create router and register viewsets
router = DefaultRouter()

# NEW API ENDPOINTS (matching PostgreSQL schema)
router.register(r'users', UserProfileViewSet, basename='user')
router.register(r'services', ServiceViewSet, basename='service')
router.register(r'invoices', InvoiceViewSet, basename='invoice')
router.register(r'appointments', AppointmentViewSet, basename='appointment')
router.register(r'treatments', TreatmentRecordViewSet, basename='treatment')
router.register(r'payments', PaymentViewSet, basename='payment')

# LEGACY API ENDPOINTS (for backward compatibility)
router.register(r'patients', PatientViewSet, basename='patient')
router.register(r'legacy-appointments', LegacyAppointmentViewSet, basename='legacy-appointment')

# EXISTING ENDPOINTS (unchanged)
router.register(r'inventory', InventoryItemViewSet, basename='inventory')
router.register(r'billing', BillingRecordViewSet, basename='billing')
router.register(r'financial', FinancialRecordViewSet, basename='financial')

urlpatterns = [
    # Authentication endpoints
    path('auth/register/', register_user, name='register'),
    path('auth/login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # Dashboard overview
    path('dashboard/overview/', dashboard_overview, name='dashboard_overview'),

    # Router endpoints (patients, appointments, inventory, billing, financial)
    path('', include(router.urls)),
]
