from django.contrib import admin
from django.urls import path, include
from rest_framework import routers
from api import views
router = routers.DefaultRouter()
router.register(r'patients', views.PatientViewSet)
router.register(r'dentists', views.DentistViewSet)
router.register(r'appointments', views.AppointmentViewSet)
urlpatterns = [path('admin/', admin.site.urls), path('api/', include(router.urls)),]
