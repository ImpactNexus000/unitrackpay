import logging

import resend

from backend.config import settings

logger = logging.getLogger(__name__)


def _send(to: str, subject: str, html: str) -> None:
    """Send an email via Resend. Fails silently with a log if unconfigured."""
    if not settings.RESEND_API_KEY:
        logger.warning("RESEND_API_KEY not set — skipping email to %s", to)
        return

    resend.api_key = settings.RESEND_API_KEY

    try:
        resend.Emails.send(
            {
                "from": settings.FROM_EMAIL,
                "to": [to],
                "subject": subject,
                "html": html,
            }
        )
    except Exception as e:
        logger.error("Failed to send email to %s: %s", to, e)


def send_payment_confirmed(to: str, student_name: str, amount: float) -> None:
    _send(
        to=to,
        subject="Payment confirmed — UniTrackPay",
        html=f"""
        <h2>Payment confirmed</h2>
        <p>Hi {student_name},</p>
        <p>Your payment of <strong>£{amount:.2f}</strong> has been
        <span style="color: green; font-weight: bold;">confirmed</span>
        by the finance team.</p>
        <p>Log in to <a href="{settings.FRONTEND_URL}">UniTrackPay</a>
        to view your updated balance.</p>
        <p style="color: #999; font-size: 12px;">University of Hertfordshire</p>
        """,
    )


def send_payment_rejected(
    to: str, student_name: str, amount: float, note: str | None
) -> None:
    note_line = (
        f'<p><strong>Reason:</strong> {note}</p>' if note else ""
    )
    _send(
        to=to,
        subject="Payment rejected — UniTrackPay",
        html=f"""
        <h2>Payment rejected</h2>
        <p>Hi {student_name},</p>
        <p>Your payment of <strong>£{amount:.2f}</strong> has been
        <span style="color: red; font-weight: bold;">rejected</span>
        by the finance team.</p>
        {note_line}
        <p>If you believe this is an error, please contact the finance office
        or resubmit with the correct details.</p>
        <p>Log in to <a href="{settings.FRONTEND_URL}">UniTrackPay</a>
        to view your payment history.</p>
        <p style="color: #999; font-size: 12px;">University of Hertfordshire</p>
        """,
    )


def send_fee_added(
    to: str, student_name: str, description: str, amount: float
) -> None:
    _send(
        to=to,
        subject="New fee added to your account — UniTrackPay",
        html=f"""
        <h2>New fee item</h2>
        <p>Hi {student_name},</p>
        <p>A new fee has been added to your account:</p>
        <p><strong>{description}</strong> — £{amount:.2f}</p>
        <p>Log in to <a href="{settings.FRONTEND_URL}">UniTrackPay</a>
        to view your fees and balance.</p>
        <p style="color: #999; font-size: 12px;">University of Hertfordshire</p>
        """,
    )
