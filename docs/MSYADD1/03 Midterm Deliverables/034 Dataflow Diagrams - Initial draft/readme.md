# 🦷 Dorotheo Dental Clinic System - Data Flow Diagram (DFD) Documentation

This document provides a detailed, text-based Data Flow Diagram (DFD) for the Dorotheo Dental Clinic System. It outlines how data moves through the system, the major processes involved, the data stores used, and the external entities that interact with it.

The documentation is structured hierarchically across three levels:
* **Level 0 (Context Diagram):** A high-level overview showing the entire system as a single process.
* **Level 1 (System Processes):** Decomposes the system into its main functional processes.
* **Level 2 (Sub-Processes):** Provides a more detailed breakdown of the individual processes from Level 1.

---

## ✨ Key Feature: Integrated Clinic Patient Workflow

This documentation now includes the complete, end-to-end workflow for a patient visit, seamlessly integrated into the existing DFD structure. This process covers four key stages:

1.  **Arrival & Registration:** Handled within **Process 3.0 (Manage Patient Records)**, where the Receptionist admits new or existing patients.
2.  **Consultation:** Managed by the Dentist under **Process 3.0**, where treatment details and consumed inventory are recorded.
3.  **Billing & Payment:** The `Completed Treatment Info` flows into **Process 4.0 (Manage Billing & Inventory)** to automatically generate invoices and process patient payments.
4.  **Exit & Follow-Up:** Concludes with the Receptionist scheduling a follow-up appointment via **Process 2.0 (Manage Appointments)**.

### How to Identify Changes
All new or significantly expanded components (processes, data stores, or data flows) related to this workflow are marked with a **`(NEW)`** tag for easy identification within the documentation below.

---

## Visual Diagram

For a visual representation of the data flows described in this document, please refer to the diagram linked below.

* **[View the Data Flow Diagram](https://asiapacificcollege.sharepoint.com/:w:/s/SSYADD1SS231T1AY2025-2026/EUGJqczKx2tNtHIToGB5sYABJJ73_OO4BOEeFljMju4Elg?e=fnci3V)**

---

## Full System DFD Documentation
Dental Clinic System: DFD Documentation
## 1. Data Dictionary
This section defines all the components used across the system diagrams.

## 1.1. External Entities
* **Patient:** An individual who receives dental services.

* **Receptionist:** A staff member responsible for administrative tasks, appointments, and billing.

* **Dentist:** A medical professional who performs dental treatments and manages patient records.

* **Owner:** The administrator of the clinic, responsible for staff management, inventory, and financial reporting.

* **AI Agent:** An automated system that assists patients with appointments and service inquiries.

## 1.2. Data Stores
User Accounts: Stores login credentials, roles, and personal information for all users.

Appointment: Stores all data related to scheduled, past, and pending appointments.

Patient Records: Stores all medical and dental history, treatment plans, and files for patients.

Billing & Invoices: Stores all financial transactions, generated invoices, and payment statuses.

Inventory: Stores data on all consumable stock, supplies, and equipment.

Services: Stores a list of all available dental services offered by the clinic.

## Processes

1.3. Processes
Level 1 Processes
* 1.0 Manage User Accounts

* 2.0 Manage Appointments

* 3.0 Manage Records

* 4.0 Manage Billing

* 5.0 Manage Inventory

* 6.0 Manage Services

* 7.0 Generate Reports

Level 2 Sub-Processes
* 1.1 Register

* 1.2 Login

* 1.3 Manage Staff Roles

* 2.1 Appointment Creation

* 2.2 Schedule Retrieval

* 2.3 Confirm Appointments

* 2.4 Update Appointments

* 2.5 Billing Data Transfer

* 3.1 Record Creation

* 3.2 Record Modification

* 3.3 Staff Record Retrieval

* 3.4 Patient Record Viewing

* 3.5 Record Exportation

* 4.1 Invoice Generation

* 4.2 Payment Application

* 4.3 Billing Retrieval

* 4.4 Report Data Provision

* 5.1 Service Consumable Depletion

* 5.2 Stock Replenishment

* 5.3 Inventory Management Retrieval

* 5.4 Inventory Report Provision

* 5.5 Service List Synchronization

* 6.1 Service Administration

* 6.2 Service Publication

* 7.1 Financial Report Generation

* 7.2 Inventory Report Generation

## 2. Level 0: Context Diagram
The Context Diagram shows the entire Dental Clinic System as a single process (0.0). It illustrates all high-level data flows between the system and the external entities.

External Entities: Patient, Receptionist, Dentist, Owner, AI Agent.

Data Flows: The system exchanges all data (appointment requests, user information, record data, billing data, inventory data, service data, and reports) with these external entities.

3. Level 1 DFD
The Level 1 DFD decomposes the system into its 7 primary processes. The flows listed here are the balanced sum of all flows from your Level 2 diagrams.

**Process 1.0:** Manage User Accounts
**Description:** Handles user registration, login, and staff role management.

* **Entities:** Patient, Owner, Dentist, Receptionist

## Data Store: User Accounts

**Process 2.0:** Manage Appointments
**Description:** Handles the creation, retrieval, confirmation, and updating of appointments.

**Entities:** Patient, Receptionist, Owner, Dentist, AI Agent

## Data Store: Appointments

**Process 3.0:** Manage Records
**Description:** Handles the creation, modification, retrieval, and exportation of patient dental records.

* **Entities: Dentist, Owner, Receptionist, Patient

## Data Store: Patient Records

**Process 4.0:** Manage Billing
**Description:** Handles invoice generation, payment processing, and billing retrieval.

* **Entities: Patient, Receptionist, Owner

## Data Stores: Billing & Invoices, Appointment

**Process 5.0:** Manage Inventory
**Description:**** Manages stock depletion, replenishment, and reporting.

* **Entities: Receptionist, Dentist, Owner

## Data Stores: Inventory, Services

**Process 6.0:** Manage Services
**Description:** Handles the administration and publication of clinic services.

* **Entities: Owner, Receptionist, Dentist, Patient, AI Agent

## Data Store: Services

**Process 7.0:** Generate Reports
**Description:** Generates financial and inventory reports for the owner.

Entities: Owner

## Data Stores: Billing & Invoices, Inventory

4. Level 2 DFDs (Process Decompositions)
This section details the internal workings of each Level 1 process.

**4.1. Process 1.0:** Manage User Accounts
Patient -> (New Patient Details) -> 1.1 Register

1.1 Register -> (Registration Confirmation) -> Patient

Owner -> (New Staff Details) -> 1.1 Register

1.1 Register -> (Staff Account Confirmation) -> Owner

1.1 Register -> (New Account Record) -> User Accounts

Patient -> (Login Credentials) -> 1.2 Login

1.2 Login -> (Login Status) -> Patient

Owner -> (Login Credentials) -> 1.2 Login

1.2 Login -> (Login Status) -> Owner

Dentist -> (Login Credentials) -> 1.2 Login

1.2 Login -> (Login Status) -> Dentist

Receptionist -> (Login Credentials) -> 1.2 Login

1.2 Login -> (Login Status) -> Receptionist

1.2 Login -> (Credential Query) -> User Accounts

User Accounts -> (Account Validation & Role) -> 1.2 Login

Owner -> (Update Staff List) -> 1.3 Manage Staff Roles

1.3 Manage Staff Roles -> (Staff List) -> Owner

1.3 Manage Staff Roles -> (Staff List) -> User Accounts

User Accounts -> (Updated Staff List) -> 1.3 Manage Staff Roles

**4.2. Process 2.0:** Manage Appointments
Patient -> (New Appointment Request) -> 2.1 Appointment Creation

2.1 Appointment Creation -> (New Appointment Notification) -> Patient

Receptionist -> (New Appointment Request) -> 2.1 Appointment Creation

2.1 Appointment Creation -> (New Appointment Notification) -> Receptionist

2.1 Appointment Creation -> (New Appointment Information) -> Appointments

Appointments -> (Query Availability) -> 2.1 Appointment Creation

Patient -> (View Schedule Request) -> 2.2 Schedule Retrieval

2.2 Schedule Retrieval -> (Full Schedule View) -> Patient

Receptionist -> (View Schedule Request) -> 2.2 Schedule Retrieval

2.2 Schedule Retrieval -> (Full Schedule View) -> Receptionist

Owner -> (Available Slot Request) -> 2.2 Schedule Retrieval

2.2 Schedule Retrieval -> (Available Slot Information) -> Owner

Dentist -> (Available Slot Request) -> 2.2 Schedule Retrieval

2.2 Schedule Retrieval -> (Available Slot Information) -> Dentist

AI Agent -> (AI-Generated Appointment Request) -> 2.2 Schedule Retrieval

2.2 Schedule Retrieval -> (AI-Sent Appointment Confirmation) -> AI Agent

2.2 Schedule Retrieval -> (Schedule Query) -> Appointments

Appointments -> (Schedule Data) -> 2.2 Schedule Retrieval

Patient -> (Appointment Confirmation) -> 2.3 Confirm Appointments

2.3 Confirm Appointments -> (Appointment Confirmation) -> Patient

2.3 Confirm Appointments -> (Confirmation Write Status) -> Appointments

Appointments -> (Appointment Details Query) -> 2.3 Confirm Appointments

Patient -> (Modification Request) -> 2.4 Update Appointments

2.4 Update Appointments -> (Modification Acknowledgement) -> Patient

Receptionist -> (Modification Request) -> 2.4 Update Appointments

2.4 Update Appointments -> (Modification Acknowledgement) -> Receptionist

Dentist -> (Modification Request) -> 2.4 Update Appointments

2.4 Update Appointments -> (Modification Acknowledgement) -> Dentist

AI Agent -> (Modification Request) -> 2.4 Update Appointments

2.4 Update Appointments -> (AI-Sent Modification Acknowledgement) -> AI Agent

2.4 Update Appointments -> (Modification Write Status) -> Appointments

Appointments -> (Query Appointment) -> 2.4 Update Appointments

Receptionist -> (Generate Billing Request) -> 2.5 Billing Data Transfer

Dentist -> (Generate Billing Request) -> 2.5 Billing Data Transfer

2.5 Billing Data Transfer -> (Billing Report) -> Receptionist

2.5 Billing Data Transfer -> (Billing Report) -> Dentist

2.5 Billing Data Transfer -> (Invoice) -> Receptionist

Appointments -> (Get Appointment Details Query) -> 2.5 Billing Data Transfer

4.3. Process 3.0: Manage Records
Dentist -> (New Dental Record) -> 3.1 Record Creation

3.1 Record Creation -> (Record Acknowledgement) -> Dentist

3.1 Record Creation -> (New Record Data) -> Patient Records

Dentist -> (Updated Record Data) -> 3.2 Record Modification

3.2 Record Modification -> (Modification Acknowledgement) -> Dentist

Owner -> (Modification Acknowledgement) -> 3.2 Record Modification

3.2 Record Modification -> (Modification Acknowledgement) -> Owner

Receptionist -> (Updated Record Data) -> 3.2 Record Modification

3.2 Record Modification -> (Modification Acknowledgement) -> Receptionist

Patient -> (Modification Acknowledgement) -> 3.2 Record Modification

3.2 Record Modification -> (Updated Record Write) -> Patient Records

Dentist -> (Record List Request) -> 3.3 Staff Record Retrieval

3.3 Staff Record Retrieval -> (Record List) -> Dentist

Receptionist -> (Record List Request) -> 3.3 Staff Record Retrieval

3.3 Staff Record Retrieval -> (Record List) -> Receptionist

3.3 Staff Record Retrieval -> (Record List Query) -> Patient Records

Patient Records -> (Full Record Data) -> 3.3 Staff Record Retrieval

Patient -> (Patient List View Request) -> 3.4 Patient Record Viewing

3.4 Patient Record Viewing -> (Patient Record View) -> Patient

Patient -> (View Record Request) -> 3.4 Patient Record Viewing

3.4 Patient Record Viewing -> (Patient Record Query) -> Patient Records

Patient Records -> (Specific Patient Record) -> 3.4 Patient Record Viewing

Patient -> (Download Record Request) -> 3.5 Record Exportation

3.5 Record Exportation -> (Downloadable Record File) -> Patient

3.5 Record Exportation -> (Patient Record Query) -> Patient Records

Patient Records -> (Specific Patient Record) -> 3.5 Record Exportation

**4.4. Process 4.0:** Manage Billing
Patient -> (New Invoice) -> 4.1 Invoice Generation

4.1 Invoice Generation -> (New Invoice Data) -> Billing & Invoices

Appointment -> (Appointment Details Query) -> 4.1 Invoice Generation

Receptionist -> (Payment Information) -> 4.2 Payment Application

4.2 Payment Application -> (Payment Receipt) -> Receptionist

4.2 Payment Application -> (Payment Record) -> Billing & Invoices

Billing & Invoices -> (Invoice Query) -> 4.2 Payment Application

Receptionist -> (Generate Invoice Request) -> 4.3 Billing Retrieval

Owner -> (List of Bills Request) -> 4.3 Billing Retrieval

4.3 Billing Retrieval -> (List of Bills View) -> Owner

4.3 Billing Retrieval -> (Billing Query) -> Billing & Invoices

Billing & Invoices -> (Billing Records) -> 4.3 Billing Retrieval

Owner -> (Billing Report Request) -> 4.4 Report Data Provision

4.4 Report Data Provision -> (Billing Report) -> Owner

4.4 Report Data Provision -> (Invoice Details Query) -> Billing & Invoices

Billing & Invoices -> (Invoice Data) -> 4.4 Report Data Provision

**4.5. Process 5.0:** Manage Inventory
Receptionist -> (Service Usage Report) -> 5.1 Service Consumable Depletion

5.1 Service Consumable Depletion -> (Usage Acknowledgement) -> Receptionist

Dentist -> (Service Usage Report) -> 5.1 Service Consumable Depletion

5.1 Service Consumable Depletion -> (Usage Acknowledgement) -> Dentist

5.1 Service Consumable Depletion -> (Stock Depletion Data) -> Inventory

Owner -> (New Stock Data) -> 5.2 Stock Replenishment

5.2 Stock Replenishment -> (New Stock Acknowledgement) -> Owner

5.2 Stock Replenishment -> (Stock Addition Data) -> Inventory

Owner -> (Current Stock List Request) -> 5.3 Inventory Management Retrieval

5.3 Inventory Management Retrieval -> (Current Stock List View) -> Owner

5.3 Inventory Management Retrieval -> (Inventory Query) -> Inventory

Inventory -> (Stock List Data) -> 5.3 Inventory Management Retrieval

Owner -> (Inventory Report Request) -> 5.4 Inventory Report Provision

5.4 Inventory Report Provision -> (Inventory Report) -> Owner

5.4 Inventory Report Provision -> (Inventory Query) -> Inventory

Inventory -> (Inventory Data) -> 5.4 Inventory Report Provision

Owner -> (Service List Request) -> 5.5 Service List Synchronization

5.5 Service List Synchronization -> (Service List View) -> Owner

5.5 Service List Synchronization -> (Service List Query) -> Services

Services -> (Available Service List) -> 5.5 Service List Synchronization

**4.6. Process 6.0:** Manage Services
Owner -> (Service Create/Update Data) -> 6.1 Service Administration

Owner -> (Service Delete Request) -> 6.1 Service Administration

6.1 Service Administration -> (List of Services Request) -> Owner

6.1 Service Administration -> (Service Acknowledgement) -> Owner

6.1 Service Administration -> (Full Service List View) -> Owner

6.1 Service Administration -> (Service Write Data) -> Services

Services -> (Service Query) -> 6.1 Service Administration

Receptionist -> (View Available Services Request) -> 6.2 Service Publication

6.2 Service Publication -> (View Available Services List) -> Receptionist

Dentist -> (View Available Services Request) -> 6.2 Service Publication

6.2 Service Publication -> (Available Services List) -> Dentist

Patient -> (View Available Services Request) -> 6.2 Service Publication

6.2 Service Publication -> (Available Services List) -> Patient

AI Agent -> (View Available Services Request) -> 6.2 Service Publication

6.2 Service Publication -> (Available Services List) -> AI Agent

6.2 Service Publication -> (Service Query) -> Services

Services -> (Service Data) -> 6.2 Service Publication

**4.7. Process 7.0:** Generate Reports
Owner -> (Financial Report Request) -> 7.1 Financial Report Generation

7.1 Financial Report Generation -> (Financial Report) -> Owner

Billing & Invoices -> (Financial Data Query) -> 7.1 Financial Report Generation

Owner -> (Inventory Analytics Request) -> 7.2 Inventory Report Generation

7.2 Inventory Report Generation -> (Inventory Analytics Report) -> Owner

Inventory -> (Stock Data Query) -> 7.2 Inventory Report Generation
