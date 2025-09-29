"""
API views for Budget management
Add to backend/tenders/views.py or create backend/budget/views.py
"""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.db.models import Sum, Q, Count
from django.db import transaction
from decimal import Decimal

from .models import BudgetLine, ProcurementTimeline, TenderBudgetAllocation, BudgetAmendment
from .serializers import (
    BudgetLineListSerializer,
    BudgetLineDetailSerializer,
    BudgetLineCreateUpdateSerializer,
    ProcurementTimelineSerializer,
    TenderBudgetAllocationSerializer,
    BudgetAmendmentSerializer,
    BudgetSummarySerializer
)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def budget_lines_list_create(request):
    """
    GET: List all budget lines with optional filtering
    POST: Create a new budget line
    """

    if request.method == 'GET':
        # Get queryset
        qs = BudgetLine.objects.select_related(
            'procuring_entity',
            'created_by'
        ).order_by('-created_at')

        # Apply filters
        status_filter = request.query_params.get('status')
        section_filter = request.query_params.get('section')
        search = request.query_params.get('search')
        procurement_process = request.query_params.get('procurement_process')
        procuring_entity = request.query_params.get('procuring_entity')

        if status_filter:
            qs = qs.filter(status=status_filter)

        if section_filter:
            qs = qs.filter(section__icontains=section_filter)

        if procurement_process:
            qs = qs.filter(procurement_process=procurement_process)

        if procuring_entity:
            qs = qs.filter(procuring_entity_id=procuring_entity)

        if search:
            qs = qs.filter(
                Q(serial_number__icontains=search) |
                Q(budget_line__icontains=search) |
                Q(item_description__icontains=search) |
                Q(section__icontains=search) |
                Q(wambo_product_code__icontains=search)
            )

        serializer = BudgetLineListSerializer(qs, many=True)
        return Response({
            'results': serializer.data,
            'count': qs.count()
        })

    # POST - Create new budget line
    serializer = BudgetLineCreateUpdateSerializer(
        data=request.data,
        context={'request': request}
    )

    if serializer.is_valid():
        budget_line = serializer.save()

        # Return detailed response
        detail_serializer = BudgetLineDetailSerializer(budget_line)
        return Response(
            detail_serializer.data,
            status=status.HTTP_201_CREATED
        )

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def budget_line_detail(request, pk):
    """
    GET: Retrieve a single budget line with all related data
    PUT/PATCH: Update a budget line
    DELETE: Delete a budget line
    """
    budget_line = get_object_or_404(BudgetLine, pk=pk)

    # Permission check: only creator or admin can modify
    if request.method in ['PUT', 'PATCH', 'DELETE']:
        if not (request.user.is_superuser or request.user == budget_line.created_by):
            return Response(
                {'error': 'You do not have permission to modify this budget line.'},
                status=status.HTTP_403_FORBIDDEN
            )

    if request.method == 'GET':
        serializer = BudgetLineDetailSerializer(budget_line)
        return Response(serializer.data)

    elif request.method in ['PUT', 'PATCH']:
        partial = request.method == 'PATCH'
        serializer = BudgetLineCreateUpdateSerializer(
            budget_line,
            data=request.data,
            partial=partial,
            context={'request': request}
        )

        if serializer.is_valid():
            updated_budget_line = serializer.save()
            detail_serializer = BudgetLineDetailSerializer(updated_budget_line)
            return Response(detail_serializer.data)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        # Check if budget line has tender allocations
        if budget_line.tender_allocations.exists():
            return Response(
                {'error': 'Cannot delete budget line with active tender allocations. Remove allocations first.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        budget_line.delete()
        return Response(
            {'message': 'Budget line deleted successfully'},
            status=status.HTTP_204_NO_CONTENT
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def budget_summary(request):
    """
    Get summary statistics for budget lines
    """
    qs = BudgetLine.objects.all()

    # Apply filters if provided
    status_filter = request.query_params.get('status')
    section_filter = request.query_params.get('section')

    if status_filter:
        qs = qs.filter(status=status_filter)
    if section_filter:
        qs = qs.filter(section__icontains=section_filter)

    # Calculate totals
    aggregates = qs.aggregate(
        total_approved=Sum('approved_quantity_2025'),
        total_estimated=Sum('estimated_total_cost_usd'),
        total_actual=Sum('actual_amount')
    )

    total_approved = float(aggregates['total_approved'] or 0)
    total_estimated = float(aggregates['total_estimated'] or 0)
    total_actual = float(aggregates['total_actual'] or 0)
    total_remaining = total_estimated - total_actual
    utilization_rate = (total_actual / total_estimated * 100) if total_estimated > 0 else 0

    # Group by status
    by_status = {}
    status_groups = qs.values('status').annotate(
        count=Count('id'),
        total_amount=Sum('estimated_total_cost_usd')
    )
    for group in status_groups:
        by_status[group['status']] = {
            'count': group['count'],
            'total_amount': float(group['total_amount'] or 0)
        }

    # Group by section
    by_section = {}
    section_groups = qs.values('section').annotate(
        count=Count('id'),
        total_amount=Sum('estimated_total_cost_usd')
    )
    for group in section_groups:
        by_section[group['section']] = {
            'count': group['count'],
            'total_amount': float(group['total_amount'] or 0)
        }

    # Group by procurement process
    by_procurement = {}
    proc_groups = qs.exclude(procurement_process='').values('procurement_process').annotate(
        count=Count('id'),
        total_amount=Sum('estimated_total_cost_usd')
    )
    for group in proc_groups:
        by_procurement[group['procurement_process']] = {
            'count': group['count'],
            'total_amount': float(group['total_amount'] or 0)
        }

    summary_data = {
        'total_approved_budget': total_approved,
        'total_estimated_cost': total_estimated,
        'total_actual_spent': total_actual,
        'total_remaining': total_remaining,
        'budget_utilization_rate': round(utilization_rate, 2),
        'by_status': by_status,
        'by_section': by_section,
        'by_procurement_process': by_procurement,
        'total_lines': qs.count()
    }

    return Response(summary_data)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def budget_line_timeline(request, budget_line_id):
    """
    GET: List timeline milestones for a budget line
    POST: Add/update timeline milestone
    """
    budget_line = get_object_or_404(BudgetLine, pk=budget_line_id)

    if request.method == 'GET':
        milestones = ProcurementTimeline.objects.filter(
            budget_line=budget_line
        ).select_related('responsible_person').order_by('stage')

        serializer = ProcurementTimelineSerializer(milestones, many=True)
        return Response(serializer.data)

    # POST - Create or update milestone
    data = request.data.copy()
    data['budget_line'] = budget_line.id

    # Check if milestone already exists for this stage
    stage = data.get('stage')
    if stage:
        existing = ProcurementTimeline.objects.filter(
            budget_line=budget_line,
            stage=stage
        ).first()

        if existing:
            # Update existing
            serializer = ProcurementTimelineSerializer(
                existing,
                data=data,
                partial=True
            )
        else:
            # Create new
            serializer = ProcurementTimelineSerializer(data=data)
    else:
        serializer = ProcurementTimelineSerializer(data=data)

    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def timeline_milestone_detail(request, pk):
    """
    PATCH: Update a timeline milestone
    DELETE: Remove a timeline milestone
    """
    milestone = get_object_or_404(ProcurementTimeline, pk=pk)

    if request.method == 'PATCH':
        serializer = ProcurementTimelineSerializer(
            milestone,
            data=request.data,
            partial=True
        )

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        milestone.delete()
        return Response(
            {'message': 'Milestone deleted successfully'},
            status=status.HTTP_204_NO_CONTENT
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def bulk_create_budget_lines(request):
    """
    Bulk create budget lines from array of data
    Useful for Excel import functionality
    """
    budget_lines_data = request.data.get('budget_lines', [])

    if not budget_lines_data:
        return Response(
            {'error': 'budget_lines array is required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    created_lines = []
    errors = []

    with transaction.atomic():
        for idx, line_data in enumerate(budget_lines_data):
            serializer = BudgetLineCreateUpdateSerializer(
                data=line_data,
                context={'request': request}
            )

            if serializer.is_valid():
                budget_line = serializer.save()
                created_lines.append({
                    'serial_number': budget_line.serial_number,
                    'id': budget_line.id
                })
            else:
                errors.append({
                    'index': idx,
                    'serial_number': line_data.get('serial_number', 'N/A'),
                    'errors': serializer.errors
                })

    if errors:
        return Response({
            'message': f'Created {len(created_lines)} budget lines with {len(errors)} errors',
            'created': created_lines,
            'errors': errors
        }, status=status.HTTP_207_MULTI_STATUS)

    return Response({
        'message': f'Successfully created {len(created_lines)} budget lines',
        'created': created_lines
    }, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def budget_options(request):
    """
    Return dropdown options for budget line form fields
    """
    # Get unique sections
    sections = BudgetLine.objects.values_list('section', flat=True).distinct().order_by('section')

    # Get unique units
    units = BudgetLine.objects.values_list('unit', flat=True).distinct().order_by('unit')

    # Get procuring entities
    from users.models import ProcuringEntity
    entities = ProcuringEntity.objects.filter(is_active=True).values('id', 'name')

    return Response({
        'sections': list(sections),
        'units': list(units),
        'procuring_entities': list(entities),
        'currency_choices': dict(BudgetLine.CURRENCY_CHOICES),
        'procurement_process_choices': dict(BudgetLine.PROCUREMENT_PROCESS_CHOICES),
        'status_choices': dict(BudgetLine.STATUS_CHOICES)
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def budget_analytics(request):
    """
    Advanced analytics for budget performance
    """
    # Timeline adherence
    total_milestones = ProcurementTimeline.objects.count()
    completed_on_time = ProcurementTimeline.objects.filter(
        completed=True
    ).filter(
        Q(actual_date__lte=models.F('planned_date')) | Q(planned_date__isnull=True)
    ).count()

    delayed_milestones = ProcurementTimeline.objects.filter(
        completed=False,
        planned_date__lt=models.functions.Now()
    ).count()

    timeline_adherence_rate = (completed_on_time / total_milestones * 100) if total_milestones > 0 else 0

    # Budget variance analysis
    budget_lines = BudgetLine.objects.exclude(actual_amount__isnull=True)
    variance_data = []

    for line in budget_lines:
        if line.estimated_total_cost_usd and line.actual_amount:
            variance = float(line.actual_amount - line.estimated_total_cost_usd)
            variance_pct = (variance / float(line.estimated_total_cost_usd)) * 100
            variance_data.append({
                'serial_number': line.serial_number,
                'item': line.item_description[:50],
                'estimated': float(line.estimated_total_cost_usd),
                'actual': float(line.actual_amount),
                'variance': variance,
                'variance_percentage': round(variance_pct, 2)
            })

    # Sort by largest variance
    variance_data.sort(key=lambda x: abs(x['variance']), reverse=True)

    return Response({
        'timeline_metrics': {
            'total_milestones': total_milestones,
            'completed_on_time': completed_on_time,
            'delayed_milestones': delayed_milestones,
            'adherence_rate': round(timeline_adherence_rate, 2)
        },
        'top_variances': variance_data[:10],  # Top 10 variances
        'budget_lines_with_actuals': budget_lines.count()
    })