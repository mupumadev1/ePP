from django.shortcuts import get_object_or_404
from django.utils.timezone import now
from django.db.models import Q, Count, Avg
from rest_framework.decorators import api_view, permission_classes
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser
from django.http import FileResponse, Http404

from tenders.models import Tender, TenderUploadDocuments
from users.models import EntityUser, ProcuringEntity
from .models import Bid, BidDocument, Contract, BidEvaluation, EvaluationCriterion, TenderEvaluationConfig
from .serializer import OpportunitySerializer, BidListSerializer, BidCreateSerializer, RecomputeEvaluationSerializer, \
    UpsertBidCriterionScoresSerializer, EvaluationCriterionSerializer, TenderEvaluationConfigSerializer, \
    ensure_bid_has_required_uploads


class OpportunitiesListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Tender.objects.filter(status='published', closing_date__gt=now())
        search = request.query_params.get('search')
        category = request.query_params.get('category')
        status_param = request.query_params.get('status')
        ordering = request.query_params.get('ordering') or '-created_at'

        if search:
            qs = qs.filter(Q(title__icontains=search) | Q(reference_number__icontains=search))
        if category:
            qs = qs.filter(Q(category__name__iexact=category) | Q(category__id=category))
        if status_param == 'closed':
            qs = Tender.objects.filter(status='closed')
        elif status_param == 'open':
            qs = Tender.objects.filter(status='published', closing_date__gt=now())

        if ordering:
            qs = qs.order_by(ordering)

        serializer = OpportunitySerializer(qs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class MyBidsListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Bid.objects.filter(supplier=request.user).select_related('tender')
        serializer = BidListSerializer(qs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class CreateBidView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, tender_id):
        tender = get_object_or_404(Tender, id=tender_id, status='published')
        data = request.data.copy()
        # Normalize camelCase from frontend into snake_case expected by serializer/model
        mapping = {
            'totalBidAmount': 'total_bid_amount',
            'vatAmount': 'vat_amount',
            'vatInclusive': 'vat_inclusive',
            'bidValidityDays': 'bid_validity_days',
            'deliveryPeriod': 'delivery_period',
            'paymentTerms': 'payment_terms',
            'warrantyPeriod': 'warranty_period',
            'technicalProposal': 'technical_proposal',
            'projectTimeline': 'project_timeline',
        }
        for k, v in list(data.items()):
            if k in mapping:
                data[mapping[k]] = v
        # items come as camelCase keys; pass through as is, serializer handles inner mapping
        data['tender'] = str(tender.id)
        serializer = BidCreateSerializer(data=data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        bid = serializer.save()
        return Response({'id': bid.id}, status=status.HTTP_201_CREATED)


@api_view(['GET', 'PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def tender_evaluation_config_view(request, tender_id):
    cfg, _ = TenderEvaluationConfig.objects.get_or_create(tender_id=tender_id)
    if request.method == 'GET':
        return Response(TenderEvaluationConfigSerializer(cfg).data)
    partial = request.method == 'PATCH'
    ser = TenderEvaluationConfigSerializer(cfg, data=request.data, partial=partial)
    if ser.is_valid():
        ser.save()
        return Response(ser.data)
    return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

# Criteria list/create
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def criteria_list_create(request, tender_id):
    if request.method == 'GET':
        qs = EvaluationCriterion.objects.filter(tender_id=tender_id).order_by('section', 'order', 'name')
        return Response(EvaluationCriterionSerializer(qs, many=True).data)
    data = request.data.copy()
    # Do not accept tender from client; bind it from URL to avoid read-only/ownership issues
    ser = EvaluationCriterionSerializer(data=data)
    if ser.is_valid():
        # Bind FK via keyword arg since 'tender' is read-only in serializer
        obj = ser.save(tender_id=tender_id)
        return Response(EvaluationCriterionSerializer(obj).data, status=status.HTTP_201_CREATED)
    return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

# Criterion retrieve/update/delete
@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def criterion_detail_view(request, tender_id, criterion_id):
    try:
        obj = EvaluationCriterion.objects.get(id=criterion_id, tender_id=tender_id)
    except EvaluationCriterion.DoesNotExist:
        return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(EvaluationCriterionSerializer(obj).data)

    if request.method in ['PUT', 'PATCH']:
        partial = request.method == 'PATCH'
        ser = EvaluationCriterionSerializer(obj, data=request.data, partial=partial)
        if ser.is_valid():
            ser.save()
            return Response(ser.data)
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

    obj.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)

# Upsert per-criterion scores
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upsert_evaluation_scores(request, evaluation_id):
    try:
        evaluation = BidEvaluation.objects.select_related('bid', 'evaluator').get(id=evaluation_id)
    except BidEvaluation.DoesNotExist:
        return Response({'error': 'Evaluation not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.user != evaluation.evaluator and not request.user.is_superuser:
        return Response({'error': 'Not authorized for this evaluation'}, status=status.HTTP_403_FORBIDDEN)

    ser = UpsertBidCriterionScoresSerializer(data=request.data, context={'evaluation': evaluation})
    if ser.is_valid():
        ser.save()
        return Response({'status': 'ok'})
    return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

# Recompute totals
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def recompute_evaluation_totals(request, evaluation_id):
    try:
        evaluation = BidEvaluation.objects.select_related('bid__tender', 'evaluator').get(id=evaluation_id)
    except BidEvaluation.DoesNotExist:
        return Response({'error': 'Evaluation not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.user != evaluation.evaluator and not request.user.is_superuser:
        return Response({'error': 'Not authorized for this evaluation'}, status=status.HTTP_403_FORBIDDEN)

    ser = RecomputeEvaluationSerializer(data={}, context={'evaluation': evaluation})
    # No fields to validate; directly save
    evaluation = ser.save()
    return Response({
        'technical_compliance': evaluation.technical_compliance,
        'technical_score': evaluation.technical_score,
        'financial_score': evaluation.financial_score,
        'overall_score': evaluation.overall_score,
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def tender_required_uploads(request, tender_id):
    # From tender configuration (authoritative list for submission UX)
    tender_uploads = []
    try:
        from tenders.models import TenderUploadDocuments
        for u in TenderUploadDocuments.objects.filter(tender_id=tender_id).order_by('name'):
            tender_uploads.append({
                'id': str(u.id),
                'name': u.name,
                'description': '',
                'mandatory': u.mandatory,
                'document_type': u.file_type,
                'max_file_size': u.max_file_size,
                'source': 'tender',  # UI should rely on these as the upload checklist
                'order': 0,
            })
    except Exception:
        pass

    # From evaluation criteria (upload-type); useful for evaluators and consistency checks
    crit_uploads = []
    for c in EvaluationCriterion.objects.filter(tender_id=tender_id, criterion_type='upload').order_by('order', 'name'):
        crit_uploads.append({
            'id': str(c.id),
            'name': c.name,
            'description': c.description,
            'mandatory': c.mandatory,
            'document_type': getattr(c.expected_upload, 'file_type', None),
            'max_file_size': getattr(c.expected_upload, 'max_file_size', None),
            'source': 'criterion',
            'order': c.order,
        })

    return Response({
        'tender_uploads': tender_uploads,
        'criteria_uploads': crit_uploads,
    })


# Required uploads for a tender (exposes upload-type criteria)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def tender_required_uploads(request, tender_id):
    qs = EvaluationCriterion.objects.filter(
        tender_id=tender_id,
        criterion_type='upload'
    ).order_by('order', 'name')
    data = [
        {
            'id': str(c.id),
            'name': c.name,
            'description': c.description,
            'mandatory': c.mandatory,
            'expected_document_type': c.expected_document_type,
            'section': c.section,
            'order': c.order,
        } for c in qs
    ]
    return Response(data)


class BidDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, bid_id):
        bid = get_object_or_404(Bid, id=bid_id, supplier=request.user)
        serializer = BidCreateSerializer(bid)
        return Response(serializer.data)

    def patch(self, request, bid_id):
        bid = get_object_or_404(Bid, id=bid_id, supplier=request.user)
        # Prevent editing when submitted unless explicitly allowed via status change back to draft
        if bid.status == 'submitted' and request.data.get('status') not in ['draft', 'withdrawn']:
            return Response({'error': 'Cannot edit a submitted bid. Unsubmit to draft first.'}, status=400)
        data = request.data.copy()
        # Normalize camelCase keys
        mapping = {
            'totalBidAmount': 'total_bid_amount',
            'vatAmount': 'vat_amount',
            'vatInclusive': 'vat_inclusive',
            'bidValidityDays': 'bid_validity_days',
            'deliveryPeriod': 'delivery_period',
            'paymentTerms': 'payment_terms',
            'warrantyPeriod': 'warranty_period',
            'technicalProposal': 'technical_proposal',
            'projectTimeline': 'project_timeline',
        }
        for k, v in list(data.items()):
            if k in mapping:
                data[mapping[k]] = v
        serializer = BidCreateSerializer(bid, data=data, partial=True, context={'request': request})
        serializer.is_valid(raise_exception=True)
        updated = serializer.save()
        return Response({'id': str(updated.id), 'status': updated.status})


class SubmitBidView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, bid_id):
        try:
            bid = Bid.objects.select_related('tender', 'supplier').get(id=bid_id)
        except Bid.DoesNotExist:
            return Response({'error': 'Bid not found'}, status=status.HTTP_404_NOT_FOUND)

            # Permission: only the supplier who owns the bid (or superuser)
        if request.user != bid.supplier and not request.user.is_superuser:
            return Response({'error': 'Not authorized to submit this bid'}, status=status.HTTP_403_FORBIDDEN)

            # Basic state checks (optional hardening)
        if bid.status == 'submitted':
            return Response({'error': 'Bid is already submitted'}, status=status.HTTP_400_BAD_REQUEST)

            # Enforce required uploads as defined on the tender
        ok, missing = ensure_bid_has_required_uploads(bid)
        if not ok:
            return Response(
                {
                    'error': 'Missing mandatory documents',
                    'missing_documents': missing
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # All good: submit
        bid.status = 'submitted'
        bid.submitted_at = now()
        bid.save(update_fields=['status', 'submitted_at'])

        return Response({'status': 'submitted', 'submitted_at': bid.submitted_at}, status=status.HTTP_200_OK)
    # ...


class UnsubmitBidView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, bid_id):
        bid = get_object_or_404(Bid, id=bid_id, supplier=request.user)
        if bid.status != 'submitted':
            return Response({'error': 'Only submitted bids can be unsubmitted.'}, status=400)
        if not bid.tender.is_open:
            return Response({'error': 'Tender is closed; cannot unsubmit.'}, status=400)
        bid.status = 'draft'
        bid.submitted_at = None
        bid.save()
        return Response({'status': 'draft'})


class ChangeBidStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, bid_id):
        bid = get_object_or_404(Bid, id=bid_id, supplier=request.user)
        target = request.data.get('status')
        allowed = {'draft', 'submitted', 'withdrawn'}
        if target not in allowed:
            return Response({'error': 'Invalid status'}, status=400)
        if target == 'submitted':
            if not bid.tender.is_open:
                return Response({'error': 'Tender is not open for submissions.'}, status=400)
            bid.status = 'submitted'
            bid.submitted_at = now()
        elif target == 'draft':
            if bid.status != 'submitted':
                bid.status = 'draft'
            else:
                # allow explicit unsubmit via this endpoint as well
                if not bid.tender.is_open:
                    return Response({'error': 'Tender is closed; cannot unsubmit.'}, status=400)
                bid.status = 'draft'
                bid.submitted_at = None
        elif target == 'withdrawn':
            bid.status = 'withdrawn'
        bid.save()
        return Response({'status': bid.status, 'submitted_at': bid.submitted_at})


class BidDocumentUploadView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, bid_id):
        bid = get_object_or_404(Bid, id=bid_id, supplier=request.user)
        files = request.FILES.getlist('documents')
        saved = []
        for f in files:
            doc = BidDocument.objects.create(
                bid=bid,
                document_name=f.name,
                document_type='other',
                file=f,
                file_size=f.size,
                mime_type=f.content_type or ''
            )
            saved.append({'id': str(doc.id), 'name': doc.document_name})
        return Response({'uploaded': saved}, status=status.HTTP_201_CREATED)


class MyContractsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Contract.objects.filter(supplier=request.user).select_related('tender')
        out = []
        for c in qs:
            out.append({
                'id': str(c.id),
                'contract_number': c.contract_number,
                'title': c.contract_title,
                'value': float(c.contract_value),
                'currency': c.currency,
                'status': c.status,
                'tender_reference': c.tender.reference_number,
                'start_date': c.start_date,
                'end_date': c.end_date,
            })
        return Response(out)


class EntityContractsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Ensure user belongs to a procuring entity
        link = EntityUser.objects.filter(user=request.user, status='active').select_related('entity').first()
        if not link:
            return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
        qs = Contract.objects.filter(procuring_entity=link.entity).select_related('tender', 'supplier')
        out = []
        for c in qs:
            out.append({
                'id': str(c.id),
                'contract_number': c.contract_number,
                'title': c.contract_title,
                'value': float(c.contract_value),
                'currency': c.currency,
                'status': c.status,
                'tender_reference': c.tender.reference_number,
                'supplier': c.supplier.get_username(),
                'start_date': c.start_date,
                'end_date': c.end_date,
            })
        return Response(out)


class CreateContractView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        data = request.data or {}
        tender_id = data.get('tender_id')
        winning_bid_id = data.get('winning_bid_id')
        try:
            tender = get_object_or_404(Tender, id=tender_id)
        except Exception:
            return Response({'error': 'Invalid tender_id'}, status=status.HTTP_400_BAD_REQUEST)

        # Permissions: tender creator or same entity
        user = request.user
        if not (user.is_superuser or user == tender.created_by or EntityUser.objects.filter(user=user, entity=tender.procuring_entity, status='active').exists()):
            return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

        bid = get_object_or_404(Bid, id=winning_bid_id, tender=tender)

        payload = {
            'contract_number': data.get('contract_number') or f"CTR-{tender.reference_number}",
            'tender': tender,
            'winning_bid': bid,
            'supplier': bid.supplier,
            'procuring_entity': tender.procuring_entity,
            'contract_title': data.get('contract_title') or tender.title,
            'contract_value': data.get('contract_value') or bid.total_bid_amount,
            'currency': data.get('currency') or bid.currency,
            'start_date': data.get('start_date'),
            'end_date': data.get('end_date'),
            'delivery_period': data.get('delivery_period', ''),
            'warranty_period': data.get('warranty_period', ''),
            'payment_terms': data.get('payment_terms', ''),
            'performance_guarantee_required': data.get('performance_guarantee_required', False),
            'performance_guarantee_amount': data.get('performance_guarantee_amount'),
            'status': data.get('status', 'draft'),
            'created_by': user,
        }
        # Create or update if exists for tender
        contract, created = Contract.objects.update_or_create(
            tender=tender,
            defaults=payload
        )
        return Response({'id': str(contract.id), 'created': created, 'contract_number': contract.contract_number}, status=status.HTTP_201_CREATED)


class UpdateContractView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, contract_id):
        contract = get_object_or_404(Contract, id=contract_id)
        user = request.user
        # Permissions: supplier (own), creator, or same entity
        if not (
            user.is_superuser
            or user == contract.created_by
            or user == contract.supplier
            or EntityUser.objects.filter(user=user, entity=contract.procuring_entity, status='active').exists()
        ):
            return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

        for field in [
            'status', 'contract_signed_date', 'delivery_period', 'warranty_period', 'payment_terms',
            'performance_guarantee_required', 'performance_guarantee_amount', 'end_date'
        ]:
            if field in request.data:
                setattr(contract, field, request.data.get(field))
        contract.save()
        return Response({'message': 'Updated', 'status': contract.status})


class SupplierPerformanceView(APIView):
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get(self, request):
        """Aggregate supplier performance metrics across bids and contracts.
        Returns list of {supplier_id, supplier_name, bids_won, total_bids, success_rate, performance_score}.
        - bids_won: count of contracts for supplier OR count of bids with status 'winning'. Contracts preferred.
        - total_bids: count of bids where submitted_at is not null (i.e., actually submitted), per supplier.
        - success_rate: bids_won / total_bids * 100 (rounded 2). If total_bids=0, null.
        - performance_score: average Bid.total_score if available; else fallback to average BidEvaluation.overall_score.
        """
        # Aggregate totals from Bid
        bids_qs = Bid.objects.all()
        sums = (
            bids_qs.values('supplier')
            .annotate(
                total_bids=Count('id', filter=~Q(submitted_at=None)),
                avg_bid_score=Avg('total_score'),
                wins_from_bids=Count('id', filter=Q(status='winning')),
            )
        )
        sums_map = {row['supplier']: row for row in sums}

        # Aggregate wins from Contract
        contracts = (
            Contract.objects.values('supplier').annotate(bids_won=Count('id'))
        )
        wins_map = {row['supplier']: row['bids_won'] for row in contracts}

        # Fallback evaluation average where bid average is null
        eval_avgs = (
            BidEvaluation.objects.values('bid__supplier').annotate(avg_eval=Avg('overall_score'))
        )
        eval_map = {row['bid__supplier']: row['avg_eval'] for row in eval_avgs}

        # Build combined list of supplier IDs
        supplier_ids = set(sums_map.keys()) | set(wins_map.keys())

        # Load supplier user names
        from django.contrib.auth import get_user_model
        User = get_user_model()
        users = {u.id: u for u in User.objects.filter(id__in=list(supplier_ids))}

        out = []
        for sid in supplier_ids:
            row = sums_map.get(sid, {})
            total_bids = row.get('total_bids') or 0
            bids_won = wins_map.get(sid, None)
            if bids_won is None:
                # fall back to wins_from_bids when no contract count
                bids_won = row.get('wins_from_bids') or 0
            # success rate
            success_rate = round((bids_won / total_bids) * 100, 2) if total_bids else None
            # performance score
            perf = row.get('avg_bid_score')
            if perf is None:
                perf = eval_map.get(sid)
            perf = round(float(perf), 2) if perf is not None else None
            u = users.get(sid)
            name = None
            if u:
                name = getattr(u, 'get_full_name', lambda: None)() or getattr(u, 'full_name', None) or getattr(u, 'name', None) or u.get_username()
            out.append({
                'supplier_id': str(sid),
                'supplier_name': name,
                'bids_won': bids_won,
                'total_bids': total_bids,
                'success_rate': success_rate,
                'performance_score': perf,
            })

        # Sort by bids_won desc, then performance_score desc
        out.sort(key=lambda x: (x['bids_won'] or 0, x['performance_score'] or 0), reverse=True)
        return Response(out)



class TenderRequiredUploadsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, tender_id):
        # Only allow fetching for published tenders that are still open for submissions
        tender = get_object_or_404(Tender, id=tender_id, status='published')
        # Optionally enforce open window; comment out if you want to show even when closed
        # if not tender.is_open:
        #     return Response({'error': 'Tender is closed.'}, status=status.HTTP_400_BAD_REQUEST)
        reqs = TenderUploadDocuments.objects.filter(tender=tender).order_by('-mandatory', 'name')
        out = [
            {
                'id': str(r.id),
                'name': r.name,
                'file_type': r.file_type,
                'max_file_size': r.max_file_size,
                'mandatory': r.mandatory,
                'tender': str(tender.id),
            }
            for r in reqs
        ]
        return Response(out, status=status.HTTP_200_OK)


class BidDocumentsListForEvaluation(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, bid_id):
        bid = get_object_or_404(Bid, id=bid_id)
        tender = bid.tender
        user = request.user
        # Permissions: superuser, tender creator, or member of the procuring entity that owns the tender
        if not (
            user.is_superuser
            or user == tender.created_by
            or EntityUser.objects.filter(user=user, entity=tender.procuring_entity, status='active').exists()
        ):
            return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
        docs = bid.documents.all().order_by('document_name')
        out = []
        for d in docs:
            out.append({
                'id': str(d.id),
                'document_name': d.document_name,
                'document_type': d.document_type,
                'file_size': d.file_size,
                'mime_type': d.mime_type,
                'uploaded_at': d.uploaded_at,
                'view_url': f"/bids/documents/{d.id}/view/",
                'download_url': f"/bids/documents/{d.id}/view/?download=1",
            })
        return Response(out)


class BidDocumentServeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, doc_id):
        doc = get_object_or_404(BidDocument, id=doc_id)
        bid = doc.bid
        tender = bid.tender
        user = request.user
        # Permissions: owner supplier of the bid, superuser, tender creator or procuring entity member
        if not (
            user.is_superuser
            or user == bid.supplier
            or user == tender.created_by
            or EntityUser.objects.filter(user=user, entity=tender.procuring_entity, status='active').exists()
        ):
            return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
        try:
            download = request.query_params.get('download') in ['1', 'true', 'yes']
            response = FileResponse(doc.file.open('rb'))
            # Set content type if known
            if doc.mime_type:
                response['Content-Type'] = doc.mime_type
            # Content-Disposition
            if download:
                response['Content-Disposition'] = f'attachment; filename="{doc.document_name}"'
            else:
                response['Content-Disposition'] = f'inline; filename="{doc.document_name}"'
            return response
        except FileNotFoundError:
            raise Http404('File not found')
