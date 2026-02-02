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
        subject = f"Appointment Confirmed - {appointment.date}"
        
        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
                    <h2 style="color: #0f4c3a;">✅ Appointment Confirmed</h2>
                    
                    <p>Dear <strong>{appointment.patient.get_full_name()}</strong>,</p>
                    
                    <p>Your appointment has been confirmed. Here are the details:</p>
                    
                    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <p><strong>Date:</strong> {appointment.date.strftime('%B %d, %Y')}</p>
                        <p><strong>Time:</strong> {appointment.time}</p>
                        <p><strong>Dentist:</strong> Dr. {appointment.dentist.get_full_name()}</p>
                        <p><strong>Service:</strong> {appointment.service.name}</p>
                        <p><strong>Status:</strong> <span style="color: green;">Confirmed</span></p>
                    </div>
                    
                    <p><strong>Clinic Location:</strong><br>
                    {getattr(appointment, 'clinic', 'Main Clinic')}</p>
                    
                    <p style="color: #666; font-size: 14px; margin-top: 30px;">
                        Please arrive 10 minutes before your appointment time.<br>
                        If you need to reschedule or cancel, please contact us at least 24 hours in advance.
                    </p>
                    
                    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                    
                    <p style="color: #999; font-size: 12px;">
                        <strong>Dorotheo Dental Clinic</strong><br>
                        Email: info@dorothedentallossc.com.ph<br>
                        Phone: (02) 1234-5678
                    </p>
                </div>
            </body>
        </html>
        """
        
        return EmailService._send_email(
            subject=subject,
            recipient_list=[appointment.patient.email],
            html_content=html_content
        )
    
    @staticmethod
    def send_appointment_reminder(appointment):
        """Send reminder email 24 hours before appointment"""
        subject = f"Reminder: Appointment Tomorrow at {appointment.time}"
        
        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
                    <h2 style="color: #d4af37;">⏰ Appointment Reminder</h2>
                    
                    <p>Dear <strong>{appointment.patient.get_full_name()}</strong>,</p>
                    
                    <p>This is a friendly reminder about your upcoming appointment:</p>
                    
                    <div style="background-color: #fff9e6; padding: 15px; border-left: 4px solid #d4af37; margin: 20px 0;">
                        <p><strong>📅 Date:</strong> {appointment.date.strftime('%B %d, %Y')} (Tomorrow)</p>
                        <p><strong>🕐 Time:</strong> {appointment.time}</p>
                        <p><strong>👨‍⚕️ Dentist:</strong> Dr. {appointment.dentist.get_full_name()}</p>
                        <p><strong>🦷 Service:</strong> {appointment.service.name}</p>
                    </div>
                    
                    <p>We look forward to seeing you!</p>
                    
                    <p style="color: #666; font-size: 14px; margin-top: 20px;">
                        Need to reschedule? Please call us as soon as possible.
                    </p>
                    
                    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                    
                    <p style="color: #999; font-size: 12px;">
                        <strong>Dorotheo Dental Clinic</strong><br>
                        Phone: (02) 1234-5678
                    </p>
                </div>
            </body>
        </html>
        """
        
        return EmailService._send_email(
            subject=subject,
            recipient_list=[appointment.patient.email],
            html_content=html_content
        )
    
    @staticmethod
    def send_appointment_cancelled(appointment, cancelled_by, reason=""):
        """Send email when appointment is cancelled"""
        subject = f"Appointment Cancelled - {appointment.date}"
        
        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
                    <h2 style="color: #dc3545;">❌ Appointment Cancelled</h2>
                    
                    <p>Dear <strong>{appointment.patient.get_full_name()}</strong>,</p>
                    
                    <p>Your appointment has been cancelled.</p>
                    
                    <div style="background-color: #f8d7da; padding: 15px; border-left: 4px solid #dc3545; margin: 20px 0;">
                        <p><strong>Date:</strong> {appointment.date.strftime('%B %d, %Y')}</p>
                        <p><strong>Time:</strong> {appointment.time}</p>
                        <p><strong>Dentist:</strong> Dr. {appointment.dentist.get_full_name()}</p>
                        <p><strong>Service:</strong> {appointment.service.name}</p>
                        {f'<p><strong>Reason:</strong> {reason}</p>' if reason else ''}
                    </div>
                    
                    <p>If you would like to book a new appointment, please contact us or visit our website.</p>
                    
                    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                    
                    <p style="color: #999; font-size: 12px;">
                        <strong>Dorotheo Dental Clinic</strong><br>
                        Phone: (02) 1234-5678
                    </p>
                </div>
            </body>
        </html>
        """
        
        return EmailService._send_email(
            subject=subject,
            recipient_list=[appointment.patient.email],
            html_content=html_content
        )
    
    @staticmethod
    def send_reschedule_approved(appointment, old_date, old_time):
        """Send email when reschedule request is approved"""
        subject = "Reschedule Request Approved"
        
        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
                    <h2 style="color: #28a745;">✅ Reschedule Request Approved</h2>
                    
                    <p>Dear <strong>{appointment.patient.get_full_name()}</strong>,</p>
                    
                    <p>Your reschedule request has been approved.</p>
                    
                    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <h4 style="color: #999; margin-top: 0;">Previous Schedule:</h4>
                        <p style="text-decoration: line-through; color: #999;">
                            {old_date.strftime('%B %d, %Y')} at {old_time}
                        </p>
                        
                        <h4 style="color: #28a745; margin-bottom: 0;">New Schedule:</h4>
                        <p style="color: #28a745; font-weight: bold; font-size: 18px;">
                            {appointment.date.strftime('%B %d, %Y')} at {appointment.time}
                        </p>
                        
                        <p><strong>Dentist:</strong> Dr. {appointment.dentist.get_full_name()}</p>
                        <p><strong>Service:</strong> {appointment.service.name}</p>
                    </div>
                    
                    <p>We look forward to seeing you at your new appointment time!</p>
                    
                    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                    
                    <p style="color: #999; font-size: 12px;">
                        <strong>Dorotheo Dental Clinic</strong>
                    </p>
                </div>
            </body>
        </html>
        """
        
        return EmailService._send_email(
            subject=subject,
            recipient_list=[appointment.patient.email],
            html_content=html_content
        )
    
    @staticmethod
    def send_reschedule_rejected(appointment, reason=""):
        """Send email when reschedule request is rejected"""
        subject = "Reschedule Request Declined"
        
        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
                    <h2 style="color: #ffc107;">⚠️ Reschedule Request Declined</h2>
                    
                    <p>Dear <strong>{appointment.patient.get_full_name()}</strong>,</p>
                    
                    <p>We're sorry, but your reschedule request could not be approved.</p>
                    
                    {f'<p><strong>Reason:</strong> {reason}</p>' if reason else ''}
                    
                    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <h4 style="margin-top: 0;">Your Original Appointment Remains:</h4>
                        <p><strong>Date:</strong> {appointment.date.strftime('%B %d, %Y')}</p>
                        <p><strong>Time:</strong> {appointment.time}</p>
                        <p><strong>Dentist:</strong> Dr. {appointment.dentist.get_full_name()}</p>
                        <p><strong>Service:</strong> {appointment.service.name}</p>
                    </div>
                    
                    <p>Please contact us if you need to discuss alternative scheduling options.</p>
                    
                    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                    
                    <p style="color: #999; font-size: 12px;">
                        <strong>Dorotheo Dental Clinic</strong><br>
                        Phone: (02) 1234-5678
                    </p>
                </div>
            </body>
        </html>
        """
        
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
        subject = f"Invoice #{billing.id} - Dorotheo Dental Clinic"
        
        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
                    <h2 style="color: #0f4c3a;">💳 Invoice</h2>
                    
                    <p>Dear <strong>{billing.patient.get_full_name()}</strong>,</p>
                    
                    <p>Please find your invoice details below:</p>
                    
                    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <p><strong>Invoice #:</strong> {billing.id}</p>
                        <p><strong>Date:</strong> {billing.created_at.strftime('%B %d, %Y')}</p>
                        <p><strong>Description:</strong> {billing.description}</p>
                        <p style="font-size: 24px; color: #0f4c3a; margin: 20px 0;">
                            <strong>Amount Due: ₱{billing.amount:,.2f}</strong>
                        </p>
                        <p><strong>Status:</strong> <span style="color: {'green' if billing.status == 'paid' else 'orange'};">
                            {billing.status.upper()}
                        </span></p>
                    </div>
                    
                    {f'<p><strong>Related Appointment:</strong> {billing.appointment.date.strftime("%B %d, %Y")} at {billing.appointment.time}</p>' if billing.appointment else ''}
                    
                    <p>Payment can be made at the clinic or through our online payment portal.</p>
                    
                    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                    
                    <p style="color: #999; font-size: 12px;">
                        <strong>Dorotheo Dental Clinic</strong><br>
                        Phone: (02) 1234-5678
                    </p>
                </div>
            </body>
        </html>
        """
        
        return EmailService._send_email(
            subject=subject,
            recipient_list=[billing.patient.email],
            html_content=html_content
        )
    
    @staticmethod
    def send_payment_confirmation(billing):
        """Send payment confirmation to patient"""
        subject = f"Payment Received - Invoice #{billing.id}"
        
        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
                    <h2 style="color: #28a745;">✅ Payment Received</h2>
                    
                    <p>Dear <strong>{billing.patient.get_full_name()}</strong>,</p>
                    
                    <p>Thank you! We have received your payment.</p>
                    
                    <div style="background-color: #d4edda; padding: 15px; border-left: 4px solid #28a745; margin: 20px 0;">
                        <p><strong>Invoice #:</strong> {billing.id}</p>
                        <p><strong>Amount Paid:</strong> ₱{billing.amount:,.2f}</p>
                        <p><strong>Payment Date:</strong> {billing.updated_at.strftime('%B %d, %Y')}</p>
                        <p><strong>Description:</strong> {billing.description}</p>
                    </div>
                    
                    <p>Your account is now up to date. Thank you for your business!</p>
                    
                    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                    
                    <p style="color: #999; font-size: 12px;">
                        <strong>Dorotheo Dental Clinic</strong>
                    </p>
                </div>
            </body>
        </html>
        """
        
        return EmailService._send_email(
            subject=subject,
            recipient_list=[billing.patient.email],
            html_content=html_content
        )
    
    @staticmethod
    def send_payment_reminder(billing, days_overdue=0):
        """Send payment reminder for unpaid invoices"""
        subject = f"Payment Reminder - Invoice #{billing.id}"
        
        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
                    <h2 style="color: #ffc107;">⏰ Payment Reminder</h2>
                    
                    <p>Dear <strong>{billing.patient.get_full_name()}</strong>,</p>
                    
                    <p>This is a friendly reminder about your outstanding balance:</p>
                    
                    <div style="background-color: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0;">
                        <p><strong>Invoice #:</strong> {billing.id}</p>
                        <p><strong>Amount Due:</strong> ₱{billing.amount:,.2f}</p>
                        <p><strong>Invoice Date:</strong> {billing.created_at.strftime('%B %d, %Y')}</p>
                        {f'<p><strong>Days Overdue:</strong> {days_overdue}</p>' if days_overdue > 0 else ''}
                        <p><strong>Description:</strong> {billing.description}</p>
                    </div>
                    
                    <p>Please arrange payment at your earliest convenience. If you have any questions or concerns, don't hesitate to contact us.</p>
                    
                    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                    
                    <p style="color: #999; font-size: 12px;">
                        <strong>Dorotheo Dental Clinic</strong><br>
                        Phone: (02) 1234-5678
                    </p>
                </div>
            </body>
        </html>
        """
        
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
        
        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
                    <h2 style="color: #dc3545;">⚠️ Low Stock Alert</h2>
                    
                    <p>The following inventory item is running low:</p>
                    
                    <div style="background-color: #f8d7da; padding: 15px; border-left: 4px solid #dc3545; margin: 20px 0;">
                        <p><strong>Item:</strong> {inventory_item.name}</p>
                        <p><strong>Category:</strong> {inventory_item.category}</p>
                        <p><strong>Current Stock:</strong> {inventory_item.quantity}</p>
                        <p><strong>Minimum Required:</strong> {inventory_item.min_stock}</p>
                        <p><strong>Supplier:</strong> {inventory_item.supplier}</p>
                    </div>
                    
                    <p><strong>Action Required:</strong> Please reorder this item to maintain adequate stock levels.</p>
                    
                    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                    
                    <p style="color: #999; font-size: 12px;">
                        <strong>Dorotheo Dental Clinic</strong> - Inventory Management System
                    </p>
                </div>
            </body>
        </html>
        """
        
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
        subject = f"New Appointment Request - {appointment.patient.get_full_name()}"
        
        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
                    <h2 style="color: #0f4c3a;">📋 New Appointment Request</h2>
                    
                    <p>A new appointment has been requested:</p>
                    
                    <div style="background-color: #e7f3ff; padding: 15px; border-left: 4px solid #0f4c3a; margin: 20px 0;">
                        <p><strong>Patient:</strong> {appointment.patient.get_full_name()}</p>
                        <p><strong>Email:</strong> {appointment.patient.email}</p>
                        <p><strong>Phone:</strong> {appointment.patient.phone or 'N/A'}</p>
                        <p><strong>Date:</strong> {appointment.date.strftime('%B %d, %Y')}</p>
                        <p><strong>Time:</strong> {appointment.time}</p>
                        <p><strong>Dentist:</strong> Dr. {appointment.dentist.get_full_name()}</p>
                        <p><strong>Service:</strong> {appointment.service.name}</p>
                        <p><strong>Status:</strong> {appointment.status}</p>
                    </div>
                    
                    <p>Please review and confirm this appointment in the system.</p>
                    
                    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                    
                    <p style="color: #999; font-size: 12px;">
                        <strong>Dorotheo Dental Clinic</strong> - Staff Portal
                    </p>
                </div>
            </body>
        </html>
        """
        
        return EmailService._send_email(
            subject=subject,
            recipient_list=staff_emails,
            html_content=html_content
        )


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
