# Dorotheo Dental Clinic Management System
## Fully Dressed Use Cases

**System:** Dorotheo Dental Clinic Management System  
**Date:** February 6, 2026  
**Version:** 1.0

---

## Table of Contents

1. **UC-01:** Register New Patient Account
2. **UC-02:** Login to System
3. **UC-03:** Reset Password
4. **UC-04:** Update Personal Information
5. **UC-05:** View Available Services
6. **UC-06:** Book Consultation Appointment
7. **UC-07:** Reschedule Appointment
8. **UC-08:** Cancel Appointment
9. **UC-09:** View Appointment History
10. **UC-10:** Create Dental Record
11. **UC-11:** View Patient Medical Records
12. **UC-12:** Upload Medical Document
13. **UC-13:** Manage Inventory Items
14. **UC-14:** Create Billing Statement
15. **UC-15:** Update Payment Status
16. **UC-16:** Create Staff Account
17. **UC-17:** View Owner Analytics Dashboard

---

# UC-01: Register New Patient Account

| Field | Details |
|-------|---------|
| **Use Case ID** | UC-01 |
| **Use Case Name** | Register New Patient Account |
| **Author** | Dental Clinic Team |
| **Purpose** | To allow new patients to create an account in the system with required personal information |
| **Requirement Traceability** | BR-01 |
| **Priority** | High |

### Preconditions:
- User is not logged into the system
- User has access to the system's registration page
- User has a valid email address

### Postconditions:
- New patient account is created in the system
- Patient can login with username or email and password
- Patient record is initialized in the database

### Primary Actor/s:
- Patient

### Secondary Actor/s:
- None

### Include Use Cases:
- None

### Extends Use Cases:
- None

### Flow of Actions:

#### Basic Flow:
1. User navigates to the system homepage
2. User clicks on "Register" button
3. System displays registration form
4. User enters the following information:
   - Username
   - Email address
   - Password
   - Full name
   - Phone number
   - Home address
   - Birthday
5. User clicks "Submit Registration"
6. System validates all required fields are filled
7. System checks if username/email already exists
8. System creates patient account in database
9. System sends confirmation message
10. User is redirected to login page

#### Alternative Flow (Invalid Email):
1. User enters invalid email format
2. System displays error message: "Please enter a valid email address"
3. User corrects email field
4. System continues with Basic Flow from Step 6

#### Alternative Flow (Username Already Exists):
1. System detects username is already registered
2. System displays error: "Username already taken. Please choose another."
3. User enters different username
4. System continues with Basic Flow from Step 6

#### Alternative Flow (Password Too Weak):
1. User enters password with less than 8 characters
2. System displays error: "Password must be at least 8 characters"
3. User enters stronger password
4. System continues with Basic Flow from Step 6

---

# UC-02: Login to System

| Field | Details |
|-------|---------|
| **Use Case ID** | UC-02 |
| **Use Case Name** | Login to System |
| **Author** | Dental Clinic Team |
| **Purpose** | To authenticate users and grant access to their respective dashboards |
| **Requirement Traceability** | BR-02 |
| **Priority** | High |

### Preconditions:
- User has a valid account in the system
- User is not currently logged in
- User has access to login page

### Postconditions:
- User is authenticated and logged in
- User is redirected to their appropriate dashboard based on user type
- Session token is created and stored

### Primary Actor/s:
- Owner, Dentist, Receptionist, Patient

### Secondary Actor/s:
- System (Authentication Service)

### Include Use Cases:
- None

### Extends Use Cases:
- UC-03 (Reset Password) - if user forgot password

### Flow of Actions:

#### Basic Flow:
1. User navigates to login page
2. System displays login form
3. User enters username or email
4. User enters password
5. User clicks "Login" button
6. System verifies credentials against database
7. System validates user is active
8. System creates authentication token
9. System determines user type (Owner, Staff, Patient)
10. System redirects to appropriate dashboard:
    - Owner → Owner Dashboard
    - Dentist → Staff Dashboard
    - Receptionist → Staff Dashboard
    - Patient → Patient Dashboard

#### Alternative Flow (Invalid Credentials):
1. User enters incorrect username/email or password
2. System displays error: "Invalid username/email or password"
3. User corrects entry
4. System continues with Basic Flow from Step 5

#### Alternative Flow (Account Not Found):
1. System cannot find matching account
2. System displays error: "No account found with this username/email"
3. User can choose to register (UC-01) or try again

#### Alternative Flow (Forgot Password):
1. User clicks "Forgot Password?" link
2. Extends to UC-03 (Reset Password)

---

# UC-03: Reset Password

| Field | Details |
|-------|---------|
| **Use Case ID** | UC-03 |
| **Use Case Name** | Reset Password |
| **Author** | Dental Clinic Team |
| **Purpose** | To allow users to reset their password if they forget it |
| **Requirement Traceability** | BR-03, BR-52, BR-53 |
| **Priority** | High |

### Preconditions:
- User is not logged in
- User has registered email address in system
- Email service is configured and operational

### Postconditions:
- User password is successfully reset
- User can login with new password
- Password reset link is invalidated

### Primary Actor/s:
- Patient, Owner, Staff

### Secondary Actor/s:
- Email Service

### Include Use Cases:
- None

### Extends Use Cases:
- UC-02 (Login) - extends from login when user clicks "Forgot Password"

### Flow of Actions:

#### Basic Flow:
1. User navigates to login page
2. User clicks "Forgot Password?" link
3. System displays email request form
4. User enters registered email address
5. User clicks "Send Reset Link"
6. System verifies email exists in database
7. System generates secure password reset token
8. System sends reset email with token link
9. System displays success message: "Check your email for password reset link"
10. User clicks link in email
11. System validates token and displays new password form
12. User enters new password (minimum 8 characters, mixed case, numbers, special characters)
13. User confirms new password
14. System validates password strength
15. System updates password in database
16. System invalidates reset token
17. System displays success: "Password reset successfully. Please login with new password"
18. User is redirected to login page

#### Alternative Flow (Email Not Found):
1. System cannot find matching email
2. System displays error: "No account found with this email address"
3. User can try another email or register new account

#### Alternative Flow (Reset Link Expired):
1. User clicks expired password reset link
2. System displays error: "Password reset link has expired"
3. User must request new reset link
4. System continues with Basic Flow from Step 2

#### Alternative Flow (Weak Password):
1. User enters password without special characters or numbers
2. System displays error: "Password must contain uppercase, lowercase, numbers, and special characters"
3. User enters valid password
4. System continues with Basic Flow from Step 14

---

# UC-04: Update Personal Information

| Field | Details |
|-------|---------|
| **Use Case ID** | UC-04 |
| **Use Case Name** | Update Personal Information |
| **Author** | Dental Clinic Team |
| **Purpose** | To allow users to view and update their personal profile information |
| **Requirement Traceability** | BR-04 |
| **Priority** | Medium |

### Preconditions:
- User is logged into the system
- User is on their profile page
- User account exists in database

### Postconditions:
- User's personal information is updated in database
- Changes are immediately reflected in system
- User receives confirmation of changes

### Primary Actor/s:
- Patient, Owner, Dentist, Receptionist

### Secondary Actor/s:
- None

### Include Use Cases:
- None

### Extends Use Cases:
- None

### Flow of Actions:

#### Basic Flow:
1. User navigates to Profile/Settings page
2. System displays current user information:
   - Full name
   - Phone number
   - Address
   - Birthday
   - Profile picture
3. User clicks "Edit Profile" button
4. System enables editing for all fields
5. User modifies desired information
6. User clicks "Save Changes" button
7. System validates all fields
8. System updates database
9. System displays success message: "Profile updated successfully"
10. User information is updated in all subsequent interactions

#### Alternative Flow (Invalid Phone Format):
1. User enters phone number in invalid format
2. System displays error: "Please enter valid phone number format"
3. User corrects phone number
4. System continues with Basic Flow from Step 7

#### Alternative Flow (Upload Profile Picture):
1. User clicks on profile picture
2. System opens file upload dialog
3. User selects image file (JPG, PNG)
4. System validates file size and format
5. System uploads and stores image
6. System displays updated profile picture
7. System continues with Basic Flow from Step 8

---

# UC-05: View Available Services

| Field | Details |
|-------|---------|
| **Use Case ID** | UC-05 |
| **Use Case Name** | View Available Services |
| **Author** | Dental Clinic Team |
| **Purpose** | To display all available dental services organized by category |
| **Requirement Traceability** | BR-05 |
| **Priority** | High |

### Preconditions:
- Services exist in system database
- User has access to services page

### Postconditions:
- Services are displayed with all relevant information
- User can filter by category
- User can proceed to book appointment

### Primary Actor/s:
- Patient, Owner, Staff

### Secondary Actor/s:
- None

### Include Use Cases:
- UC-06 (Book Consultation Appointment) - from services listing

### Extends Use Cases:
- None

### Flow of Actions:

#### Basic Flow:
1. User navigates to Services page
2. System displays all services organized into 5 categories:
   - Orthodontics
   - Restorations
   - X-rays
   - Oral Surgery
   - Preventive Care
3. For each service, system displays:
   - Service name
   - Description
   - Service image
   - Category
4. User can view all services in list or grid view
5. User can read service descriptions
6. User can select service to book appointment (UC-06)

#### Alternative Flow (Filter by Category):
1. User clicks on category filter
2. System displays services only from selected category
3. User can still view full service details
4. System continues with Basic Flow from Step 5

#### Alternative Flow (Search Services):
1. User enters search term in search box
2. System filters services by name or description
3. System displays matching results
4. User can select from filtered results

---

# UC-06: Book Consultation Appointment

| Field | Details |
|-------|---------|
| **Use Case ID** | UC-06 |
| **Use Case Name** | Book Consultation Appointment |
| **Author** | Dental Clinic Team |
| **Purpose** | To allow patients to request consultation appointments with specific dentists and services |
| **Requirement Traceability** | BR-10, BR-54, BR-55, BR-57, BR-58 |
| **Priority** | High |

### Preconditions:
- Patient is logged into system
- Patient has not requested appointment today
- Dentist availability data is current
- Clinic operating hours are configured
- Selected date is at least 7 days in future

### Postconditions:
- Appointment record is created with 'pending' status
- Staff/Owner receives notification of new appointment request
- Patient receives confirmation of appointment request
- Appointment appears in patient's appointment list

### Primary Actor/s:
- Patient

### Secondary Actor/s:
- Owner, Staff (Receptionist, Dentist)

### Include Use Cases:
- UC-05 (View Available Services) - precedes this use case

### Extends Use Cases:
- None

### Flow of Actions:

#### Basic Flow:
1. Patient clicks "Book Appointment" button
2. System displays appointment booking form
3. Patient selects desired service from list
4. System displays available dentists for service
5. Patient selects preferred dentist
6. Patient selects appointment date using calendar
7. System validates date is at least 7 days in future
8. System displays available time slots for selected date/dentist
9. Patient selects available time slot
10. System validates time is within clinic operating hours
11. System validates no double-booking for patient
12. Patient can add notes/special requests (optional)
13. Patient clicks "Request Appointment"
14. System creates appointment with 'pending' status
15. System sends confirmation to patient email
16. System notifies staff/owner of pending appointment
17. Patient receives confirmation message: "Appointment request submitted. Staff will contact you soon."
18. Appointment appears in patient's appointment list

#### Alternative Flow (No Available Slots):
1. Selected date/dentist has no available slots
2. System displays message: "No slots available. Please select different date or dentist."
3. Patient selects alternative date or dentist
4. System continues with Basic Flow from Step 8

#### Alternative Flow (Date Too Soon):
1. Patient selects appointment date less than 7 days away
2. System displays error: "Appointments must be booked at least 7 days in advance"
3. Patient selects future date
4. System continues with Basic Flow from Step 7

#### Alternative Flow (Time Outside Operating Hours):
1. Patient selects time outside clinic operating hours
2. System displays error: "Selected time is outside clinic operating hours. Available: 8:00 AM - 5:00 PM"
3. Patient selects valid time slot
4. System continues with Basic Flow from Step 11

#### Alternative Flow (Multiple Appointments Same Day):
1. Patient already has confirmed appointment on selected date
2. System displays error: "You already have an appointment scheduled on this date"
3. Patient selects different date
4. System continues with Basic Flow from Step 7

---

# UC-07: Reschedule Appointment

| Field | Details |
|-------|---------|
| **Use Case ID** | UC-07 |
| **Use Case Name** | Reschedule Appointment |
| **Author** | Dental Clinic Team |
| **Purpose** | To allow patients to request rescheduling of confirmed appointments and staff to approve/reject requests |
| **Requirement Traceability** | BR-12 |
| **Priority** | High |

### Preconditions:
- Patient is logged in and has confirmed appointment
- Appointment status is 'confirmed'
- New appointment date/time is at least 7 days in future

### Postconditions:
- Reschedule request is created with 'reschedule_requested' status
- Staff/Owner is notified of reschedule request
- Staff approves (changes applied) or rejects (reverts to confirmed)

### Primary Actor/s:
- Patient

### Secondary Actor/s:
- Owner, Staff

### Include Use Cases:
- None

### Extends Use Cases:
- None

### Flow of Actions:

#### Basic Flow (Patient Requests Reschedule):
1. Patient navigates to appointment details
2. Patient clicks "Request Reschedule" button
3. System displays reschedule form with current appointment details
4. Patient selects new date using calendar
5. System displays available time slots
6. Patient selects new time
7. System validates new date/time are available
8. System validates date is at least 7 days in future
9. Patient can add reschedule reason (optional)
10. Patient clicks "Submit Reschedule Request"
11. System updates appointment status to 'reschedule_requested'
12. System stores new requested date/time
13. System notifies staff/owner of reschedule request
14. Patient receives confirmation: "Reschedule request submitted for review"

#### Alternative Flow (Staff Approves Reschedule):
1. Staff/Owner reviews reschedule request
2. Staff clicks "Approve" button
3. System updates appointment with new date/time
4. System changes status back to 'confirmed'
5. System sends confirmation to patient with new appointment time
6. Patient's appointment calendar is updated
7. System logs reschedule action with timestamp

#### Alternative Flow (Staff Rejects Reschedule):
1. Staff/Owner reviews reschedule request
2. Staff clicks "Reject" button
3. System reverts appointment status to 'confirmed'
4. System clears reschedule request data
5. System sends rejection message to patient
6. Appointment remains on original date/time

#### Alternative Flow (New Slot No Longer Available):
1. Between request and approval, another patient books selected slot
2. Staff tries to approve reschedule
3. System displays error: "Selected time slot is no longer available"
4. Staff can select alternative available slot
5. System updates appointment with new slot
6. Staff approves reschedule

---

# UC-08: Cancel Appointment

| Field | Details |
|-------|---------|
| **Use Case ID** | UC-08 |
| **Use Case Name** | Cancel Appointment |
| **Author** | Dental Clinic Team |
| **Purpose** | To allow patients to request appointment cancellation and staff to approve/reject cancellation requests |
| **Requirement Traceability** | BR-13, BR-48, BR-49, BR-50, BR-51, BR-77, BR-78 |
| **Priority** | High |

### Preconditions:
- Patient is logged in and has confirmed appointment
- Appointment status is 'confirmed'
- Patient provides cancellation reason

### Postconditions:
- Cancellation request created with 'cancel_requested' status
- Staff/Owner reviews request
- If approved: Appointment is deleted from database
- If rejected: Appointment reverts to 'confirmed' status

### Primary Actor/s:
- Patient

### Secondary Actor/s:
- Owner, Staff

### Include Use Cases:
- None

### Extends Use Cases:
- None

### Flow of Actions:

#### Basic Flow (Patient Requests Cancellation):
1. Patient navigates to appointment details
2. Patient clicks "Request Cancellation" button
3. System displays cancellation confirmation dialog
4. System shows appointment details and date
5. Patient enters cancellation reason in text field
6. System displays 24-hour cancellation policy notice
7. Patient clicks "Confirm Cancellation"
8. System updates appointment status to 'cancel_requested'
9. System stores cancellation reason and timestamp
10. System notifies staff/owner of cancellation request
11. Patient receives confirmation: "Cancellation request submitted"
12. Patient sees message about cancellation policy

#### Alternative Flow (Staff Approves Cancellation):
1. Staff/Owner reviews cancellation request
2. Staff clicks "Approve Cancellation" button
3. System permanently deletes appointment from database
4. System sends cancellation confirmation to patient
5. Patient's calendar is updated
6. Appointment time slot becomes available for other patients
7. System logs cancellation with staff name and timestamp

#### Alternative Flow (Staff Rejects Cancellation):
1. Staff/Owner reviews cancellation request
2. Staff clicks "Reject Cancellation" button
3. System clears cancellation request data
4. System reverts appointment status to 'confirmed'
5. System sends rejection message to patient
6. Patient receives notification appointment is confirmed
7. Appointment remains on patient's calendar

#### Alternative Flow (Late Cancellation Fee - Future):
1. Cancellation requested within 24 hours of appointment
2. System calculates late cancellation fee (when implemented)
3. System displays fee amount to patient
4. Patient can proceed with cancellation or keep appointment
5. System logs fee calculation
6. System continues with Basic Flow

---

# UC-09: View Appointment History

| Field | Details |
|-------|---------|
| **Use Case ID** | UC-09 |
| **Use Case Name** | View Appointment History |
| **Author** | Dental Clinic Team |
| **Purpose** | To allow users to view past and upcoming appointment records with complete details |
| **Requirement Traceability** | BR-21 |
| **Priority** | Medium |

### Preconditions:
- User is logged into system
- User has at least one appointment record (past or upcoming)

### Postconditions:
- Appointment history is displayed with all relevant information
- User can filter and sort appointments
- User can view detailed appointment information

### Primary Actor/s:
- Patient, Owner, Staff

### Secondary Actor/s:
- None

### Include Use Cases:
- None

### Extends Use Cases:
- None

### Flow of Actions:

#### Basic Flow:
1. User navigates to Appointments page
2. System displays appointments in two tabs:
   - Upcoming Appointments
   - Past Appointments
3. System displays each appointment with:
   - Date and time
   - Service name
   - Dentist name
   - Appointment status
   - Location/Clinic
4. User can click on appointment to view full details:
   - Patient name
   - Service details
   - Dentist assigned
   - Appointment notes
   - Status history
5. User can sort appointments by date, service, or status
6. User can view appointment details in full screen

#### Alternative Flow (Filter Appointments):
1. User clicks filter button
2. System displays filter options:
   - By status (confirmed, completed, pending, cancelled)
   - By service type
   - By date range
   - By dentist
3. User selects filter criteria
4. System displays only matching appointments
5. User can clear filters to show all appointments

#### Alternative Flow (Search Appointments):
1. User enters search term
2. System searches by service name, dentist, or date
3. System displays matching results
4. User can view detailed information from results

#### Alternative Flow (Owner/Staff View):
1. Owner/Staff has additional view of all patient appointments
2. System displays all appointments across all patients
3. Staff can filter by patient, dentist, date range
4. Staff can view appointment history with all details

---

# UC-10: Create Dental Record

| Field | Details |
|-------|---------|
| **Use Case ID** | UC-10 |
| **Use Case Name** | Create Dental Record |
| **Author** | Dental Clinic Team |
| **Purpose** | To allow dentists to create clinical records documenting patient examination and treatment |
| **Requirement Traceability** | BR-22 |
| **Priority** | High |

### Preconditions:
- Dentist is logged into system
- Patient has completed consultation appointment
- Appointment status is 'completed'
- Dentist has access to patient record

### Postconditions:
- Dental record is created and saved in database
- Record is associated with patient and appointment
- Record is accessible to authorized staff/owner
- Patient can view their dental record

### Primary Actor/s:
- Dentist

### Secondary Actor/s:
- Owner, Staff

### Include Use Cases:
- None

### Extends Use Cases:
- None

### Flow of Actions:

#### Basic Flow:
1. Dentist navigates to patient's record after appointment
2. Dentist clicks "Create Dental Record" button
3. System displays dental record creation form
4. Dentist enters the following information:
   - Date of examination
   - Treatment details (procedures performed)
   - Diagnosis findings
   - Tooth conditions (if using tooth chart)
   - Recommendations for follow-up
   - Prescribed medications (if any)
   - Notes and observations
5. Dentist can attach documents:
   - X-rays
   - Images
   - Lab reports
6. Dentist clicks "Save Record"
7. System validates required fields are complete
8. System saves record to database with timestamp
9. System associates record with patient appointment
10. System displays success: "Dental record created successfully"
11. Record becomes visible in patient's medical records

#### Alternative Flow (Add Tooth Chart):
1. Dentist clicks "Add Tooth Chart" during record creation
2. System opens tooth chart editor with visual representation
3. Dentist marks tooth conditions:
   - Cavities
   - Fillings
   - Extractions
   - Root canals
   - Other conditions
4. System saves tooth chart data in JSON format
5. System continues with Basic Flow from Step 8

#### Alternative Flow (Attach X-ray):
1. Dentist clicks "Attach Document" button
2. System opens file upload dialog
3. Dentist selects X-ray image file
4. System validates file format and size
5. System stores file with record metadata
6. Dentist continues record creation
7. System continues with Basic Flow from Step 7

---

# UC-11: View Patient Medical Records

| Field | Details |
|-------|---------|
| **Use Case ID** | UC-11 |
| **Use Case Name** | View Patient Medical Records |
| **Author** | Dental Clinic Team |
| **Purpose** | To allow authorized staff/owner and patients to view comprehensive medical records including dental records, tooth charts, and documents |
| **Requirement Traceability** | BR-23, BR-25, BR-32 |
| **Priority** | High |

### Preconditions:
- User is logged into system
- Patient record exists in database
- User has permission to view (staff, owner, or own patient)

### Postconditions:
- Medical records are displayed with all available information
- Records are organized and easily accessible
- User can view related documents and images

### Primary Actor/s:
- Owner, Staff, Patient

### Secondary Actor/s:
- None

### Include Use Cases:
- None

### Extends Use Cases:
- None

### Flow of Actions:

#### Basic Flow:
1. User navigates to patient's medical records
2. System displays patient summary:
   - Patient name
   - Date of birth
   - Contact information
   - Insurance information (if available)
   - Active/Inactive status
3. System displays records organized into sections:
   - **Dental Records** - clinical examination and treatment history
   - **Tooth Charts** - visual tooth condition tracking
   - **Medical Documents** - uploaded files (X-rays, scans, reports)
   - **Teeth Images** - clinical photographs
   - **Treatment Plans** - planned and ongoing treatments
4. User can expand each section to view details
5. System displays records in chronological order (newest first)
6. User can view full details of each record

#### Alternative Flow (View Dental Record Details):
1. User clicks on dental record
2. System displays complete record details:
   - Date of examination
   - Diagnosis findings
   - Treatment details
   - Dentist name
   - Associated appointment
   - Recommendations
3. User can view attached documents
4. User can return to record list or edit (if authorized)

#### Alternative Flow (View Tooth Chart):
1. User clicks on tooth chart
2. System displays visual tooth chart representation
3. System shows color-coded tooth conditions
4. User can zoom in/out for better visibility
5. User can view condition details by clicking on tooth
6. User can see tooth chart history (previous charts)

#### Alternative Flow (Download Records):
1. User clicks "Download" button (if available)
2. System generates PDF document with records
3. System sends file to user's browser
4. User saves PDF to local device

---

# UC-12: Upload Medical Document

| Field | Details |
|-------|---------|
| **Use Case ID** | UC-12 |
| **Use Case Name** | Upload Medical Document |
| **Author** | Dental Clinic Team |
| **Purpose** | To allow staff/owner to upload and organize medical documents (X-rays, scans, reports) for patients |
| **Requirement Traceability** | BR-30, BR-32 |
| **Priority** | High |

### Preconditions:
- User (Staff/Owner) is logged into system
- Patient record exists in system
- Document file is available to upload
- File is in supported format (PDF, JPG, PNG, etc.)

### Postconditions:
- Document is uploaded and stored in system
- Document is associated with patient record
- Document metadata is saved (type, title, date, uploader)
- Document is accessible to authorized users

### Primary Actor/s:
- Owner, Staff

### Secondary Actor/s:
- Patient (can view)

### Include Use Cases:
- None

### Extends Use Cases:
- None

### Flow of Actions:

#### Basic Flow:
1. Staff/Owner navigates to patient's medical records
2. Staff/Owner clicks "Upload Document" button
3. System displays upload form
4. Staff/Owner selects document type from dropdown:
   - X-ray
   - Scan
   - Report
   - Other
5. Staff/Owner enters document details:
   - Document title
   - Description
   - Date taken/created
6. Staff/Owner selects file from computer
7. System validates file:
   - File format is supported
   - File size is within limits
8. Staff/Owner clicks "Upload"
9. System stores file to media storage
10. System creates document record in database
11. System records uploader name and timestamp
12. System displays success: "Document uploaded successfully"
13. Document appears in patient's document history
14. Document is accessible in patient's medical records

#### Alternative Flow (Multiple Document Upload):
1. Staff/Owner can select multiple files at once
2. System displays progress bar for uploads
3. System processes each file sequentially
4. System displays confirmation for each uploaded file
5. System creates separate record for each document

#### Alternative Flow (Invalid File Format):
1. User selects file with unsupported format
2. System displays error: "File format not supported. Please use JPG, PNG, or PDF"
3. User selects correct file format
4. System continues with Basic Flow from Step 8

#### Alternative Flow (File Size Exceeded):
1. User selects file larger than allowed size (max 20MB)
2. System displays error: "File size exceeds maximum limit of 20MB"
3. User selects smaller file or compresses image
4. System continues with Basic Flow from Step 8

---

# UC-13: Manage Inventory Items

| Field | Details |
|-------|---------|
| **Use Case ID** | UC-13 |
| **Use Case Name** | Manage Inventory Items |
| **Author** | Dental Clinic Team |
| **Purpose** | To allow owner to view, add, update, and delete inventory items with automatic low-stock alerts |
| **Requirement Traceability** | BR-34, BR-35, BR-36, BR-37, BR-38, BR-65 |
| **Priority** | High |

### Preconditions:
- Owner is logged into system
- Owner has access to inventory management page

### Postconditions:
- Inventory records are updated in database
- Low-stock items are automatically flagged
- Owner receives notifications for critical stock levels

### Primary Actor/s:
- Owner

### Secondary Actor/s:
- None

### Include Use Cases:
- None

### Extends Use Cases:
- None

### Flow of Actions:

#### Basic Flow (View Inventory):
1. Owner navigates to Inventory Management page
2. System displays inventory table with columns:
   - Item name
   - Category
   - Current quantity
   - Minimum stock level
   - Supplier name
   - Unit cost
   - Total value
   - Status (In Stock/Low Stock)
3. System highlights low-stock items in red
4. Owner can sort by any column
5. Owner can filter by category or status
6. System calculates total inventory value

#### Alternative Flow (Add New Inventory Item):
1. Owner clicks "Add New Item" button
2. System displays inventory form
3. Owner enters:
   - Item name
   - Category (equipment, supplies, materials, consumables)
   - Initial quantity
   - Minimum stock level threshold
   - Supplier name
   - Unit cost
4. Owner clicks "Save Item"
5. System validates required fields
6. System creates item record in database
7. System displays success message
8. New item appears in inventory list

#### Alternative Flow (Update Inventory Item):
1. Owner clicks on item to edit
2. System displays item details form
3. Owner can modify:
   - Item quantity (when stock received/used)
   - Minimum stock level
   - Supplier information
   - Unit cost
4. Owner clicks "Update Item"
5. System validates data
6. System updates item in database
7. System automatically checks if item is now low stock
8. If low stock, system flags item and could send alert
9. Owner receives success confirmation

#### Alternative Flow (Delete Inventory Item):
1. Owner clicks "Delete" button on item
2. System displays confirmation dialog
3. Owner confirms deletion
4. System removes item from database
5. System removes all related inventory records
6. System displays success message

#### Alternative Flow (Low Stock Alert):
1. Owner updates item quantity
2. System checks quantity against minimum stock level
3. If quantity ≤ minimum level:
   - System marks item as low stock
   - System displays alert to owner
   - System could trigger notification (when email implemented)
4. Owner can reorder from supplier

---

# UC-14: Create Billing Statement

| Field | Details |
|-------|---------|
| **Use Case ID** | UC-14 |
| **Use Case Name** | Create Billing Statement |
| **Author** | Dental Clinic Team |
| **Purpose** | To allow staff/owner to generate billing statements for patient services |
| **Requirement Traceability** | BR-39, BR-40, BR-67 |
| **Priority** | High |

### Preconditions:
- Staff/Owner is logged into system
- Patient record exists in system
- Appointment/service has been completed
- Cost information is available

### Postconditions:
- Billing record is created in database with 'pending' status
- Patient can view billing statement
- Billing appears in payment tracking reports
- SOA file can be optionally attached

### Primary Actor/s:
- Owner, Staff

### Secondary Actor/s:
- Patient (can view)

### Include Use Cases:
- None

### Extends Use Cases:
- None

### Flow of Actions:

#### Basic Flow:
1. Staff/Owner navigates to Billing Management page
2. Staff/Owner clicks "Create Billing Record" button
3. System displays billing form
4. Staff/Owner selects patient from list
5. Staff/Owner can select associated appointment
6. System auto-populates service information if appointment selected
7. Staff/Owner enters billing details:
   - Service description
   - Amount charged
   - Bill date
   - Due date
8. Staff/Owner adds notes if needed
9. Staff/Owner sets billing status: 'pending' (default)
10. Staff/Owner can optionally upload SOA PDF file
11. Staff/Owner clicks "Create Bill"
12. System validates all required fields
13. System creates billing record in database
14. System marks as 'pending' status
15. System records creation timestamp and staff name
16. System displays success: "Billing statement created"
17. Billing statement is visible to patient in their billing page

#### Alternative Flow (Batch Billing):
1. Staff/Owner selects multiple patients
2. Staff/Owner selects common service
3. Staff/Owner enters amount
4. Staff/Owner clicks "Create Bills for Selected"
5. System creates separate billing record for each patient
6. System displays confirmation with count of bills created

#### Alternative Flow (Upload SOA Document):
1. During bill creation, staff clicks "Upload SOA"
2. System opens file upload dialog
3. Staff selects PDF file (Statement of Account)
4. System validates file is PDF format
5. System stores file with billing record
6. File is linked to billing statement

#### Alternative Flow (Bill from Appointment):
1. Staff navigates to appointment record
2. Staff clicks "Generate Bill" button
3. System pre-fills form with appointment details
4. System auto-calculates amount based on service
5. Staff reviews and clicks "Create Bill"
6. System continues with Basic Flow from Step 13

---

# UC-15: Update Payment Status

| Field | Details |
|-------|---------|
| **Use Case ID** | UC-15 |
| **Use Case Name** | Update Payment Status |
| **Author** | Dental Clinic Team |
| **Purpose** | To allow staff/owner to update payment status and track outstanding bills |
| **Requirement Traceability** | BR-41, BR-42, BR-45, BR-47 |
| **Priority** | High |

### Preconditions:
- Staff/Owner is logged into system
- Billing record exists in system
- Billing status is 'pending' or 'paid'

### Postconditions:
- Payment status is updated in database
- System synchronizes 'paid' boolean field with status
- Patient's billing history is updated
- Owner analytics reflect payment changes

### Primary Actor/s:
- Owner, Staff

### Secondary Actor/s:
- None

### Include Use Cases:
- None

### Extends Use Cases:
- None

### Flow of Actions:

#### Basic Flow (Mark as Paid):
1. Staff/Owner navigates to Billing Management page
2. Staff/Owner views list of all billing records
3. Staff/Owner clicks on 'pending' bill to update
4. System displays billing details
5. Staff/Owner clicks "Mark as Paid" or changes status dropdown to "Paid"
6. System can request payment method information (optional):
   - Cash
   - Check
   - Credit Card
   - Bank Transfer
7. Staff/Owner can add payment date
8. Staff/Owner can add notes (e.g., payment reference number)
9. Staff/Owner clicks "Confirm Payment"
10. System updates billing status to 'paid'
11. System sets 'paid' boolean field to true
12. System records payment timestamp
13. System records staff name who processed payment
14. System updates patient's billing summary
15. System displays success: "Payment recorded successfully"
16. Billing record now shows paid status
17. Owner analytics dashboard reflects payment (increased revenue)

#### Alternative Flow (Cancel Billing):
1. Staff/Owner clicks on billing record
2. Staff/Owner clicks "Cancel Bill" or changes status to "Cancelled"
3. System displays confirmation dialog with reason
4. Staff/Owner enters reason for cancellation
5. Staff/Owner clicks "Confirm Cancellation"
6. System updates status to 'cancelled'
7. System sets 'paid' to false
8. System removes from outstanding payments
9. Billing no longer counts toward revenue

#### Alternative Flow (Track Outstanding Payments):
1. Owner navigates to Billing Dashboard
2. Owner clicks "Outstanding Payments" filter
3. System displays all bills with status = 'pending'
4. System shows:
   - Patient name
   - Amount owed
   - Due date
   - Days overdue (if past due)
5. System sorts by due date (oldest first)
6. Owner can click on bill to view details
7. Owner can generate payment reminders for overdue bills

#### Alternative Flow (Payment Analytics):
1. System automatically updates owner analytics:
   - Total revenue (sum of all 'paid' bills)
   - Outstanding amount (sum of 'pending' bills)
   - Total collected this month
   - Payment collection rate
2. Analytics update immediately when payment status changes

---

# UC-16: Create Staff Account

| Field | Details |
|-------|---------|
| **Use Case ID** | UC-16 |
| **Use Case Name** | Create Staff Account |
| **Author** | Dental Clinic Team |
| **Purpose** | To allow owner to create and manage staff accounts with role-based access |
| **Requirement Traceability** | BR-43, BR-44, BR-45, BR-76 |
| **Priority** | High |

### Preconditions:
- Owner is logged into system
- Owner has access to staff management page
- Required staff information is available

### Postconditions:
- Staff account is created in database
- Staff can login with username and password
- Staff has appropriate role-based permissions
- Staff appears in system with assigned role

### Primary Actor/s:
- Owner

### Secondary Actor/s:
- None

### Include Use Cases:
- None

### Extends Use Cases:
- None

### Flow of Actions:

#### Basic Flow (Create New Staff Account):
1. Owner navigates to Staff Management page
2. Owner clicks "Add New Staff" button
3. System displays staff creation form
4. Owner enters required information:
   - First name
   - Last name
   - Username
   - Password
   - Role (Dentist or Receptionist)
   - Phone number
   - Home address
   - Birthday
   - Age
   - Gender
   - Profile picture (optional)
5. System auto-generates email: username@dorotheo.com
6. Owner reviews all information
7. Owner clicks "Create Account"
8. System validates all required fields
9. System checks username is unique
10. System validates password strength (8+ chars, mixed case, numbers, special chars)
11. System creates staff account in database
12. System assigns role (Dentist or Receptionist)
13. System sets account status to 'active'
14. System displays success: "Staff account created successfully"
15. Staff can now login with username and auto-generated email domain

#### Alternative Flow (View Staff Details):
1. Owner navigates to staff list
2. System displays all staff members with:
   - Name
   - Role
   - Email
   - Phone
   - Status (Active/Inactive)
3. Owner can click on staff member to view full details:
   - All personal information
   - Role assignments
   - Account creation date
   - Last login time
   - Appointment history (for Dentists)

#### Alternative Flow (Update Staff Information):
1. Owner clicks "Edit" on staff member
2. System displays staff information form
3. Owner can modify any field:
   - Personal information
   - Phone number
   - Address
   - Profile picture
   - Role (Dentist ↔ Receptionist)
4. Owner clicks "Update Staff"
5. System validates changes
6. System updates staff record in database
7. System displays success confirmation
8. Changes take effect immediately for next login

#### Alternative Flow (Deactivate Staff Account):
1. Owner clicks on staff member
2. Owner clicks "Deactivate Account" button
3. System displays confirmation dialog
4. Owner confirms deactivation
5. System marks account status as 'inactive'
6. Staff cannot login anymore
7. System logs deactivation with timestamp
8. Owner can reactivate later if needed

---

# UC-17: View Owner Analytics Dashboard

| Field | Details |
|-------|---------|
| **Use Case ID** | UC-17 |
| **Use Case Name** | View Owner Analytics Dashboard |
| **Author** | Dental Clinic Team |
| **Purpose** | To provide owner with real-time business analytics and performance metrics |
| **Requirement Traceability** | BR-46, BR-47, BR-50 |
| **Priority** | Medium |

### Preconditions:
- Owner is logged into system
- System has transaction and patient data
- Dashboard service is operational

### Postconditions:
- Analytics data is displayed and updated
- Owner can view metrics and trends
- Owner can make informed business decisions

### Primary Actor/s:
- Owner

### Secondary Actor/s:
- None

### Include Use Cases:
- None

### Extends Use Cases:
- None

### Flow of Actions:

#### Basic Flow:
1. Owner logs into system and navigates to Dashboard
2. System displays analytics dashboard with multiple sections:

**Financial Metrics:**
   - Total Revenue (sum of all paid bills)
   - Total Expenses (sum of inventory costs)
   - Net Profit (revenue - expenses)
   - Outstanding Amount (pending bills)
   - Collection Rate (paid / total bills)

**Patient Metrics:**
   - Total Patients
   - Active Patients (appointment in last 2 years)
   - Inactive Patients
   - New Patients This Month
   - Patient Growth Trend

**Appointment Metrics:**
   - Total Appointments (all-time)
   - Appointments This Month
   - Upcoming Appointments
   - Completed Appointments
   - Appointment Status Breakdown (pending, confirmed, completed, cancelled)

**Inventory Metrics:**
   - Total Inventory Value
   - Items in Stock
   - Low Stock Items Count
   - Critical Stock Items

3. All metrics display with visual elements:
   - Charts and graphs
   - Trend indicators (up/down arrows)
   - Percentage changes
4. Data refreshes in real-time as transactions occur
5. Owner can see historical data and trends

#### Alternative Flow (Filter by Date Range):
1. Owner clicks "Date Range" filter
2. System displays date selector
3. Owner selects custom date range
4. System recalculates all metrics for selected period
5. System updates dashboard with new data
6. Owner can compare different time periods

#### Alternative Flow (Drill Down into Metrics):
1. Owner clicks on any metric card
2. System displays detailed view:
   - Revenue by service type
   - Top services by revenue
   - Revenue by month (chart)
   - Patients by status
   - Appointments by dentist
   - Inventory usage
3. Owner can export data or generate report

#### Alternative Flow (View Alerts and Notifications):
1. System displays alerts section on dashboard:
   - Low stock items needing reorder
   - Overdue patient payments
   - Pending appointments needing approval
   - High no-show rates
2. Owner can click on alert to take action
3. System links directly to related records

---

## Use Case Relationship Diagram

```
[UC-02: Login] ←──────────────────→ [UC-03: Reset Password]
       ↓
[UC-04: Update Personal Info]

[UC-05: View Services] → [UC-06: Book Appointment] → [UC-07: Reschedule] ↔ [UC-08: Cancel]
                              ↓
                         [UC-09: View History]
                              ↓
                         [UC-10: Create Dental Record]
                              ↓
                         [UC-11: View Medical Records]
                              ↓
                         [UC-12: Upload Documents]

[UC-14: Create Billing] → [UC-15: Update Payment Status]
                              ↓
                         [UC-17: View Analytics]

[UC-16: Create Staff Account] → [Manage All System Features]

[UC-13: Manage Inventory] → [UC-17: Analytics Dashboard]
```

---

## Summary Statistics

| Metric | Value |
|--------|-------|
| **Total Use Cases** | 17 |
| **High Priority** | 12 |
| **Medium Priority** | 5 |
| **Primary Actors** | 4 (Owner, Staff, Patient, Dentist) |
| **Total Alternative Flows** | 38 |
| **Total Basic Flows** | 17 |

---

**Document Status:** ✅ Complete  
**Last Updated:** February 6, 2026  
**Version:** 1.0  
**Prepared By:** System Documentation Team
