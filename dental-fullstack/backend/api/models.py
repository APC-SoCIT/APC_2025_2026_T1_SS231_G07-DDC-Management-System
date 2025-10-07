from django.db import models
class Patient(models.Model):
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField(blank=True,null=True)
    phone = models.CharField(max_length=50, blank=True, null=True)
    def __str__(self): return f"{self.first_name} {self.last_name}"
class Dentist(models.Model):
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    specialization = models.CharField(max_length=200, blank=True, null=True)
    def __str__(self): return f"Dr. {self.first_name} {self.last_name}"
class Appointment(models.Model):
    patient = models.ForeignKey(Patient, related_name='appointments', on_delete=models.CASCADE)
    dentist = models.ForeignKey(Dentist, related_name='appointments', on_delete=models.SET_NULL, null=True, blank=True)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=50, default='scheduled')
    def __str__(self): return f"Appointment({self.patient}, {self.start_time})"
