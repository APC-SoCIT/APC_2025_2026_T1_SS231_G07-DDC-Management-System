from django.urls import path
from . import views


urlpatterns = [
    path('', views.home, name='home'),
    path('appointments/', views.appointment_list, name='appointment_list'),
    path('appointments/new/', views.appointment_create, name='appointment_create'),
]


