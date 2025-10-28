# Database Schema Documentation

## Overview

The Dorotheo Dental Clinic Management System uses **PostgreSQL** hosted on **Supabase** as its primary transactional database. The database handles all structured data including patient records, appointments, billing, inventory, and user management.

---

## Database Technology Stack

### Primary Database: PostgreSQL via Supabase

- **Type:** Relational Database (PostgreSQL)
- **Hosting:** Supabase Cloud
- **Purpose:** Core transactional data persistence
- **Features:**
  - ACID compliance for data integrity
  - Real-time subscriptions via Supabase Realtime
  - Connection pooling for scalability
  - Automatic backups and point-in-time recovery

### Connection Details

- **Connection String Format:**
  ```
  postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true
  ```
- **Port:** 6543 (Connection Pooler) - **Recommended for production**
- **Alternative Port:** 5432 (Direct Connection) - For development only

---

## Database Schema

### Core Tables

#### 1. `api_user` - User Management

**Purpose:** Stores all user accounts (patients, staff, dentists, owner)

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| `id` | Integer | Primary key | AUTO_INCREMENT |
| `username` | String(150) | Unique username | UNIQUE, NOT NULL |
| `email` | String(254) | Email address | UNIQUE, NOT NULL |
| `password` | String(128) | Hashed password | NOT NULL |
| `first_name` | String(150) | User's first name | |
| `last_name` | String(150) | User's last name | |
| `user_type` | String(20) | User role type | CHOICES: patient, staff, owner |
| `role` | String(20) | Staff-specific role | CHOICES: '', receptionist, dentist |
| `phone` | String(20) | Contact phone number | |
| `address` | Text | Physical address | |
| `birthday` | Date | Date of birth | NULL |
| `age` | Integer | Age in years | NULL |
| `profile_picture` | File | Profile image | NULL, uploads to 'profiles/' |
| `is_active_patient` | Boolean | Patient activity status | DEFAULT: True |
| `is_archived` | Boolean | Archive status | DEFAULT: False |
| `is_active` | Boolean | Account active status | DEFAULT: True |
| `is_staff` | Boolean | Django admin access | DEFAULT: False |
| `is_superuser` | Boolean | Superuser status | DEFAULT: False |
| `created_at` | DateTime | Account creation date | AUTO_NOW_ADD |
| `last_login` | DateTime | Last login timestamp | NULL |

**Relationships:**
- One-to-Many: Appointments (as patient)
- One-to-Many: Appointments (as dentist)
- One-to-Many: Dental Records
- One-to-Many: Documents
- One-to-Many: Billings
- One-to-One: Tooth Chart
- One-to-One: Patient Intake Form

**Indexes:**
- Primary: `id`
- Unique: `username`, `email`

---

#### 2. `api_service` - Dental Services

**Purpose:** Catalog of all dental services offered by the clinic

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| `id` | Integer | Primary key | AUTO_INCREMENT |
| `name` | String(200) | Service name | NOT NULL |
| `category` | String(50) | Service category | CHOICES: all, orthodontics, restorations, xrays, oral_surgery, preventive |
| `description` | Text | Service description | NOT NULL |
| `image` | File | Service image | NULL, uploads to 'services/' |
| `created_at` | DateTime | Creation timestamp | AUTO_NOW_ADD |

**Categories:**
- `all` - All Services
- `orthodontics` - Orthodontics
- `restorations` - Restorations
- `xrays` - X-Rays
- `oral_surgery` - Oral Surgery
- `preventive` - Preventive Care

---

#### 3. `api_appointment` - Appointment Management

**Purpose:** Manages patient appointments with dentists

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| `id` | Integer | Primary key | AUTO_INCREMENT |
| `patient_id` | Integer | Patient reference | FK → api_user |
| `dentist_id` | Integer | Assigned dentist | FK → api_user, NULL |
| `service_id` | Integer | Requested service | FK → api_service, NULL |
| `date` | Date | Appointment date | NOT NULL |
| `time` | Time | Appointment time | NOT NULL |
| `status` | String(25) | Current status | CHOICES, DEFAULT: confirmed |
| `notes` | Text | Appointment notes | |
| `reschedule_date` | Date | Requested new date | NULL |
| `reschedule_time` | Time | Requested new time | NULL |
| `reschedule_service_id` | Integer | Requested new service | FK → api_service, NULL |
| `reschedule_dentist_id` | Integer | Requested new dentist | FK → api_user, NULL |
| `reschedule_notes` | Text | Reschedule reason/notes | |
| `cancel_reason` | Text | Cancellation reason | |
| `cancel_requested_at` | DateTime | Cancel request timestamp | NULL |
| `created_at` | DateTime | Creation timestamp | AUTO_NOW_ADD |
| `updated_at` | DateTime | Last update timestamp | AUTO_NOW |

**Status Values:**
- `pending` - Awaiting confirmation
- `confirmed` - Confirmed appointment
- `cancelled` - Cancelled by patient/staff
- `completed` - Appointment completed
- `missed` - Patient did not show up
- `reschedule_requested` - Patient requested reschedule
- `cancel_requested` - Patient requested cancellation

**Ordering:** `-date, -time` (Most recent first)

---

#### 4. `api_toothchart` - Tooth Chart Data

**Purpose:** Stores dental chart data for each patient

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| `id` | Integer | Primary key | AUTO_INCREMENT |
| `patient_id` | Integer | Patient reference | FK → api_user, UNIQUE |
| `chart_data` | JSON | Tooth chart structure | DEFAULT: {} |
| `notes` | Text | Chart notes | |
| `updated_at` | DateTime | Last update timestamp | AUTO_NOW |

**Relationship:** One-to-One with `api_user` (patient)

---

#### 5. `api_dentalrecord` - Dental Treatment Records

**Purpose:** Historical record of all dental treatments

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| `id` | Integer | Primary key | AUTO_INCREMENT |
| `patient_id` | Integer | Patient reference | FK → api_user |
| `appointment_id` | Integer | Related appointment | FK → api_appointment, NULL |
| `treatment` | Text | Treatment performed | NOT NULL |
| `diagnosis` | Text | Dental diagnosis | |
| `notes` | Text | Additional notes | |
| `created_by_id` | Integer | Staff who created record | FK → api_user, NULL |
| `created_at` | DateTime | Creation timestamp | AUTO_NOW_ADD |

**Ordering:** `-created_at` (Most recent first)

---

#### 6. `api_document` - Patient Documents

**Purpose:** Stores patient-related documents (X-rays, reports, etc.)

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| `id` | Integer | Primary key | AUTO_INCREMENT |
| `patient_id` | Integer | Patient reference | FK → api_user |
| `document_type` | String(20) | Type of document | CHOICES |
| `file` | File | Document file | uploads to 'documents/' |
| `title` | String(200) | Document title | NOT NULL |
| `description` | Text | Document description | |
| `uploaded_by_id` | Integer | Staff who uploaded | FK → api_user, NULL |
| `uploaded_at` | DateTime | Upload timestamp | AUTO_NOW_ADD |

**Document Types:**
- `xray` - X-Ray
- `scan` - Tooth Scan
- `report` - Report
- `other` - Other

**Ordering:** `-uploaded_at` (Most recent first)

---

#### 7. `api_inventoryitem` - Inventory Management

**Purpose:** Tracks dental supplies and materials inventory

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| `id` | Integer | Primary key | AUTO_INCREMENT |
| `name` | String(200) | Item name | NOT NULL |
| `category` | String(100) | Item category | NOT NULL |
| `quantity` | Integer | Current stock level | DEFAULT: 0 |
| `min_stock` | Integer | Minimum stock threshold | DEFAULT: 10 |
| `supplier` | String(200) | Supplier name | |
| `cost` | Decimal(10,2) | Unit cost | DEFAULT: 0.00 |
| `updated_at` | DateTime | Last update timestamp | AUTO_NOW |

**Computed Properties:**
- `is_low_stock` - Boolean (quantity <= min_stock)

---

#### 8. `api_billing` - Billing and Payments

**Purpose:** Manages patient billing and payment tracking

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| `id` | Integer | Primary key | AUTO_INCREMENT |
| `patient_id` | Integer | Patient reference | FK → api_user |
| `appointment_id` | Integer | Related appointment | FK → api_appointment, NULL |
| `amount` | Decimal(10,2) | Bill amount | NOT NULL |
| `description` | Text | Billing description | NOT NULL |
| `soa_file` | File | Statement of Account file | NULL, uploads to 'billing/' |
| `status` | String(20) | Payment status | CHOICES, DEFAULT: pending |
| `paid` | Boolean | Legacy paid flag | DEFAULT: False |
| `created_by_id` | Integer | Staff who created bill | FK → api_user, NULL |
| `created_at` | DateTime | Creation timestamp | AUTO_NOW_ADD |
| `updated_at` | DateTime | Last update timestamp | AUTO_NOW |

**Status Values:**
- `pending` - Payment pending
- `paid` - Payment completed
- `cancelled` - Bill cancelled

**Ordering:** `-created_at` (Most recent first)

---

#### 9. `api_cliniclocation` - Clinic Locations

**Purpose:** Stores clinic location information

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| `id` | Integer | Primary key | AUTO_INCREMENT |
| `name` | String(200) | Location name | NOT NULL |
| `address` | Text | Full address | NOT NULL |
| `phone` | String(20) | Contact phone | NOT NULL |
| `latitude` | Decimal(9,6) | GPS latitude | NULL |
| `longitude` | Decimal(9,6) | GPS longitude | NULL |

---

#### 10. `api_treatmentplan` - Treatment Plans

**Purpose:** Long-term treatment planning for patients

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| `id` | Integer | Primary key | AUTO_INCREMENT |
| `patient_id` | Integer | Patient reference | FK → api_user |
| `title` | String(200) | Plan title | NOT NULL |
| `description` | Text | Plan description | NOT NULL |
| `start_date` | Date | Plan start date | NOT NULL |
| `end_date` | Date | Plan end date | NULL |
| `status` | String(20) | Plan status | CHOICES, DEFAULT: planned |
| `created_by_id` | Integer | Staff who created plan | FK → api_user, NULL |
| `created_at` | DateTime | Creation timestamp | AUTO_NOW_ADD |

**Status Values:**
- `planned` - Planning phase
- `ongoing` - Currently active
- `completed` - Completed

---

#### 11. `api_teethimage` - Patient Teeth Images

**Purpose:** Stores uploaded images of patient teeth

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| `id` | Integer | Primary key | AUTO_INCREMENT |
| `patient_id` | Integer | Patient reference | FK → api_user |
| `image` | File | Teeth image file | uploads to 'teeth_images/' |
| `notes` | Text | Image notes | |
| `uploaded_by_id` | Integer | Staff who uploaded | FK → api_user, NULL |
| `is_latest` | Boolean | Latest image flag | DEFAULT: True |
| `uploaded_at` | DateTime | Upload timestamp | AUTO_NOW_ADD |

**Ordering:** `-uploaded_at` (Most recent first)

**Note:** When a new image is uploaded with `is_latest=True`, all other images for that patient are automatically set to `is_latest=False`.

---

#### 12. `api_staffavailability` - Staff Scheduling

**Purpose:** Manages weekly availability schedules for staff and dentists

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| `id` | Integer | Primary key | AUTO_INCREMENT |
| `staff_id` | Integer | Staff/dentist reference | FK → api_user |
| `day_of_week` | Integer | Day of week (0-6) | CHOICES: 0=Sunday, 6=Saturday |
| `is_available` | Boolean | Availability flag | DEFAULT: True |
| `start_time` | Time | Work start time | DEFAULT: 09:00 |
| `end_time` | Time | Work end time | DEFAULT: 17:00 |
| `created_at` | DateTime | Creation timestamp | AUTO_NOW_ADD |
| `updated_at` | DateTime | Last update timestamp | AUTO_NOW |

**Constraints:**
- Unique together: (`staff_id`, `day_of_week`)

**Ordering:** `day_of_week`

---

#### 13. `api_appointmentnotification` - Appointment Notifications

**Purpose:** Notifications for staff and owner about appointment activities

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| `id` | Integer | Primary key | AUTO_INCREMENT |
| `recipient_id` | Integer | Notification recipient | FK → api_user |
| `appointment_id` | Integer | Related appointment | FK → api_appointment |
| `notification_type` | String(30) | Notification type | CHOICES |
| `message` | Text | Notification message | NOT NULL |
| `is_read` | Boolean | Read status | DEFAULT: False |
| `created_at` | DateTime | Creation timestamp | AUTO_NOW_ADD |

**Notification Types:**
- `new_appointment` - New appointment created
- `reschedule_request` - Patient requested reschedule
- `cancel_request` - Patient requested cancellation
- `appointment_cancelled` - Appointment was cancelled

**Ordering:** `-created_at` (Most recent first)

---

#### 14. `api_dentistnotification` - Legacy Dentist Notifications

**Purpose:** Legacy notification system (kept for backward compatibility)

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| `id` | Integer | Primary key | AUTO_INCREMENT |
| `dentist_id` | Integer | Dentist reference | FK → api_user |
| `appointment_id` | Integer | Related appointment | FK → api_appointment |
| `notification_type` | String(30) | Notification type | CHOICES |
| `message` | Text | Notification message | NOT NULL |
| `is_read` | Boolean | Read status | DEFAULT: False |
| `created_at` | DateTime | Creation timestamp | AUTO_NOW_ADD |

**Note:** This model is deprecated. Use `api_appointmentnotification` instead.

**Ordering:** `-created_at` (Most recent first)

---

#### 15. `api_passwordresettoken` - Password Reset Tokens

**Purpose:** Manages password reset tokens for all users

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| `id` | Integer | Primary key | AUTO_INCREMENT |
| `user_id` | Integer | User reference | FK → api_user |
| `token` | String(100) | Reset token | UNIQUE, NOT NULL |
| `created_at` | DateTime | Token creation time | AUTO_NOW_ADD |
| `expires_at` | DateTime | Token expiration time | NOT NULL |
| `is_used` | Boolean | Token usage status | DEFAULT: False |

**Methods:**
- `is_valid()` - Returns True if token is not used and not expired

**Ordering:** `-created_at` (Most recent first)

---

#### 16. `api_patientintakeform` - Patient Intake Forms

**Purpose:** Stores initial patient intake form data

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| `id` | Integer | Primary key | AUTO_INCREMENT |
| `patient_id` | Integer | Patient reference | FK → api_user, UNIQUE |
| `allergies` | Text | Patient allergies | |
| `current_medications` | Text | Current medications | |
| `medical_conditions` | Text | Medical conditions | |
| `previous_dental_treatments` | Text | Dental treatment history | |
| `emergency_contact_name` | String(200) | Emergency contact name | |
| `emergency_contact_phone` | String(20) | Emergency contact phone | |
| `emergency_contact_relationship` | String(100) | Emergency contact relation | |
| `insurance_provider` | String(200) | Insurance company | |
| `insurance_policy_number` | String(100) | Policy number | |
| `dental_concerns` | Text | Current dental concerns | |
| `preferred_dentist` | String(200) | Preferred dentist name | |
| `filled_by_id` | Integer | Staff who filled form | FK → api_user, NULL |
| `created_at` | DateTime | Creation timestamp | AUTO_NOW_ADD |
| `updated_at` | DateTime | Last update timestamp | AUTO_NOW |

**Relationship:** One-to-One with `api_user` (patient)

---

#### 17. `api_fileattachment` - Patient File Attachments

**Purpose:** Stores various file attachments for patients

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| `id` | Integer | Primary key | AUTO_INCREMENT |
| `patient_id` | Integer | Patient reference | FK → api_user |
| `file` | File | Uploaded file | uploads to 'patient_files/YYYY/MM/DD/' |
| `file_type` | String(20) | Type of file | CHOICES, DEFAULT: document |
| `title` | String(200) | File title | NOT NULL |
| `description` | Text | File description | |
| `file_size` | Integer | File size in bytes | DEFAULT: 0 |
| `uploaded_by_id` | Integer | Staff who uploaded | FK → api_user, NULL |
| `uploaded_at` | DateTime | Upload timestamp | AUTO_NOW_ADD |

**File Types:**
- `xray` - X-Ray
- `photo` - Photo
- `document` - Document
- `report` - Report
- `other` - Other

**Methods:**
- `get_file_extension()` - Returns file extension (e.g., '.pdf')

**Ordering:** `-uploaded_at` (Most recent first)

---

#### 18. `api_clinicalnote` - Clinical Notes

**Purpose:** Stores clinical notes for patient visits

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| `id` | Integer | Primary key | AUTO_INCREMENT |
| `patient_id` | Integer | Patient reference | FK → api_user |
| `appointment_id` | Integer | Related appointment | FK → api_appointment, NULL |
| `content` | Text | Note content | NOT NULL |
| `author_id` | Integer | Note author | FK → api_user, NULL |
| `created_at` | DateTime | Creation timestamp | AUTO_NOW_ADD |
| `updated_at` | DateTime | Last update timestamp | AUTO_NOW |

**Ordering:** `-created_at` (Most recent first)

---

#### 19. `api_treatmentassignment` - Treatment Assignments

**Purpose:** Assigns specific treatments to patients

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| `id` | Integer | Primary key | AUTO_INCREMENT |
| `patient_id` | Integer | Patient reference | FK → api_user |
| `treatment_plan_id` | Integer | Related treatment plan | FK → api_treatmentplan, NULL |
| `treatment_name` | String(200) | Treatment name | NOT NULL |
| `description` | Text | Treatment description | |
| `status` | String(20) | Assignment status | CHOICES, DEFAULT: scheduled |
| `assigned_by_id` | Integer | Staff who assigned | FK → api_user, NULL |
| `assigned_dentist_id` | Integer | Assigned dentist | FK → api_user, NULL |
| `date_assigned` | DateTime | Assignment timestamp | AUTO_NOW_ADD |
| `scheduled_date` | Date | Scheduled treatment date | NULL |
| `completed_date` | Date | Completion date | NULL |
| `notes` | Text | Assignment notes | |

**Status Values:**
- `scheduled` - Treatment scheduled
- `ongoing` - Treatment in progress
- `completed` - Treatment completed
- `cancelled` - Treatment cancelled

**Ordering:** `-date_assigned` (Most recent first)

---

## Django System Tables

These tables are automatically created by Django:

### Authentication & Authorization

- **`auth_group`** - User groups for permissions
- **`auth_group_permissions`** - Group-permission mapping
- **`auth_permission`** - Available permissions
- **`authtoken_token`** - API authentication tokens

### Django Admin & System

- **`django_admin_log`** - Admin action history
- **`django_content_type`** - Content type registry
- **`django_migrations`** - Migration history
- **`django_session`** - Session data

---

## Relationships Diagram

```
api_user (Patient/Staff/Owner/Dentist)
    ├── One-to-Many: api_appointment (as patient)
    ├── One-to-Many: api_appointment (as dentist)
    ├── One-to-Many: api_dentalrecord
    ├── One-to-Many: api_document
    ├── One-to-Many: api_billing
    ├── One-to-Many: api_treatmentplan
    ├── One-to-Many: api_teethimage
    ├── One-to-Many: api_staffavailability
    ├── One-to-Many: api_appointmentnotification
    ├── One-to-Many: api_clinicalnote
    ├── One-to-Many: api_treatmentassignment
    ├── One-to-One: api_toothchart
    └── One-to-One: api_patientintakeform

api_service
    └── One-to-Many: api_appointment

api_appointment
    ├── Many-to-One: api_user (patient)
    ├── Many-to-One: api_user (dentist)
    ├── Many-to-One: api_service
    ├── One-to-Many: api_appointmentnotification
    └── One-to-Many: api_clinicalnote

api_treatmentplan
    └── One-to-Many: api_treatmentassignment
```

---

## Indexes and Performance

### Primary Keys
All tables have an auto-incrementing `id` as the primary key.

### Foreign Key Indexes
Django automatically creates indexes on all foreign key columns for optimal query performance.

### Unique Constraints
- `api_user.username` - UNIQUE
- `api_user.email` - UNIQUE
- `api_passwordresettoken.token` - UNIQUE
- `api_toothchart.patient_id` - UNIQUE
- `api_patientintakeform.patient_id` - UNIQUE
- `api_staffavailability.(staff_id, day_of_week)` - UNIQUE TOGETHER

### Ordering Indexes
Most models with `ordering` Meta option benefit from indexes on:
- Timestamp fields (`created_at`, `uploaded_at`)
- Date fields (`date`)
- Status fields

---

## Data Integrity

### Cascade Rules

**ON DELETE CASCADE:**
- When a user is deleted, their appointments, dental records, documents, etc. are deleted

**ON DELETE SET NULL:**
- When a dentist is deleted, appointments remain but dentist reference is set to NULL
- When a service is deleted, appointments remain but service reference is set to NULL

### Data Validation

**Django Model Validators:**
- Email format validation
- Choice field constraints
- Required field enforcement
- Max length constraints

**Database Constraints:**
- NOT NULL constraints
- UNIQUE constraints
- Foreign key constraints
- Check constraints (via Django)

---

## Migration History

Migrations are tracked in `django_migrations` table. To view migration history:

```bash
python manage.py showmigrations
```

To create new migrations after model changes:

```bash
python manage.py makemigrations
python manage.py migrate
```

---

## Database Maintenance

### Backup Strategy
- **Automated:** Supabase provides automatic daily backups
- **Point-in-time recovery:** Available for the last 7 days (Free tier)

### Monitoring
- Track slow queries via Supabase dashboard
- Monitor connection pool usage
- Review table sizes and growth trends

### Optimization Tips
1. Use connection pooling (port 6543)
2. Add `select_related()` and `prefetch_related()` for foreign key queries
3. Use database indexes for frequently queried fields
4. Archive old records instead of deleting
5. Regular VACUUM and ANALYZE operations (handled by Supabase)

---

## Environment Variables

### Required for Database Connection

```env
DATABASE_URL=postgresql://postgres.[PROJECT]:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true
```

### Django Settings

```python
DATABASES = {
    'default': dj_database_url.config(
        default=f'sqlite:///{BASE_DIR / "db.sqlite3"}',  # Fallback for local dev
        conn_max_age=600,  # Connection persistence (10 minutes)
        conn_health_checks=True,  # Health check before each request
    )
}
```

---

## API Endpoints

All database tables are accessible via REST API endpoints:

| Model | Endpoint | Methods |
|-------|----------|---------|
| User | `/api/users/` | GET, POST, PUT, DELETE |
| Service | `/api/services/` | GET, POST, PUT, DELETE |
| Appointment | `/api/appointments/` | GET, POST, PUT, DELETE |
| Dental Record | `/api/dental-records/` | GET, POST, PUT, DELETE |
| Billing | `/api/billing/` | GET, POST, PUT, DELETE |
| Treatment Plan | `/api/treatment-plans/` | GET, POST, PUT, DELETE |
| Inventory | `/api/inventory/` | GET, POST, PUT, DELETE |

Full API documentation available at: `/api/` (Django REST Framework browsable API)

---

## Security Considerations

### Authentication
- Token-based authentication (Django REST Framework)
- Session-based authentication for admin
- Password reset with time-limited tokens

### Authorization
- Role-based permissions (patient, staff, dentist, owner)
- Model-level permissions
- Field-level permissions via serializers

### Data Protection
- Passwords hashed with PBKDF2 (Django default)
- HTTPS enforced in production
- CORS configured for trusted origins
- SQL injection protection via Django ORM

### HIPAA Compliance Considerations
- Patient data encryption at rest (Supabase)
- Audit trails via `django_admin_log`
- Access control and authentication
- Secure file storage for medical documents

---

## Troubleshooting

### Common Issues

**Connection refused:**
- Check DATABASE_URL is correct
- Use connection pooler (port 6543)
- Verify Supabase project is running

**Migration conflicts:**
- Run `python manage.py makemigrations --merge`
- Resolve conflicts manually
- Apply migrations

**Slow queries:**
- Add database indexes
- Use `select_related()` for foreign keys
- Use `prefetch_related()` for reverse foreign keys
- Check Supabase query performance

**Table doesn't exist:**
- Run migrations: `python manage.py migrate`
- Check migration history: `python manage.py showmigrations`

---

## Future Enhancements

### Planned Features
- **Audit logging:** Track all data changes
- **Soft delete:** Instead of hard deletes, mark records as deleted
- **Data archival:** Automatic archival of old records
- **Analytics tables:** Pre-aggregated data for reporting
- **Real-time subscriptions:** Live updates via Supabase Realtime
- **Vector database integration:** For AI chatbot (Pinecone/ChromaDB)

---

## Related Documentation

- [Database Setup Guide](./DATABASE_SETUP.md)
- [Supabase Setup Guide](./SUPABASE_SETUP.md)
- [Railway Deployment Guide](./RAILWAY_DEPLOYMENT_GUIDE.md)
- [API Documentation](../docs/API.md)

---

**Last Updated:** October 28, 2025  
**Database Version:** PostgreSQL 15 (Supabase)  
**Total Tables:** 19 application tables + 8 Django system tables
