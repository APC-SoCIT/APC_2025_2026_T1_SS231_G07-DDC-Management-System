# Generated migration for Phase 3: Add clinic to availability models

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0026_assign_clinical_data_to_main_clinic'),
    ]

    operations = [
        # Add clinic fields to StaffAvailability
        migrations.AddField(
            model_name='staffavailability',
            name='apply_to_all_clinics',
            field=models.BooleanField(default=True, help_text='If True, this availability applies to all clinics'),
        ),
        migrations.AddField(
            model_name='staffavailability',
            name='clinics',
            field=models.ManyToManyField(blank=True, help_text='Clinics where this availability applies', related_name='staff_availabilities', to='api.cliniclocation'),
        ),
        
        # Add clinic fields to DentistAvailability
        migrations.AddField(
            model_name='dentistavailability',
            name='apply_to_all_clinics',
            field=models.BooleanField(default=True, help_text='If True, this availability applies to all clinics'),
        ),
        migrations.AddField(
            model_name='dentistavailability',
            name='clinic',
            field=models.ForeignKey(blank=True, help_text='Clinic where this availability applies. Null means all clinics.', null=True, on_delete=django.db.models.deletion.CASCADE, related_name='dentist_availabilities', to='api.cliniclocation'),
        ),
        
        # Add clinic fields to BlockedTimeSlot
        migrations.AddField(
            model_name='blockedtimeslot',
            name='apply_to_all_clinics',
            field=models.BooleanField(default=True, help_text='If True, this block applies to all clinics'),
        ),
        migrations.AddField(
            model_name='blockedtimeslot',
            name='clinic',
            field=models.ForeignKey(blank=True, help_text='Clinic where this block applies. Null means all clinics.', null=True, on_delete=django.db.models.deletion.CASCADE, related_name='blocked_time_slots', to='api.cliniclocation'),
        ),
        
        # Update unique constraint for DentistAvailability to include clinic
        migrations.AlterUniqueTogether(
            name='dentistavailability',
            unique_together={('dentist', 'date', 'clinic')},
        ),
        
        # Add indexes for clinic filtering
        migrations.AddIndex(
            model_name='dentistavailability',
            index=models.Index(fields=['clinic', 'date'], name='api_dentist_clinic__c89e2d_idx'),
        ),
        migrations.AddIndex(
            model_name='blockedtimeslot',
            index=models.Index(fields=['clinic', 'date'], name='api_blocked_clinic__7f8a3e_idx'),
        ),
    ]
