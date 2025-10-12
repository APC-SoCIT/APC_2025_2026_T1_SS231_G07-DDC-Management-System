from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from api.models import Patient, Appointment, InventoryItem, BillingRecord, FinancialRecord
from datetime import datetime, timedelta
from decimal import Decimal


class Command(BaseCommand):
    help = 'Seed database with sample data'

    def handle(self, *args, **kwargs):
        self.stdout.write('Seeding database...')

        # Create superuser if not exists
        if not User.objects.filter(username='admin').exists():
            User.objects.create_superuser(
                username='admin',
                email='admin@dentalclinic.com',
                password='admin123',
                first_name='Admin',
                last_name='User'
            )
            self.stdout.write(self.style.SUCCESS('Created superuser: admin/admin123'))

        # Create patients
        patients_data = [
            {'name': 'Bary Reyes', 'email': 'baryreyes@gmail.com', 'age': 100, 'contact': '(555) 123-4567', 'last_visit': '2024-05-15'},
            {'name': 'Michael Orenze', 'email': 'morenze@gmail.com', 'age': 28, 'contact': '(555) 234-5678', 'last_visit': '2024-05-10'},
            {'name': 'Ezekiel Galauran', 'email': 'egalauran@gmail.com', 'age': 20, 'contact': '(555) 345-6789', 'last_visit': '2024-05-08'},
            {'name': 'Gabriel Villanueva', 'email': 'gvillanueva@gmail.com', 'age': 52, 'contact': '(555) 456-7890', 'last_visit': '2024-04-30'},
            {'name': 'Airo Ravinera', 'email': 'aravinera@gmail.com', 'age': 29, 'contact': '(555) 567-8901', 'last_visit': '2024-05-12'},
            {'name': 'Abrech Dela Cruz', 'email': 'abdelacruz@gmail.com', 'age': 35, 'contact': '(555) 678-9012', 'last_visit': '2024-06-28'},
        ]

        patients = []
        for data in patients_data:
            patient, created = Patient.objects.get_or_create(
                email=data['email'],
                defaults=data
            )
            patients.append(patient)
            if created:
                self.stdout.write(f'Created patient: {patient.name}')

        # Create appointments
        appointments_data = [
            {'patient': patients[0], 'date': '2024-05-15', 'time': '10:00:00', 'doctor': 'Dr. Smith', 'status': 'scheduled', 'treatment': 'Root Canal'},
            {'patient': patients[1], 'date': '2024-05-10', 'time': '14:00:00', 'doctor': 'Dr. Johnson', 'status': 'completed', 'treatment': 'Cleaning'},
            {'patient': patients[2], 'date': '2024-05-08', 'time': '09:00:00', 'doctor': 'Dr. Brown', 'status': 'cancelled', 'treatment': 'Checkup'},
            {'patient': patients[3], 'date': '2024-04-30', 'time': '11:00:00', 'doctor': 'Dr. Davis', 'status': 'completed', 'treatment': 'Filling'},
            {'patient': patients[4], 'date': '2024-05-12', 'time': '15:00:00', 'doctor': 'Dr. Wilson', 'status': 'scheduled', 'treatment': 'Crown Prep'},
        ]

        for data in appointments_data:
            appointment, created = Appointment.objects.get_or_create(
                patient=data['patient'],
                date=data['date'],
                time=data['time'],
                defaults=data
            )
            if created:
                self.stdout.write(f'Created appointment for {appointment.patient.name}')

        # Create inventory items
        inventory_data = [
            {'name': 'Articaine', 'category': 'anesthetics', 'quantity': 45, 'min_stock': 50, 'unit': 'box', 'supplier': 'MedSupply', 'cost_per_unit': Decimal('25.50')},
            {'name': 'Dental cement', 'category': 'restorative', 'quantity': 20, 'min_stock': 50, 'unit': 'box', 'supplier': 'SmileTech', 'cost_per_unit': Decimal('35.00')},
            {'name': 'Amalgam', 'category': 'restorative', 'quantity': 40, 'min_stock': 50, 'unit': 'box', 'supplier': 'DentCorp', 'cost_per_unit': Decimal('45.00')},
            {'name': 'Glove', 'category': 'ppe', 'quantity': 39, 'min_stock': 50, 'unit': 'box', 'supplier': 'SafeGuard', 'cost_per_unit': Decimal('15.00')},
            {'name': 'Mask', 'category': 'ppe', 'quantity': 9, 'min_stock': 50, 'unit': 'box', 'supplier': 'SafeGuard', 'cost_per_unit': Decimal('12.00')},
            {'name': 'X-ray markers', 'category': 'imaging', 'quantity': 21, 'min_stock': 50, 'unit': 'piece', 'supplier': 'ImagePro', 'cost_per_unit': Decimal('8.50')},
            {'name': 'X-ray films', 'category': 'imaging', 'quantity': 23, 'min_stock': 50, 'unit': 'box', 'supplier': 'ImagePro', 'cost_per_unit': Decimal('55.00')},
            {'name': 'Pad covers', 'category': 'imaging', 'quantity': 19, 'min_stock': 50, 'unit': 'pack', 'supplier': 'ImagePro', 'cost_per_unit': Decimal('18.00')},
        ]

        for data in inventory_data:
            item, created = InventoryItem.objects.get_or_create(
                name=data['name'],
                defaults=data
            )
            if created:
                self.stdout.write(f'Created inventory item: {item.name}')

        # Create billing records
        billing_data = [
            {'patient': patients[5], 'last_payment': '2025-06-28', 'amount': Decimal('350.00'), 'payment_method': 'Credit Card'},
            {'patient': patients[3], 'last_payment': '2025-05-05', 'amount': Decimal('250.00'), 'payment_method': 'Cash'},
            {'patient': patients[1], 'last_payment': '2025-06-05', 'amount': Decimal('180.00'), 'payment_method': 'Insurance'},
            {'patient': patients[2], 'last_payment': '2025-03-11', 'amount': Decimal('420.00'), 'payment_method': 'Credit Card'},
            {'patient': patients[4], 'last_payment': '2025-05-15', 'amount': Decimal('290.00'), 'payment_method': 'Debit Card'},
            {'patient': patients[0], 'last_payment': '2025-04-29', 'amount': Decimal('500.00'), 'payment_method': 'Cash'},
        ]

        for data in billing_data:
            record, created = BillingRecord.objects.get_or_create(
                patient=data['patient'],
                last_payment=data['last_payment'],
                defaults=data
            )
            if created:
                self.stdout.write(f'Created billing record for {record.patient.name}')

        # Create financial records
        financial_data = [
            {'record_type': 'revenue', 'month': 'May', 'year': 2024, 'amount': Decimal('400000.00')},
            {'record_type': 'revenue', 'month': 'June', 'year': 2024, 'amount': Decimal('350000.00')},
            {'record_type': 'revenue', 'month': 'July', 'year': 2024, 'amount': Decimal('480000.00')},
            {'record_type': 'revenue', 'month': 'Aug', 'year': 2024, 'amount': Decimal('220000.00')},
            {'record_type': 'revenue', 'month': 'Sept', 'year': 2024, 'amount': Decimal('300000.00')},
            {'record_type': 'revenue', 'month': 'Oct', 'year': 2024, 'amount': Decimal('520000.00')},
            {'record_type': 'revenue', 'month': 'Nov', 'year': 2024, 'amount': Decimal('450000.00')},
            {'record_type': 'expense', 'month': 'May', 'year': 2024, 'amount': Decimal('250000.00')},
            {'record_type': 'expense', 'month': 'June', 'year': 2024, 'amount': Decimal('280000.00')},
            {'record_type': 'expense', 'month': 'July', 'year': 2024, 'amount': Decimal('320000.00')},
            {'record_type': 'expense', 'month': 'Aug', 'year': 2024, 'amount': Decimal('180000.00')},
            {'record_type': 'expense', 'month': 'Sept', 'year': 2024, 'amount': Decimal('200000.00')},
            {'record_type': 'expense', 'month': 'Oct', 'year': 2024, 'amount': Decimal('350000.00')},
            {'record_type': 'expense', 'month': 'Nov', 'year': 2024, 'amount': Decimal('300000.00')},
        ]

        for data in financial_data:
            record, created = FinancialRecord.objects.get_or_create(
                record_type=data['record_type'],
                month=data['month'],
                year=data['year'],
                defaults=data
            )
            if created:
                self.stdout.write(f'Created financial record: {record.record_type} - {record.month} {record.year}')

        self.stdout.write(self.style.SUCCESS('Database seeded successfully!'))
