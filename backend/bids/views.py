from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from rest_framework.response import Response
from rest_framework import status

from tenders.models import Tender
from .models import Bid


class TenderBidsListView(APIView):
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get(self, request, tender_id):
        tender = get_object_or_404(Tender, id=tender_id)
        bids_qs = Bid.objects.filter(tender=tender).select_related('supplier')
        data = [
            {
                'id': str(b.id),
                'bidder_name': b.supplier.get_full_name() or b.supplier.username,
                'submitted_amount': float(b.total_bid_amount),
                'currency': b.currency,
                'status': b.status,
                'submitted_at': b.submitted_at,
            }
            for b in bids_qs
        ]
        return Response(data)


class SubmitEvaluationRecommendationView(APIView):
    permission_classes = [IsAuthenticatedOrReadOnly]

    def post(self, request, tender_id):
        # Minimal endpoint to acknowledge receipt of evaluation results
        # Expected payload example:
        # {
        #   "evaluation": { <bidId>: { compliance: {...}, technical: {...}, financial: {...} } },
        #   "summary": [{ id, techScore, financialScore, combinedScore, price, rank }]
        # }
        _ = get_object_or_404(Tender, id=tender_id)
        payload = request.data or {}
        # In a full implementation, validate and persist evaluations to BidEvaluation records.
        # For now, acknowledge receipt.
        return Response({
            'message': 'Evaluation recommendation received',
            'received': bool(payload),
        }, status=status.HTTP_200_OK)
