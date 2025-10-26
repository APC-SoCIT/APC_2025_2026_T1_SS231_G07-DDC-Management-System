from rest_framework import serializers
from .models import (
    User, Service, Appointment, ToothChart, DentalRecord, 
    Document, InventoryItem, Billing, ClinicLocation, 
    TreatmentPlan, TeethImage, StaffAvailability, DentistNotification, 
    AppointmentNotification, PasswordResetToken, PatientIntakeForm,
    FileAttachment, ClinicalNote, TreatmentAssignment
)

# Constants for repeated string literals
PATIENT_FULL_NAME = 'patient.get_full_name'
CREATED_BY_FULL_NAME = 'created_by.get_full_name'

class UserSerializer(serializers.ModelSerializer):
    last_appointment_date = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'user_type', 
                  'role', 'phone', 'address', 'birthday', 'age', 'profile_picture', 
                  'is_active_patient', 'is_archived', 'created_at', 'last_appointment_date']
        extra_kwargs = {'password': {'write_only': True}}

    def get_last_appointment_date(self, obj):
        """Get the last appointment date for patients"""
        if obj.user_type == 'patient':
            return obj.get_last_appointment_date()
        return None

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class ServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Service
        fields = '__all__'


class AppointmentSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source=PATIENT_FULL_NAME, read_only=True)
    patient_email = serializers.CharField(source='patient.email', read_only=True)
    dentist_name = serializers.CharField(source='dentist.get_full_name', read_only=True)
    service_name = serializers.CharField(source='service.name', read_only=True)
    reschedule_service_name = serializers.CharField(source='reschedule_service.name', read_only=True)
    reschedule_dentist_name = serializers.CharField(source='reschedule_dentist.get_full_name', read_only=True)

    class Meta:
        model = Appointment
        fields = '__all__'


class ToothChartSerializer(serializers.ModelSerializer):
    class Meta:
        model = ToothChart
        fields = '__all__'


class DentalRecordSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source=CREATED_BY_FULL_NAME, read_only=True)

    class Meta:
        model = DentalRecord
        fields = '__all__'


class DocumentSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source='uploaded_by.get_full_name', read_only=True)

    class Meta:
        model = Document
        fields = '__all__'


class InventoryItemSerializer(serializers.ModelSerializer):
    is_low_stock = serializers.BooleanField(read_only=True)

    class Meta:
        model = InventoryItem
        fields = '__all__'


class BillingSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source=PATIENT_FULL_NAME, read_only=True)
    created_by_name = serializers.CharField(source=CREATED_BY_FULL_NAME, read_only=True)

    class Meta:
        model = Billing
        fields = '__all__'


class ClinicLocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClinicLocation
        fields = '__all__'


class TreatmentPlanSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source=CREATED_BY_FULL_NAME, read_only=True)

    class Meta:
        model = TreatmentPlan
        fields = '__all__'


class TeethImageSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source=PATIENT_FULL_NAME, read_only=True)
    uploaded_by_name = serializers.CharField(source='uploaded_by.get_full_name', read_only=True)
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = TeethImage
        fields = ['id', 'patient', 'patient_name', 'image', 'image_url', 'notes', 
                  'uploaded_by', 'uploaded_by_name', 'is_latest', 'uploaded_at']
        read_only_fields = ['uploaded_at']

    def get_image_url(self, obj):
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None


class StaffAvailabilitySerializer(serializers.ModelSerializer):
    staff_name = serializers.CharField(source='staff.get_full_name', read_only=True)
    day_name = serializers.CharField(source='get_day_of_week_display', read_only=True)

    class Meta:
        model = StaffAvailability
        fields = ['id', 'staff', 'staff_name', 'day_of_week', 'day_name', 
                  'is_available', 'start_time', 'end_time', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']


class DentistNotificationSerializer(serializers.ModelSerializer):
    dentist_name = serializers.CharField(source='dentist.get_full_name', read_only=True)
    appointment_details = serializers.SerializerMethodField()

    class Meta:
        model = DentistNotification
        fields = ['id', 'dentist', 'dentist_name', 'appointment', 'appointment_details',
                  'notification_type', 'message', 'is_read', 'created_at']
        read_only_fields = ['created_at']

    def get_appointment_details(self, obj):
        if obj.appointment:
            return {
                'id': obj.appointment.id,
                'patient_name': obj.appointment.patient.get_full_name(),
                'date': obj.appointment.date,
                'time': obj.appointment.time,
                'service': obj.appointment.service.name if obj.appointment.service else None,
            }
        return None


class AppointmentNotificationSerializer(serializers.ModelSerializer):
    recipient_name = serializers.CharField(source='recipient.get_full_name', read_only=True)
    appointment_details = serializers.SerializerMethodField()

    class Meta:
        model = AppointmentNotification
        fields = ['id', 'recipient', 'recipient_name', 'appointment', 'appointment_details',
                  'notification_type', 'message', 'is_read', 'created_at']
        read_only_fields = ['created_at']

    def get_appointment_details(self, obj):
        if obj.appointment:
            appointment_data = {
                'id': obj.appointment.id,
                'patient_name': obj.appointment.patient.get_full_name(),
                'date': str(obj.appointment.date),
                'time': str(obj.appointment.time),
                'status': obj.appointment.status,
                'service': obj.appointment.service.name if obj.appointment.service else None,
            }
            
            # Add reschedule details if this is a reschedule request
            if obj.notification_type == 'reschedule_request' and obj.appointment.reschedule_date:
                appointment_data['reschedule_date'] = str(obj.appointment.reschedule_date)
                appointment_data['reschedule_time'] = str(obj.appointment.reschedule_time)
                appointment_data['reschedule_service'] = obj.appointment.reschedule_service.name if obj.appointment.reschedule_service else None
                appointment_data['reschedule_dentist'] = obj.appointment.reschedule_dentist.get_full_name() if obj.appointment.reschedule_dentist else None
            
            # Add cancel reason if this is a cancel request
            if obj.notification_type == 'cancel_request' and obj.appointment.cancel_reason:
                appointment_data['cancel_reason'] = obj.appointment.cancel_reason
            
            return appointment_data
        return None


class PasswordResetTokenSerializer(serializers.ModelSerializer):
    class Meta:
        model = PasswordResetToken
        fields = ['id', 'user', 'token', 'created_at', 'expires_at', 'is_used']
        read_only_fields = ['created_at', 'expires_at', 'is_used']


class PatientIntakeFormSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source=PATIENT_FULL_NAME, read_only=True)
    filled_by_name = serializers.CharField(source='filled_by.get_full_name', read_only=True)

    class Meta:
        model = PatientIntakeForm
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']


class FileAttachmentSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source=PATIENT_FULL_NAME, read_only=True)
    uploaded_by_name = serializers.CharField(source='uploaded_by.get_full_name', read_only=True)
    file_url = serializers.SerializerMethodField()
    file_extension = serializers.SerializerMethodField()

    class Meta:
        model = FileAttachment
        fields = '__all__'
        read_only_fields = ['uploaded_at', 'file_size']

    def get_file_url(self, obj):
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None
    
    def get_file_extension(self, obj):
        return obj.get_file_extension()


class ClinicalNoteSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source=PATIENT_FULL_NAME, read_only=True)
    author_name = serializers.CharField(source='author.get_full_name', read_only=True)
    appointment_date = serializers.SerializerMethodField()

    class Meta:
        model = ClinicalNote
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']

    def get_appointment_date(self, obj):
        if obj.appointment:
            return str(obj.appointment.date)
        return None


class TreatmentAssignmentSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source=PATIENT_FULL_NAME, read_only=True)
    assigned_by_name = serializers.CharField(source='assigned_by.get_full_name', read_only=True)
    assigned_dentist_name = serializers.CharField(source='assigned_dentist.get_full_name', read_only=True)
    treatment_plan_title = serializers.CharField(source='treatment_plan.title', read_only=True)

    class Meta:
        model = TreatmentAssignment
        fields = '__all__'
        read_only_fields = ['date_assigned']
