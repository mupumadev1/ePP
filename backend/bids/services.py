from decimal import Decimal
from django.db import transaction
from django.db.models import Avg, Count, Q
from .models import Bid, BidEvaluation

class AggregatePolicy:
    # You can later make these tender-configurable
    ANY_FAIL_DISQUALIFIES = 'any_fail'
    MAJORITY = 'majority'
    UNANIMOUS = 'unanimous'


def aggregate_bid_scores(bid: Bid, compliance_policy: str = AggregatePolicy.ANY_FAIL_DISQUALIFIES,
                         min_evaluations: int = 1) -> dict:
    evqs = BidEvaluation.objects.filter(bid=bid)

    counts = evqs.aggregate(
        total=Count('id'),
        passed=Count('id', filter=Q(technical_compliance=True)),
    )
    total = counts['total'] or 0
    if total < min_evaluations:
        # Not enough evaluations; do not finalize yet
        return {
            'finalized': False,
            'reason': f'Need at least {min_evaluations} evaluations; have {total}.',
        }

    # Numeric averages (exclude nulls)
    avgs = evqs.aggregate(
        tech=Avg('technical_score'),
        fin=Avg('financial_score'),
        overall=Avg('overall_score'),
    )

    # Compliance decision
    passed = counts['passed'] or 0
    compliant = True
    if compliance_policy == AggregatePolicy.ANY_FAIL_DISQUALIFIES:
        compliant = (passed == total)
    elif compliance_policy == AggregatePolicy.MAJORITY:
        compliant = (passed > total / 2)
    elif compliance_policy == AggregatePolicy.UNANIMOUS:
        compliant = (passed == total)

    final_total = Decimal(avgs['overall'] or 0)
    final_tech = Decimal(avgs['tech'] or 0)
    final_fin = Decimal(avgs['fin'] or 0)

    # If compliance required and bid non-compliant, zero out total to reflect disqualification
    cfg = getattr(bid.tender, 'evaluation_config', None)
    if cfg and cfg.compliance_required and not compliant:
        final_total = Decimal('0')

    # Persist on Bid so other reports use it
    bid.technical_score = final_tech
    bid.financial_score = final_fin
    bid.total_score = final_total
    bid.status = 'qualified' if compliant else 'disqualified'
    bid.save(update_fields=['technical_score', 'financial_score', 'total_score', 'status'])

    return {
        'finalized': True,
        'technical_score': final_tech,
        'financial_score': final_fin,
        'total_score': final_total,
        'compliant': compliant,
        'evaluations_count': total,
    }


def rank_tender_bids(tender) -> list[dict]:
    # Order: highest total_score first; tie-breaker can be added later
    with transaction.atomic():
        bids = list(Bid.objects.filter(tender=tender).select_related('tender'))
        # Sort by total_score desc (None treated as 0)
        bids.sort(key=lambda b: (float(b.total_score or 0),), reverse=True)
        prev_score = None
        rank = 0
        for idx, b in enumerate(bids, start=1):
            score = float(b.total_score or 0)
            if prev_score is None or score < prev_score:
                rank = idx
            prev_score = score
            b.ranking = rank
        if bids:
            Bid.objects.bulk_update(bids, ['ranking'])
        return [
            {'bid_id': str(b.id), 'total_score': float(b.total_score or 0), 'ranking': b.ranking}
            for b in bids
        ]