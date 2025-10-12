from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from django.contrib.auth.models import User
from .models import Patient, Appointment, InventoryItem, BillingRecord, FinancialRecord


class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model"""
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']
        read_only_fields = ['id']


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for user registration"""
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password_confirm', 'first_name', 'last_name']

    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError("Passwords do not match")
        return data

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        user = User.objects.create_user(**validated_data)
        return user


class PatientSerializer(serializers.ModelSerializer):
    """Serializer for Patient model"""
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


class AppointmentSerializer(serializers.ModelSerializer):
    """Serializer for Appointment model"""
    patient_name = serializers.CharField(source='patient.name', read_only=True)
    patient_email = serializers.CharField(source='patient.email', read_only=True)

    class Meta:
        model = Appointment
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
