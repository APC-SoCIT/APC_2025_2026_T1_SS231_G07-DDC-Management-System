from rest_framework import serializers
from django.utils import timezone
from datetime import timedelta
from .models import (
    User, Service, Appointment, DentalRecord, 
    Document, InventoryItem, Billing, ClinicLocation, 
    TreatmentPlan, TeethImage, StaffAvailability, DentistAvailability, DentistNotification, 
    AppointmentNotification, PasswordResetToken, PatientIntakeForm,
    FileAttachment, ClinicalNote, TreatmentAssignment, BlockedTimeSlot
)

# Constants for repeated string literals
PATIENT_FULL_NAME = 'patient.get_full_name'
CREATED_BY_FULL_NAME = 'created_by.get_full_name'

# ClinicLocation serializer (defined early for use in other serializers)
class ClinicLocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClinicLocation
        fields = '__all__'

class UserSerializer(serializers.ModelSerializer):
    last_appointment_date = serializers.SerializerMethodField()
    assigned_clinic_name = serializers.CharField(source='assigned_clinic.name', read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'user_type', 
                  'role', 'phone', 'address', 'birthday', 'age', 'profile_picture', 
                  'is_active_patient', 'is_archived', 'assigned_clinic', 'assigned_clinic_name', 
                  'created_at', 'last_appointment_date']
        extra_kwargs = {'password': {'write_only': True}}

    def get_last_appointment_date(self, obj):
        """Get the last appointment datetime for patients (returns full datetime for accurate sorting)"""
        if obj.user_type == 'patient':
            last_datetime = obj.get_last_appointment_date()
            # Return the datetime as is - DRF will serialize it properly as ISO format
            return last_datetime
        return None
    
    def validate_birthday(self, value):
        """Validate birthday based on user type: patients must be 6 months+, staff must be 18+"""
        if value:
            today = timezone.now().date()
            age_in_days = (today - value).days
            
            # Check if birthday is in the future (applies to all users)
            if value > today:
                raise serializers.ValidationError("Birthday cannot be in the future")
            
            # Apply age restrictions based on user type
            user_type = self.initial_data.get('user_type')
            
            if user_type == 'patient':
                # Check if younger than 6 months (approximately 183 days)
                if age_in_days < 183:
                    raise serializers.ValidationError("Patient must be at least 6 months old to register")
                
                # Check if 100 years old or older (exactly 36525 days or more)
                if age_in_days >= 36525:
                    raise serializers.ValidationError("Patient must be younger than 100 years old")
            
            elif user_type == 'staff':
                # Calculate actual age in years
                age = today.year - value.year
                # Adjust if birthday hasn't occurred yet this year
                if (today.month, today.day) < (value.month, value.day):
                    age -= 1
                
                if age < 18:
                    raise serializers.ValidationError("Staff member must be at least 18 years old")
        
        return value

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class ServiceSerializer(serializers.ModelSerializer):
    clinics_data = ClinicLocationSerializer(source='clinics', many=True, read_only=True)
    clinic_ids = serializers.PrimaryKeyRelatedField(
        source='clinics',
        many=True,
        queryset=ClinicLocation.objects.all(),
        write_only=True,
        required=False
    )
    
    class Meta:
        model = Service
        fields = ['id', 'name', 'category', 'description', 'duration', 'color', 'image', 
                  'created_at', 'clinics_data', 'clinic_ids']


class AppointmentSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source=PATIENT_FULL_NAME, read_only=True)
    patient_email = serializers.CharField(source='patient.email', read_only=True)
    dentist_name = serializers.CharField(source='dentist.get_full_name', read_only=True)
    service_name = serializers.CharField(source='service.name', read_only=True)
    service_color = serializers.CharField(source='service.color', read_only=True)
    reschedule_service_name = serializers.CharField(source='reschedule_service.name', read_only=True)
    reschedule_dentist_name = serializers.CharField(source='reschedule_dentist.get_full_name', read_only=True)
    clinic_data = ClinicLocationSerializer(source='clinic', read_only=True)
    clinic_name = serializers.CharField(source='clinic.name', read_only=True)

    class Meta:
        model = Appointment
        fields = '__all__'


class DentalRecordSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source=CREATED_BY_FULL_NAME, read_only=True)
    clinic_data = ClinicLocationSerializer(source='clinic', read_only=True)
    clinic_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = DentalRecord
        fields = '__all__'


class DocumentSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source='uploaded_by.get_full_name', read_only=True)
    clinic_data = ClinicLocationSerializer(source='clinic', read_only=True)
    appointment_date = serializers.DateField(source='appointment.date', read_only=True)
    appointment_time = serializers.TimeField(source='appointment.time', read_only=True)
    service_name = serializers.CharField(source='appointment.service.name', read_only=True)
    dentist_name = serializers.CharField(source='appointment.dentist.get_full_name', read_only=True)
    file_url = serializers.SerializerMethodField()
    document_type_display = serializers.CharField(source='get_document_type_display', read_only=True)

    class Meta:
        model = Document
        fields = [
            'id', 'patient', 'clinic', 'clinic_data', 'document_type', 'document_type_display', 'file', 'file_url',
            'title', 'description', 'appointment', 'appointment_date', 'appointment_time',
            'service_name', 'dentist_name', 'uploaded_by', 'uploaded_by_name', 'uploaded_at'
        ]

    def get_file_url(self, obj):
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None


class InventoryItemSerializer(serializers.ModelSerializer):
    is_low_stock = serializers.BooleanField(read_only=True)

    class Meta:
        model = InventoryItem
        fields = '__all__'


class BillingSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source=PATIENT_FULL_NAME, read_only=True)
    created_by_name = serializers.CharField(source=CREATED_BY_FULL_NAME, read_only=True)
    clinic_data = ClinicLocationSerializer(source='clinic', read_only=True)
    clinic_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = Billing
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
    image_type_display = serializers.CharField(source='get_image_type_display', read_only=True)
    appointment = serializers.PrimaryKeyRelatedField(
        queryset=Appointment.objects.all(),
        required=False,
        allow_null=True
    )
    appointment_date = serializers.DateField(source='appointment.date', read_only=True)
    appointment_time = serializers.TimeField(source='appointment.time', read_only=True)
    service_name = serializers.CharField(source='appointment.service.name', read_only=True)
    dentist_name = serializers.CharField(source='appointment.dentist.get_full_name', read_only=True)

    class Meta:
        model = TeethImage
        fields = ['id', 'patient', 'patient_name', 'image', 'image_url', 'image_type', 'image_type_display', 'notes', 
                  'uploaded_by', 'uploaded_by_name', 'is_latest', 'uploaded_at', 'appointment',
                  'appointment_date', 'appointment_time', 'service_name', 'dentist_name']
        read_only_fields = ['uploaded_at']

    def get_image_url(self, obj):
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None

    def to_representation(self, instance):
        """Return appointment as integer ID in responses"""
        data = super().to_representation(instance)
        if instance.appointment:
            data['appointment'] = instance.appointment.id
        return data


class StaffAvailabilitySerializer(serializers.ModelSerializer):
    staff_name = serializers.CharField(source='staff.get_full_name', read_only=True)
    day_name = serializers.CharField(source='get_day_of_week_display', read_only=True)
    clinics_data = ClinicLocationSerializer(source='clinics', many=True, read_only=True)
    clinic_ids = serializers.PrimaryKeyRelatedField(
        source='clinics',
        many=True,
        queryset=ClinicLocation.objects.all(),
        write_only=True,
        required=False
    )

    class Meta:
        model = StaffAvailability
        fields = ['id', 'staff', 'staff_name', 'day_of_week', 'day_name', 
                  'is_available', 'start_time', 'end_time', 'clinics', 'clinics_data', 
                  'clinic_ids', 'apply_to_all_clinics', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']


class DentistAvailabilitySerializer(serializers.ModelSerializer):
    dentist_name = serializers.CharField(source='dentist.get_full_name', read_only=True)
    clinic_data = ClinicLocationSerializer(source='clinic', read_only=True)
    clinic_id = serializers.PrimaryKeyRelatedField(
        source='clinic',
        queryset=ClinicLocation.objects.all(),
        write_only=True,
        required=False,
        allow_null=True
    )

    class Meta:
        model = DentistAvailability
        fields = ['id', 'dentist', 'dentist_name', 'date', 'start_time', 'end_time',
                  'is_available', 'clinic', 'clinic_data', 'clinic_id', 'apply_to_all_clinics',
                  'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at', 'clinic']
        # Disable auto-generated unique_together validator since we have both clinic and clinic_id fields
        # We handle uniqueness manually in the create method
        validators = []

    def validate(self, data):
        """Ensure end_time is after start_time"""
        if 'start_time' in data and 'end_time' in data:
            if data['end_time'] <= data['start_time']:
                raise serializers.ValidationError("End time must be after start time")
        return data

    def create(self, validated_data):
        """Update existing availability or create new one to avoid unique constraint errors"""
        dentist = validated_data.get('dentist')
        date = validated_data.get('date')
        clinic = validated_data.get('clinic')
        apply_to_all = validated_data.get('apply_to_all_clinics', False)
        
        # Try to find existing availability for this dentist + date + clinic combo
        try:
            existing = self.Meta.model.objects.get(
                dentist=dentist,
                date=date,
                clinic=clinic
            )
            # Update existing record
            for key, value in validated_data.items():
                setattr(existing, key, value)
            existing.save()
            return existing
        except self.Meta.model.DoesNotExist:
            # If we're setting a specific clinic, check if there's an old record with clinic=null
            # that we should update instead of creating a duplicate
            if clinic is not None and not apply_to_all:
                old_null_clinic = self.Meta.model.objects.filter(
                    dentist=dentist,
                    date=date,
                    clinic__isnull=True
                ).first()
                
                if old_null_clinic:
                    # Update the old record to use the new clinic
                    for key, value in validated_data.items():
                        setattr(old_null_clinic, key, value)
                    old_null_clinic.save()
                    return old_null_clinic
            
            # Create new record
            return super().create(validated_data)


class BlockedTimeSlotSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    clinic_data = ClinicLocationSerializer(source='clinic', read_only=True)
    clinic_id = serializers.PrimaryKeyRelatedField(
        source='clinic',
        queryset=ClinicLocation.objects.all(),
        write_only=True,
        required=False,
        allow_null=True
    )

    class Meta:
        model = BlockedTimeSlot
        fields = ['id', 'date', 'start_time', 'end_time', 'reason', 
                  'clinic', 'clinic_data', 'clinic_id', 'apply_to_all_clinics',
                  'created_by', 'created_by_name', 'created_at', 'updated_at']
        read_only_fields = ['created_by', 'created_at', 'updated_at']

    def validate(self, data):
        """Ensure end_time is after start_time"""
        if 'start_time' in data and 'end_time' in data:
            if data['end_time'] <= data['start_time']:
                raise serializers.ValidationError("End time must be after start time")
        return data


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
