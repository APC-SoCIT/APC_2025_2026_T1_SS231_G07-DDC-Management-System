from rest_framework import serializers
from django.utils import timezone
from datetime import timedelta
from .models import (
    User, Service, Appointment, DentalRecord, 
    Document, InventoryItem, Billing, ClinicLocation, 
    TreatmentPlan, TeethImage, StaffAvailability, DentistAvailability, DentistNotification, 
    AppointmentNotification, PasswordResetToken, PatientIntakeForm,
    FileAttachment, ClinicalNote, TreatmentAssignment, BlockedTimeSlot,
    Invoice, InvoiceItem, PatientBalance, Payment, PaymentSplit
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
        """
        Get the last appointment datetime for patients.
        Optimized to use prefetched data to avoid N+1 queries.
        """
        if obj.user_type == 'patient':
            # First, try to use prefetched data from the view
            if hasattr(obj, 'last_appointment_cache') and obj.last_appointment_cache:
                apt = obj.last_appointment_cache[0]
                if hasattr(apt, 'completed_at') and apt.completed_at:
                    return apt.completed_at
                # Fallback: combine date and time
                from datetime import datetime
                return datetime.combine(apt.date, apt.time)
            
            # Second, check for annotated field
            if hasattr(obj, 'last_completed_appointment') and obj.last_completed_appointment:
                return obj.last_completed_appointment
            
            # Only as last resort, query the database
            # This should rarely happen if views are properly using prefetch_related
            try:
                last_apt = obj.appointments.filter(status='completed').order_by(
                    '-completed_at', '-date', '-time'
                ).first()
                if last_apt:
                    if last_apt.completed_at:
                        return last_apt.completed_at
                    from datetime import datetime
                    return datetime.combine(last_apt.date, last_apt.time)
            except Exception:
                pass
        
        return None
    
    def validate_first_name(self, value):
        """Validate first name is not empty"""
        if not value or not value.strip():
            raise serializers.ValidationError("First name is required")
        return value
    
    def validate_last_name(self, value):
        """Validate last name is not empty"""
        if not value or not value.strip():
            raise serializers.ValidationError("Last name is required")
        return value
    
    def validate_email(self, value):
        """Validate email is not empty"""
        if not value or not value.strip():
            raise serializers.ValidationError("Email is required")
        return value
    
    def validate_username(self, value):
        """Validate username is unique and not empty"""
        if not value or not value.strip():
            raise serializers.ValidationError("Username is required")
        
        # Check if username already exists (only for new users, not updates)
        if not self.instance:  # Creating new user
            if User.objects.filter(username=value).exists():
                raise serializers.ValidationError("This username is already taken")
        else:  # Updating existing user
            if User.objects.filter(username=value).exclude(id=self.instance.id).exists():
                raise serializers.ValidationError("This username is already taken")
        
        return value
    
    def validate_phone(self, value):
        """Validate phone number is not empty"""
        if not value or not value.strip():
            raise serializers.ValidationError("Contact number is required")
        return value
    
    def validate_address(self, value):
        """Validate address is not empty"""
        if not value or not value.strip():
            raise serializers.ValidationError("Address is required")
        return value
    
    def validate_birthday(self, value):
        """Validate birthday based on user type: patients must be 6 months+, staff must be 18+"""
        if not value:
            user_type = self.initial_data.get('user_type')
            if user_type == 'staff':
                raise serializers.ValidationError("Birthdate is required")
            return value
            
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
            # Check if the person is at least 18 years old
            # Calculate their 18th birthday
            try:
                eighteenth_birthday = value.replace(year=value.year + 18)
            except ValueError:
                # Handle leap year edge case (Feb 29 -> Feb 28)
                eighteenth_birthday = value.replace(year=value.year + 18, day=28)
            
            # They must have already had their 18th birthday
            if today < eighteenth_birthday:
                raise serializers.ValidationError("Staff member must be at least 18 years old")
        
        return value
    
    def validate(self, data):
        """Validate that password and confirm_password match if confirm_password is provided"""
        confirm_password = self.initial_data.get('confirm_password')
        password = data.get('password')
        
        if confirm_password and password:
            if password != confirm_password:
                raise serializers.ValidationError({"confirm_password": "Passwords do not match"})
        
        return data

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
    invoice_id = serializers.SerializerMethodField(read_only=True)
    has_invoice = serializers.SerializerMethodField(read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    created_by_type = serializers.CharField(source='created_by.user_type', read_only=True)

    class Meta:
        model = Appointment
        fields = '__all__'
    
    def get_invoice_id(self, obj):
        """Return the invoice ID if an invoice exists for this appointment"""
        return obj.invoice.id if hasattr(obj, 'invoice') else None
    
    def get_has_invoice(self, obj):
        """Return True if an invoice exists for this appointment"""
        return hasattr(obj, 'invoice')


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
    clinic_name = serializers.CharField(source='clinic.name', read_only=True)
    clinic_data = ClinicLocationSerializer(source='clinic', read_only=True)

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
                'service_name': obj.appointment.service.name if obj.appointment.service else None,
            }
            
            # Add reschedule details if this is a reschedule request
            if obj.notification_type == 'reschedule_request' and obj.appointment.reschedule_date:
                appointment_data['requested_date'] = str(obj.appointment.reschedule_date)
                appointment_data['requested_time'] = str(obj.appointment.reschedule_time)
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


# ============================================================================
# INVOICE SERIALIZERS
# ============================================================================

class InvoiceItemSerializer(serializers.ModelSerializer):
    """Serializer for invoice line items"""
    inventory_item_name = serializers.CharField(source='inventory_item.name', read_only=True)
    
    class Meta:
        model = InvoiceItem
        fields = [
            'id', 'invoice', 'inventory_item', 'inventory_item_name',
            'item_name', 'description', 'quantity', 'unit_price', 
            'total_price', 'created_at', 'updated_at'
        ]
        read_only_fields = ['total_price', 'created_at', 'updated_at']


class InvoiceSerializer(serializers.ModelSerializer):
    """Serializer for invoices with nested items"""
    # Related object details
    patient_name = serializers.CharField(source='patient.get_full_name', read_only=True)
    patient_email = serializers.CharField(source='patient.email', read_only=True)
    clinic_name = serializers.CharField(source='clinic.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    
    # Appointment details
    appointment_date = serializers.DateField(source='appointment.date', read_only=True)
    appointment_time = serializers.TimeField(source='appointment.time', read_only=True)
    service_name = serializers.CharField(source='appointment.service.name', read_only=True)
    dentist_name = serializers.CharField(source='appointment.dentist.get_full_name', read_only=True)
    
    # Nested invoice items
    items = InvoiceItemSerializer(many=True, read_only=True)
    
    # PDF file URL
    pdf_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Invoice
        fields = [
            'id', 'invoice_number', 'reference_number', 'appointment', 'patient', 
            'patient_name', 'patient_email', 'clinic', 'clinic_name', 
            'created_by', 'created_by_name', 'service_charge', 'items_subtotal', 
            'subtotal', 'interest_rate', 'interest_amount', 'total_due', 
            'amount_paid', 'balance', 'status', 'invoice_date', 'due_date', 
            'created_at', 'updated_at', 'sent_at', 'paid_at', 'notes', 
            'payment_instructions', 'bank_account', 'pdf_file', 'pdf_url',
            'items', 'appointment_date', 'appointment_time', 'service_name', 
            'dentist_name'
        ]
        read_only_fields = [
            'invoice_number', 'reference_number', 'subtotal', 'balance', 
            'created_at', 'updated_at', 'sent_at', 'paid_at'
        ]
    
    def get_pdf_url(self, obj):
        """Get the full URL for the PDF file"""
        if obj.pdf_file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.pdf_file.url)
            return obj.pdf_file.url
        return None


class InvoiceCreateSerializer(serializers.Serializer):
    """Serializer for creating invoices with items"""
    appointment_id = serializers.IntegerField()
    service_charge = serializers.DecimalField(max_digits=10, decimal_places=2)
    items = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        allow_empty=True
    )
    due_days = serializers.IntegerField(default=7, min_value=1, max_value=365)
    notes = serializers.CharField(required=False, allow_blank=True)
    send_email = serializers.BooleanField(default=True)
    
    def validate_appointment_id(self, value):
        """Validate appointment exists and is completed"""
        try:
            appointment = Appointment.objects.get(id=value)
        except Appointment.DoesNotExist:
            raise serializers.ValidationError("Appointment not found")
        
        if appointment.status != 'completed':
            raise serializers.ValidationError("Can only create invoice for completed appointments")
        
        if hasattr(appointment, 'invoice'):
            raise serializers.ValidationError("Invoice already exists for this appointment")
        
        return value
    
    def validate_service_charge(self, value):
        """Validate service charge is positive and reasonable"""
        if value <= 0:
            raise serializers.ValidationError("Service charge must be greater than 0")
        if value > 100000:
            raise serializers.ValidationError("Service charge cannot exceed ₱100,000")
        return value
    
    def validate_items(self, value):
        """Validate invoice items"""
        if not value:
            return []
        
        validated_items = []
        for item in value:
            # Validate required fields
            if 'inventory_item_id' not in item:
                raise serializers.ValidationError("Each item must have an inventory_item_id")
            if 'quantity' not in item:
                raise serializers.ValidationError("Each item must have a quantity")
            if 'unit_price' not in item:
                raise serializers.ValidationError("Each item must have a unit_price")
            
            # Validate inventory item exists
            try:
                inventory_item = InventoryItem.objects.get(id=item['inventory_item_id'])
            except InventoryItem.DoesNotExist:
                raise serializers.ValidationError(f"Inventory item {item['inventory_item_id']} not found")
            
            # Validate quantity
            quantity = int(item['quantity'])
            if quantity <= 0:
                raise serializers.ValidationError("Quantity must be greater than 0")
            if quantity > inventory_item.quantity:
                raise serializers.ValidationError(
                    f"Insufficient stock for {inventory_item.name}. "
                    f"Available: {inventory_item.quantity}, Requested: {quantity}"
                )
            
            # Validate unit price
            unit_price = float(item['unit_price'])
            if unit_price <= 0:
                raise serializers.ValidationError("Unit price must be greater than 0")
            
            validated_items.append({
                'inventory_item_id': item['inventory_item_id'],
                'quantity': quantity,
                'unit_price': unit_price,
                'item_name': inventory_item.name,
                'description': item.get('description', '')
            })
        
        return validated_items


class PatientBalanceSerializer(serializers.ModelSerializer):
    """Serializer for patient balance tracking"""
    patient_name = serializers.CharField(source='patient.get_full_name', read_only=True)
    patient_email = serializers.CharField(source='patient.email', read_only=True)
    
    class Meta:
        model = PatientBalance
        fields = [
            'id', 'patient', 'patient_name', 'patient_email',
            'total_invoiced', 'total_paid', 'current_balance',
            'last_invoice_date', 'last_payment_date', 'updated_at'
        ]
        read_only_fields = ['updated_at']


class PaymentSplitSerializer(serializers.ModelSerializer):
    """Serializer for payment splits (allocation to invoices)"""
    invoice_number = serializers.CharField(source='invoice.invoice_number', read_only=True)
    invoice_balance = serializers.DecimalField(source='invoice.balance', max_digits=10, decimal_places=2, read_only=True)
    provider_name = serializers.CharField(source='provider.get_full_name', read_only=True)
    
    class Meta:
        model = PaymentSplit
        fields = [
            'id', 'payment', 'invoice', 'invoice_number', 'invoice_balance',
            'amount', 'provider', 'provider_name', 'is_voided', 'voided_at',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'voided_at']


class PaymentSerializer(serializers.ModelSerializer):
    """Serializer for payments with nested splits"""
    patient_name = serializers.CharField(source='patient.get_full_name', read_only=True)
    patient_email = serializers.CharField(source='patient.email', read_only=True)
    clinic_name = serializers.CharField(source='clinic.name', read_only=True)
    recorded_by_name = serializers.CharField(source='recorded_by.get_full_name', read_only=True)
    voided_by_name = serializers.CharField(source='voided_by.get_full_name', read_only=True)
    
    # Nested splits
    splits = PaymentSplitSerializer(many=True, read_only=True)
    
    # Calculated fields
    allocated_amount = serializers.SerializerMethodField()
    unallocated_amount = serializers.SerializerMethodField()
    payment_method_display = serializers.CharField(source='get_payment_method_display', read_only=True)
    
    class Meta:
        model = Payment
        fields = [
            'id', 'payment_number', 'patient', 'patient_name', 'patient_email',
            'clinic', 'clinic_name', 'amount', 'payment_date', 'payment_method',
            'payment_method_display', 'check_number', 'bank_name', 'reference_number',
            'notes', 'recorded_by', 'recorded_by_name', 'created_at', 'updated_at',
            'is_voided', 'voided_at', 'voided_by', 'voided_by_name', 'void_reason',
            'splits', 'allocated_amount', 'unallocated_amount'
        ]
        read_only_fields = [
            'payment_number', 'created_at', 'updated_at', 'voided_at'
        ]
    
    def get_allocated_amount(self, obj):
        return float(obj.get_allocated_amount())
    
    def get_unallocated_amount(self, obj):
        return float(obj.get_unallocated_amount())


class PaymentRecordSerializer(serializers.Serializer):
    """Serializer for recording a new payment with allocations"""
    patient_id = serializers.IntegerField()
    clinic_id = serializers.IntegerField(required=False, allow_null=True)
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0.01)
    payment_date = serializers.DateField()
    payment_method = serializers.ChoiceField(choices=Payment.PAYMENT_METHOD_CHOICES)
    check_number = serializers.CharField(required=False, allow_blank=True)
    bank_name = serializers.CharField(required=False, allow_blank=True)
    reference_number = serializers.CharField(required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)
    
    # Payment allocations to invoices
    allocations = serializers.ListField(
        child=serializers.DictField(),
        required=True,
        allow_empty=False,
        help_text="List of {invoice_id: int, amount: decimal} objects"
    )
    
    def validate_patient_id(self, value):
        """Validate patient exists"""
        try:
            patient = User.objects.get(id=value, user_type='patient')
        except User.DoesNotExist:
            raise serializers.ValidationError("Patient not found")
        return value
    
    def validate_allocations(self, value):
        """Validate payment allocations"""
        from decimal import Decimal
        
        if not value:
            raise serializers.ValidationError("At least one invoice allocation is required")
        
        validated_allocations = []
        total_allocated = Decimal('0')
        
        for alloc in value:
            # Validate required fields
            if 'invoice_id' not in alloc:
                raise serializers.ValidationError("Each allocation must have 'invoice_id'")
            if 'amount' not in alloc:
                raise serializers.ValidationError("Each allocation must have 'amount'")
            
            # Validate invoice exists
            try:
                invoice = Invoice.objects.select_related('patient').get(id=alloc['invoice_id'])
            except Invoice.DoesNotExist:
                raise serializers.ValidationError(f"Invoice {alloc['invoice_id']} not found")
            
            # Validate amount - convert to Decimal
            try:
                amount = Decimal(str(alloc['amount']))
            except (ValueError, TypeError, ArithmeticError):
                raise serializers.ValidationError(f"Invalid amount for invoice {alloc['invoice_id']}")
            
            if amount <= 0:
                raise serializers.ValidationError(f"Allocation amount must be greater than 0")
            
            if amount > invoice.balance:
                raise serializers.ValidationError(
                    f"Allocation amount (PHP {amount}) exceeds invoice {invoice.invoice_number} "
                    f"balance (PHP {invoice.balance})"
                )
            
            total_allocated += amount
            validated_allocations.append({
                'invoice_id': alloc['invoice_id'],
                'amount': amount,
                'provider_id': alloc.get('provider_id')
            })
        
        return validated_allocations
    
    def validate(self, data):
        """Cross-field validation"""
        from decimal import Decimal
        
        # Validate total allocations don't exceed payment amount
        total_allocated = sum(alloc['amount'] for alloc in data['allocations'])
        if total_allocated > data['amount']:
            raise serializers.ValidationError(
                f"Total allocations (PHP {total_allocated}) exceed payment amount (PHP {data['amount']})"
            )
        
        # Validate all invoices belong to the same patient
        invoice_ids = [alloc['invoice_id'] for alloc in data['allocations']]
        invoices = Invoice.objects.filter(id__in=invoice_ids).values_list('patient_id', flat=True)
        unique_patients = set(invoices)
        
        if len(unique_patients) > 1:
            raise serializers.ValidationError("All invoices must belong to the same patient")
        
        if unique_patients and list(unique_patients)[0] != data['patient_id']:
            raise serializers.ValidationError("Invoices do not belong to the specified patient")
        
        return data

