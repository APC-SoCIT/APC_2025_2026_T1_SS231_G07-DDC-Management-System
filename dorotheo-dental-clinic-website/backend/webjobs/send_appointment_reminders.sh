#!/bin/bash
# Azure WebJob: Send Appointment Reminders
# Runs daily at scheduled time

echo "Starting Appointment Reminders WebJob..."
echo "Time: $(date)"

cd /home/site/wwwroot/dorotheo-dental-clinic-website/backend
python manage.py send_appointment_reminders

echo "Appointment Reminders WebJob completed"
echo "Time: $(date)"
