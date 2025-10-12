from django.shortcuts import render, redirect
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from django.views.decorators.http import require_http_methods
from .models import Appointment, Patient, Dentist, Treatment


def home(request):
    return render(request, 'core/home.html')


def appointment_list(request):
    appointments = Appointment.objects.select_related('patient', 'dentist', 'treatment').all()
    return render(request, 'core/appointment_list.html', {"appointments": appointments})


@require_http_methods(["GET", "POST"])
def appointment_create(request):
    if request.method == "POST":
        patient_id = request.POST.get('patient')
        dentist_id = request.POST.get('dentist')
        treatment_id = request.POST.get('treatment')
        start_time_str = request.POST.get('start_time')
        end_time_str = request.POST.get('end_time')
        notes = request.POST.get('notes', '')

        patient = Patient.objects.get(id=patient_id)
        dentist = Dentist.objects.get(id=dentist_id)
        treatment = Treatment.objects.filter(id=treatment_id).first() if treatment_id else None

        start_time = parse_datetime(start_time_str)
        end_time = parse_datetime(end_time_str)

        Appointment.objects.create(
            patient=patient,
            dentist=dentist,
            treatment=treatment,
            start_time=start_time,
            end_time=end_time,
            notes=notes,
        )
        return redirect('appointment_list')

    patients = Patient.objects.all()
    dentists = Dentist.objects.all()
    treatments = Treatment.objects.all()
    return render(request, 'core/appointment_form.html', {
        "patients": patients,
        "dentists": dentists,
        "treatments": treatments,
        "now": timezone.now(),
    })

# Create your views here.
