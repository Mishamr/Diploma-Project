"""
Automated migration for TaskLog model (Real-time Monitoring).

Generated: 2026-02-18
Adds TaskLog model to track Celery task execution.
"""
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0002_userprofile'),
    ]

    operations = [
        migrations.CreateModel(
            name='TaskLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('task_id', models.CharField(
                    help_text='Unique ID from Celery broker',
                    max_length=100,
                    unique=True,
                    verbose_name='Celery Task ID'
                )),
                ('task_name', models.CharField(max_length=255, verbose_name='Task Name')),
                ('status', models.CharField(
                    choices=[
                        ('pending', 'Pending'),
                        ('started', 'Started'),
                        ('progress', 'In Progress'),
                        ('completed', 'Completed'),
                        ('failed', 'Failed'),
                        ('cancelled', 'Cancelled'),
                    ],
                    default='pending',
                    max_length=20,
                    verbose_name='Status'
                )),
                ('items_total', models.IntegerField(default=0, verbose_name='Total Items')),
                ('items_processed', models.IntegerField(default=0, verbose_name='Processed')),
                ('items_failed', models.IntegerField(default=0, verbose_name='Failed')),
                ('message', models.TextField(blank=True, verbose_name='Status Message')),
                ('error_message', models.TextField(blank=True, verbose_name='Error Message')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Started At')),
                ('started_at', models.DateTimeField(blank=True, null=True, verbose_name='Actual Start')),
                ('completed_at', models.DateTimeField(blank=True, null=True, verbose_name='Completed At')),
                ('store', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='task_logs',
                    to='core.store',
                    verbose_name='Associated Store'
                )),
            ],
            options={
                'verbose_name': 'Task Log',
                'verbose_name_plural': 'Task Logs',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='tasklog',
            index=models.Index(fields=['task_id'], name='core_tasklo_task_id_idx'),
        ),
        migrations.AddIndex(
            model_name='tasklog',
            index=models.Index(fields=['-created_at'], name='core_tasklo_created_idx'),
        ),
        migrations.AddIndex(
            model_name='tasklog',
            index=models.Index(fields=['status'], name='core_tasklo_status_idx'),
        ),
    ]
