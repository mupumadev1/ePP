from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.translation import gettext_lazy as _
from users.models import User, UserProfile, ProcuringEntity, EntityUser

# Register your models here.
class UserAdmin(BaseUserAdmin):
    # What you see in the list
    list_display = ("username", "email", "user_type", "status", "is_staff", "is_active")
    list_filter = ("user_type", "status", "is_staff", "is_superuser", "is_active", "groups")

    # Field layout on the user change page
    fieldsets = (
        (None, {"fields": ("username", "password")}),
        (_("Personal info"), {"fields": ("first_name", "last_name", "email", "phone")}),
        (_("Roles and status"), {"fields": ("user_type", "status", "email_verified")}),
        (_("Permissions"), {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        (_("Important dates"), {"fields": ("last_login", "date_joined")}),
    )

    # Field layout on the add user page
    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": ("username", "email", "user_type", "status", "password1", "password2"),
        }),
    )

    search_fields = ("username", "email", "first_name", "last_name")
    ordering = ("username",)

admin.site.register(User, UserAdmin)
admin.site.register(UserProfile)
admin.site.register(ProcuringEntity)
admin.site.register(EntityUser)
