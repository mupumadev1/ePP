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
]
