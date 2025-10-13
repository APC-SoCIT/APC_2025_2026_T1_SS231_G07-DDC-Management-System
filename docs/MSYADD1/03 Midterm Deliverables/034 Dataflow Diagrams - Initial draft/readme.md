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

* **[View the Data Flow Diagram](https://drive.google.com/file/d/1_OsEpZwqI_k4MtdGdpGJLxLYSmd-JYYe/view?usp=sharing)**

---

## Full System DFD Documentation

### Level 0: Context Diagram
This level shows the system as a single process and its interaction with external entities.

**Components**
* **External Entities:** Patient, Receptionist, Dentist, Owner, AI Agent
* **System (Single Process):** 0.0 Dorotheo Dental Clinic System

**Data Flows**
* [External Entity: Patient] → "Registration Details, Login Credentials, Personal Information Updates, Signed Consent Forms, Patient Form Data, Appointment Request, Payment Details" → [Process: 0.0 Dorotheo Dental Clinic System]
* [Process: 0.0 Dorotheo Dental Clinic System] → "Registration Confirmation, Appointment Confirmations & Reminders, Schedule Information, Patient Records, Invoices" → [External Entity: Patient]
* [External Entity: Receptionist] → "Login Credentials, New Patient Records, Record Updates, New Appointment Details, Appointment Updates/Cancellations, Inventory Items Used" → [Process: 0.0 Dorotheo Dental Clinic System]
* [External Entity: Dentist] → "Login Credentials, Treatment Details, Record Updates, Appointment Updates/Cancellations" → [Process: 0.0 Dorotheo Dental Clinic System]
* [Process: 0.0 Dorotheo Dental Clinic System] → "Full Clinic Schedules, Patient Information, Appointment Notifications, Inventory Levels" → [External Entities: Receptionist, Dentist]
* [External Entity: Owner] → "Login Credentials, Account Management Details, Inventory Updates, Service Updates, Report Request" → [Process: 0.0 Dorotheo Dental Clinic System]
* [Process: 0.0 Dorotheo Dental Clinic System] → "Financial & Operational Reports, Low-Stock Alerts" → [External Entity: Owner]
* [External Entity: AI Agent] → "Appointment & Service Queries" → [Process: 0.0 Dorotheo Dental Clinic System]
* [Process: 0.0 Dorotheo Dental Clinic System] → "Validated Appointment Data, Service Information" → [External Entity: AI Agent]

### Level 1: System Processes
This level decomposes the system into its major processes and introduces data stores.

**Components**
* **Processes:** 1.0 Manage User Accounts, 2.0 Manage Appointments, 3.0 Manage Patient Records, 4.0 Manage Billing & Inventory, 5.0 Generate Reports
* **Data Stores:** D1: User Accounts, D2: Appointments, D3: Patient Records, D4: Inventory, D5: Billing & Invoices

**Key Data Flows (with Clinic Process Integration)**
* **Arrival & Registration (NEW)**
    * [External Entity: Receptionist] → "New Patient Form Data" → [Process: 3.0 Manage Patient Records]
    * [Process: 3.0 Manage Patient Records] → "Patient Lookup Query" → [Data Store: D3 Patient Records]
* **Consultation (NEW)**
    * [External Entity: Dentist] → "Record Request" → [Process: 3.0 Manage Patient Records]
    * [Process: 3.0 Manage Patient Records] → "Completed Treatment Info" → [Process: 4.0 Manage Billing & Inventory]
* **Billing & Payment (NEW)**
    * [Process: 4.0 Manage Billing & Inventory] → "Generated Invoice" → [External Entity: Patient]
    * [External Entity: Patient] → "Payment Details" → [Process: 4.0 Manage Billing & Inventory]
* **Exit & Follow-Up (NEW)**
    * [External Entity: Receptionist] → "New Appointment Request" → [Process: 2.0 Manage Appointments]
    * [Process: 2.0 Manage Appointments] → "Appointment Confirmation" → [External Entity: Patient]

### Level 2: Sub-Processes (Expanded with Clinic Process)

**Process 3.0: Manage Patient Records (Expanded)**
* **Sub-Processes:** 3.1 Admit/Register Patient, 3.2 Manage Forms & Consent, 3.3 Conduct & Record Consultation, 3.4 Retrieve Patient Records
* **Data Flows (Expanded):**
    * [External Entity: Receptionist] → "New Patient Form Data" → [Sub-Process: 3.1 Admit/Register Patient] (NEW)
    * [External Entities: Dentist & Dental Assistant] → "Treatment Details & Consumed Items" → [Sub-Process: 3.3 Conduct & Record Consultation] (NEW)
    * [Sub-Process: 3.3 Conduct & Record Consultation] → "Completed Treatment Info" → [Process: 4.0 Manage Billing & Inventory] (NEW)

**Process 4.0: Manage Billing & Inventory (Expanded)**
* **Sub-Processes:** 4.1 Manage Inventory Items, 4.2 Generate Invoice, 4.3 Process Payment, 4.4 Track Stock Levels
* **Data Flows (Expanded):**
    * [Process: 3.0 Manage Patient Records] → "Completed Treatment Info" → [Sub-Process: 4.2 Generate Invoice] (NEW)
    * [Sub-Process: 4.2 Generate Invoice] → "Generated Invoice" → [External Entity: Patient] (NEW)
    * [External Entity: Patient] → "Payment Details" → [Sub-Process: 4.3 Process Payment] (NEW)

**Process 2.0: Manage Appointments (Expanded for Follow-Up)**
* **Sub-Processes:** 2.1 Request/Book Appointment, 2.2 Confirm Appointment, 2.3 Update/Cancel Appointment, 2.4 Send Reminders, 2.5 View Schedules, 2.6 Provide Service Information
* **New Data Flows:**
    * [External Entity: Receptionist] → "New Appointment Request" → [Sub-Process: 2.1 Request/Book Appointment] (NEW)
    * [Sub-Process: 2.1 Request/Book Appointment] → "Appointment Confirmation" → [External Entity: Patient] (NEW)