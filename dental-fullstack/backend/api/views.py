from rest_framework import viewsets
from .models import Patient, Dentist, Appointment
from .serializers import PatientSerializer, DentistSerializer, AppointmentSerializer
class PatientViewSet(viewsets.ModelViewSet):
    queryset = Patient.objects.all().order_by('last_name')
    serializer_class = PatientSerializer
class DentistViewSet(viewsets.ModelViewSet):
    queryset = Dentist.objects.all().order_by('last_name')
    serializer_class = DentistSerializer
class AppointmentViewSet(viewsets.ModelViewSet):
    queryset = Appointment.objects.all().order_by('start_time')
    serializer_class = AppointmentSerializer
