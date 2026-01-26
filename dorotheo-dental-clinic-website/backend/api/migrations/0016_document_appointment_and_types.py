from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('api', '0015_service_duration'),
    ]

    operations = [
        migrations.AddField(
            model_name='document',
            name='appointment',
            field=models.ForeignKey(blank=True, null=True, on_delete=models.SET_NULL, related_name='documents', to='api.appointment'),
        ),
        migrations.AlterField(
            model_name='document',
            name='document_type',
            field=models.CharField(
                choices=[
                    ('xray', 'X-Ray'),
                    ('scan', 'Tooth Scan'),
                    ('report', 'Report'),
                    ('medical_certificate', 'Medical Certificate'),
                    ('note', 'Note'),
                    ('other', 'Other'),
                ],
                max_length=20,
            ),
        ),
    ]
