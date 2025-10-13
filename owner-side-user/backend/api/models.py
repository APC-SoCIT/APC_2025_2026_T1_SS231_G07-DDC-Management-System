from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal


class PatientMedicalHistory(models.Model):
    """Medical history for patients"""
    allergies = models.TextField(null=True, blank=True)
    medications = models.TextField(null=True, blank=True)
    conditions = models.TextField(null=True, blank=True)
    last_updated = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'patient_medical_history'
        verbose_name = 'Patient Medical History'
        verbose_name_plural = 'Patient Medical Histories'

    def __str__(self):
        return f"Medical History {self.id}"


class User(models.Model):
    """Custom User model matching the PostgreSQL schema from hey.md"""
    f_name = models.CharField(max_length=45, null=True, blank=True)
    l_name = models.CharField(max_length=45, null=True, blank=True)
    email = models.CharField(max_length=45, unique=True)
    password_encrypted = models.CharField(max_length=255, null=True, blank=True)
    date_of_creation = models.DateTimeField(null=True, blank=True)
    last_login = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(null=True, blank=True, default=True)
    
    # Additional patient fields that the frontend expects
    date_of_birth = models.DateField(null=True, blank=True)
    age = models.IntegerField(null=True, blank=True) 
    contact = models.CharField(max_length=20, null=True, blank=True)
    address = models.TextField(null=True, blank=True)
    
    patient_medical_history = models.ForeignKey(
        PatientMedicalHistory, 
        on_delete=models.CASCADE
    )

    class Meta:
        db_table = 'user'

    def __str__(self):
        return f"{self.f_name or ''} {self.l_name or ''}".strip() or self.email

    def get_full_name(self):
        """Return full name"""
        return f"{self.f_name or ''} {self.l_name or ''}".strip()

    def get_initials(self):
        """Generate initials from user name"""
        initials = ''
        if self.f_name:
            initials += self.f_name[0].upper()
        if self.l_name:
            initials += self.l_name[0].upper()
        return initials or self.email[0].upper()


class Service(models.Model):
    """Services offered by the clinic - matching hey.md schema"""
    SERVICE_CATEGORIES = [
        ('Preventive', 'Preventive'),
        ('Restorative', 'Restorative'),
        ('Cosmetic', 'Cosmetic'),
        ('Orthodontics', 'Orthodontics'),
    ]
    
    servicename = models.TextField(null=True, blank=True)
    servicedesc = models.TextField(null=True, blank=True)
    category = models.CharField(max_length=20, choices=SERVICE_CATEGORIES, null=True, blank=True)
    standard_duration_mins = models.IntegerField(null=True, blank=True)
    standard_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    class Meta:
        db_table = 'service'

    def __str__(self):
        return self.servicename or f"Service {self.id}"


class Invoice(models.Model):
    """Invoice model matching PostgreSQL schema from hey.md"""
    invoice_date = models.DateField(null=True, blank=True)
    due_date = models.DateField(null=True, blank=True)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    insurance_billed_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    patient_due_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    status = models.CharField(max_length=45, null=True, blank=True)

    class Meta:
        db_table = 'invoices'

    def __str__(self):
        return f"Invoice {self.id} - {self.total_amount or 'N/A'}"


class Appointment(models.Model):
    """Appointment model matching PostgreSQL schema from hey.md"""
    APPOINTMENT_STATUSES = [
        ('Scheduled', 'Scheduled'),
        ('Completed', 'Completed'),
        ('Cancelled', 'Cancelled'),
        ('No-Show', 'No-Show'),
    ]
    
    appointment_start_time = models.DateTimeField(null=True, blank=True)
    appointment_end_time = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=APPOINTMENT_STATUSES, default='Scheduled')
    reason_for_visit = models.TextField(null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(null=True, blank=True)
    patient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='patient_appointments')
    staff = models.ForeignKey(User, on_delete=models.CASCADE, related_name='staff_appointments', null=True, blank=True)
    invoice = models.ForeignKey('Invoice', on_delete=models.CASCADE, null=True, blank=True)
    services = models.ManyToManyField(Service, through='AppointmentService')

    class Meta:
        db_table = 'appointment'
        ordering = ['-created_at']

    def __str__(self):
        return f"Appointment {self.id} - {self.patient.get_full_name() if self.patient else 'N/A'}"

    @property
    def date(self):
        """Extract date from appointment_start_time for backward compatibility"""
        return self.appointment_start_time.date() if self.appointment_start_time else None

    @property
    def time(self):
        """Extract time from appointment_start_time for backward compatibility"""
        return self.appointment_start_time.time() if self.appointment_start_time else None

    @property
    def doctor(self):
        """Return staff name for backward compatibility"""
        return self.staff.get_full_name() if self.staff else None

    @property
    def treatment(self):
        """Return reason_for_visit for backward compatibility"""
        return self.reason_for_visit


class AppointmentService(models.Model):
    """Junction table for appointment and services - matching hey.md schema"""
    appointment = models.ForeignKey(Appointment, on_delete=models.CASCADE)
    service = models.ForeignKey(Service, on_delete=models.CASCADE)

    class Meta:
        db_table = 'appointment_has_service'

    def __str__(self):
        return f"{self.appointment} - {self.service}"


class InsuranceDetail(models.Model):
    """Insurance details for users - matching hey.md schema"""
    provider_name = models.CharField(max_length=45)
    policy_number = models.CharField(max_length=45)
    group_number = models.CharField(max_length=45, null=True, blank=True)
    is_primary = models.BooleanField(null=True, blank=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE)

    class Meta:
        db_table = 'insurance_detail'

    def __str__(self):
        return f"{self.provider_name} - {self.user.get_full_name()}"


class TreatmentRecord(models.Model):
    """Treatment records"""
    diagnosis = models.TextField(null=True, blank=True)
    treatment_performed = models.TextField(null=True, blank=True)
    tooth_numbers = models.CharField(max_length=45, null=True, blank=True)
    prescriptions = models.TextField(null=True, blank=True)
    follow_up_notes = models.TextField(null=True, blank=True)
    record_date = models.DateTimeField(null=True, blank=True)
    appointment = models.ForeignKey(Appointment, on_delete=models.CASCADE)

    class Meta:
        db_table = 'treatment_records'

    def __str__(self):
        return f"Treatment {self.id} - {self.appointment}"


class Payment(models.Model):
    """Payment model - matching hey.md schema"""
    payment_date = models.DateTimeField(null=True, blank=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    payment_method = models.CharField(max_length=45, null=True, blank=True)
    transaction_id = models.CharField(max_length=45, null=True, blank=True)
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE)

    class Meta:
        db_table = 'payment'

    def __str__(self):
        return f"Payment {self.id} - {self.amount or 'N/A'}"


class Role(models.Model):
    """User roles - matching hey.md schema"""
    title = models.CharField(max_length=45, null=True, blank=True)
    description = models.CharField(max_length=45, null=True, blank=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE)

    class Meta:
        db_table = 'role'

    def __str__(self):
        return f"{self.title} - {self.user.get_full_name()}"


# ============================================================
# LEGACY MODELS - Keep for backward compatibility during migration
# ============================================================


class Patient(models.Model):
    """LEGACY: Patient model for storing patient information - DEPRECATED"""
    patient_id = models.CharField(max_length=20, unique=True, editable=False)
    name = models.CharField(max_length=200)
    email = models.EmailField(unique=True)
    date_of_birth = models.DateField(null=True, blank=True)
    age = models.IntegerField(validators=[MinValueValidator(0)])
    contact = models.CharField(max_length=20)
    address = models.TextField(blank=True)
    last_visit = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.patient_id} - {self.name}"

    def save(self, *args, **kwargs):
        if not self.patient_id:
            # Generate patient ID in format DD - 00001
            last_patient = Patient.objects.all().order_by('id').last()
            if last_patient:
                last_id = int(last_patient.patient_id.split(' - ')[1])
                new_id = last_id + 1
            else:
                new_id = 1
            self.patient_id = f"DD - {new_id:05d}"
        super().save(*args, **kwargs)

    def get_initials(self):
        """Generate initials from patient name"""
        return ''.join([word[0].upper() for word in self.name.split()])


class LegacyAppointment(models.Model):
    """LEGACY: Appointment model - DEPRECATED"""
    STATUS_CHOICES = [
        ('scheduled', 'Scheduled'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
        ('pending', 'Pending'),
    ]

    appointment_id = models.CharField(max_length=20, unique=True, editable=False)
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='appointments')
    date = models.DateField()
    time = models.TimeField()
    doctor = models.CharField(max_length=200)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='scheduled')
    treatment = models.CharField(max_length=200, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date', '-time']

    def __str__(self):
        return f"{self.appointment_id} - {self.patient.name} on {self.date}"

    def save(self, *args, **kwargs):
        if not self.appointment_id:
            # Generate appointment ID in format DD - 00001
            last_appointment = LegacyAppointment.objects.all().order_by('id').last()
            if last_appointment:
                last_id = int(last_appointment.appointment_id.split(' - ')[1])
                new_id = last_id + 1
            else:
                new_id = 1
            self.appointment_id = f"DD - {new_id:05d}"
        super().save(*args, **kwargs)


class InventoryItem(models.Model):
    """Inventory model for managing dental supplies and equipment"""
    CATEGORY_CHOICES = [
        ('anesthetics', 'Anesthetics'),
        ('restorative', 'Restorative Materials'),
        ('ppe', 'PPE'),
        ('imaging', 'Imaging'),
        ('other', 'Other'),
    ]

    UNIT_CHOICES = [
        ('box', 'Box'),
        ('piece', 'Piece'),
        ('bottle', 'Bottle'),
        ('pack', 'Pack'),
    ]

    name = models.CharField(max_length=200)
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES)
    quantity = models.IntegerField(validators=[MinValueValidator(0)])
    min_stock = models.IntegerField(validators=[MinValueValidator(0)])
    unit = models.CharField(max_length=20, choices=UNIT_CHOICES, default='piece')
    supplier = models.CharField(max_length=200)
    cost_per_unit = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.00'))])
    notes = models.TextField(blank=True)
    last_updated = models.DateField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.name} - {self.quantity} {self.unit}"

    @property
    def status(self):
        """Calculate stock status based on quantity"""
        if self.quantity < 10:
            return 'Critical'
        elif self.quantity < self.min_stock:
            return 'Low Stock'
        else:
            return 'In Stock'


class BillingRecord(models.Model):
    """Billing model for managing patient billing information"""
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='billing_records')
    last_payment = models.DateField()
    amount = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.00'))])
    payment_method = models.CharField(max_length=50, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-last_payment']

    def __str__(self):
        return f"{self.patient.name} - {self.last_payment}"


class FinancialRecord(models.Model):
    """Financial model for tracking revenue and expenses"""
    RECORD_TYPE_CHOICES = [
        ('revenue', 'Revenue'),
        ('expense', 'Expense'),
    ]

    record_type = models.CharField(max_length=20, choices=RECORD_TYPE_CHOICES)
    month = models.CharField(max_length=20)
    year = models.IntegerField()
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['year', 'month']
        unique_together = ['record_type', 'month', 'year']

    def __str__(self):
        return f"{self.record_type.title()} - {self.month} {self.year}: ${self.amount}"
