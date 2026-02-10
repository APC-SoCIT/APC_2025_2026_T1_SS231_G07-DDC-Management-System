#!/bin/bash
# Azure WebJob: Send Payment Reminders
# Runs weekly on Monday

echo "Starting Payment Reminders WebJob..."
echo "Time: $(date)"

cd /home/site/wwwroot/dorotheo-dental-clinic-website/backend
python manage.py send_payment_reminders

echo "Payment Reminders WebJob completed"
echo "Time: $(date)"
