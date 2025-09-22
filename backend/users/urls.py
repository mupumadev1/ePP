from django.urls import path
from . import views
from .views import getCSRFToken , ProcuringEntityListCreateView

urlpatterns = [
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('password-reset/', views.password_reset_view, name='password_reset'),
    path('me/', views.me_view, name='me'),
    path('get-csrf-token/', getCSRFToken.as_view(), name='getCSRFToken'),
    path('procuring-entities/', ProcuringEntityListCreateView.as_view(), name='procuring_entities_list_create'),
    path('admin/suppliers/<int:user_id>/', views.get_supplier_profile, name='get_supplier_profile'),

    # Registration and access
    path('register/', views.register_view, name='register'),
    path('check-access/', views.check_user_access, name='check_user_access'),

    # Supplier verification admin endpoints
    path('suppliers/pending/', views.list_pending_suppliers, name='list_pending_suppliers'),
    path('suppliers/<int:user_id>/verify/', views.verify_supplier, name='verify_supplier'),

    # User profile endpoints
    path('profile/', views.my_profile, name='my_profile'),
    path('profile/edit-request/', views.submit_profile_edit_request, name='submit_profile_edit_request'),

    # Admin profile edit review endpoints
    path('admin/profile-edits/pending/', views.list_pending_profile_edits, name='list_pending_profile_edits'),
    path('admin/profile-edits/<int:req_id>/', views.get_profile_edit_request, name='get_profile_edit_request'),
    path('admin/profile-edits/<int:req_id>/review/', views.review_profile_edit_request, name='review_profile_edit_request'),
]
