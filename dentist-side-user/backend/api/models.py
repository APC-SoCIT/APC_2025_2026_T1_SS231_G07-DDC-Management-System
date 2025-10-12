from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator
from decimal import Decimal


class Patient(models.Model):
    """Patient model for storing patient information"""
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


class Appointment(models.Model):
    """Appointment model for managing patient appointments"""
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
            last_appointment = Appointment.objects.all().order_by('id').last()
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
