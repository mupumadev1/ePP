from datetime import datetime
from django.utils.timezone import make_aware, now
from django.db import transaction
from rest_framework import serializers

from .models import Tender, Category
from users.models import EntityUser, ProcuringEntity


class CategorySerializer(serializers.ModelSerializer):
    parent_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(), source='parent', required=False, allow_null=True, write_only=True
    )
    parent = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Category
        fields = ['id', 'name', 'code', 'description', 'level', 'is_active', 'parent', 'parent_id', 'created_at', 'updated_at']
        read_only_fields = ['level', 'created_at', 'updated_at']

    def get_parent(self, obj):
        if obj.parent:
            return {
                'id': obj.parent.id,
                'name': obj.parent.name,
                'code': obj.parent.code,
            }
        return None

    def create(self, validated_data):
        parent = validated_data.get('parent')
        if parent:
            validated_data['level'] = (parent.level or 1) + 1
        else:
            validated_data['level'] = 1
        return super().create(validated_data)


class TenderCreateSerializer(serializers.Serializer):
    # Fields expected from the frontend form (using names without _id)
    reference_number = serializers.CharField(max_length=100, required=False, allow_blank=True)
    title = serializers.CharField(max_length=500)
    description = serializers.CharField()

    # Aliases matching frontend payload
    category = serializers.IntegerField(write_only=True)
    subcategory = serializers.IntegerField(required=False, allow_null=True, write_only=True)
    procuring_entity = serializers.IntegerField(required=False, allow_null=True, write_only=True)

    procurement_method = serializers.ChoiceField(choices=[c[0] for c in Tender.PROCUREMENT_METHODS])
    estimated_value = serializers.DecimalField(max_digits=15, decimal_places=2, required=False, allow_null=True)
    currency = serializers.CharField(max_length=3, default='ZMW')

    closing_date = serializers.DateTimeField()
    opening_date = serializers.DateTimeField(required=False, allow_null=True)
    bid_validity_period = serializers.IntegerField(required=False, default=90)

    # Optional text fields
    minimum_requirements = serializers.CharField(required=False, allow_blank=True)
    technical_specifications = serializers.CharField(required=False, allow_blank=True)
    evaluation_criteria = serializers.CharField(required=False, allow_blank=True)
    terms_conditions = serializers.CharField(required=False, allow_blank=True)

    # Security and settings
    tender_security_required = serializers.BooleanField(required=False, default=False)
    tender_security_amount = serializers.DecimalField(max_digits=15, decimal_places=2, required=False, allow_null=True)
    tender_security_type = serializers.ChoiceField(choices=[c[0] for c in Tender.SECURITY_TYPES], required=False, allow_null=True)

    allow_variant_bids = serializers.BooleanField(required=False, default=False)
    allow_electronic_submission = serializers.BooleanField(required=False, default=True)
    auto_extend_on_amendment = serializers.BooleanField(required=False, default=True)

    # Read-only output fields
    id = serializers.UUIDField(read_only=True)
    status = serializers.CharField(read_only=True)

    def validate_reference_number(self, value: str):
        if not value:
            return value
        if Tender.objects.filter(reference_number=value).exists():
            raise serializers.ValidationError("Reference number must be unique.")
        return value

    def validate_category(self, value: int):
        if not Category.objects.filter(id=value).exists():
            raise serializers.ValidationError("Invalid category")
        return value

    def validate_subcategory(self, value: int):
        if value is None:
            return value
        if not Category.objects.filter(id=value).exists():
            raise serializers.ValidationError("Invalid subcategory")
        return value

    def validate_procuring_entity(self, value: int):
        if value is None:
            return value
        from users.models import ProcuringEntity
        if not ProcuringEntity.objects.filter(id=value).exists():
            raise serializers.ValidationError("Invalid procuring_entity")
        return value

    def validate_closing_date(self, value: datetime):
        # Ensure closing date is in the future
        if value <= now():
            raise serializers.ValidationError("Closing date must be in the future.")
        return value

    def _resolve_procuring_entity(self, user, explicit_id):
        if explicit_id:
            try:
                return ProcuringEntity.objects.get(id=explicit_id)
            except ProcuringEntity.DoesNotExist:
                raise serializers.ValidationError({
                    'procuring_entity': 'Procuring entity not found.'
                })
        # Infer from EntityUser link
        link = EntityUser.objects.filter(user=user, status='active').select_related('entity').first()
        if not link:
            raise serializers.ValidationError('No procuring entity linked to the current user.')
        return link.entity

    def _generate_reference_number(self) -> str:
        # Simple generator: TDR-YYYYMMDD-HHMMSS-<count>
        dt = now()
        base = dt.strftime('TDR-%Y%m%d-%H%M%S')
        suffix = Tender.objects.count() + 1
        candidate = f"{base}-{suffix:04d}"
        # Ensure uniqueness
        while Tender.objects.filter(reference_number=candidate).exists():
            suffix += 1
            candidate = f"{base}-{suffix:04d}"
        return candidate

    @transaction.atomic
    def create(self, validated_data):
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        if user is None or not user.is_authenticated:
            raise serializers.ValidationError('Authentication required.')

        category_id = validated_data.pop('category')
        subcategory_id = validated_data.pop('subcategory', None)
        procuring_entity_id = validated_data.pop('procuring_entity', None)

        category = Category.objects.get(id=category_id)
        subcategory = Category.objects.get(id=subcategory_id) if subcategory_id else None
        procuring_entity = self._resolve_procuring_entity(user, procuring_entity_id)

        reference_number = validated_data.pop('reference_number', '') or self._generate_reference_number()

        tender = Tender.objects.create(
            category=category,
            subcategory=subcategory,
            procuring_entity=procuring_entity,
            created_by=user,
            status='draft',  # Start as draft
            tender_stage='preparation',
            reference_number=reference_number,
            publication_date=now(),
            **validated_data,
        )
        return tender


class TenderUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tender
        fields = [
            'title', 'description', 'category', 'subcategory', 'procurement_method', 'estimated_value', 'currency',
            'closing_date', 'opening_date', 'bid_validity_period', 'minimum_requirements', 'technical_specifications',
            'evaluation_criteria', 'terms_conditions', 'tender_security_required', 'tender_security_amount',
            'tender_security_type', 'allow_variant_bids', 'allow_electronic_submission', 'auto_extend_on_amendment',
            'status', 'tender_stage'
        ]
        extra_kwargs = {
            'category': {'required': False, 'allow_null': True},
            'subcategory': {'required': False, 'allow_null': True},
            'closing_date': {'required': False, 'allow_null': True},
            'opening_date': {'required': False, 'allow_null': True},
        }

    def validate_status(self, value):
        # Enforce status transition map
        if not hasattr(self.instance, 'status'):
            return value
        current = self.instance.status
        # Always allow keeping same value
        if value == current:
            return value
        allowed_values = set(c[0] for c in Tender.STATUS_CHOICES)
        if value not in allowed_values:
            raise serializers.ValidationError('Invalid status value')
        allowed_next = Tender.TRANSITION_MAP.get(current, [])
        if value not in allowed_next:
            raise serializers.ValidationError(f'Invalid transition from {current} to {value}')
        return value


class TenderDetailSerializer(serializers.ModelSerializer):
    allowed_transitions = serializers.SerializerMethodField(read_only=True)
    procuring_entity = serializers.CharField(source='procuring_entity.name', read_only=True)
    procuring_entity_id = serializers.PrimaryKeyRelatedField(source='procuring_entity', read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(source='category', read_only=True)
    subcategory_id = serializers.PrimaryKeyRelatedField(source='subcategory', read_only=True, allow_null=True)

    class Meta:
        model = Tender
        fields = [
            'id', 'reference_number', 'title', 'description',
            'category_id', 'subcategory_id', 'procuring_entity', 'procuring_entity_id',
            'procurement_method', 'estimated_value', 'currency',
            'closing_date', 'opening_date', 'bid_validity_period',
            'minimum_requirements', 'technical_specifications', 'evaluation_criteria', 'terms_conditions',
            'tender_security_required', 'tender_security_amount', 'tender_security_type',
            'allow_variant_bids', 'allow_electronic_submission', 'auto_extend_on_amendment',
            'status', 'tender_stage', 'allowed_transitions'
        ]

    def get_allowed_transitions(self, obj):
        return obj.allowed_transitions()

class TenderListSerializer(serializers.ModelSerializer):
    procuring_entity = serializers.CharField(source='procuring_entity.name', read_only=True)
    total_bids = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Tender
        fields = ['id', 'reference_number', 'title', 'status', 'closing_date', 'estimated_value', 'procuring_entity', 'total_bids']

    def get_total_bids(self, obj):
        try:
            return obj.bids.count()
        except Exception:
            return 0
