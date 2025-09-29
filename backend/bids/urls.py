from django.urls import path
from .views import (
    OpportunitiesListView,
    MyBidsListView,
    CreateBidView,
    BidDetailView,
    SubmitBidView,
    BidDocumentUploadView,
    UnsubmitBidView,
    ChangeBidStatusView,
    MyContractsView,
    EntityContractsView,
    CreateContractView,
    UpdateContractView,
    SupplierPerformanceView,
    TenderRequiredUploadsView,
    BidDocumentsListForEvaluation,
    BidDocumentServeView, tender_evaluation_config_view, criteria_list_create, criterion_detail_view,
    upsert_evaluation_scores, recompute_evaluation_totals, tender_required_uploads,
    get_or_create_evaluation, aggregate_bid_view, rank_tender_view,
)

urlpatterns = [
    path('my-bids/', MyBidsListView.as_view(), name='my_bids'),
    path('opportunities/', OpportunitiesListView.as_view(), name='opportunities'),
    path('create-bid/<uuid:tender_id>/', CreateBidView.as_view(), name='create_bid'),
    path('bid/<uuid:bid_id>/', BidDetailView.as_view(), name='bid_detail'),
    path('bid/<uuid:bid_id>/submit/', SubmitBidView.as_view(), name='submit_bid'),
    path('bid/<uuid:bid_id>/unsubmit/', UnsubmitBidView.as_view(), name='unsubmit_bid'),
    path('bid/<uuid:bid_id>/status/', ChangeBidStatusView.as_view(), name='change_bid_status'),
    path('bid/<uuid:bid_id>/documents/', BidDocumentUploadView.as_view(), name='bid_documents'),
    path('contracts/mine/', MyContractsView.as_view(), name='my_contracts'),
    path('contracts/entity/', EntityContractsView.as_view(), name='entity_contracts'),
    path('contracts/create/', CreateContractView.as_view(), name='create_contract'),
    path('contracts/<uuid:contract_id>/update/', UpdateContractView.as_view(), name='update_contract'),
    path('suppliers/performance/', SupplierPerformanceView.as_view(), name='supplier_performance'),
    path('tenders/<uuid:tender_id>/required-uploads/', TenderRequiredUploadsView.as_view(), name='tender_required_uploads'),
    path('bid/<uuid:bid_id>/documents/list/', BidDocumentsListForEvaluation.as_view(), name='bid_documents_list_eval'),
    path('documents/<uuid:doc_id>/view/', BidDocumentServeView.as_view(), name='bid_document_serve'),
    path('evaluations/', get_or_create_evaluation, name='get-or-create-evaluation'),
    path('tenders/<uuid:tender_id>/evaluation/config', tender_evaluation_config_view, name='tender-eval-config'),
    path('tenders/<uuid:tender_id>/evaluation/criteria', criteria_list_create, name='criteria-list-create'),
    path('tenders/<uuid:tender_id>/evaluation/criteria/<int:criterion_id>', criterion_detail_view, name='criterion-detail'),

    path('evaluations/<int:evaluation_id>/scores', upsert_evaluation_scores, name='upsert-eval-scores'),
    path('evaluations/<int:evaluation_id>/recompute', recompute_evaluation_totals, name='recompute-eval-totals'),

    # Aggregation and ranking
    path('bids/<uuid:bid_id>/aggregate', aggregate_bid_view, name='aggregate-bid'),
    path('tenders/<uuid:tender_id>/rank-bids', rank_tender_view, name='rank-tender-bids'),

    path('tenders/<uuid:tender_id>/required-uploads/', tender_required_uploads, name='tender-required-uploads'),
]


