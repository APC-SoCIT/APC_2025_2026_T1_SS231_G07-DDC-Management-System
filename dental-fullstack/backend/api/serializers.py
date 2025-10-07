from rest_framework import serializers
from .models import Patient, Dentist, Appointment
class PatientSerializer(serializers.ModelSerializer):
    class Meta: model = Patient; fields='__all__'
class DentistSerializer(serializers.ModelSerializer):
    class Meta: model = Dentist; fields='__all__'
class AppointmentSerializer(serializers.ModelSerializer):
    patient = PatientSerializer(read_only=True)
    patient_id = serializers.PrimaryKeyRelatedField(queryset=Patient.objects.all(), write_only=True, source='patient')
    dentist = DentistSerializer(read_only=True)
    dentist_id = serializers.PrimaryKeyRelatedField(queryset=Dentist.objects.all(), write_only=True, source='dentist', allow_null=True, required=False)
    class Meta:
        model = Appointment
        fields = ['id','patient','patient_id','dentist','dentist_id','start_time','end_time','notes','status']
