from django.utils.timezone import now

from django.db import models

from django.contrib.auth import get_user_model

User = get_user_model()


# Create your models here.
class Notification(models.Model):
    """System notifications for users"""
    NOTIFICATION_TYPES = [
        ('tender_published', 'Tender Published'),
        ('tender_amendment', 'Tender Amendment'),
        ('bid_submitted', 'Bid Submitted'),
        ('evaluation_result', 'Evaluation Result'),
        ('contract_awarded', 'Contract Awarded'),
        ('system', 'System'),
        ('reminder', 'Reminder'),
    ]

    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=200)
    message = models.TextField()
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES)
    related_id = models.UUIDField(null=True, blank=True)  # ID of related object
    related_type = models.CharField(max_length=50, blank=True)  # Model name of related object

    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='medium')

    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} - {self.title}"


class SystemMessage(models.Model):
    """System-wide messages and announcements"""
    MESSAGE_TYPES = [
        ('maintenance', 'Maintenance'),
        ('announcement', 'Announcement'),
        ('alert', 'Alert'),
        ('update', 'Update'),
    ]

    TARGET_AUDIENCES = [
        ('all', 'All Users'),
        ('suppliers', 'Suppliers'),
        ('procuring_entities', 'Procuring Entities'),
        ('admins', 'Administrators'),
    ]

    title = models.CharField(max_length=200)
    content = models.TextField()
    message_type = models.CharField(max_length=15, choices=MESSAGE_TYPES)
    target_audience = models.CharField(max_length=20, choices=TARGET_AUDIENCES, default='all')

    is_active = models.BooleanField(default=True)
    start_date = models.DateTimeField(default=now())
    end_date = models.DateTimeField(null=True, blank=True)

    created_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name='created_messages')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.get_message_type_display()}: {self.title}"
