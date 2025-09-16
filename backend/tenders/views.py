import json
import uuid

from django.db import transaction
from django.utils.timezone import now
from django.views.decorators.csrf import csrf_protect
from django.utils.decorators import method_decorator
from rest_framework.decorators import api_view, permission_classes
from django.db.models import Count
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from django.shortcuts import get_object_or_404
from bids.models import Contract, Bid, EvaluationCommittee, CommitteeMember
from users.models import ProcuringEntity
from django.contrib.auth import get_user_model
from .models import Category, Tender, TenderUploadDocuments, TenderDocument
from .serializer import TenderCreateSerializer, CategorySerializer, TenderListSerializer, TenderUpdateSerializer, TenderDetailSerializer
from rest_framework.parsers import JSONParser


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_tender(request):
    try:
        with transaction.atomic():  # Ensure all operations succeed or none do
            # Parse the main tender data
            tender_data_str = request.data.get('tender_data')
            if not tender_data_str:
                return Response(
                    {'error': 'tender_data is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            tender_data = json.loads(tender_data_str)

            # Generate reference number (you might want a more sophisticated system)
            reference_number = f"TND-{now().year}-{str(uuid.uuid4())[:8].upper()}"

            # Validate foreign key relationships
            try:
                category = Category.objects.get(id=tender_data['category'])
                procuring_entity = ProcuringEntity.objects.get(id=tender_data['procuring_entity'])
                subcategory = None
                if tender_data.get('subcategory'):
                    subcategory = Category.objects.get(id=tender_data['subcategory'])
            except (Category.DoesNotExist, ProcuringEntity.DoesNotExist):
                return Response(
                    {'error': 'Invalid category or procuring entity'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Create the main tender object
            tender = Tender.objects.create(
                reference_number=reference_number,
                title=tender_data['title'],
                description=tender_data['description'],
                category=category,
                subcategory=subcategory,
                procuring_entity=procuring_entity,
                procurement_method=tender_data['procurement_method'],
                estimated_value=tender_data.get('estimated_value'),
                currency=tender_data.get('currency', 'ZMW'),
                closing_date=tender_data['closing_date'],
                opening_date=tender_data.get('opening_date'),
                bid_validity_period=tender_data.get('bid_validity_period', 90),
                minimum_requirements=tender_data.get('minimum_requirements', ''),
                technical_specifications=tender_data.get('technical_specifications', ''),
                evaluation_criteria=tender_data.get('evaluation_criteria', ''),
                terms_conditions=tender_data.get('terms_conditions', ''),
                tender_security_required=tender_data.get('tender_security_required', False),
                tender_security_amount=tender_data.get('tender_security_amount'),
                tender_security_type=tender_data.get('tender_security_type'),
                allow_variant_bids=tender_data.get('allow_variant_bids', False),
                allow_electronic_submission=tender_data.get('allow_electronic_submission', True),
                auto_extend_on_amendment=tender_data.get('auto_extend_on_amendment', True),
                status=tender_data.get('status', 'draft'),
                created_by=request.user
            )

            # Create document upload requirements
            upload_requirements_str = request.data.get('upload_document_requirements')
            if upload_requirements_str:
                upload_requirements = json.loads(upload_requirements_str)
                for req_data in upload_requirements:
                    TenderUploadDocuments.objects.create(
                        tender=tender,
                        name=req_data['name'],
                        file_type=req_data['file_type'],
                        max_file_size=req_data['max_file_size'],
                        mandatory=req_data['mandatory']
                    )

            # Handle uploaded documents
            document_count = int(request.data.get('document_count', 0))
            uploaded_files = request.FILES.getlist('document_files')

            for i, uploaded_file in enumerate(uploaded_files):
                if i < document_count:
                    metadata_str = request.data.get(f'document_metadata_{i}')
                    if metadata_str:
                        metadata = json.loads(metadata_str)

                        TenderDocument.objects.create(
                            tender=tender,
                            document_name=metadata.get('document_name', uploaded_file.name),
                            document_type=metadata.get('document_type', 'other'),
                            file=uploaded_file,
                            file_size=uploaded_file.size,
                            mime_type=uploaded_file.content_type or '',
                            is_mandatory=metadata.get('is_mandatory', False),
                            version=metadata.get('version', '1.0'),
                            uploaded_by=request.user
                        )

            # Return success response
            return Response({
                'id': str(tender.id),
                'reference_number': tender.reference_number,
                'message': 'Tender created successfully',
                'status': tender.status
            }, status=status.HTTP_201_CREATED)

    except json.JSONDecodeError:
        return Response(
            {'error': 'Invalid JSON data'},
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        return Response(
            {'error': f'An error occurred: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@method_decorator(csrf_protect, name='dispatch')
class TenderListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Tender.objects.all().order_by('-created_at')
        serializer = TenderListSerializer(qs, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = TenderCreateSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            tender = serializer.save()
            out = TenderListSerializer(tender).data
            return Response(out, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticatedOrReadOnly])
def tender_detail(request, tender_id):
    """
    Retrieve a single tender by UUID.
    """
    try:
        # Optional UUID validation (in case URL doesn't use <uuid:...> converter)
        uuid.UUID(str(tender_id))
    except ValueError:
        return Response({'error': 'Invalid tender ID format'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        tender = (
            Tender.objects
            .select_related('procuring_entity', 'category', 'subcategory', 'created_by')
            .get(id=tender_id)
        )
    except Tender.DoesNotExist:
        return Response({'error': 'Tender not found'}, status=status.HTTP_404_NOT_FOUND)

    data = TenderDetailSerializer(tender).data
    return Response(data, status=status.HTTP_200_OK)


@api_view(['PATCH', 'PUT'])
@permission_classes([IsAuthenticated])
def update_tender(request, tender_id):
    """Update tender details and allow changing status."""
    try:
        uuid.UUID(str(tender_id))
    except ValueError:
        return Response({'error': 'Invalid tender ID format'}, status=status.HTTP_400_BAD_REQUEST)

    tender = get_object_or_404(Tender, id=tender_id)

    # Permissions: only creator or entity staff; keep minimal rule here
    user = request.user
    if not (user.is_superuser or user == tender.created_by):
        # If user belongs to the same procuring entity, allow
        try:
            from users.models import EntityUser
            link = EntityUser.objects.filter(user=user, entity=tender.procuring_entity, status='active').exists()
        except Exception:
            link = False
        if not link:
            return Response({'error': 'Not authorized to update this tender.'}, status=status.HTTP_403_FORBIDDEN)

    partial = request.method == 'PATCH'
    serializer = TenderUpdateSerializer(instance=tender, data=request.data, partial=partial)
    if serializer.is_valid():
        tender = serializer.save()
        return Response(TenderListSerializer(tender).data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@method_decorator(csrf_protect, name='dispatch')
class CategoryListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Optional filtering: parent_id to fetch subcategories
        parent_id = request.query_params.get('parent_id')
        qs = Category.objects.all().order_by('name')
        if parent_id is not None:
            if parent_id == "":
                qs = qs.filter(parent__isnull=True)
            else:
                qs = qs.filter(parent_id=parent_id)
        serializer = CategorySerializer(qs, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = CategorySerializer(data=request.data)
        if serializer.is_valid():
            category = serializer.save()
            return Response(CategorySerializer(category).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def tender_bids(request, tender_id):
    """Return simplified list of bids for a tender for evaluation UI."""
    tender = get_object_or_404(Tender, id=tender_id)
    # get all bids for the tender; include supplier data
    qs = Bid.objects.filter(tender=tender).select_related('supplier')
    out = []
    for b in qs:
        bidder_name = getattr(b.supplier, 'full_name', None) or getattr(b.supplier, 'name', None) or b.supplier.get_username()
        out.append({
            'id': str(b.id),
            'bidder_name': bidder_name,
            'submitted_amount': float(b.total_bid_amount) if b.total_bid_amount is not None else None,
            'currency': b.currency,
            'status': b.status,
        })
    return Response(out)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_evaluation_recommendation(request, tender_id):
    """
    Accepts evaluation details and summary rows; updates Bid scores and rankings.
    Body: { evaluation: {...}, summary: [{id, techScore, financialScore, combinedScore, rank}] }
    """
    tender = get_object_or_404(Tender, id=tender_id)
    data = request.data or {}
    summary = data.get('summary') or []

    # Validate bid IDs belong to tender
    bid_map = {str(b.id): b for b in Bid.objects.filter(tender=tender)}
    updated = []
    top = None
    for row in summary:
        bid_id = str(row.get('id'))
        bid = bid_map.get(bid_id)
        if not bid:
            continue
        # Update scores and ranking
        tech = row.get('techScore')
        fin = row.get('financialScore')
        total = row.get('combinedScore')
        rank = row.get('rank')
        if tech is not None:
            bid.technical_score = tech
        if fin is not None:
            bid.financial_score = fin
        if total is not None:
            bid.total_score = total
        if rank is not None:
            bid.ranking = rank
        # Optionally update status for winner only; do minimal changes
        bid.save()
        updated.append(str(bid.id))
        if rank == 1 and top is None:
            top = {
                'bid_id': str(bid.id),
                'bidder_name': getattr(bid.supplier, 'full_name', None) or getattr(bid.supplier, 'name', None) or bid.supplier.get_username(),
                'combinedScore': total,
            }

    return Response({'message': 'Evaluation recommendation recorded', 'updated_bids': updated, 'top_recommendation': top})


class DashboardView(APIView):
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get(self, request):
        active_tenders = Tender.objects.filter(status__in=['draft','published']).count()
        pending_eval = Tender.objects.filter(status__in=['draft','published']).count()  # adjust to your workflow
        active_contracts = Contract.objects.filter(status='active').count()
        UserModel = get_user_model()
        total_suppliers = UserModel.objects.filter(user_type='supplier').count()

        recent_tenders_qs = (
            Tender.objects.order_by('-created_at')
            .values('reference_number', 'title', 'status','id')[:3]
        )

        # If no pending action model, return placeholders or an empty list
        pending_actions = []  # or compute based on your rules

        data = {
            "stats": [
                {"label": "Active Tenders", "value": active_tenders},
                {"label": "Pending Evaluation", "value": pending_eval},
                {"label": "Active Contracts", "value": active_contracts},
                {"label": "Total Suppliers", "value": total_suppliers},
            ],
            "recent_tenders": list(recent_tenders_qs),
            "pending_actions": pending_actions,
        }
        return Response(data)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def evaluation_committee(request, tender_id):
    """Get or create/update the evaluation committee for a tender."""
    tender = get_object_or_404(Tender, id=tender_id)

    # Minimal permission: creator or same entity staff
    user = request.user
    if not (user.is_superuser or user == tender.created_by):
        try:
            from users.models import EntityUser
            link = EntityUser.objects.filter(user=user, entity=tender.procuring_entity, status='active').exists()
        except Exception:
            link = False
        if not link:
            return Response({'error': 'Not authorized.'}, status=status.HTTP_403_FORBIDDEN)

    if request.method == 'GET':
        committee = (
            EvaluationCommittee.objects.filter(tender=tender, status='active')
            .select_related('chairperson')
            .first()
        )
        if not committee:
            return Response({'committee': None, 'members': []})
        members = CommitteeMember.objects.filter(committee=committee).select_related('user')
        out_members = []
        for m in members:
            out_members.append({
                'id': m.id,
                'user_id': m.user_id,
                'name': getattr(m.user, 'get_full_name', lambda: None)() or m.user.username,
                'role': m.role,
                'expertise': m.expertise_area,
            })
        return Response({
            'committee': {
                'id': committee.id,
                'name': committee.committee_name,
                'chairperson_id': committee.chairperson_id,
                'status': committee.status,
                'appointment_date': committee.appointment_date,
            },
            'members': out_members,
        })

    # POST create/update
    data = request.data or {}
    committee_name = data.get('committee_name') or data.get('name') or 'Evaluation Committee'
    chairperson_id = data.get('chairperson_id')
    members = data.get('members') or []

    if not chairperson_id:
        return Response({'error': 'chairperson_id is required'}, status=status.HTTP_400_BAD_REQUEST)

    from django.contrib.auth import get_user_model
    UserModel = get_user_model()
    try:
        chair = UserModel.objects.get(id=chairperson_id)
    except UserModel.DoesNotExist:
        return Response({'error': 'Chairperson not found'}, status=status.HTTP_400_BAD_REQUEST)

    with transaction.atomic():
        committee, _ = EvaluationCommittee.objects.update_or_create(
            tender=tender,
            defaults={
                'committee_name': committee_name,
                'chairperson': chair,
                'status': 'active',
                'appointment_date': now().date(),
            }
        )
        # Replace members
        CommitteeMember.objects.filter(committee=committee).delete()
        created = []
        for m in members:
            uid = m.get('user_id') or m.get('id')
            role = m.get('role') or 'member'
            expertise = m.get('expertise') or ''
            if not uid:
                continue
            try:
                u = UserModel.objects.get(id=uid)
            except UserModel.DoesNotExist:
                continue
            cm = CommitteeMember.objects.create(
                committee=committee,
                user=u,
                role=role,
                expertise_area=expertise,
            )
            created.append({'id': cm.id, 'user_id': u.id, 'role': cm.role, 'expertise': cm.expertise_area})

    return Response({'message': 'Committee saved', 'committee_id': committee.id, 'members': created}, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def evaluation_summary(request, tender_id):
    """Return current evaluation summary (scores and ranking) for a tender."""
    tender = get_object_or_404(Tender, id=tender_id)
    qs = Bid.objects.filter(tender=tender).select_related('supplier')
    out = []
    for b in qs:
        out.append({
            'id': str(b.id),
            'bidder_name': getattr(b.supplier, 'get_full_name', lambda: None)() or b.supplier.get_username(),
            'technical_score': float(b.technical_score) if b.technical_score is not None else None,
            'financial_score': float(b.financial_score) if b.financial_score is not None else None,
            'total_score': float(b.total_score) if b.total_score is not None else None,
            'ranking': b.ranking,
            'status': b.status,
        })
    # sort by ranking if exists
    out.sort(key=lambda r: (r['ranking'] if r['ranking'] is not None else 1_000_000))
    return Response({'bids': out})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def evaluation_overview(request):
    """Return high-level evaluation KPIs for the procuring side dashboard.

    - pending_evaluations: tenders currently in evaluation stage
    - completed_this_month: contracts created this calendar month
    - avg_days_to_complete: average days from tender creation to contract creation
    """
    from django.utils.timezone import now
    from django.db.models import F
    today = now().date()
    first_day = today.replace(day=1)

    # Pending: tenders at evaluation stage (fallback: closed but not awarded)
    pending_qs = Tender.objects.filter(tender_stage='evaluation')
    if not pending_qs.exists():
        pending_qs = Tender.objects.filter(status__in=['closed']).exclude(contract__isnull=False)

    pending_evaluations = pending_qs.count()

    # Completed this month: contracts created this month
    contracts_this_month = Contract.objects.filter(created_at__date__gte=first_day, created_at__date__lte=today)
    completed_this_month = contracts_this_month.count()

    # Average days to complete: across all contracts, from tender.created_at to contract.created_at
    from django.db.models.functions import ExtractDay
    durations = []
    for c in Contract.objects.select_related('tender').all():
        t_created = getattr(c.tender, 'created_at', None)
        c_created = getattr(c, 'created_at', None)
        if t_created and c_created:
            durations.append((c_created - t_created).days)
    avg_days_to_complete = round(sum(durations) / len(durations), 1) if durations else 0.0

    return Response({
        'pending_evaluations': pending_evaluations,
        'completed_this_month': completed_this_month,
        'avg_days_to_complete': avg_days_to_complete,
    })

from rest_framework.parsers import JSONParser


# Procurement analytics endpoint
@api_view(['GET'])
@permission_classes([IsAuthenticatedOrReadOnly])
def procurement_analytics(request):
    """Return basic procurement analytics metrics.
    - average_bid_count_per_tender: average number of bids per tender across all tenders
    - average_evaluation_time_days: average days from tender closing_date to the last evaluation entry per tender
    """
    try:
        tenders_qs = Tender.objects.all()
        total_tenders = tenders_qs.count()

        # Average bid count per tender
        if total_tenders:
            bid_counts = list(
                tenders_qs.annotate(c=Count('bids')).values_list('c', flat=True)
            )
            avg_bid_count = round(sum(bid_counts) / total_tenders, 2)
        else:
            avg_bid_count = 0.0

        # Average evaluation time (days) from closing_date to last evaluation date
        from bids.models import BidEvaluation
        eval_durations = []
        if total_tenders:
            for t in tenders_qs.only('id', 'closing_date'):
                if not t.closing_date:
                    continue
                last_eval_dt = (
                    BidEvaluation.objects.filter(bid__tender=t)
                    .order_by('-evaluation_date')
                    .values_list('evaluation_date', flat=True)
                    .first()
                )
                if last_eval_dt:
                    delta = last_eval_dt - t.closing_date
                    days = delta.total_seconds() / 86400.0
                    # include even if negative; but clamp at 0 for reporting sanity
                    eval_durations.append(days if days >= 0 else 0)
        avg_eval_days = round(sum(eval_durations) / len(eval_durations), 2) if eval_durations else None

        return Response({
            'average_bid_count_per_tender': avg_bid_count,
            'average_evaluation_time_days': avg_eval_days,
        })
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
