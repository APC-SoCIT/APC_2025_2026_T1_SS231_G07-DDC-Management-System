#!/bin/bash
# Azure WebJob: Send Low Stock Alerts
# Runs daily at scheduled time

echo "Starting Low Stock Alerts WebJob..."
echo "Time: $(date)"

cd /home/site/wwwroot/dorotheo-dental-clinic-website/backend
python manage.py send_low_stock_alerts

echo "Low Stock Alerts WebJob completed"
echo "Time: $(date)"
