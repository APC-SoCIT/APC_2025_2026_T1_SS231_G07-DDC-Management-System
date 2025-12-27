# Jira Project Management Structure
# Dorotheo Dental Clinic Management System

**Project Manager:** Ezekiel Galauran  
**Project Key:** DDC  
**Last Updated:** December 9, 2025

---

## Table of Contents
1. [Project Hierarchy Overview](#project-hierarchy-overview)
2. [Issue Types & Usage](#issue-types--usage)
3. [Epic Breakdown with Tasks](#epic-breakdown-with-tasks)
4. [Task Status Tracking](#task-status-tracking)
5. [Sprint Planning Recommendations](#sprint-planning-recommendations)
6. [Priority Matrix](#priority-matrix)

---

## Project Hierarchy Overview

```
PROJECT: DDC Management System
├── EPIC 1: User Management & Authentication
│   ├── User Story 1.1: User Registration & Login
│   │   ├── Task 1.1.1: Backend - User Model
│   │   ├── Task 1.1.2: Backend - Auth API Endpoints
│   │   └── Task 1.1.3: Frontend - Login/Register UI
│   ├── User Story 1.2: Password Reset
│   └── User Story 1.3: Role-Based Access Control
│
├── EPIC 2: Appointment System
├── EPIC 3: Patient Records Management
├── EPIC 4: Inventory Management
├── EPIC 5: Billing & Financials
├── EPIC 6: AI Chatbot Integration
├── EPIC 7: Notifications & Alerts
├── EPIC 8: Analytics & Reporting
├── EPIC 9: Deployment & DevOps
└── EPIC 10: Documentation & Testing
```

---

## Issue Types & Usage

| Issue Type | Purpose | Example |
|------------|---------|---------|
| **Epic** | Large body of work (1-3 months) | "User Management & Authentication" |
| **User Story** | Feature from user perspective | "As a patient, I want to book appointments online" |
| **Task** | Technical implementation work | "Create Appointment API endpoint" |
| **Sub-task** | Breakdown of a task | "Write unit tests for Appointment API" |
| **Bug** | Defect or error to fix | "Login fails with special characters in password" |
| **Spike** | Research/investigation task | "Research best SMS gateway for notifications" |

---

## Epic Breakdown with Tasks

### **EPIC 1: User Management & Authentication** [DDC-1]
**Status:** IN PROGRESS  
**Priority:** HIGHEST  
**Story Points:** 34

#### **User Story 1.1:** User Registration & Login [DDC-2]
*As a user, I want to register and log in securely so I can access my dashboard.*

**Tasks:**
- [x] **DDC-3** - Create Custom User Model (AbstractUser) with roles ✅ **DONE**
  - Type: Backend
  - Assignee: Backend Developer
  - Story Points: 5
  - Files: `backend/api/models.py` (User model with user_type, role fields)
  
- [x] **DDC-4** - Implement Token-Based Authentication API ✅ **DONE**
  - Type: Backend
  - Story Points: 5
  - Files: `backend/api/views.py` (register, login, logout endpoints)
  - Dependencies: DDC-3
  
- [x] **DDC-5** - Build Login & Registration Pages ✅ **DONE**
  - Type: Frontend
  - Story Points: 8
  - Files: `frontend/app/login/page.tsx`, `frontend/components/register-modal.tsx`
  - Dependencies: DDC-4

#### **User Story 1.2:** Password Reset Flow [DDC-6]
*As a user, I want to reset my password via email if I forget it.*

**Tasks:**
- [x] **DDC-7** - Create PasswordResetToken Model ✅ **DONE**
  - Type: Backend
  - Story Points: 3
  - Status: DONE
  
- [x] **DDC-8** - Build Password Reset API (request & reset endpoints) ✅ **DONE**
  - Type: Backend
  - Story Points: 5
  - Files: `backend/api/views.py` (request_password_reset, reset_password)
  - Status: DONE
  
- [x] **DDC-9** - Create Password Reset Modal Component ✅ **DONE**
  - Type: Frontend
  - Story Points: 5
  - Files: `frontend/components/password-reset-modal.tsx`
  - Status: DONE
  
- [ ] **DDC-10** - Integrate Email Service (SendGrid/SMTP) ⏳ **TO DO**
  - Type: Backend
  - Story Points: 8
  - Priority: HIGH
  - Status: TO DO

#### **User Story 1.3:** Role-Based Access Control [DDC-11]
*As an owner, I want different access levels for patients, staff, and owners.*

**Tasks:**
- [x] **DDC-12** - Implement Role Field in User Model ✅ **DONE**
  - Type: Backend
  - Story Points: 2
  - Status: DONE
  
- [ ] **DDC-13** - Create Permission Middleware/Decorators ⏳ **TO DO**
  - Type: Backend
  - Story Points: 5
  - Status: TO DO
  
- [x] **DDC-14** - Build Role-Specific Dashboards ✅ **DONE**
  - Type: Frontend
  - Story Points: 13
  - Files: `frontend/app/patient/`, `frontend/app/staff/`, `frontend/app/owner/`
  - Status: DONE

#### **User Story 1.4:** User Profile Management [DDC-15]
*As a user, I want to update my profile information.*

**Tasks:**
- [x] **DDC-16** - Add Profile Fields to User Model ✅ **DONE**
  - Type: Backend
  - Story Points: 2
  - Status: DONE
  
- [x] **DDC-17** - Create Profile Page UI ✅ **DONE**
  - Type: Frontend
  - Story Points: 8
  - Files: `frontend/app/patient/profile/`, `frontend/app/staff/profile/`
  - Status: DONE

---

### **EPIC 2: Appointment System** [DDC-20]
**Status:** IN PROGRESS  
**Priority:** HIGHEST  
**Story Points:** 55

#### **User Story 2.1:** Book Appointments [DDC-21]
*As a patient, I want to book appointments online without calling.*

**Tasks:**
- [x] **DDC-22** - Create Appointment Model ✅ **DONE**
  - Type: Backend
  - Story Points: 5
  - Files: `backend/api/models.py` (Appointment with status, date, time)
  - Status: DONE
  
- [x] **DDC-23** - Build Appointment Booking API ✅ **DONE**
  - Type: Backend
  - Story Points: 8
  - Files: `backend/api/views.py` (AppointmentViewSet)
  - Status: DONE
  
- [x] **DDC-24** - Create Booking Wizard UI ✅ **DONE**
  - Type: Frontend
  - Story Points: 13
  - Files: `frontend/app/patient/appointments/`
  - Status: DONE
  
- [ ] **DDC-25** - Implement Conflict Detection (Double Booking Prevention) ⏳ **TO DO**
  - Type: Backend
  - Story Points: 8
  - Priority: HIGH
  - Status: TO DO

#### **User Story 2.2:** View & Manage Appointments [DDC-26]
*As a staff member, I want to see all scheduled appointments in a calendar view.*

**Tasks:**
- [x] **DDC-27** - Build Appointments List API (with filters) ✅ **DONE**
  - Type: Backend
  - Story Points: 5
  - Status: DONE
  
- [x] **DDC-28** - Create Staff Appointments Dashboard ✅ **DONE**
  - Type: Frontend
  - Story Points: 13
  - Files: `frontend/app/staff/appointments/`
  - Status: DONE
  
- [ ] **DDC-29** - Integrate Calendar Component (FullCalendar or react-big-calendar) ⏳ **TO DO**
  - Type: Frontend
  - Story Points: 13
  - Priority: HIGH
  - Status: TO DO

#### **User Story 2.3:** Reschedule & Cancel Appointments [DDC-30]
*As a patient, I want to reschedule or cancel my appointment if needed.*

**Tasks:**
- [x] **DDC-31** - Add Reschedule/Cancel Fields to Appointment Model ✅ **DONE**
  - Type: Backend
  - Story Points: 3
  - Status: DONE
  
- [x] **DDC-32** - Create Reschedule/Cancel Request API ✅ **DONE**
  - Type: Backend
  - Story Points: 8
  - Status: DONE
  
- [x] **DDC-33** - Build Patient Request UI (Cancel/Reschedule Buttons) ✅ **DONE**
  - Type: Frontend
  - Story Points: 8
  - Status: DONE
  
- [ ] **DDC-34** - Create Staff Approval Workflow UI ⏳ **TO DO**
  - Type: Frontend
  - Story Points: 8
  - Priority: MEDIUM
  - Status: TO DO

#### **User Story 2.4:** Staff Availability Management [DDC-35]
*As a dentist, I want to set my weekly availability.*

**Tasks:**
- [x] **DDC-36** - Create StaffAvailability Model ✅ **DONE**
  - Type: Backend
  - Story Points: 3
  - Status: DONE
  
- [x] **DDC-37** - Build Availability Management API ✅ **DONE**
  - Type: Backend
  - Story Points: 5
  - Status: DONE
  
- [x] **DDC-38** - Create Availability Calendar Component ✅ **DONE**
  - Type: Frontend
  - Story Points: 13
  - Files: `frontend/components/availability-calendar.tsx`
  - Status: DONE

#### **User Story 2.5:** Auto-Mark Missed Appointments [DDC-39]
*As the system, I want to automatically mark appointments as missed after they expire.*

**Tasks:**
- [ ] **DDC-40** - Create Scheduled Task/Cron Job for Missed Appointments ⏳ **TO DO**
  - Type: Backend
  - Story Points: 8
  - Priority: MEDIUM
  - Status: TO DO

---

### **EPIC 3: Patient Records Management** [DDC-50]
**Status:** IN PROGRESS  
**Priority:** HIGH  
**Story Points:** 68

#### **User Story 3.1:** Patient Database Management [DDC-51]
*As a staff member, I want a centralized database of all patient information.*

**Tasks:**
- [x] **DDC-52** - Create Patient Model Extensions ✅ **DONE**
  - Type: Backend
  - Story Points: 3
  - Status: DONE
  
- [x] **DDC-53** - Build Patients List & Search API ✅ **DONE**
  - Type: Backend
  - Story Points: 8
  - Files: `backend/api/views.py` (UserViewSet with patients action)
  - Status: DONE
  
- [x] **DDC-54** - Create Patients Management Dashboard ✅ **DONE**
  - Type: Frontend
  - Story Points: 13
  - Files: `frontend/app/staff/patients/`, `frontend/app/owner/patients/`
  - Status: DONE

#### **User Story 3.2:** Interactive Tooth Chart [DDC-55]
*As a dentist, I want to visually record the status of each tooth.*

**Tasks:**
- [x] **DDC-56** - Create ToothChart Model ✅ **DONE**
  - Type: Backend
  - Story Points: 3
  - Files: `backend/api/models.py` (ToothChart with JSON data)
  - Status: DONE
  
- [x] **DDC-57** - Build Tooth Chart CRUD API ✅ **DONE**
  - Type: Backend
  - Story Points: 5
  - Status: DONE
  
- [x] **DDC-58** - Create Interactive Tooth Chart Component ✅ **DONE**
  - Type: Frontend
  - Story Points: 21
  - Files: `frontend/components/tooth-chart.tsx`
  - Status: DONE
  
- [ ] **DDC-59** - Connect Tooth Chart UI to Backend API ⏳ **IN PROGRESS**
  - Type: Frontend
  - Story Points: 8
  - Priority: HIGH
  - Status: IN PROGRESS

#### **User Story 3.3:** Dental Records & History [DDC-60]
*As a dentist, I want to record treatment details after each visit.*

**Tasks:**
- [x] **DDC-61** - Create DentalRecord Model ✅ **DONE**
  - Type: Backend
  - Story Points: 3
  - Status: DONE
  
- [x] **DDC-62** - Build Dental Records API ✅ **DONE**
  - Type: Backend
  - Story Points: 5
  - Status: DONE
  
- [x] **DDC-63** - Create Dental Records UI (View/Add/Edit) ✅ **DONE**
  - Type: Frontend
  - Story Points: 13
  - Files: `frontend/app/patient/records/`
  - Status: DONE

#### **User Story 3.4:** Document Upload (X-rays, Scans) [DDC-64]
*As a staff member, I want to upload patient documents like X-rays.*

**Tasks:**
- [x] **DDC-65** - Create FileAttachment Model ✅ **DONE**
  - Type: Backend
  - Story Points: 3
  - Status: DONE
  
- [x] **DDC-66** - Build File Upload API with Media Storage ✅ **DONE**
  - Type: Backend
  - Story Points: 8
  - Status: DONE
  
- [x] **DDC-67** - Create Document Upload Component ✅ **DONE**
  - Type: Frontend
  - Story Points: 8
  - Files: `frontend/components/document-upload.tsx`
  - Status: DONE
  
- [x] **DDC-68** - Create Files Management Page ✅ **DONE**
  - Type: Frontend
  - Story Points: 8
  - Files: `frontend/app/patient/files/`
  - Status: DONE

#### **User Story 3.5:** Patient Intake Form [DDC-69]
*As a patient, I want to fill out my medical history online before my visit.*

**Tasks:**
- [x] **DDC-70** - Create PatientIntakeForm Model ✅ **DONE**
  - Type: Backend
  - Story Points: 5
  - Status: DONE
  
- [x] **DDC-71** - Build Intake Form API ✅ **DONE**
  - Type: Backend
  - Story Points: 5
  - Status: DONE
  
- [x] **DDC-72** - Create Digital Intake Form UI ✅ **DONE**
  - Type: Frontend
  - Story Points: 13
  - Files: `frontend/app/patient/intake-form/`
  - Status: DONE

#### **User Story 3.6:** Teeth Image Upload [DDC-73]
*As a dentist, I want to upload photos of patient teeth.*

**Tasks:**
- [x] **DDC-74** - Create TeethImage Model ✅ **DONE**
  - Type: Backend
  - Story Points: 3
  - Status: DONE
  
- [x] **DDC-75** - Build Teeth Image Upload API ✅ **DONE**
  - Type: Backend
  - Story Points: 5
  - Status: DONE
  
- [x] **DDC-76** - Create Teeth Image Upload Component ✅ **DONE**
  - Type: Frontend
  - Story Points: 8
  - Files: `frontend/components/teeth-image-upload.tsx`
  - Status: DONE

#### **User Story 3.7:** Clinical Notes [DDC-77]
*As a dentist, I want to add clinical notes to patient records.*

**Tasks:**
- [x] **DDC-78** - Create ClinicalNote Model ✅ **DONE**
  - Type: Backend
  - Story Points: 3
  - Status: DONE
  
- [x] **DDC-79** - Build Clinical Notes API ✅ **DONE**
  - Type: Backend
  - Story Points: 5
  - Status: DONE
  
- [x] **DDC-80** - Create Clinical Notes UI ✅ **DONE**
  - Type: Frontend
  - Story Points: 8
  - Files: `frontend/app/patient/notes/`
  - Status: DONE

#### **User Story 3.8:** Treatment Assignments [DDC-81]
*As a dentist, I want to assign treatments to patients.*

**Tasks:**
- [x] **DDC-82** - Create TreatmentAssignment Model ✅ **DONE**
  - Type: Backend
  - Story Points: 3
  - Status: DONE
  
- [x] **DDC-83** - Build Treatment Assignment API ✅ **DONE**
  - Type: Backend
  - Story Points: 5
  - Status: DONE
  
- [x] **DDC-84** - Create Treatment Assignment UI ✅ **DONE**
  - Type: Frontend
  - Story Points: 13
  - Files: `frontend/app/patient/treatments/`
  - Status: DONE

---

### **EPIC 4: Inventory Management** [DDC-100]
**Status:** IN PROGRESS  
**Priority:** MEDIUM  
**Story Points:** 42

#### **User Story 4.1:** Track Dental Supplies [DDC-101]
*As a staff member, I want to track inventory levels of dental supplies.*

**Tasks:**
- [x] **DDC-102** - Create InventoryItem Model ✅ **DONE**
  - Type: Backend
  - Story Points: 3
  - Files: `backend/api/models.py` (with quantity, min_stock)
  - Status: DONE
  
- [x] **DDC-103** - Build Inventory CRUD API ✅ **DONE**
  - Type: Backend
  - Story Points: 5
  - Status: DONE
  
- [x] **DDC-104** - Create Inventory Dashboard ✅ **DONE**
  - Type: Frontend
  - Story Points: 13
  - Files: `frontend/app/staff/inventory/`, `frontend/app/owner/inventory/`
  - Status: DONE

#### **User Story 4.2:** Low Stock Alerts [DDC-105]
*As an owner, I want to be alerted when inventory is running low.*

**Tasks:**
- [x] **DDC-106** - Implement `is_low_stock` Property in Model ✅ **DONE**
  - Type: Backend
  - Story Points: 2
  - Status: DONE
  
- [ ] **DDC-107** - Create Low Stock Alert Widget ⏳ **TO DO**
  - Type: Frontend
  - Story Points: 8
  - Priority: MEDIUM
  - Status: TO DO
  
- [ ] **DDC-108** - Add Email Notifications for Low Stock ⏳ **TO DO**
  - Type: Backend
  - Story Points: 5
  - Priority: LOW
  - Status: TO DO

#### **User Story 4.3:** Inventory Usage Tracking [DDC-109]
*As a staff member, I want to record when inventory is used during treatments.*

**Tasks:**
- [ ] **DDC-110** - Create InventoryUsage Model ⏳ **TO DO**
  - Type: Backend
  - Story Points: 3
  - Priority: LOW
  - Status: TO DO
  
- [ ] **DDC-111** - Build Inventory Usage API ⏳ **TO DO**
  - Type: Backend
  - Story Points: 5
  - Priority: LOW
  - Status: TO DO

---

### **EPIC 5: Billing & Financial Management** [DDC-120]
**Status:** IN PROGRESS  
**Priority:** HIGH  
**Story Points:** 50

#### **User Story 5.1:** Generate Invoices [DDC-121]
*As a receptionist, I want to generate invoices for completed appointments.*

**Tasks:**
- [x] **DDC-122** - Create Billing Model ✅ **DONE**
  - Type: Backend
  - Story Points: 3
  - Files: `backend/api/models.py` (with amount, status, soa_file)
  - Status: DONE
  
- [x] **DDC-123** - Build Billing CRUD API ✅ **DONE**
  - Type: Backend
  - Story Points: 5
  - Status: DONE
  
- [x] **DDC-124** - Create Billing Dashboard UI ✅ **DONE**
  - Type: Frontend
  - Story Points: 13
  - Files: `frontend/app/staff/billing/`, `frontend/app/owner/billing/`
  - Status: DONE
  
- [ ] **DDC-125** - Implement PDF Invoice Generation ⏳ **TO DO**
  - Type: Backend
  - Story Points: 13
  - Priority: HIGH
  - Status: TO DO

#### **User Story 5.2:** Payment Tracking [DDC-126]
*As a receptionist, I want to record when patients make payments.*

**Tasks:**
- [x] **DDC-127** - Add Payment Status to Billing Model ✅ **DONE**
  - Type: Backend
  - Story Points: 2
  - Status: DONE
  
- [x] **DDC-128** - Create Payment Recording UI ✅ **DONE**
  - Type: Frontend
  - Story Points: 8
  - Status: DONE

#### **User Story 5.3:** Financial Reports [DDC-129]
*As an owner, I want to view revenue and expense reports.*

**Tasks:**
- [ ] **DDC-130** - Create Analytics API (Revenue, Expenses) ⏳ **TO DO**
  - Type: Backend
  - Story Points: 13
  - Priority: MEDIUM
  - Status: TO DO
  
- [ ] **DDC-131** - Build Financial Charts Component ⏳ **TO DO**
  - Type: Frontend
  - Story Points: 13
  - Priority: MEDIUM
  - Status: TO DO

---

### **EPIC 6: AI Chatbot Integration** [DDC-150]
**Status:** IN PROGRESS  
**Priority:** MEDIUM  
**Story Points:** 55

#### **User Story 6.1:** Basic Chatbot Widget [DDC-151]
*As a patient, I want to ask common questions to a chatbot.*

**Tasks:**
- [x] **DDC-152** - Design Chatbot Widget UI ✅ **DONE**
  - Type: Frontend
  - Story Points: 8
  - Files: `frontend/components/chatbot-widget.tsx`
  - Status: DONE
  
- [ ] **DDC-153** - Integrate OpenAI/LangChain API ⏳ **TO DO**
  - Type: Backend
  - Story Points: 13
  - Priority: MEDIUM
  - Status: TO DO
  
- [ ] **DDC-154** - Create Chatbot Backend Service ⏳ **TO DO**
  - Type: Backend
  - Story Points: 13
  - Priority: MEDIUM
  - Status: TO DO

#### **User Story 6.2:** Context-Aware Responses [DDC-155]
*As a patient, I want the chatbot to know clinic hours and services.*

**Tasks:**
- [ ] **DDC-156** - Create Knowledge Base/FAQ System ⏳ **TO DO**
  - Type: Backend
  - Story Points: 8
  - Priority: MEDIUM
  - Status: TO DO
  
- [ ] **DDC-157** - Implement RAG (Retrieval-Augmented Generation) ⏳ **TO DO**
  - Type: Backend
  - Story Points: 13
  - Priority: LOW
  - Status: TO DO

#### **User Story 6.3:** Chatbot Function Calling [DDC-158]
*As a patient, I want the chatbot to help me check dentist availability.*

**Tasks:**
- [ ] **DDC-159** - Implement Function Calling for Appointments API ⏳ **TO DO**
  - Type: Backend
  - Story Points: 13
  - Priority: LOW
  - Status: TO DO

#### **User Story 6.4:** Escalation to Staff [DDC-160]
*As a patient, I want to be connected to a real person if the chatbot can't help.*

**Tasks:**
- [ ] **DDC-161** - Create Escalation Workflow (Flag for Staff Review) ⏳ **TO DO**
  - Type: Backend
  - Story Points: 8
  - Priority: LOW
  - Status: TO DO

---

### **EPIC 7: Notifications & Alerts** [DDC-180]
**Status:** IN PROGRESS  
**Priority:** HIGH  
**Story Points:** 42

#### **User Story 7.1:** In-App Notifications [DDC-181]
*As a user, I want to see notifications about appointment changes.*

**Tasks:**
- [x] **DDC-182** - Create AppointmentNotification Model ✅ **DONE**
  - Type: Backend
  - Story Points: 3
  - Status: DONE
  
- [x] **DDC-183** - Build Notification API ✅ **DONE**
  - Type: Backend
  - Story Points: 5
  - Status: DONE
  
- [x] **DDC-184** - Create Notification Bell Component ✅ **DONE**
  - Type: Frontend
  - Story Points: 8
  - Files: `frontend/components/notification-bell.tsx`
  - Status: DONE
  
- [ ] **DDC-185** - Implement Real-Time Updates (WebSockets/Polling) ⏳ **TO DO**
  - Type: Backend + Frontend
  - Story Points: 13
  - Priority: HIGH
  - Status: TO DO

#### **User Story 7.2:** Email Notifications [DDC-186]
*As a patient, I want to receive email confirmations for my appointments.*

**Tasks:**
- [ ] **DDC-187** - Integrate Email Service (SendGrid/SMTP) ⏳ **TO DO**
  - Type: Backend
  - Story Points: 8
  - Priority: HIGH
  - Status: TO DO
  - Note: Duplicates DDC-10, can be merged
  
- [ ] **DDC-188** - Create Email Templates (Appointment Confirmation, Reminder) ⏳ **TO DO**
  - Type: Backend
  - Story Points: 5
  - Priority: MEDIUM
  - Status: TO DO

#### **User Story 7.3:** SMS Notifications [DDC-189]
*As a patient, I want to receive SMS reminders 24 hours before my appointment.*

**Tasks:**
- [ ] **DDC-190** - Research SMS Gateway (Twilio/Vonage) 🔬 **SPIKE**
  - Type: Research
  - Story Points: 2
  - Priority: LOW
  - Status: TO DO
  
- [ ] **DDC-191** - Integrate SMS Service ⏳ **TO DO**
  - Type: Backend
  - Story Points: 8
  - Priority: LOW
  - Status: TO DO
  - Dependencies: DDC-190

---

### **EPIC 8: Analytics & Reporting** [DDC-200]
**Status:** NOT STARTED  
**Priority:** MEDIUM  
**Story Points:** 34

#### **User Story 8.1:** Owner Dashboard Analytics [DDC-201]
*As an owner, I want to see key metrics about clinic performance.*

**Tasks:**
- [x] **DDC-202** - Create Analytics Dashboard Layout ✅ **DONE**
  - Type: Frontend
  - Story Points: 8
  - Files: `frontend/app/owner/analytics/`
  - Status: DONE
  
- [ ] **DDC-203** - Build Analytics API (Patient Count, Revenue, Appointments) ⏳ **TO DO**
  - Type: Backend
  - Story Points: 13
  - Priority: MEDIUM
  - Status: TO DO
  
- [ ] **DDC-204** - Create Chart Components (Bar, Line, Pie) ⏳ **TO DO**
  - Type: Frontend
  - Story Points: 13
  - Priority: MEDIUM
  - Status: TO DO

#### **User Story 8.2:** Export Reports [DDC-205]
*As an owner, I want to export data as CSV/PDF for external analysis.*

**Tasks:**
- [x] **DDC-206** - Create Export Button Component ✅ **DONE**
  - Type: Frontend
  - Story Points: 3
  - Files: `frontend/components/ExportButton.tsx`
  - Status: DONE
  
- [x] **DDC-207** - Implement CSV Export Functionality ✅ **DONE**
  - Type: Frontend
  - Story Points: 5
  - Files: `frontend/lib/export.ts`
  - Status: DONE
  
- [ ] **DDC-208** - Implement PDF Export Functionality ⏳ **TO DO**
  - Type: Backend
  - Story Points: 8
  - Priority: LOW
  - Status: TO DO

---

### **EPIC 9: Deployment & DevOps** [DDC-220]
**Status:** IN PROGRESS  
**Priority:** HIGH  
**Story Points:** 34

#### **User Story 9.1:** Production Deployment [DDC-221]
*As a developer, I want the app deployed to production servers.*

**Tasks:**
- [x] **DDC-222** - Configure Vercel Deployment (Frontend) ✅ **DONE**
  - Type: DevOps
  - Story Points: 5
  - Files: `frontend/vercel.json`
  - Status: DONE
  
- [x] **DDC-223** - Configure Railway Deployment (Backend) ✅ **DONE**
  - Type: DevOps
  - Story Points: 5
  - Files: `backend/Procfile`, `backend/nixpacks.toml`
  - Status: DONE
  
- [ ] **DDC-224** - Set Up PostgreSQL Production Database ⏳ **TO DO**
  - Type: DevOps
  - Story Points: 8
  - Priority: HIGH
  - Status: TO DO
  
- [ ] **DDC-225** - Configure Environment Variables (Production) ⏳ **TO DO**
  - Type: DevOps
  - Story Points: 3
  - Priority: HIGH
  - Status: TO DO

#### **User Story 9.2:** CI/CD Pipeline [DDC-226]
*As a developer, I want automated testing and deployment.*

**Tasks:**
- [ ] **DDC-227** - Set Up GitHub Actions Workflow ⏳ **TO DO**
  - Type: DevOps
  - Story Points: 8
  - Priority: MEDIUM
  - Status: TO DO
  
- [ ] **DDC-228** - Configure Auto-Deploy on Merge to Main ⏳ **TO DO**
  - Type: DevOps
  - Story Points: 5
  - Priority: MEDIUM
  - Status: TO DO

---

### **EPIC 10: Documentation & Testing** [DDC-240]
**Status:** IN PROGRESS  
**Priority:** MEDIUM  
**Story Points:** 34

#### **User Story 10.1:** API Documentation [DDC-241]
*As a developer, I want comprehensive API documentation.*

**Tasks:**
- [ ] **DDC-242** - Set Up Swagger/OpenAPI Documentation ⏳ **TO DO**
  - Type: Documentation
  - Story Points: 8
  - Priority: MEDIUM
  - Status: TO DO

#### **User Story 10.2:** User Guides [DDC-243]
*As a new user, I want guides on how to use the system.*

**Tasks:**
- [x] **DDC-244** - Create User Guide Document ✅ **DONE**
  - Type: Documentation
  - Story Points: 5
  - Files: `docs/USER_GUIDE.md`
  - Status: DONE
  
- [x] **DDC-245** - Create Installation Guide ✅ **DONE**
  - Type: Documentation
  - Story Points: 3
  - Files: `docs/INSTALLATION.md`
  - Status: DONE

#### **User Story 10.3:** Automated Testing [DDC-246]
*As a developer, I want automated tests to prevent regressions.*

**Tasks:**
- [ ] **DDC-247** - Set Up Jest/Pytest Testing Framework ⏳ **TO DO**
  - Type: Testing
  - Story Points: 5
  - Priority: HIGH
  - Status: TO DO
  
- [ ] **DDC-248** - Write Unit Tests for Backend APIs ⏳ **TO DO**
  - Type: Testing
  - Story Points: 13
  - Priority: MEDIUM
  - Status: TO DO
  
- [ ] **DDC-249** - Write Integration Tests for Frontend Components ⏳ **TO DO**
  - Type: Testing
  - Story Points: 13
  - Priority: MEDIUM
  - Status: TO DO

#### **User Story 10.4:** Academic Documentation [DDC-250]
*As a student, I need to complete project documentation for finals.*

**Tasks:**
- [x] **DDC-251** - Create Software Requirements Specification (SRS) ✅ **DONE**
  - Type: Documentation
  - Story Points: 8
  - Files: `docs/MSYADD1/04 Finals Deliverables/Software_Requirements_Specification.md`
  - Status: DONE
  
- [x] **DDC-252** - Create Design Constraints & Assumptions Document ✅ **DONE**
  - Type: Documentation
  - Story Points: 5
  - Files: `docs/MSYADD1/04 Finals Deliverables/Design_Constraints_and_Assumptions.md`
  - Status: DONE
  
- [ ] **DDC-253** - Complete Use Case Diagrams ⏳ **TO DO**
  - Type: Documentation
  - Story Points: 8
  - Priority: HIGH
  - Status: TO DO
  
- [ ] **DDC-254** - Complete Activity Diagrams with Swimlanes ⏳ **TO DO**
  - Type: Documentation
  - Story Points: 8
  - Priority: HIGH
  - Status: TO DO

---

## Task Status Tracking

### Status Distribution (As of Dec 9, 2025)

| Status | Count | Percentage |
|--------|-------|------------|
| ✅ DONE | 62 | ~61% |
| ⏳ TO DO | 35 | ~34% |
| 🔄 IN PROGRESS | 5 | ~5% |

### By Epic Progress

| Epic | Done | In Progress | To Do | Total | Completion % |
|------|------|-------------|-------|-------|--------------|
| EPIC 1: User Management | 9 | 0 | 1 | 10 | 90% |
| EPIC 2: Appointments | 9 | 0 | 4 | 13 | 69% |
| EPIC 3: Patient Records | 18 | 1 | 0 | 19 | 95% |
| EPIC 4: Inventory | 3 | 0 | 3 | 6 | 50% |
| EPIC 5: Billing | 5 | 0 | 2 | 7 | 71% |
| EPIC 6: AI Chatbot | 1 | 0 | 6 | 7 | 14% |
| EPIC 7: Notifications | 3 | 0 | 5 | 8 | 38% |
| EPIC 8: Analytics | 3 | 0 | 3 | 6 | 50% |
| EPIC 9: Deployment | 2 | 0 | 4 | 6 | 33% |
| EPIC 10: Documentation | 4 | 0 | 6 | 10 | 40% |

---

## Sprint Planning Recommendations

### **Sprint 1 (Current Sprint)** - Critical Path Items
**Duration:** 2 weeks  
**Goal:** Complete MVP features and fix critical bugs

**Recommended Tasks:**
1. DDC-59 - Connect Tooth Chart UI to Backend ⏳ (IN PROGRESS)
2. DDC-25 - Implement Double Booking Prevention (HIGH)
3. DDC-29 - Integrate Calendar Component (HIGH)
4. DDC-125 - PDF Invoice Generation (HIGH)
5. DDC-187 - Email Service Integration (HIGH)

**Story Points:** 55 (Adjust based on team velocity)

---

### **Sprint 2** - Enhanced Features
**Duration:** 2 weeks  
**Goal:** Add notifications and improve user experience

**Recommended Tasks:**
1. DDC-185 - Real-Time Notifications
2. DDC-188 - Email Templates
3. DDC-34 - Staff Approval Workflow UI
4. DDC-107 - Low Stock Alert Widget
5. DDC-203 - Analytics API

**Story Points:** 47

---

### **Sprint 3** - AI & Advanced Features
**Duration:** 2 weeks  
**Goal:** Integrate AI chatbot and advanced automation

**Recommended Tasks:**
1. DDC-153 - OpenAI/LangChain Integration
2. DDC-154 - Chatbot Backend Service
3. DDC-156 - Knowledge Base System
4. DDC-40 - Auto-Mark Missed Appointments
5. DDC-204 - Chart Components

**Story Points:** 55

---

### **Sprint 4** - Polish & Deployment
**Duration:** 2 weeks  
**Goal:** Testing, documentation, and production readiness

**Recommended Tasks:**
1. DDC-224 - PostgreSQL Production Setup
2. DDC-247 - Testing Framework Setup
3. DDC-248 - Backend Unit Tests
4. DDC-253 - Use Case Diagrams
5. DDC-254 - Activity Diagrams

**Story Points:** 42

---

## Priority Matrix

### **Critical (Must Have for MVP)**
- User Authentication (DONE ✅)
- Appointment Booking (DONE ✅)
- Patient Records (95% DONE ✅)
- Billing System (71% DONE)
- Double Booking Prevention (DDC-25)
- Email Notifications (DDC-187)

### **High (Should Have)**
- Calendar View (DDC-29)
- PDF Invoices (DDC-125)
- Real-Time Notifications (DDC-185)
- Staff Approval Workflow (DDC-34)
- Production Database (DDC-224)
- Use Case Diagrams (DDC-253)

### **Medium (Nice to Have)**
- AI Chatbot (DDC-153, 154)
- Analytics Dashboard (DDC-203, 204)
- Low Stock Alerts (DDC-107)
- Financial Reports (DDC-131)

### **Low (Future Enhancement)**
- SMS Notifications (DDC-191)
- RAG Implementation (DDC-157)
- Inventory Usage Tracking (DDC-110)
- Chatbot Escalation (DDC-161)

---

## Labels & Tags for Jira

**Type Labels:**
- `backend` - Backend Django work
- `frontend` - Frontend Next.js work
- `devops` - Deployment/Infrastructure
- `documentation` - Docs and guides
- `testing` - QA and automated tests
- `research` - Spike/Investigation tasks

**Priority Labels:**
- `critical` - Blocking or security issue
- `high` - Important for MVP
- `medium` - Enhances user experience
- `low` - Future improvement

**Status Labels:**
- `blocked` - Waiting on dependencies
- `needs-review` - Awaiting code review
- `in-testing` - QA testing phase

**Component Labels:**
- `auth` - Authentication system
- `appointments` - Scheduling system
- `patients` - Patient management
- `inventory` - Stock management
- `billing` - Financial system
- `ai` - Chatbot features
- `notifications` - Alerts system

---

## Team Assignment Recommendations

**Backend Team:**
- Focus: API development, database optimization, integrations
- Assign: DDC-25, DDC-40, DDC-153, DDC-187, DDC-203, DDC-224

**Frontend Team:**
- Focus: UI/UX, component development, state management
- Assign: DDC-29, DDC-34, DDC-59, DDC-107, DDC-185, DDC-204

**Full-Stack Team:**
- Focus: End-to-end features requiring both backend and frontend
- Assign: DDC-125, DDC-154, DDC-156

**DevOps/PM:**
- Focus: Deployment, testing setup, documentation
- Assign: DDC-227, DDC-247, DDC-253, DDC-254

---

## Jira Quick Setup Steps

1. **Create Project:**
   - Project Type: Scrum
   - Project Key: DDC
   - Project Name: Dorotheo Dental Clinic Management System

2. **Configure Board:**
   - Columns: Backlog → Selected → In Progress → Code Review → Testing → Done
   - Swimlanes: By Assignee or By Epic

3. **Bulk Import Epics:**
   - Use CSV import or create manually (10 epics)

4. **Bulk Import User Stories:**
   - Create under each epic

5. **Bulk Import Tasks:**
   - Link to parent user stories
   - Set status based on this document (Done/To Do/In Progress)

6. **Set Up Filters:**
   - "My Open Tasks"
   - "High Priority Items"
   - "Backend Tasks"
   - "Frontend Tasks"

7. **Create Sprints:**
   - Sprint 1: Current work (55 SP)
   - Sprint 2-4: Plan ahead

8. **Assign Team Members:**
   - Assign based on expertise

---

## Additional Recommendations

### **Definition of Done (DoD)**
A task is "Done" when:
- [ ] Code is written and meets requirements
- [ ] Code review is completed
- [ ] Unit tests pass (when testing is set up)
- [ ] Manual testing completed
- [ ] Documentation updated (if applicable)
- [ ] Merged to main branch
- [ ] Deployed to staging/production

### **Velocity Tracking**
- **Team Velocity:** Track story points completed per sprint
- **Current Estimate:** 45-55 SP per 2-week sprint (adjust based on team size)
- **Burndown Charts:** Monitor daily progress

### **Risk Management**
**High Risks:**
1. Email/SMS integration complexity → Allocate extra time
2. AI chatbot accuracy → Start with simple FAQ, iterate
3. Production database migration → Test thoroughly in staging

**Mitigation:**
- Buffer time for integration tasks
- Regular stakeholder demos
- Early testing with real data

---

## Notes
- **Total Project Size:** ~450 Story Points
- **Estimated Completion:** 8-10 sprints (16-20 weeks)
- **Current Progress:** 61% complete
- **Remaining Work:** Focus on integrations, AI features, and testing

**Last Updated:** December 9, 2025  
**Maintained By:** Ezekiel Galauran (Project Manager)
