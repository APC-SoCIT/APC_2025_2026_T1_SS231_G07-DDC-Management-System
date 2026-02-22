from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0037_pagechunk'),
    ]

    operations = [
        migrations.AddIndex(
            model_name='user',
            index=models.Index(
                fields=['user_type', 'date_joined', 'id'],
                name='user_type_joined_id_idx',
            ),
        ),
        migrations.AddIndex(
            model_name='user',
            index=models.Index(
                fields=['user_type', 'assigned_clinic_id', 'date_joined'],
                name='user_type_clinic_joined_idx',
            ),
        ),
    ]
