UC-01: Register
Author: Gabriel Villanueva Priority: High

Purpose
To allow new patients to create a self-service account or for an Owner to create a new staff (Dentist, Receptionist) account in the system.

Actors
Patient

Owner

Requirement Traceability
BR-01: New patients must be able to register for an account.

BR-48: The Owner can add new dentists, receptionists, and patient accounts into the system.

Preconditions
A Patient is accessing the system's public registration page.

OR: An Owner is logged into the system and has navigated to the staff management section.

Postconditions
A new Patient or Staff account is created and stored in the "User Accounts" data store.

The Patient or Owner receives a confirmation message.

Basic Flow
The [Patient] navigates to the registration page OR the [Owner] navigates to the "Add New Staff" section.

The system displays the appropriate registration form.

The user enters "New Patient Details" or "New Staff Details".

The user submits the form.

The system receives the details and writes the new account record to the (User Accounts) data store.

UC-02: Login
Author: Gabriel Villanueva Priority: High

Purpose
To allow registered users (Patient, Owner, Dentist, Receptionist) to securely access the system using their credentials.

Actors
Owner

Dentist

Receptionist

Patient

Requirement Traceability
BR-02: All users (Owner, Patient, Dentist, Receptionist) must be able to log in to the system.

Preconditions
The user is accessing the clinic system's login page.

The user has an existing account in the "User Accounts" data store.

Postconditions
On Success: The user is authenticated, a session is created, and the system grants them access based on their role.

On Failure: The user remains unauthenticated and is notified of the login failure.

Basic Flow
The user navigates to the login page.

The system displays the login form.

The user submits their "Login Credentials" (username and password).

The system queries the (User Accounts) data store to find a matching record.

If credentials are valid, the system grants access.

Alternative Flow (Login Failure)
7a1: The system validates credentials and finds they are "If Invalid".

7a2: The system sends a "Login Status (Failed)" message.

7a3: The user is shown an error message (e.g., "Invalid username or password.").

UC-03: Manage Staff Roles
Author: Michael Orenze Priority: High

Purpose
To allow the Owner to view, update, and delete the list of staff accounts (Dentists, Receptionists) and their details in the system.

Actors
Owner

Requirement Traceability
BR-49: The Owner can view staff and patient accounts details and list of all accounts.

BR-50: The Owner can edit or update existing dentists, receptionist, and patient account information.

BR-51: The Owner can delete dentist and receptionist accounts when necessary.

Preconditions
The Owner is logged into the system and has administrative privileges.

Postconditions
The "User Accounts" data store is updated with any changes (edits, deletions) submitted by the Owner.

The Owner has viewed the most current list of staff.

Basic Flow
The Owner navigates to the staff management section and requests to "View Staff List."

The system retrieves the staff list from the (User Accounts) data store and displays it.

The Owner reviews the list and makes necessary changes (e.g., updates a role, deactivates an account).

The Owner submits the updated staff list.

The system receives the update and writes the changes to the (User Accounts) data store.

The Owner receives confirmation that the list was updated.

UC-04: Appointment Creation
Author: Michael Orenze Priority: Medium

Purpose
To allow a user (Patient, Owner, Dentist, or Receptionist) to request and create a new appointment by selecting an available time slot.

Actors
Users (Patient, Owner, Dentist, Receptionist)

Requirement Traceability
BR-06: Patients must be able to request to schedule an appointment.

BR-09: The Owner, Dentist, and Receptionist must be able to create an appointment schedule.

BR-16: The system must check all chosen appointment slots to ensure they don’t conflict.

BR-23: The system must send a notification... when a patient requests an appointment.

Preconditions
The user is logged into the system.

The user has navigated to the "Book Appointment" or "Manage Schedule" section.

Postconditions
A new appointment record is created and stored in the (Appointments) data store.

The user receives a confirmation or acknowledgment message.

Basic Flow
The user submits a "New Appointment Request" (e.g., selects a service, dentist, or date).

The system queries the (Appointments) data store for availability.

The system displays the available time slots to the user.

The user reviews the options and selects a slot.

The user confirms the new appointment information.

The system writes the new appointment data to the (Appointments) data store.

The system sends an "Appointment Confirmation/Acknowledgment" to the user.

UC-05: Schedule Retrieval
Author: Airo Ravinera Priority: High

Purpose
To allow users (including the AI Agent) to query and view the clinic's appointment schedules or find available slots.

Actors
User (Owner, Receptionist, Dentist)

AI Agent

Requirement Traceability
BR-08: All users (Owner, Patient, Dentist, Receptionist) must be able to view clinic appointment schedules.

BR-10: All users must be able to view the appointment schedule.

BR-17: Patients must be able to view their appointment history and upcoming appointments.

BR-24: Dentists should be able to view their individual schedules.

BR-54: ...system must ensure that the AI Agent validates appointment requests against dentist availability.

Preconditions
A user (Patient, Owner, Dentist, Receptionist) is logged into the system.

OR: The AI Agent has been activated to perform a schedule-related query.

Postconditions
The requested schedule information (full view or available slots) is displayed to the user or provided to the AI Agent.

Basic Flow
The user or AI Agent submits a "View/Available Slot Request."

The system receives the request.

The system sends a "Schedule Query" to the (Appointments) data store.

The system receives the schedule data.

The system sends the "Full Schedule View / Available Slot Info" back to the actor.

UC-06: Confirm Appointments
Author: Airo Ravinera Priority: Medium

Purpose
To allow a user (Patient, Receptionist, Dentist, or Owner) to formally confirm an existing or requested appointment, updating its status. This is particularly relevant for the Receptionist confirming patient-requested slots.

Actors
User (Patient, Receptionist, Dentist, Owner)

Requirement Traceability
BR-15: The Receptionist must confirm all consultation appointments before finalizing bookings.

Preconditions
The user is logged in.

An appointment exists in the system that is pending confirmation.

Postconditions
The appointment's status is updated to "Confirmed" in the (Appointments) data store.

A notification of the confirmation is sent.

Basic Flow
The user selects an appointment and submits an "Appointment Confirmation."

The system receives the confirmation.

The system locates the appointment record in the (Appointments) data store.

The system updates the record's status to "Confirmed."

The system sends an "Appointment Notification/Confirmation" to relevant parties.

UC-07: Update Appointments
Author: Ezekiel Galauran Priority: High

Purpose
To allow a Patient (or the AI Agent on their behalf) to submit a request to modify an existing appointment. This request must then be manually approved or denied by staff (Receptionist, Dentist, or Owner).

Actors
Users (Owner, Dentist, Receptionist, Patient, AI Agent)

Requirement Traceability
BR-07: Patients must be able to request to update an appointment.

BR-12: The Owner, Dentist, and Receptionist must be able to reschedule appointments.

BR-13: Patients must be able to request appointment rescheduling through the built-in AI-Agent.

BR-53: The system must allow the AI Agent to assist patients in... rescheduling... appointments.

Preconditions
The Patient has an existing appointment.

The Patient is logged in or is interacting with the AI Agent.

The Staff (Receptionist, Dentist, or Owner) is logged in to review requests.

Postconditions
On Success (Approval): The appointment details are updated in the (Appointments) data store.

On Failure (Denial): The original appointment remains unchanged.

Basic Flow (Approval)
The Patient (or AI) submits a "Modification Request."

The system forwards the request to staff for manual confirmation.

The Staff reviews the request and decides to "Approve Request."

The Staff submits the "Approve" decision.

The system updates the appointment data in the (Appointments) data store.

The system sends a "Modification Acknowledgment (Success)" to the Patient.

Alternative Flow (Denial)
5a1: The Staff reviews the request and decides to "Approve Request" (No).

5a2: The Staff submits the "Deny" decision.

5a3: The system sends a "Modification Acknowledgment (Failed! Reschedule Again)" to the Patient.

UC-08: Billing Data Transfer
Author: Michael Orenze Priority: Medium

Purpose
To allow an Owner to initiate the billing process by retrieving completed appointment details and transferring them to the "4.1 Invoice Generation" subsystem.

Actors
Owner

Requirement Traceability
BR-41: The Owner and the Receptionist must be able to record new charges for dental services provided.

BR-45: The system must allow generation of invoices for services.

BR-47: Owners must be able to view operational and financial reports and analytics.

Preconditions
The Owner is logged into the system.

A patient has completed an appointment that is now ready for billing.

Postconditions
The relevant appointment details are successfully sent to the "4.1 Invoice Generation" process.

The Owner and relevant Staff receive a billing report.

Basic Flow
The Owner selects a completed appointment and submits a "Generate Billing Request."

The system retrieves the appointment details from the (Appointments) data store.

The system sends these "Appointment Details" to the (4.1 Invoice Generation) process.

The system sends a "Billing Report" to the Owner and Staff.