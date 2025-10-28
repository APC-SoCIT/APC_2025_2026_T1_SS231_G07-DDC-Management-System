# 🧪 O14 Test Cases

## 🦷 Dorotheo Dental Clinic System - Test Case Documentation

Welcome to the test case documentation for the **Dorotheo Dental Clinic System**.  
This document outlines the suite of tests designed to verify the system's **functionality**, **reliability**, and **adherence to requirements** defined in the use case specifications.

The goal of this testing documentation is to ensure a **high-quality, bug-free system** that meets the needs of both patients and the clinic owner.

---

## 📘 Full Test Case Document

For the complete test plan (including preconditions, steps, and expected results for each case), please view the official document below:

**👉 [View the Full Test Case Document](https://docs.google.com/document/d/your-google-docs-link/edit?usp=sharing)**

---

## 🧾 Test Case Summary

This section provides a high-level summary of all designed test cases for the system.  
The **Status** column can be updated to track progress during the QA process.

| Test Case ID   | Use Case ID   | Test Case Name                                          | Test Case Description                                                                                                                      | Status   |
|:---------------|:--------------|:--------------------------------------------------------|:-------------------------------------------------------------------------------------------------------------------------------------------|:---------|
| TC-01          | UC-01         | Patient Registers (Basic Flow)                          | Verify a new Patient can successfully register for an account using the public registration page with valid details.                       | Not Run  |
| TC-02          | UC-01         | Owner Adds Staff (Basic Flow)                           | Verify an Owner can successfully create a new staff account (Dentist/Receptionist) from the staff management section.                      | Not Run  |
| TC-03          | UC-01         | Register with Missing Fields (Exception)                | Verify the system prevents account creation and shows an error message if required fields (e.g., email, password) are missing.             | Not Run  |
| TC-04          | UC-01         | Register with Duplicate Email (Exception)               | Verify the system prevents account creation and shows an error if the email address provided is already in the "User Accounts" data store. | Not Run  |
| TC-05          | UC-01         | Register with Invalid Email Format (Exception)          | Verify the system shows a validation error if the user tries to register with an invalid email format (e.g., "test@test").                 | Not Run  |
| TC-06          | UC-02         | Valid Login (Basic Flow)                                | Verify a registered user (Patient, Owner, Dentist, or Receptionist) can successfully log in with valid credentials.                        | Not Run  |
| TC-07          | UC-02         | Login with Invalid Password (Alternative Flow)          | Verify the system shows an "Invalid username or password" error message when a user enters a valid username but an invalid password.       | Not Run  |
| TC-08          | UC-02         | Login with Non-existent Username (Alternative Flow)     | Verify the system shows an "Invalid username or password" error message when a user enters a username that does not exist.                 | Not Run  |
| TC-09          | UC-02         | Login with Empty Credentials (Exception)                | Verify the system shows an error message if the user submits the login form with one or both fields empty.                                 | Not Run  |
| TC-10          | UC-03         | Owner Views Staff List (Basic Flow)                     | Verify the Owner can successfully navigate to the staff management section and view a complete list of staff accounts.                     | Not Run  |
| TC-11          | UC-03         | Owner Updates Staff Details (Basic Flow)                | Verify the Owner can edit an existing staff account's information (e.g., role, name), and the changes are saved.                           | Not Run  |
| TC-12          | UC-03         | Owner Deletes Staff Account (Basic Flow)                | Verify the Owner can successfully delete a staff account, and it is removed from the "User Accounts" data store (as per BR-51).            | Not Run  |
| TC-13          | UC-03         | Non-Owner Access to Staff Mgt (Exception)               | Verify that a user with a Dentist, Receptionist, or Patient role cannot access the "Manage Staff Roles" functionality.                     | Not Run  |
| TC-14          | UC-04         | Patient Requests Appointment (Basic Flow)               | Verify a Patient can successfully request an appointment by selecting an available service, dentist, and time slot.                        | Not Run  |
| TC-15          | UC-04         | Staff Creates Appointment (Basic Flow)                  | Verify a Receptionist, Dentist, or Owner can successfully create a new appointment for a patient.                                          | Not Run  |
| TC-16          | UC-04         | Create Appointment on Booked Slot (Exception)           | Verify the system prevents creating an appointment in a time slot that is already occupied (as per BR-16).                                 | Not Run  |
| TC-17          | UC-04         | Verify Appointment Acknowledgment (Verify)              | Verify the user receives a confirmation or acknowledgment message after the appointment is successfully created.                           | Not Run  |
| TC-18          | UC-05         | Staff Views Clinic Schedule (Basic Flow)                | Verify an Owner, Receptionist, or Dentist can view the clinic's full appointment schedule.                                  
| Not Run  |
| TC-19          | UC-05         | Patient Views Own Appointments (Basic Flow)             | Verify a Patient can view their own upcoming appointments and appointment history (as per BR-17).                                          | Not Run  |
| TC-20          | UC-05         | Dentist Views Individual Schedule (Basic Flow)          | Verify a Dentist can view their individual schedule, showing only their appointments (as per BR-24).                                       | Not Run  |
| TC-21          | UC-05         | AI Agent Checks Availability (Basic Flow)               | Verify the AI Agent can successfully query the system and retrieve available appointment slots.                                            | Not Run  |
| TC-22          | UC-06         | Receptionist Confirms Appointment (Basic Flow)          | Verify a Receptionist can select a "pending" appointment and update its status to "Confirmed" (as per BR-15).                              | Not Run  |
| TC-23          | UC-06         | Patient Confirms Appointment (Basic Flow)               | Verify a Patient can confirm an appointment (e.g., one they requested) and its status is updated to "Confirmed".                           | Not Run  |
| TC-24          | UC-06         | Verify Confirmation Notification (Verify)               | Verify that a notification is sent to relevant parties (e.g., patient) after an appointment's status is changed to "Confirmed".            | Not Run  |
| TC-25          | UC-07         | Patient Requests Reschedule (Basic Flow)                | Verify a Patient can find their existing appointment and submit a modification request (e.g., for a new time/date).                        | Not Run  |
| TC-26          | UC-07         | AI Agent Requests Reschedule (Basic Flow)               | Verify a Patient can use the AI Agent to submit a request to modify an existing appointment (as per BR-13).                                | Not Run  |
| TC-27          | UC-07         | Staff Approves Reschedule (Basic Flow)                  | Verify a staff member (Owner, Dentist, Receptionist) can review a modification request and approve it, updating the appointment.           | Not Run  |
| TC-28          | UC-07         | Staff Denies Reschedule (Alternative Flow)              | Verify a staff member can deny a modification request, and the original appointment details remain unchanged.                              | Not Run  |
| TC-29          | UC-07         | Patient Receives Approval Acknowledgment (Verify)       | Verify the Patient receives a "Success" acknowledgment after their modification request is approved.                                       | Not Run  |
| TC-30          | UC-07         | Patient Receives Denial Acknowledgment (Verify)         | Verify the Patient receives a "Failed! Reschedule Again" acknowledgment after their modification request is denied.                        | Not Run  |
| TC-31          | UC-08         | Owner Initiates Billing (Basic Flow)                    | Verify the Owner can select a completed appointment and trigger the "Generate Billing Request" process.                                    | Not Run  |
| TC-32          | UC-08         | Verify Data Transfer to Invoice Gen (Verify)            | Verify that the correct appointment details are successfully sent to the "4.1 Invoice Generation" process.                                 | Not Run  |
| TC-33          | UC-08         | Verify Billing Report Generation (Verify)               | Verify the Owner and relevant Staff receive a billing report after the process is initiated.                                               | Not Run  |
| TC-34          | UC-09         | Staff Creates Dental Record (Basic Flow)                | Verify an Owner, Dentist, or Receptionist can successfully create and save a new dental record for a patient.                              | Not Run  |
| TC-35          | UC-09         | Create Record with Missing Fields (Exception)           | Verify the system prevents saving a new record and shows an error if required fields are empty.                                            | Not Run  |
| TC-36          | UC-09         | Verify Record Acknowledgment (Verify)                   | Verify the user receives a success acknowledgment message after the new record is saved.                                                   | Not Run  |
| TC-37          | UC-10         | Staff Modifies Dental Record (Basic Flow)               | Verify an Owner, Dentist, or Receptionist can open an existing patient record, make changes, and save the update.                          | Not Run  |
| TC-38          | UC-10         | Verify Modification Audit Log (Verify)                  | Verify the system logs who made the update and when (as per BR-31) after the record is modified.                                           | Not Run  |
| TC-39          | UC-10         | Patient Cannot Modify Record (Exception)                | Verify a user with a Patient role cannot access the functionality to modify their own dental record.                                       | Not Run  |
| TC-40          | UC-11         | Staff Views Patient Record List (Basic Flow)            | Verify an Owner, Dentist, or Receptionist can retrieve and view a list of patient records.                                                 | Not Run  |
| TC-41          | UC-11         | Staff Searches for Patient Record (Basic Flow)          | Verify a staff member can use a search function to find and retrieve a specific patient's record from the list.                            | Not Run  |
| TC-42          | UC-12         | Staff Views Specific Patient Record (Basic Flow)        | Verify an Owner, Dentist, or Receptionist can select a patient and view their full, specific record details.                               | Not Run  |
| TC-43          | UC-12         | Verify Tooth Chart Display (Verify)                     | Verify the patient record view includes the patient's tooth chart (as per BR-25).                                                          | Not Run  |
| TC-44          | UC-13         | Patient Downloads Personal Record (Basic Flow)          | Verify a logged-in Patient can successfully request and receive a downloadable file (PDF) of their personal records.                       | Not Run  |
| TC-45          | UC-13         | Patient Cannot Download Other Records (Exception)       | Verify a Patient can only access the download function for their own records and not for any other patient.                                | Not Run  |
| TC-46          | UC-14         | Owner Generates Invoice (Basic Flow)                    | Verify the Owner can successfully generate a new invoice for a patient's completed appointment.                                            | Not Run  |
| TC-47          | UC-14         | Verify Unique Invoice Number (Verify)                   | Verify that every generated invoice has a unique invoice number (as per BR-46).                                                            | Not Run  |
| TC-48          | UC-14         | Verify Patient Receives Invoice (Verify)                | Verify the system sends the newly generated invoice to the patient, allowing them to view and download it (as per BR-32).                  | Not Run  |
| TC-49          | UC-15         | Receptionist Applies Full Payment (Basic Flow)          | Verify a Receptionist can apply a full payment to an invoice, and the patient's balance is updated to "cleared" (as per BR-44).            | Not Run  |
| TC-50          | UC-15         | Receptionist Applies Partial Payment (Basic Flow)       | Verify a Receptionist can apply a partial payment, and the patient's balance is correctly updated to reflect the remaining amount.         | Not Run  |
| TC-51          | UC-15         | Owner Applies Payment (Basic Flow)                      | Verify an Owner can also successfully accept and post a payment to an invoice (as per BR-43).                                              | Not Run  |
| TC-52          | UC-15         | Verify Payment Receipt (Verify)                         | Verify a payment receipt is generated and sent/given to the patient after the payment is applied.                                          | Not Run  |
| TC-53          | UC-16         | Owner Views List of Bills (Basic Flow)                  | Verify the Owner can successfully retrieve and view a list of all billing records (invoices, payments, balances).                          | Not Run  |
| TC-54          | UC-16         | Verify Patient Balance Display (Verify)                 | Verify the "List of Bills View" correctly displays the current balance for patients (as per BR-42).                                        | Not Run  |
| TC-55          | UC-16         | Non-Owner Access to Billing List (Exception)            | Verify that a Patient or Dentist cannot access the comprehensive "List of Bills" view.                                                     | Not Run  |
| TC-56          | UC-17         | Owner Generates Billing Report (Basic Flow)             | Verify the Owner can submit a request and successfully receive a "Billing Report."                                                         | Not Run  |
| TC-57          | UC-17         | Verify Data Transfer to Financial Report (Verify)       | Verify that "Invoice & Payment Data" is simultaneously sent to the "7.1 Financial Report Generation" process.                              | Not Run  |
| TC-58          | UC-18         | Staff Depletes Stock (Basic Flow)                       | Verify an Owner, Dentist, or Receptionist can report service usage, and the correct item's stock quantity is reduced.                      | Not Run  |
| TC-59          | UC-18         | Deplete Out-of-Stock Item (Alternative Flow)            | Verify the system shows an "Error: Out of Stock" acknowledgment if the user tries to deplete more items than are in stock.                 | Not Run  |
| TC-60          | UC-18         | Verify Inventory Depletion Log (Verify)                 | Verify the stock change is logged with user and timestamp details (as per BR-38).                                                          | Not Run  |
| TC-61          | UC-18         | Verify Low Stock Alert (Verify)                         | Verify the system generates a low-stock alert if a depletion action causes the stock level to fall below its threshold (as per BR-39).     | Not Run  |
| TC-62          | UC-19         | Owner Adds New Inventory Item (Basic Flow)              | Verify the Owner can add a new inventory item, and it appears in the inventory list (as per BR-34).                                        | Not Run  |
| TC-63          | UC-19         | Owner Updates Stock Quantity (Basic Flow)               | Verify the Owner can update the quantity of an existing item (e.g., adding new stock).                                                     | Not Run  |
| TC-64          | UC-19         | Verify Inventory Addition Log (Verify)                  | Verify the stock addition is logged with user and timestamp details (as per BR-38).                                                        | Not Run  |
| TC-65          | UC-20         | Owner Views Inventory List (Basic Flow)                 | Verify the Owner can navigate to the inventory section and view the "Current Stock List View."                                             | Not Run  |
| TC-66          | UC-20         | Non-Owner Access to Inventory Mgt (Exception)           | Verify users other than the Owner (e.g., Patient) cannot access the "Inventory Management Retrieval" function.                             | Not Run  |
| TC-67          | UC-21         | Staff Adds New Item via Form (Basic Flow)               | Verify an Owner or Receptionist can use the "Add New Item" form to add a new item to the inventory.                                        | Not Run  |
| TC-68          | UC-21         | Verify Add Item Form Fields (Verify)                    | Verify the "Add New Item" form correctly displays fields for name, quantity, supplier, and low-stock threshold.                            | Not Run  |
| TC-69          | UC-22         | Owner Generates Inventory Report (Basic Flow)           | Verify the Owner can successfully request and receive an "Inventory Report" (distinct from the simple list view).                          | Not Run  |
| TC-70          | UC-23         | Owner Views Service List (Basic Flow)                   | Verify the Owner can navigate to the "Manage Services" section and view the current list of all clinic services.                           | Not Run  |
| TC-71          | UC-24         | Owner Creates New Service (Basic Flow)                  | Verify the Owner can successfully add a new service, and it appears in the service list.                                                   | Not Run  |
| TC-72          | UC-24         | Owner Updates Existing Service (Basic Flow)             | Verify the Owner can edit the details (e.g., name, price) of an existing service, and the changes are saved.                               | Not Run  | 
| TC-73          | UC-24         | Owner Deletes Service (Basic Flow)                      | Verify the Owner can successfully delete a service, and it is removed from the service list.                                               | Not Run  |
| TC-74          | UC-24         | Verify Service Acknowledgment (Verify)                  | Verify the Owner receives a success acknowledgment after creating, updating, or deleting a service.                                        | Not Run  |
| TC-75          | UC-25         | Patient Views Available Services (Basic Flow)           | Verify a logged-in Patient can view the list of available clinic services (as per BR-05).                                                  | Not Run  |
| TC-76          | UC-25         | AI Agent Retrieves Services (Basic Flow)                | Verify the AI Agent can successfully query and retrieve the list of available services (as per BR-52).                                     | Not Run  |
| TC-77          | UC-25         | Staff Views Available Services (Basic Flow)             | Verify an Owner, Dentist, or Receptionist can also view the list of available clinic services.                                             | Not Run  |
| TC-78          | UC-26         | Owner Generates Financial Report (Basic Flow)           | Verify the Owner can successfully request and receive a comprehensive "Financial Report."                                                  | Not Run  |
| TC-79          | UC-26         | Verify Financial Report Data (Verify)                   | Verify the financial report accurately summarizes the data from the "Billing&Invoices" data store.                                         | Not Run  |
| TC-80          | UC-27         | Owner Generates Inventory Analytics Report (Basic Flow) | Verify the Owner can successfully request and receive an "Inventory Analytics Report."                                                     | Not Run  |
| TC-81          | UC-27         | Verify Inventory Analytics Data (Verify)                | Verify the inventory analytics report accurately reflects stock levels and usage data from the "Inventory" data store.                     | Not Run  |

## 🧩 Notes

- All test cases are linked to their corresponding **Use Case IDs (UC-XX)** for traceability.  
- The QA team should update the **Status** field after executing each test.  
- Ensure consistent documentation of results and screenshots for validation.

---

🧑‍💻 **Maintained by:** QA & Dev Team – Dorotheo Dental Clinic System  
📅 **Last Updated:** October 2025