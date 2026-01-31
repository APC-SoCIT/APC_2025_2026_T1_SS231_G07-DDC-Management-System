# Multi-Clinic Quick Reference Guide

## Phase 1 Completed ✅

### What Was Done
- ✅ Added clinic foreign keys to core models (User, Appointment, Service)
- ✅ Migrated all existing data to "Main Clinic"
- ✅ Created ClinicContext provider for frontend
- ✅ Created ClinicSelector and ClinicBadge components
- ✅ Updated API endpoints to support clinic filtering

---

## How to Add More Clinics

### Option 1: Django Admin
1. Go to `http://localhost:8000/admin/`
2. Navigate to "Clinic Locations"
3. Click "Add Clinic Location"
4. Fill in:
   - Name (e.g., "Branch A - Quezon City")
   - Address
   - Phone
   - Latitude/Longitude (optional)
5. Save

### Option 2: API (for Owners)
```bash
POST /api/clinics/
{
  "name": "Branch A - Quezon City",
  "address": "123 Main St, Quezon City",
  "phone": "09123456789",
  "latitude": 14.6760,
  "longitude": 121.0437
}
```

---

## Using the Clinic System

### For Owners
- See "All Clinics" option in ClinicSelector
- Can switch between clinics or view all combined
- Access to cross-clinic reports (Phase 5)

### For Staff/Dentists
- Assigned to one clinic at a time
- Can view data from all clinics (centralized system)
- Filter by specific clinic when needed

### For Patients
- Not locked to any clinic
- Can book appointments at any clinic
- Records visible across all clinics

---

## API Usage Examples

### Get Clinics
```javascript
const response = await fetch('/api/clinics/');
const clinics = await response.json();
```

### Get Appointments for Specific Clinic
```javascript
const response = await fetch('/api/appointments/?clinic_id=1', {
  headers: { Authorization: `Token ${token}` }
});
const appointments = await response.json();
```

### Get Services at Specific Clinic
```javascript
const response = await fetch('/api/services/?clinic_id=1');
const services = await response.json();
```

### Create Appointment with Clinic
```javascript
const response = await fetch('/api/appointments/', {
  method: 'POST',
  headers: {
    'Authorization': `Token ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    patient: 5,
    dentist: 2,
    service: 3,
    clinic: 1,  // ← Required
    date: '2026-02-15',
    time: '14:00:00',
    status: 'confirmed'
  })
});
```

---

## Frontend Component Usage

### Use Clinic Context
```typescript
import { useClinic } from '@/lib/clinic-context';

function MyComponent() {
  const { selectedClinic, allClinics, setSelectedClinic } = useClinic();
  
  return (
    <div>
      <p>Current: {selectedClinic?.name}</p>
    </div>
  );
}
```

### Add Clinic Selector
```tsx
import { ClinicSelector } from '@/components/clinic-selector';

<ClinicSelector showAllOption={isOwner} />
```

### Display Clinic Badge
```tsx
import { ClinicBadge } from '@/components/clinic-badge';

<ClinicBadge clinicName={appointment.clinic_name} size="sm" />
```

---

## Database Schema

### User Model
- `assigned_clinic` (ForeignKey, nullable) - Staff/dentist assignment

### Appointment Model
- `clinic` (ForeignKey, nullable) - Appointment location
- Indexes: `[clinic, date]`, `[clinic, status]`

### Service Model
- `clinics` (ManyToMany) - Clinics offering this service

---

## Next Phase (Phase 2)

Will add clinic support to:
- DentalRecord
- Document
- Billing

Plus:
- Integrate ClinicSelector into navigation
- Add ClinicBadge to all list views
- Update appointment booking flow

---

## Common Issues & Solutions

### Issue: "Main Clinic" has placeholder data
**Solution:** Update via Django admin or API:
```python
# In Django shell
from api.models import ClinicLocation
main = ClinicLocation.objects.get(id=1)
main.address = "Real Address Here"
main.phone = "Real Phone Here"
main.save()
```

### Issue: Appointments not showing clinic
**Solution:** Check serializer includes `clinic_data` or `clinic_name`:
```python
# In serializer
clinic_name = serializers.CharField(source='clinic.name', read_only=True)
```

### Issue: Services not filtering by clinic
**Solution:** Ensure ManyToMany relationship and filtering:
```python
# In view
if clinic_id:
    queryset = queryset.filter(clinics__id=clinic_id)
```

---

## Quick Commands

### Check Django migrations
```bash
cd backend
.\venv\Scripts\Activate.ps1
python manage.py showmigrations api
```

### Create new clinic via shell
```bash
python manage.py shell
>>> from api.models import ClinicLocation
>>> ClinicLocation.objects.create(
...     name="Branch B",
...     address="456 Oak St",
...     phone="09198765432"
... )
```

### Test API endpoint
```bash
curl http://localhost:8000/api/clinics/
```

---

**Last Updated:** January 31, 2026  
**Phase:** 1 Complete, Ready for Phase 2
