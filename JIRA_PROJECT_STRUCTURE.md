# Jira User Stories & Backlog
# Dorotheo Dental Clinic Management System

**Project Manager:** Ezekiel Galauran  
**Project Key:** DDC  
**Last Updated:** January 6, 2026

---

## Table of Contents
1. [Project Status Overview](#project-status-overview)
2. [Epic Breakdown with User Stories](#epic-breakdown-with-user-stories)
3. [Status Tracking](#status-tracking)

---

## Project Status Overview

### Overall Progress (User Stories)
- **Total User Stories:** 45
- **✅ Done:** 35 (78%)
- **🔄 In Progress:** 5 (11%)
- **📋 To Do:** 5 (11%)

### Status by Epic

| Epic | Done | In Progress | To Do | Total | % Complete |
|------|------|-------------|-------|-------|------------|
| EPIC 1: User Management | 4 | 0 | 0 | 4 | 100% ✅ |
| EPIC 2: Appointments | 8 | 0 | 0 | 8 | 100% ✅ |
| EPIC 3: AI Chatbot | 5 | 0 | 0 | 5 | 100% ✅ |
| EPIC 4: Notifications | 3 | 0 | 0 | 3 | 100% ✅ |
| EPIC 5: Patient Records | 8 | 0 | 0 | 8 | 100% ✅ |
| EPIC 6: Staff Management | 1 | 0 | 0 | 1 | 100% ✅ |
| EPIC 7: Services | 1 | 0 | 0 | 1 | 100% ✅ |
| EPIC 8: Patient Management | 1 | 0 | 0 | 1 | 100% ✅ |
| EPIC 9: Dentist Availability | 1 | 0 | 0 | 1 | 100% ✅ |
| EPIC 10: Inventory | 0 | 2 | 0 | 2 | 0% 🔄 |
| EPIC 11: Billing | 0 | 2 | 0 | 2 | 0% 🔄 |
| EPIC 12: Analytics | 0 | 1 | 0 | 1 | 0% 🔄 |
| EPIC 13: Reports | 0 | 0 | 1 | 1 | 0% 📋 |
| EPIC 14: Email Notifications | 0 | 0 | 1 | 1 | 0% 📋 |
| EPIC 15: SMS Notifications | 0 | 0 | 1 | 1 | 0% 📋 |
| EPIC 16: Treatment Plans | 0 | 0 | 1 | 1 | 0% 📋 |
| EPIC 17: File Attachments | 0 | 0 | 1 | 1 | 0% 📋 |

---

## Epic Breakdown with User Stories

### **EPIC 1: User Management & Authentication** ✅ COMPLETE
**Priority:** HIGHEST  
**Status:** DONE

#### **User Story 1.1:** User Registration & Login [DDC-2] ✅
*As a user, I want to register and log in securely so I can access my dashboard.*
- **Status:** DONE
- **Implementation:**
  - Custom User model with roles (patient, staff, owner)
  - Token-based authentication API
  - Login/Register UI components
  - Files: `backend/api/models.py`, `backend/api/views.py`, `frontend/app/login/`

#### **User Story 1.2:** Password Reset Flow [DDC-6] ✅
*As a user, I want to reset my password via email if I forget it.*
- **Status:** DONE
- **Implementation:**
  - PasswordResetToken model
  - Password reset API endpoints
  - Password reset modal UI
  - Files: `backend/api/models.py`, `frontend/components/password-reset-modal.tsx`

#### **User Story 1.3:** Role-Based Access Control [DDC-11] ✅
*As an owner, I want different access levels for patients, staff, and owners.*
- **Status:** DONE
- **Implementation:**
  - Role field in User model (patient, staff, owner)
  - Role-specific dashboards (patient, staff, owner)
  - Files: `frontend/app/patient/`, `frontend/app/staff/`, `frontend/app/owner/`

#### **User Story 1.4:** User Profile Management [DDC-15] ✅
*As a user, I want to update my profile information.*
- **Status:** DONE
- **Implementation:**
  - Profile fields in User model
  - Profile page UI for all user types
  - Files: `frontend/app/patient/profile/`, `frontend/app/staff/profile/`

---

### **EPIC 2: Appointment Management** ✅ COMPLETE
**Priority:** HIGHEST  
**Status:** DONE

#### **User Story 2.1:** Book Appointments (Patient) [DDC-21] ✅
*As a patient, I want to book appointments online without calling.*
- **Status:** DONE
- **Implementation:**
  - Appointment model with status tracking
  - Appointment booking API with double-booking prevention
  - Booking wizard UI with dentist/date/time/service selection
  - Status: pending (requires staff approval)
  - Notifications to staff/owner
  - Files: `frontend/app/patient/appointments/`, `backend/api/views.py`

#### **User Story 2.2:** Book Appointments (Staff/Owner) [DDC-22] ✅
*As a staff/owner, I want to create confirmed appointments directly.*
- **Status:** DONE
- **Implementation:**
  - Create appointment for any patient
  - Status: confirmed (no approval needed)
  - Patient search functionality
  - Files: `frontend/app/staff/appointments/`, `frontend/app/owner/appointments/`

#### **User Story 2.3:** Reschedule Appointments (Patient Request) [DDC-30] ✅
*As a patient, I want to request appointment rescheduling.*
- **Status:** DONE
- **Implementation:**
  - Reschedule request with new date/time
  - Reschedule fields: reschedule_date, reschedule_time, reschedule_notes
  - Status changes to 'reschedule_requested'
  - Notifications to staff/owner
  - Files: `backend/api/views.py` (request_reschedule endpoint)

#### **User Story 2.4:** Approve/Reject Reschedule (Staff/Owner) [DDC-31] ✅
*As a staff/owner, I want to approve or reject reschedule requests.*
- **Status:** DONE
- **Implementation:**
  - View reschedule requests with comparison (current vs requested)
  - Approve: applies changes to appointment
  - Reject: reverts to confirmed status
  - Patient notification
  - Files: `backend/api/views.py` (approve_reschedule, reject_reschedule)

#### **User Story 2.5:** Cancel Appointments (Patient Request) [DDC-32] ✅
*As a patient, I want to request appointment cancellation.*
- **Status:** DONE
- **Implementation:**
  - Cancel request with reason
  - Status changes to 'cancel_requested'
  - Notifications to staff/owner
  - Files: `backend/api/views.py` (request_cancel endpoint)

#### **User Story 2.6:** Approve/Reject Cancellation (Staff/Owner) [DDC-33] ✅
*As a staff/owner, I want to approve or reject cancellation requests.*
- **Status:** DONE
- **Implementation:**
  - View cancellation requests
  - Approve: deletes appointment
  - Reject: reverts to confirmed
  - Patient notification (persists after deletion via SET_NULL)
  - Files: `backend/api/views.py` (approve_cancel, reject_cancel)

#### **User Story 2.7:** View Appointments [DDC-26] ✅
*As a user, I want to view my appointments.*
- **Status:** DONE
- **Implementation:**
  - Patient: View own appointments
  - Staff/Owner: View all appointments
  - Filter by status (upcoming, past)
  - Calendar view for staff/owner
  - Files: `frontend/app/patient/appointments/`, `frontend/app/staff/appointments/`

#### **User Story 2.8:** Mark Appointment Complete/Missed [DDC-34] ✅
*As a staff/owner, I want to mark appointments as completed or missed.*
- **Status:** DONE
- **Implementation:**
  - Complete: creates dental record automatically
  - Missed: marks patient as missed
  - Files: `backend/api/views.py` (mark_complete, mark_missed)

---

### **EPIC 3: AI Chatbot Integration** ✅ COMPLETE
**Priority:** MEDIUM  
**Status:** DONE

#### **User Story 3.1:** AI Chatbot Widget [DDC-151] ✅
*As a patient, I want to interact with an AI assistant for dental questions.*
- **Status:** DONE
- **Implementation:**
  - Ollama LLM integration (llama3.2:3b)
  - Dental-only topic restriction
  - Conversation history support
  - Chatbot widget UI
  - Files: `backend/api/chatbot_service.py`, `frontend/components/chatbot-widget.tsx`

#### **User Story 3.2:** Book Appointment via Chatbot [DDC-152] ✅
*As a patient, I want to book appointments through the chatbot.*
- **Status:** DONE
- **Implementation:**
  - Multi-step booking flow (dentist → day → date → time → service)
  - 30-minute time slots with lunch break skip (11:30 AM - 12:30 PM)
  - Double-booking prevention
  - Creates pending appointment
  - Files: `backend/api/chatbot_service.py` (handle_booking_intent)

#### **User Story 3.3:** Cancel Appointment via Chatbot [DDC-153] ✅
*As a patient, I want to cancel appointments through the chatbot.*
- **Status:** DONE
- **Implementation:**
  - Show upcoming appointments
  - Select appointment to cancel
  - Confirmation step
  - Submit cancellation request
  - Files: `backend/api/chatbot_service.py` (handle_cancel_intent)

#### **User Story 3.4:** Reschedule Appointment via Chatbot [DDC-154] ✅
*As a patient, I want to reschedule appointments through the chatbot.*
- **Status:** DONE
- **Implementation:**
  - Show current appointment
  - Show available dates (exclude today)
  - Show available time slots (30-min intervals)
  - Submit reschedule request
  - Files: `backend/api/chatbot_service.py` (handle_reschedule_intent)
  - **Latest Update:** January 6, 2026 - Fixed to properly submit reschedule requests

#### **User Story 3.5:** View Available Slots via Chatbot [DDC-155] ✅
*As a patient, I want to check available appointment slots.*
- **Status:** DONE
- **Implementation:**
  - Show available dentists today
  - Click dentist to see their slots
  - 30-minute intervals with lunch break skip
  - Files: `backend/api/chatbot_service.py`

---

### **EPIC 4: Notifications System** ✅ COMPLETE
**Priority:** HIGH  
**Status:** DONE

#### **User Story 4.1:** Appointment Notifications (Staff/Owner) [DDC-181] ✅
*As a staff/owner, I want to receive notifications about appointments.*
- **Status:** DONE
- **Implementation:**
  - New appointment notification
  - Reschedule request notification
  - Cancellation request notification
  - Notification bell UI
  - Mark as read functionality
  - Files: `frontend/components/notification-bell.tsx`, `backend/api/models.py`

#### **User Story 4.2:** Patient Notifications [DDC-182] ✅
*As a patient, I want to receive notifications about my appointments.*
- **Status:** DONE
- **Implementation:**
  - Appointment confirmed notification
  - Reschedule approved/rejected notification
  - Cancellation approved/rejected notification
  - Color-coded UI (green for approved, red for cancel)
  - Notifications persist after appointment deletion (SET_NULL)
  - Files: `frontend/components/notification-bell.tsx`, `backend/api/views.py`

#### **User Story 4.3:** Quick Actions from Notifications [DDC-183] ✅
*As a staff/owner, I want to approve/reject from notification bell.*
- **Status:** DONE
- **Implementation:**
  - Approve reschedule button
  - Reject reschedule button
  - Approve cancel button
  - Reject cancel button
  - Files: `frontend/components/notification-bell.tsx`

---

### **EPIC 5: Patient Records Management** ✅ COMPLETE
**Priority:** HIGH  
**Status:** DONE

#### **User Story 5.1:** Patient Database [DDC-51] ✅
*As a staff member, I want a centralized database of all patient information.*
- **Status:** DONE
- **Implementation:**
  - Patient list with search
  - Patient details view
  - Files: `frontend/app/staff/patients/`, `frontend/app/owner/patients/`

#### **User Story 5.2:** Interactive Tooth Chart [DDC-55] ✅
*As a dentist, I want to visually record the status of each tooth.*
- **Status:** DONE
- **Implementation:**
  - ToothChart model with JSON data structure
  - Interactive tooth chart component
  - Files: `backend/api/models.py`, `frontend/components/tooth-chart.tsx`

#### **User Story 5.3:** Dental Records & History [DDC-60] ✅
*As a dentist, I want to record treatment details after each visit.*
- **Status:** DONE
- **Implementation:**
  - DentalRecord model
  - Auto-create on appointment completion
  - Treatment details and diagnosis fields
  - Files: `backend/api/models.py`, `frontend/app/patient/records/`

#### **User Story 5.4:** Document Upload [DDC-64] ✅
*As a staff member, I want to upload patient documents like X-rays.*
- **Status:** DONE
- **Implementation:**
  - FileAttachment model
  - File upload API with media storage
  - Document upload component
  - Files: `backend/api/models.py`, `frontend/components/document-upload.tsx`

#### **User Story 5.5:** Patient Intake Form [DDC-69] ✅
*As a patient, I want to fill out my medical history online.*
- **Status:** DONE
- **Implementation:**
  - PatientIntakeForm model
  - Digital intake form UI
  - Files: `backend/api/models.py`, `frontend/app/patient/intake-form/`

#### **User Story 5.6:** Teeth Image Upload [DDC-73] ✅
*As a dentist, I want to upload photos of patient teeth.*
- **Status:** DONE
- **Implementation:**
  - TeethImage model with latest flag
  - Teeth image upload API
  - Upload component
  - Files: `backend/api/models.py`, `frontend/components/teeth-image-upload.tsx`

#### **User Story 5.7:** Clinical Notes [DDC-77] ✅
*As a dentist, I want to add clinical notes to patient records.*
- **Status:** DONE
- **Implementation:**
  - ClinicalNote model
  - Clinical notes UI
  - Files: `backend/api/models.py`, `frontend/app/patient/notes/`

#### **User Story 5.8:** Treatment Assignments [DDC-81] ✅
*As a dentist, I want to assign treatments to patients.*
- **Status:** DONE
- **Implementation:**
  - TreatmentAssignment model
  - Treatment assignment UI
  - Files: `backend/api/models.py`, `frontend/app/patient/treatments/`

---

### **EPIC 6: Staff Management** ✅ COMPLETE
**Priority:** MEDIUM  
**Status:** DONE

#### **User Story 6.1:** Manage Staff (Owner Only) [DDC-90] ✅
*As an owner, I want to manage staff accounts.*
- **Status:** DONE
- **Implementation:**
  - View all staff
  - Add new staff (dentist/receptionist)
  - Edit staff details
  - Delete staff
  - Files: `frontend/app/owner/staff/page.tsx`

---

### **EPIC 7: Services Management** ✅ COMPLETE
**Priority:** MEDIUM  
**Status:** DONE

#### **User Story 7.1:** Manage Dental Services [DDC-91] ✅
*As an owner, I want to manage dental services offered.*
- **Status:** DONE
- **Implementation:**
  - Service model (name, category, description, price, duration)
  - View/Add/Edit/Delete services
  - Files: `backend/api/models.py`, `frontend/app/owner/services/`

---

### **EPIC 8: Patient Management** ✅ COMPLETE
**Priority:** MEDIUM  
**Status:** DONE

#### **User Story 8.1:** View All Patients [DDC-92] ✅
*As a staff/owner, I want to view all registered patients.*
- **Status:** DONE
- **Implementation:**
  - Patient list with details
  - Search functionality
  - View patient history
  - Files: `frontend/app/staff/patients/`, `frontend/app/owner/patients/`

---

### **EPIC 9: Dentist Availability** ✅ COMPLETE
**Priority:** HIGH  
**Status:** DONE

#### **User Story 9.1:** Set Dentist Availability [DDC-35] ✅
*As a staff/owner, I want to set dentist availability.*
- **Status:** DONE
- **Implementation:**
  - DentistAvailability model (date, start_time, end_time)
  - Check availability before booking
  - 30-minute time slots
  - Lunch break: 11:30 AM - 12:30 PM
  - Files: `backend/api/models.py`, `backend/api/views.py`

---

### **EPIC 10: Inventory Management** 🔄 IN PROGRESS
**Priority:** MEDIUM  
**Status:** IN PROGRESS

#### **User Story 10.1:** View Inventory [DDC-101] 🔄
*As a staff/owner, I want to view dental inventory.*
- **Status:** IN PROGRESS
- **Implementation:**
  - ✅ InventoryItem model exists
  - ✅ API endpoints created
  - ❌ Frontend UI incomplete
- **Blocking:** Need to implement frontend inventory page

#### **User Story 10.2:** Manage Inventory [DDC-102] 🔄
*As a staff/owner, I want to add/edit/delete inventory items.*
- **Status:** IN PROGRESS
- **Implementation:**
  - ✅ Backend CRUD operations
  - ❌ Frontend forms needed

---

### **EPIC 11: Billing System** 🔄 IN PROGRESS
**Priority:** HIGH  
**Status:** IN PROGRESS

#### **User Story 11.1:** Generate Bills [DDC-121] 🔄
*As a staff/owner, I want to generate bills for completed appointments.*
- **Status:** IN PROGRESS
- **Implementation:**
  - ✅ Billing model exists
  - ✅ API endpoints created
  - ❌ Frontend billing UI needed

#### **User Story 11.2:** View Billing History [DDC-122] 🔄
*As a staff/owner, I want to view billing history.*
- **Status:** IN PROGRESS
- **Implementation:**
  - ✅ Backend API ready
  - ❌ Frontend implementation needed

---

### **EPIC 12: Analytics Dashboard** 🔄 IN PROGRESS
**Priority:** MEDIUM  
**Status:** IN PROGRESS

#### **User Story 12.1:** View Analytics [DDC-201] 🔄
*As an owner, I want to see clinic analytics.*
- **Status:** IN PROGRESS
- **Implementation:**
  - ✅ Analytics endpoint exists
  - ❌ Dashboard UI incomplete
- **Next Steps:** Create analytics dashboard with charts

---

### **EPIC 13: Reports Generation** 📋 TO DO
**Priority:** MEDIUM  
**Status:** TO DO

#### **User Story 13.1:** Generate Reports [DDC-205] 📋
*As an owner, I want to generate various reports.*
- **Status:** TO DO
- **Requirements:**
  - Appointment reports
  - Revenue reports
  - Patient statistics

---

### **EPIC 14: Email Notifications** 📋 TO DO
**Priority:** LOW  
**Status:** TO DO

#### **User Story 14.1:** Email Appointment Reminders [DDC-186] 📋
*As a system, I want to send email reminders.*
- **Status:** TO DO
- **Requirements:**
  - Email service integration
  - Appointment reminder emails
  - Email templates

---

### **EPIC 15: SMS Notifications** 📋 TO DO
**Priority:** LOW  
**Status:** TO DO

#### **User Story 15.1:** SMS Appointment Reminders [DDC-189] 📋
*As a system, I want to send SMS reminders.*
- **Status:** TO DO
- **Requirements:**
  - SMS gateway integration
  - SMS templates

---

### **EPIC 16: Treatment Plans** 📋 TO DO
**Priority:** MEDIUM  
**Status:** TO DO

#### **User Story 16.1:** Create Treatment Plans [DDC-210] 📋
*As a dentist, I want to create multi-visit treatment plans.*
- **Status:** TO DO
- **Implementation:**
  - ✅ TreatmentPlan model exists
  - ❌ Frontend UI needed

---

### **EPIC 17: File Attachments Enhancement** 📋 TO DO
**Priority:** MEDIUM  
**Status:** TO DO

#### **User Story 17.1:** Enhanced Document Management [DDC-211] 📋
*As a staff, I want better document management features.*
- **Status:** TO DO
- **Requirements:**
  - Document categorization
  - Advanced search
  - Version control

---

## Status Tracking

### Completion Summary
- **✅ Complete Epics:** 9 (User Management, Appointments, AI Chatbot, Notifications, Patient Records, Staff, Services, Patient Management, Dentist Availability)
- **🔄 In Progress Epics:** 3 (Inventory, Billing, Analytics)
- **📋 To Do Epics:** 5 (Reports, Email, SMS, Treatment Plans, File Enhancements)

### Recent Updates (January 6, 2026)
1. **Chatbot Reschedule Flow** ✅
   - Fixed time slot generation to show all available slots
   - Added handler to submit reschedule requests
   - Changed to request-based system (requires staff approval)

2. **Calendar Timezone Issue** ✅
   - Fixed "No appointments for this date" bug
   - Changed from toISOString() to manual date string construction

3. **Notification Persistence** ✅
   - Fixed cancel approved notification disappearing
   - Changed AppointmentNotification.appointment to SET_NULL

---

## Backlog Priority

### High Priority (Next Sprint)
1. 🔄 US-10.1: Complete Inventory Management UI
2. 🔄 US-11.1: Complete Billing System UI
3. 🔄 US-12.1: Complete Analytics Dashboard

### Medium Priority
4. 📋 US-13.1: Reports Generation
5. 📋 US-16.1: Treatment Plans UI

### Low Priority (Future)
6. 📋 US-14.1: Email Notifications
7. 📋 US-15.1: SMS Notifications
8. 📋 US-17.1: File Attachments Enhancement

---

**Note:** The 78% completion rate is based on USER STORIES (35 of 45 done). The project has strong core functionality with booking, rescheduling, cancellation, AI chatbot, and notifications fully operational. Remaining work focuses on UI completion for existing backend features and future enhancements.

**Last Updated:** January 6, 2026  
**Maintained By:** Ezekiel Galauran (Project Manager)
**Last Updated:** January 6, 2026  
**Maintained By:** Ezekiel Galauran (Project Manager)
