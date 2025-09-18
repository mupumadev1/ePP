import os

from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.contrib.auth.models import PermissionsMixin
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator, FileExtensionValidator
from django.db import models
from django.utils import timezone


class UserManager(BaseUserManager):
    """Custom manager for User with username as the USERNAME_FIELD."""
    use_in_migrations = True

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("The email must be set")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')

        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """Custom user model for the e-procurement system based on AbstractBaseUser."""
    USER_TYPES = [
        ('supplier', 'Supplier'),
        ('procuring_entity', 'Procuring Entity'),
        ('admin', 'Administrator'),
        ('evaluator', 'Evaluator'),
    ]

    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('suspended', 'Suspended'),
        ('pending_verification', 'Pending Verification'),
    ]

    # Authentication and identity fields
    username = models.CharField(max_length=150, unique=True)
    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150, blank=True)

    # Permission flags
    is_staff = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    # Dates
    date_joined = models.DateTimeField(default=timezone.now)

    # Domain-specific fields
    user_type = models.CharField(max_length=20, choices=USER_TYPES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending_verification')
    phone = models.CharField(max_length=20, blank=True)
    email_verified = models.BooleanField(default=False)
    otp = models.CharField(max_length=6, blank=True, null=True)
    reset_password_token = models.CharField(max_length=255, null=True, blank=True)
    reset_password_expires = models.DateTimeField(null=True, blank=True)
    last_password_reset_request = models.DateTimeField(null=True, blank=True)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    def __str__(self):
        return f"{self.username} ({self.get_user_type_display()})"

    @property
    def is_supplier(self):
        """Check if user is a supplier"""
        return self.user_type == 'supplier'

    @property
    def is_admin_user(self):
        """Check if user has admin privileges"""
        return self.user_type == 'admin' or self.is_superuser

    @property
    def is_evaluator_user(self):
        """Check if user is an evaluator"""
        return self.user_type == 'evaluator'

    @property
    def is_procuring_entity_user(self):
        """Check if user belongs to a procuring entity"""
        return self.user_type == 'procuring_entity'

    @property
    def can_access_admin_dashboard(self):
        """Check if user can access admin dashboard"""
        return self.is_admin_user or self.is_evaluator_user or self.is_procuring_entity_user

    @property
    def can_access_bidder_dashboard(self):
        """Check if user can access bidder dashboard"""
        return self.is_supplier

    def get_dashboard_route(self):
        """Get the appropriate dashboard route for this user"""
        if self.can_access_admin_dashboard:
            return '/dashboard'
        elif self.can_access_bidder_dashboard:
            return '/bidder/dashboard'
        else:
            return '/login'  # Fallback for inactive/suspended users


class UserProfile(models.Model):
    """Extended profile information for users"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    tax_number = models.CharField(max_length=50, blank=True)
    registration_number = models.CharField(max_length=100, blank=True)
    address_line1 = models.CharField(max_length=200, blank=True)
    address_line2 = models.CharField(max_length=200, blank=True)
    city = models.CharField(max_length=100, blank=True)
    province = models.CharField(max_length=100, blank=True)
    postal_code = models.CharField(max_length=20, blank=True)
    country = models.CharField(max_length=100, default='Zambia')
    website = models.URLField(blank=True)
    business_description = models.TextField(blank=True)
    years_in_business = models.PositiveIntegerField(null=True, blank=True)
    annual_turnover = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    number_of_employees = models.PositiveIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Profile for {self.user.username}"


class ProcuringEntity(models.Model):
    """Government entities that initiate procurement"""
    ENTITY_TYPES = [
        ('ministry', 'Ministry'),
        ('government_agency', 'Government Agency'),
        ('local_authority', 'Local Authority'),
        ('statutory_body', 'Statutory Body'),
    ]

    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
    ]

    name = models.CharField(max_length=200)
    code = models.CharField(max_length=50, unique=True, blank=True)
    entity_type = models.CharField(max_length=20, choices=ENTITY_TYPES)
    parent_entity = models.ForeignKey('self', null=True, blank=True, on_delete=models.CASCADE,
                                      related_name='sub_entities')
    contact_person = models.CharField(max_length=100, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    address_line1 = models.CharField(max_length=200, blank=True)
    address_line2 = models.CharField(max_length=200, blank=True)
    city = models.CharField(max_length=100, blank=True)
    province = models.CharField(max_length=100, blank=True)
    budget_threshold = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='active')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Procuring Entities"

    def __str__(self):
        return self.name


class EntityUser(models.Model):
    """Links users to procuring entities with specific roles"""
    ROLES = [
        ('admin', 'Administrator'),
        ('procurement_officer', 'Procurement Officer'),
        ('evaluator', 'Evaluator'),
        ('approver', 'Approver'),
        ('viewer', 'Viewer'),
    ]

    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='entity_roles')
    entity = models.ForeignKey(ProcuringEntity, on_delete=models.CASCADE, related_name='entity_users')
    role = models.CharField(max_length=20, choices=ROLES)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='active')
    assigned_at = models.DateTimeField(auto_now_add=True)
    assigned_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL,
                                    related_name='assigned_entity_users')

    class Meta:
        unique_together = ['user', 'entity', 'role']

    def __str__(self):
        return f"{self.user.username} - {self.entity.name} ({self.get_role_display()})"

def business_reg_certificate_path(instance, filename):
    base, ext = os.path.splitext(filename)
    return f"suppliers/{instance.user_id}/documents/business_reg_certificate/{timezone.now():%Y%m%d%H%M%S}{ext}"


def tax_compliance_cert_path(instance, filename):
    base, ext = os.path.splitext(filename)
    return f"suppliers/{instance.user_id}/documents/tax_compliance_cert/{timezone.now():%Y%m%d%H%M%S}{ext}"


def company_profile_path(instance, filename):
    base, ext = os.path.splitext(filename)
    return f"suppliers/{instance.user_id}/documents/company_profile/{timezone.now():%Y%m%d%H%M%S}{ext}"

class SupplierProfile(models.Model):
    """Supplier-specific profile captured during registration"""
    VERIFICATION_CHOICES = [
        ('pending', 'Pending Verification'),
        ('verified', 'Verified'),
        ('rejected', 'Rejected'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='supplier_profile')

    # From RegistrationForm fields
    business_reg_number = models.CharField(max_length=100)  # maps to businessRegNumber
    business_category = models.CharField(max_length=150, blank=True)  # maps to businessCategory (free text)
    years_of_experience = models.PositiveIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(0)]
    )  # maps to experience

    # Uploads from RegistrationForm
    business_reg_certificate = models.FileField(
        upload_to=business_reg_certificate_path,
        null=True,
        blank=True,
        validators=[FileExtensionValidator(allowed_extensions=['pdf', 'jpg', 'jpeg', 'png'])]
    )
    tax_compliance_cert = models.FileField(
        upload_to=tax_compliance_cert_path,
        null=True,
        blank=True,
        validators=[FileExtensionValidator(allowed_extensions=['pdf', 'jpg', 'jpeg', 'png'])]
    )
    company_profile = models.FileField(
        upload_to=company_profile_path,
        null=True,
        blank=True,
        validators=[FileExtensionValidator(allowed_extensions=['pdf', 'jpg', 'jpeg', 'png'])]
    )

    # Status/verification fields
    verification_status = models.CharField(max_length=20, choices=VERIFICATION_CHOICES, default='pending')
    verified_at = models.DateTimeField(null=True, blank=True)
    admin_notes = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Supplier Profile"
        verbose_name_plural = "Supplier Profiles"

    def clean(self):
        # Ensure this profile is only attached to supplier accounts
        if hasattr(self, 'user') and self.user and not self.user.is_supplier:
            raise ValidationError("SupplierProfile can only be linked to users with user_type='supplier'.")

    def __str__(self):
        return f"SupplierProfile for {self.user.username}"
