from django.urls import path
from .views import CategoryListCreateView, TenderListCreateView, create_tender, DashboardView, tender_detail, \
    tender_bids, submit_evaluation_recommendation, update_tender, evaluation_committee, evaluation_summary, \
    evaluation_overview, procurement_analytics, public_tenders, public_tender_detail

urlpatterns = [
    path('', TenderListCreateView.as_view(), name='tenders_list_create'),
    path('<uuid:tender_id>/', tender_detail, name='tenders_detail'),
    path('<uuid:tender_id>/update/', update_tender, name='tenders_update'),
    path('<uuid:tender_id>/bids/', tender_bids, name='tender_bids'),
    path('<uuid:tender_id>/evaluation/recommendation/', submit_evaluation_recommendation, name='submit_evaluation_recommendation'),
    path('<uuid:tender_id>/evaluation/committee/', evaluation_committee, name='evaluation_committee'),
    path('<uuid:tender_id>/evaluation/summary/', evaluation_summary, name='evaluation_summary'),
    path('create/', create_tender, name='create_tender'),
    path('categories/', CategoryListCreateView.as_view(), name='categories_list_create'),
    path('dashboard/', DashboardView.as_view(), name='dashboard'),
    path('evaluation/overview/', evaluation_overview, name='evaluation_overview'),
    path('procurement/analytics/', procurement_analytics, name='procurement_analytics'),
    path('public/', public_tenders, name='public-tenders'),
    path('public/<uuid:tender_id>/', public_tender_detail, name='public-tender-detail'),

]
