"""
Email Service for Dorotheo Dental Clinic
Handles all email notifications for appointments, billing, inventory, etc.
"""
from django.core.mail import send_mail, EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings
from django.utils.html import strip_tags
from datetime import datetime, timedelta
import logging
import os

logger = logging.getLogger(__name__)


class EmailService:
    """Central service for sending all types of emails"""
    
    # Email Template Base with Modern Design
    EMAIL_TEMPLATE_BASE = """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>{title}</title>
        <!--[if mso]>
        <noscript>
            <xml>
                <o:OfficeDocumentSettings>
                    <o:PixelsPerInch>96</o:PixelsPerInch>
                </o:OfficeDocumentSettings>
            </xml>
        </noscript>
        <![endif]-->
        <style>
            body {{
                margin: 0;
                padding: 0;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                background-color: #f4f7fa;
                line-height: 1.6;
            }}
            .email-wrapper {{
                width: 100%;
                background-color: #f4f7fa;
                padding: 40px 20px;
            }}
            .email-container {{
                max-width: 600px;
                margin: 0 auto;
                background-color: #ffffff;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }}
            .email-header {{
                background: linear-gradient(135deg, #0f4c3a 0%, #1a7a5e 100%);
                color: #ffffff;
                padding: 30px;
                text-align: center;
            }}
            .email-header h1 {{
                margin: 0;
                font-size: 28px;
                font-weight: 600;
                letter-spacing: -0.5px;
            }}
            .email-header .logo {{
                font-size: 36px;
                margin-bottom: 10px;
            }}
            .email-body {{
                padding: 40px 30px;
                color: #333333;
            }}
            .greeting {{
                font-size: 18px;
                color: #333333;
                margin-bottom: 20px;
            }}
            .info-card {{
                background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
                border-left: 4px solid {accent_color};
                border-radius: 8px;
                padding: 24px;
                margin: 24px 0;
            }}
            .info-card h3 {{
                margin: 0 0 16px 0;
                color: #0f4c3a;
                font-size: 16px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }}
            .info-row {{
                display: flex;
                margin-bottom: 12px;
                align-items: flex-start;
            }}
            .info-label {{
                font-weight: 600;
                color: #495057;
                min-width: 140px;
                font-size: 14px;
            }}
            .info-value {{
                color: #212529;
                font-size: 14px;
            }}
            .highlight-box {{
                background: {highlight_bg};
                border: 2px solid {highlight_border};
                border-radius: 10px;
                padding: 20px;
                margin: 24px 0;
                text-align: center;
            }}
            .highlight-box .icon {{
                font-size: 48px;
                margin-bottom: 12px;
            }}
            .highlight-box .title {{
                font-size: 24px;
                font-weight: 700;
                color: {highlight_color};
                margin: 12px 0;
            }}
            .button {{
                display: inline-block;
                padding: 14px 32px;
                background: linear-gradient(135deg, #0f4c3a 0%, #1a7a5e 100%);
                color: #ffffff !important;
                text-decoration: none;
                border-radius: 8px;
                font-weight: 600;
                text-align: center;
                margin: 20px 0;
                box-shadow: 0 4px 6px rgba(15, 76, 58, 0.2);
                transition: all 0.3s ease;
            }}
            .button:hover {{
                box-shadow: 0 6px 8px rgba(15, 76, 58, 0.3);
                transform: translateY(-2px);
            }}
            .note {{
                background-color: #fff9e6;
                border-left: 4px solid #ffc107;
                padding: 16px;
                margin: 20px 0;
                border-radius: 4px;
                font-size: 14px;
                color: #856404;
            }}
            .footer {{
                background-color: #f8f9fa;
                padding: 30px;
                text-align: center;
                border-top: 1px solid #e9ecef;
            }}
            .footer-content {{
                color: #6c757d;
                font-size: 13px;
                line-height: 1.8;
            }}
            .footer-logo {{
                font-size: 20px;
                font-weight: 700;
                color: #0f4c3a;
                margin-bottom: 12px;
            }}
            .footer-links {{
                margin-top: 16px;
            }}
            .footer-links a {{
                color: #0f4c3a;
                text-decoration: none;
                margin: 0 10px;
                font-size: 13px;
            }}
            .divider {{
                height: 1px;
                background: linear-gradient(to right, transparent, #dee2e6, transparent);
                margin: 30px 0;
            }}
            @media only screen and (max-width: 600px) {{
                .email-wrapper {{
                    padding: 20px 10px;
                }}
                .email-body {{
                    padding: 30px 20px;
                }}
                .info-row {{
                    flex-direction: column;
                }}
                .info-label {{
                    min-width: auto;
                    margin-bottom: 4px;
                }}
            }}
        </style>
    </head>
    <body>
        <div class="email-wrapper">
            <div class="email-container">
                <div class="email-header">
                    <div class="logo">🦷</div>
                    <h1>Dorotheo Dental Clinic</h1>
                </div>
                <div class="email-body">
                    {content}
                </div>
                <div class="footer">
                    <div class="footer-logo">Dorotheo Dental Clinic</div>
                    <div class="footer-content">
                        <strong>Bacoor (Main Clinic):</strong> SM City Bacoor, Bacoor, Cavite<br>
                        <strong>Alabang:</strong> Alabang Town Center, Muntinlupa<br>
                        <strong>Email:</strong> info@dorothedentalclinic.com.ph<br>
                        <strong>Phone:</strong> (02) 1234-5678
                    </div>
                    <div class="footer-links">
                        <a href="#">Book Appointment</a> | 
                        <a href="#">Our Services</a> | 
                        <a href="#">Contact Us</a>
                    </div>
                    <div style="margin-top: 20px; font-size: 12px; color: #adb5bd;">
                        &copy; {year} Dorotheo Dental Clinic. All rights reserved.
                    </div>
                </div>
            </div>
        </div>
    </body>
    </html>
    """
    
    @staticmethod
    def _send_email(subject, recipient_list, html_content, text_content=None, send_to_admin=True):
        """
        Generic method to send emails with both HTML and plain text versions
        
        Args:
            subject: Email subject
            recipient_list: List of recipient email addresses
            html_content: HTML email body
            text_content: Plain text version (auto-generated if not provided)
            send_to_admin: If True, BCC admin notification email(s) (default: True)
        """
        try:
            if text_content is None:
                text_content = strip_tags(html_content)
            
            # Get admin notification email(s) from environment
            admin_emails_str = os.getenv('ADMIN_NOTIFICATION_EMAIL', '')
            
            email = EmailMultiAlternatives(
                subject=subject,
                body=text_content,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=recipient_list
            )
            email.attach_alternative(html_content, "text/html")
            
            # Add admin email(s) as BCC if configured and send_to_admin is True
            if send_to_admin and admin_emails_str:
                # Parse comma-separated admin emails
                admin_emails = [email.strip() for email in admin_emails_str.split(',') if email.strip()]
                
                # Filter out emails already in recipient list to avoid duplicates
                bcc_list = [admin_email for admin_email in admin_emails if admin_email not in recipient_list]
                
                if bcc_list:
                    email.bcc = bcc_list
                    logger.info(f"Adding admin BCC: {', '.join(bcc_list)}")
            
            email.send(fail_silently=False)
            
            logger.info(f"Email sent successfully: {subject} to {recipient_list}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email: {subject} to {recipient_list}. Error: {str(e)}")
            return False
    
    # ============================================
    # APPOINTMENT EMAILS
    # ============================================
    
    @staticmethod
    def send_appointment_confirmation(appointment):
        """Send email when appointment is confirmed"""
        subject = f"✅ Appointment Confirmed - {appointment.date.strftime('%B %d, %Y')}"
        
        # Get clinic location
        clinic_location = getattr(appointment, 'clinic', None)
        if clinic_location:
            clinic_name = clinic_location.name if hasattr(clinic_location, 'name') else str(clinic_location)
        else:
            clinic_name = "Dorotheo Dental Clinic - Bacoor (Main)"
        
        content = f"""
            <div class="highlight-box">
                <div class="icon">✅</div>
                <div class="title">Appointment Confirmed!</div>
            </div>
            
            <p class="greeting">Dear <strong>{appointment.patient.get_full_name()}</strong>,</p>
            
            <p>Great news! Your dental appointment has been confirmed. We look forward to seeing you!</p>
            
            <div class="info-card">
                <h3>📅 Appointment Details</h3>
                <div class="info-row">
                    <span class="info-label">📅 Date:</span>
                    <span class="info-value"><strong>{appointment.date.strftime('%A, %B %d, %Y')}</strong></span>
                </div>
                <div class="info-row">
                    <span class="info-label">🕐 Time:</span>
                    <span class="info-value"><strong>{appointment.time}</strong></span>
                </div>
                <div class="info-row">
                    <span class="info-label">👨‍⚕️ Dentist:</span>
                    <span class="info-value">Dr. {appointment.dentist.get_full_name()}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">🦷 Service:</span>
                    <span class="info-value">{appointment.service.name}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">📍 Location:</span>
                    <span class="info-value">{clinic_name}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">✓ Status:</span>
                    <span class="info-value" style="color: #28a745; font-weight: 600;">Confirmed</span>
                </div>
            </div>
            
            <div class="note">
                <strong>⏰ Please Note:</strong><br>
                • Arrive 10 minutes before your scheduled time<br>
                • Bring a valid ID and your previous dental records (if any)<br>
                • If you need to reschedule or cancel, please contact us at least 24 hours in advance
            </div>
            
            <div style="text-align: center;">
                <a href="#" class="button">View Appointment Details</a>
            </div>
            
            <div class="divider"></div>
            
            <p style="font-size: 14px; color: #6c757d;">
                If you have any questions or concerns, please don't hesitate to contact us.
            </p>
        """
        
        html_content = EmailService.EMAIL_TEMPLATE_BASE.format(
            title="Appointment Confirmed",
            content=content,
            accent_color="#28a745",
            highlight_bg="#d4edda",
            highlight_border="#28a745",
            highlight_color="#155724",
            year=datetime.now().year
        )
        
        return EmailService._send_email(
            subject=subject,
            recipient_list=[appointment.patient.email],
            html_content=html_content
        )
    
    @staticmethod
    def send_appointment_reminder(appointment):
        """Send reminder email 24 hours before appointment"""
        subject = f"⏰ Reminder: Your Appointment Tomorrow at {appointment.time}"
        
        # Get clinic location
        clinic_location = getattr(appointment, 'clinic', None)
        if clinic_location:
            clinic_name = clinic_location.name if hasattr(clinic_location, 'name') else str(clinic_location)
        else:
            clinic_name = "Dorotheo Dental Clinic - Bacoor (Main)"
        
        content = f"""
            <div class="highlight-box">
                <div class="icon">⏰</div>
                <div class="title">Appointment Reminder</div>
            </div>
            
            <p class="greeting">Dear <strong>{appointment.patient.get_full_name()}</strong>,</p>
            
            <p>This is a friendly reminder about your upcoming dental appointment <strong>tomorrow</strong>!</p>
            
            <div class="info-card">
                <h3>📅 Your Appointment Tomorrow</h3>
                <div class="info-row">
                    <span class="info-label">📅 Date:</span>
                    <span class="info-value"><strong>{appointment.date.strftime('%A, %B %d, %Y')}</strong></span>
                </div>
                <div class="info-row">
                    <span class="info-label">🕐 Time:</span>
                    <span class="info-value"><strong style="font-size: 18px; color: #ffc107;">{appointment.time}</strong></span>
                </div>
                <div class="info-row">
                    <span class="info-label">👨‍⚕️ Dentist:</span>
                    <span class="info-value">Dr. {appointment.dentist.get_full_name()}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">🦷 Service:</span>
                    <span class="info-value">{appointment.service.name}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">📍 Location:</span>
                    <span class="info-value">{clinic_name}</span>
                </div>
            </div>
            
            <div class="note">
                <strong>⏰ Important Reminders:</strong><br>
                • Please arrive 10 minutes early<br>
                • Bring a valid ID<br>
                • If you need to cancel or reschedule, please contact us as soon as possible<br>
                • A 24-hour notice is required for cancellations
            </div>
            
            <p style="text-align: center; font-size: 18px; color: #0f4c3a; margin: 30px 0;">
                <strong>We look forward to seeing you tomorrow! 😊</strong>
            </p>
            
            <div class="divider"></div>
            
            <p style="font-size: 14px; color: #6c757d;">
                Need to reschedule? Contact us immediately at <strong>(02) 1234-5678</strong>
            </p>
        """
        
        html_content = EmailService.EMAIL_TEMPLATE_BASE.format(
            title="Appointment Reminder",
            content=content,
            accent_color="#ffc107",
            highlight_bg="#fff3cd",
            highlight_border="#ffc107",
            highlight_color="#856404",
            year=datetime.now().year
        )
        
        return EmailService._send_email(
            subject=subject,
            recipient_list=[appointment.patient.email],
            html_content=html_content
        )
    
    @staticmethod
    def send_appointment_cancelled(appointment, cancelled_by, reason=""):
        """Send email when appointment is cancelled"""
        subject = f"❌ Appointment Cancelled - {appointment.date.strftime('%B %d, %Y')}"
        
        content = f"""
            <div class="highlight-box">
                <div class="icon">❌</div>
                <div class="title">Appointment Cancelled</div>
            </div>
            
            <p class="greeting">Dear <strong>{appointment.patient.get_full_name()}</strong>,</p>
            
            <p>We're writing to confirm that your dental appointment has been cancelled.</p>
            
            <div class="info-card">
                <h3>📋 Cancelled Appointment Details</h3>
                <div class="info-row">
                    <span class="info-label">📅 Date:</span>
                    <span class="info-value">{appointment.date.strftime('%A, %B %d, %Y')}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">🕐 Time:</span>
                    <span class="info-value">{appointment.time}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">👨‍⚕️ Dentist:</span>
                    <span class="info-value">Dr. {appointment.dentist.get_full_name()}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">🦷 Service:</span>
                    <span class="info-value">{appointment.service.name}</span>
                </div>
                {f'''<div class="info-row">
                    <span class="info-label">📝 Reason:</span>
                    <span class="info-value">{reason}</span>
                </div>''' if reason else ''}
            </div>
            
            <p>We understand that schedules can change. If you'd like to book a new appointment, we're here to help!</p>
            
            <div style="text-align: center;">
                <a href="#" class="button">Book New Appointment</a>
            </div>
            
            <div class="divider"></div>
            
            <p style="font-size: 14px; color: #6c757d;">
                Have questions? Contact us at <strong>(02) 1234-5678</strong> or reply to this email.
            </p>
        """
        
        html_content = EmailService.EMAIL_TEMPLATE_BASE.format(
            title="Appointment Cancelled",
            content=content,
            accent_color="#dc3545",
            highlight_bg="#f8d7da",
            highlight_border="#dc3545",
            highlight_color="#721c24",
            year=datetime.now().year
        )
        
        return EmailService._send_email(
            subject=subject,
            recipient_list=[appointment.patient.email],
            html_content=html_content
        )
    
    @staticmethod
    def send_reschedule_approved(appointment, old_date, old_time):
        """Send email when reschedule request is approved"""
        subject = f"✅ Reschedule Approved - New Date: {appointment.date.strftime('%B %d, %Y')}"
        
        content = f"""
            <div class="highlight-box">
                <div class="icon">✅</div>
                <div class="title">Reschedule Request Approved!</div>
            </div>
            
            <p class="greeting">Dear <strong>{appointment.patient.get_full_name()}</strong>,</p>
            
            <p>Great news! Your reschedule request has been approved. Here are your updated appointment details:</p>
            
            <div style="background: linear-gradient(135deg, #fff5f5 0%, #ffe5e5 100%); border-radius: 8px; padding: 20px; margin: 24px 0; text-align: center;">
                <h3 style="color: #999; margin: 0 0 12px 0; font-size: 14px; text-transform: uppercase;">Previous Schedule</h3>
                <p style="text-decoration: line-through; color: #999; font-size: 16px; margin: 8px 0;">
                    {old_date.strftime('%B %d, %Y')} at {old_time}
                </p>
            </div>
            
            <div style="background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%); border: 3px solid #28a745; border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;">
                <h3 style="color: #155724; margin: 0 0 16px 0; font-size: 18px; font-weight: 700; text-transform: uppercase;">⬇ New Schedule</h3>
                <div style="background: white; border-radius: 8px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <p style="color: #28a745; font-weight: 700; font-size: 24px; margin: 0;">
                        {appointment.date.strftime('%B %d, %Y')}
                    </p>
                    <p style="color: #28a745; font-weight: 700; font-size: 32px; margin: 12px 0;">
                        {appointment.time}
                    </p>
                </div>
            </div>
            
            <div class="info-card">
                <h3>📅 Complete Appointment Details</h3>
                <div class="info-row">
                    <span class="info-label">👨‍⚕️ Dentist:</span>
                    <span class="info-value">Dr. {appointment.dentist.get_full_name()}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">🦷 Service:</span>
                    <span class="info-value">{appointment.service.name}</span>
                </div>
            </div>
            
            <div class="note">
                <strong>⏰ Please Remember:</strong><br>
                • Mark your calendar with the new date and time<br>
                • Arrive 10 minutes before your appointment<br>
                • Contact us 24 hours in advance if you need to make any changes
            </div>
            
            <p style="text-align: center; font-size: 18px; color: #0f4c3a; margin: 30px 0;">
                <strong>We look forward to seeing you! 😊</strong>
            </p>
        """
        
        html_content = EmailService.EMAIL_TEMPLATE_BASE.format(
            title="Reschedule Approved",
            content=content,
            accent_color="#28a745",
            highlight_bg="#d4edda",
            highlight_border="#28a745",
            highlight_color="#155724",
            year=datetime.now().year
        )
        
        return EmailService._send_email(
            subject=subject,
            recipient_list=[appointment.patient.email],
            html_content=html_content
        )
    
    @staticmethod
    def send_reschedule_rejected(appointment, reason=""):
        """Send email when reschedule request is rejected"""
        subject = f"⚠️ Reschedule Request Could Not Be Approved"
        
        content = f"""
            <div class="highlight-box">
                <div class="icon">⚠️</div>
                <div class="title">Reschedule Request Update</div>
            </div>
            
            <p class="greeting">Dear <strong>{appointment.patient.get_full_name()}</strong>,</p>
            
            <p>We've reviewed your reschedule request. Unfortunately, we're unable to approve the change at this time.</p>
            
            {f'''<div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 16px; margin: 20px 0; border-radius: 4px;">
                <strong style="color: #856404;">📝 Reason:</strong><br>
                <span style="color: #856404;">{reason}</span>
            </div>''' if reason else ''}
            
            <div class="info-card">
                <h3>✓ Your Original Appointment Remains Confirmed</h3>
                <div class="info-row">
                    <span class="info-label">📅 Date:</span>
                    <span class="info-value"><strong>{appointment.date.strftime('%A, %B %d, %Y')}</strong></span>
                </div>
                <div class="info-row">
                    <span class="info-label">🕐 Time:</span>
                    <span class="info-value"><strong>{appointment.time}</strong></span>
                </div>
                <div class="info-row">
                    <span class="info-label">👨‍⚕️ Dentist:</span>
                    <span class="info-value">Dr. {appointment.dentist.get_full_name()}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">🦷 Service:</span>
                    <span class="info-value">{appointment.service.name}</span>
                </div>
            </div>
            
            <p>If you need to explore alternative scheduling options or discuss this further, please don't hesitate to contact us.</p>
            
            <div style="text-align: center;">
                <a href="#" class="button">Contact Us</a>
            </div>
            
            <div class="divider"></div>
            
            <p style="font-size: 14px; color: #6c757d;">
                Call us at <strong>(02) 1234-5678</strong> to discuss alternative dates that may work better.
            </p>
        """
        
        html_content = EmailService.EMAIL_TEMPLATE_BASE.format(
            title="Reschedule Request Update",
            content=content,
            accent_color="#ffc107",
            highlight_bg="#fff3cd",
            highlight_border="#ffc107",
            highlight_color="#856404",
            year=datetime.now().year
        )
        
        return EmailService._send_email(
            subject=subject,
            recipient_list=[appointment.patient.email],
            html_content=html_content
        )
    
    # ============================================
    # BILLING EMAILS
    # ============================================
    
    @staticmethod
    def send_invoice(billing):
        """Send invoice to patient"""
        subject = f"📝 Invoice #{billing.id} - Dorotheo Dental Clinic"
        
        content = f"""
            <div class="highlight-box">
                <div class="icon">📝</div>
                <div class="title">Invoice</div>
            </div>
            
            <p class="greeting">Dear <strong>{billing.patient.get_full_name()}</strong>,</p>
            
            <p>Thank you for choosing Dorotheo Dental Clinic. Please find your invoice details below:</p>
            
            <div class="info-card">
                <h3>📄 Invoice Details</h3>
                <div class="info-row">
                    <span class="info-label">🔢 Invoice Number:</span>
                    <span class="info-value"><strong>#{billing.id}</strong></span>
                </div>
                <div class="info-row">
                    <span class="info-label">📅 Date Issued:</span>
                    <span class="info-value">{billing.created_at.strftime('%B %d, %Y')}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">📝 Description:</span>
                    <span class="info-value">{billing.description}</span>
                </div>
                {f'''<div class="info-row">
                    <span class="info-label">📅 Related Appointment:</span>
                    <span class="info-value">{billing.appointment.date.strftime('%B %d, %Y')} at {billing.appointment.time}</span>
                </div>''' if billing.appointment else ''}
            </div>
            
            <div style="background: linear-gradient(135deg, #e7f3ff 0%, #cfe8ff 100%); border: 3px solid #0f4c3a; border-radius: 12px; padding: 30px; margin: 30px 0; text-align: center;">
                <p style="margin: 0 0 8px 0; color: #495057; font-size: 16px; text-transform: uppercase; letter-spacing: 1px;">
                    <strong>Amount Due</strong>
                </p>
                <p style="margin: 0; color: #0f4c3a; font-size: 42px; font-weight: 700;">
                    ₱{billing.amount:,.2f}
                </p>
                <p style="margin: 16px 0 0 0; font-size: 14px;">
                    <span style="padding: 6px 16px; background-color: {'#28a745' if billing.status == 'paid' else '#ffc107'}; color: white; border-radius: 20px; font-weight: 600; text-transform: uppercase;">
                        {billing.status}
                    </span>
                </p>
            </div>
            
            <div class="note">
                <strong>💳 Payment Options:</strong><br>
                • <strong>At the Clinic:</strong> Cash, Credit/Debit Card, GCash, Maya<br>
                • <strong>Bank Transfer:</strong> Contact us for account details<br>
                • <strong>Online Portal:</strong> Visit our website for secure payment
            </div>
            
            <div style="text-align: center;">
                <a href="#" class="button">Pay Now</a>
            </div>
            
            <div class="divider"></div>
            
            <p style="font-size: 14px; color: #6c757d;">
                Questions about your invoice? Contact our billing department at <strong>(02) 1234-5678</strong>
            </p>
        """
        
        html_content = EmailService.EMAIL_TEMPLATE_BASE.format(
            title=f"Invoice #{billing.id}",
            content=content,
            accent_color="#0f4c3a",
            highlight_bg="#e7f3ff",
            highlight_border="#0f4c3a",
            highlight_color="#0f4c3a",
            year=datetime.now().year
        )
        
        return EmailService._send_email(
            subject=subject,
            recipient_list=[billing.patient.email],
            html_content=html_content
        )
    
    @staticmethod
    def send_payment_confirmation(billing):
        """Send payment confirmation to patient"""
        subject = f"✅ Payment Received - Invoice #{billing.id}"
        
        content = f"""
            <div class="highlight-box">
                <div class="icon">✅</div>
                <div class="title">Payment Received!</div>
            </div>
            
            <p class="greeting">Dear <strong>{billing.patient.get_full_name()}</strong>,</p>
            
            <p>Thank you! We have successfully received your payment.</p>
            
            <div style="background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%); border: 3px solid #28a745; border-radius: 12px; padding: 30px; margin: 30px 0; text-align: center;">
                <p style="margin: 0 0 8px 0; color: #155724; font-size: 16px; text-transform: uppercase; letter-spacing: 1px;">
                    <strong>✅ Amount Paid</strong>
                </p>
                <p style="margin: 0; color: #28a745; font-size: 42px; font-weight: 700;">
                    ₱{billing.amount:,.2f}
                </p>
                <p style="margin: 16px 0 0 0; font-size: 14px; color: #155724;">
                    <span style="padding: 6px 16px; background-color: #28a745; color: white; border-radius: 20px; font-weight: 600; text-transform: uppercase;">
                        PAID
                    </span>
                </p>
            </div>
            
            <div class="info-card">
                <h3>🧾 Payment Receipt</h3>
                <div class="info-row">
                    <span class="info-label">🔢 Invoice Number:</span>
                    <span class="info-value"><strong>#{billing.id}</strong></span>
                </div>
                <div class="info-row">
                    <span class="info-label">📅 Payment Date:</span>
                    <span class="info-value">{billing.updated_at.strftime('%B %d, %Y')}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">📝 Description:</span>
                    <span class="info-value">{billing.description}</span>
                </div>
            </div>
            
            <div style="background-color: #d4edda; border-left: 4px solid #28a745; padding: 16px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0; color: #155724; font-size: 16px;">
                    <strong>✅ Your account is now up to date!</strong><br>
                    <span style="font-size: 14px;">Thank you for your prompt payment.</span>
                </p>
            </div>
            
            <p style="text-align: center; font-size: 18px; color: #0f4c3a; margin: 30px 0;">
                <strong>Thank you for choosing Dorotheo Dental Clinic! 😊</strong>
            </p>
            
            <div class="divider"></div>
            
            <p style="font-size: 14px; color: #6c757d;">
                Need a detailed receipt or have questions? Contact us at <strong>(02) 1234-5678</strong>
            </p>
        """
        
        html_content = EmailService.EMAIL_TEMPLATE_BASE.format(
            title="Payment Received",
            content=content,
            accent_color="#28a745",
            highlight_bg="#d4edda",
            highlight_border="#28a745",
            highlight_color="#155724",
            year=datetime.now().year
        )
        
        return EmailService._send_email(
            subject=subject,
            recipient_list=[billing.patient.email],
            html_content=html_content
        )
    
    @staticmethod
    def send_payment_reminder(billing, days_overdue=0):
        """Send payment reminder for unpaid invoices"""
        subject = f"⏰ Payment Reminder - Invoice #{billing.id}"
        
        content = f"""
            <div class="highlight-box">
                <div class="icon">⏰</div>
                <div class="title">Payment Reminder</div>
            </div>
            
            <p class="greeting">Dear <strong>{billing.patient.get_full_name()}</strong>,</p>
            
            <p>This is a friendly reminder about your outstanding balance with Dorotheo Dental Clinic.</p>
            
            <div style="background: linear-gradient(135deg, #fff3cd 0%, #ffe69c 100%); border: 3px solid #ffc107; border-radius: 12px; padding: 30px; margin: 30px 0; text-align: center;">
                <p style="margin: 0 0 8px 0; color: #856404; font-size: 16px; text-transform: uppercase; letter-spacing: 1px;">
                    <strong>⏰ Outstanding Balance</strong>
                </p>
                <p style="margin: 0; color: #ffc107; font-size: 42px; font-weight: 700;">
                    ₱{billing.amount:,.2f}
                </p>
                {f'''<p style="margin: 16px 0 0 0; font-size: 16px; color: #721c24;">
                    <span style="padding: 6px 16px; background-color: #dc3545; color: white; border-radius: 20px; font-weight: 600;">
                        {days_overdue} DAYS OVERDUE
                    </span>
                </p>''' if days_overdue > 0 else ''}
            </div>
            
            <div class="info-card">
                <h3>📄 Invoice Details</h3>
                <div class="info-row">
                    <span class="info-label">🔢 Invoice Number:</span>
                    <span class="info-value"><strong>#{billing.id}</strong></span>
                </div>
                <div class="info-row">
                    <span class="info-label">📅 Invoice Date:</span>
                    <span class="info-value">{billing.created_at.strftime('%B %d, %Y')}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">📝 Description:</span>
                    <span class="info-value">{billing.description}</span>
                </div>
            </div>
            
            <div class="note">
                <strong>💳 Payment Options:</strong><br>
                • <strong>At the Clinic:</strong> Cash, Credit/Debit Card, GCash, Maya<br>
                • <strong>Bank Transfer:</strong> Contact us for account details<br>
                • <strong>Online Portal:</strong> Visit our website for secure payment
            </div>
            
            <div style="text-align: center;">
                <a href="#" class="button">Pay Now</a>
            </div>
            
            <p>If you have already made this payment, please disregard this reminder or contact us to confirm receipt.</p>
            
            <div class="divider"></div>
            
            <p style="font-size: 14px; color: #6c757d;">
                Questions or concerns? Contact our billing department at <strong>(02) 1234-5678</strong>
            </p>
        """
        
        html_content = EmailService.EMAIL_TEMPLATE_BASE.format(
            title="Payment Reminder",
            content=content,
            accent_color="#ffc107",
            highlight_bg="#fff3cd",
            highlight_border="#ffc107",
            highlight_color="#856404",
            year=datetime.now().year
        )
        
        return EmailService._send_email(
            subject=subject,
            recipient_list=[billing.patient.email],
            html_content=html_content
        )
    
    # ============================================
    # INVENTORY EMAILS (Staff Alerts)
    # ============================================
    
    @staticmethod
    def send_low_stock_alert(inventory_item, staff_emails):
        """Send low stock alert to staff/owner"""
        subject = f"⚠️ Low Stock Alert: {inventory_item.name}"
        
        content = f"""
            <div class="highlight-box">
                <div class="icon">⚠️</div>
                <div class="title">Low Stock Alert</div>
            </div>
            
            <p class="greeting">Dear Team,</p>
            
            <p><strong>Urgent:</strong> The following inventory item has fallen below the minimum stock level and requires immediate attention.</p>
            
            <div style="background: linear-gradient(135deg, #f8d7da 0%, #f5c2c7 100%); border: 3px solid #dc3545; border-radius: 12px; padding: 24px; margin: 30px 0;">
                <h3 style="margin: 0 0 20px 0; color: #721c24; text-align: center; font-size: 20px;">
                    📦 {inventory_item.name}
                </h3>
                <div style="background: white; border-radius: 8px; padding: 20px;">
                    <div class="info-row" style="margin-bottom: 12px;">
                        <span class="info-label">📂 Category:</span>
                        <span class="info-value">{inventory_item.category}</span>
                    </div>
                    <div class="info-row" style="margin-bottom: 12px;">
                        <span class="info-label">📉 Current Stock:</span>
                        <span class="info-value" style="color: #dc3545; font-size: 24px; font-weight: 700;">{inventory_item.quantity}</span>
                    </div>
                    <div class="info-row" style="margin-bottom: 12px;">
                        <span class="info-label">⚠️ Minimum Required:</span>
                        <span class="info-value" style="font-weight: 600;">{inventory_item.min_stock}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">🛍️ Supplier:</span>
                        <span class="info-value">{inventory_item.supplier}</span>
                    </div>
                </div>
            </div>
            
            <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 20px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0; color: #856404;">
                    <strong>⚡ Action Required:</strong><br>
                    Please reorder this item immediately to maintain adequate stock levels and prevent service disruptions.
                </p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="#" class="button">View Inventory Dashboard</a>
            </div>
            
            <div class="divider"></div>
            
            <p style="font-size: 13px; color: #6c757d; text-align: center;">
                This is an automated alert from the Dorotheo Dental Clinic Inventory Management System
            </p>
        """
        
        html_content = EmailService.EMAIL_TEMPLATE_BASE.format(
            title="Low Stock Alert",
            content=content,
            accent_color="#dc3545",
            highlight_bg="#f8d7da",
            highlight_border="#dc3545",
            highlight_color="#721c24",
            year=datetime.now().year
        )
        
        return EmailService._send_email(
            subject=subject,
            recipient_list=staff_emails,
            html_content=html_content
        )
    
    # ============================================
    # STAFF NOTIFICATION EMAILS
    # ============================================
    
    @staticmethod
    def notify_staff_new_appointment(appointment, staff_emails):
        """Notify staff about new appointment requests"""
        subject = f"📋 New Appointment Request - {appointment.patient.get_full_name()}"
        
        content = f"""
            <div class="highlight-box">
                <div class="icon">📋</div>
                <div class="title">New Appointment Request</div>
            </div>
            
            <p class="greeting">Dear Staff,</p>
            
            <p>A new appointment request has been submitted and requires your attention for confirmation.</p>
            
            <div class="info-card">
                <h3>👤 Patient Information</h3>
                <div class="info-row">
                    <span class="info-label">👤 Name:</span>
                    <span class="info-value"><strong>{appointment.patient.get_full_name()}</strong></span>
                </div>
                <div class="info-row">
                    <span class="info-label">📧 Email:</span>
                    <span class="info-value">{appointment.patient.email}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">📱 Phone:</span>
                    <span class="info-value">{appointment.patient.phone or 'N/A'}</span>
                </div>
            </div>
            
            <div class="info-card">
                <h3>📅 Appointment Details</h3>
                <div class="info-row">
                    <span class="info-label">📅 Date:</span>
                    <span class="info-value"><strong>{appointment.date.strftime('%A, %B %d, %Y')}</strong></span>
                </div>
                <div class="info-row">
                    <span class="info-label">🕐 Time:</span>
                    <span class="info-value"><strong>{appointment.time}</strong></span>
                </div>
                <div class="info-row">
                    <span class="info-label">👨‍⚕️ Dentist:</span>
                    <span class="info-value">Dr. {appointment.dentist.get_full_name()}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">🦷 Service:</span>
                    <span class="info-value">{appointment.service.name}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">⚡ Status:</span>
                    <span class="info-value" style="padding: 4px 12px; background-color: #ffc107; color: #856404; border-radius: 12px; font-weight: 600; text-transform: uppercase; font-size: 12px;">
                        {appointment.status}
                    </span>
                </div>
            </div>
            
            <div style="background-color: #e7f3ff; border-left: 4px solid #0f4c3a; padding: 20px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0; color: #0c3d2e;">
                    <strong>⚡ Action Required:</strong><br>
                    Please review this appointment request in the staff portal and confirm or adjust the booking as needed.
                </p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="#" class="button">Open Staff Portal</a>
            </div>
            
            <div class="divider"></div>
            
            <p style="font-size: 13px; color: #6c757d; text-align: center;">
                This is an automated notification from the Dorotheo Dental Clinic Staff Portal
            </p>
        """
        
        html_content = EmailService.EMAIL_TEMPLATE_BASE.format(
            title="New Appointment Request",
            content=content,
            accent_color="#0f4c3a",
            highlight_bg="#e7f3ff",
            highlight_border="#0f4c3a",
            highlight_color="#0f4c3a",
            year=datetime.now().year
        )
        
        return EmailService._send_email(
            subject=subject,
            recipient_list=staff_emails,
            html_content=html_content
        )
    
    # ============================================
    # PASSWORD RESET EMAILS
    # ============================================
    
    @staticmethod
    def send_password_reset_email(user, reset_link, token, expires_in_hours=1):
        """Send password reset email with token and link"""
        subject = "🔒 Password Reset Request - Dorotheo Dental Clinic"
        
        content = f"""
            <div class="highlight-box">
                <div class="icon">🔒</div>
                <div class="title">Password Reset Request</div>
            </div>
            
            <p class="greeting">Dear <strong>{user.get_full_name()}</strong>,</p>
            
            <p>We received a request to reset the password for your Dorotheo Dental Clinic account.</p>
            
            <div class="note">
                <strong>⚠️ Important:</strong><br>
                If you did not request this password reset, please ignore this email. Your password will remain unchanged.
            </div>
            
            <div style="background: linear-gradient(135deg, #e7f3ff 0%, #cfe8ff 100%); border: 3px solid #0f4c3a; border-radius: 12px; padding: 30px; margin: 30px 0; text-align: center;">
                <h3 style="margin: 0 0 20px 0; color: #0f4c3a; font-size: 18px;">Reset Your Password</h3>
                <p style="margin: 0 0 24px 0; color: #495057; font-size: 14px;">Click the button below to create a new password:</p>
                <a href="{reset_link}" class="button" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #0f4c3a 0%, #1a7a5e 100%); color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: 600; box-shadow: 0 4px 6px rgba(15, 76, 58, 0.2);">
                    Reset Password Now
                </a>
                <p style="margin: 24px 0 0 0; color: #6c757d; font-size: 13px;">
                    Or copy and paste this link into your browser:<br>
                    <span style="word-break: break-all; color: #0f4c3a;">{reset_link}</span>
                </p>
            </div>
            
            <div class="info-card">
                <h3>⏱️ Important Information</h3>
                <div class="info-row">
                    <span class="info-label">⏰ Valid For:</span>
                    <span class="info-value"><strong>{expires_in_hours} hour{'s' if expires_in_hours > 1 else ''}</strong></span>
                </div>
                <div class="info-row">
                    <span class="info-label">🔐 Security:</span>
                    <span class="info-value">This link can only be used once</span>
                </div>
                <div class="info-row">
                    <span class="info-label">📧 Account:</span>
                    <span class="info-value">{user.email}</span>
                </div>
            </div>
            
            <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 16px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0; color: #856404; font-size: 14px;">
                    <strong>🔒 Security Tips:</strong><br>
                    • Never share your password with anyone<br>
                    • Use a strong, unique password<br>
                    • If you didn't request this reset, please contact us immediately
                </p>
            </div>
            
            <div class="divider"></div>
            
            <p style="font-size: 14px; color: #6c757d;">
                Need help? Contact us at <strong>(02) 1234-5678</strong> or reply to this email.
            </p>
        """
        
        html_content = EmailService.EMAIL_TEMPLATE_BASE.format(
            title="Password Reset Request",
            content=content,
            accent_color="#0f4c3a",
            highlight_bg="#e7f3ff",
            highlight_border="#0f4c3a",
            highlight_color="#0f4c3a",
            year=datetime.now().year
        )
        
        return EmailService._send_email(
            subject=subject,
            recipient_list=[user.email],
            html_content=html_content,
            send_to_admin=False  # Don't BCC admin for password resets (privacy)
        )
    
    @staticmethod
    def send_password_reset_confirmation(user):
        """Send confirmation email after successful password reset"""
        subject = "✅ Password Successfully Changed - Dorotheo Dental Clinic"
        
        content = f"""
            <div class="highlight-box">
                <div class="icon">✅</div>
                <div class="title">Password Changed Successfully</div>
            </div>
            
            <p class="greeting">Dear <strong>{user.get_full_name()}</strong>,</p>
            
            <p>Your password has been successfully changed. You can now use your new password to log in to your account.</p>
            
            <div style="background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%); border: 3px solid #28a745; border-radius: 12px; padding: 30px; margin: 30px 0; text-align: center;">
                <div style="font-size: 48px; margin-bottom: 12px;">✓</div>
                <h3 style="margin: 0; color: #155724; font-size: 24px; font-weight: 700;">Password Updated</h3>
                <p style="margin: 12px 0 0 0; color: #155724; font-size: 16px;">
                    Your account is now secured with your new password
                </p>
            </div>
            
            <div class="info-card">
                <h3>📧 Account Details</h3>
                <div class="info-row">
                    <span class="info-label">📧 Email:</span>
                    <span class="info-value">{user.email}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">⏰ Changed:</span>
                    <span class="info-value">{datetime.now().strftime('%B %d, %Y at %I:%M %p')}</span>
                </div>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="#" class="button">Log In Now</a>
            </div>
            
            <div style="background-color: #f8d7da; border-left: 4px solid #dc3545; padding: 16px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0; color: #721c24; font-size: 14px;">
                    <strong>⚠️ Didn't make this change?</strong><br>
                    If you did not change your password, please contact us immediately at <strong>(02) 1234-5678</strong> or reply to this email. Your account security may be at risk.
                </p>
            </div>
            
            <div class="divider"></div>
            
            <p style="font-size: 14px; color: #6c757d;">
                This is an automated security notification. For your protection, we notify you whenever your password is changed.
            </p>
        """
        
        html_content = EmailService.EMAIL_TEMPLATE_BASE.format(
            title="Password Changed Successfully",
            content=content,
            accent_color="#28a745",
            highlight_bg="#d4edda",
            highlight_border="#28a745",
            highlight_color="#155724",
            year=datetime.now().year
        )
        
        return EmailService._send_email(
            subject=subject,
            recipient_list=[user.email],
            html_content=html_content,
            send_to_admin=False  # Don't BCC admin for password resets (privacy)
        )
    
    @staticmethod
    def send_invoice_email_to_patient(invoice):
        """
        Send invoice email with PDF attachment to the patient.
        
        Args:
            invoice: Invoice model instance
            
        Returns:
            bool: True if email was sent successfully, False otherwise
        """
        try:
            from .invoice_generator import generate_invoice_pdf
            from django.core.mail import EmailMultiAlternatives
            
            # Get patient balance
            patient_balance = 0
            if hasattr(invoice.patient, 'balance_record'):
                patient_balance = invoice.patient.balance_record.current_balance
            
            # Prepare context for email template
            context = {
                'patient_name': invoice.patient.first_name,
                'invoice_number': invoice.invoice_number,
                'reference_number': invoice.reference_number,
                'invoice_date': invoice.invoice_date.strftime('%B %d, %Y'),
                'due_date': invoice.due_date.strftime('%B %d, %Y'),
                'service_name': invoice.appointment.service.name,
                'total_due': f"{invoice.total_due:,.2f}",
                'patient_balance': f"{patient_balance:,.2f}",
                'clinic_name': invoice.clinic.name,
                'clinic_address': invoice.clinic.address,
                'clinic_email': getattr(invoice.clinic, 'email', 'contact@clinic.com'),
                'clinic_phone': invoice.clinic.phone,
                'portal_url': f"{settings.FRONTEND_URL}/patient/billing" if hasattr(settings, 'FRONTEND_URL') else "#",
            }
            
            # Render email HTML
            html_message = render_to_string('emails/invoice_patient.html', context)
            
            # Create plain text version
            text_message = strip_tags(html_message)
            
            # Create email
            subject = f"Invoice {invoice.invoice_number} - {invoice.clinic.name}"
            from_email = settings.DEFAULT_FROM_EMAIL
            recipient_list = [invoice.patient.email]
            
            email = EmailMultiAlternatives(
                subject=subject,
                body=text_message,
                from_email=from_email,
                to=recipient_list,
            )
            
            # Attach HTML version
            email.attach_alternative(html_message, "text/html")
            
            # Try to generate and attach PDF (optional - don't fail if it doesn't work)
            try:
                pdf_content, pdf_filename = generate_invoice_pdf(invoice)
                email.attach(pdf_filename, pdf_content, 'application/pdf')
                logger.info(f"PDF attached to patient invoice email for {invoice.invoice_number}")
            except Exception as pdf_error:
                logger.warning(f"Could not generate PDF for invoice {invoice.invoice_number}: {str(pdf_error)}. Email will be sent without PDF.")
            
            # Send email
            email.send()
            
            logger.info(f"Invoice email sent to patient {invoice.patient.email} for invoice {invoice.invoice_number}")
            return True
            
        except Exception as e:
            logger.error(f"Error sending invoice email to patient: {str(e)}")
            logger.exception("Full traceback:")  # This logs the full traceback
            return False
    
    @staticmethod
    def send_invoice_email_to_staff(invoice, staff_emails=None):
        """
        Send invoice notification email with PDF attachment to clinic staff.
        
        Args:
            invoice: Invoice model instance
            staff_emails: Optional list of staff email addresses. If None, sends to clinic default emails.
            
        Returns:
            bool: True if email was sent successfully, False otherwise
        """
        try:
            from .invoice_generator import generate_invoice_pdf
            from django.core.mail import EmailMultiAlternatives
            
            # Get patient balance
            patient_balance = 0
            if hasattr(invoice.patient, 'balance_record'):
                patient_balance = invoice.patient.balance_record.current_balance
            
            # Prepare invoice items for email
            invoice_items = []
            for item in invoice.items.all():
                invoice_items.append({
                    'item_name': item.item_name,
                    'quantity': item.quantity,
                    'total_price': f"{item.total_price:,.2f}"
                })
            
            # Prepare context for email template
            context = {
                'created_by_name': f"{invoice.created_by.first_name} {invoice.created_by.last_name}",
                'invoice_number': invoice.invoice_number,
                'reference_number': invoice.reference_number,
                'patient_name': f"{invoice.patient.first_name} {invoice.patient.last_name}",
                'patient_email': invoice.patient.email,
                'appointment_date': invoice.appointment.date.strftime('%B %d, %Y'),
                'service_name': invoice.appointment.service.name,
                'dentist_name': f"{invoice.appointment.dentist.first_name} {invoice.appointment.dentist.last_name}",
                'service_charge': f"{invoice.service_charge:,.2f}",
                'total_due': f"{invoice.total_due:,.2f}",
                'due_date': invoice.due_date.strftime('%B %d, %Y'),
                'patient_balance': f"{patient_balance:,.2f}",
                'invoice_items': invoice_items,
                'clinic_name': invoice.clinic.name,
                'clinic_address': invoice.clinic.address,
                'staff_portal_url': f"{settings.FRONTEND_URL}/staff/billing" if hasattr(settings, 'FRONTEND_URL') else None,
            }
            
            # Render email HTML
            html_message = render_to_string('emails/invoice_staff.html', context)
            
            # Create plain text version
            text_message = strip_tags(html_message)
            
            # Determine recipient list
            if staff_emails is None:
                # Default: send to billing email if configured, otherwise skip
                staff_emails = []
                if hasattr(settings, 'BILLING_EMAIL') and settings.BILLING_EMAIL:
                    staff_emails.append(settings.BILLING_EMAIL)
                # If no staff emails configured, don't send
                if not staff_emails:
                    logger.warning(f"No staff emails configured for invoice {invoice.invoice_number}. Skipping staff email.")
                    return False
            
            # Create email
            subject = f"New Invoice Created: {invoice.invoice_number}"
            from_email = settings.DEFAULT_FROM_EMAIL
            
            email = EmailMultiAlternatives(
                subject=subject,
                body=text_message,
                from_email=from_email,
                to=staff_emails,
            )
            
            # Attach HTML version
            email.attach_alternative(html_message, "text/html")
            
            # Try to generate and attach PDF (optional - don't fail if it doesn't work)
            try:
                pdf_content, pdf_filename = generate_invoice_pdf(invoice)
                email.attach(pdf_filename, pdf_content, 'application/pdf')
                logger.info(f"PDF attached to staff invoice email for {invoice.invoice_number}")
            except Exception as pdf_error:
                logger.warning(f"Could not generate PDF for invoice {invoice.invoice_number}: {str(pdf_error)}. Email will be sent without PDF.")
            
            # Send email
            email.send()
            
            logger.info(f"Invoice email sent to staff for invoice {invoice.invoice_number}")
            return True
            
        except Exception as e:
            logger.error(f"Error sending invoice email to staff: {str(e)}")
            logger.exception("Full traceback:")  # This logs the full traceback
            return False
    
    @staticmethod
    def send_invoice_emails(invoice, staff_emails=None):
        """
        Send invoice emails to both patient and staff.
        
        Args:
            invoice: Invoice model instance
            staff_emails: Optional list of staff email addresses for staff notification
            
        Returns:
            dict: Status of email sending with keys 'patient' and 'staff' (both bool)
        """
        results = {
            'patient': EmailService.send_invoice_email_to_patient(invoice),
            'staff': EmailService.send_invoice_email_to_staff(invoice, staff_emails)
        }
        
        return results
    
    @staticmethod
    def send_payment_receipt_email(invoice, payment_amount):
        """
        Send payment receipt email to patient after a payment is made.
        
        Args:
            invoice: Invoice model instance
            payment_amount: Amount that was paid
            
        Returns:
            bool: True if email was sent successfully, False otherwise
        """
        try:
            # Get patient balance
            patient_balance = 0
            if hasattr(invoice.patient, 'balance'):
                patient_balance = invoice.patient.balance.total_balance
            
            # Prepare context for plain text email (can be enhanced with HTML template later)
            subject = f"Payment Receipt for Invoice {invoice.invoice_number}"
            from_email = settings.DEFAULT_FROM_EMAIL
            recipient_list = [invoice.patient.email]
            
            message = f"""
Dear {invoice.patient.first_name},

Thank you for your payment of ₱{payment_amount:,.2f} for Invoice {invoice.invoice_number}.

Invoice Details:
- Invoice Number: {invoice.invoice_number}
- Original Amount: ₱{invoice.total_due:,.2f}
- Amount Paid: ₱{payment_amount:,.2f}
- Remaining Balance: ₱{invoice.balance:,.2f}

Your Current Patient Balance: ₱{patient_balance:,.2f}

If you have any questions, please contact us at {invoice.clinic.email} or {invoice.clinic.contact_number}.

Thank you for choosing {invoice.clinic.name}.

Best regards,
{invoice.clinic.name}
{invoice.clinic.address}
            """
            
            from django.core.mail import EmailMessage
            email = EmailMessage(
                subject=subject,
                body=message,
                from_email=from_email,
                to=recipient_list,
            )
            
            email.send()
            
            logger.info(f"Payment receipt email sent for invoice {invoice.invoice_number}")
            return True
            
        except Exception as e:
            logger.error(f"Error sending payment receipt email: {str(e)}")
            return False


# Convenience functions for easy import
def send_appointment_confirmation(appointment):
    return EmailService.send_appointment_confirmation(appointment)

def send_appointment_reminder(appointment):
    return EmailService.send_appointment_reminder(appointment)

def send_appointment_cancelled(appointment, cancelled_by, reason=""):
    return EmailService.send_appointment_cancelled(appointment, cancelled_by, reason)

def send_reschedule_approved(appointment, old_date, old_time):
    return EmailService.send_reschedule_approved(appointment, old_date, old_time)

def send_reschedule_rejected(appointment, reason=""):
    return EmailService.send_reschedule_rejected(appointment, reason)

def send_invoice(billing):
    return EmailService.send_invoice(billing)

def send_payment_confirmation(billing):
    return EmailService.send_payment_confirmation(billing)

def send_payment_reminder(billing, days_overdue=0):
    return EmailService.send_payment_reminder(billing, days_overdue)

def send_low_stock_alert(inventory_item, staff_emails):
    return EmailService.send_low_stock_alert(inventory_item, staff_emails)

def notify_staff_new_appointment(appointment, staff_emails):
    return EmailService.notify_staff_new_appointment(appointment, staff_emails)

def send_password_reset_email(user, reset_link, token, expires_in_hours=1):
    return EmailService.send_password_reset_email(user, reset_link, token, expires_in_hours)

def send_password_reset_confirmation(user):
    return EmailService.send_password_reset_confirmation(user)

def send_invoice_emails(invoice, staff_emails=None):
    return EmailService.send_invoice_emails(invoice, staff_emails)

def send_invoice_email_to_patient(invoice):
    return EmailService.send_invoice_email_to_patient(invoice)

def send_invoice_email_to_staff(invoice, staff_emails=None):
    return EmailService.send_invoice_email_to_staff(invoice, staff_emails)

def send_payment_receipt_email(invoice, payment_amount):
    return EmailService.send_payment_receipt_email(invoice, payment_amount)
