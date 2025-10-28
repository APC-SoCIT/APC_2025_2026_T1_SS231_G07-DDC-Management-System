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

UC-09: Record Creation
Author: Michael Orenze Priority: High

Purpose
To allow authorized staff (Owner, Dentist, or Receptionist) to create and submit a new dental record for a patient.

Actors
User (Owner, Dentist, Receptionist)

Requirement Traceability
BR-26: The Owner, Dentist, and Receptionist must be able to create patient records.

BR-18: The Dentist must assign treatments to a patient’s record only after a consultation has been completed.

Preconditions
The user (Owner, Dentist, or Receptionist) is logged into the system.

The user has selected a patient and navigated to the "Add New Record" section.

Postconditions
A new dental record is successfully saved in the (Patient Records) data store.

The user receives an acknowledgment of the successful creation.

Basic Flow
The staff user fills out the required information in the new dental record form.

The user submits the "New Dental Record."

The system receives the data and writes it to the (Patient Records) data store.

The system sends a "Record Acknowledgment" to the user.

UC-10: Record Modification
Author: Ezekiel Galauran Priority: High

Purpose
To allow authorized staff (Owner, Dentist, or Receptionist) to update an existing patient's dental record with new information.

Actors
User (Owner, Dentist, Receptionist)

Requirement Traceability
BR-28: The Owner, Dentist, and Receptionist must be able to update patient records.

BR-31: The system should record all updates to patient records, showing who made them and when.

Preconditions
The user (Owner, Dentist, or Receptionist) is logged into the system.

The user has successfully retrieved and is currently viewing the specific patient record they intend to modify.

Postconditions
The patient's record is updated in the (Patient Records) data store.

The user receives an acknowledgment that the modification was successful.

Basic Flow
The staff user makes the necessary changes to the patient record data.

The user submits the "Updated Record Data."

The system receives the update and writes the changes to the (Patient Records) data store.

The system sends a "Modification Acknowledgment" to the user.

UC-11: Staff Record Retrieval
Author: Airo Ravinera Priority: High

Purpose
To allow authorized staff (Owner, Dentist, or Receptionist) to query and retrieve a list of patient records or a specific patient's full record from the system.

Actors
User (Owner, Dentist, Receptionist)

Requirement Traceability
BR-25: Owner, Dentist, and Receptionist must be able to view a patient's medical records and tooth chart.

BR-27: All users must be able to view patient records.

Preconditions
The user (Owner, Dentist, or Receptionist) is logged into the system.

The user has the necessary permissions to access patient records.

Postconditions
The system displays the requested patient record data (as a list or a full view) to the user.

Basic Flow
The staff user submits a "View Record Request" (e.g., by searching for a patient or selecting "View All").

The system receives the request.

The system queries the (Patient Records) data store.

The system receives the record data.

The system displays the "Record/Patient List View" to the user.

UC-12: Patient Record Viewing
Author: Michael Orenze Priority: High

Purpose
To allow authorized staff (Owner, Dentist, or Receptionist) to retrieve and view a specific patient's record.

Actors
User (Owner, Dentist, Receptionist)

Requirement Traceability
BR-25: Owner, Dentist, and Receptionist must be able to view a patient's medical records and tooth chart.

BR-27: All users must be able to view patient records.

Preconditions
The user (Owner, Dentist, or Receptionist) is logged into the system.

The user has selected a specific patient to view.

Postconditions
The system displays the specific patient's record view to the user.

Basic Flow
The staff user submits a "View Record Request" for a specific patient.

The system receives the request.

The system queries the (Patient Records) data store for that specific record.

The system receives the specific patient record.

The system displays the "Patient Record View" to the user.

UC-13: Record Exportation
Author: Ezekiel Galauran Priority: High

Purpose
To allow a Patient to request and securely download a file (PDF) containing their personal records from the system.

Actors
Patient

Requirement Traceability
BR-30: Patients must be able to download their personal records.

Preconditions
The Patient is logged into their account.

The Patient has navigated to the section where their records are viewable.

Postconditions
The Patient successfully receives a downloadable file (PDF) of their record.

No data is altered in the (Patient Records) data store.

Basic Flow
The Patient submits a "Download Record Request."

The system receives the request.

The system queries the (Patient Records) data store for the patient's record.

The system generates a file (PDF) from the record data.

The system sends the "Downloadable Record File," initiating the download for the patient.

UC-14: Invoice Generation
Author: Airo Ravinera Priority: High

Purpose
To generate a new invoice based on completed appointment details and send it directly to the patient.

Actors
Owner

Requirement Traceability
BR-45: The system must allow generation of invoices for services.

BR-46: The system must generate a unique invoice number for each transaction.

BR-32: Patients must be able to view and download their invoice.

Preconditions
The Owner is logged into the system.

A patient has a completed appointment with services that are ready to be billed.

Postconditions
A new invoice is generated and stored in the (Billing & Invoices) data store.

The Patient receives the new invoice.

Basic Flow
The Owner submits a "Generate Invoice Request" for a specific appointment.

The system queries the (Appointments) data store for the appointment details (services, charges).

The system generates a new invoice (with a unique ID) and sends it to the Patient.

(Implicit: The system saves this invoice to the Billing & Invoices data store).

UC-15: Payment Application
Author: Michael Orenze Priority: High

Purpose
To allow a Receptionist (or Owner/Dentist) to receive and apply a patient's payment information to an existing invoice, update the billing record, and issue a receipt.

Actors
Owner, Dentist, Receptionist

Requirement Traceability
BR-43: The Owner and Receptionist must be able to accept and post payments (bank transfer, e-wallet, or insurance).

BR-44: The Owner and Receptionist must be able to clear balances once payments are fully settled.

Preconditions
The Receptionist (or other staff) is logged into the system.

An outstanding invoice for a patient exists in the (Billing & Invoices) data store.

The Receptionist has received payment details from the patient.

Postconditions
A new payment record is created and applied to the invoice in the (Billing & Invoices) data store.

The patient's balance is updated.

A payment receipt is generated and sent/given to the patient.

Basic Flow
The staff user locates the patient's invoice and submits "Payment Information" (e.g., amount, method).

The system retrieves the invoice details from the (Billing & Invoices) data store.

The system writes the new payment record to the (Billing & Invoices) data store, associating it with the invoice.

The system sends/generates a "Payment Receipt."

UC-16: Billing Retrieval
Author: Michael Orenze Priority: High

Purpose
To allow the Owner to query and retrieve a list of billing records (invoices, payments, balances) from the system.

Actors
Owner

Requirement Traceability
BR-42: The Owner and Receptionist must be able to view each patient’s current balance.

BR-47: Owners must be able to view operational and financial reports and analytics.

Preconditions
The Owner is logged into the system.

The Owner has navigated to the financial or billing section.

Postconditions
The system displays the requested "List of Bills View" to the Owner.

Basic Flow
The Owner submits a "List of Bills Request."

The system receives the request.

The system queries the (Billing & Invoices) data store.

The system receives the billing records.

The system displays the "List of Bills View" to the Owner.

UC-17: Report Data Provision
Author: Michael Orenze Priority: High

Purpose
To allow the Owner to generate a billing report. The system retrieves the necessary data, sends the report to the Owner, and simultaneously forwards the data to the "7.1 Financial Report Generation" subsystem.

Actors
Owner

Requirement Traceability
BR-47: Owners must be able to view operational and financial reports and analytics.

Preconditions
The Owner is logged into the system.

The Owner has navigated to the reporting section.

Postconditions
The Owner receives the requested "Billing Report."

The "Invoice & Payment Data" is successfully sent to the "7.1 Financial Report Generation" process.

Basic Flow
The Owner submits a "Billing Report Request."

The system receives the request.

The system queries the (Billing & Invoices) data store for invoice data.

The system performs two actions in parallel: a. Sends "Invoice & Payment Data" to (7.1 Financial Report Generation). b. Sends the "Billing Report" to the Owner.

The Owner receives the Billing Report.

UC-18: Service Consumable Depletion
Author: Michael Orenze Priority: High

Purpose
To allow authorized staff (Owner, Dentist, Receptionist) to report the consumption of inventory items used during a service, which updates (reduces) the stock levels in the system.

Actors
User (Owner, Dentist, Receptionist)

Requirement Traceability
BR-36: The Owner and Receptionist must be able to update inventory item details.

BR-38: The system must log all inventory changes...

BR-39: The system must generate low-stock alerts for inventory items.

Preconditions
The user (Owner, Dentist, or Receptionist) is logged into the system.

A service or procedure has been completed which consumed inventory items.

Postconditions
On Success: The stock quantity of the reported item is reduced in the (Inventory) data store.

On Failure (Out of Stock): The stock level is not changed, and the user receives an error.

Basic Flow
The staff user submits a "Service Usage Report" (specifying items and quantities used).

The system checks the current stock levels.

If items are "In Stock," the system subtracts the used quantity from the (Inventory) data store.

The system sends a "Usage Acknowledgment (Success)."

Alternative Flow (Out of Stock)
3a1: The system checks stock levels and finds the item is "In Stock?" (No).

3a2: The system sends a "Usage Acknowledgment (Error: Out of Stock)."

3a3: The user receives the error.

UC-19: Stock Replenishment
Author: Michael Orenze Priority: Medium

Purpose
To allow the Owner to add new inventory items or update (increase) the quantity of existing items in the system's inventory records.

Actors
Owner

Requirement Traceability
BR-34: The Owner and Receptionist must be able to add new inventory items.

BR-38: The system must log all inventory changes...

Preconditions
The Owner is logged into the system.

The Owner has navigated to the "Manage Inventory" section.

Postconditions
The stock quantity for an item is successfully added or updated in the (Inventory) data store.

The Owner receives an acknowledgment of the successful update.

Basic Flow
The Owner submits "New Stock Data" (e.g., selects an item, enters the new quantity).

The system receives the data.

The system writes the stock addition/update to the (Inventory) data store.

The system sends a "New Stock Acknowledgment" to the Owner.

UC-20: Inventory Management Retrieval
Author: Michael Orenze Priority: Medium

Purpose
To allow the Owner to query and retrieve the current stock list and view inventory details.

Actors
Owner

Requirement Traceability
BR-33: The Owner and Receptionist must be able to view the clinic’s inventory.

BR-35: The Owner, Dentist, and Receptionist must be able to view inventory items.

Preconditions
The Owner is logged into the system.

The Owner has navigated to the inventory management section.

Postconditions
The system displays the "Current Stock List View" to the Owner.

Basic Flow
The Owner submits a "Current Stock List Request."

The system receives the request.

The system queries the (Inventory) data store.

The system receives the inventory data.

The system displays the "Current Stock List View" to the Owner.

UC-21: Inventory Management Retrieval (Add Item)
(Note: Title adjusted based on flow)

Author: Jasper Valdez Priority: High

Purpose
To allow authorized users (Owner or Receptionist) to add new items to the inventory database.

Actors
Owner

Receptionist

Requirement Traceability
BR-34: The Owner and Receptionist must be able to add new inventory items.

BR-38: The system must log all inventory changes...

Preconditions
The user is logged in with an Owner or Receptionist role.

Postconditions
A new item is added to the inventory database.

The action is logged.

Basic Flow
The user navigates to "Inventory" and selects "Add New Item."

The system displays a form for item details (name, quantity, supplier, low-stock threshold).

The user fills in the details and saves.

The system adds the item to the inventory.

UC-22: Inventory Report Provision
Author: Jasper Valdez Priority: Medium

Purpose
To allow the Owner to query and generate a report of the current inventory data and stock levels.

Actors
Owner

Requirement Traceability
BR-33: The Owner and Receptionist must be able to view the clinic’s inventory.

BR-35: The Owner, Dentist, and Receptionist must be able to view inventory items.

Preconditions
The Owner is logged into the system.

The Owner has navigated to the "Inventory" or "Reports" section.

Postconditions
The Owner receives the "Inventory Report."

Basic Flow
The Owner submits a "Current Stock List Request."

The system receives the request.

The system queries the (Inventory) data store.

The system receives the inventory data.

The system generates and sends the "Inventory Report" to the Owner.

UC-23: Service List Synchronization
Author: Jasper Valdez Priority: High

Purpose
To allow the Owner to query and retrieve the current list of available clinic services, typically for administrative purposes.

Actors
Owner

Requirement Traceability
BR-05: All users (Owner, Patient, Dentist, Receptionist) must be able to view available services offered by the clinic.

Preconditions
The Owner is logged into the system.

The Owner has navigated to the "Manage Services" section.

Postconditions
The system displays the "Service List View" to the Owner.

Basic Flow
The Owner submits a "Service List Request."

The system receives the request.

The system queries the (Services) data store.

The system receives the "Available Service List."

The system displays the "Service List View" to the Owner.