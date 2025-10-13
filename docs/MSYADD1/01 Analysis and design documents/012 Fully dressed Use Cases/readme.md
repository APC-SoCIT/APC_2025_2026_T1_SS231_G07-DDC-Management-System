012 Fully dressed Use Cases
# 🦷 Dorotheo Dental Clinic System - Use Case Documentation

Welcome to the official use case documentation for the Dorotheo Dental Clinic System. This document provides a detailed overview of the system's functionalities from the perspective of its users. It serves as a blueprint for developers, stakeholders, and project managers to understand the intended behavior and features of the application.

---

## System Actors

The system is designed to be used by several key actors, each with specific roles and permissions:

* **Patient:** The primary client of the clinic. They can register, log in, manage their appointments and personal information, view their records, and interact with the AI Agent.
* **Receptionist:** A staff member responsible for administrative tasks, including managing appointments, patient records, inventory, and billing on behalf of patients.
* **Dentist:** A clinical professional who manages their schedule, accesses and updates patient medical records, and assigns treatments.
* **Owner:** The system administrator with full access. The Owner can manage all aspects of the system, including user accounts, services, inventory, and generating financial and operational reports.
* **AI Agent:** A secondary actor that assists patients with scheduling, cancellations, and service inquiries through an automated interface.

---

## Summary of Use Cases

Below is a complete list of the system's use cases, organized by functional module.

### 👤 Account & Profile Management
| ID | Use Case Name | Brief Purpose |
| :-- | :--- | :--- |
| UC-01 | Register | To allow new patients to create an account online. |
| UC-02 | Login | To allow all users to securely access their role-specific dashboards. |
| UC-03 | Reset Password | To enable users to recover access to their account if they forget their password. |
| UC-04 | Update/View Personal Information | To allow users to manage their own profile details. |
| UC-20a | Create User Account | To allow the Owner to create new staff or patient accounts. |
| UC-20b | View User Account Details | To allow the Owner to view details for all user accounts. |
| UC-20c | Update User Account | To allow the Owner to modify existing user account information. |
| UC-20d | Deactivate User Account | To allow the Owner to deactivate user accounts. |

### 🗓️ Appointment & Schedule Management
| ID | Use Case Name | Brief Purpose |
| :-- | :--- | :--- |
| UC-07 | Request Consultation Appointment | To allow patients to request a new consultation appointment online. |
| UC-08 | View Appointment Schedules | To allow all users to view clinic appointment schedules based on their role. |
| UC-09 | Create Appointment Schedule | To allow authorized staff to book a new appointment in the system. |
| UC-10 | Update Appointment Schedule | To allow authorized staff to reschedule or modify an existing appointment. |
| UC-11 | Delete Appointment | To allow authorized staff to cancel and remove an appointment. |
| UC-12 | View Appointment History | To allow patients to see their past and upcoming appointments. |
| UC-14 | View Dentist Schedule | To allow a dentist to view their personal daily or weekly schedule. |

### 📄 Patient Records & Forms
| ID | Use Case Name | Brief Purpose |
| :-- | :--- | :--- |
| UC-06 | Fill/Update Patient Forms | To allow patients to complete their medical and personal information forms online. |
| UC-13 | Assign Treatments | To allow a dentist to add treatment details to a patient's record after a consultation. |
| UC-15a | Create New Patient Record | To allow authorized staff to manually create a new patient record. |
| UC-15b | View Patient Record | To allow authorized staff to access a patient's full medical history and tooth chart. |
| UC-15c | Update Patient Record | To allow authorized staff to modify information in an existing patient record. |
| UC-15d | Archive Patient Record | To allow authorized staff to archive inactive patient records. |
| UC-16 | Download Personal Records | To allow patients to download a copy of their own medical records. |

### 💰 Billing & Invoicing
| ID | Use Case Name | Brief Purpose |
| :-- | :--- | :--- |
| UC-17 | View/Download Invoice | To allow patients to view and download their billing invoices. |
| UC-19a | Record New Charge | To allow staff to add a charge for a service to a patient's account. |
| UC-19b | Post Payment or Adjustment | To allow staff to record a payment or apply a discount to a patient's balance. |
| UC-19c | View Patient Transaction History | To allow patients and staff to view a detailed history of all charges and payments. |

### 📦 Inventory & Services
| ID | Use Case Name | Brief Purpose |
| :-- | :--- | :--- |
| UC-05 | View Services | To allow any user to view the list of dental services offered by the clinic. |
| UC-18a | Add Inventory Item | To allow authorized staff to add a new item to the clinic's inventory. |
| UC-18b | View Inventory | To allow authorized users to view current stock levels and low-stock alerts. |
| UC-18c | Update Inventory Item | To allow authorized staff to adjust the quantity or details of an inventory item. |
| UC-18d | Delete Inventory Item | To allow authorized staff to remove a discontinued item from the inventory. |

### 🤖 AI Agent & Reporting
| ID | Use Case Name | Brief Purpose |
| :-- | :--- | :--- |
| UC-21 | AI Agent Appointment Assistance | To allow patients to manage appointments and inquire about services via an AI agent. |
| UC-22 | Generate Reports | To allow the Owner to generate and download financial, appointment, and inventory reports. |

---

> This documentation provides the foundation for the system's development. Each use case contains a full description, including actors, pre/post-conditions, and detailed action flows, in its respective file.