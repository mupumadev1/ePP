import json
import uuid

from django.db import transaction
from django.utils.timezone import now
from django.views.decorators.csrf import csrf_protect
from django.utils.decorators import method_decorator
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from bids.models import Contract
from users.models import ProcuringEntity
from .models import Category, Tender, TenderUploadDocuments, TenderDocument, User
from .serializer import TenderCreateSerializer, CategorySerializer, TenderListSerializer


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

    data = TenderListSerializer(tender).data
    return Response(data, status=status.HTTP_200_OK)

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

class DashboardView(APIView):
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get(self, request):
        active_tenders = Tender.objects.filter(status__in=['draft','published']).count()
        pending_eval = Tender.objects.filter(status__in=['draft','published']).count()  # adjust to your workflow
        active_contracts = Contract.objects.filter(status='active').count()
        total_suppliers = User.objects.filter(user_type='supplier').count()

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
