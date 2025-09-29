"""
Budget tracking models for e-procurement system.
Add these to your tenders/models.py or create a new budget/models.py
"""

from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator
from decimal import Decimal
from tenders.models import Tender
from users.models import ProcuringEntity

User = get_user_model()


class BudgetLine(models.Model):
    """
    Annual budget line items for procurement planning.
    These are created before tenders and track approved vs. actual spending.
    """

    CURRENCY_CHOICES = [
        ('USD', 'US Dollar'),
        ('ZMW', 'Zambian Kwacha'),
        ('NGN', 'Nigerian Naira'),
    ]

    PROCUREMENT_PROCESS_CHOICES = [
        ('eoi', 'Expression of Interest (EOI)'),
        ('rfp', 'Request for Proposal (RFP)'),
        ('rfq', 'Request for Quotation (RFQ)'),
        ('minimum_quotes', 'Minimum Quotes'),
        ('open_tender', 'Open Tender'),
        ('limited_bidding', 'Limited Bidding'),
        ('sole_source', 'Sole Source'),
        ('emergency', 'Emergency Procurement'),
    ]

    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('approved', 'Approved'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
        ('on_hold', 'On Hold'),
    ]

    # Basic Information
    serial_number = models.CharField(max_length=50, unique=True, help_text="S/N from budget sheet")
    budget_line = models.CharField(max_length=200, help_text="Budget line name/code")
    section = models.CharField(max_length=200, help_text="Department/Section")
    item_description = models.TextField(help_text="Detailed item description")
    unit = models.CharField(max_length=100, help_text="Unit of measurement (e.g., pieces, boxes, units)")

    # Budget Allocations
    approved_quantity_2025 = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Total approved quantity for 2025"
    )
    quantity_to_order = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Quantity to be procured in this cycle"
    )

    # Estimated Costs
    estimated_unit_cost_usd = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    estimated_total_cost_usd = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Auto-calculated or manual entry"
    )
    estimated_unit_cost_naira = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        null=True,
        blank=True
    )
    total_cost_naira = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        null=True,
        blank=True
    )

    # Actual Costs (populated after procurement)
    actual_rate = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Actual unit cost from winning bid"
    )
    actual_amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Actual total amount paid"
    )
    currency_type = models.CharField(max_length=3, choices=CURRENCY_CHOICES, default='USD')

    # Procurement Planning
    ppm_responsible = models.CharField(max_length=200, blank=True, help_text="PPM Responsible person/unit")
    pr_dept = models.CharField(max_length=200, blank=True, help_text="PR Department")
    procurement_process = models.CharField(
        max_length=20,
        choices=PROCUREMENT_PROCESS_CHOICES,
        blank=True,
        help_text="Procurement method to be used"
    )
    procuring_entity = models.ForeignKey(
        'users.ProcuringEntity',
        on_delete=models.PROTECT,
        related_name='budget_lines',
        null=True,
        blank=True
    )
    wambo_product_code = models.CharField(max_length=100, blank=True, help_text="WAMBO Product code")
    comments = models.TextField(blank=True)

    # Delivery Information
    selected_suppliers = models.TextField(blank=True, help_text="Comma-separated list or JSON")
    expected_delivery_lead_time = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Expected delivery time in days"
    )

    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')

    # Metadata
    created_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name='created_budget_lines')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['serial_number']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['section']),
            models.Index(fields=['budget_line']),
        ]

    def __str__(self):
        return f"{self.serial_number} - {self.item_description[:50]}"

    @property
    def available_quantity(self):
        """Calculate remaining quantity available for procurement"""
        allocated = self.tender_allocations.aggregate(
            total=models.Sum('allocated_quantity')
        )['total'] or 0
        return self.approved_quantity_2025 - allocated

    @property
    def budget_utilization_percentage(self):
        """Calculate percentage of budget utilized"""
        if not self.estimated_total_cost_usd or self.estimated_total_cost_usd == 0:
            return 0
        if not self.actual_amount:
            return 0
        return (self.actual_amount / self.estimated_total_cost_usd) * 100

    def save(self, *args, **kwargs):
        # Auto-calculate estimated total if unit cost and quantity provided
        if self.estimated_unit_cost_usd and self.quantity_to_order:
            self.estimated_total_cost_usd = self.estimated_unit_cost_usd * self.quantity_to_order
        super().save(*args, **kwargs)


class ProcurementTimeline(models.Model):
    """
    Track procurement milestones and dates for each budget line.
    """

    STAGE_CHOICES = [
        ('project_start', 'Project Start/Bid Advert'),
        ('bid_advertisement', 'Bid Advertisement'),
        ('bid_review', 'Bid Review & Evaluation'),
        ('fa_review', 'FA Review'),
        ('executive_approval', 'IHVN Executive Management Approval'),
        ('contract_award', 'Contract Award'),
        ('contract_acceptance', 'Contract Offer & Acceptance'),
        ('delivery', 'Final Delivery/Delivery Verification/Payment'),
    ]

    budget_line = models.ForeignKey(
        BudgetLine,
        on_delete=models.CASCADE,
        related_name='timeline_milestones'
    )
    stage = models.CharField(max_length=30, choices=STAGE_CHOICES)
    planned_date = models.DateField(null=True, blank=True)
    actual_date = models.DateField(null=True, blank=True)
    responsible_person = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='responsible_milestones'
    )
    notes = models.TextField(blank=True)
    completed = models.BooleanField(default=False)

    # For bid advertisement stage
    advertisement_medium = models.CharField(
        max_length=500,
        blank=True,
        help_text="e.g., National Dailies, Shortlisted vendors, website"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['budget_line', 'stage']
        unique_together = ['budget_line', 'stage']

    def __str__(self):
        return f"{self.budget_line.serial_number} - {self.get_stage_display()}"

    @property
    def is_delayed(self):
        """Check if milestone is delayed"""
        if self.completed:
            return False
        if self.planned_date and not self.actual_date:
            from django.utils.timezone import now
            return now().date() > self.planned_date
        return False


class TenderBudgetAllocation(models.Model):
    """
    Links tenders to budget lines and tracks quantity allocation.
    Multiple tenders can draw from one budget line.
    """

    budget_line = models.ForeignKey(
        BudgetLine,
        on_delete=models.PROTECT,
        related_name='tender_allocations'
    )
    tender = models.ForeignKey(
        'Tender',
        on_delete=models.CASCADE,
        related_name='budget_allocations'
    )
    allocated_quantity = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Quantity allocated from budget line to this tender"
    )
    allocated_amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Estimated amount allocated"
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.budget_line.serial_number} → {self.tender.reference_number}"

    def clean(self):
        """Validate allocation doesn't exceed available budget"""
        from django.core.exceptions import ValidationError

        if self.allocated_quantity:
            # Get total allocated for this budget line (excluding current record)
            existing_allocations = TenderBudgetAllocation.objects.filter(
                budget_line=self.budget_line
            ).exclude(pk=self.pk).aggregate(
                total=models.Sum('allocated_quantity')
            )['total'] or 0

            available = self.budget_line.approved_quantity_2025 - existing_allocations

            if self.allocated_quantity > available:
                raise ValidationError(
                    f"Allocation ({self.allocated_quantity}) exceeds available quantity ({available})"
                )

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)


class BudgetAmendment(models.Model):
    """
    Track budget revisions and amendments throughout the year.
    """

    budget_line = models.ForeignKey(
        BudgetLine,
        on_delete=models.CASCADE,
        related_name='amendments'
    )
    amendment_number = models.PositiveIntegerField()
    reason = models.TextField(help_text="Reason for amendment")

    # Fields being amended
    previous_quantity = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    new_quantity = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    previous_amount = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    new_amount = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)

    # Approval tracking
    requested_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name='requested_amendments')
    approved_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_amendments'
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=[('pending', 'Pending'), ('approved', 'Approved'), ('rejected', 'Rejected')],
        default='pending'
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-amendment_number']
        unique_together = ['budget_line', 'amendment_number']

    def __str__(self):
        return f"{self.budget_line.serial_number} - Amendment {self.amendment_number}"