from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from django.contrib.auth.models import User
from .models import (
    UserProfile, PatientMedicalHistory, Service, Invoice, Appointment,
    AppointmentService, InsuranceDetail, TreatmentRecord, Payment, Role,
    InventoryItem, BillingRecord, FinancialRecord, Patient, LegacyAppointment
)


class PatientMedicalHistorySerializer(serializers.ModelSerializer):
    """Serializer for PatientMedicalHistory model"""
    class Meta:
        model = PatientMedicalHistory
        fields = '__all__'


class UserSerializer(serializers.ModelSerializer):
    """Serializer for Django User model"""
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'is_active', 'date_joined', 'last_login']
        read_only_fields = ['id', 'date_joined']


class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer for UserProfile model"""
    user = UserSerializer(read_only=True)
    full_name = serializers.SerializerMethodField()
    initials = serializers.SerializerMethodField()
    patient_medical_history_details = PatientMedicalHistorySerializer(
        source='patient_medical_history', read_only=True
    )
    
    class Meta:
        model = UserProfile
        fields = [
            'id', 'f_name', 'l_name', 'full_name', 'initials',
            'date_of_creation', 'patient_medical_history', 'patient_medical_history_details',
            'user'
        ]
        read_only_fields = ['id', 'date_of_creation', 'full_name', 'initials', 'patient_medical_history_details']

    def get_full_name(self, obj):
        return obj.get_full_name()

    def get_initials(self, obj):
        return obj.get_initials()


class ServiceSerializer(serializers.ModelSerializer):
    """Serializer for Service model"""
    class Meta:
        model = Service
        fields = '__all__'


class InvoiceSerializer(serializers.ModelSerializer):
    """Serializer for Invoice model"""
    class Meta:
        model = Invoice
        fields = '__all__'


class AppointmentServiceSerializer(serializers.ModelSerializer):
    """Serializer for AppointmentService model"""
    service_details = ServiceSerializer(source='service', read_only=True)
    
    class Meta:
        model = AppointmentService
        fields = ['id', 'service', 'service_details']


class AppointmentSerializer(serializers.ModelSerializer):
    """Serializer for Appointment model"""
    patient_name = serializers.CharField(source='patient.get_full_name', read_only=True)
    staff_name = serializers.CharField(source='staff.get_full_name', read_only=True)
    patient_email = serializers.CharField(source='patient.email', read_only=True)
    services_list = AppointmentServiceSerializer(source='appointmentservice_set', many=True, read_only=True)
    
    # Backward compatibility properties
    date = serializers.SerializerMethodField()
    time = serializers.SerializerMethodField()
    doctor = serializers.SerializerMethodField()
    treatment = serializers.SerializerMethodField()
    
    class Meta:
        model = Appointment
        fields = [
            'id', 'appointment_start_time', 'appointment_end_time', 'status',
            'reason_for_visit', 'notes', 'created_at', 'patient', 'staff', 'invoice',
            'patient_name', 'staff_name', 'patient_email', 'services_list',
            # Backward compatibility fields
            'date', 'time', 'doctor', 'treatment'
        ]
        read_only_fields = [
            'id', 'created_at', 'patient_name', 'staff_name', 'patient_email',
            'services_list', 'date', 'time', 'doctor', 'treatment'
        ]

    def get_date(self, obj):
        return obj.date

    def get_time(self, obj):
        return obj.time

    def get_doctor(self, obj):
        return obj.doctor

    def get_treatment(self, obj):
        return obj.treatment


class InsuranceDetailSerializer(serializers.ModelSerializer):
    """Serializer for InsuranceDetail model"""
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    
    class Meta:
        model = InsuranceDetail
        fields = '__all__'
        read_only_fields = ['user_name']


class TreatmentRecordSerializer(serializers.ModelSerializer):
    """Serializer for TreatmentRecord model"""
    appointment_details = AppointmentSerializer(source='appointment', read_only=True)
    
    class Meta:
        model = TreatmentRecord
        fields = '__all__'
        read_only_fields = ['appointment_details']


class PaymentSerializer(serializers.ModelSerializer):
    """Serializer for Payment model"""
    invoice_details = InvoiceSerializer(source='invoice', read_only=True)
    
    class Meta:
        model = Payment
        fields = '__all__'
        read_only_fields = ['invoice_details']


class RoleSerializer(serializers.ModelSerializer):
    """Serializer for Role model"""
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    
    class Meta:
        model = Role
        fields = '__all__'
        read_only_fields = ['user_name']


# =============================================================================
# LEGACY SERIALIZERS - Keep for backward compatibility
# =============================================================================


class LegacyUserSerializer(serializers.ModelSerializer):
    """LEGACY: Serializer for User model - Use UserProfileSerializer instead"""
    f_name = serializers.CharField(source='userprofile.f_name', read_only=True)
    l_name = serializers.CharField(source='userprofile.l_name', read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'email', 'f_name', 'l_name']
        read_only_fields = ['id']


class UserRegistrationSerializer(serializers.Serializer):
    """LEGACY: Serializer for user registration"""
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True, min_length=8)
    f_name = serializers.CharField(max_length=45, required=False)
    l_name = serializers.CharField(max_length=45, required=False)

    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError("Passwords do not match")
        return data

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        f_name = validated_data.pop('f_name', '')
        l_name = validated_data.pop('l_name', '')
        
        # Create the user
        user = User.objects.create_user(**validated_data)
        
        # Create the profile
        UserProfile.objects.create(
            user=user,
            f_name=f_name,
            l_name=l_name
        )
        
        return user


class PatientSerializer(serializers.ModelSerializer):
    """LEGACY: Serializer for Patient model - Use UserProfileSerializer instead"""
    initials = serializers.SerializerMethodField()
    email = serializers.EmailField(
        validators=[UniqueValidator(queryset=Patient.objects.all())]
    )

    class Meta:
        model = Patient
        fields = [
            'id', 'patient_id', 'name', 'email', 'date_of_birth', 'age', 'contact',
            'address', 'last_visit', 'initials', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'patient_id', 'initials', 'created_at', 'updated_at']

    def get_initials(self, obj):
        return obj.get_initials()


class LegacyAppointmentSerializer(serializers.ModelSerializer):
    """LEGACY: Serializer for Appointment model - Use AppointmentSerializer instead"""
    patient_name = serializers.CharField(source='patient.name', read_only=True)
    patient_email = serializers.CharField(source='patient.email', read_only=True)

    class Meta:
        model = LegacyAppointment
        fields = [
            'id', 'appointment_id', 'patient', 'patient_name', 'patient_email',
            'date', 'time', 'doctor', 'status', 'treatment', 'notes',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'appointment_id', 'patient_name', 'patient_email',
                            'created_at', 'updated_at']


class InventoryItemSerializer(serializers.ModelSerializer):
    """Serializer for InventoryItem model"""
    status = serializers.SerializerMethodField()

    class Meta:
        model = InventoryItem
        fields = [
            'id', 'name', 'category', 'quantity', 'min_stock', 'unit',
            'supplier', 'cost_per_unit', 'notes', 'status',
            'last_updated', 'created_at'
        ]
        read_only_fields = ['id', 'status', 'last_updated', 'created_at']

    def get_status(self, obj):
        if obj.quantity <= 0:
            return "Critical"
        elif obj.quantity <= obj.min_stock:
            return "Low Stock"
        return "In Stock"


class BillingRecordSerializer(serializers.ModelSerializer):
    """Serializer for BillingRecord model"""
    patient_name = serializers.CharField(source='patient.name', read_only=True)
    patient_email = serializers.CharField(source='patient.email', read_only=True)
    patient_initials = serializers.SerializerMethodField()

    class Meta:
        model = BillingRecord
        fields = [
            'id', 'patient', 'patient_name', 'patient_email', 'patient_initials',
            'last_payment', 'amount', 'payment_method', 'notes',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'patient_name', 'patient_email', 'patient_initials',
                            'created_at', 'updated_at']

    def get_patient_initials(self, obj):
        return obj.patient.get_initials()


class FinancialRecordSerializer(serializers.ModelSerializer):
    """Serializer for FinancialRecord model"""
    class Meta:
        model = FinancialRecord
        fields = [
            'id', 'record_type', 'month', 'year', 'amount', 'description',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
