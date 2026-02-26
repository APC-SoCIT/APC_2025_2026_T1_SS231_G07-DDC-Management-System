"""
Custom Django Email Backend using Resend API (HTTPS)
This bypasses SMTP which is blocked on Railway free tier
"""
import os
import logging
import resend
from django.core.mail.backends.base import BaseEmailBackend
from django.conf import settings

logger = logging.getLogger(__name__)


class ResendEmailBackend(BaseEmailBackend):
    """
    Email backend that uses Resend's HTTP API instead of SMTP.
    Works on Railway and other platforms that block SMTP.
    """

    def __init__(self, fail_silently=False, **kwargs):
        super().__init__(fail_silently=fail_silently, **kwargs)
        # Set Resend API key
        resend.api_key = os.environ.get('RESEND_API_KEY', '')
        if not resend.api_key:
            logger.warning("RESEND_API_KEY not set in environment variables")

    def send_messages(self, email_messages):
        """
        Send one or more EmailMessage objects and return the number of email
        messages sent.
        """
        if not email_messages:
            return 0

        sent_count = 0
        for message in email_messages:
            try:
                sent = self._send(message)
                if sent:
                    sent_count += 1
            except Exception as e:
                logger.error(f"Failed to send email via Resend: {str(e)}")
                if not self.fail_silently:
                    raise

        return sent_count

    def _send(self, message):
        """Send a single email message using Resend API"""
        try:
            # Extract sender email from 'From' field
            from_email = message.from_email
            if not from_email:
                from_email = settings.DEFAULT_FROM_EMAIL

            # Override recipients for testing (if TEST_EMAIL_OVERRIDE is set)
            test_override = os.environ.get('TEST_EMAIL_OVERRIDE', '')
            recipients = [test_override] if test_override else message.to
            
            # Log original recipients if overriding
            if test_override and message.to != [test_override]:
                logger.info(f"[TEST MODE] Redirecting email from {message.to} to {test_override}")

            # Prepare email data for Resend
            email_data = {
                "from": from_email,
                "to": recipients,
                "subject": message.subject,
            }

            # Add CC if present
            if message.cc:
                email_data["cc"] = message.cc

            # Add BCC if present
            if message.bcc:
                email_data["bcc"] = message.bcc

            # Add reply-to if present
            if message.reply_to:
                email_data["reply_to"] = message.reply_to[0]

            # Handle HTML and plain text content
            if hasattr(message, 'alternatives') and message.alternatives:
                # Has HTML content
                for content, mimetype in message.alternatives:
                    if mimetype == 'text/html':
                        email_data["html"] = content
                        break
                # Plain text as fallback
                if message.body:
                    email_data["text"] = message.body
            else:
                # Plain text only
                email_data["text"] = message.body

            # Handle file attachments (e.g. PDF invoices)
            if hasattr(message, 'attachments') and message.attachments:
                resend_attachments = []
                for attachment in message.attachments:
                    if isinstance(attachment, tuple) and len(attachment) >= 2:
                        # Django EmailMessage stores attachments as (filename, content, mimetype)
                        att_filename = attachment[0] or 'attachment'
                        att_content = attachment[1]
                        att_mimetype = attachment[2] if len(attachment) > 2 else 'application/octet-stream'

                        # Resend expects content as list of byte values
                        if isinstance(att_content, bytes):
                            content_list = list(att_content)
                        elif isinstance(att_content, str):
                            content_list = list(att_content.encode('utf-8'))
                        else:
                            content_list = list(att_content)

                        resend_attachment = {
                            "filename": att_filename,
                            "content": content_list,
                        }
                        if att_mimetype:
                            resend_attachment["content_type"] = att_mimetype

                        resend_attachments.append(resend_attachment)
                        logger.info(f"Attaching file to Resend email: {att_filename} ({att_mimetype})")

                if resend_attachments:
                    email_data["attachments"] = resend_attachments

            # Send email via Resend API
            response = resend.Emails.send(email_data)

            logger.info(f"Email sent successfully via Resend API: {message.subject} to {message.to}")
            return True

        except Exception as e:
            logger.error(f"Resend API error: {str(e)}")
            if not self.fail_silently:
                raise
            return False
