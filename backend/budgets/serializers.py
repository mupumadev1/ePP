"""
Serializers for Budget models
Add to backend/tenders/serializer.py or create backend/budget/serializers.py
"""

from rest_framework import serializers
from decimal import Decimal
from .models import (
    BudgetLine,
    ProcurementTimeline,
    TenderBudgetAllocation,
    BudgetAmendment
)


class ProcurementTimelineSerializer(serializers.ModelSerializer):
    """Serializer for procurement timeline milestones"""
    stage_display = serializers.CharField(source='get_stage_display', read_only=True)
    is_delayed = serializers.BooleanField(read_only=True)
    responsible_person_name = serializers.SerializerMethodField()

    class Meta:
        model = ProcurementTimeline
        fields = [
            'id',
            'stage',
            'stage_display',
            'planned_date',
            'actual_date',
            'responsible_person',
            'responsible_person_name',
            'advertisement_medium',
            'notes',
            'completed',
            'is_delayed',
            'created_at'
        ]

    def get_responsible_person_name(self, obj):
        if obj.responsible_person:
            return getattr(obj.responsible_person, 'get_full_name', lambda: obj.responsible_person.username)()
        return None


class TenderBudgetAllocationSerializer(serializers.ModelSerializer):
    """Serializer for tender-budget allocations"""
    tender_reference = serializers.CharField(source='tender.reference_number', read_only=True)
    tender_title = serializers.CharField(source='tender.title', read_only=True)

    class Meta:
        model = TenderBudgetAllocation
        fields = [
            'id',
            'budget_line',
            'tender',
            'tender_reference',
            'tender_title',
            'allocated_quantity',
            'allocated_amount',
            'notes',
            'created_at'
        ]
        read_only_fields = ['created_at']


class BudgetAmendmentSerializer(serializers.ModelSerializer):
    """Serializer for budget amendments"""
    requested_by_name = serializers.SerializerMethodField()
    approved_by_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = BudgetAmendment
        fields = [
            'id',
            'budget_line',
            'amendment_number',
            'reason',
            'previous_quantity',
            'new_quantity',
            'previous_amount',
            'new_amount',
            'requested_by',
            'requested_by_name',
            'approved_by',
            'approved_by_name',
            'approved_at',
            'status',
            'status_display',
            'created_at'
        ]
        read_only_fields = ['requested_by', 'approved_at', 'created_at']

    def get_requested_by_name(self, obj):
        if obj.requested_by:
            return getattr(obj.requested_by, 'get_full_name', lambda: obj.requested_by.username)()
        return None

    def get_approved_by_name(self, obj):
        if obj.approved_by:
            return getattr(obj.approved_by, 'get_full_name', lambda: obj.approved_by.username)()
        return None


class BudgetLineListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing budget lines"""
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    procurement_process_display = serializers.CharField(source='get_procurement_process_display', read_only=True)
    procuring_entity_name = serializers.CharField(source='procuring_entity.name', read_only=True)
    available_quantity = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)
    budget_utilization_percentage = serializers.FloatField(read_only=True)

    class Meta:
        model = BudgetLine
        fields = [
            'id',
            'serial_number',
            'budget_line',
            'section',
            'item_description',
            'unit',
            'approved_quantity_2025',
            'quantity_to_order',
            'available_quantity',
            'estimated_unit_cost_usd',
            'estimated_total_cost_usd',
            'actual_amount',
            'currency_type',
            'status',
            'status_display',
            'procurement_process',
            'procurement_process_display',
            'procuring_entity',
            'procuring_entity_name',
            'budget_utilization_percentage',
            'created_at',
            'updated_at'
        ]


class BudgetLineDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for budget line with related data"""
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    procurement_process_display = serializers.CharField(source='get_procurement_process_display', read_only=True)
    currency_display = serializers.CharField(source='get_currency_type_display', read_only=True)
    procuring_entity_name = serializers.CharField(source='procuring_entity.name', read_only=True)
    created_by_name = serializers.SerializerMethodField()
    available_quantity = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)
    budget_utilization_percentage = serializers.FloatField(read_only=True)

    # Related data
    timeline_milestones = ProcurementTimelineSerializer(many=True, read_only=True)
    tender_allocations = TenderBudgetAllocationSerializer(many=True, read_only=True)
    amendments = BudgetAmendmentSerializer(many=True, read_only=True)

    class Meta:
        model = BudgetLine
        fields = [
            'id',
            'serial_number',
            'budget_line',
            'section',
            'item_description',
            'unit',
            'approved_quantity_2025',
            'quantity_to_order',
            'available_quantity',
            'estimated_unit_cost_usd',
            'estimated_total_cost_usd',
            'estimated_unit_cost_naira',
            'total_cost_naira',
            'actual_rate',
            'actual_amount',
            'currency_type',
            'currency_display',
            'ppm_responsible',
            'pr_dept',
            'procurement_process',
            'procurement_process_display',
            'procuring_entity',
            'procuring_entity_name',
            'wambo_product_code',
            'comments',
            'selected_suppliers',
            'expected_delivery_lead_time',
            'status',
            'status_display',
            'budget_utilization_percentage',
            'created_by',
            'created_by_name',
            'created_at',
            'updated_at',
            'timeline_milestones',
            'tender_allocations',
            'amendments'
        ]
        read_only_fields = ['created_by', 'created_at', 'updated_at']

    def get_created_by_name(self, obj):
        if obj.created_by:
            return getattr(obj.created_by, 'get_full_name', lambda: obj.created_by.username)()
        return None


class BudgetLineCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating and updating budget lines"""

    class Meta:
        model = BudgetLine
        fields = [
            'serial_number',
            'budget_line',
            'section',
            'item_description',
            'unit',
            'approved_quantity_2025',
            'quantity_to_order',
            'estimated_unit_cost_usd',
            'estimated_total_cost_usd',
            'estimated_unit_cost_naira',
            'total_cost_naira',
            'actual_rate',
            'actual_amount',
            'currency_type',
            'ppm_responsible',
            'pr_dept',
            'procurement_process',
            'procuring_entity',
            'wambo_product_code',
            'comments',
            'selected_suppliers',
            'expected_delivery_lead_time',
            'status'
        ]

    def validate_serial_number(self, value):
        """Ensure serial number is unique"""
        instance = self.instance
        if instance:
            # Update: allow same serial number for this instance
            if BudgetLine.objects.exclude(pk=instance.pk).filter(serial_number=value).exists():
                raise serializers.ValidationError("This serial number is already in use.")
        else:
            # Create: check uniqueness
            if BudgetLine.objects.filter(serial_number=value).exists():
                raise serializers.ValidationError("This serial number is already in use.")
        return value

    def validate_quantity_to_order(self, value):
        """Ensure quantity to order doesn't exceed approved quantity"""
        if value < 0:
            raise serializers.ValidationError("Quantity to order cannot be negative.")
        return value

    def validate(self, data):
        """Cross-field validation"""
        quantity_to_order = data.get('quantity_to_order')
        approved_quantity = data.get('approved_quantity_2025')

        # For updates, get existing values if not provided
        if self.instance:
            if quantity_to_order is None:
                quantity_to_order = self.instance.quantity_to_order
            if approved_quantity is None:
                approved_quantity = self.instance.approved_quantity_2025

        if quantity_to_order and approved_quantity:
            if quantity_to_order > approved_quantity:
                raise serializers.ValidationError({
                    'quantity_to_order': 'Quantity to order cannot exceed approved quantity.'
                })

        # Validate monetary values
        estimated_unit = data.get('estimated_unit_cost_usd')
        if estimated_unit and estimated_unit < 0:
            raise serializers.ValidationError({
                'estimated_unit_cost_usd': 'Unit cost cannot be negative.'
            })

        return data

    def create(self, validated_data):
        """Create budget line with current user as creator"""
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['created_by'] = request.user
        return super().create(validated_data)


class BudgetSummarySerializer(serializers.Serializer):
    """Serializer for budget summary statistics"""
    total_approved_budget = serializers.DecimalField(max_digits=20, decimal_places=2)
    total_estimated_cost = serializers.DecimalField(max_digits=20, decimal_places=2)
    total_actual_spent = serializers.DecimalField(max_digits=20, decimal_places=2)
    total_remaining = serializers.DecimalField(max_digits=20, decimal_places=2)
    budget_utilization_rate = serializers.FloatField()
    by_status = serializers.DictField()
    by_section = serializers.DictField()
    by_procurement_process = serializers.DictField()