import logging

from rest_framework import serializers

from users.models import User, ProcuringEntity, SupplierProfile as SP
from users.models import EntityUser, ProfileEditRequest

logger = logging.getLogger('django')
from phonenumbers import NumberParseException, parse as parse_phone_number, is_valid_number


class ProcuringEntitySerializer(serializers.ModelSerializer):
    parent_entity_id = serializers.PrimaryKeyRelatedField(
        queryset=ProcuringEntity.objects.all(), source='parent_entity', required=False, allow_null=True, write_only=True
    )
    parent_entity = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = ProcuringEntity
        fields = [
            'id', 'name', 'code', 'entity_type', 'parent_entity', 'parent_entity_id',
            'contact_person', 'email', 'phone', 'address_line1', 'address_line2', 'city', 'province',
            'budget_threshold', 'status', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']

    def get_parent_entity(self, obj):
        if obj.parent_entity:
            return {
                'id': obj.parent_entity.id,
                'name': obj.parent_entity.name,
                'code': obj.parent_entity.code,
            }
        return None


class UserSerializer(serializers.ModelSerializer):
    phoneNumber = serializers.CharField(source='phone')
    confirmPassword = serializers.CharField(write_only=True, required=True)
    # Add role-based fields
    is_supplier = serializers.BooleanField(read_only=True)
    is_admin_user = serializers.BooleanField(read_only=True)
    is_evaluator_user = serializers.BooleanField(read_only=True)
    is_procuring_entity_user = serializers.BooleanField(read_only=True)
    can_access_admin_dashboard = serializers.BooleanField(read_only=True)
    can_access_bidder_dashboard = serializers.BooleanField(read_only=True)
    dashboard_route = serializers.CharField(source='get_dashboard_route', read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'user_type', 'username', 'phoneNumber',
            'password', 'confirmPassword', 'reset_password_token', 'reset_password_expires',
            'is_active', 'status',
            # Role-based fields
            'is_supplier', 'is_admin_user', 'is_evaluator_user', 'is_procuring_entity_user',
            'can_access_admin_dashboard', 'can_access_bidder_dashboard', 'dashboard_route'
        ]
        extra_kwargs = {
            'password': {'write_only': True},
            'email': {'required': True},
            'user_type': {'required': True},
            'reset_password_token': {'read_only': True},
            'reset_password_expires': {'read_only': True},
        }

    def validate(self, data):
        # Validate password matching
        if data.get('password') != data.get('confirmPassword'):
            raise serializers.ValidationError({"password": "Passwords do not match"})
        return data

    def validate_phoneNumber(self, value):
        """Ensure the phone number is valid and has 9 digits after +260 for Zambia."""
        if not value:
            raise serializers.ValidationError("Phone number is required.")

        try:
            # Parse the phone number, specifying Zambia's country code +260
            parsed_number = parse_phone_number(value, "ZM")  # ZM is the country code for Zambia

            # Check if the number is valid
            if not is_valid_number(parsed_number):
                raise serializers.ValidationError("Phone number is not valid.")
        except NumberParseException:
            raise serializers.ValidationError("Invalid phone number format.")

        # Ensure the number after the +260 contains exactly 9 digits
        digit_count = len(value.replace("+260", ""))  # Remove the country code and count remaining digits
        if digit_count != 9:
            raise serializers.ValidationError("Phone number must have exactly 9 digits after the country code +260.")

        return value

    def create(self, validated_data):
        validated_data.pop('confirmPassword', None)
        password = validated_data.pop('password')
        # phoneNumber mapped via source='phone'; pop nested if present
        if 'phone' not in validated_data and 'phoneNumber' in validated_data:
            validated_data['phone'] = validated_data.pop('phoneNumber')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        rep['phoneNumber'] = str(getattr(instance, 'phone', '') or '')
        rep.pop('password', None)
        return rep


class UserRoleSerializer(serializers.ModelSerializer):
    """Lightweight serializer for user role information"""
    # Add computed fields
    is_supplier = serializers.BooleanField(read_only=True)
    is_admin_user = serializers.BooleanField(read_only=True)
    is_evaluator_user = serializers.BooleanField(read_only=True)
    is_procuring_entity_user = serializers.BooleanField(read_only=True)
    can_access_admin_dashboard = serializers.BooleanField(read_only=True)
    can_access_bidder_dashboard = serializers.BooleanField(read_only=True)
    dashboard_route = serializers.CharField(source='get_dashboard_route', read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'user_type', 'status', 'is_active',
            'is_supplier', 'is_admin_user', 'is_evaluator_user', 'is_procuring_entity_user',
            'can_access_admin_dashboard', 'can_access_bidder_dashboard', 'dashboard_route'
        ]


class SupplierProfileSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_username = serializers.CharField(source='user.username', read_only=True)
    user_full_name = serializers.SerializerMethodField(read_only=True)
    company_name = serializers.SerializerMethodField(read_only=True)
    business_reg_certificate_url = serializers.SerializerMethodField(read_only=True)
    tax_compliance_cert_url = serializers.SerializerMethodField(read_only=True)
    company_profile_url = serializers.SerializerMethodField(read_only=True)

    class Meta:
        from users.models import SupplierProfile as SP
        model = SP
        fields = [
            'id', 'user', 'user_email', 'user_username', 'user_full_name','company_name',
            'business_reg_number', 'business_category', 'years_of_experience',
            'verification_status', 'verified_at', 'admin_notes', 'created_at',
            'business_reg_certificate_url', 'tax_compliance_cert_url', 'company_profile_url'
        ]
        read_only_fields = ['verification_status', 'verified_at', 'created_at']

    def get_user_full_name(self, obj):
        first = getattr(obj.user, 'first_name', '') or ''
        last = getattr(obj.user, 'last_name', '') or ''
        name = (first + ' ' + last).strip()
        return name or obj.user.username

    def get_company_name(self, obj):
        # Safely return the supplier's company_name from the model
        return getattr(obj, 'company_name', '') or ''

    def _abs_url(self, request, field):
        try:
            f = getattr(self.instance, field, None)
            if f and getattr(f, 'url', None):
                return request.build_absolute_uri(f.url) if request else f.url
        except Exception:
            return None
        return None

    def get_business_reg_certificate_url(self, obj):
        request = self.context.get('request') if hasattr(self, 'context') else None
        # Use obj because DRF sometimes sets instance differently for lists
        try:
            f = getattr(obj, 'business_reg_certificate', None)
            if f and getattr(f, 'url', None):
                return request.build_absolute_uri(f.url) if request else f.url
        except Exception:
            return None
        return None

    def get_tax_compliance_cert_url(self, obj):
        request = self.context.get('request') if hasattr(self, 'context') else None
        try:
            f = getattr(obj, 'tax_compliance_cert', None)
            if f and getattr(f, 'url', None):
                return request.build_absolute_uri(f.url) if request else f.url
        except Exception:
            return None
        return None

    def get_company_profile_url(self, obj):
        request = self.context.get('request') if hasattr(self, 'context') else None
        try:
            f = getattr(obj, 'company_profile', None)
            if f and getattr(f, 'url', None):
                return request.build_absolute_uri(f.url) if request else f.url
        except Exception:
            return None
        return None

import logging

from rest_framework import serializers

from users.models import User, ProcuringEntity, SupplierProfile as SP
from users.models import EntityUser, ProfileEditRequest

logger = logging.getLogger('django')
from phonenumbers import NumberParseException, parse as parse_phone_number, is_valid_number


class ProcuringEntitySerializer(serializers.ModelSerializer):
    parent_entity_id = serializers.PrimaryKeyRelatedField(
        queryset=ProcuringEntity.objects.all(), source='parent_entity', required=False, allow_null=True, write_only=True
    )
    parent_entity = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = ProcuringEntity
        fields = [
            'id', 'name', 'code', 'entity_type', 'parent_entity', 'parent_entity_id',
            'contact_person', 'email', 'phone', 'address_line1', 'address_line2', 'city', 'province',
            'budget_threshold', 'status', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']

    def get_parent_entity(self, obj):
        if obj.parent_entity:
            return {
                'id': obj.parent_entity.id,
                'name': obj.parent_entity.name,
                'code': obj.parent_entity.code,
            }
        return None


class UserSerializer(serializers.ModelSerializer):
    phoneNumber = serializers.CharField(source='phone')
    confirmPassword = serializers.CharField(write_only=True, required=True)
    # Add role-based fields
    is_supplier = serializers.BooleanField(read_only=True)
    is_admin_user = serializers.BooleanField(read_only=True)
    is_evaluator_user = serializers.BooleanField(read_only=True)
    is_procuring_entity_user = serializers.BooleanField(read_only=True)
    can_access_admin_dashboard = serializers.BooleanField(read_only=True)
    can_access_bidder_dashboard = serializers.BooleanField(read_only=True)
    dashboard_route = serializers.CharField(source='get_dashboard_route', read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'user_type', 'username', 'phoneNumber',
            'password', 'confirmPassword', 'reset_password_token', 'reset_password_expires',
            'is_active', 'status',
            # Role-based fields
            'is_supplier', 'is_admin_user', 'is_evaluator_user', 'is_procuring_entity_user',
            'can_access_admin_dashboard', 'can_access_bidder_dashboard', 'dashboard_route'
        ]
        extra_kwargs = {
            'password': {'write_only': True},
            'email': {'required': True},
            'user_type': {'required': True},
            'reset_password_token': {'read_only': True},
            'reset_password_expires': {'read_only': True},
        }

    def validate(self, data):
        # Validate password matching
        if data.get('password') != data.get('confirmPassword'):
            raise serializers.ValidationError({"password": "Passwords do not match"})
        return data

    def validate_phoneNumber(self, value):
        """Ensure the phone number is valid and has 9 digits after +260 for Zambia."""
        if not value:
            raise serializers.ValidationError("Phone number is required.")

        try:
            # Parse the phone number, specifying Zambia's country code +260
            parsed_number = parse_phone_number(value, "ZM")  # ZM is the country code for Zambia

            # Check if the number is valid
            if not is_valid_number(parsed_number):
                raise serializers.ValidationError("Phone number is not valid.")
        except NumberParseException:
            raise serializers.ValidationError("Invalid phone number format.")

        # Ensure the number after the +260 contains exactly 9 digits
        digit_count = len(value.replace("+260", ""))  # Remove the country code and count remaining digits
        if digit_count != 9:
            raise serializers.ValidationError("Phone number must have exactly 9 digits after the country code +260.")

        return value

    def create(self, validated_data):
        validated_data.pop('confirmPassword', None)
        password = validated_data.pop('password')
        # phoneNumber mapped via source='phone'; pop nested if present
        if 'phone' not in validated_data and 'phoneNumber' in validated_data:
            validated_data['phone'] = validated_data.pop('phoneNumber')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        rep['phoneNumber'] = str(getattr(instance, 'phone', '') or '')
        rep.pop('password', None)
        return rep


class UserRoleSerializer(serializers.ModelSerializer):
    """Lightweight serializer for user role information"""
    # Add computed fields
    is_supplier = serializers.BooleanField(read_only=True)
    is_admin_user = serializers.BooleanField(read_only=True)
    is_evaluator_user = serializers.BooleanField(read_only=True)
    is_procuring_entity_user = serializers.BooleanField(read_only=True)
    can_access_admin_dashboard = serializers.BooleanField(read_only=True)
    can_access_bidder_dashboard = serializers.BooleanField(read_only=True)
    dashboard_route = serializers.CharField(source='get_dashboard_route', read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'user_type', 'status', 'is_active',
            'is_supplier', 'is_admin_user', 'is_evaluator_user', 'is_procuring_entity_user',
            'can_access_admin_dashboard', 'can_access_bidder_dashboard', 'dashboard_route'
        ]


class SupplierProfileSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_username = serializers.CharField(source='user.username', read_only=True)
    user_full_name = serializers.SerializerMethodField(read_only=True)
    company_name = serializers.SerializerMethodField(read_only=True)
    business_reg_certificate_url = serializers.SerializerMethodField(read_only=True)
    tax_compliance_cert_url = serializers.SerializerMethodField(read_only=True)
    company_profile_url = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = SP
        fields = [
            'id', 'user', 'user_email', 'user_username', 'user_full_name','company_name',
            'business_reg_number', 'business_category', 'years_of_experience',
            'verification_status', 'verified_at', 'admin_notes', 'created_at',
            'business_reg_certificate_url', 'tax_compliance_cert_url', 'company_profile_url'
        ]
        read_only_fields = ['verification_status', 'verified_at', 'created_at']

    def get_user_full_name(self, obj):
        first = getattr(obj.user, 'first_name', '') or ''
        last = getattr(obj.user, 'last_name', '') or ''
        name = (first + ' ' + last).strip()
        return name or obj.user.username

    def get_company_name(self, obj):
        # Safely return the supplier's company_name from the model
        return getattr(obj, 'company_name', '') or ''

    def _abs_url(self, request, field):
        try:
            f = getattr(self.instance, field, None)
            if f and getattr(f, 'url', None):
                return request.build_absolute_uri(f.url) if request else f.url
        except Exception:
            return None
        return None

    def get_business_reg_certificate_url(self, obj):
        request = self.context.get('request') if hasattr(self, 'context') else None
        # Use obj because DRF sometimes sets instance differently for lists
        try:
            f = getattr(obj, 'business_reg_certificate', None)
            if f and getattr(f, 'url', None):
                return request.build_absolute_uri(f.url) if request else f.url
        except Exception:
            return None
        return None

    def get_tax_compliance_cert_url(self, obj):
        request = self.context.get('request') if hasattr(self, 'context') else None
        try:
            f = getattr(obj, 'tax_compliance_cert', None)
            if f and getattr(f, 'url', None):
                return request.build_absolute_uri(f.url) if request else f.url
        except Exception:
            return None
        return None

    def get_company_profile_url(self, obj):
        request = self.context.get('request') if hasattr(self, 'context') else None
        try:
            f = getattr(obj, 'company_profile', None)
            if f and getattr(f, 'url', None):
                return request.build_absolute_uri(f.url) if request else f.url
        except Exception:
            return None
        return None


class BasicUserProfileSerializer(serializers.ModelSerializer):
    phoneNumber = serializers.CharField(source='phone', required=False)

    class Meta:
        model = User
        fields = ['id', 'email', 'username', 'first_name', 'last_name', 'phoneNumber', 'user_type', 'status']
        read_only_fields = ['email', 'username', 'user_type', 'status']


class EntityUserSerializer(serializers.ModelSerializer):
    entity_name = serializers.CharField(source='entity.name', read_only=True)

    class Meta:
        model = EntityUser
        fields = ['id', 'user', 'entity', 'entity_name', 'role', 'status', 'assigned_at']
        read_only_fields = ['user', 'assigned_at']


class ProfileEditRequestSerializer(serializers.ModelSerializer):
    requester_email = serializers.EmailField(source='user.email', read_only=True)

    class Meta:
        model = ProfileEditRequest
        fields = ['id', 'user', 'requester_email', 'target', 'target_id', 'proposed_changes', 'status', 'admin_notes', 'reviewed_by', 'reviewed_at', 'created_at']
        read_only_fields = ['status', 'reviewed_by', 'reviewed_at', 'created_at', 'user']
