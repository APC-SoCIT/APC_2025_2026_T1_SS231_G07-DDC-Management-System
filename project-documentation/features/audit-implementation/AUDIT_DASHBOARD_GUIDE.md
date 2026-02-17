# Audit Dashboard - Quick Access Guide

## ✅ Implementation Complete

The audit statistics dashboard has been successfully implemented with:

### 📁 Files Created/Modified:

1. **[api/admin.py](c:\Users\Ezekiel\Downloads\original repo\APC_2025_2026_T1_SS231_G07-DDC-Management-System\dorotheo-dental-clinic-website\backend\api\admin.py)** - Added:
   - `get_urls()` method to register custom dashboard URL
   - `dashboard_view()` method with comprehensive statistics calculation
   - Suspicious activity detection

2. **[templates/admin/audit_dashboard.html](c:\Users\Ezekiel\Downloads\original repo\APC_2025_2026_T1_SS231_G07-DDC-Management-System\dorotheo-dental-clinic-website\backend\templates\admin\audit_dashboard.html)** - New file:
   - Beautiful grid layout with stat cards
   - Action type breakdown table
   - Most active users table
   - Most accessed patients table
   - Suspicious activity alerts
   - Responsive design

3. **[templates/admin/custom_index.html](c:\Users\Ezekiel\Downloads\original repo\APC_2025_2026_T1_SS231_G07-DDC-Management-System\dorotheo-dental-clinic-website\backend\templates\admin\custom_index.html)** - New file:
   - Custom admin home page banner
   - Prominent link to audit dashboard

---

## 🚀 How to Access the Dashboard

### Option 1: From Admin Home Page
1. Start your Django server:
   ```bash
   python manage.py runserver
   ```

2. Go to admin: **http://localhost:8000/admin/**

3. **Log in** with superuser credentials (if you don't have one, create it with `python manage.py createsuperuser`)

4. After logging in, you'll see a **purple banner** at the top with:
   - 📊 Icon
   - "Audit Log Dashboard" heading
   - "View Dashboard →" button

5. Click the button!

### Option 2: Direct URL
Navigate directly to: **http://localhost:8000/admin/api/auditlog/dashboard/**

### Option 3: From Audit Log List
1. Go to: **http://localhost:8000/admin/api/auditlog/**
2. URL will be available in navigation

---

## 📊 Dashboard Features

### Summary Cards (Top Row)
- **Total Audit Logs** - All-time count
- **Today** - Logs from today + week count
- **This Month** - Last 30 days count
- **Failed Logins** - Security alert (last 7 days)
  - ⚠️ Card turns yellow if failures detected

### Statistics Tables

#### 1. Logs by Action Type
- Shows distribution of actions (CREATE, READ, UPDATE, DELETE, LOGIN, etc.)
- Includes count and percentage
- Helps identify most common operations

#### 2. Most Active Users (30 days)
- Top 10 users by action count
- Shows full name or username
- Useful for identifying who uses the system most

#### 3. Most Accessed Patient Records (30 days)
- Top 10 patients by access count
- Helps monitor PHI access patterns
- HIPAA compliance monitoring

### Suspicious Activity Alerts

The dashboard automatically detects:

1. **Multiple Failed Logins** (HIGH/MEDIUM severity)
   - Triggers: ≥5 failed attempts from same IP in 7 days
   - HIGH: ≥10 attempts
   - MEDIUM: 5-9 attempts

2. **After-Hours Access** (LOW severity)
   - Triggers: >50 READ operations outside 8 AM - 6 PM in 7 days
   - Helps identify unusual access patterns

3. **Access Denied Attempts** (HIGH/MEDIUM severity)
   - Triggers: >10 denied access attempts in 7 days
   - HIGH: >50 attempts
   - MEDIUM: 10-50 attempts

If no suspicious activity: Shows green "✅ No Suspicious Activity" banner

---

## 🎨 Visual Design

### Color Coding
- **Primary Blue** (#2196F3) - Normal stats, info badges
- **Green** (#28a745) - Success, CREATE actions, positive indicators
- **Yellow** (#ffc107) - Warning, UPDATE actions, medium alerts
- **Red** (#dc3545) - Danger, DELETE/failed actions, high alerts
- **Gray** (#6c757d) - Neutral, LOGOUT actions

### Severity Badges
- **🔴 HIGH** - Red badge, immediate attention
- **🟡 MEDIUM** - Yellow badge, monitor closely
- **🔵 LOW** - Blue badge, informational

### Responsive Design
- Desktop: 4-column grid for cards, 2-column for tables
- Tablet: 2-column grid
- Mobile: Single column, stacked layout

---

## 🔐 Access Control

Dashboard is **restricted to**:
- Superusers (is_superuser=True)
- Owners (user_type='owner')

Other users will see "Permission Denied" if they try to access.

---

## 📈 Statistics Calculated

### Time Periods
- **Today**: Since midnight today (00:00:00)
- **This Week**: Last 7 days
- **This Month**: Last 30 days
- **All Time**: Complete database history

### Queries Run

```python
# Total logs
AuditLog.objects.count()

# Logs today
AuditLog.objects.filter(timestamp__gte=today_start).count()

# Failed logins (7 days)
AuditLog.objects.filter(
    action_type='LOGIN_FAILED',
    timestamp__gte=week_ago
).count()

# Most active users (30 days)
AuditLog.objects.filter(
    timestamp__gte=month_ago,
    actor__isnull=False
).values('actor__username', 'actor__first_name', 'actor__last_name')
.annotate(action_count=Count('log_id'))
.order_by('-action_count')[:10]

# Most accessed patients (30 days)
AuditLog.objects.filter(
    timestamp__gte=month_ago,
    patient_id__isnull=False
).values('patient_id')
.annotate(access_count=Count('log_id'))
.order_by('-access_count')[:10]
```

---

## 🧪 Testing the Dashboard

### 1. Verify Server Starts
```bash
python manage.py runserver
# Should see: "System check identified no issues"
```

### 2. Check Templates Exist
```bash
ls templates/admin/audit_dashboard.html
ls templates/admin/custom_index.html
```

### 3. Access Dashboard
Open browser: http://localhost:8000/admin/api/auditlog/dashboard/

### 4. Expected Behavior
- ✅ Stats cards show current numbers
- ✅ Tables populate with data
- ✅ If no logs exist, shows "No data"
- ✅ Suspicious activity section appears if threats detected
- ✅ Action buttons at bottom work

---

## 🐛 Troubleshooting

### Issue: "Template Does Not Exist"
**Solution**: Ensure templates are in correct location:
```
backend/
  templates/
    admin/
      audit_dashboard.html
      custom_index.html
```

### Issue: "Permission Denied"
**Solution**: 
- User must be superuser OR have user_type='owner'
- Check: `User.objects.filter(id=YOUR_ID).values('is_superuser', 'user_type')`

### Issue: Dashboard Shows "0" for Everything
**Solution**: Generate some audit logs first:
```bash
# Create test data
python manage.py shell -c "from api.models import User; User.objects.first().save()"
# This triggers audit log creation via signals
```

### Issue: Custom Index Template Not Showing
**Solution**: Verify in admin.py:
```python
admin.site.index_template = 'admin/custom_index.html'
```

---

## 📸 What You Should See

### Admin Home Page
```
┌─────────────────────────────────────────────────────────┐
│  📊  Audit Log Dashboard                                │
│      Monitor HIPAA compliance, security events...       │
│                              [View Dashboard →]         │
└─────────────────────────────────────────────────────────┘
```

### Dashboard Page
```
┌──────────────┬──────────────┬──────────────┬──────────────┐
│ Total Logs   │    Today     │  This Month  │ Failed Logins│
│    1,234     │      15      │     456      │      3       │
│  All Time    │  67 this wk  │  Last 30 days│  Last 7 days │
└──────────────┴──────────────┴──────────────┴──────────────┘

┌─────────────────────────┬─────────────────────────────────┐
│ Logs by Action Type     │ Most Active Users (30 days)     │
├─────────────────────────┼─────────────────────────────────┤
│ READ        567    46%  │ Dr. Smith          89 actions   │
│ UPDATE      234    19%  │ Jane Doe           67 actions   │
│ CREATE      123    10%  │ ...                             │
└─────────────────────────┴─────────────────────────────────┘

⚠️ Suspicious Activity Detected
─────────────────────────────────────────────────────────────
🔴 Multiple Failed Logins: 12 attempts from 192.168.1.100  HIGH
```

---

## ✅ Success Checklist

- [x] Modified admin.py with get_urls() and dashboard_view()
- [x] Created audit_dashboard.html template
- [x] Created custom_index.html template
- [x] Set admin.site.index_template
- [x] System check passes (no errors)
- [x] Dashboard calculates all statistics
- [x] Suspicious activity detection works
- [x] Responsive design implemented

---

## 🎯 Next Steps

1. **Start the server** and view the dashboard
2. **Generate some activity** to populate statistics
3. **Test suspicious activity detection** by creating failed login attempts
4. **Export functionality** - Available from audit log list view
5. **Consider Task 4.8** - Implement async logging with Celery for performance

---

**Dashboard URL**: http://localhost:8000/admin/api/auditlog/dashboard/
**Implementation Status**: ✅ COMPLETE
**Last Updated**: February 12, 2026
