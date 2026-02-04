from django.db import models
from django.contrib.auth.models import AbstractUser
from datetime import datetime, timedelta
from django.utils import timezone

class User(AbstractUser):
    USER_TYPES = (
        ('patient', 'Patient'),
        ('staff', 'Receptionist/Dentist'),
        ('owner', 'Owner'),
    )
    STAFF_ROLES = (
        ('', 'Not Assigned'),
        ('receptionist', 'Receptionist'),
        ('dentist', 'Dentist'),
    )
    user_type = models.CharField(max_length=20, choices=USER_TYPES, default='patient')
    role = models.CharField(max_length=20, choices=STAFF_ROLES, blank=True, default='')
    phone = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    birthday = models.DateField(null=True, blank=True)
    age = models.IntegerField(null=True, blank=True)
    profile_picture = models.ImageField(upload_to='profiles/', null=True, blank=True)
    is_active_patient = models.BooleanField(default=True)
    is_archived = models.BooleanField(default=False)  # NEW: For archiving patients
    assigned_clinic = models.ForeignKey('ClinicLocation', on_delete=models.SET_NULL, null=True, blank=True, related_name='staff_members', help_text="Clinic where staff/dentist is currently assigned")
    created_at = models.DateTimeField(auto_now_add=True)

    # Override email to make it unique and required
    email = models.EmailField(unique=True, blank=False)

    def __str__(self):
        return f"{self.get_full_name()} ({self.user_type})"
    
    def update_patient_status(self):
        """Update patient status based on last appointment date"""
        if self.user_type != 'patient':
            return
        
        try:
            # Get last appointment
            last_appointment = self.appointments.order_by('-date').first()
            
            if last_appointment:
                # Calculate if last appointment was more than 2 years ago
                two_years_ago = timezone.now().date() - timedelta(days=730)
                if last_appointment.date < two_years_ago:
                    self.is_active_patient = False
                else:
                    self.is_active_patient = True
            else:
                # No appointments yet - keep as active for new patients
                self.is_active_patient = True
            
            self.save(update_fields=['is_active_patient'])
        except Exception:
            # If appointments relationship doesn't exist yet, keep as active
            self.is_active_patient = True
    
    def get_last_appointment_date(self):
        """Get the date of the last completed appointment"""
        try:
            # Get completed appointments ordered by completion time (most recent first)
            # Use completed_at if available for accurate sorting, otherwise fallback to date+time
            completed_appointments = self.appointments.filter(status='completed').order_by('-completed_at', '-date', '-time')
            
            if completed_appointments.exists():
                last_appointment = completed_appointments.first()
                # Return completed_at datetime if available for accurate sorting
                if hasattr(last_appointment, 'completed_at') and last_appointment.completed_at:
                    return last_appointment.completed_at
                # Fallback: combine date and time into a datetime
                from datetime import datetime
                return datetime.combine(last_appointment.date, last_appointment.time)
            return None
        except Exception as e:
            # If appointments relationship doesn't exist yet, return None
            return None


class Service(models.Model):
    CATEGORIES = (
        ('all', 'All Services'),
        ('orthodontics', 'Orthodontics'),
        ('restorations', 'Restorations'),
        ('xrays', 'X-Rays'),
        ('oral_surgery', 'Oral Surgery'),
        ('preventive', 'Preventive'),
    )
    name = models.CharField(max_length=200)
    category = models.CharField(max_length=50, choices=CATEGORIES)
    description = models.TextField()
    duration = models.IntegerField(default=30, help_text="Duration in minutes")
    color = models.CharField(max_length=7, default='#10b981', help_text="Hex color code (e.g., #10b981)")
    image = models.ImageField(upload_to='services/', null=True, blank=True)
    clinics = models.ManyToManyField('ClinicLocation', related_name='services', blank=True, help_text="Clinics where this service is offered")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class Appointment(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('waiting', 'Waiting'),
        ('cancelled', 'Cancelled'),
        ('completed', 'Completed'),
        ('missed', 'Missed'),
        ('reschedule_requested', 'Reschedule Requested'),
        ('cancel_requested', 'Cancel Requested'),
    )
    PATIENT_STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('waiting', 'Waiting'),
        ('ongoing', 'Ongoing'),
        ('done', 'Done'),
    )
    patient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='appointments')
    dentist = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='dentist_appointments')
    service = models.ForeignKey(Service, on_delete=models.SET_NULL, null=True)
    clinic = models.ForeignKey('ClinicLocation', on_delete=models.CASCADE, related_name='appointments', null=True, blank=True, help_text="Clinic where appointment occurs")
    date = models.DateField()
    time = models.TimeField()
    status = models.CharField(max_length=25, choices=STATUS_CHOICES, default='confirmed')
    patient_status = models.CharField(max_length=20, choices=PATIENT_STATUS_CHOICES, default='pending', help_text="Patient's current status in clinic workflow")
    notes = models.TextField(blank=True)
    
    # Reschedule request fields
    reschedule_date = models.DateField(null=True, blank=True)
    reschedule_time = models.TimeField(null=True, blank=True)
    reschedule_service = models.ForeignKey(Service, on_delete=models.SET_NULL, null=True, blank=True, related_name='reschedule_requests')
    reschedule_dentist = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='reschedule_requests')
    reschedule_notes = models.TextField(blank=True)
    
    # Cancel request fields
    cancel_reason = models.TextField(blank=True)
    cancel_requested_at = models.DateTimeField(null=True, blank=True)
    
    # Completion timestamp
    completed_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date', '-time']
        indexes = [
            models.Index(fields=['clinic', 'date']),
            models.Index(fields=['clinic', 'status']),
            models.Index(fields=['date', 'time']),
        ]

    def __str__(self):
        return f"{self.patient.get_full_name()} - {self.date} {self.time}"


class ToothChart(models.Model):
    patient = models.OneToOneField(User, on_delete=models.CASCADE, related_name='tooth_chart')
    chart_data = models.JSONField(default=dict)
    notes = models.TextField(blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Tooth Chart - {self.patient.get_full_name()}"


class DentalRecord(models.Model):
    patient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='dental_records')
    appointment = models.ForeignKey(Appointment, on_delete=models.SET_NULL, null=True, blank=True)
    clinic = models.ForeignKey('ClinicLocation', on_delete=models.SET_NULL, null=True, blank=True, related_name='dental_records', help_text="Clinic where this record was created")
    treatment = models.TextField()
    diagnosis = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_records')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.patient.get_full_name()} - {self.created_at.date()}"


class Document(models.Model):
    DOCUMENT_TYPES = (
        ('xray', 'X-Ray'),
        ('scan', 'Tooth Scan'),
        ('report', 'Report'),
        ('medical_certificate', 'Medical Certificate'),
        ('note', 'Note'),
        ('dental_image', 'Dental Image'),
        ('other', 'Other'),
    )
    patient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='documents')
    clinic = models.ForeignKey('ClinicLocation', on_delete=models.SET_NULL, null=True, blank=True, related_name='documents', help_text="Clinic where this document was uploaded")
    document_type = models.CharField(max_length=20, choices=DOCUMENT_TYPES)
    file = models.FileField(upload_to='documents/')
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    appointment = models.ForeignKey(
        'Appointment', on_delete=models.SET_NULL, null=True, blank=True, related_name='documents'
    )
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='uploaded_documents')
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-uploaded_at']

    def __str__(self):
        return f"{self.title} - {self.patient.get_full_name()}"


class InventoryItem(models.Model):
    name = models.CharField(max_length=200)
    category = models.CharField(max_length=100)
    quantity = models.IntegerField(default=0)
    min_stock = models.IntegerField(default=10)
    supplier = models.CharField(max_length=200, blank=True)
    cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    @property
    def is_low_stock(self):
        return self.quantity <= self.min_stock


class Billing(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('paid', 'Paid'),
        ('cancelled', 'Cancelled'),
    )
    patient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='billings')
    appointment = models.ForeignKey(Appointment, on_delete=models.SET_NULL, null=True, blank=True)
    clinic = models.ForeignKey('ClinicLocation', on_delete=models.SET_NULL, null=True, blank=True, related_name='billings', help_text="Clinic where this billing was created")
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    description = models.TextField()
    soa_file = models.FileField(upload_to='billing/', null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    paid = models.BooleanField(default=False)  # Keep for backward compatibility
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_billings')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        # Auto-sync paid field with status
        self.paid = (self.status == 'paid')
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.patient.get_full_name()} - PHP {self.amount}"


class ClinicLocation(models.Model):
    name = models.CharField(max_length=200)
    address = models.TextField()
    phone = models.CharField(max_length=20)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)

    def __str__(self):
        return self.name


class TreatmentPlan(models.Model):
    patient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='treatment_plans')
    title = models.CharField(max_length=200)
    description = models.TextField()
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=[
        ('planned', 'Planned'),
        ('ongoing', 'Ongoing'),
        ('completed', 'Completed'),
    ], default='planned')
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_plans')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} - {self.patient.get_full_name()}"


class TeethImage(models.Model):
    """Model for storing patient teeth images"""
    IMAGE_TYPE_CHOICES = [
        ('xray', 'X-Ray'),
        ('intraoral', 'Intraoral'),
        ('extraoral', 'Extraoral'),
        ('panoramic', 'Panoramic'),
        ('dental', 'Dental Image'),
        ('other', 'Other'),
    ]
    
    patient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='teeth_images')
    image = models.ImageField(upload_to='teeth_images/')
    image_type = models.CharField(max_length=20, choices=IMAGE_TYPE_CHOICES, default='dental')
    notes = models.TextField(blank=True)
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='uploaded_teeth_images')
    is_latest = models.BooleanField(default=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    appointment = models.ForeignKey('Appointment', on_delete=models.SET_NULL, null=True, blank=True, related_name='teeth_images')

    class Meta:
        ordering = ['-uploaded_at']
        verbose_name = 'Teeth Image'
        verbose_name_plural = 'Teeth Images'

    def save(self, *args, **kwargs):
        # Mark all other patient images as not latest BEFORE saving this one
        # to avoid the new image appearing in the wrong position
        if self.is_latest and not self.pk:
            # Only update if this is a new record (no primary key yet)
            TeethImage.objects.filter(patient=self.patient, is_latest=True).update(is_latest=False)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Teeth Image - {self.patient.get_full_name()} - {self.uploaded_at.date()}"


class StaffAvailability(models.Model):
    """Weekly availability schedule for staff and owner"""
    DAYS_OF_WEEK = (
        (0, 'Sunday'),
        (1, 'Monday'),
        (2, 'Tuesday'),
        (3, 'Wednesday'),
        (4, 'Thursday'),
        (5, 'Friday'),
        (6, 'Saturday'),
    )
    
    staff = models.ForeignKey(User, on_delete=models.CASCADE, related_name='availability_schedule')
    day_of_week = models.IntegerField(choices=DAYS_OF_WEEK)
    is_available = models.BooleanField(default=True)
    start_time = models.TimeField(default='09:00:00')
    end_time = models.TimeField(default='17:00:00')
    clinics = models.ManyToManyField('ClinicLocation', related_name='staff_availabilities', blank=True, help_text="Clinics where this availability applies")
    apply_to_all_clinics = models.BooleanField(default=True, help_text="If True, this availability applies to all clinics")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['staff', 'day_of_week']
        ordering = ['day_of_week']
        verbose_name = 'Staff Availability'
        verbose_name_plural = 'Staff Availabilities'

    def __str__(self):
        available = "Available" if self.is_available else "Not Available"
        return f"{self.staff.get_full_name()} - {self.get_day_of_week_display()} - {available}"


class DentistAvailability(models.Model):
    """Date-specific availability for dentists and owner (calendar-based)"""
    dentist = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='date_availability',
        limit_choices_to={'role__in': ['dentist', ''], 'user_type__in': ['staff', 'owner']}
    )
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    is_available = models.BooleanField(default=True)
    clinic = models.ForeignKey('ClinicLocation', on_delete=models.CASCADE, null=True, blank=True, related_name='dentist_availabilities', help_text="Clinic where this availability applies. Null means all clinics.")
    apply_to_all_clinics = models.BooleanField(default=True, help_text="If True, this availability applies to all clinics")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        # Changed unique constraint to allow per-clinic availability
        unique_together = ['dentist', 'date', 'clinic']
        ordering = ['date', 'start_time']
        verbose_name = 'Dentist Date Availability'
        verbose_name_plural = 'Dentist Date Availabilities'
        indexes = [
            models.Index(fields=['dentist', 'date']),
            models.Index(fields=['date']),
            models.Index(fields=['clinic', 'date']),
        ]

    def __str__(self):
        clinic_str = f" at {self.clinic.name}" if self.clinic else " (all clinics)"
        return f"{self.dentist.get_full_name()} - {self.date} ({self.start_time} - {self.end_time}){clinic_str}"

    def clean(self):
        from django.core.exceptions import ValidationError
        # Ensure end_time is after start_time
        if self.end_time <= self.start_time:
            raise ValidationError('End time must be after start time')
        
        # Ensure dentist is actually a dentist or owner
        if self.dentist.user_type not in ['staff', 'owner']:
            raise ValidationError('Availability can only be set for staff or owner')
        if self.dentist.user_type == 'staff' and self.dentist.role != 'dentist':
            raise ValidationError('Availability can only be set for dentists')


class BlockedTimeSlot(models.Model):
    """Time slots blocked by staff to prevent patient bookings"""
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    reason = models.CharField(max_length=200, blank=True, help_text="Optional reason for blocking")
    clinic = models.ForeignKey('ClinicLocation', on_delete=models.CASCADE, null=True, blank=True, related_name='blocked_time_slots', help_text="Clinic where this block applies. Null means all clinics.")
    apply_to_all_clinics = models.BooleanField(default=True, help_text="If True, this block applies to all clinics")
    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='blocked_slots',
        limit_choices_to={'user_type__in': ['staff', 'owner']}
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['date', 'start_time']
        verbose_name = 'Blocked Time Slot'
        verbose_name_plural = 'Blocked Time Slots'
        indexes = [
            models.Index(fields=['date']),
            models.Index(fields=['date', 'start_time', 'end_time']),
            models.Index(fields=['clinic', 'date']),
        ]

    def __str__(self):
        clinic_str = f" at {self.clinic.name}" if self.clinic else " (all clinics)"
        return f"Blocked: {self.date} ({self.start_time} - {self.end_time}){clinic_str}"

    def clean(self):
        from django.core.exceptions import ValidationError
        # Ensure end_time is after start_time
        if self.end_time <= self.start_time:
            raise ValidationError('End time must be after start time')


class AppointmentNotification(models.Model):
    """Notifications for staff and owner about appointment activities and inventory alerts"""
    NOTIFICATION_TYPES = (
        ('new_appointment', 'New Appointment'),
        ('reschedule_request', 'Reschedule Request'),
        ('cancel_request', 'Cancel Request'),
        ('appointment_cancelled', 'Appointment Cancelled'),
        ('appointment_confirmed', 'Appointment Confirmed'),
        ('reschedule_approved', 'Reschedule Approved'),
        ('reschedule_rejected', 'Reschedule Rejected'),
        ('cancel_approved', 'Cancellation Approved'),
        ('cancel_rejected', 'Cancellation Rejected'),
        ('inventory_alert', 'Inventory Low Stock Alert'),
    )
    
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='appointment_notifications')
    appointment = models.ForeignKey('Appointment', on_delete=models.SET_NULL, null=True, blank=True, related_name='appointment_notifications')
    notification_type = models.CharField(max_length=30, choices=NOTIFICATION_TYPES)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Appointment Notification'
        verbose_name_plural = 'Appointment Notifications'

    def __str__(self):
        return f"{self.recipient.get_full_name()} - {self.get_notification_type_display()}"


# Keep old model for backward compatibility during migration
class DentistNotification(models.Model):
    """Notifications for dentists about new appointments"""
    NOTIFICATION_TYPES = (
        ('new_appointment', 'New Appointment'),
        ('reschedule_request', 'Reschedule Request'),
        ('cancel_request', 'Cancel Request'),
    )
    
    dentist = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    appointment = models.ForeignKey('Appointment', on_delete=models.CASCADE, related_name='notifications')
    notification_type = models.CharField(max_length=30, choices=NOTIFICATION_TYPES)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Dentist Notification'
        verbose_name_plural = 'Dentist Notifications'

    def __str__(self):
        return f"{self.dentist.get_full_name()} - {self.get_notification_type_display()}"


class PasswordResetToken(models.Model):
    """Password reset tokens for all users"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='password_reset_tokens')
    token = models.CharField(max_length=100, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Password Reset Token'
        verbose_name_plural = 'Password Reset Tokens'

    def is_valid(self):
        """Check if token is still valid"""
        return not self.is_used and timezone.now() < self.expires_at

    def __str__(self):
        return f"Password Reset - {self.user.email} - {self.created_at.date()}"


class PatientIntakeForm(models.Model):
    """Patient intake form data"""
    patient = models.OneToOneField(User, on_delete=models.CASCADE, related_name='intake_form')
    
    # Medical History
    allergies = models.TextField(blank=True, help_text="List any allergies")
    current_medications = models.TextField(blank=True, help_text="List current medications")
    medical_conditions = models.TextField(blank=True, help_text="List any medical conditions")
    previous_dental_treatments = models.TextField(blank=True)
    
    # Emergency Contact
    emergency_contact_name = models.CharField(max_length=200, blank=True)
    emergency_contact_phone = models.CharField(max_length=20, blank=True)
    emergency_contact_relationship = models.CharField(max_length=100, blank=True)
    
    # Insurance Information
    insurance_provider = models.CharField(max_length=200, blank=True)
    insurance_policy_number = models.CharField(max_length=100, blank=True)
    
    # Additional Information
    dental_concerns = models.TextField(blank=True, help_text="Current dental concerns")
    preferred_dentist = models.CharField(max_length=200, blank=True)
    
    # Metadata
    filled_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='filled_intake_forms')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Patient Intake Form'
        verbose_name_plural = 'Patient Intake Forms'

    def __str__(self):
        return f"Intake Form - {self.patient.get_full_name()}"


class FileAttachment(models.Model):
    """File attachments for patients (X-rays, documents, etc.)"""
    FILE_TYPES = (
        ('xray', 'X-Ray'),
        ('photo', 'Photo'),
        ('document', 'Document'),
        ('report', 'Report'),
        ('other', 'Other'),
    )
    
    patient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='file_attachments')
    file = models.FileField(upload_to='patient_files/%Y/%m/%d/')
    file_type = models.CharField(max_length=20, choices=FILE_TYPES, default='document')
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    file_size = models.IntegerField(default=0, help_text="File size in bytes")
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='uploaded_files')
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-uploaded_at']
        verbose_name = 'File Attachment'
        verbose_name_plural = 'File Attachments'

    def __str__(self):
        return f"{self.title} - {self.patient.get_full_name()}"
    
    def get_file_extension(self):
        """Get file extension"""
        import os
        return os.path.splitext(self.file.name)[1].lower()


class ClinicalNote(models.Model):
    """Clinical notes for patients"""
    patient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='clinical_notes')
    appointment = models.ForeignKey(Appointment, on_delete=models.SET_NULL, null=True, blank=True, related_name='clinical_notes')
    content = models.TextField()
    author = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='authored_notes')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Clinical Note'
        verbose_name_plural = 'Clinical Notes'

    def __str__(self):
        return f"Note - {self.patient.get_full_name()} - {self.created_at.date()}"


class TreatmentAssignment(models.Model):
    """Treatment assignments for patients"""
    STATUS_CHOICES = (
        ('scheduled', 'Scheduled'),
        ('ongoing', 'Ongoing'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    )
    
    patient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='treatment_assignments')
    treatment_plan = models.ForeignKey(TreatmentPlan, on_delete=models.SET_NULL, null=True, blank=True, related_name='assignments')
    treatment_name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='scheduled')
    assigned_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='assigned_treatments')
    assigned_dentist = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='dentist_treatments')
    date_assigned = models.DateTimeField(auto_now_add=True)
    scheduled_date = models.DateField(null=True, blank=True)
    completed_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-date_assigned']
        verbose_name = 'Treatment Assignment'
        verbose_name_plural = 'Treatment Assignments'

    def __str__(self):
        return f"{self.treatment_name} - {self.patient.get_full_name()} - {self.status}"
