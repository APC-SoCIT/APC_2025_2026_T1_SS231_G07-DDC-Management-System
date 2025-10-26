from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate
from django.db.models import Sum, Count, Q, F
from django.utils import timezone
from datetime import date, timedelta
import secrets
from .models import (
    User, Service, Appointment, ToothChart, DentalRecord,
    Document, InventoryItem, Billing, ClinicLocation,
    TreatmentPlan, TeethImage, StaffAvailability, DentistNotification,
    AppointmentNotification, PasswordResetToken, PatientIntakeForm,
    FileAttachment, ClinicalNote, TreatmentAssignment
)
from .serializers import (
    UserSerializer, ServiceSerializer, AppointmentSerializer,
    ToothChartSerializer, DentalRecordSerializer, DocumentSerializer,
    InventoryItemSerializer, BillingSerializer, ClinicLocationSerializer,
    TreatmentPlanSerializer, TeethImageSerializer, StaffAvailabilitySerializer,
    DentistNotificationSerializer, AppointmentNotificationSerializer, 
    PasswordResetTokenSerializer, PatientIntakeFormSerializer,
    FileAttachmentSerializer, ClinicalNoteSerializer, TreatmentAssignmentSerializer
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


@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    print("[Django] Registration request received:", request.data)
    
    serializer = UserSerializer(data=request.data)
    if serializer.is_valid():
        print("[Django] Serializer is valid, creating user")
        user = serializer.save()
        user.set_password(request.data.get('password'))
        user.save()
        token, _ = Token.objects.get_or_create(user=user)
        print("[Django] User created successfully:", user.username)
        return Response({'token': token.key, 'user': serializer.data}, status=status.HTTP_201_CREATED)
    
    print("[Django] Serializer errors:", serializer.errors)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    username = request.data.get('username')
    password = request.data.get('password')
    print(f"[Django] Login attempt for username: {username}")
    
    # Try to authenticate with username first
    user = authenticate(username=username, password=password)
    
    # If authentication fails, try to find user by email and authenticate
    if not user:
        try:
            user_obj = User.objects.get(email=username)
            user = authenticate(username=user_obj.username, password=password)
            print(f"[Django] Found user by email: {username}, trying with username: {user_obj.username}")
        except User.DoesNotExist:
            print(f"[Django] No user found with email: {username}")
    
    if user:
        token, _ = Token.objects.get_or_create(user=user)
        serializer = UserSerializer(user)
        print(f"[Django] Login successful for: {username}")
        return Response({'token': token.key, 'user': serializer.data})
    
    print(f"[Django] Login failed for: {username}")
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
    
    try:
        user = User.objects.get(email=email)
        
        # Generate unique token
        token = secrets.token_urlsafe(32)
        
        # Create password reset token (valid for 1 hour)
        reset_token = PasswordResetToken.objects.create(
            user=user,
            token=token,
            expires_at=timezone.now() + timedelta(hours=1)
        )
        
        # In production, send email with token
        # For now, return token in response (NOT SECURE - only for development)
        return Response({
            'message': 'Password reset token generated',
            'token': token,  # Remove this in production
            'email': email
        })
    
    except User.DoesNotExist:
        # Don't reveal if email exists or not
        return Response({
            'message': 'If the email exists, a password reset link will be sent'
        })


@api_view(['POST'])
@permission_classes([AllowAny])
def reset_password(request):
    """Reset password using token"""
    token = request.data.get('token')
    new_password = request.data.get('new_password')
    
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

    @action(detail=False, methods=['get'])
    def by_category(self, request):
        category = request.query_params.get('category', 'all')
        if category == 'all':
            services = Service.objects.all()
        else:
            services = Service.objects.filter(category=category)
        serializer = self.get_serializer(services, many=True)
        return Response(serializer.data)


class AppointmentViewSet(viewsets.ModelViewSet):
    queryset = Appointment.objects.all()
    serializer_class = AppointmentSerializer

    def get_queryset(self):
        user = self.request.user
        if user.user_type == 'patient':
            return Appointment.objects.filter(patient=user)
        return Appointment.objects.all()
    
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
            print(f"[Django] Auto-marked {missed_count} appointments as missed")
        
        return missed_count
    
    def create(self, request, *args, **kwargs):
        """Create appointment with double booking validation"""
        # Extract date and time from request
        appointment_date = request.data.get('date')
        appointment_time = request.data.get('time')
        
        # Check for existing appointments at the same date and time
        if appointment_date and appointment_time:
            # Normalize time to HH:MM format for comparison
            time_normalized = appointment_time[:5] if len(appointment_time) > 5 else appointment_time
            
            # Check if any confirmed/pending appointment exists at this time
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
        
        # Continue with normal creation
        return super().create(request, *args, **kwargs)
    
    def perform_create(self, serializer):
        """Update patient status and create notifications after creating appointment"""
        appointment = serializer.save()
        if appointment.patient:
            appointment.patient.update_patient_status()
        
        # Create notifications for all staff and owner
        create_appointment_notification(appointment, 'new_appointment')
    
    def update(self, request, *args, **kwargs):
        """Update appointment with double booking validation"""
        instance = self.get_object()
        
        # Extract date and time from request
        appointment_date = request.data.get('date', instance.date)
        appointment_time = request.data.get('time', instance.time)
        
        # Check for existing appointments at the same date and time
        if appointment_date and appointment_time:
            # Normalize time to HH:MM format for comparison
            time_normalized = str(appointment_time)[:5] if len(str(appointment_time)) > 5 else str(appointment_time)
            
            # Check if any confirmed/pending appointment exists at this time (excluding current appointment)
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
        """Update patient status after updating appointment"""
        appointment = serializer.save()
        if appointment.patient:
            appointment.patient.update_patient_status()

    @action(detail=False, methods=['get'])
    def today(self, request):
        today_appointments = Appointment.objects.filter(date=date.today())
        serializer = self.get_serializer(today_appointments, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def request_reschedule(self, request, pk=None):
        """Patient requests to reschedule an appointment"""
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
        appointment.reschedule_service = request.data.get('service') if request.data.get('service') else appointment.service
        appointment.reschedule_dentist = request.data.get('dentist') if request.data.get('dentist') else appointment.dentist
        appointment.reschedule_notes = request.data.get('notes', '')
        appointment.status = 'reschedule_requested'
        appointment.save()
        
        # Create notifications for staff and owner
        create_appointment_notification(appointment, 'reschedule_request')
        
        serializer = self.get_serializer(appointment)
        return Response(serializer.data)

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
        if appointment.reschedule_notes:
            appointment.notes = appointment.reschedule_notes
        
        # Clear reschedule fields
        appointment.reschedule_date = None
        appointment.reschedule_time = None
        appointment.reschedule_service = None
        appointment.reschedule_dentist = None
        appointment.reschedule_notes = ''
        
        # Update status to confirmed
        appointment.status = 'confirmed'
        appointment.save()
        
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
        
        serializer = self.get_serializer(appointment)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def request_cancel(self, request, pk=None):
        """Patient requests to cancel an appointment"""
        appointment = self.get_object()
        
        # Debug logging
        print(f"[DEBUG] request.user: {request.user} (ID: {request.user.id}, type: {request.user.user_type})")
        print(f"[DEBUG] appointment.patient: {appointment.patient} (ID: {appointment.patient.id})")
        print(f"[DEBUG] Are they equal? {request.user == appointment.patient}")
        print(f"[DEBUG] IDs equal? {request.user.id == appointment.patient.id}")
        
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
        """Staff/Owner approves cancel request and deletes the appointment"""
        appointment = self.get_object()
        
        if appointment.status != 'cancel_requested':
            return Response(
                {'error': 'This appointment is not pending cancellation'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Delete the appointment instead of marking as cancelled
        appointment_id = appointment.id
        appointment.delete()
        
        return Response(
            {'message': 'Appointment cancelled and deleted successfully', 'id': appointment_id},
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
        
        # Return only date and time (no patient info for privacy)
        booked_slots = queryset.values('date', 'time', 'dentist_id').distinct()
        
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


class ToothChartViewSet(viewsets.ModelViewSet):
    queryset = ToothChart.objects.all()
    serializer_class = ToothChartSerializer


class DentalRecordViewSet(viewsets.ModelViewSet):
    queryset = DentalRecord.objects.all()
    serializer_class = DentalRecordSerializer

    def get_queryset(self):
        user = self.request.user
        if user.user_type == 'patient':
            return DentalRecord.objects.filter(patient=user)
        return DentalRecord.objects.all()


class DocumentViewSet(viewsets.ModelViewSet):
    queryset = Document.objects.all()
    serializer_class = DocumentSerializer

    def get_queryset(self):
        user = self.request.user
        if user.user_type == 'patient':
            return Document.objects.filter(patient=user)
        return Document.objects.all()


class InventoryItemViewSet(viewsets.ModelViewSet):
    queryset = InventoryItem.objects.all()
    serializer_class = InventoryItemSerializer

    @action(detail=False, methods=['get'])
    def low_stock(self, request):
        low_stock_items = [item for item in InventoryItem.objects.all() if item.is_low_stock]
        serializer = self.get_serializer(low_stock_items, many=True)
        return Response(serializer.data)


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
        """Filter by staff member if specified"""
        queryset = StaffAvailability.objects.all()
        staff_id = self.request.query_params.get('staff_id', None)
        if staff_id:
            queryset = queryset.filter(staff_id=staff_id)
        return queryset

    @action(detail=False, methods=['post'])
    def bulk_update(self, request):
        """Bulk update or create availability for a staff member"""
        staff_id = request.data.get('staff_id')
        availability_data = request.data.get('availability', [])
        
        if not staff_id:
            return Response(
                {'error': 'staff_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            staff = User.objects.get(id=staff_id)
            
            # Update or create availability for each day
            for day_data in availability_data:
                StaffAvailability.objects.update_or_create(
                    staff=staff,
                    day_of_week=day_data['day_of_week'],
                    defaults={
                        'is_available': day_data.get('is_available', True),
                        'start_time': day_data.get('start_time', '09:00:00'),
                        'end_time': day_data.get('end_time', '17:00:00'),
                    }
                )
            
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
            available = StaffAvailability.objects.filter(
                day_of_week=day_of_week,
                is_available=True
            ).select_related('staff')
            
            serializer = self.get_serializer(available, many=True)
            return Response(serializer.data)
        
        except ValueError:
            return Response(
                {'error': 'Invalid date format. Use YYYY-MM-DD'},
                status=status.HTTP_400_BAD_REQUEST
            )


class DentistNotificationViewSet(viewsets.ModelViewSet):
    queryset = DentistNotification.objects.all()
    serializer_class = DentistNotificationSerializer

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

    def get_queryset(self):
        """Staff and owner see their own notifications"""
        user = self.request.user
        if user.user_type in ['staff', 'owner']:
            return AppointmentNotification.objects.filter(recipient=user)
        return AppointmentNotification.objects.none()

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
        if user.user_type in ['staff', 'owner']:
            AppointmentNotification.objects.filter(recipient=user, is_read=False).update(is_read=True)
            return Response({'message': 'All notifications marked as read'})
        return Response(
            {'error': 'Only staff and owner can mark notifications'},
            status=status.HTTP_403_FORBIDDEN
        )

    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """Get count of unread notifications"""
        user = request.user
        if user.user_type in ['staff', 'owner']:
            count = AppointmentNotification.objects.filter(recipient=user, is_read=False).count()
            return Response({'unread_count': count})
        return Response({'unread_count': 0})


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

