import uuid
from datetime import timezone, datetime

from django.db import models
from django.utils.timezone import now

from django.contrib.auth import get_user_model
from users.models import ProcuringEntity

User = get_user_model()

# Create your models here.
class Category(models.Model):
    """Procurement categories for classification"""
    name = models.CharField(max_length=200)
    code = models.CharField(max_length=50, unique=True, blank=True)
    description = models.TextField(blank=True)
    parent = models.ForeignKey('self', null=True, blank=True, on_delete=models.CASCADE, related_name='subcategories')
    level = models.PositiveIntegerField(default=1)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Categories"

    def __str__(self):
        return self.name


class SupplierCategory(models.Model):
    """Links suppliers to categories they can bid for"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='supplier_categories')
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='suppliers')
    experience_years = models.PositiveIntegerField(null=True, blank=True)
    certification_details = models.TextField(blank=True)
    verified = models.BooleanField(default=False)
    verified_at = models.DateTimeField(null=True, blank=True)
    verified_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL,
                                    related_name='verified_supplier_categories')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['user', 'category']

    def __str__(self):
        return f"{self.user.username} - {self.category.name}"


class Tender(models.Model):
    """Main tender/procurement opportunity model"""
    PROCUREMENT_METHODS = [
        ('open_domestic', 'Open Domestic'),
        ('open_international', 'Open International'),
        ('restricted', 'Restricted'),
        ('single_source', 'Single Source'),
        ('request_quotations', 'Request for Quotations'),
    ]

    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('published', 'Published'),
        ('closed', 'Closed'),
        ('cancelled', 'Cancelled'),
        ('awarded', 'Awarded'),
        ('completed', 'Completed'),
    ]

    TENDER_STAGES = [
        ('preparation', 'Preparation'),
        ('published', 'Published'),
        ('clarification', 'Clarification'),
        ('submission', 'Submission'),
        ('evaluation', 'Evaluation'),
        ('award', 'Award'),
        ('contract', 'Contract'),
    ]

    SECURITY_TYPES = [
        ('bank_guarantee', 'Bank Guarantee'),
        ('insurance_guarantee', 'Insurance Guarantee'),
        ('cash', 'Cash'),
    ]

    # Basic Information
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reference_number = models.CharField(max_length=100, unique=True)
    title = models.CharField(max_length=500)
    description = models.TextField()
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name='tenders')
    subcategory = models.ForeignKey(Category, null=True, blank=True, on_delete=models.PROTECT,
                                    related_name='tender_subcategories')
    procuring_entity = models.ForeignKey(ProcuringEntity, on_delete=models.CASCADE, related_name='tenders')
    procurement_method = models.CharField(max_length=20, choices=PROCUREMENT_METHODS)
    estimated_value = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    currency = models.CharField(max_length=3, default='ZMW')

    # Important Dates
    publication_date = models.DateTimeField(default=now())
    closing_date = models.DateTimeField()
    opening_date = models.DateTimeField(null=True, blank=True)
    bid_validity_period = models.PositiveIntegerField(default=90, help_text="Days")

    # Requirements and Specifications
    minimum_requirements = models.TextField(blank=True)
    technical_specifications = models.TextField(blank=True)
    evaluation_criteria = models.TextField(blank=True)
    terms_conditions = models.TextField(blank=True)

    # Status and Workflow
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='draft')
    tender_stage = models.CharField(max_length=15, choices=TENDER_STAGES, default='preparation')

    # Security and Deposits
    tender_security_required = models.BooleanField(default=False)
    tender_security_amount = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    tender_security_type = models.CharField(max_length=20, choices=SECURITY_TYPES, null=True, blank=True)

    # Settings
    allow_variant_bids = models.BooleanField(default=False)
    allow_electronic_submission = models.BooleanField(default=True)
    auto_extend_on_amendment = models.BooleanField(default=True)

    # Tracking
    created_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name='created_tenders')
    approved_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL,
                                    related_name='approved_tenders')
    approved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.reference_number} - {self.title}"

    @property
    def is_open(self):
        return self.status == 'published' and self.closing_date > now()

    @property
    def days_remaining(self):
        if self.is_open:
            delta = self.closing_date - now()
            return delta.days
        return 0


def tender_document_path(instance, filename):
    return f'tenders/{instance.tender.id}/documents/{filename}'

class TenderUploadDocuments(models.Model):
    """Model to handle multiple document uploads for a tender"""
    tender = models.ForeignKey(Tender, on_delete=models.CASCADE, related_name='upload_documents')
    name = models.CharField(max_length=200)
    file_type = models.CharField(max_length=200)
    max_file_size = models.PositiveIntegerField(help_text="Max file size in bytes")
    mandatory = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.tender.reference_number} - {self.name}"

class TenderDocument(models.Model):
    """Documents attached to tenders"""
    DOCUMENT_TYPES = [
        ('bidding_document', 'Bidding Document'),
        ('technical_specification', 'Technical Specification'),
        ('terms_conditions', 'Terms & Conditions'),
        ('amendment', 'Amendment'),
        ('clarification', 'Clarification'),
        ('other', 'Other'),
    ]

    tender = models.ForeignKey(Tender, on_delete=models.CASCADE, related_name='documents')
    document_name = models.CharField(max_length=200)
    document_type = models.CharField(max_length=25, choices=DOCUMENT_TYPES)
    file = models.FileField(upload_to=tender_document_path)
    file_size = models.PositiveBigIntegerField(null=True, blank=True)
    mime_type = models.CharField(max_length=100, blank=True)
    is_mandatory = models.BooleanField(default=False)
    version = models.CharField(max_length=10, default='1.0')
    uploaded_by = models.ForeignKey(User, on_delete=models.PROTECT)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.tender.reference_number} - {self.document_name}"


class TenderAmendment(models.Model):
    """Amendments made to tenders"""
    tender = models.ForeignKey(Tender, on_delete=models.CASCADE, related_name='amendments')
    amendment_number = models.PositiveIntegerField()
    title = models.CharField(max_length=200)
    description = models.TextField()
    changes_made = models.TextField(blank=True)
    closing_date_extended = models.DateTimeField(null=True, blank=True)
    issued_by = models.ForeignKey(User, on_delete=models.PROTECT)
    issued_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['tender', 'amendment_number']
        ordering = ['-amendment_number']

    def __str__(self):
        return f"{self.tender.reference_number} - Amendment {self.amendment_number}"
