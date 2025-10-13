# 023 Realtime Cloud Database

This document outlines the project's dual-database architecture, which combines a powerful transactional database for core application data with a specialized vector database for AI-driven features.

---

## Primary Transactional Database: PostgreSQL via Supabase

The core of our data persistence layer is a **PostgreSQL** database, hosted and managed through **Supabase**. This database handles all structured data requiring strict transactional integrity, such as patient records, appointments, and inventory.

### Realtime Functionality
Supabase's built-in **Realtime Server** is utilized to listen for database changes. This allows the frontend application to subscribe to events (e.g., a new appointment being booked) and update the UI instantly without needing to poll the server, providing a seamless, real-time experience.

### Database Schema Overview
The following tables are defined in our `public` schema on Supabase:

| Table Name                | Purpose                                                                          |
| ------------------------- | -------------------------------------------------------------------------------- |
| `user` | Stores user account information for patients and staff, including authentication details. |
| `role` | Defines different user roles within the system (e.g., Patient, Dentist, Admin).          |
| `patient_medical_history` | Contains the medical history and records for each patient.                       |
| `appointment` | Manages all scheduled appointments, linking patients, staff, and timeslots.        |
| `service` | Lists all dental services offered by the clinic.                                 |
| `appointment_has_service` | A join table linking appointments to the specific services performed.              |
| `treatment_records` | Stores detailed records of treatments performed during appointments.             |
| `invoices` | Contains financial invoices generated for services rendered.                     |
| `payment` | Tracks payments made against invoices.                                           |
| `insurance_detail` | Stores patient insurance information.                                            |
| `inventory` | Manages the stock levels of dental supplies and materials.                       |

---

## Vector Database: Pinecone/ChromaDB

To power the AI chatbot's conversational abilities, we use **Pinecone** as our vector database. It stores high-dimensional vector embeddings of our clinic's knowledge base (FAQs, care instructions, etc.). This allows the RAG pipeline to perform rapid semantic searches to find the most relevant context for answering user queries, ensuring the chatbot's responses are accurate and grounded in factual data.