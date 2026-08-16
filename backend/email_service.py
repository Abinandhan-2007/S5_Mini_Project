import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging
import config

logger = logging.getLogger("carepulse.email")

def send_otp_email(to_email: str, patient_name: str, otp_code: str) -> bool:
    """
    Sends an actual HTML email containing the 6-digit verification code using SMTP.
    Supports Gmail, Outlook, Brevo, SendGrid, Amazon SES, or custom SMTP servers.
    """
    smtp_host = config.SMTP_HOST
    smtp_port = config.SMTP_PORT
    smtp_user = config.SMTP_USER.strip()
    smtp_pass = config.SMTP_PASSWORD.strip()
    from_email = config.SMTP_FROM_EMAIL.strip() or smtp_user
    from_name = config.SMTP_FROM_NAME.strip() or "CarePulse Security"

    if not smtp_user or not smtp_pass:
        logger.warning(
            f"[EMAIL SERVICE] Real email delivery skipped: SMTP_USER or SMTP_PASSWORD not set in .env. "
            f"Generated OTP for {to_email} is {otp_code}."
        )
        return False

    message = MIMEMultipart("alternative")
    message["Subject"] = f"Your CarePulse Password Reset OTP: {otp_code}"
    message["From"] = f"{from_name} <{from_email}>"
    message["To"] = to_email

    # Plaintext fallback
    text_content = f"""Hello {patient_name},

You requested to reset your password for CarePulse.
Your verification OTP code is: {otp_code}

This code will expire in 10 minutes. If you did not request this, please ignore this email.

Best regards,
The CarePulse Team
"""

    # Rich Responsive HTML Template
    html_content = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; }}
    .container {{ max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 24px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }}
    .header {{ background: linear-gradient(135deg, #0B5A54 0%, #14B8A6 100%); padding: 32px 24px; text-align: center; color: #ffffff; }}
    .content {{ padding: 32px 24px; text-align: center; color: #334155; }}
    .otp-box {{ display: inline-block; background: #f0fdf4; border: 2px dashed #0B5A54; border-radius: 16px; padding: 16px 36px; margin: 24px 0; }}
    .otp-code {{ font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #0B5A54; margin: 0; }}
    .footer {{ background: #f8fafc; padding: 20px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin:0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">CarePulse</h1>
      <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">Secure Password Reset</p>
    </div>
    <div class="content">
      <h2 style="margin: 0 0 12px; font-size: 18px; color: #0f172a;">Hello, {patient_name}</h2>
      <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #64748b;">
        We received a request to reset your CarePulse account password. Please use the 6-digit verification code below to proceed:
      </p>
      
      <div class="otp-box">
        <p class="otp-code">{otp_code}</p>
      </div>

      <p style="margin: 0 0 16px; font-size: 12px; color: #e11d48; font-weight: 600;">
        ⏱️ This code is valid for 10 minutes.
      </p>
      <p style="margin: 0; font-size: 12px; color: #94a3b8; line-height: 1.4;">
        If you did not request a password reset, you can safely disregard this email. Your password will remain unchanged.
      </p>
    </div>
    <div class="footer">
      &copy; 2026 CarePulse Healthcare System. All rights reserved.
    </div>
  </div>
</body>
</html>
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
        
        logger.info(f"[EMAIL SERVICE] Real OTP email sent successfully to {to_email}")
        return True
    except Exception as e:
        logger.error(f"[EMAIL SERVICE] Failed to send real email to {to_email}: {e}")
        return False
