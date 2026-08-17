import os
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging
try:
    import resend
except ImportError:
    resend = None
import config

logger = logging.getLogger("carepulse.email")

def send_otp_email(to_email: str, otp: str, patient_name: str = "User") -> bool:
    """
    Sends an OTP verification email using Resend API (primary) with SMTP fallback.
    """
    # 1. Primary: Resend API
    resend_api_key = (config.RESEND_API_KEY or os.getenv("RESEND_API_KEY") or "").strip()
    if resend_api_key and resend is not None:
        try:
            resend.api_key = resend_api_key
            from_sender = config.RESEND_FROM_EMAIL or "CarePulse <onboarding@resend.dev>"
            
            resend.Emails.send({
                "from": from_sender,
                "to": to_email,
                "subject": "Your CarePulse Password Reset Code",
                "html": f"""
                    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px;">
                        <h2 style="color: #0B5A54; margin-top: 0;">CarePulse Security</h2>
                        <p>Hello {patient_name},</p>
                        <p>You requested to reset your password. Your OTP verification code is:</p>
                        <div style="background: #f0fdf4; border: 2px dashed #0B5A54; border-radius: 12px; padding: 16px; text-align: center; margin: 20px 0;">
                            <span style="font-family: monospace; font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #0B5A54;">{otp}</span>
                        </div>
                        <p style="color: #e11d48; font-size: 13px; font-weight: 600;">⏱️ This code expires in 5 minutes.</p>
                        <p style="color: #64748b; font-size: 12px;">If you didn't request this, you can safely ignore this email.</p>
                    </div>
                """
            })
            logger.info(f"✅ [RESEND] Real OTP email successfully dispatched to {to_email}")
            return True
        except Exception as e:
            logger.error(f"❌ [RESEND] Failed to send email via Resend: {e}")

    # 2. Fallback: SMTP Email Server (e.g. Gmail)
    if config.SMTP_USER and config.SMTP_PASSWORD:
        return _send_smtp_email(to_email, otp, patient_name)

    logger.warning(
        f"[EMAIL SERVICE] Neither RESEND_API_KEY nor SMTP credentials configured in .env. "
        f"OTP for {to_email} is {otp}."
    )
    return False

def _send_smtp_email(to_email: str, otp_code: str, patient_name: str) -> bool:
    smtp_host = config.SMTP_HOST
    smtp_port = config.SMTP_PORT
    smtp_user = config.SMTP_USER.strip()
    smtp_pass = config.SMTP_PASSWORD.strip()
    from_email = config.SMTP_FROM_EMAIL.strip() or smtp_user
    from_name = config.SMTP_FROM_NAME.strip() or "CarePulse Security"

    message = MIMEMultipart("alternative")
    message["Subject"] = f"Your CarePulse Password Reset OTP: {otp_code}"
    message["From"] = f"{from_name} <{from_email}>"
    message["To"] = to_email

    text_content = f"Hello {patient_name},\n\nYour OTP verification code is: {otp_code}\nThis code expires in 5 minutes.\n"
    html_content = f"""
    <div style="font-family: sans-serif; padding: 20px;">
        <h2>CarePulse Password Reset</h2>
        <p>Hello {patient_name},</p>
        <p>Your OTP code is: <strong>{otp_code}</strong></p>
        <p>This code expires in 5 minutes.</p>
    </div>
    """
    message.attach(MIMEText(text_content, "plain"))
    message.attach(MIMEText(html_content, "html"))

    try:
        if smtp_port == 465:
            context = ssl.create_default_context()
            with smtplib.SMTP_SSL(smtp_host, smtp_port, context=context) as server:
                server.login(smtp_user, smtp_pass)
                server.sendmail(from_email, to_email, message.as_string())
        else:
            with smtplib.SMTP(smtp_host, smtp_port, timeout=15) as server:
                server.starttls(context=ssl.create_default_context())
                server.login(smtp_user, smtp_pass)
                server.sendmail(from_email, to_email, message.as_string())
        logger.info(f"✅ [SMTP] Real OTP email sent successfully to {to_email}")
        return True
    except Exception as e:
        logger.error(f"❌ [SMTP] Failed to send email to {to_email}: {e}")
        return False
