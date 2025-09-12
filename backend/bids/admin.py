from django.contrib import admin

from bids.models import *
from tenders.models import Tender

# Register your models here.
admin.site.register(Bid)
admin.site.register(BidItem)
admin.site.register(BidDocument)
admin.site.register(EvaluationCommittee)
admin.site.register(CommitteeMember)
admin.site.register(BidEvaluation)
admin.site.register(Contract)
admin.site.register(ContractMilestone)

