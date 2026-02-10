# 023 Realtime Cloud Database

This document outlines the project's dual-database architecture, which combines a powerful transactional database for core application data with a specialized vector database for AI-driven features.

---

## Primary Transactional Database: PostgreSQL via Supabase

The core of our data persistence layer is a **PostgreSQL** database, hosted and managed through **Supabase**. This database handles all structured data requiring strict transactional integrity, such as patient records, appointments, and inventory.

### Realtime Functionality
Supabase's built-in **Realtime Server** is utilized to listen for database changes. This allows the frontend application to subscribe to events (e.g., a new appointment being booked) and update the UI instantly without needing to poll the server, providing a seamless, real-time experience.

### Database Schema Overview

**Total Tables:** 19 application tables + 8 Django system tables

The following tables are defined in our `public` schema on Supabase:

#### Core Application Tables

| Table Name | Purpose |
|------------|---------|
| `api_user` | Stores user account information for patients, staff, dentists, and owner, including authentication details and role assignments. |
| `api_service` | Lists all dental services offered by the clinic with categories (orthodontics, restorations, x-rays, oral surgery, preventive). |
| `api_appointment` | Manages all scheduled appointments, linking patients, dentists, services, and timeslots with support for reschedule/cancel requests. |
| `api_toothchart` | Stores dental chart data for each patient in JSON format for visual tooth mapping. |
| `api_dentalrecord` | Contains historical records of treatments, diagnoses, and dental procedures performed. |
| `api_document` | Stores patient-related documents (X-rays, scans, reports) with file uploads. |
| `api_inventoryitem` | Manages the stock levels of dental supplies and materials with low-stock alerts. |
| `api_billing` | Tracks billing, payments, and statement of accounts for services rendered. |
| `api_cliniclocation` | Stores clinic location information including address and GPS coordinates. |
| `api_treatmentplan` | Manages long-term treatment plans for patients with status tracking. |
| `api_teethimage` | Stores uploaded images of patient teeth with version tracking. |
| `api_staffavailability` | Manages weekly availability schedules for staff and dentists. |
| `api_appointmentnotification` | Notification system for staff and owner about appointment activities. |
| `api_dentistnotification` | Legacy notification system (kept for backward compatibility). |
| `api_passwordresettoken` | Manages password reset tokens with expiration for all users. |
| `api_patientintakeform` | Stores initial patient intake form data including medical history and emergency contacts. |
| `api_fileattachment` | General file attachments for patients (documents, photos, reports). |
| `api_clinicalnote` | Clinical notes for patient visits with appointment linking. |
| `api_treatmentassignment` | Assigns specific treatments to patients with status tracking. |

#### Django System Tables

| Table Name | Purpose |
|------------|---------|
| `auth_group` | User groups for permission management. |
| `auth_group_permissions` | Mapping between groups and permissions. |
| `auth_permission` | Available system permissions. |
| `authtoken_token` | API authentication tokens for users. |
| `django_admin_log` | Audit log of admin actions. |
| `django_content_type` | Django content type registry. |
| `django_migrations` | Migration history tracking. |
| `django_session` | Session data for authenticated users. |

### Key Features

**User Management:**
- Role-based access control (patient, staff, dentist, owner)
- Active patient tracking based on last appointment
- Patient archiving system
- Profile pictures and detailed user information

**Appointment System:**
- Full appointment lifecycle (pending, confirmed, completed, cancelled, missed)
- Reschedule and cancel request workflows
- Dentist assignment and service selection
- Real-time notifications for staff and dentists

**Medical Records:**
- Comprehensive dental record history
- Interactive tooth chart with JSON storage
- Document management (X-rays, scans, reports)
- Patient teeth images with version control
- Clinical notes with appointment linking

**Treatment Management:**
- Long-term treatment planning
- Treatment assignments with status tracking
- Integration with appointments and dental records

**Billing & Payments:**
- Billing with Statement of Account (SOA) file uploads
- Payment status tracking
- Integration with appointments

**Inventory:**
- Stock level management
- Low-stock alerts
- Supplier tracking and cost management

**Patient Intake:**
- Medical history and allergies
- Current medications and conditions
- Emergency contact information
- Insurance details

**Staff Features:**
- Weekly availability scheduling
- Notification system for appointment activities
- File attachment management

### Database Performance

- **Connection Pooling:** Uses port 6543 (PgBouncer) for production
- **Connection Persistence:** 10-minute connection max age
- **Health Checks:** Automatic connection validation
- **Indexes:** Automatic indexing on foreign keys and primary keys
- **Ordering:** Optimized with timestamp-based ordering

### Detailed Schema Documentation

For complete schema documentation including all columns, relationships, constraints, and data types, see:
- [Complete Database Schema](../../../dorotheo-dental-clinic-website/backend/DATABASE_SCHEMA.md)

---

## Vector Database: Pinecone/ChromaDB

To power the AI chatbot's conversational abilities, we use **Pinecone** as our vector database. It stores high-dimensional vector embeddings of our clinic's knowledge base (FAQs, care instructions, etc.). This allows the RAG pipeline to perform rapid semantic searches to find the most relevant context for answering user queries, ensuring the chatbot's responses are accurate and grounded in factual data.