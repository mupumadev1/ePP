from rest_framework import serializers
from .models import Bid, BidItem, BidDocument, EvaluationCriterion, BidCriterionScore, BidEvaluation, \
    TenderEvaluationConfig
from tenders.models import Tender


class BidItemSerializer(serializers.ModelSerializer):
    itemNumber = serializers.IntegerField(source='item_number')
    unitOfMeasure = serializers.CharField(source='unit_of_measure', required=False, allow_blank=True)
    unitPrice = serializers.DecimalField(source='unit_price', max_digits=15, decimal_places=2)
    totalPrice = serializers.DecimalField(source='total_price', max_digits=15, decimal_places=2, read_only=True)
    countryOfOrigin = serializers.CharField(source='country_of_origin', required=False, allow_blank=True)

    class Meta:
        model = BidItem
        fields = ['itemNumber', 'description', 'quantity', 'unitOfMeasure', 'unitPrice', 'totalPrice', 'specifications', 'brand', 'model', 'countryOfOrigin']


class BidCreateSerializer(serializers.ModelSerializer):
    items = BidItemSerializer(many=True, required=False)
    tender = serializers.PrimaryKeyRelatedField(queryset=Tender.objects.all())

    class Meta:
        model = Bid
        fields = [
            'id', 'tender', 'total_bid_amount', 'currency', 'vat_amount', 'vat_inclusive',
            'bid_validity_days', 'delivery_period', 'payment_terms', 'warranty_period',
            'technical_proposal', 'methodology', 'project_timeline', 'status', 'items'
        ]

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        bid, created = Bid.objects.update_or_create(
            tender=validated_data['tender'], supplier=user,
            defaults={**validated_data}
        )
        # Replace items when provided
        if items_data:
            bid.items.all().delete()
            for idx, item in enumerate(items_data, start=1):
                BidItem.objects.create(
                    bid=bid,
                    item_number=item.get('item_number') or item.get('itemNumber') or idx,
                    description=item.get('description', ''),
                    quantity=item.get('quantity', 0),
                    unit_of_measure=item.get('unit_of_measure') or item.get('unitOfMeasure') or '',
                    unit_price=item.get('unit_price') or item.get('unitPrice') or 0,
                    total_price=item.get('total_price') or item.get('totalPrice') or 0,
                    specifications=item.get('specifications', ''),
                    brand=item.get('brand', ''),
                    model=item.get('model', ''),
                    country_of_origin=item.get('country_of_origin') or item.get('countryOfOrigin') or ''
                )
        return bid

    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)
        # Update simple fields
        for field in [
            'total_bid_amount', 'currency', 'vat_amount', 'vat_inclusive',
            'bid_validity_days', 'delivery_period', 'payment_terms', 'warranty_period',
            'technical_proposal', 'methodology', 'project_timeline', 'status'
        ]:
            if field in validated_data:
                setattr(instance, field, validated_data[field])
        instance.save()
        # Optionally replace items when provided
        if items_data is not None:
            instance.items.all().delete()
            for idx, item in enumerate(items_data, start=1):
                BidItem.objects.create(
                    bid=instance,
                    item_number=item.get('item_number') or item.get('itemNumber') or idx,
                    description=item.get('description', ''),
                    quantity=item.get('quantity', 0),
                    unit_of_measure=item.get('unit_of_measure') or item.get('unitOfMeasure') or '',
                    unit_price=item.get('unit_price') or item.get('unitPrice') or 0,
                    total_price=item.get('total_price') or item.get('totalPrice') or 0,
                    specifications=item.get('specifications', ''),
                    brand=item.get('brand', ''),
                    model=item.get('model', ''),
                    country_of_origin=item.get('country_of_origin') or item.get('countryOfOrigin') or ''
                )
        return instance

class TenderEvaluationConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = TenderEvaluationConfig
        fields = [
            'id', 'tender',
            'technical_weight', 'financial_weight',
            'technical_pass_mark', 'compliance_required', 'enforce_mandatory',
            'financial_method', 'cap_financial_score_at'
        ]
        read_only_fields = ['id', 'tender']

class EvaluationCriterionSerializer(serializers.ModelSerializer):
    class Meta:
        model = EvaluationCriterion
        fields = [
            'id', 'tender', 'section', 'criterion_type',
            'name', 'description',
            'weight', 'max_points',
            'mandatory', 'order',
            'expected_upload',

        ]
        read_only_fields = ['id', 'tender']

class BidCriterionScoreSerializer(serializers.ModelSerializer):
    criterion_detail = EvaluationCriterionSerializer(source='criterion', read_only=True)

    class Meta:
        model = BidCriterionScore
        fields = ['id', 'evaluation', 'criterion', 'score', 'comments', 'criterion_detail']
        read_only_fields = ['id', 'evaluation']

class UpsertBidCriterionScoresSerializer(serializers.Serializer):
    # items: [{criterion, score?, pass?, comments?}]
    items = serializers.ListField(child=serializers.DictField(), allow_empty=False)

    def validate(self, attrs):
        evaluation: BidEvaluation = self.context['evaluation']
        tender_id = evaluation.bid.tender_id
        criterion_ids = [it.get('criterion') for it in attrs['items']]
        if not all(criterion_ids):
            raise serializers.ValidationError("Each item must include 'criterion'.")
        existing = set(EvaluationCriterion.objects.filter(id__in=criterion_ids, tender_id=tender_id).values_list('id', flat=True))
        missing = [cid for cid in criterion_ids if cid not in existing]
        if missing:
            raise serializers.ValidationError(f"Invalid criterion for this tender: {missing}")
        return attrs

    def save(self, **kwargs):
        from django.db import transaction
        evaluation: BidEvaluation = self.context['evaluation']
        items = self.validated_data['items']

        def coerce_score(criterion: EvaluationCriterion, payload: dict) -> tuple[float, str]:
            ctype = criterion.criterion_type
            comments = payload.get('comments', '')
            if ctype == EvaluationCriterion.TYPE_UPLOAD:
                # Auto-score based on presence of required document aligned with tender's upload definition
                if criterion.expected_upload:
                    required_type = criterion.expected_upload.file_type
                    has_doc = BidDocument.objects.filter(
                        bid=evaluation.bid, document_type=required_type
                    ).exists()
                else:
                    # Fallback: allow explicit boolean or numeric if no expected_upload is set
                    explicit_pass = payload.get('pass')
                    has_doc = bool(explicit_pass) or (float(payload.get('score', 0) or 0) > 0)
                return (float(criterion.max_points) if has_doc else 0.0, comments)
            elif ctype == EvaluationCriterion.TYPE_BOOLEAN:
                # Fixed: Check for score first, then pass
                if 'score' in payload:
                    val = payload.get('score')
                    try:
                        passed = float(val) > 0
                    except (ValueError, TypeError):
                        passed = False
                else:
                    passed = payload.get('pass', False)
                return (float(criterion.max_points) if passed else 0.0, comments)
            # TYPE_SCORE
            raw = payload.get('score', 0)
            try:
                num = float(raw)
            except (ValueError, TypeError):
                num = 0.0
            return (min(num, float(criterion.max_points)), comments)

def ensure_bid_has_required_uploads(bid: Bid) -> tuple[bool, list[str]]:
    """Check tender-defined required uploads are present on this bid."""
    missing = []
    # All tender-required uploads
    req = bid.tender.upload_documents.filter(mandatory=True)
    present_types = set(BidDocument.objects.filter(bid=bid).values_list('document_type', flat=True))
    for r in req:
        if r.file_type not in present_types:
            missing.append(f"{r.name} ({r.file_type})")
    ok = len(missing) == 0
    return ok, missing

# Helpers for computing scores and compliance
from decimal import Decimal

def _weighted_sum(rows):
    # rows: iterable of (score, max_points, weight)
    total_weight = Decimal('0')
    acc = Decimal('0')
    for s, max_pts, w in rows:
        if max_pts and w:
            acc += (Decimal(s) / Decimal(max_pts)) * Decimal(w)
            total_weight += Decimal(w)
    if total_weight == 0:
        return Decimal('0')
    return (acc / total_weight) * Decimal('100')

def compute_financial_lowest_price(bid: Bid) -> Decimal:
    prices = list(bid.tender.bids.values_list('total_bid_amount', flat=True))
    if not prices:
        return Decimal('0')
    valid = [Decimal(p) for p in prices if p is not None]
    if not valid:
        return Decimal('0')
    lowest = min(valid)
    if not lowest or not bid.total_bid_amount:
        return Decimal('0')
    return (lowest / Decimal(bid.total_bid_amount)) * Decimal('100')

class RecomputeEvaluationSerializer(serializers.Serializer):
    """Recompute technical/financial/overall and set compliance flags on BidEvaluation."""

    def save(self, **kwargs):
        evaluation: BidEvaluation = self.context['evaluation']
        cfg = getattr(evaluation.bid.tender, 'evaluation_config', None)
        if not cfg:
            raise serializers.ValidationError("Tender evaluation config is not set.")

        # Compliance evaluation (pass/fail gate)
        comp_qs = evaluation.criterion_scores.select_related('criterion').filter(criterion__section='compliance')
        comp_ok = True
        for row in comp_qs:
            crit = row.criterion
            # For upload/boolean: score > 0 means pass; for score: treat >0 as pass unless you want thresholds
            passed = Decimal(row.score or 0) > 0
            if cfg.enforce_mandatory and crit.mandatory and not passed:
                comp_ok = False
                break

        evaluation.technical_compliance = bool(comp_ok)
        # Financial compliance can be tied to financial section presence; keep as before unless needed:
        # evaluation.financial_compliance = evaluation.financial_compliance

        # Technical subtotal
        tech_rows = evaluation.criterion_scores.select_related('criterion').filter(criterion__section='technical')
        tech_data = [(r.score, r.criterion.max_points, r.criterion.weight or 1) for r in tech_rows]
        technical_score = _weighted_sum(tech_data)

        # Technical pass mark gate
        if getattr(cfg, 'technical_pass_mark', None) is not None:
            try:
                tpm = Decimal(cfg.technical_pass_mark)
            except Exception:
                tpm = Decimal('0')
            if technical_score < tpm:
                evaluation.technical_compliance = False

        # Financial subtotal
        if cfg.financial_method == TenderEvaluationConfig.FIN_METHOD_LOWEST_PRICE:
            financial_score = compute_financial_lowest_price(evaluation.bid)
        else:
            fin_rows = evaluation.criterion_scores.select_related('criterion').filter(criterion__section='financial')
            fin_data = [(r.score, r.criterion.max_points, r.criterion.weight or 1) for r in fin_rows]
            financial_score = _weighted_sum(fin_data)

        if cfg.cap_financial_score_at:
            try:
                cap = Decimal(cfg.cap_financial_score_at)
                financial_score = min(financial_score, cap)
            except Exception:
                pass

        # Overall: if compliance gate fails and compliance_required, you could zero overall
        tw = Decimal(cfg.technical_weight or 0)
        fw = Decimal(cfg.financial_weight or 0)
        denom = tw + fw if (tw + fw) != 0 else Decimal('1')
        overall = (technical_score * tw + financial_score * fw) / denom

        if cfg.compliance_required and not evaluation.technical_compliance:
            # Option: set overall to 0 to reflect disqualification
            overall = Decimal('0')

        evaluation.technical_score = technical_score
        evaluation.financial_score = financial_score
        evaluation.overall_score = overall
        evaluation.save(update_fields=['technical_compliance', 'technical_score', 'financial_score', 'overall_score'])
        return evaluation


class BidListSerializer(serializers.ModelSerializer):
    tender_title = serializers.CharField(source='tender.title', read_only=True)
    tender_reference = serializers.CharField(source='tender.reference_number', read_only=True)

    class Meta:
        model = Bid
        fields = ['id', 'tender_title', 'tender_reference', 'status', 'total_bid_amount', 'currency', 'submitted_at']


class OpportunitySerializer(serializers.ModelSerializer):
    days_remaining = serializers.IntegerField(read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    subcategory_name = serializers.CharField(source='subcategory.name', read_only=True, allow_null=True)

    class Meta:
        model = Tender
        fields = ['id', 'reference_number', 'title', 'description', 'closing_date', 'currency', 'days_remaining', 'category_id', 'subcategory_id', 'category_name', 'subcategory_name']