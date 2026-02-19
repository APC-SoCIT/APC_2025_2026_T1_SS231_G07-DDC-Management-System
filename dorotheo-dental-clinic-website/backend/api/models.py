from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.exceptions import ValidationError
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
    user_type = models.CharField(max_length=20, choices=USER_TYPES, default='patient', db_index=True)
    role = models.CharField(max_length=20, choices=STAFF_ROLES, blank=True, default='')
    phone = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    birthday = models.DateField(null=True, blank=True)
    age = models.IntegerField(null=True, blank=True)
    profile_picture = models.ImageField(upload_to='profiles/', null=True, blank=True)
    is_active_patient = models.BooleanField(default=True, db_index=True)
    is_archived = models.BooleanField(default=False, db_index=True)  # For archiving patients
    assigned_clinic = models.ForeignKey('ClinicLocation', on_delete=models.SET_NULL, null=True, blank=True, related_name='staff_members', help_text="Clinic where staff/dentist is currently assigned")
    created_at = models.DateTimeField(auto_now_add=True)

    # Override email to make it unique and required
    email = models.EmailField(unique=True, blank=False)

    class Meta:
        indexes = [
            # Composite index for filtering patients by archive status
            models.Index(fields=['user_type', 'is_archived'], name='user_type_archived_idx'),
            # Composite index for filtering active patients
            models.Index(fields=['user_type', 'is_active_patient'], name='user_type_active_idx'),
            # Index for sorting by creation date
            models.Index(fields=['-created_at'], name='user_created_at_idx'),
        ]

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


class AuditLog(models.Model):
    """
    HIPAA-compliant audit log model for tracking all access and modifications to patient data.
    
    This model is append-only - no updates or deletes are allowed after creation.
    All patient record access, modifications, and authentication events must be logged here.
    
    Required by HIPAA Security Rule 45 CFR § 164.312(b) - Audit Controls.
    """
    
    ACTION_CHOICES = [
        ('CREATE', 'Create'),
        ('READ', 'Read'),
        ('UPDATE', 'Update'),
        ('DELETE', 'Delete'),
        ('LOGIN_SUCCESS', 'Login Success'),
        ('LOGIN_FAILED', 'Login Failed'),
        ('LOGOUT', 'Logout'),
        ('EXPORT', 'Export'),
        ('ACCESS', 'Access'),
    ]
    
    log_id = models.AutoField(primary_key=True)
    actor = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='audit_logs_created',
        help_text="User who performed the action. Null for failed login attempts."
    )
    action_type = models.CharField(
        max_length=20,
        choices=ACTION_CHOICES,
        db_index=True,
        help_text="Type of action performed"
    )
    target_table = models.CharField(
        max_length=100,
        db_index=True,
        help_text="Database table/model name affected by the action"
    )
    target_record_id = models.IntegerField(
        null=True,
        blank=True,
        help_text="ID of the specific record affected"
    )
    patient_id = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='audit_logs_about',
        limit_choices_to={'user_type': 'patient'},
        help_text="Patient whose data was accessed/modified (if applicable)"
    )
    timestamp = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        help_text="When the action occurred"
    )
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        help_text="IP address from which the action was performed"
    )
    user_agent = models.CharField(
        max_length=500,
        blank=True,
        default='',
        help_text="Browser/client user agent string"
    )
    changes = models.JSONField(
        null=True,
        blank=True,
        help_text="Before/after values for modifications. MUST NOT contain passwords or sensitive auth data."
    )
    reason = models.TextField(
        blank=True,
        default='',
        help_text="Optional justification for the action"
    )
    
    class Meta:
        db_table = 'audit_logs'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['-timestamp'], name='audit_timestamp_idx'),
            models.Index(fields=['actor', '-timestamp'], name='audit_actor_time_idx'),
            models.Index(fields=['patient_id', '-timestamp'], name='audit_patient_time_idx'),
            models.Index(fields=['action_type', '-timestamp'], name='audit_action_time_idx'),
            models.Index(fields=['target_table', 'target_record_id'], name='audit_target_idx'),
        ]
        verbose_name = 'Audit Log'
        verbose_name_plural = 'Audit Logs'
    
    def __str__(self):
        if self.actor:
            # Use full name if available, otherwise use username
            actor_name = self.actor.get_full_name() or self.actor.username
        else:
            actor_name = 'Anonymous'
        return f"{actor_name} performed {self.action_type} on {self.target_table}:{self.target_record_id} at {self.timestamp}"
    
    def save(self, *args, **kwargs):
        """
        Override save to prevent updates to existing audit logs.
        Audit logs are append-only for HIPAA compliance.
        """
        if self.pk is not None:
            raise ValidationError(
                "Audit logs cannot be modified after creation. "
                "This is required for HIPAA compliance and audit trail integrity."
            )
        super().save(*args, **kwargs)
    
    def delete(self, *args, **kwargs):
        """
        Override delete to prevent deletion of audit logs.
        Audit logs must be retained for HIPAA compliance (minimum 6 years).
        """
        raise ValidationError(
            "Audit logs cannot be deleted. "
            "HIPAA requires audit logs to be retained for at least 6 years. "
            "Use archive/retention policies instead of deletion."
        )


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
    patient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='appointments', db_index=True)
    dentist = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='dentist_appointments', db_index=True)
    service = models.ForeignKey(Service, on_delete=models.SET_NULL, null=True)
    clinic = models.ForeignKey('ClinicLocation', on_delete=models.CASCADE, related_name='appointments', null=True, blank=True, help_text="Clinic where appointment occurs")
    date = models.DateField()
    time = models.TimeField()
    status = models.CharField(max_length=25, choices=STATUS_CHOICES, default='confirmed', db_index=True)
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
    
    # Track who created this appointment (patient, staff, or owner)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_appointments', help_text="User who created this appointment")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date', '-time']
        indexes = [
            models.Index(fields=['clinic', 'date']),
            models.Index(fields=['clinic', 'status']),
            models.Index(fields=['date', 'time']),
            # Additional indexes for performance optimization
            models.Index(fields=['patient', 'status', '-date'], name='apt_patient_status_date_idx'),
            models.Index(fields=['status', '-completed_at'], name='apt_completed_at_idx'),
            models.Index(fields=['dentist', 'date'], name='apt_dentist_date_idx'),
        ]

    def __str__(self):
        return f"{self.patient.get_full_name()} - {self.date} {self.time}"


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
    unit_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="Cost per unit")
    cost = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="Total cost (unit_cost × quantity)")
    clinic = models.ForeignKey('ClinicLocation', on_delete=models.CASCADE, null=True, blank=True, related_name='inventory_items', help_text="Clinic where this item is stored")
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        # Auto-calculate total cost
        self.cost = self.unit_cost * self.quantity
        super().save(*args, **kwargs)

    def __str__(self):
        clinic_name = self.clinic.name if self.clinic else "No Clinic"
        return f"{self.name} - {clinic_name}"

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
        ('inventory_restock', 'Inventory Restocked'),
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


class Invoice(models.Model):
    """Invoice model for patient billing with itemized services and inventory items"""
    STATUS_CHOICES = (
        ('draft', 'Draft'),
        ('sent', 'Sent'),
        ('paid', 'Paid'),
        ('overdue', 'Overdue'),
        ('cancelled', 'Cancelled'),
    )
    
    # Core Fields
    invoice_number = models.CharField(max_length=20, unique=True, db_index=True, help_text="Format: INV-YYYY-MM-NNNN")
    reference_number = models.CharField(max_length=20, unique=True, db_index=True, help_text="Format: REF-NNNN")
    
    # Relationships
    appointment = models.OneToOneField(Appointment, on_delete=models.CASCADE, related_name='invoice')
    patient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='invoices', db_index=True)
    clinic = models.ForeignKey(ClinicLocation, on_delete=models.SET_NULL, null=True, related_name='invoices')
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_invoices')
    
    # Financial Details
    service_charge = models.DecimalField(max_digits=10, decimal_places=2, help_text="Charge for the service performed")
    items_subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="Total cost of inventory items used")
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, help_text="Service charge + items subtotal")
    interest_rate = models.DecimalField(max_digits=5, decimal_places=2, default=10.00, help_text="Interest rate for late payments (per annum, e.g., 10.00 for 10%)")
    interest_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="Interest charged for late payments (0 on initial invoice)")
    total_due = models.DecimalField(max_digits=10, decimal_places=2, help_text="Total amount due (subtotal + interest if overdue)")
    amount_paid = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="Amount paid by patient")
    balance = models.DecimalField(max_digits=10, decimal_places=2, help_text="Remaining balance (total_due - amount_paid)")
    
    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft', db_index=True)
    
    # Dates
    invoice_date = models.DateField()
    due_date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    
    # Notes and Payment Info
    notes = models.TextField(blank=True)
    payment_instructions = models.TextField(default="Please pay your overdue amount within 7 days")
    bank_account = models.CharField(max_length=50, default="12345678910")
    
    # PDF File
    pdf_file = models.FileField(upload_to='invoices/', null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Invoice'
        verbose_name_plural = 'Invoices'
        indexes = [
            models.Index(fields=['patient', '-created_at'], name='inv_patient_created_idx'),
            models.Index(fields=['status', '-due_date'], name='inv_status_due_idx'),
            models.Index(fields=['clinic', '-created_at'], name='inv_clinic_created_idx'),
        ]

    def __str__(self):
        return f"{self.invoice_number} - {self.patient.get_full_name()} - PHP {self.total_due}"
    
    def calculate_amount_paid_from_splits(self):
        """Calculate total amount paid from payment splits"""
        from decimal import Decimal
        return self.payment_splits.filter(
            is_voided=False,
            payment__is_voided=False
        ).aggregate(total=models.Sum('amount'))['total'] or Decimal('0')
    
    def update_payment_status(self):
        """Update invoice payment status based on payment splits"""
        self.amount_paid = self.calculate_amount_paid_from_splits()
        self.balance = self.total_due - self.amount_paid
        
        # Update status
        if self.amount_paid >= self.total_due and self.status != 'cancelled':
            self.status = 'paid'
            if not self.paid_at:
                self.paid_at = timezone.now()
        elif self.amount_paid > 0 and self.amount_paid < self.total_due:
            if self.status in ['draft', 'sent']:
                self.status = 'sent'  # Keep as sent if partially paid
        elif self.status == 'paid' and self.amount_paid < self.total_due:
            # If amount_paid decreases and no longer covers total, revert from paid
            self.status = 'sent'
            self.paid_at = None
        
        self.save()
    
    def save(self, *args, **kwargs):
        # Auto-calculate subtotal (service + items)
        self.subtotal = self.service_charge + self.items_subtotal
        
        # Interest is NOT charged on initial invoice creation
        # It may be added later for overdue payments
        # For new invoices, total_due = subtotal
        if not self.pk:  # New invoice
            self.interest_amount = 0
            self.total_due = self.subtotal
        
        # Auto-calculate balance
        self.balance = self.total_due - self.amount_paid
        
        # Auto-update status based on payment
        if self.amount_paid >= self.total_due and self.status != 'cancelled':
            self.status = 'paid'
            if not self.paid_at:
                self.paid_at = timezone.now()
        elif self.status == 'paid' and self.amount_paid < self.total_due:
            # If amount_paid decreases and no longer covers total, revert from paid
            self.status = 'sent'
            self.paid_at = None
        super().save(*args, **kwargs)


class InvoiceItem(models.Model):
    """Line items for an invoice (inventory items used in treatment)"""
    
    # Relationships
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='items')
    inventory_item = models.ForeignKey(InventoryItem, on_delete=models.SET_NULL, null=True, blank=True, help_text="Reference to original inventory item")
    
    # Item Details (copied from inventory for historical record)
    item_name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, help_text="Price per unit at time of invoice")
    total_price = models.DecimalField(max_digits=10, decimal_places=2, help_text="quantity × unit_price")
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['created_at']
        verbose_name = 'Invoice Item'
        verbose_name_plural = 'Invoice Items'

    def __str__(self):
        return f"{self.item_name} (x{self.quantity}) - {self.invoice.invoice_number}"
    
    def save(self, *args, **kwargs):
        # Auto-calculate total_price
        self.total_price = self.quantity * self.unit_price
        super().save(*args, **kwargs)


class PatientBalance(models.Model):
    """Track cumulative balance for each patient across all invoices"""
    
    patient = models.OneToOneField(User, on_delete=models.CASCADE, related_name='balance_record')
    total_invoiced = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="Total amount from all invoices")
    total_paid = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="Total amount paid by patient")
    current_balance = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="Outstanding balance (invoiced - paid)")
    last_invoice_date = models.DateField(null=True, blank=True)
    last_payment_date = models.DateField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Patient Balance'
        verbose_name_plural = 'Patient Balances'

    def __str__(self):
        return f"{self.patient.get_full_name()} - Balance: PHP {self.current_balance}"


class Payment(models.Model):
    """Record of a payment made by a patient (cash, check, bank transfer, etc.)"""
    PAYMENT_METHOD_CHOICES = (
        ('cash', 'Cash'),
        ('check', 'Check'),
        ('bank_transfer', 'Bank Transfer'),
        ('credit_card', 'Credit Card (Manual)'),
        ('debit_card', 'Debit Card (Manual)'),
        ('gcash', 'GCash'),
        ('paymaya', 'PayMaya'),
        ('other', 'Other'),
    )
    
    # Core Fields
    payment_number = models.CharField(max_length=20, unique=True, db_index=True, help_text="Format: PAY-YYYY-MM-NNNN")
    patient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='payments', db_index=True)
    clinic = models.ForeignKey(ClinicLocation, on_delete=models.SET_NULL, null=True, related_name='payments')
    
    # Payment Details
    amount = models.DecimalField(max_digits=10, decimal_places=2, help_text="Total payment amount received")
    payment_date = models.DateField(help_text="Date payment was received")
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES, default='cash')
    
    # Optional Payment Details
    check_number = models.CharField(max_length=50, blank=True, help_text="Check number if payment method is check")
    bank_name = models.CharField(max_length=100, blank=True, help_text="Bank name for checks or transfers")
    reference_number = models.CharField(max_length=100, blank=True, help_text="Transaction/reference number for electronic payments")
    notes = models.TextField(blank=True, help_text="Additional notes about the payment")
    
    # Tracking
    recorded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='recorded_payments')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Voiding/Cancellation
    is_voided = models.BooleanField(default=False, help_text="Mark payment as voided (cancelled)")
    voided_at = models.DateTimeField(null=True, blank=True)
    voided_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='voided_payments')
    void_reason = models.TextField(blank=True, help_text="Reason for voiding the payment")

    class Meta:
        ordering = ['-payment_date', '-created_at']
        verbose_name = 'Payment'
        verbose_name_plural = 'Payments'
        indexes = [
            models.Index(fields=['patient', '-payment_date'], name='pay_patient_date_idx'),
            models.Index(fields=['clinic', '-payment_date'], name='pay_clinic_date_idx'),
            models.Index(fields=['-payment_date'], name='pay_date_idx'),
        ]

    def __str__(self):
        return f"{self.payment_number} - {self.patient.get_full_name()} - PHP {self.amount}"
    
    def get_allocated_amount(self):
        """Calculate total amount allocated to invoices"""
        from decimal import Decimal
        return self.splits.filter(is_voided=False).aggregate(
            total=models.Sum('amount')
        )['total'] or Decimal('0')
    
    def get_unallocated_amount(self):
        """Calculate amount not yet allocated to any invoice"""
        from decimal import Decimal
        if self.is_voided:
            return Decimal('0')
        return self.amount - self.get_allocated_amount()


class PaymentSplit(models.Model):
    """Allocation of a payment to a specific invoice"""
    
    # Relationships
    payment = models.ForeignKey(Payment, on_delete=models.CASCADE, related_name='splits')
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='payment_splits')
    
    # Allocation Details
    amount = models.DecimalField(max_digits=10, decimal_places=2, help_text="Amount of payment allocated to this invoice")
    provider = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='payment_splits', help_text="Dentist who performed the service (for revenue tracking)")
    
    # Tracking
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Voiding
    is_voided = models.BooleanField(default=False)
    voided_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['created_at']
        verbose_name = 'Payment Split'
        verbose_name_plural = 'Payment Splits'
        indexes = [
            models.Index(fields=['payment', 'invoice'], name='paysplit_pay_inv_idx'),
        ]

    def __str__(self):
        return f"{self.payment.payment_number} → {self.invoice.invoice_number} - PHP {self.amount}"
    
    def save(self, *args, **kwargs):
        # Validate split amount doesn't exceed payment amount
        if not self.is_voided:
            payment = self.payment
            other_splits_total = payment.splits.exclude(id=self.id).filter(
                is_voided=False
            ).aggregate(total=models.Sum('amount'))['total'] or 0
            
            if other_splits_total + self.amount > payment.amount:
                from django.core.exceptions import ValidationError
                raise ValidationError(
                    f"Total payment splits (PHP {other_splits_total + self.amount}) "
                    f"cannot exceed payment amount (PHP {payment.amount})"
                )
        
        super().save(*args, **kwargs)


# ===========================================================================
# PAGE CHUNK MODEL (for RAG – Page Index Retrieval Augmented Generation)
# ===========================================================================

class PageChunk(models.Model):
    """
    Stores indexed page content chunks with embeddings for RAG retrieval.
    Used by the AI chatbot to ground answers with page/site content.
    """
    page_id = models.CharField(max_length=255, db_index=True, help_text="Unique identifier for the source page")
    chunk_text = models.TextField(help_text="The text content of this chunk")
    embedding = models.JSONField(default=list, help_text="Embedding vector stored as JSON array of floats")
    page_title = models.CharField(max_length=500, blank=True, default='')
    section_title = models.CharField(max_length=500, blank=True, default='')
    source_url = models.URLField(max_length=1000, blank=True, default='')
    chunk_index = models.IntegerField(default=0, help_text="Order of this chunk within its page")
    token_count = models.IntegerField(default=0, help_text="Approximate token count of chunk_text")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['page_id', 'chunk_index']
        verbose_name = 'Page Chunk'
        verbose_name_plural = 'Page Chunks'
        indexes = [
            models.Index(fields=['page_id', 'chunk_index'], name='pagechunk_page_idx'),
            models.Index(fields=['created_at'], name='pagechunk_created_idx'),
        ]

    def __str__(self):
        return f"[{self.page_id}] {self.page_title} – chunk {self.chunk_index}"
