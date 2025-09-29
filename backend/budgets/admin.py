"""
Django admin configuration for budget models.
Add this to your tenders/admin.py or create budget/admin.py
"""

from django.contrib import admin
from django.utils.html import format_html
from .models import BudgetLine, ProcurementTimeline, TenderBudgetAllocation, BudgetAmendment


class ProcurementTimelineInline(admin.TabularInline):
    model = ProcurementTimeline
    extra = 0
    fields = ('stage', 'planned_date', 'actual_date', 'completed', 'responsible_person', 'advertisement_medium')


class TenderBudgetAllocationInline(admin.TabularInline):
    model = TenderBudgetAllocation
    extra = 0
    fields = ('tender', 'allocated_quantity', 'allocated_amount', 'notes')
    readonly_fields = ('tender',)


class BudgetAmendmentInline(admin.TabularInline):
    model = BudgetAmendment
    extra = 0
    fields = ('amendment_number', 'reason', 'status', 'approved_by', 'approved_at')
    readonly_fields = ('requested_by', 'approved_at')


@admin.register(BudgetLine)
class BudgetLineAdmin(admin.ModelAdmin):
    list_display = (
        'serial_number',
        'budget_line',
        'section',
        'item_description_short',
        'approved_quantity_2025',
        'available_quantity_display',
        'estimated_total_cost_usd',
        'status_badge',
        'created_at'
    )

    list_filter = (
        'status',
        'section',
        'procurement_process',
        'currency_type',
        'procuring_entity',
        'created_at'
    )

    search_fields = (
        'serial_number',
        'budget_line',
        'item_description',
        'section',
        'wambo_product_code'
    )

    readonly_fields = (
        'available_quantity_display',
        'budget_utilization_percentage',
        'created_by',
        'created_at',
        'updated_at'
    )

    fieldsets = (
        ('Basic Information', {
            'fields': (
                'serial_number',
                'budget_line',
                'section',
                'item_description',
                'unit',
                'status'
            )
        }),
        ('Budget Allocations', {
            'fields': (
                'approved_quantity_2025',
                'quantity_to_order',
                'available_quantity_display'
            )
        }),
        ('Estimated Costs', {
            'fields': (
                'estimated_unit_cost_usd',
                'estimated_total_cost_usd',
                'estimated_unit_cost_naira',
                'total_cost_naira',
                'currency_type'
            )
        }),
        ('Actual Costs', {
            'fields': (
                'actual_rate',
                'actual_amount',
                'budget_utilization_percentage'
            ),
            'classes': ('collapse',)
        }),
        ('Procurement Planning', {
            'fields': (
                'ppm_responsible',
                'pr_dept',
                'procurement_process',
                'procuring_entity',
                'wambo_product_code',
                'comments'
            )
        }),
        ('Delivery Information', {
            'fields': (
                'selected_suppliers',
                'expected_delivery_lead_time'
            ),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': (
                'created_by',
                'created_at',
                'updated_at'
            ),
            'classes': ('collapse',)
        })
    )

    inlines = [ProcurementTimelineInline, TenderBudgetAllocationInline, BudgetAmendmentInline]

    def item_description_short(self, obj):
        return obj.item_description[:50] + '...' if len(obj.item_description) > 50 else obj.item_description

    item_description_short.short_description = 'Description'

    def status_badge(self, obj):
        colors = {
            'draft': 'gray',
            'approved': 'green',
            'in_progress': 'blue',
            'completed': 'darkgreen',
            'cancelled': 'red',
            'on_hold': 'orange'
        }
        color = colors.get(obj.status, 'gray')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; border-radius: 3px;">{}</span>',
            color,
            obj.get_status_display()
        )

    status_badge.short_description = 'Status'

    def available_quantity_display(self, obj):
        available = obj.available_quantity
        total = obj.approved_quantity_2025
        percentage = (available / total * 100) if total > 0 else 0
        color = 'green' if percentage > 50 else 'orange' if percentage > 20 else 'red'
        return format_html(
            '<span style="color: {}; font-weight: bold;">{} / {} ({:.1f}% available)</span>',
            color,
            available,
            total,
            percentage
        )

    available_quantity_display.short_description = 'Available Quantity'

    def save_model(self, request, obj, form, change):
        if not change:  # Creating new object
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(ProcurementTimeline)
class ProcurementTimelineAdmin(admin.ModelAdmin):
    list_display = (
        'budget_line',
        'stage',
        'planned_date',
        'actual_date',
        'status_indicator',
        'responsible_person'
    )

    list_filter = (
        'stage',
        'completed',
        'budget_line__status'
    )

    search_fields = (
        'budget_line__serial_number',
        'budget_line__item_description',
        'notes'
    )

    def status_indicator(self, obj):
        if obj.completed:
            return format_html('<span style="color: green;">✓ Completed</span>')
        elif obj.is_delayed:
            return format_html('<span style="color: red;">⚠ Delayed</span>')
        else:
            return format_html('<span style="color: blue;">⏳ In Progress</span>')

    status_indicator.short_description = 'Status'


@admin.register(TenderBudgetAllocation)
class TenderBudgetAllocationAdmin(admin.ModelAdmin):
    list_display = (
        'budget_line',
        'tender',
        'allocated_quantity',
        'allocated_amount',
        'created_at'
    )

    list_filter = (
        'budget_line__status',
        'tender__status',
        'created_at'
    )

    search_fields = (
        'budget_line__serial_number',
        'tender__reference_number',
        'tender__title'
    )

    readonly_fields = ('created_at',)


@admin.register(BudgetAmendment)
class BudgetAmendmentAdmin(admin.ModelAdmin):
    list_display = (
        'budget_line',
        'amendment_number',
        'status',
        'requested_by',
        'approved_by',
        'created_at'
    )

    list_filter = (
        'status',
        'created_at',
        'approved_at'
    )

    search_fields = (
        'budget_line__serial_number',
        'reason'
    )

    readonly_fields = ('requested_by', 'created_at')

    def save_model(self, request, obj, form, change):
        if not change:
            obj.requested_by = request.user
        super().save_model(request, obj, form, change)