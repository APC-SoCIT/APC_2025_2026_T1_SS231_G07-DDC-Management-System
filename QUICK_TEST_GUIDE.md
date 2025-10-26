# 🧪 QUICK TEST GUIDE - Complete Appointment System

## ⚡ Quick Test Scenarios

### 🎯 Test 1: Auto-Mark Missed (Past Appointment)

**Setup:**
1. Create an appointment for **yesterday** or **earlier today**
2. Use patient account to book it

**Test:**
1. Log in as **Staff** or **Owner**
2. Go to **Appointments** page
3. Wait for page to load

**✅ Expected Result:**
- Appointment should **automatically disappear** from the list
- If you check the database, it's marked as `status: "missed"`

**Why it works:**
- Every time appointments are fetched, the system checks for past appointments
- Any appointment with `date < today` or `date = today AND time < now` gets auto-marked as missed

---

### 🎯 Test 2: Mark as Complete Button

**Setup:**
1. Create an appointment for **today or future**
2. Ensure status is "confirmed"

**Test:**
1. Log in as **Staff** or **Owner**
2. Go to **Appointments** page
3. Find the appointment
4. Click the **green checkmark ✅** button
5. In the prompt, enter treatment details (e.g., "Teeth cleaning completed")
6. Click OK

**✅ Expected Result:**
- Success message: "Appointment marked as completed and added to dental records!"
- Appointment **disappears** from the appointments list
- New dental record created in database

**Verify:**
```
Open Django Admin or check API:
GET /api/dental-records/

You should see:
- patient: [patient_id]
- appointment: [appointment_id]
- treatment: "Teeth cleaning completed"
- created_by: [staff/owner_id]
```

---

### 🎯 Test 3: Mark as Missed Button

**Setup:**
1. Create an appointment for **today or future**
2. Ensure status is "confirmed"

**Test:**
1. Log in as **Staff** or **Owner**
2. Go to **Appointments** page
3. Find the appointment
4. Click the **yellow warning ⚠️** button
5. Confirm the dialog

**✅ Expected Result:**
- Success message: "Appointment marked as missed."
- Appointment **disappears** from the appointments list
- Database shows `status: "missed"`
- **No dental record created** (unlike mark as complete)

---

### 🎯 Test 4: Buttons Only Show for Confirmed

**Setup:**
1. Create multiple appointments with different statuses:
   - One "confirmed"
   - One with reschedule request
   - One with cancel request

**Test:**
1. Log in as **Staff** or **Owner**
2. Go to **Appointments** page
3. Look at the action buttons for each appointment

**✅ Expected Result:**
- **Confirmed appointment**: Shows both ✅ (complete) and ⚠️ (missed) buttons
- **Reschedule requested**: Shows approve/reject buttons, NO complete/missed buttons
- **Cancel requested**: Shows approve/reject buttons, NO complete/missed buttons

---

### 🎯 Test 5: Patient Cannot Mark Complete/Missed

**Test:**
1. Log in as **Patient**
2. Go to **Appointments** page
3. Look at your confirmed appointments

**✅ Expected Result:**
- **No** green checkmark ✅ button
- **No** yellow warning ⚠️ button
- Only patient actions available (reschedule, cancel)

---

### 🎯 Test 6: Complete Integration Flow

**Full User Journey:**

1. **Patient books appointment** (7:00 PM today)
   - ✅ Status: "confirmed"
   - ✅ Shows in patient's upcoming appointments
   - ✅ Shows in staff/owner appointments list

2. **Time passes to 7:50 PM** (patient didn't show up)
   - Staff/Owner refreshes appointments page
   - 🤖 System auto-checks
   - ⚠️ Appointment auto-marked as "missed"
   - ✅ Disappears from active appointments

**Alternative Path:**

1. **Patient books appointment** (7:00 PM today)
2. **Patient shows up at 7:00 PM**
3. **Staff completes treatment**
4. **Staff clicks ✅ Mark as Complete**
5. **Staff enters treatment details**
   - ✅ Status: "completed"
   - 📋 Dental record created automatically
   - ✅ Appointment moves to dental records
   - ✅ Visible in patient's dental history

---

## 🔧 API Testing (Optional)

### Mark as Complete API
```bash
curl -X POST http://localhost:8000/api/appointments/{id}/mark_completed/ \
  -H "Authorization: Token YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "treatment": "Root canal completed successfully",
    "diagnosis": "Tooth decay in molar #14",
    "notes": "Patient tolerated procedure well"
  }'
```

**Response:**
```json
{
  "message": "Appointment marked as completed and dental record created",
  "appointment": {
    "id": 123,
    "status": "completed",
    ...
  },
  "dental_record": {
    "id": 45,
    "patient": 10,
    "appointment": 123,
    "treatment": "Root canal completed successfully",
    "diagnosis": "Tooth decay in molar #14",
    "notes": "Patient tolerated procedure well",
    "created_by": 5,
    "created_at": "2025-10-20T20:15:00Z"
  }
}
```

### Mark as Missed API
```bash
curl -X POST http://localhost:8000/api/appointments/{id}/mark_missed/ \
  -H "Authorization: Token YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "id": 123,
  "status": "missed",
  "patient": 10,
  "patient_name": "John Doe",
  ...
}
```

---

## 🐛 Troubleshooting

### Issue: Buttons not showing
**Solution:**
- Ensure appointment status is "confirmed"
- Ensure you're logged in as Staff or Owner
- Check browser console for errors

### Issue: Auto-mark not working
**Solution:**
- Check system time is correct
- Ensure appointment date/time is in the past
- Refresh the page to trigger API call

### Issue: Dental record not created
**Solution:**
- Check backend logs for errors
- Ensure DentalRecord model exists in database
- Verify token authentication is working

### Issue: Permission denied
**Solution:**
- Ensure user type is "staff" or "owner"
- Check token is valid and not expired
- Verify Authorization header is included

---

## ✅ Quick Checklist

Before marking as complete, verify:

- [ ] Backend server is running (`python manage.py runserver`)
- [ ] Frontend is running (`npm run dev`)
- [ ] User is logged in as Staff or Owner
- [ ] Appointment status is "confirmed"
- [ ] Buttons are visible (green checkmark, yellow warning)
- [ ] Clicking buttons shows success messages
- [ ] Appointments disappear after marking
- [ ] Database updates correctly (check Django admin)
- [ ] Auto-mark works for past appointments
- [ ] Patient cannot see mark complete/missed buttons

---

## 🎉 Success Indicators

### When Everything Works:
1. ✅ Past appointments **automatically** become "missed"
2. ✅ Staff can click **green checkmark** to mark complete
3. ✅ Dental record **auto-creates** with treatment details
4. ✅ Completed appointments **disappear** from list
5. ✅ Staff can click **yellow warning** to mark missed
6. ✅ Missed appointments **disappear** from list
7. ✅ Buttons **only show** for confirmed appointments
8. ✅ Patients **cannot** mark complete/missed
9. ✅ Everything is **connected** and working together

**If all these work, the system is COMPLETE! 🚀**
