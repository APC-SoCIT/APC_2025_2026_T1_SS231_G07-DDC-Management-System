from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.mail import send_mail
from django.db.models import Sum, Count, Q, F
from django.utils import timezone
from django.conf import settings
from datetime import date, timedelta
import secrets
import logging
import threading

logger = logging.getLogger(__name__)

# Import email service
from .email_service import (
    send_appointment_confirmation,
    send_appointment_cancelled,
    notify_staff_new_appointment,
    send_password_reset_email,
    send_password_reset_confirmation
)

from .models import (
    User, Service, Appointment, DentalRecord,
    Document, InventoryItem, Billing, ClinicLocation,
    TreatmentPlan, TeethImage, StaffAvailability, DentistAvailability, DentistNotification,
    AppointmentNotification, PasswordResetToken, PatientIntakeForm,
    FileAttachment, ClinicalNote, TreatmentAssignment, BlockedTimeSlot
)
from .serializers import (
    UserSerializer, ServiceSerializer, AppointmentSerializer,
    DentalRecordSerializer, DocumentSerializer,
    InventoryItemSerializer, BillingSerializer, ClinicLocationSerializer,
    TreatmentPlanSerializer, TeethImageSerializer, StaffAvailabilitySerializer,
    DentistAvailabilitySerializer, DentistNotificationSerializer, AppointmentNotificationSerializer, 
    PasswordResetTokenSerializer, PatientIntakeFormSerializer,
    FileAttachmentSerializer, ClinicalNoteSerializer, TreatmentAssignmentSerializer, BlockedTimeSlotSerializer
)


def create_appointment_notification(appointment, notification_type, custom_message=None):
    """
    Create notifications for staff and owner about appointment activities.
    
    Args:
        appointment: The Appointment instance
        notification_type: Type of notification ('new_appointment', 'reschedule_request', 'cancel_request', 'appointment_cancelled')
        custom_message: Optional custom message, will generate default if not provided
    """
    # Generate default message if not provided
    if not custom_message:
        patient_name = appointment.patient.get_full_name()
        appointment_date = appointment.date
        appointment_time = appointment.time
        
        if notification_type == 'new_appointment':
            custom_message = f"New appointment booked: {patient_name} on {appointment_date} at {appointment_time}"
        elif notification_type == 'reschedule_request':
            new_date = appointment.reschedule_date
            new_time = appointment.reschedule_time
            custom_message = f"Reschedule requested by {patient_name}: from {appointment_date} {appointment_time} to {new_date} {new_time}"
        elif notification_type == 'cancel_request':
            custom_message = f"Cancel requested by {patient_name} for appointment on {appointment_date} at {appointment_time}"
        elif notification_type == 'appointment_cancelled':
            custom_message = f"Appointment cancelled: {patient_name} on {appointment_date} at {appointment_time}"
    
    # Get all staff and owner users
    recipients = User.objects.filter(Q(user_type='staff') | Q(user_type='owner'))
    
    # Create notification for each recipient
    notifications_created = []
    for recipient in recipients:
        notification = AppointmentNotification.objects.create(
            recipient=recipient,
            appointment=appointment,
            notification_type=notification_type,
            message=custom_message
        )
        notifications_created.append(notification)
    
    return notifications_created


def create_patient_notification(appointment, notification_type, custom_message=None):
    """
    Create notification for the patient about their appointment status.
    
    Args:
        appointment: The Appointment instance
        notification_type: Type of notification
        custom_message: Optional custom message, will generate default if not provided
    """
    if not custom_message:
        appointment_date = appointment.date.strftime('%B %d, %Y')
        appointment_time = appointment.time.strftime('%I:%M %p')
        dentist_name = appointment.dentist.get_full_name() if appointment.dentist else 'our dentist'
        
        if notification_type == 'appointment_confirmed':
            custom_message = f"Your appointment has been confirmed for {appointment_date} at {appointment_time} with Dr. {dentist_name}."
        elif notification_type == 'reschedule_approved':
            custom_message = f"Your reschedule request has been approved. Your new appointment is on {appointment_date} at {appointment_time} with Dr. {dentist_name}."
        elif notification_type == 'reschedule_rejected':
            custom_message = f"Your reschedule request has been rejected. Your appointment remains on {appointment_date} at {appointment_time}."
        elif notification_type == 'cancel_approved':
            custom_message = f"Your cancellation request has been approved. Your appointment for {appointment_date} at {appointment_time} has been cancelled."
        elif notification_type == 'cancel_rejected':
            custom_message = f"Your cancellation request has been rejected. Your appointment remains on {appointment_date} at {appointment_time}."
    
    # Create notification for the patient
    notification = AppointmentNotification.objects.create(
        recipient=appointment.patient,
        appointment=appointment,
        notification_type=notification_type,
        message=custom_message
    )
    
    return notification


@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    logger.info("[Django] Registration request received: %s", request.data)
    
    serializer = UserSerializer(data=request.data)
    if serializer.is_valid():
        logger.info("[Django] Serializer is valid, creating user")
        user = serializer.save()
        user.set_password(request.data.get('password'))
        user.save()
        token, _ = Token.objects.get_or_create(user=user)
        logger.info("[Django] User created successfully: %s", user.username)
        return Response({'token': token.key, 'user': serializer.data}, status=status.HTTP_201_CREATED)
    
    logger.error("[Django] Serializer errors: %s", serializer.errors)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    username = request.data.get('username')
    password = request.data.get('password')
    logger.info("[Django] Login attempt for username: %s", username)
    
    # Try to authenticate with username first
    user = authenticate(username=username, password=password)
    
    # If authentication fails, try to find user by email and authenticate
    if not user:
        try:
            user_obj = User.objects.get(email=username)
            user = authenticate(username=user_obj.username, password=password)
            logger.info("[Django] Found user by email: %s, trying with username: %s", username, user_obj.username)
        except User.DoesNotExist:
            logger.info("[Django] No user found with email: %s", username)
    
    if user:
        token, _ = Token.objects.get_or_create(user=user)
        serializer = UserSerializer(user)
        logger.info("[Django] Login successful for: %s", username)
        return Response({'token': token.key, 'user': serializer.data})
    
    logger.warning("[Django] Login failed for: %s", username)
    return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['POST'])
def logout(request):
    request.user.auth_token.delete()
    return Response({'message': 'Logged out successfully'})


@api_view(['POST'])
@permission_classes([AllowAny])
def request_password_reset(request):
    """Request a password reset token"""
    email = request.data.get('email')
    logger.info("[Password Reset] Request received for email: %s", email)
    if not email:
        return Response({'error': 'Email is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        user = User.objects.get(email=email)
        logger.info("[Password Reset] User found: %s", user.username)
        # Invalidate any existing active tokens for this user
        PasswordResetToken.objects.filter(user=user, is_used=False, expires_at__gt=timezone.now()).update(is_used=True)
        
        # Generate unique token
        token = secrets.token_urlsafe(32)
        
        # Create password reset token (valid for 1 hour)
        reset_token = PasswordResetToken.objects.create(
            user=user,
            token=token,
            expires_at=timezone.now() + timedelta(hours=1)
        )
        
        # Build reset link to frontend login page with token as query param
        frontend_base = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000').rstrip('/')
        reset_link = f"{frontend_base}/login?reset_token={token}"
        logger.info("[Password Reset] Token generated: %s", token)
        logger.info("[Password Reset] Reset link: %s", reset_link)

        # Send styled reset email
        logger.info("[Password Reset] Attempting to send email to %s...", email)
        try:
            send_password_reset_email(user, reset_link, token, expires_in_hours=1)
            logger.info("[Password Reset] Email sent successfully!")
        except Exception as e:
            logger.error("[Password Reset] Email error: %s", str(e))

        # Return a generic message (token included for dev convenience)
        response_data = {
            'message': 'If the email exists, a password reset link will be sent',
            'email': email,
        }

        # When DEBUG or explicitly allowed, include token to simplify local testing
        if settings.DEBUG:
            response_data['token'] = token
            response_data['reset_link'] = reset_link
        return Response(response_data)
    
    except User.DoesNotExist:
        # Don't reveal if email exists or not
        logger.info("[Password Reset] Email not found in database: %s", email)
        return Response({
            'message': 'If the email exists, a password reset link will be sent'
        })


@api_view(['POST'])
@permission_classes([AllowAny])
def reset_password(request):
    """Reset password using token"""
    token = request.data.get('token')
    new_password = request.data.get('new_password')

    if not token or not new_password:
        return Response({'error': 'Token and new password are required'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        validate_password(new_password)
    except ValidationError as exc:
        return Response({'error': exc.messages[0]}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        reset_token = PasswordResetToken.objects.get(token=token)
        
        if not reset_token.is_valid():
            return Response(
                {'error': 'Token has expired or been used'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update password
        user = reset_token.user
        user.set_password(new_password)
        user.save()
        
        # Mark token as used
        reset_token.is_used = True
        reset_token.save()
        
        # Send confirmation email
        try:
            send_password_reset_confirmation(user)
            logger.info("[Password Reset] Confirmation email sent to %s", user.email)
        except Exception as e:
            logger.error("[Password Reset] Failed to send confirmation email: %s", str(e))
        
        return Response({'message': 'Password reset successfully'})
    
    except PasswordResetToken.DoesNotExist:
        return Response(
            {'error': 'Invalid token'},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['GET', 'PATCH', 'PUT'])
def current_user(request):
    if request.method == 'GET':
        serializer = UserSerializer(request.user)
        return Response(serializer.data)
    
    elif request.method in ['PATCH', 'PUT']:
        # Update user profile
        user = request.user
        serializer = UserSerializer(user, data=request.data, partial=(request.method == 'PATCH'))
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)



class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer

    def perform_create(self, serializer):
        # Hash password when creating user
        user = serializer.save()
        password = self.request.data.get('password')
        if password:
            user.set_password(password)
            user.save()
    
    def destroy(self, request, *args, **kwargs):
        """Control deletion permissions based on user type"""
        user_to_delete = self.get_object()
        requester = request.user
        
        # Prevent deleting owner accounts
        if user_to_delete.user_type == 'owner':
            return Response(
                {'error': 'Owner accounts cannot be deleted'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # For patient accounts: Only Owner and Receptionist can delete
        if user_to_delete.user_type == 'patient':
            is_owner = requester.user_type == 'owner'
            is_receptionist = requester.user_type == 'staff' and requester.role == 'receptionist'
            
            if not (is_owner or is_receptionist):
                return Response(
                    {'error': 'Only Owner and Receptionist can delete patient accounts'},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        # For staff accounts: Only Owner can delete
        if user_to_delete.user_type == 'staff':
            if requester.user_type != 'owner':
                return Response(
                    {'error': 'Only Owner can delete staff accounts'},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        return super().destroy(request, *args, **kwargs)

    @action(detail=False, methods=['get'])
    def patients(self, request):
        patients = User.objects.filter(user_type='patient')
        
        # Update patient status based on last appointment (2-year rule)
        for patient in patients:
            patient.update_patient_status()
        
        serializer = self.get_serializer(patients, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def staff(self, request):
        staff = User.objects.filter(user_type__in=['staff', 'owner'])
        serializer = self.get_serializer(staff, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        """Archive a patient record"""
        user = self.get_object()
        if user.user_type != 'patient':
            return Response({'error': 'Only patients can be archived'}, status=status.HTTP_400_BAD_REQUEST)
        
        user.is_archived = True
        user.save()
        serializer = self.get_serializer(user)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def restore(self, request, pk=None):
        """Restore an archived patient record"""
        user = self.get_object()
        if user.user_type != 'patient':
            return Response({'error': 'Only patients can be restored'}, status=status.HTTP_400_BAD_REQUEST)
        
        user.is_archived = False
        user.save()
        serializer = self.get_serializer(user)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def archived_patients(self, request):
        """Get all archived patients"""
        archived = User.objects.filter(user_type='patient', is_archived=True)
        serializer = self.get_serializer(archived, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def export_records(self, request, pk=None):
        """Export patient records as JSON (can be converted to PDF/CSV on frontend)"""
        user = self.get_object()
        if user.user_type != 'patient':
            return Response({'error': 'Only patient records can be exported'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Gather all patient data
        data = {
            'patient_info': {
                'id': user.id,
                'name': user.get_full_name(),
                'email': user.email,
                'phone': user.phone,
                'address': user.address,
                'birthday': str(user.birthday) if user.birthday else None,
                'age': user.age,
            },
            'appointments': [],
            'dental_records': [],
            'clinical_notes': [],
            'treatment_assignments': [],
            'billing': [],
            'intake_form': None,
        }
        
        # Get appointments
        appointments = Appointment.objects.filter(patient=user)
        for apt in appointments:
            data['appointments'].append({
                'date': str(apt.date),
                'time': str(apt.time),
                'status': apt.status,
                'dentist': apt.dentist.get_full_name() if apt.dentist else None,
                'service': apt.service.name if apt.service else None,
                'notes': apt.notes,
            })
        
        # Get dental records
        records = DentalRecord.objects.filter(patient=user)
        for record in records:
            data['dental_records'].append({
                'date': str(record.created_at.date()),
                'treatment': record.treatment,
                'diagnosis': record.diagnosis,
                'notes': record.notes,
                'created_by': record.created_by.get_full_name() if record.created_by else None,
            })
        
        # Get clinical notes
        notes = ClinicalNote.objects.filter(patient=user)
        for note in notes:
            data['clinical_notes'].append({
                'date': str(note.created_at.date()),
                'content': note.content,
                'author': note.author.get_full_name() if note.author else None,
            })
        
        # Get treatment assignments
        assignments = TreatmentAssignment.objects.filter(patient=user)
        for assignment in assignments:
            data['treatment_assignments'].append({
                'treatment': assignment.treatment_name,
                'description': assignment.description,
                'status': assignment.status,
                'assigned_date': str(assignment.date_assigned.date()),
                'assigned_by': assignment.assigned_by.get_full_name() if assignment.assigned_by else None,
            })
        
        # Get billing records
        billings = Billing.objects.filter(patient=user)
        for billing in billings:
            data['billing'].append({
                'date': str(billing.created_at.date()),
                'amount': str(billing.amount),
                'description': billing.description,
                'status': billing.status,
            })
        
        # Get intake form
        try:
            intake_form = PatientIntakeForm.objects.get(patient=user)
            data['intake_form'] = {
                'allergies': intake_form.allergies,
                'current_medications': intake_form.current_medications,
                'medical_conditions': intake_form.medical_conditions,
                'dental_concerns': intake_form.dental_concerns,
                'emergency_contact': {
                    'name': intake_form.emergency_contact_name,
                    'phone': intake_form.emergency_contact_phone,
                    'relationship': intake_form.emergency_contact_relationship,
                }
            }
        except PatientIntakeForm.DoesNotExist:
            pass
        
        return Response(data)


class ServiceViewSet(viewsets.ModelViewSet):
    queryset = Service.objects.all()
    serializer_class = ServiceSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = Service.objects.all()
        
        # Filter by clinic_id if provided in query params
        clinic_id = self.request.query_params.get('clinic_id', None)
        if clinic_id is not None:
            queryset = queryset.filter(clinics__id=clinic_id)
        
        return queryset

    @action(detail=False, methods=['get'])
    def by_category(self, request):
        category = request.query_params.get('category', 'all')
        clinic_id = request.query_params.get('clinic_id', None)
        
        if category == 'all':
            services = Service.objects.all()
        else:
            services = Service.objects.filter(category=category)
        
        # Filter by clinic if provided
        if clinic_id is not None:
            services = services.filter(clinics__id=clinic_id)
            
        serializer = self.get_serializer(services, many=True)
        return Response(serializer.data)


class AppointmentViewSet(viewsets.ModelViewSet):
    queryset = Appointment.objects.all()
    serializer_class = AppointmentSerializer

    def get_queryset(self):
        user = self.request.user
        queryset = Appointment.objects.all()
        
        # Filter by user type
        if user.user_type == 'patient':
            queryset = queryset.filter(patient=user)
        
        # Filter by clinic_id if provided in query params
        clinic_id = self.request.query_params.get('clinic_id', None)
        if clinic_id is not None:
            queryset = queryset.filter(clinic_id=clinic_id)
        
        return queryset
    
    def list(self, request, *args, **kwargs):
        """Override list to auto-mark missed appointments"""
        # Auto-mark missed appointments
        self.auto_mark_missed_appointments()
        
        # Call parent list method
        return super().list(request, *args, **kwargs)
    
    def auto_mark_missed_appointments(self):
        """Automatically mark appointments as missed if time has passed"""
        from datetime import datetime
        
        now = timezone.now()
        current_date = now.date()
        current_time = now.time()
        
        # Get all confirmed appointments that should be marked as missed
        # Appointments where:
        # 1. Date is in the past, OR
        # 2. Date is today but time has passed
        # 3. Status is still 'confirmed' or 'reschedule_requested' or 'cancel_requested'
        
        past_appointments = Appointment.objects.filter(
            Q(date__lt=current_date) |  # Past dates
            Q(date=current_date, time__lt=current_time),  # Today but time passed
            status__in=['confirmed', 'reschedule_requested', 'cancel_requested']
        )
        
        # Mark them as missed
        missed_count = past_appointments.update(status='missed')
        
        if missed_count > 0:
            logger.info("[Django] Auto-marked %d appointments as missed", missed_count)
        
        return missed_count
    
    def create(self, request, *args, **kwargs):
        """Create appointment with comprehensive booking validation"""
        from datetime import datetime, timedelta
        
        # Extract data from request
        appointment_date = request.data.get('date')
        appointment_time = request.data.get('time')
        patient_id = request.data.get('patient')
        dentist_id = request.data.get('dentist')
        service_id = request.data.get('service')
        clinic_id = request.data.get('clinic')
        
        # Get patient (use authenticated user if patient_id not provided)
        if patient_id:
            try:
                patient = User.objects.get(id=patient_id)
                logger.info(f"[Booking Validation] Patient from ID: {patient.id} - {patient.get_full_name()}")
            except User.DoesNotExist:
                return Response(
                    {'error': 'Patient not found'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            patient = request.user
            logger.info(f"[Booking Validation] Patient from request.user: {patient.id} - {patient.get_full_name()}")
        
        # Validation checks
        if appointment_date and appointment_time:
            # Normalize time to HH:MM format for comparison
            time_normalized = appointment_time[:5] if len(appointment_time) > 5 else appointment_time
            
            # Convert date string to date object for comparisons
            try:
                appt_date = datetime.strptime(appointment_date, '%Y-%m-%d').date()
            except ValueError:
                return Response(
                    {'error': 'Invalid date format'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # 1. Check for duplicate booking (same patient, same date, same time, same service)
            duplicate_appointments = Appointment.objects.filter(
                patient=patient,
                date=appointment_date,
                time__startswith=time_normalized,
                service_id=service_id,
                status__in=['confirmed', 'pending']
            )
            
            if duplicate_appointments.exists():
                return Response(
                    {
                        'error': 'Duplicate booking',
                        'message': 'You already have an appointment for this service at this time. Please choose a different time slot.'
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # 2. Check if patient already has appointment with same dentist on same day/time (different location)
            if dentist_id:
                same_dentist_appointments = Appointment.objects.filter(
                    dentist_id=dentist_id,
                    date=appointment_date,
                    time__startswith=time_normalized,
                    status__in=['confirmed', 'pending']
                ).exclude(clinic_id=clinic_id)
                
                if same_dentist_appointments.exists():
                    existing_appt = same_dentist_appointments.first()
                    return Response(
                        {
                            'error': 'Dentist conflict',
                            'message': f'This dentist already has an appointment at {existing_appt.clinic.name} at this time. Please choose a different time or dentist.'
                        },
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            # 3. Check for one week interval rule - patient can only book once per week
            # Calculate week start (Monday) and end (Sunday) for the appointment date
            week_start = appt_date - timedelta(days=appt_date.weekday())  # Monday
            week_end = week_start + timedelta(days=6)  # Sunday
            
            logger.info(f"[Weekly Check] Patient: {patient.id}, Week: {week_start} to {week_end}")
            
            existing_weekly_appointments = Appointment.objects.filter(
                patient=patient,
                date__gte=week_start,
                date__lte=week_end,
                status__in=['confirmed', 'pending']
            )
            
            logger.info(f"[Weekly Check] Found {existing_weekly_appointments.count()} existing appointments")
            
            if existing_weekly_appointments.exists():
                existing_appt = existing_weekly_appointments.first()
                logger.warning(f"[Weekly Check] BLOCKING: Existing appointment on {existing_appt.date}")
                return Response(
                    {
                        'error': 'Weekly limit exceeded',
                        'message': f'You can only book one appointment per week. You already have an appointment scheduled for {existing_appt.date}. Please wait until next week to book another appointment.'
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # 4. Check for general time slot conflict (any appointment at same time)
            existing_appointments = Appointment.objects.filter(
                date=appointment_date,
                time__startswith=time_normalized,
                status__in=['confirmed', 'pending']
            ).exclude(status='cancelled')
            
            if existing_appointments.exists():
                return Response(
                    {
                        'error': 'Time slot conflict',
                        'message': f'An appointment already exists at {appointment_time} on {appointment_date}. Please choose a different time slot.'
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Call parent create which will call perform_create
        try:
            response = super().create(request, *args, **kwargs)
            return response
        except Exception as e:
            # If something fails during serialization but appointment was created,
            # try to return the created appointment data
            logger.error(f"Error during appointment creation response: {str(e)}")
            
            # Check if appointment was created despite error
            if appointment_date and appointment_time:
                recent_appointment = Appointment.objects.filter(
                    date=appointment_date,
                    time__startswith=time_normalized
                ).order_by('-created_at').first()
                
                if recent_appointment:
                    # Appointment was created, return success response
                    serializer = self.get_serializer(recent_appointment)
                    return Response(serializer.data, status=status.HTTP_201_CREATED)
            
            # Re-raise if appointment wasn't created
            raise
    
    def perform_create(self, serializer):
        """Update patient status and create notifications after creating appointment"""
        appointment = serializer.save()
        if appointment.patient:
            appointment.patient.update_patient_status()
        
        # Create notifications for all staff and owner
        create_appointment_notification(appointment, 'new_appointment')
        
        # Notify patient that appointment is confirmed
        if appointment.status == 'confirmed':
            create_patient_notification(appointment, 'appointment_confirmed')
        
        # ✉️ Send emails in BACKGROUND THREAD (completely non-blocking)
        def send_emails_async():
            try:
                # Send email confirmation to patient
                try:
                    send_appointment_confirmation(appointment)
                    logger.info(f"✅ Email confirmation sent to {appointment.patient.email}")
                except Exception as e:
                    logger.warning(f"⚠️ Failed to send patient confirmation email: {str(e)}")
                
                # Notify staff/owner via email about new appointment
                try:
                    staff_emails = list(User.objects.filter(
                        Q(user_type='staff') | Q(user_type='owner')
                    ).exclude(email='').exclude(email__isnull=True).values_list('email', flat=True))
                    
                    if staff_emails:
                        # Filter out invalid emails
                        valid_emails = [email for email in staff_emails if '@' in email and '.' in email]
                        
                        if valid_emails:
                            notify_staff_new_appointment(appointment, valid_emails)
                            logger.info(f"✅ Staff notification emails sent to {len(valid_emails)} recipients")
                        else:
                            logger.warning(f"⚠️ No valid staff emails found")
                except Exception as e:
                    logger.warning(f"⚠️ Failed to send staff notification emails: {str(e)}")
            except Exception as e:
                # Final catch-all to ensure NO email error breaks anything
                logger.warning(f"⚠️ Email notification error (continuing anyway): {str(e)}")
        
        # Start email sending in background thread
        email_thread = threading.Thread(target=send_emails_async, daemon=True)
        email_thread.start()
        logger.info("📧 Email notifications queued in background thread")
    
    def update(self, request, *args, **kwargs):
        """Update appointment with comprehensive booking validation"""
        from datetime import datetime, timedelta
        
        instance = self.get_object()
        
        # Extract date and time from request
        appointment_date = request.data.get('date', instance.date)
        appointment_time = request.data.get('time', instance.time)
        patient = instance.patient
        dentist_id = request.data.get('dentist', instance.dentist_id)
        service_id = request.data.get('service', instance.service_id)
        clinic_id = request.data.get('clinic', instance.clinic_id)
        
        # Check for existing appointments at the same date and time
        if appointment_date and appointment_time:
            # Normalize time to HH:MM format for comparison
            time_normalized = str(appointment_time)[:5] if len(str(appointment_time)) > 5 else str(appointment_time)
            
            # Convert date to date object if it's a string
            if isinstance(appointment_date, str):
                try:
                    appt_date = datetime.strptime(appointment_date, '%Y-%m-%d').date()
                except ValueError:
                    return Response(
                        {'error': 'Invalid date format'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            else:
                appt_date = appointment_date
            
            # 1. Check for duplicate booking (excluding current appointment)
            duplicate_appointments = Appointment.objects.filter(
                patient=patient,
                date=appointment_date,
                time__startswith=time_normalized,
                service_id=service_id,
                status__in=['confirmed', 'pending']
            ).exclude(id=instance.id)
            
            if duplicate_appointments.exists():
                return Response(
                    {
                        'error': 'Duplicate booking',
                        'message': 'You already have an appointment for this service at this time. Please choose a different time slot.'
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # 2. Check if dentist already has appointment at same time (different location)
            if dentist_id:
                same_dentist_appointments = Appointment.objects.filter(
                    dentist_id=dentist_id,
                    date=appointment_date,
                    time__startswith=time_normalized,
                    status__in=['confirmed', 'pending']
                ).exclude(clinic_id=clinic_id).exclude(id=instance.id)
                
                if same_dentist_appointments.exists():
                    existing_appt = same_dentist_appointments.first()
                    return Response(
                        {
                            'error': 'Dentist conflict',
                            'message': f'This dentist already has an appointment at {existing_appt.clinic.name} at this time. Please choose a different time or dentist.'
                        },
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            # 3. Check for one week interval rule (excluding current appointment)
            week_start = appt_date - timedelta(days=appt_date.weekday())  # Monday
            week_end = week_start + timedelta(days=6)  # Sunday
            
            existing_weekly_appointments = Appointment.objects.filter(
                patient=patient,
                date__gte=week_start,
                date__lte=week_end,
                status__in=['confirmed', 'pending']
            ).exclude(id=instance.id)
            
            if existing_weekly_appointments.exists():
                existing_appt = existing_weekly_appointments.first()
                return Response(
                    {
                        'error': 'Weekly limit exceeded',
                        'message': f'You can only book one appointment per week. You already have an appointment scheduled for {existing_appt.date}. Please wait until next week to book another appointment.'
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # 4. General time slot conflict check (excluding current appointment)
            existing_appointments = Appointment.objects.filter(
                date=appointment_date,
                time__startswith=time_normalized,
                status__in=['confirmed', 'pending']
            ).exclude(id=instance.id).exclude(status='cancelled')
            
            if existing_appointments.exists():
                return Response(
                    {
                        'error': 'Time slot conflict',
                        'message': f'An appointment already exists at {appointment_time} on {appointment_date}. Please choose a different time slot.'
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Continue with normal update
        return super().update(request, *args, **kwargs)
    
    def perform_update(self, serializer):
        """Update patient status and create dental record when appointment is completed"""
        from django.utils import timezone
        
        old_status = self.get_object().status
        appointment = serializer.save()
        
        # Set completed_at timestamp when status changes to completed
        if old_status != 'completed' and appointment.status == 'completed':
            appointment.completed_at = timezone.now()
            appointment.save(update_fields=['completed_at'])
        
        if appointment.patient:
            appointment.patient.update_patient_status()
        
        # If appointment status changed from 'pending' to 'confirmed', notify patient
        if old_status == 'pending' and appointment.status == 'confirmed':
            create_patient_notification(appointment, 'appointment_confirmed')
        
        # If appointment status changed to 'completed', create/update dental record
        if old_status != 'completed' and appointment.status == 'completed':
            # Check if dental record already exists for this appointment
            dental_record, created = DentalRecord.objects.get_or_create(
                appointment=appointment,
                patient=appointment.patient,
                defaults={
                    'treatment': appointment.service.name if appointment.service else 'General Checkup',
                    'diagnosis': '',
                    'notes': appointment.notes or '',
                    'created_by': appointment.dentist if appointment.dentist else None
                }
            )
            
            if created:
                logger.info("[Django] Created dental record for completed appointment: %s", appointment.id)
            else:
                logger.info("[Django] Dental record already exists for appointment: %s", appointment.id)

    @action(detail=False, methods=['get'])
    def today(self, request):
        today_appointments = Appointment.objects.filter(date=date.today())
        serializer = self.get_serializer(today_appointments, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def request_reschedule(self, request, pk=None):
        """Patient requests to reschedule an appointment"""
        try:
            appointment = self.get_object()
            
            # Check if user is the patient
            if request.user != appointment.patient:
                return Response(
                    {'error': 'Only the patient can request reschedule'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            if appointment.status in ['cancelled', 'completed', 'cancel_requested']:
                return Response(
                    {'error': 'Cannot reschedule this appointment'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Set reschedule request data
            appointment.reschedule_date = request.data.get('date')
            appointment.reschedule_time = request.data.get('time')
            
            # Handle service - get Service object if ID provided, otherwise use current service
            service_id = request.data.get('service')
            if service_id:
                appointment.reschedule_service_id = service_id
            else:
                appointment.reschedule_service = appointment.service
            
            # Handle dentist - get User object if ID provided, otherwise use current dentist
            dentist_id = request.data.get('dentist')
            if dentist_id:
                appointment.reschedule_dentist_id = dentist_id
            else:
                appointment.reschedule_dentist = appointment.dentist
            
            appointment.reschedule_notes = request.data.get('notes', '')
            appointment.status = 'reschedule_requested'
            appointment.save()
            
            # Create notifications for staff and owner
            create_appointment_notification(appointment, 'reschedule_request')
            
            serializer = self.get_serializer(appointment)
            return Response(serializer.data)
        except Exception as e:
            logger.error("[ERROR] Failed to process reschedule request: %s", str(e))
            import traceback
            traceback.print_exc()
            return Response(
                {'error': f'Failed to process reschedule request: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'])
    def approve_reschedule(self, request, pk=None):
        """Approve a reschedule request - move reschedule fields to main fields"""
        appointment = self.get_object()
        
        if appointment.status != 'reschedule_requested':
            return Response(
                {'error': 'This appointment is not pending reschedule approval'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Move reschedule data to main appointment fields
        appointment.date = appointment.reschedule_date
        appointment.time = appointment.reschedule_time
        if appointment.reschedule_service:
            appointment.service = appointment.reschedule_service
        if appointment.reschedule_dentist:
            appointment.dentist = appointment.reschedule_dentist
        # DO NOT overwrite the original notes - keep the dentist's special notes intact
        
        # Clear reschedule fields
        appointment.reschedule_date = None
        appointment.reschedule_time = None
        appointment.reschedule_service = None
        appointment.reschedule_dentist = None
        appointment.reschedule_notes = ''
        
        # Update status to confirmed
        appointment.status = 'confirmed'
        appointment.save()
        
        # Notify patient that reschedule was approved
        create_patient_notification(appointment, 'reschedule_approved')
        
        serializer = self.get_serializer(appointment)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def reject_reschedule(self, request, pk=None):
        """Reject a reschedule request - clear reschedule fields and revert to confirmed"""
        appointment = self.get_object()
        
        if appointment.status != 'reschedule_requested':
            return Response(
                {'error': 'This appointment is not pending reschedule approval'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Clear reschedule fields
        appointment.reschedule_date = None
        appointment.reschedule_time = None
        appointment.reschedule_service = None
        appointment.reschedule_dentist = None
        appointment.reschedule_notes = ''
        
        # Revert status to confirmed
        appointment.status = 'confirmed'
        appointment.save()
        
        # Notify patient that reschedule was rejected
        create_patient_notification(appointment, 'reschedule_rejected')
        
        serializer = self.get_serializer(appointment)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def request_cancel(self, request, pk=None):
        """Patient requests to cancel an appointment"""
        appointment = self.get_object()
        
        # Debug logging
        logger.debug("[DEBUG] request.user: %s (ID: %s, type: %s)", request.user, request.user.id, request.user.user_type)
        logger.debug("[DEBUG] appointment.patient: %s (ID: %s)", appointment.patient, appointment.patient.id)
        logger.debug("[DEBUG] Are they equal? %s", request.user == appointment.patient)
        logger.debug("[DEBUG] IDs equal? %s", request.user.id == appointment.patient.id)
        
        # Check if user is the patient (compare by ID to be safe)
        if request.user.id != appointment.patient.id:
            return Response(
                {'error': 'Only the patient can request cancellation'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if appointment.status in ['cancelled', 'completed']:
            return Response(
                {'error': 'Cannot cancel this appointment'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Set cancel request
        appointment.status = 'cancel_requested'
        appointment.cancel_reason = request.data.get('reason', '')
        appointment.cancel_requested_at = timezone.now()
        appointment.save()
        
        # Create notifications for staff and owner
        create_appointment_notification(appointment, 'cancel_request')
        
        serializer = self.get_serializer(appointment)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def approve_cancel(self, request, pk=None):
        """Staff/Owner approves cancel request and marks appointment as cancelled"""
        appointment = self.get_object()
        
        if appointment.status != 'cancel_requested':
            return Response(
                {'error': 'This appointment is not pending cancellation'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Change status to cancelled instead of deleting
        appointment.status = 'cancelled'
        appointment.save()
        
        # Notify patient after cancelling
        create_patient_notification(appointment, 'cancel_approved')
        
        serializer = self.get_serializer(appointment)
        return Response(
            {'message': 'Appointment cancelled successfully', 'appointment': serializer.data},
            status=status.HTTP_200_OK
        )
    
    @action(detail=True, methods=['post'])
    def reject_cancel(self, request, pk=None):
        """Staff/Owner rejects cancel request"""
        appointment = self.get_object()
        
        if appointment.status != 'cancel_requested':
            return Response(
                {'error': 'This appointment is not pending cancellation'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Reject cancellation - revert to confirmed
        appointment.status = 'confirmed'
        appointment.cancel_reason = ''
        appointment.cancel_requested_at = None
        appointment.save()
        
        # Notify patient that cancel was rejected
        create_patient_notification(appointment, 'cancel_rejected')
        
        serializer = self.get_serializer(appointment)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def booked_slots(self, request):
        """Get all booked time slots (date and time) for preventing double booking"""
        # Get query parameters
        dentist_id = request.query_params.get('dentist_id')
        date = request.query_params.get('date')
        
        # Build query - get all non-cancelled appointments
        queryset = Appointment.objects.filter(
            Q(status='confirmed') | Q(status='pending')
        ).exclude(status='cancelled')
        
        # Filter by dentist if provided
        if dentist_id:
            queryset = queryset.filter(dentist_id=dentist_id)
        
        # Filter by date if provided
        if date:
            queryset = queryset.filter(date=date)
        
        # Return date, time, dentist_id, and service_id for overlap detection
        booked_slots = queryset.values('date', 'time', 'dentist_id', 'service_id').distinct()
        
        return Response(list(booked_slots))

    @action(detail=True, methods=['post'])
    def mark_completed(self, request, pk=None):
        """Mark appointment as completed and create dental record"""
        appointment = self.get_object()
        
        # Check if user is staff or owner
        if request.user.user_type not in ['staff', 'owner']:
            return Response(
                {'error': 'Only staff or owner can mark appointments as completed'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if appointment.status in ['cancelled', 'completed']:
            return Response(
                {'error': 'This appointment cannot be marked as completed'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Mark as completed
        appointment.status = 'completed'
        appointment.save()
        
        # Auto-create dental record
        treatment = request.data.get('treatment', '')
        diagnosis = request.data.get('diagnosis', '')
        notes = request.data.get('notes', appointment.notes)
        
        # If no treatment provided, create a default message
        if not treatment:
            service_name = appointment.service.name if appointment.service else 'General Consultation'
            treatment = f"Completed: {service_name}"
        
        dental_record = DentalRecord.objects.create(
            patient=appointment.patient,
            appointment=appointment,
            treatment=treatment,
            diagnosis=diagnosis,
            notes=notes,
            created_by=request.user
        )
        
        return Response({
            'message': 'Appointment marked as completed and dental record created',
            'appointment': AppointmentSerializer(appointment).data,
            'dental_record': DentalRecordSerializer(dental_record).data
        })
    
    @action(detail=True, methods=['post'])
    def mark_missed(self, request, pk=None):
        """Mark appointment as missed (manual)"""
        appointment = self.get_object()
        
        # Check if user is staff or owner
        if request.user.user_type not in ['staff', 'owner']:
            return Response(
                {'error': 'Only staff or owner can mark appointments as missed'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if appointment.status in ['cancelled', 'completed', 'missed']:
            return Response(
                {'error': 'This appointment cannot be marked as missed'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Mark as missed
        appointment.status = 'missed'
        appointment.save()
        
        serializer = self.get_serializer(appointment)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def upcoming(self, request):
        upcoming = Appointment.objects.filter(date__gte=date.today(), status__in=['confirmed', 'reschedule_requested', 'cancel_requested'])
        serializer = self.get_serializer(upcoming, many=True)
        return Response(serializer.data)


class DentalRecordViewSet(viewsets.ModelViewSet):
    queryset = DentalRecord.objects.all()
    serializer_class = DentalRecordSerializer

    def get_queryset(self):
        user = self.request.user
        queryset = DentalRecord.objects.all()
        
        # If user is a patient, only show their own records
        if user.user_type == 'patient':
            queryset = queryset.filter(patient=user)
        # For staff/owner, allow filtering by patient query parameter
        else:
            patient_id = self.request.query_params.get('patient', None)
            if patient_id is not None:
                queryset = queryset.filter(patient_id=patient_id)
        
        # Optional clinic filter (does not restrict cross-clinic visibility)
        clinic_id = self.request.query_params.get('clinic_id', None)
        if clinic_id is not None:
            queryset = queryset.filter(clinic_id=clinic_id)
        
        return queryset


class DocumentViewSet(viewsets.ModelViewSet):
    queryset = Document.objects.all()
    serializer_class = DocumentSerializer

    def get_queryset(self):
        user = self.request.user
        queryset = Document.objects.all()
        
        # If user is a patient, only show their own documents
        if user.user_type == 'patient':
            queryset = queryset.filter(patient=user)
        # For staff/owner, allow filtering by patient query parameter
        else:
            patient_id = self.request.query_params.get('patient', None)
            if patient_id is not None:
                queryset = queryset.filter(patient_id=patient_id)
        
        # Optional clinic filter (does not restrict cross-clinic visibility)
        clinic_id = self.request.query_params.get('clinic_id', None)
        if clinic_id is not None:
            queryset = queryset.filter(clinic_id=clinic_id)
        
        return queryset


class InventoryItemViewSet(viewsets.ModelViewSet):
    queryset = InventoryItem.objects.all()
    serializer_class = InventoryItemSerializer

    def create_low_stock_notification(self, inventory_item):
        """Create notification for low stock inventory item"""
        print(f"[INVENTORY] Creating low stock notification for {inventory_item.name}")
        # Get all staff and owner users
        recipients = User.objects.filter(Q(user_type='staff') | Q(user_type='owner'))
        print(f"[INVENTORY] Found {recipients.count()} recipients (staff/owner)")
        
        # Create notification message
        message = f"Low Stock Alert: {inventory_item.name} (Category: {inventory_item.category}) has only {inventory_item.quantity} units left."
        
        # Create notification for each recipient
        for recipient in recipients:
            notification = AppointmentNotification.objects.create(
                recipient=recipient,
                appointment=None,  # No appointment associated
                notification_type='inventory_alert',
                message=message
            )
            print(f"[INVENTORY] Created notification {notification.id} for {recipient.email}")
    
    def create_restock_notification(self, inventory_item):
        """Create notification when inventory item is restocked"""
        print(f"[INVENTORY] Creating restock notification for {inventory_item.name}")
        # Get all staff and owner users
        recipients = User.objects.filter(Q(user_type='staff') | Q(user_type='owner'))
        print(f"[INVENTORY] Found {recipients.count()} recipients (staff/owner)")
        
        # Create notification message
        message = f"{inventory_item.name} has been restocked! Current quantity: {inventory_item.quantity} units."
        
        # Create notification for each recipient
        for recipient in recipients:
            notification = AppointmentNotification.objects.create(
                recipient=recipient,
                appointment=None,
                notification_type='inventory_restock',
                message=message
            )
            print(f"[INVENTORY] Created restock notification {notification.id} for {recipient.email}")
    
    def perform_create(self, serializer):
        """Check for low stock after creating inventory item"""
        item = serializer.save()
        print(f"[INVENTORY] Created item: {item.name}, Qty: {item.quantity}, Min: {item.min_stock}, Is Low: {item.is_low_stock}")
        
        # Check if item is low stock immediately after creation
        if item.is_low_stock:
            self.create_low_stock_notification(item)
    
    def perform_update(self, serializer):
        """Check for low stock after updating inventory item"""
        old_item = self.get_object()
        was_low_stock = old_item.is_low_stock
        
        item = serializer.save()
        print(f"[INVENTORY] Updated item: {item.name}, Was Low: {was_low_stock}, Is Low: {item.is_low_stock}")
        print(f"[INVENTORY] Qty: {item.quantity}, Min: {item.min_stock}")
        
        # Check if item just became low stock (not already low)
        if item.is_low_stock and not was_low_stock:
            print(f"[INVENTORY] Item just became low stock, creating notification")
            self.create_low_stock_notification(item)
        # Check if item was restocked (was low, now sufficient)
        elif was_low_stock and not item.is_low_stock:
            print(f"[INVENTORY] Item restocked from low stock, creating restock notification")
            self.create_restock_notification(item)
        else:
            print(f"[INVENTORY] No notification needed (was_low: {was_low_stock}, is_low: {item.is_low_stock})")

    @action(detail=False, methods=['get'])
    def low_stock(self, request):
        low_stock_items = [item for item in InventoryItem.objects.all() if item.is_low_stock]
        serializer = self.get_serializer(low_stock_items, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def low_stock_count(self, request):
        """Get count of items with low stock"""
        low_stock_items = [item for item in InventoryItem.objects.all() if item.is_low_stock]
        return Response({'count': len(low_stock_items)})


class BillingViewSet(viewsets.ModelViewSet):
    queryset = Billing.objects.all()
    serializer_class = BillingSerializer

    def get_queryset(self):
        user = self.request.user
        queryset = Billing.objects.all()
        
        # Filter by patient if user is a patient
        if user.user_type == 'patient':
            queryset = queryset.filter(patient=user)
        
        # Filter by status if provided
        status_filter = self.request.query_params.get('status', None)
        if status_filter and status_filter in ['pending', 'paid', 'cancelled']:
            queryset = queryset.filter(status=status_filter)
        
        # Optional clinic filter (does not restrict cross-clinic visibility)
        clinic_id = self.request.query_params.get('clinic_id', None)
        if clinic_id is not None:
            queryset = queryset.filter(clinic_id=clinic_id)
        
        return queryset

    @action(detail=True, methods=['patch'])
    def update_status(self, request, pk=None):
        """Update billing status"""
        billing = self.get_object()
        new_status = request.data.get('status')
        
        if new_status not in ['pending', 'paid', 'cancelled']:
            return Response(
                {'error': 'Invalid status. Must be pending, paid, or cancelled.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        billing.status = new_status
        billing.save()
        
        serializer = self.get_serializer(billing)
        return Response(serializer.data)


class ClinicLocationViewSet(viewsets.ModelViewSet):
    queryset = ClinicLocation.objects.all()
    serializer_class = ClinicLocationSerializer
    permission_classes = [AllowAny]


class TreatmentPlanViewSet(viewsets.ModelViewSet):
    queryset = TreatmentPlan.objects.all()
    serializer_class = TreatmentPlanSerializer

    def get_queryset(self):
        user = self.request.user
        if user.user_type == 'patient':
            return TreatmentPlan.objects.filter(patient=user)
        return TreatmentPlan.objects.all()


class TeethImageViewSet(viewsets.ModelViewSet):
    queryset = TeethImage.objects.all()
    serializer_class = TeethImageSerializer

    def get_queryset(self):
        user = self.request.user
        queryset = TeethImage.objects.all()
        
        # Filter by patient if user is a patient
        if user.user_type == 'patient':
            queryset = queryset.filter(patient=user)
        
        # Filter by patient_id if provided (for staff/owner viewing specific patient)
        patient_id = self.request.query_params.get('patient_id', None)
        if patient_id:
            queryset = queryset.filter(patient_id=patient_id)
        
        return queryset

    def perform_create(self, serializer):
        """Set uploaded_by to current user"""
        serializer.save(uploaded_by=self.request.user)

    @action(detail=False, methods=['get'])
    def latest(self, request):
        """Get latest teeth image for a patient"""
        patient_id = request.query_params.get('patient_id')
        
        if not patient_id:
            if request.user.user_type == 'patient':
                patient_id = request.user.id
            else:
                return Response(
                    {'error': 'patient_id parameter is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        try:
            latest_image = TeethImage.objects.filter(
                patient_id=patient_id,
                is_latest=True
            ).first()
            
            if latest_image:
                serializer = self.get_serializer(latest_image)
                return Response(serializer.data)
            else:
                return Response(
                    {'message': 'No teeth images found for this patient'},
                    status=status.HTTP_404_NOT_FOUND
                )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['get'])
    def by_patient(self, request):
        """Get all teeth images for a specific patient"""
        patient_id = request.query_params.get('patient_id')
        
        if not patient_id:
            if request.user.user_type == 'patient':
                patient_id = request.user.id
            else:
                return Response(
                    {'error': 'patient_id parameter is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        images = TeethImage.objects.filter(patient_id=patient_id)
        serializer = self.get_serializer(images, many=True)
        return Response(serializer.data)


@api_view(['GET'])
def analytics(request):
    # Revenue from billing
    total_revenue = Billing.objects.filter(paid=True).aggregate(Sum('amount'))['amount__sum'] or 0
    
    # Expenses from inventory
    total_expenses = InventoryItem.objects.aggregate(
        total=Sum(F('cost') * F('quantity'))
    )['total'] or 0
    
    # Patient statistics
    total_patients = User.objects.filter(user_type='patient').count()
    active_patients = User.objects.filter(user_type='patient', is_active_patient=True).count()
    new_patients_this_month = User.objects.filter(
        user_type='patient',
        created_at__month=date.today().month
    ).count()
    
    # Appointment statistics
    total_appointments = Appointment.objects.count()
    upcoming_appointments = Appointment.objects.filter(
        date__gte=date.today(),
        status__in=['confirmed', 'reschedule_requested', 'cancel_requested']
    ).count()
    
    return Response({
        'revenue': float(total_revenue),
        'expenses': float(total_expenses),
        'profit': float(total_revenue - total_expenses),
        'total_patients': total_patients,
        'active_patients': active_patients,
        'new_patients_this_month': new_patients_this_month,
        'total_appointments': total_appointments,
        'upcoming_appointments': upcoming_appointments,
    })


class StaffAvailabilityViewSet(viewsets.ModelViewSet):
    queryset = StaffAvailability.objects.all()
    serializer_class = StaffAvailabilitySerializer

    def get_queryset(self):
        """Filter by staff member and/or clinic if specified"""
        queryset = StaffAvailability.objects.all()
        staff_id = self.request.query_params.get('staff_id', None)
        clinic_id = self.request.query_params.get('clinic_id', None)
        
        if staff_id:
            queryset = queryset.filter(staff_id=staff_id)
        
        if clinic_id:
            # Filter by clinic or those that apply to all clinics
            queryset = queryset.filter(
                Q(clinics__id=clinic_id) | Q(apply_to_all_clinics=True)
            ).distinct()
        
        return queryset

    @action(detail=False, methods=['post'])
    def bulk_update(self, request):
        """Bulk update or create availability for a staff member"""
        staff_id = request.data.get('staff_id')
        availability_data = request.data.get('availability', [])
        clinic_ids = request.data.get('clinic_ids', [])
        apply_to_all_clinics = request.data.get('apply_to_all_clinics', True)
        
        if not staff_id:
            return Response(
                {'error': 'staff_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            staff = User.objects.get(id=staff_id)
            
            # Update or create availability for each day
            for day_data in availability_data:
                availability, _ = StaffAvailability.objects.update_or_create(
                    staff=staff,
                    day_of_week=day_data['day_of_week'],
                    defaults={
                        'is_available': day_data.get('is_available', True),
                        'start_time': day_data.get('start_time', '09:00:00'),
                        'end_time': day_data.get('end_time', '17:00:00'),
                        'apply_to_all_clinics': day_data.get('apply_to_all_clinics', apply_to_all_clinics),
                    }
                )
                
                # Handle clinic assignments if not applying to all
                if not availability.apply_to_all_clinics:
                    day_clinic_ids = day_data.get('clinic_ids', clinic_ids)
                    if day_clinic_ids:
                        availability.clinics.set(day_clinic_ids)
            
            # Return updated availability
            availability = StaffAvailability.objects.filter(staff=staff)
            serializer = self.get_serializer(availability, many=True)
            return Response(serializer.data)
        
        except User.DoesNotExist:
            return Response(
                {'error': 'Staff member not found'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=False, methods=['get'])
    def by_date(self, request):
        """Get available staff for a specific date"""
        date_str = request.query_params.get('date')
        clinic_id = request.query_params.get('clinic_id')
        
        if not date_str:
            return Response(
                {'error': 'date parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            from datetime import datetime
            target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            day_of_week = target_date.weekday()
            # Convert to our system (0=Sunday, 1=Monday, etc.)
            day_of_week = (day_of_week + 1) % 7
            
            # Get staff available on this day
            queryset = StaffAvailability.objects.filter(
                day_of_week=day_of_week,
                is_available=True
            ).select_related('staff')
            
            # Filter by clinic if specified
            if clinic_id:
                queryset = queryset.filter(
                    Q(clinics__id=clinic_id) | Q(apply_to_all_clinics=True)
                ).distinct()
            
            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)
        
        except ValueError:
            return Response(
                {'error': 'Invalid date format. Use YYYY-MM-DD'},
                status=status.HTTP_400_BAD_REQUEST
            )


class DentistAvailabilityViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing dentist date-specific availability (calendar-based).
    Supports clinic-specific availability filtering.
    """
    queryset = DentistAvailability.objects.all()
    serializer_class = DentistAvailabilitySerializer

    def get_queryset(self):
        """Filter by dentist, clinic, and date range if specified"""
        queryset = DentistAvailability.objects.all()
        dentist_id = self.request.query_params.get('dentist_id', None)
        clinic_id = self.request.query_params.get('clinic_id', None)
        start_date = self.request.query_params.get('start_date', None)
        end_date = self.request.query_params.get('end_date', None)
        
        if dentist_id:
            queryset = queryset.filter(dentist_id=dentist_id)
        
        if clinic_id:
            # Filter by specific clinic or those that apply to all clinics
            queryset = queryset.filter(
                Q(clinic_id=clinic_id) | Q(apply_to_all_clinics=True)
            )
        
        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        
        if end_date:
            queryset = queryset.filter(date__lte=end_date)
        
        return queryset.order_by('date', 'start_time')

    @action(detail=False, methods=['post'])
    def bulk_create(self, request):
        """
        Bulk create or update availability for multiple dates.
        Expected data: {
            "dentist_id": 1,
            "clinic_id": 1,  // Optional - if not provided, applies to all clinics
            "apply_to_all_clinics": true,  // Optional - default true
            "dates": [
                {
                    "date": "2026-01-10",
                    "start_time": "09:00:00",
                    "end_time": "17:00:00",
                    "is_available": true,
                    "clinic_id": 1  // Optional per-date clinic override
                },
                ...
            ]
        }
        """
        dentist_id = request.data.get('dentist_id')
        dates_data = request.data.get('dates', [])
        default_clinic_id = request.data.get('clinic_id')
        default_apply_to_all = request.data.get('apply_to_all_clinics', True)
        
        if not dentist_id:
            return Response(
                {'error': 'dentist_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            dentist = User.objects.get(id=dentist_id)
            
            # Validate dentist role
            if dentist.user_type not in ['staff', 'owner']:
                return Response(
                    {'error': 'User is not a dentist'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            if dentist.user_type == 'staff' and dentist.role != 'dentist':
                return Response(
                    {'error': 'User is not a dentist'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            created_availability = []
            
            # Update or create availability for each date
            for date_data in dates_data:
                # Determine clinic settings for this date
                date_clinic_id = date_data.get('clinic_id', default_clinic_id)
                apply_to_all = date_data.get('apply_to_all_clinics', default_apply_to_all)
                
                # Get clinic object if specified
                clinic = None
                if date_clinic_id and not apply_to_all:
                    try:
                        clinic = ClinicLocation.objects.get(id=date_clinic_id)
                    except ClinicLocation.DoesNotExist:
                        pass
                
                availability, created = DentistAvailability.objects.update_or_create(
                    dentist=dentist,
                    date=date_data['date'],
                    clinic=clinic,
                    defaults={
                        'start_time': date_data.get('start_time', '09:00:00'),
                        'end_time': date_data.get('end_time', '17:00:00'),
                        'is_available': date_data.get('is_available', True),
                        'apply_to_all_clinics': apply_to_all,
                    }
                )
                created_availability.append(availability)
            
            serializer = self.get_serializer(created_availability, many=True)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        
        except User.DoesNotExist:
            return Response(
                {'error': 'Dentist not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['post'])
    def bulk_delete(self, request):
        """
        Delete availability for specific dates.
        Expected data: {
            "dentist_id": 1,
            "clinic_id": 1,  // Optional - if provided, only deletes for that clinic
            "dates": ["2026-01-10", "2026-01-11", ...]
        }
        """
        dentist_id = request.data.get('dentist_id')
        clinic_id = request.data.get('clinic_id')
        dates = request.data.get('dates', [])
        
        if not dentist_id or not dates:
            return Response(
                {'error': 'dentist_id and dates are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        queryset = DentistAvailability.objects.filter(
            dentist_id=dentist_id,
            date__in=dates
        )
        
        if clinic_id:
            queryset = queryset.filter(clinic_id=clinic_id)
        
        deleted_count = queryset.delete()[0]
        
        return Response({
            'message': f'Deleted {deleted_count} availability records'
        })


class BlockedTimeSlotViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing blocked time slots to prevent patient bookings.
    Staff and owners can block specific time ranges on specific dates.
    Supports clinic-specific blocks.
    """
    queryset = BlockedTimeSlot.objects.all()
    serializer_class = BlockedTimeSlotSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filter by date range and/or clinic if specified"""
        queryset = BlockedTimeSlot.objects.all()
        start_date = self.request.query_params.get('start_date', None)
        end_date = self.request.query_params.get('end_date', None)
        date = self.request.query_params.get('date', None)
        clinic_id = self.request.query_params.get('clinic_id', None)
        
        if date:
            queryset = queryset.filter(date=date)
        elif start_date and end_date:
            queryset = queryset.filter(date__gte=start_date, date__lte=end_date)
        elif start_date:
            queryset = queryset.filter(date__gte=start_date)
        elif end_date:
            queryset = queryset.filter(date__lte=end_date)
        
        if clinic_id:
            # Filter by specific clinic or those that apply to all clinics
            queryset = queryset.filter(
                Q(clinic_id=clinic_id) | Q(apply_to_all_clinics=True)
            )
        
        return queryset.order_by('date', 'start_time')

    def perform_create(self, serializer):
        """Set the created_by field to the current user and handle clinic assignment"""
        clinic_id = self.request.data.get('clinic_id') or self.request.data.get('clinic')
        apply_to_all = self.request.data.get('apply_to_all_clinics', True)
        
        if clinic_id and not apply_to_all:
            try:
                clinic = ClinicLocation.objects.get(id=clinic_id)
                serializer.save(created_by=self.request.user, clinic=clinic, apply_to_all_clinics=False)
            except ClinicLocation.DoesNotExist:
                serializer.save(created_by=self.request.user)
        else:
            serializer.save(created_by=self.request.user, apply_to_all_clinics=True)

    def create(self, request, *args, **kwargs):
        """Override create to ensure only staff/owner can block slots"""
        if request.user.user_type not in ['staff', 'owner']:
            return Response(
                {'error': 'Only staff and owners can block time slots'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        """Override update to ensure only staff/owner can modify blocks"""
        if request.user.user_type not in ['staff', 'owner']:
            return Response(
                {'error': 'Only staff and owners can modify blocked time slots'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        """Override destroy to ensure only staff/owner can delete blocks"""
        if request.user.user_type not in ['staff', 'owner']:
            return Response(
                {'error': 'Only staff and owners can delete blocked time slots'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().destroy(request, *args, **kwargs)


class DentistNotificationViewSet(viewsets.ModelViewSet):
    queryset = DentistNotification.objects.all()
    serializer_class = DentistNotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Dentists only see their own notifications"""
        user = self.request.user
        if user.user_type == 'staff' and user.role == 'dentist':
            return DentistNotification.objects.filter(dentist=user)
        elif user.user_type == 'owner':
            # Owner can see all notifications
            return DentistNotification.objects.all()
        return DentistNotification.objects.none()

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark notification as read"""
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        serializer = self.get_serializer(notification)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        """Mark all notifications as read for current user"""
        user = request.user
        if user.user_type == 'staff' and user.role == 'dentist':
            DentistNotification.objects.filter(dentist=user, is_read=False).update(is_read=True)
            return Response({'message': 'All notifications marked as read'})
        return Response(
            {'error': 'Only dentists can mark their notifications'},
            status=status.HTTP_403_FORBIDDEN
        )

    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """Get count of unread notifications"""
        user = request.user
        if user.user_type == 'staff' and user.role == 'dentist':
            count = DentistNotification.objects.filter(dentist=user, is_read=False).count()
            return Response({'unread_count': count})
        return Response({'unread_count': 0})


class AppointmentNotificationViewSet(viewsets.ModelViewSet):
    queryset = AppointmentNotification.objects.all()
    serializer_class = AppointmentNotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Return notifications for the current user (staff, owner, or patient)"""
        user = self.request.user
        return AppointmentNotification.objects.filter(recipient=user)

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark notification as read"""
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        serializer = self.get_serializer(notification)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        """Mark all notifications as read for current user"""
        user = request.user
        AppointmentNotification.objects.filter(recipient=user, is_read=False).update(is_read=True)
        return Response({'message': 'All notifications marked as read'})

    @action(detail=False, methods=['post'])
    def clear_all(self, request):
        """Delete all notifications for current user"""
        user = request.user
        deleted_count = AppointmentNotification.objects.filter(recipient=user).delete()[0]
        return Response({'message': f'{deleted_count} notifications cleared'})

    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """Get count of unread notifications for current user"""
        user = request.user
        count = AppointmentNotification.objects.filter(recipient=user, is_read=False).count()
        return Response({'unread_count': count})


class PatientIntakeFormViewSet(viewsets.ModelViewSet):
    queryset = PatientIntakeForm.objects.all()
    serializer_class = PatientIntakeFormSerializer

    def get_queryset(self):
        """Filter based on user role"""
        user = self.request.user
        if user.user_type == 'patient':
            # Patients can only see their own form
            return PatientIntakeForm.objects.filter(patient=user)
        elif user.user_type in ['staff', 'owner']:
            # Staff and owner can see all forms
            return PatientIntakeForm.objects.all()
        return PatientIntakeForm.objects.none()

    @action(detail=False, methods=['get'])
    def by_patient(self, request):
        """Get intake form for a specific patient"""
        patient_id = request.query_params.get('patient_id')
        if not patient_id:
            return Response({'error': 'patient_id required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            intake_form = PatientIntakeForm.objects.get(patient_id=patient_id)
            serializer = self.get_serializer(intake_form)
            return Response(serializer.data)
        except PatientIntakeForm.DoesNotExist:
            return Response({'error': 'Intake form not found'}, status=status.HTTP_404_NOT_FOUND)


class FileAttachmentViewSet(viewsets.ModelViewSet):
    queryset = FileAttachment.objects.all()
    serializer_class = FileAttachmentSerializer

    def get_queryset(self):
        """Filter based on user role"""
        user = self.request.user
        if user.user_type == 'patient':
            # Patients can only see their own files
            return FileAttachment.objects.filter(patient=user)
        elif user.user_type in ['staff', 'owner']:
            # Staff and owner can see all files
            return FileAttachment.objects.all()
        return FileAttachment.objects.none()

    def perform_create(self, serializer):
        """Set file size and uploaded_by automatically"""
        uploaded_file = self.request.FILES.get('file')
        file_size = uploaded_file.size if uploaded_file else 0
        serializer.save(uploaded_by=self.request.user, file_size=file_size)

    @action(detail=False, methods=['get'])
    def by_patient(self, request):
        """Get all file attachments for a specific patient"""
        patient_id = request.query_params.get('patient_id')
        if not patient_id:
            return Response({'error': 'patient_id required'}, status=status.HTTP_400_BAD_REQUEST)
        
        files = FileAttachment.objects.filter(patient_id=patient_id)
        serializer = self.get_serializer(files, many=True)
        return Response(serializer.data)


class ClinicalNoteViewSet(viewsets.ModelViewSet):
    queryset = ClinicalNote.objects.all()
    serializer_class = ClinicalNoteSerializer

    def get_queryset(self):
        """Filter based on user role"""
        user = self.request.user
        if user.user_type == 'patient':
            # Patients can only see their own notes (read-only)
            return ClinicalNote.objects.filter(patient=user)
        elif user.user_type in ['staff', 'owner']:
            # Staff and owner can see all notes
            return ClinicalNote.objects.all()
        return ClinicalNote.objects.none()

    def perform_create(self, serializer):
        """Set author automatically"""
        serializer.save(author=self.request.user)

    @action(detail=False, methods=['get'])
    def by_patient(self, request):
        """Get all clinical notes for a specific patient"""
        patient_id = request.query_params.get('patient_id')
        if not patient_id:
            return Response({'error': 'patient_id required'}, status=status.HTTP_400_BAD_REQUEST)
        
        notes = ClinicalNote.objects.filter(patient_id=patient_id)
        serializer = self.get_serializer(notes, many=True)
        return Response(serializer.data)


class TreatmentAssignmentViewSet(viewsets.ModelViewSet):
    queryset = TreatmentAssignment.objects.all()
    serializer_class = TreatmentAssignmentSerializer

    def get_queryset(self):
        """Filter based on user role"""
        user = self.request.user
        if user.user_type == 'patient':
            # Patients can only see their own assignments
            return TreatmentAssignment.objects.filter(patient=user)
        elif user.user_type in ['staff', 'owner']:
            # Staff and owner can see all assignments
            return TreatmentAssignment.objects.all()
        return TreatmentAssignment.objects.none()

    def perform_create(self, serializer):
        """Set assigned_by automatically"""
        serializer.save(assigned_by=self.request.user)

    @action(detail=False, methods=['get'])
    def by_patient(self, request):
        """Get all treatment assignments for a specific patient"""
        patient_id = request.query_params.get('patient_id')
        if not patient_id:
            return Response({'error': 'patient_id required'}, status=status.HTTP_400_BAD_REQUEST)
        
        assignments = TreatmentAssignment.objects.filter(patient_id=patient_id)
        serializer = self.get_serializer(assignments, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['patch'])
    def update_status(self, request, pk=None):
        """Update treatment assignment status"""
        assignment = self.get_object()
        new_status = request.data.get('status')
        
        if new_status not in dict(TreatmentAssignment.STATUS_CHOICES):
            return Response({'error': 'Invalid status'}, status=status.HTTP_400_BAD_REQUEST)
        
        assignment.status = new_status
        if new_status == 'completed' and not assignment.completed_date:
            assignment.completed_date = date.today()
        assignment.save()
        
        serializer = self.get_serializer(assignment)
        return Response(serializer.data)


@api_view(['POST'])
@permission_classes([AllowAny])  # Can be used by both authenticated and anonymous users
def chatbot_query(request):
    """
    Handle chatbot queries using Ollama LLM.
    
    POST body:
    {
        "message": "User's message",
        "conversation_history": [  # Optional
            {"role": "user", "content": "previous message"},
            {"role": "assistant", "content": "previous response"}
        ]
    }
    
    Returns:
    {
        "response": "AI generated response",
        "error": null
    }
    """
    from .chatbot_service import DentalChatbotService
    
    try:
        user_message = request.data.get('message', '').strip()
        conversation_history = request.data.get('conversation_history', [])
        
        if not user_message:
            return Response(
                {'error': 'Message is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Initialize chatbot with current user (if authenticated)
        user = request.user if request.user.is_authenticated else None
        chatbot = DentalChatbotService(user=user)
        
        # Get response from Ollama
        result = chatbot.get_response(user_message, conversation_history)
        
        if result['error']:
            return Response(
                {'error': result['error']},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        
        return Response({
            'response': result['response'],
            'quick_replies': result.get('quick_replies', []),
            'error': None
        })
        
    except Exception as e:
        return Response(
            {'error': f'Server error: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
