from rest_framework import viewsets, status, filters
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.contrib.auth.models import User
from django.db.models import Count, Sum, Q, F
from datetime import datetime, timedelta
from .models import Patient, Appointment, InventoryItem, BillingRecord, FinancialRecord
from .serializers import (
    UserSerializer, UserRegistrationSerializer,
    PatientSerializer, AppointmentSerializer,
    InventoryItemSerializer, BillingRecordSerializer,
    FinancialRecordSerializer
)


@api_view(['POST'])
@permission_classes([AllowAny])
def register_user(request):
    """Register a new user"""
    serializer = UserRegistrationSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        return Response({
            'user': UserSerializer(user).data,
            'message': 'User registered successfully'
        }, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PatientViewSet(viewsets.ModelViewSet):
    """ViewSet for Patient CRUD operations"""
    queryset = Patient.objects.all()
    serializer_class = PatientSerializer
    permission_classes = [AllowAny]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'email', 'patient_id', 'contact']
    ordering_fields = ['name', 'last_visit', 'created_at']
    ordering = ['-created_at']

    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Get patient statistics"""
        total_patients = Patient.objects.count()
        today = datetime.now().date()
        week_ago = today - timedelta(days=7)
        month_ago = today - timedelta(days=30)
        
        patients_this_week = Patient.objects.filter(created_at__gte=week_ago).count()
        patients_this_month = Patient.objects.filter(created_at__gte=month_ago).count()
        
        return Response({
            'total': total_patients,
            'this_week': patients_this_week,
            'this_month': patients_this_month
        })


class AppointmentViewSet(viewsets.ModelViewSet):
    """ViewSet for Appointment CRUD operations"""
    queryset = Appointment.objects.all()
    serializer_class = AppointmentSerializer
    permission_classes = [AllowAny]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['appointment_id', 'patient__name', 'doctor', 'status']
    ordering_fields = ['date', 'time', 'created_at']
    ordering = ['-date', '-time']

    def get_queryset(self):
        queryset = super().get_queryset()
        status_filter = self.request.query_params.get('status', None)
        date_filter = self.request.query_params.get('date', None)
        
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if date_filter:
            queryset = queryset.filter(date=date_filter)
            
        return queryset

    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Get appointment statistics"""
        today = datetime.now().date()
        
        total_appointments = Appointment.objects.count()
        today_appointments = Appointment.objects.filter(date=today).count()
        scheduled = Appointment.objects.filter(status='scheduled').count()
        completed = Appointment.objects.filter(status='completed').count()
        cancelled = Appointment.objects.filter(status='cancelled').count()
        
        return Response({
            'total': total_appointments,
            'today': today_appointments,
            'scheduled': scheduled,
            'completed': completed,
            'cancelled': cancelled
        })

    @action(detail=False, methods=['get'])
    def upcoming(self, request):
        """Get upcoming appointments"""
        today = datetime.now().date()
        upcoming = Appointment.objects.filter(
            date__gte=today,
            status='scheduled'
        ).order_by('date', 'time')[:5]
        
        serializer = self.get_serializer(upcoming, many=True)
        return Response(serializer.data)


class InventoryItemViewSet(viewsets.ModelViewSet):
    """ViewSet for InventoryItem CRUD operations"""
    queryset = InventoryItem.objects.all()
    serializer_class = InventoryItemSerializer
    permission_classes = [AllowAny]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'category', 'supplier']
    ordering_fields = ['name', 'quantity', 'last_updated']
    ordering = ['name']

    def get_queryset(self):
        queryset = super().get_queryset()
        category_filter = self.request.query_params.get('category', None)
        
        if category_filter and category_filter != 'all':
            queryset = queryset.filter(category=category_filter)
            
        return queryset

    @action(detail=True, methods=['post'])
    def update_quantity(self, request, pk=None):
        """Update inventory item quantity"""
        item = self.get_object()
        delta = request.data.get('delta', 0)
        
        try:
            delta = int(delta)
            new_quantity = max(0, item.quantity + delta)
            item.quantity = new_quantity
            item.save()
            
            serializer = self.get_serializer(item)
            return Response(serializer.data)
        except ValueError:
            return Response(
                {'error': 'Invalid delta value'},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['get'])
    def low_stock(self, request):
        """Get items with low stock"""
        low_stock_items = InventoryItem.objects.filter(
            Q(quantity__lt=10) | Q(quantity__lt=F('min_stock'))
        )
        
        serializer = self.get_serializer(low_stock_items, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def alerts(self, request):
        """Get stock alerts for dashboard"""
        critical = InventoryItem.objects.filter(quantity__lt=10)[:3]
        low_stock = InventoryItem.objects.filter(
            quantity__gte=10,
            quantity__lt=F('min_stock')
        )[:3]
        
        return Response({
            'critical': self.get_serializer(critical, many=True).data,
            'low_stock': self.get_serializer(low_stock, many=True).data
        })


class BillingRecordViewSet(viewsets.ModelViewSet):
    """ViewSet for BillingRecord CRUD operations"""
    queryset = BillingRecord.objects.all()
    serializer_class = BillingRecordSerializer
    permission_classes = [AllowAny]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['patient__name', 'patient__email']
    ordering_fields = ['last_payment', 'amount']
    ordering = ['-last_payment']

    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Get billing statistics"""
        total_revenue = BillingRecord.objects.aggregate(
            total=Sum('amount')
        )['total'] or 0
        
        today = datetime.now().date()
        month_ago = today - timedelta(days=30)
        
        monthly_revenue = BillingRecord.objects.filter(
            last_payment__gte=month_ago
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        return Response({
            'total_revenue': float(total_revenue),
            'monthly_revenue': float(monthly_revenue)
        })


class FinancialRecordViewSet(viewsets.ModelViewSet):
    """ViewSet for FinancialRecord CRUD operations"""
    queryset = FinancialRecord.objects.all()
    serializer_class = FinancialRecordSerializer
    permission_classes = [AllowAny]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['year', 'month']
    ordering = ['year', 'month']

    def get_queryset(self):
        queryset = super().get_queryset()
        record_type = self.request.query_params.get('type', None)
        year = self.request.query_params.get('year', None)
        
        if record_type:
            queryset = queryset.filter(record_type=record_type)
        if year:
            queryset = queryset.filter(year=year)
            
        return queryset

    @action(detail=False, methods=['get'])
    def revenue(self, request):
        """Get revenue data"""
        year = request.query_params.get('year', datetime.now().year)
        revenue_data = FinancialRecord.objects.filter(
            record_type='revenue',
            year=year
        ).order_by('month')
        
        serializer = self.get_serializer(revenue_data, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def expenses(self, request):
        """Get expenses data"""
        year = request.query_params.get('year', datetime.now().year)
        expenses_data = FinancialRecord.objects.filter(
            record_type='expense',
            year=year
        ).order_by('month')
        
        serializer = self.get_serializer(expenses_data, many=True)
        return Response(serializer.data)


@api_view(['GET'])
@permission_classes([AllowAny])
def dashboard_overview(request):
    """Get overview statistics for dashboard"""
    today = datetime.now().date()
    week_ago = today - timedelta(days=7)
    
    # Appointment statistics
    appointments_today = Appointment.objects.filter(date=today).count()
    patients_today = Appointment.objects.filter(date=today).values('patient').distinct().count()
    walk_ins = Appointment.objects.filter(date=today, status='pending').count()
    
    # Patient statistics
    patients_this_week = Patient.objects.filter(last_visit__gte=week_ago).count()
    patients_this_month = Patient.objects.filter(
        last_visit__gte=today - timedelta(days=30)
    ).count()
    total_patients = Patient.objects.count()
    
    # Upcoming appointments
    upcoming_appointments = Appointment.objects.filter(
        date__gte=today,
        status='scheduled'
    ).order_by('date', 'time')[:3]
    
    # Stock alerts
    stock_alerts = InventoryItem.objects.filter(
        Q(quantity__lt=10) | Q(quantity__lt=F('min_stock'))
    )[:3]
    
    return Response({
        'appointments_today': appointments_today,
        'patients_today': patients_today,
        'walk_ins': walk_ins,
        'patients_this_week': patients_this_week,
        'patients_this_month': patients_this_month,
        'total_patients': total_patients,
        'upcoming_appointments': AppointmentSerializer(upcoming_appointments, many=True).data,
        'stock_alerts': InventoryItemSerializer(stock_alerts, many=True).data
    })
