
import uuid
from decimal import Decimal

from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import models

from users.models import  ProcuringEntity
from tenders.models import Tender

from django.conf import settings
# Create your models here.
class Bid(models.Model):
    """Bids submitted by suppliers for tenders"""
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('submitted', 'Submitted'),
        ('withdrawn', 'Withdrawn'),
        ('disqualified', 'Disqualified'),
        ('qualified', 'Qualified'),
        ('winning', 'Winning'),
        ('losing', 'Losing'),
    ]

    SUBMISSION_METHODS = [
        ('online', 'Online'),
        ('physical', 'Physical'),
        ('email', 'Email'),
    ]

    # Basic Information
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tender = models.ForeignKey(Tender, on_delete=models.CASCADE, related_name='bids')
    supplier = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='bids')
    bid_reference = models.CharField(max_length=100, unique=True)

    # Financial Information
    total_bid_amount = models.DecimalField(max_digits=15, decimal_places=2)
    currency = models.CharField(max_length=3, default='ZMW')
    vat_amount = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))
    vat_inclusive = models.BooleanField(default=True)

    # Bid Details
    bid_validity_days = models.PositiveIntegerField()
    delivery_period = models.CharField(max_length=100, blank=True)
    payment_terms = models.TextField(blank=True)
    warranty_period = models.CharField(max_length=100, blank=True)

    # Technical Proposal
    technical_proposal = models.TextField(blank=True)
    methodology = models.TextField(blank=True)
    project_timeline = models.TextField(blank=True)

    # Status and Submission
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='draft')
    submission_method = models.CharField(max_length=10, choices=SUBMISSION_METHODS, default='online')
    submitted_at = models.DateTimeField(null=True, blank=True)

    # Evaluation Results
    technical_score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True,
                                          validators=[MinValueValidator(0), MaxValueValidator(100)])
    financial_score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True,
                                          validators=[MinValueValidator(0), MaxValueValidator(100)])
    total_score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True,
                                      validators=[MinValueValidator(0), MaxValueValidator(100)])
    ranking = models.PositiveIntegerField(null=True, blank=True)

    # Security Deposit
    bid_security_submitted = models.BooleanField(default=False)
    bid_security_amount = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    bid_security_reference = models.CharField(max_length=100, blank=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['tender', 'supplier']
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.bid_reference} - {self.tender.reference_number}"

    def save(self, *args, **kwargs):
        if not self.bid_reference:
            # Generate bid reference based on tender reference
            self.bid_reference = f"BID-{self.tender.reference_number}-{self.supplier.id}"
        super().save(*args, **kwargs)


class BidItem(models.Model):
    """Individual items in a bid"""
    bid = models.ForeignKey(Bid, on_delete=models.CASCADE, related_name='items')
    item_number = models.PositiveIntegerField()
    description = models.CharField(max_length=500)
    quantity = models.DecimalField(max_digits=10, decimal_places=2)
    unit_of_measure = models.CharField(max_length=50, blank=True)
    unit_price = models.DecimalField(max_digits=15, decimal_places=2)
    total_price = models.DecimalField(max_digits=15, decimal_places=2)
    specifications = models.TextField(blank=True)
    brand = models.CharField(max_length=100, blank=True)
    model = models.CharField(max_length=100, blank=True)
    country_of_origin = models.CharField(max_length=100, blank=True)

    class Meta:
        ordering = ['item_number']

    def __str__(self):
        return f"{self.bid.bid_reference} - Item {self.item_number}"

    def save(self, *args, **kwargs):
        self.total_price = self.quantity * self.unit_price
        super().save(*args, **kwargs)


def bid_document_path(instance, filename):
    return f'bids/{instance.bid.id}/documents/{filename}'


class BidDocument(models.Model):
    """Documents submitted with bids"""
    DOCUMENT_TYPES = [
        ('technical_proposal', 'Technical Proposal'),
        ('financial_proposal', 'Financial Proposal'),
        ('company_profile', 'Company Profile'),
        ('tax_clearance', 'Tax Clearance'),
        ('insurance', 'Insurance Certificate'),
        ('registration_cert', 'Registration Certificate'),
        ('other', 'Other'),
    ]

    bid = models.ForeignKey(Bid, on_delete=models.CASCADE, related_name='documents')
    document_name = models.CharField(max_length=200)
    document_type = models.CharField(max_length=20, choices=DOCUMENT_TYPES)
    file = models.FileField(upload_to=bid_document_path)
    file_size = models.PositiveBigIntegerField(null=True, blank=True)
    mime_type = models.CharField(max_length=100, blank=True)
    is_required = models.BooleanField(default=False)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.bid.bid_reference} - {self.document_name}"


class EvaluationCommittee(models.Model):
    """Committees responsible for evaluating bids"""
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('disbanded', 'Disbanded'),
    ]

    tender = models.ForeignKey(Tender, on_delete=models.CASCADE, related_name='evaluation_committees')
    committee_name = models.CharField(max_length=200)
    chairperson = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='chaired_committees')
    secretary = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
                                  related_name='secretary_committees')
    appointment_date = models.DateField()
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='active')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.committee_name} - {self.tender.reference_number}"


class CommitteeMember(models.Model):
    """Members of evaluation committees"""
    ROLES = [
        ('chairperson', 'Chairperson'),
        ('secretary', 'Secretary'),
        ('member', 'Member'),
        ('observer', 'Observer'),
    ]

    committee = models.ForeignKey(EvaluationCommittee, on_delete=models.CASCADE, related_name='members')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='committee_memberships')
    role = models.CharField(max_length=15, choices=ROLES)
    expertise_area = models.CharField(max_length=200, blank=True)
    appointed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['committee', 'user']

    def __str__(self):
        return f"{self.user.username} - {self.committee.committee_name} ({self.get_role_display()})"


class BidEvaluation(models.Model):
    """Individual evaluator's assessment of a bid"""
    RECOMMENDATIONS = [
        ('accept', 'Accept'),
        ('reject', 'Reject'),
        ('conditional_accept', 'Conditional Accept'),
    ]

    bid = models.ForeignKey(Bid, on_delete=models.CASCADE, related_name='evaluations')
    evaluator = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='bid_evaluations')
    committee = models.ForeignKey(EvaluationCommittee, on_delete=models.CASCADE, related_name='evaluations')

    # Technical Evaluation
    technical_compliance = models.BooleanField(default=False)
    technical_score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True,
                                          validators=[MinValueValidator(0), MaxValueValidator(100)])
    technical_remarks = models.TextField(blank=True)

    # Financial Evaluation
    financial_compliance = models.BooleanField(default=False)
    financial_score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True,
                                          validators=[MinValueValidator(0), MaxValueValidator(100)])
    financial_remarks = models.TextField(blank=True)

    # Overall Evaluation
    overall_score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True,
                                        validators=[MinValueValidator(0), MaxValueValidator(100)])
    recommendation = models.CharField(max_length=20, choices=RECOMMENDATIONS, null=True, blank=True)
    evaluator_comments = models.TextField(blank=True)

    evaluation_date = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['bid', 'evaluator']

    def __str__(self):
        return f"{self.bid.bid_reference} - Evaluated by {self.evaluator.username}"

class TenderEvaluationConfig(models.Model):
    FIN_METHOD_LOWEST_PRICE = 'lowest_price'
    FIN_METHOD_CRITERIA = 'criteria'
    FINANCIAL_METHOD_CHOICES = [
        (FIN_METHOD_LOWEST_PRICE, 'Lowest Price'),
        (FIN_METHOD_CRITERIA, 'Criteria Based'),
    ]

    tender = models.OneToOneField(Tender, on_delete=models.CASCADE, related_name='evaluation_config')

    # Weights (%); normalized when computing overall
    technical_weight = models.DecimalField(max_digits=5, decimal_places=2, default=70,
                                           validators=[MinValueValidator(0), MaxValueValidator(100)])
    financial_weight = models.DecimalField(max_digits=5, decimal_places=2, default=30,
                                           validators=[MinValueValidator(0), MaxValueValidator(100)])

    # Compliance gate
    compliance_required = models.BooleanField(default=True)
    enforce_mandatory = models.BooleanField(default=True)

    # Technical pass mark (percentage 0-100)
    technical_pass_mark = models.DecimalField(max_digits=5, decimal_places=2, default=70,
                                              validators=[MinValueValidator(0), MaxValueValidator(100)])

    # Financial scoring approach
    financial_method = models.CharField(max_length=20, choices=FINANCIAL_METHOD_CHOICES,
                                        default=FIN_METHOD_LOWEST_PRICE)
    cap_financial_score_at = models.DecimalField(max_digits=5, decimal_places=2, default=100)

    def __str__(self):
        return f"EvalConfig {self.tender.reference_number}"

# Add: criteria with compliance/upload support
class EvaluationCriterion(models.Model):
    SECTION_COMPLIANCE = 'compliance'
    SECTION_TECHNICAL = 'technical'
    SECTION_FINANCIAL = 'financial'
    SECTION_CHOICES = [
        (SECTION_COMPLIANCE, 'Compliance'),
        (SECTION_TECHNICAL, 'Technical'),
        (SECTION_FINANCIAL, 'Financial'),
    ]

    TYPE_SCORE = 'score'      # numeric scoring against max_points
    TYPE_BOOLEAN = 'boolean'  # pass/fail
    TYPE_UPLOAD = 'upload'    # requires a document
    TYPE_CHOICES = [
        (TYPE_SCORE, 'Score'),
        (TYPE_BOOLEAN, 'Boolean'),
        (TYPE_UPLOAD, 'Upload'),
    ]

    tender = models.ForeignKey(Tender, on_delete=models.CASCADE, related_name='criteria')
    section = models.CharField(max_length=10, choices=SECTION_CHOICES)
    criterion_type = models.CharField(max_length=10, choices=TYPE_CHOICES, default=TYPE_SCORE)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)

    # Scoring config (for TYPE_SCORE; also used as 0/max for boolean/upload normalization)
    weight = models.DecimalField(max_digits=5, decimal_places=2, default=0,
                                 validators=[MinValueValidator(0), MaxValueValidator(100)])
    max_points = models.DecimalField(max_digits=6, decimal_places=2, default=100,
                                     validators=[MinValueValidator(0)])

    # Mandatory gates
    mandatory = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=0)

    # For upload criteria: link to a required document type
    expected_upload = models.ForeignKey(
        'tenders.TenderUploadDocuments',
        null=True, blank=True, on_delete=models.PROTECT,
        related_name='criteria_links'
    )

    class Meta:
        ordering = ['section', 'order', 'name']
        unique_together = [('tender', 'section', 'name')]

    def __str__(self):
        return f"{self.tender.reference_number} - {self.section} - {self.name}"

# Add: per-criterion scores on an evaluator's BidEvaluation
class BidCriterionScore(models.Model):
    evaluation = models.ForeignKey(BidEvaluation, on_delete=models.CASCADE, related_name='criterion_scores')
    criterion = models.ForeignKey(EvaluationCriterion, on_delete=models.PROTECT, related_name='scores')
    score = models.DecimalField(max_digits=6, decimal_places=2, validators=[MinValueValidator(0)])
    comments = models.TextField(blank=True)

    class Meta:
        unique_together = [('evaluation', 'criterion')]

    def clean(self):
        from django.core.exceptions import ValidationError
        if self.evaluation.bid.tender_id != self.criterion.tender_id:
            raise ValidationError("Criterion and evaluation must belong to the same tender.")
        if self.score > self.criterion.max_points:
            raise ValidationError(f"Score cannot exceed criterion max_points ({self.criterion.max_points}).")

    def __str__(self):
        return f"{self.evaluation.id} - {self.criterion.name}: {self.score}"


class Contract(models.Model):
    """Contracts awarded after tender evaluation"""
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('signed', 'Signed'),
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('terminated', 'Terminated'),
        ('expired', 'Expired'),
    ]

    # Basic Information
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    contract_number = models.CharField(max_length=100, unique=True)
    tender = models.OneToOneField(Tender, on_delete=models.PROTECT, related_name='contract')
    winning_bid = models.OneToOneField(Bid, on_delete=models.PROTECT, related_name='contract')
    supplier = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='contracts')
    procuring_entity = models.ForeignKey(ProcuringEntity, on_delete=models.PROTECT, related_name='contracts')

    contract_title = models.CharField(max_length=500)
    contract_value = models.DecimalField(max_digits=15, decimal_places=2)
    currency = models.CharField(max_length=3, default='ZMW')

    # Contract Periods
    start_date = models.DateField()
    end_date = models.DateField()
    delivery_period = models.CharField(max_length=100, blank=True)
    warranty_period = models.CharField(max_length=100, blank=True)

    # Contract Terms
    payment_terms = models.TextField(blank=True)
    performance_guarantee_required = models.BooleanField(default=False)
    performance_guarantee_amount = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)

    # Status Tracking
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='draft')
    contract_signed_date = models.DateField(null=True, blank=True)

    # Tracking
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='created_contracts')
    approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
                                    related_name='approved_contracts')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.contract_number} - {self.contract_title}"


class ContractMilestone(models.Model):
    """Milestones within contracts"""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('delayed', 'Delayed'),
    ]

    contract = models.ForeignKey(Contract, on_delete=models.CASCADE, related_name='milestones')
    milestone_name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    due_date = models.DateField()
    completion_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'),
                                                validators=[MinValueValidator(0), MaxValueValidator(100)])
    payment_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'),
                                             validators=[MinValueValidator(0), MaxValueValidator(100)])
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='pending')
    completed_date = models.DateField(null=True, blank=True)

    class Meta:
        ordering = ['due_date']

    def __str__(self):
        return f"{self.contract.contract_number} - {self.milestone_name}"