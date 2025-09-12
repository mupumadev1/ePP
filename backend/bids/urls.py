from django.urls import path
from .views import TenderBidsListView, SubmitEvaluationRecommendationView

urlpatterns = [
    # Resolved under site root; designed so that final path is /tenders/<uuid>/bids/
    path('tenders/<uuid:tender_id>/bids/', TenderBidsListView.as_view(), name='tender_bids_list'),
    path('tenders/<uuid:tender_id>/evaluation/recommendation/', SubmitEvaluationRecommendationView.as_view(), name='submit_evaluation_recommendation'),
]
