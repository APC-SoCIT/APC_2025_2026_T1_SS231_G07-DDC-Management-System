-- Create a schema to hold the tables
CREATE SCHEMA IF NOT EXISTS final;

-- Set the search path to the 'final' schema
SET search_path TO final;

-- Create custom ENUM types if they don't already exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'service_category') THEN
        CREATE TYPE service_category AS ENUM('Preventive', 'Restorative', 'Cosmetic', 'Orthodontics');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'appointment_status') THEN
        CREATE TYPE appointment_status AS ENUM('Scheduled', 'Completed', 'Cancelled', 'No-Show');
    END IF;
END$$;

-- -----------------------------------------------------
-- Table "patient_medical_history"
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS "patient_medical_history" (
  "id" SERIAL PRIMARY KEY,
  "allergies" TEXT NULL,
  "medications" TEXT NULL,
  "conditions" TEXT NULL,
  "last_updated" TIMESTAMP NULL
);


-- -----------------------------------------------------
-- Table "user"
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS "user" (
  "id" SERIAL PRIMARY KEY,
  "f_name" VARCHAR(45) NULL,
  "l_name" VARCHAR(45) NULL,
  "email" VARCHAR(45) NOT NULL UNIQUE,
  "password_encrypted" VARCHAR(255) NULL,
  "date_of_creation" TIMESTAMP NULL,
  "last_login" TIMESTAMP NULL,
  "is_active" BOOLEAN NULL,
  "patient_medical_history_id" INT NOT NULL,
  CONSTRAINT "fk_user_patient_medical_history"
    FOREIGN KEY ("patient_medical_history_id")
    REFERENCES "patient_medical_history" ("id")
);


-- -----------------------------------------------------
-- Table "service"
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS "service" (
  "id" SERIAL PRIMARY KEY,
  "servicename" TEXT NULL,
  "servicedesc" TEXT NULL,
  "category" service_category NULL,
  "standard_duration_mins" INT NULL,
  "standard_price" NUMERIC(10,2) NULL
);


-- -----------------------------------------------------
-- Table "invoices"
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS "invoices" (
  "id" SERIAL PRIMARY KEY,
  "invoice_date" DATE NULL,
  "due_date" DATE NULL,
  "total_amount" NUMERIC(10,2) NULL,
  "insurance_billed_amount" NUMERIC(10,2) NULL,
  "patient_due_amount" NUMERIC(10,2) NULL,
  "status" VARCHAR(45) NULL
);


-- -----------------------------------------------------
-- Table "appointment"
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS "appointment" (
  "id" SERIAL PRIMARY KEY,
  "appointment_start_time" TIMESTAMP NULL,
  "appointment_end_time" TIMESTAMP NULL,
  "status" appointment_status NULL,
  "reason_for_visit" TEXT NULL,
  "notes" TEXT NULL,
  "created_at" TIMESTAMP NULL,
  "patient_id" INT NOT NULL,
  "staff_id" INT NOT NULL,
  "invoices_id" INT NOT NULL,
  CONSTRAINT "fk_appointment_patient"
    FOREIGN KEY ("patient_id")
    REFERENCES "user" ("id"),
  CONSTRAINT "fk_appointment_staff"
    FOREIGN KEY ("staff_id")
    REFERENCES "user" ("id"),
  CONSTRAINT "fk_appointment_invoices"
    FOREIGN KEY ("invoices_id")
    REFERENCES "invoices" ("id")
);


-- -----------------------------------------------------
-- Table "insurance_detail"
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS "insurance_detail" (
  "id" SERIAL PRIMARY KEY,
  "provider_name" VARCHAR(45) NOT NULL,
  "policy_number" VARCHAR(45) NOT NULL,
  "group_number" VARCHAR(45) NULL,
  "is_primary" BOOLEAN NULL,
  "user_id" INT NOT NULL,
  CONSTRAINT "fk_insurance_detail_user"
    FOREIGN KEY ("user_id")
    REFERENCES "user" ("id")
);


-- -----------------------------------------------------
-- Table "treatment_records"
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS "treatment_records" (
  "id" SERIAL PRIMARY KEY,
  "diagnosis" TEXT NULL,
  "treatment_performed" TEXT NULL,
  "tooth_numbers" VARCHAR(45) NULL,
  "prescriptions" TEXT NULL,
  "follow_up_notes" TEXT NULL,
  "record_date" TIMESTAMP NULL,
  "appointment_id" INT NOT NULL,
  CONSTRAINT "fk_treatment_records_appointment"
    FOREIGN KEY ("appointment_id")
    REFERENCES "appointment" ("id")
);


-- -----------------------------------------------------
-- Table "payment"
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS "payment" (
  "id" SERIAL PRIMARY KEY,
  "payment_date" TIMESTAMP NULL,
  "amount" NUMERIC(10,2) NULL,
  "payment_method" VARCHAR(45) NULL,
  "transaction_id" VARCHAR(45) NULL,
  "invoices_id" INT NOT NULL,
  CONSTRAINT "fk_payment_invoices"
    FOREIGN KEY ("invoices_id")
    REFERENCES "invoices" ("id")
);


-- -----------------------------------------------------
-- Table "role"
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS "role" (
  "id" SERIAL PRIMARY KEY,
  "title" VARCHAR(45) NULL,
  "description" VARCHAR(45) NULL,
  "user_id" INT NOT NULL,
  CONSTRAINT "fk_role_user"
    FOREIGN KEY ("user_id")
    REFERENCES "user" ("id")
);


-- -----------------------------------------------------
-- Table "appointment_has_service" (Junction Table)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS "appointment_has_service" (
  "id" SERIAL PRIMARY KEY,
  "appointment_id" INT NOT NULL,
  "service_id" INT NOT NULL,
  CONSTRAINT "fk_appointment_has_service_appointment"
    FOREIGN KEY ("appointment_id")
    REFERENCES "appointment" ("id"),
  CONSTRAINT "fk_appointment_has_service_service"
    FOREIGN KEY ("service_id")
    REFERENCES "service" ("id")
);