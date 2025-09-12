from django.urls import path
from .views import CategoryListCreateView, TenderListCreateView, create_tender, DashboardView, tender_detail

urlpatterns = [
    path('', TenderListCreateView.as_view(), name='tenders_list_create'),
    path('<uuid:tender_id>/', tender_detail, name='tenders_detail'),
    path('create/', create_tender, name='create_tender'),
    path('categories/', CategoryListCreateView.as_view(), name='categories_list_create'),
    path('dashboard/', DashboardView.as_view(), name='dashboard')
]
