from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.html import strip_tags


def send_supplier_verification_email(user, profile, action: str, notes: str = ""):
    """
    Send an email to a supplier when their profile is verified or rejected.

    :param user: users.models.User instance
    :param profile: users.models.SupplierProfile instance
    :param action: 'verify' or 'reject'
    :param notes: optional admin notes to include in the message
    """
    action = (action or "").lower()
    if action not in ("verify", "reject"):
        raise ValueError("action must be 'verify' or 'reject'")

    context = {
        "first_name": getattr(user, "first_name", "") or user.username or user.email,
        "company": "Smart Tender E-Procurement",
        "supplier_company_name": getattr(profile, "company_name", "") or "",
        "dashboard_url": getattr(settings, "SITE_URL", "http://localhost:5173") + "/bidder/dashboard",
        "support_email": getattr(settings, "DEFAULT_FROM_EMAIL", "support@example.com"),
        "notes": notes or "",
    }

    if action == "verify":
        subject = "Your Supplier Account Has Been Verified"
        html_template = "users/emails/supplier_verified.html"
        text_template = "users/emails/supplier_verified.txt"
    else:
        subject = "Your Supplier Verification Was Not Approved"
        html_template = "users/emails/supplier_rejected.html"
        text_template = "users/emails/supplier_rejected.txt"

    html_content = render_to_string(html_template, context)
    text_content = render_to_string(text_template, context)
    # Fallback to stripped text if templates render empty for any reason
    if not text_content:
        text_content = strip_tags(html_content)

    to_email = [user.email]
    from_email = getattr(settings, "DEFAULT_FROM_EMAIL", None)

    msg = EmailMultiAlternatives(subject, text_content, from_email, to_email)
    if html_content:
        msg.attach_alternative(html_content, "text/html")
    msg.send(fail_silently=True)
