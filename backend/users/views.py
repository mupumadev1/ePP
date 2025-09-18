import json
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import ensure_csrf_cookie, csrf_protect
from django.contrib.auth import authenticate, login, logout
from django.utils.decorators import method_decorator
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import api_view, permission_classes

from users.models import ProcuringEntity, SupplierProfile
from users.serializer import ProcuringEntitySerializer, UserRoleSerializer, UserSerializer, SupplierProfileSerializer
from django.contrib.auth import get_user_model
from django.utils import timezone


@method_decorator(ensure_csrf_cookie, name='dispatch')
class getCSRFToken(APIView):
    permission_classes = [AllowAny]

    def get(self, request, format=None):
        csrf_token = get_token(request)  # Ensure token exists; cookie will be set by middleware
        return Response({'csrfToken': csrf_token, 'success': 'CSRF Cookie Set'})


@csrf_protect
@require_http_methods(["GET", "POST"])
def login_view(request):
    """
    GET: Set CSRF cookie and return a simple payload so the frontend can proceed.
    POST: Authenticate with username/password and create a session.
    """

    try:
        data = json.loads(request.body.decode("utf-8")) if request.body else {}
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    # Support both { email, password } and legacy { username, password } by treating
    # the identifier as email.
    email = data.get("email") or data.get("username")
    password = data.get("password")
    if not email or not password:
        return JsonResponse({"error": "Email and password are required"}, status=400)

    # Since USERNAME_FIELD is 'email', pass email explicitly to authenticate.
    user = authenticate(request, email=email, password=password)
    if user is None:
        return JsonResponse({"error": "Invalid credentials"}, status=401)

    # Check if user account is active and not suspended
    if not user.is_active or user.status == 'suspended':
        return JsonResponse({"error": "Account is inactive or suspended"}, status=403)

    login(request, user)

    # Return comprehensive user information including role data
    serializer = UserRoleSerializer(user)
    print(serializer)
    return JsonResponse({
        "username": user.username,
        "email": user.email,
        "id": user.id,
        "user_type": user.user_type,
        "status": user.status,
        "is_superuser": getattr(user, "is_superuser", False),
        "role_info": serializer.data,
        "dashboard_route": user.get_dashboard_route()
    })


@require_http_methods(["POST"])
@csrf_protect
def logout_view(request):
    logout(request)
    return JsonResponse({"detail": "Logged out"})


@require_http_methods(["POST"])
@csrf_protect
def password_reset_view(request):
    """
    Minimal placeholder to satisfy the frontend forgot-password flow.
    Accepts { email } and always responds with success to avoid user enumeration.
    """
    # Intentionally do not disclose whether the email exists
    return JsonResponse({
        "detail": "If an account with that email exists, a reset link has been sent."
    })


@require_http_methods(["GET"])
def me_view(request):
    if request.user.is_authenticated:
        user = request.user

        # Check if user account is still active
        if not user.is_active or user.status == 'suspended':
            return JsonResponse({"authenticated": False, "error": "Account inactive"}, status=401)

        serializer = UserRoleSerializer(user)
        return JsonResponse({
            "authenticated": True,
            "user": {
                "username": user.username,
                "email": user.email,
                "id": user.id,
                "user_type": user.user_type,
                "status": user.status,
                "is_superuser": getattr(user, "is_superuser", False),
                "role_info": serializer.data,
                "dashboard_route": user.get_dashboard_route()
            }
        })
    return JsonResponse({"authenticated": False}, status=401)


def admin_required(view_func):
    """Decorator to check if user has admin access"""

    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return JsonResponse({"error": "Authentication required"}, status=401)

        if not request.user.can_access_admin_dashboard:
            return JsonResponse({"error": "Admin access required"}, status=403)

        if not request.user.is_active or request.user.status == 'suspended':
            return JsonResponse({"error": "Account inactive"}, status=403)

        return view_func(request, *args, **kwargs)

    return wrapper


def supplier_required(view_func):
    """Decorator to check if user is a supplier"""

    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return JsonResponse({"error": "Authentication required"}, status=401)

        if not request.user.is_supplier:
            return JsonResponse({"error": "Supplier access required"}, status=403)

        if not request.user.is_active or request.user.status == 'suspended':
            return JsonResponse({"error": "Account inactive"}, status=403)

        return view_func(request, *args, **kwargs)

    return wrapper


@method_decorator(csrf_protect, name='dispatch')
class ProcuringEntityListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def dispatch(self, request, *args, **kwargs):
        # Check if user has admin access
        if not request.user.can_access_admin_dashboard:
            return Response({"error": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)

        if not request.user.is_active or request.user.status == 'suspended':
            return Response({"error": "Account inactive"}, status=status.HTTP_403_FORBIDDEN)

        return super().dispatch(request, *args, **kwargs)

    def get(self, request):
        parent_id = request.query_params.get('parent_id')
        qs = ProcuringEntity.objects.all().order_by('name')
        if parent_id is not None:
            if parent_id == "":
                qs = qs.filter(parent_entity__isnull=True)
            else:
                qs = qs.filter(parent_entity_id=parent_id)
        serializer = ProcuringEntitySerializer(qs, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = ProcuringEntitySerializer(data=request.data)
        if serializer.is_valid():
            entity = serializer.save()
            return Response(ProcuringEntitySerializer(entity).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_user_access(request):
    """Endpoint to check user's access permissions"""
    user = request.user

    if not user.is_active or user.status == 'suspended':
        return Response({"error": "Account inactive"}, status=status.HTTP_403_FORBIDDEN)

    serializer = UserRoleSerializer(user)
    return Response({
        "user_type": user.user_type,
        "can_access_admin": user.can_access_admin_dashboard,
        "can_access_bidder": user.can_access_bidder_dashboard,
        "dashboard_route": user.get_dashboard_route(),
        "role_info": serializer.data
    })


@require_http_methods(["POST"])
@csrf_protect
@permission_classes([AllowAny])
def register_view(request):
    """
    Register a new user. When user_type is 'supplier', automatically create a SupplierProfile
    with verification_status='pending'. Accepts optional supplier fields.
    Body (JSON): {
      email, password, confirmPassword, first_name, last_name, username, phoneNumber, user_type,
      businessRegNumber?, businessCategory?, experience?
    }
    """
    try:
        payload = json.loads(request.body.decode("utf-8")) if request.body else {}
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    # Ensure user_type
    if not payload.get('user_type'):
        payload['user_type'] = 'supplier'

    # Map frontend fields to serializer fields
    user_data = {
        'email': payload.get('email'),
        'password': payload.get('password'),
        'confirmPassword': payload.get('confirmPassword'),
        'first_name': payload.get('first_name') or payload.get('firstName'),
        'last_name': payload.get('last_name') or payload.get('lastName'),
        'username': payload.get('username'),
        'phoneNumber': payload.get('phoneNumber'),
        'user_type': payload.get('user_type'),
    }

    serializer = UserSerializer(data=user_data)
    if not serializer.is_valid():
        return JsonResponse({"errors": serializer.errors}, status=400)

    user = serializer.save()

    # If supplier, create SupplierProfile in pending status
    if getattr(user, 'user_type', None) == 'supplier':
        SupplierProfile.objects.create(
            user=user,
            business_reg_number=payload.get('businessRegNumber') or '',
            business_category=payload.get('businessCategory') or '',
            years_of_experience=(payload.get('experience') if isinstance(payload.get('experience'), int) else None),
            verification_status='pending',
        )

    return JsonResponse({
        "message": "Registration successful. Your account is pending verification.",
        "user_id": user.id,
        "user_type": user.user_type,
    }, status=201)


@require_http_methods(["GET"])
@admin_required
def list_pending_suppliers(request):
    """List supplier profiles awaiting verification"""
    qs = SupplierProfile.objects.select_related('user').filter(verification_status='pending').order_by('-created_at')
    data = SupplierProfileSerializer(qs, many=True).data
    return JsonResponse({"results": data, "count": len(data)})


@require_http_methods(["PATCH", "POST"])
@admin_required
@csrf_protect
def verify_supplier(request, user_id):
    """Verify or reject a supplier profile by user id. Body: { action: 'verify'|'reject', admin_notes? }"""
    try:
        profile = SupplierProfile.objects.select_related('user').get(user_id=user_id)
    except SupplierProfile.DoesNotExist:
        return JsonResponse({"error": "Supplier profile not found"}, status=404)

    try:
        payload = json.loads(request.body.decode("utf-8")) if request.body else {}
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    action = (payload.get('action') or '').lower()
    notes = payload.get('admin_notes') or ''

    if action not in ('verify', 'reject'):
        return JsonResponse({"error": "Invalid action. Use 'verify' or 'reject'"}, status=400)

    if action == 'verify':
        profile.verification_status = 'verified'
        profile.verified_at = timezone.now()
    else:
        profile.verification_status = 'rejected'
        profile.verified_at = None

    if notes:
        profile.admin_notes = notes

    profile.save(update_fields=['verification_status', 'verified_at', 'admin_notes', 'updated_at'])

    return JsonResponse({
        "message": f"Supplier {action}ed successfully",
        "profile": SupplierProfileSerializer(profile).data
    })