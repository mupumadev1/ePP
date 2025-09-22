import json

from django.db import transaction
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

from users.models import ProcuringEntity, SupplierProfile, EntityUser, ProfileEditRequest
from users.serializer import (
    ProcuringEntitySerializer,
    UserRoleSerializer,
    UserSerializer,
    SupplierProfileSerializer,
    BasicUserProfileSerializer,
    EntityUserSerializer,
    ProfileEditRequestSerializer,
)
from django.contrib.auth import get_user_model
from django.utils import timezone
from users.utils import send_supplier_verification_email


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
    Supports both JSON and multipart/form-data (for file uploads).
    Body fields (camelCase or snake_case accepted):
      email, password, confirmPassword, first_name/firstName, last_name/lastName, username, phoneNumber, user_type,
      businessRegNumber, businessCategory, experience, company_name/companyName
    """
    # Detect content type
    is_multipart = request.content_type and "multipart/form-data" in request.content_type

    # Parse request data accordingly
    if is_multipart:
        # request.POST contains the text fields for multipart submissions
        raw = request.POST
        payload = {k: raw.get(k) for k in raw.keys()}
    else:
        try:
            payload = json.loads(request.body.decode("utf-8")) if request.body else {}
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON"}, status=400)

    # Ensure user_type defaults to supplier
    if not payload.get('user_type'):
        payload['user_type'] = 'supplier'

    # Helper to fetch from both naming styles
    def pick(*keys):
        for k in keys:
            v = payload.get(k)
            if v is not None:
                return v
        return None

    # Map frontend fields to serializer fields
    user_data = {
        'email': pick('email'),
        'password': pick('password'),
        'confirmPassword': pick('confirmPassword'),
        'first_name': pick('first_name', 'firstName'),
        'last_name': pick('last_name', 'lastName'),
        'username': pick('username'),
        'phoneNumber': pick('phoneNumber', 'phone_number', 'phone'),
        'user_type': pick('user_type'),
    }

    serializer = UserSerializer(data=user_data)
    if not serializer.is_valid():
        return JsonResponse({"errors": serializer.errors}, status=400)

    # Prepare supplier fields and files
    files = request.FILES if is_multipart else {}
    company_name = (pick('company_name', 'companyName') or '').strip()
    business_reg_number = (pick('businessRegNumber') or '').strip()
    business_category = (pick('businessCategory') or '').strip()

    # Convert experience safely
    years_of_experience = None
    raw_experience = pick('experience')
    if raw_experience not in (None, ''):
        try:
            years_of_experience = int(raw_experience)
            if years_of_experience < 0:
                return JsonResponse({"error": "experience must be >= 0"}, status=400)
        except (TypeError, ValueError):
            return JsonResponse({"error": "experience must be an integer"}, status=400)

    # If supplier, ensure businessRegNumber is provided (model requires it)
    if payload.get('user_type') == 'supplier' and not business_reg_number:
        return JsonResponse({"error": "businessRegNumber is required for supplier registration"}, status=400)

    # File fields (multipart only)
    business_reg_certificate = files.get('businessRegCertificate')
    tax_compliance_cert = files.get('taxComplianceCert')
    company_profile = files.get('companyProfile')

    with transaction.atomic():
        user = serializer.save()

        # If supplier, create SupplierProfile in pending status
        if getattr(user, 'user_type', None) == 'supplier':
            if SupplierProfile.objects.filter(user=user).exists():
                return JsonResponse({"error": "Supplier profile already exists for this user"}, status=400)

            SupplierProfile.objects.create(
                user=user,
                company_name=company_name,
                business_reg_number=business_reg_number,
                business_category=business_category,
                business_reg_certificate=business_reg_certificate,
                tax_compliance_cert=tax_compliance_cert,
                company_profile=company_profile,
                years_of_experience=years_of_experience,
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
    data = SupplierProfileSerializer(qs, many=True, context={'request': request}).data
    return JsonResponse({"results": data, "count": len(data)})

@require_http_methods(["GET"])
@admin_required
def get_supplier_profile(request, user_id):
    """
    Admin-only: fetch a single supplier profile by user_id with file URLs.
    """
    try:
        profile = SupplierProfile.objects.select_related('user').get(user_id=user_id)
    except SupplierProfile.DoesNotExist:
        return JsonResponse({"error": "Supplier profile not found"}, status=404)

    data = SupplierProfileSerializer(profile, context={'request': request}).data
    return JsonResponse(data, status=200)


@require_http_methods(["PATCH", "POST"])
@admin_required
@csrf_protect
def verify_supplier(request, user_id):
    """Verify or reject a supplier profile by user id. Body: { action: 'verify'|'reject', admin_notes? }"""
    try:
        user = get_user_model().objects.get(id=user_id)
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
        user.is_active = True  # Activate user upon verification
        user.email_verified = True
        user.status = 'active'
        profile.verified_at = timezone.now()
    else:
        profile.verification_status = 'rejected'
        profile.verified_at = None

    if notes:
        profile.admin_notes = notes

    profile.save(update_fields=['verification_status', 'verified_at', 'admin_notes', 'updated_at'])
    user.save()

    # Send email notification to supplier (non-blocking, ignore failures)
    try:
        send_supplier_verification_email(user, profile, action, notes)
    except Exception:
        pass

    return JsonResponse({
        "message": f"Supplier {action}ed successfully",
        "profile": SupplierProfileSerializer(profile).data
    })

# ---- User profile view & edit (with admin review) ----
@require_http_methods(["GET"])
def my_profile(request):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Authentication required"}, status=401)

    user = request.user
    payload = {
        "user": BasicUserProfileSerializer(user).data,
        "roles": [],
    }

    # Supplier profile data
    if user.is_supplier:
        try:
            sp = SupplierProfile.objects.select_related('user').get(user=user)
            payload["supplier_profile"] = SupplierProfileSerializer(sp, context={'request': request}).data
        except SupplierProfile.DoesNotExist:
            payload["supplier_profile"] = None

    # Entity roles (includes evaluators and other roles)
    if user.is_procuring_entity_user or user.is_evaluator_user or user.can_access_admin_dashboard:
        roles = EntityUser.objects.select_related('entity').filter(user=user)
        payload["roles"] = EntityUserSerializer(roles, many=True).data

    return JsonResponse(payload, status=200)


@require_http_methods(["POST"])
@csrf_protect
def submit_profile_edit_request(request):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Authentication required"}, status=401)

    try:
        data = json.loads(request.body.decode("utf-8")) if request.body else {}
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    target = (data.get('target') or 'user').lower()  # 'user' | 'supplier_profile' | 'entity_user'
    proposed_changes = data.get('proposed_changes') or {}
    target_id = data.get('target_id')

    # Basic validation of allowed targets per user type
    if target == 'supplier_profile' and not request.user.is_supplier:
        return JsonResponse({"error": "Only suppliers can edit supplier profile"}, status=403)

    if target == 'entity_user':
        # ensure target_id belongs to this user
        try:
            eu = EntityUser.objects.get(id=target_id, user=request.user)
        except (EntityUser.DoesNotExist, ValueError, TypeError):
            return JsonResponse({"error": "Invalid entity_user target_id"}, status=400)

    # Create request
    per = ProfileEditRequest.objects.create(
        user=request.user,
        target=target,
        target_id=target_id,
        proposed_changes=proposed_changes,
        status='pending'
    )
    return JsonResponse({"message": "Edit request submitted for review", "request": ProfileEditRequestSerializer(per).data}, status=201)


# --- Admin review endpoints ---
@require_http_methods(["GET"])  # list
@admin_required
def list_pending_profile_edits(request):
    qs = ProfileEditRequest.objects.select_related('user').filter(status='pending').order_by('-created_at')
    return JsonResponse({"results": ProfileEditRequestSerializer(qs, many=True).data, "count": qs.count()})


@require_http_methods(["GET"])  # detail
@admin_required
def get_profile_edit_request(request, req_id: int):
    try:
        per = ProfileEditRequest.objects.select_related('user').get(id=req_id)
    except ProfileEditRequest.DoesNotExist:
        return JsonResponse({"error": "Edit request not found"}, status=404)
    return JsonResponse(ProfileEditRequestSerializer(per).data, status=200)


@require_http_methods(["PATCH", "POST"])  # review
@admin_required
@csrf_protect
def review_profile_edit_request(request, req_id: int):
    try:
        per = ProfileEditRequest.objects.select_related('user').get(id=req_id)
    except ProfileEditRequest.DoesNotExist:
        return JsonResponse({"error": "Edit request not found"}, status=404)

    try:
        payload = json.loads(request.body.decode("utf-8")) if request.body else {}
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    action = (payload.get('action') or '').lower()  # 'approve' | 'reject'
    notes = payload.get('admin_notes') or ''

    if action not in ('approve', 'reject'):
        return JsonResponse({"error": "Invalid action. Use 'approve' or 'reject'"}, status=400)

    if action == 'reject':
        per.status = 'rejected'
        per.admin_notes = notes
        per.reviewed_by = request.user
        per.reviewed_at = timezone.now()
        per.save(update_fields=['status', 'admin_notes', 'reviewed_by', 'reviewed_at', 'updated_at'])
        return JsonResponse({"message": "Edit request rejected", "request": ProfileEditRequestSerializer(per).data})

    # Approve: apply changes
    applied = {}
    with transaction.atomic():
        if per.target == 'user':
            # Allow changing first_name, last_name, phone
            u = per.user
            for field in ['first_name', 'last_name', 'phone']:
                if field in per.proposed_changes:
                    setattr(u, field, per.proposed_changes[field])
                    applied[field] = per.proposed_changes[field]
            u.save()
        elif per.target == 'supplier_profile':
            try:
                sp = SupplierProfile.objects.get(user=per.user)
            except SupplierProfile.DoesNotExist:
                return JsonResponse({"error": "Supplier profile not found for user"}, status=400)
            for field in ['company_name', 'business_category', 'years_of_experience', 'business_reg_number']:
                if field in per.proposed_changes:
                    setattr(sp, field, per.proposed_changes[field])
                    applied[field] = per.proposed_changes[field]
            sp.save()
        elif per.target == 'entity_user':
            try:
                eu = EntityUser.objects.get(id=per.target_id, user=per.user)
            except EntityUser.DoesNotExist:
                return JsonResponse({"error": "EntityUser record not found"}, status=400)
            # Allow role/status changes only
            for field in ['role', 'status']:
                if field in per.proposed_changes:
                    setattr(eu, field, per.proposed_changes[field])
                    applied[field] = per.proposed_changes[field]
            eu.save()
        else:
            return JsonResponse({"error": "Unknown target"}, status=400)

        per.status = 'approved'
        per.admin_notes = notes
        per.reviewed_by = request.user
        per.reviewed_at = timezone.now()
        per.save(update_fields=['status', 'admin_notes', 'reviewed_by', 'reviewed_at', 'updated_at'])

    return JsonResponse({
        "message": "Edit request approved and applied",
        "applied_changes": applied,
        "request": ProfileEditRequestSerializer(per).data
    }, status=200)
