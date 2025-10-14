# 015 Entity Relationship Diagrams
Clinic Management System - Database Schema
This document outlines the Entity Relationship Diagram (ERD) for the Clinic Management System. The schema is designed to manage patient information, appointments, treatments, billing, inventory, and user roles within a clinical setting.

Entity Relationship Diagram
The diagram below illustrates the database tables, their columns, and the relationships between them using Crow's Foot notation.

To display the image, make sure image_17c9aa.png is in the same directory as this README file.

Table Descriptions
Core Entities
user: Stores user account information, including login credentials and personal details. Users can be patients or staff.

role: Defines different user roles within the system (e.g., Admin, Doctor, Patient).

patient_medical_history: Contains the medical records for each patient, including allergies, medications, and conditions.

appointment: The central table for scheduling. It links patients, staff, services, and time slots.

treatment_records: Logs the specific details of treatments performed during an appointment.

Service & Inventory
service: A list of all services offered by the clinic, including name, duration, and price.

appointment_has_service: A junction table that links services to specific appointments, allowing for multiple services per appointment.

inventory: Manages the stock of medical supplies and other items, including quantity and supplier information.

Billing & Financial
invoices: Generates billing information for each appointment, detailing the total amount due.

payment: Tracks all payments made against invoices, including payment method and transaction details.

insurance_detail: Stores patient insurance policy information.

Relationships Summary
A user has one role.

A user (acting as a patient) has one patient_medical_history.

A user can have multiple insurance_detail records.

An appointment is booked by a user and generates an invoice.

An appointment can include multiple services via the appointment_has_service table.

treatment_records result from an appointment.

An invoice receives a payment.

A service can use items from the inventory.