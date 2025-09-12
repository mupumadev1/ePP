from django.contrib import admin

from notifications.models import Notification, SystemMessage

# Register your models here.
admin.site.register(Notification)
admin.site.register(SystemMessage)