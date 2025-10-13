# 014 Test Cases
# 🦷 Dorotheo Dental Clinic System - Test Case Documentation

Welcome to the test case documentation for the Dorotheo Dental Clinic System. This document outlines the suite of tests designed to verify the system's functionality, reliability, and adherence to the requirements defined in the use case specifications.

The primary goal is to ensure a high-quality, bug-free application that meets the needs of all users, from patients to the clinic owner.

---

## 📄 Full Test Case Document

For a more detailed version of the test plan, including preconditions, test steps, and expected results for each case, please refer to the official document linked below.

* **[View the Full Test Case Document](https://docs.google.com/document/d/1Z-g2FZOnLIUHgDbTRMus-M5WGe-EJCs-VO8_nHSPoAg/edit?usp=sharing)**

---

## Test Case Summary

This table provides a high-level summary of all test cases designed for the system. The **Status** column can be updated to track the progress of the quality assurance process.

| TC ID | UC ID(s) | Test Case Name | Description | Status |
| :---- | :--- | :--- | :--- | :---: |
| **Authentication & User Management** |
| TC-001 | UC-01 | Patient Registration | Verify that a new patient can register with valid details. | Not Run |
| TC-002 | UC-01 | Duplicate Email Registration | Verify registration is prevented if the email is already in use. | Not Run |
| TC-003 | UC-02 | User Login | Verify a registered user can log in with valid credentials. | Not Run |
| TC-004 | UC-02 | Login with Invalid Credentials| Verify an error is shown for incorrect credentials. | Not Run |
| TC-005 | UC-03 | Reset Password | Verify a user can reset their password via email. | Not Run |
| TC-006 | UC-04 | Update Personal Info | Verify a logged-in user can update their personal details. | Not Run |
| TC-023a| UC-20a | Create User Account | Verify the Owner can create a new user account. | Not Run |
| TC-023b| UC-20b | View User Accounts | Verify the Owner can view the list of all user accounts. | Not Run |
| TC-023c| UC-20c | Update User Account | Verify the Owner can update an existing user account. | Not Run |
| TC-023d| UC-20d | Deactivate User Account | Verify the Owner can deactivate a user account. | Not Run |
| **Appointments & Scheduling** |
| TC-009 | UC-07 | Request Consultation | Verify a patient can request a consultation appointment. | Not Run |
| TC-010 | UC-08 | View Appointment Schedule | Verify a user can view their role-appropriate schedule. | Not Run |
| TC-011 | UC-09 | Create Appointment | Verify an authorized user can create a new appointment. | Not Run |
| TC-012 | UC-10 | Update Appointment | Verify an authorized user can update an existing appointment. | Not Run |
| TC-013 | UC-11 | Delete Appointment | Verify an authorized user can delete an appointment. | Not Run |
| TC-014 | UC-12 | View Appointment History | Verify a patient can view their appointment history. | Not Run |
| TC-016 | UC-14 | View Dentist Schedule | Verify a dentist can view their own schedule. | Not Run |
| **Patient Records & Services** |
| TC-007 | UC-05 | View Services | Verify the system correctly displays the list of clinic services. | Not Run |
| TC-008 | UC-06 | Fill New Patient Form | Verify a patient can submit the new patient form. | Not Run |
| TC-015 | UC-13 | Assign Treatment | Verify a dentist can assign a treatment to a patient's record. | Not Run |
| TC-017a| UC-15a | Create Patient Record | Verify an authorized user can create a new patient record. | Not Run |
| TC-017b| UC-15b | View Patient Record | Verify an authorized user can view an existing patient record. | Not Run |
| TC-017c| UC-15c | Update Patient Record | Verify an authorized user can update a patient's record. | Not Run |
| TC-017d| UC-15d | Archive Patient Record | Verify an authorized user can archive an inactive record. | Not Run |
| TC-018 | UC-16 | Download Personal Records | Verify a patient can download their medical records. | Not Run |
| **Billing & Inventory** |
| TC-019 | UC-17 | View/Download Invoice | Verify a patient can view and download their invoice. | Not Run |
| TC-020a| UC-18a | Add Inventory Item | Verify an authorized user can add a new item to inventory. | Not Run |
| TC-020b| UC-18b | View Inventory | Verify an authorized user can view the inventory and low-stock alerts. | Not Run |
| TC-020c| UC-18c | Update Inventory Item | Verify an authorized user can update an inventory item. | Not Run |
| TC-020d| UC-18d | Delete Inventory Item | Verify an authorized user can remove an item from inventory. | Not Run |
| TC-021a| UC-19a | Record New Charge | Verify an authorized user can add a service charge to a patient's bill. | Not Run |
| TC-021b| UC-19b | Post Payment/Adjustment | Verify posting a payment correctly updates the patient's balance. | Not Run |
| TC-021c| UC-19c | View Transaction History | Verify a user can view a patient's complete transaction history. | Not Run |
| **System & AI** |
| TC-022 | UC-22 | Generate Report | Verify the Owner can generate and view a system report. | Not Run |
| TC-024 | UC-21 | AI Agent Assistance | Verify the AI Agent can assist a patient in booking an appointment. | Not Run |

### Status Legend
* ⚪ **Not Run**: The test case has not yet been executed.
* 🟢 **Pass**: The test case was executed and the actual result matched the expected result.
* 🔴 **Fail**: The test case was executed and the actual result did not match the expected result.
* 🟡 **Blocked**: The test case cannot be executed due to an external issue or a dependency on a failed test.