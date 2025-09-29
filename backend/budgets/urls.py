from django.urls import path
from . import views

urlpatterns = [
    # Budget Line CRUD
    path('budget-lines/', views.budget_lines_list_create, name='budget-lines-list-create'),
    path('budget-lines/<int:pk>/', views.budget_line_detail, name='budget-line-detail'),

    # Budget Summary & Analytics
    path('budget-summary/', views.budget_summary, name='budget-summary'),
    path('budget-analytics/', views.budget_analytics, name='budget-analytics'),
    path('budget-options/', views.budget_options, name='budget-options'),

    # Timeline Management
    path('budget-lines/<int:budget_line_id>/timeline/', views.budget_line_timeline, name='budget-line-timeline'),
    path('timeline-milestones/<int:pk>/', views.timeline_milestone_detail, name='timeline-milestone-detail'),

    # Bulk Operations
    path('budget-lines/bulk-create/', views.bulk_create_budget_lines, name='bulk-create-budget-lines'),
]