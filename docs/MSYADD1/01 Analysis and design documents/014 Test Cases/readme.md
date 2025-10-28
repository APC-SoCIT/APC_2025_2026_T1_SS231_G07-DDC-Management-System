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