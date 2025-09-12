from django.contrib import admin

from tenders.models import *

# Register your models here.
admin.site.register(Category)
admin.site.register(SupplierCategory)
admin.site.register(Tender)
admin.site.register(TenderDocument)
admin.site.register(TenderAmendment)