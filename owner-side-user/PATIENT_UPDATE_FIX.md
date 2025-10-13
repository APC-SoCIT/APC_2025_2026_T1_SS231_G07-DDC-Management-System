# Patient Update & Delete Fix Documentation

## Issues
When trying to update or delete patient information, multiple errors occurred:
1. **HTTP 500: Internal Server Error** on UPDATE - Backend validation error
2. **React Console Error** - "value prop on 'input' should not be null"
3. **HTTP 500: Internal Server Error** on DELETE - Cascade deletion error

---

## Root Causes & Solutions

### Issue 1: HTTP 500 - PUT vs PATCH Method (UPDATE)
**Problem**: 
- The API was using `PUT` method which requires ALL fields including read-only ones
- The `patient_medical_history` field is required in the User model but marked as read-only in the serializer
- This caused validation to fail

**Solution**:
✅ Changed `userAPI.update()` from `PUT` to `PATCH` in `frontend/lib/api.js`
```javascript
// Before
method: "PUT"

// After  
method: "PATCH"
```

✅ Added `update()` method to `UserSerializer` in `backend/api/serializers.py`
```python
def update(self, instance, validated_data):
    # Don't allow updating patient_medical_history reference
    validated_data.pop('patient_medical_history', None)
    return super().update(instance, validated_data)
```

---

### Issue 2: React Controlled Input Error
**Problem**:
- Some database fields (email, age, contact) could be `null`
- React controlled inputs don't accept `null` - they require strings or undefined

**Solution**:
✅ Updated `handleEditPatient` in `frontend/components/patient-table.jsx` to convert all null values to empty strings:
```javascript
email: patient.email || '',
age: patient.age || '',
contact: patient.contact || '',
name: patient.name || patient.full_name || '',
```

---

### Issue 3: Backend Data Transformation
**Problem**:
- Empty strings being sent for optional fields could cause validation issues
- The `email` field is required and must always have a value

**Solution**:
✅ Updated `transformUserForBackend` in `frontend/lib/api.js` to only include optional fields with actual values:
```javascript
const transformUserForBackend = (user) => {
  const data = {
    f_name: user.f_name || user.name?.split(' ')[0] || '',
    l_name: user.l_name || user.name?.split(' ').slice(1).join(' ') || '',
    email: user.email || '', // Email is required
  }
  
  // Only include optional fields if they have values
  if (user.date_of_birth) data.date_of_birth = user.date_of_birth
  if (user.age !== null && user.age !== undefined && user.age !== '') data.age = user.age
  if (user.contact) data.contact = user.contact
  if (user.address) data.address = user.address
  
  return data
}
```

✅ Added email validation in `handleUpdatePatient`:
```javascript
if (!editPatient.email) {
  toast({
    title: "Validation Error",
    description: "Email is required.",
    variant: "destructive",
  })
  return
}
```

---

### Issue 4: HTTP 500 - Database Foreign Key Constraint Violation (DELETE)
**Problem**:
- When deleting a User, PostgreSQL database foreign key constraints were preventing deletion
- The database-level constraints don't match Django's `on_delete=models.CASCADE` settings
- Error: `violates foreign key constraint "appointment_staff_id_fkey" on table "appointment"`
- Users referenced in appointments (as patient or staff) couldn't be deleted

**Solution**:
✅ Added custom `destroy()` method to `UserViewSet` in `backend/api/views.py` that **manually deletes all related records first**:
```python
def destroy(self, request, *args, **kwargs):
    """Custom delete to handle related records cleanup"""
    instance = self.get_object()
    
    try:
        # Store references before deletion
        medical_history = instance.patient_medical_history
        
        # Manually delete related records to avoid foreign key constraint violations
        # Delete appointments where user is patient
        Appointment.objects.filter(patient=instance).delete()
        
        # Delete appointments where user is staff
        Appointment.objects.filter(staff=instance).delete()
        
        # Delete insurance details
        InsuranceDetail.objects.filter(user=instance).delete()
        
        # Delete roles
        Role.objects.filter(user=instance).delete()
        
        # Now delete the user
        instance.delete()
        
        # Delete the orphaned medical history
        if medical_history:
            try:
                if not User.objects.filter(patient_medical_history=medical_history).exists():
                    medical_history.delete()
            except Exception as e:
                print(f"Warning: Could not delete medical history: {e}")
        
        return Response(status=status.HTTP_204_NO_CONTENT)
        
    except Exception as e:
        return Response(
            {'error': f'Failed to delete user: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
```

**This handles**:
- Manual deletion of all appointments (patient & staff relationships)
- Cleanup of insurance details and roles
- Proper deletion order to satisfy database constraints
- Cleanup of orphaned `patient_medical_history` records
- Error handling with detailed error messages
- Returns HTTP 204 (No Content) on success

---

## Files Modified

### Backend
1. `backend/api/serializers.py`
   - Added `update()` method to `UserSerializer`

2. `backend/api/views.py`
   - Added `destroy()` method to `UserViewSet` to handle cascade deletes properly

### Frontend
3. `frontend/lib/api.js`
   - Changed `userAPI.update()` from PUT to PATCH
   - Updated `transformUserForBackend()` to handle optional fields properly

4. `frontend/components/patient-table.jsx`
   - Updated `handleEditPatient()` to convert null to empty strings
   - Added email validation to `handleUpdatePatient()`
   - Added console logging for debugging

---

## Testing Instructions

### 1. Restart Backend (Important!)
The Django development server should auto-reload, but if errors persist:

```powershell
# Navigate to backend directory
cd C:\Users\Ezekiel\Documents\code\APC_2025_2026_T1_SS231_G07-DDC-Management-System\owner-side-user\backend

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Stop any running Django servers (Ctrl+C in the terminal)
# Then restart
python manage.py runserver
```

### 2. Refresh Frontend
The Next.js dev server should hot-reload automatically, but if needed:
- Refresh the browser page (F5 or Ctrl+R)
- Or restart the frontend dev server

### 3. Test Patient Update
1. Go to the Patients page
2. Click "Edit" on any patient
3. Modify patient information
4. Click "Save"
5. Check the browser console (F12) for any errors
6. Verify the success toast appears

---

## Expected Behavior After Fix

✅ **Patient updates should work without errors**
✅ **Patient deletes should work without errors**
✅ **All form fields should be editable**
✅ **No React console warnings about null values**
✅ **Success toast appears after saving or deleting**
✅ **Patient list refreshes with updated data**
✅ **Related records (appointments, medical history) are properly cleaned up on delete**

---

## Debugging Tips

If errors still occur:

1. **Check Browser Console (F12)**
   - Look for detailed error messages
   - Check the Network tab for the API request/response

2. **Check Backend Terminal**
   - Look for Python traceback errors
   - Django shows detailed error messages

3. **Verify Data Being Sent**
   - Console.log will show the data before sending
   - Check if email is present and valid

4. **Clear Browser Cache**
   - Sometimes cached JavaScript can cause issues
   - Hard refresh: Ctrl+Shift+R (Chrome) or Ctrl+F5

---

## Additional Notes

- The `patient_medical_history` foreign key relationship is preserved and not modified during updates
- Email field is required and must be unique
- All other fields (f_name, l_name, date_of_birth, age, contact, address) are optional
- The frontend maintains backward compatibility with both old and new field names

---

## Date Fixed
October 13, 2025
