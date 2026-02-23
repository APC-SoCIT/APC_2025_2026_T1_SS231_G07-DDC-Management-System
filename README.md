# Dental Clinic Management System for Dorotheo Dental Clinic

[![Status](https://img.shields.io/badge/status-in_development-orange)](https://github.com/APC-SoCIT/APC_2025_2026_T1_SS231_G07-DDC-Management-System/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A web-based Dental Clinic Management System with an integrated AI chatbot, serving as a unified portal for managing clinic operations across multiple branch locations.

---

## 📖 Table of Contents

- [Introduction](#introduction)
- [System Features](#system-features)
- [Limitations](#limitations)
- [Technology Stack](#technology-stack)
- [Repository Structure](#repository-structure)
- [Project Documentation](#project-documentation)
- [Our Team](#our-team)
- [Getting Started](#getting-started)
- [Starting the Application](#starting-the-application)

---

## Introduction

Modern dental clinics often deal with fragmented workflows — patient records in one place, appointment scheduling in another, and billing handled separately. This project addresses that problem by providing a single, unified web portal where all core business processes are centralized. Staff and clinic owners can manage patients, appointments, inventory, and billing from one system, while patients get a dedicated portal to view their own records and interact with the clinic.

The system also features an AI-powered chatbot that assists patients with common inquiries and appointment scheduling through natural language conversation.

---

## System Features

**User Roles:** Patients, Staff (Receptionist/Dentist), and Owner — each with role-appropriate access and dashboards.

#### Patient Records
- Unified patient database across all clinic branches
- Document uploads (X-rays, scans, reports, dental images)
- Appointment History 

#### Appointment Management
- Multi-clinic scheduling with dentist-specific availability calendars
- Full appointment lifecycle: Pending → Confirmed → Waiting → Completed
- Patient-initiated reschedule and cancellation requests with staff approval
- Automated detection of missed appointments
- Real-time notifications for staff and owners on all appointment actions

#### Inventory Management
- Track dental supplies with quantity, supplier, and cost information per clinic
- Low stock alerts via in-app notifications and email when items fall below set thresholds
- Stock deductions automatically recorded when invoices are created for treatments

#### Billing & Payments
- Itemized invoice generation with PDF export
- Invoice and payment tracking
- Per-patient balance tracking (total invoiced, total paid, current balance)
- Payment splitting across multiple invoices
- Revenue and expense analytics with reporting

#### Security
- JWT-based authentication with role-based access control
- Email-based password reset with token expiry
- API rate limiting
- HIPAA-compliant audit logging for data access and modifications

#### AI Chatbot
- Powered by Google Gemini with RAG (Retrieval-Augmented Generation) for context-aware responses
- Handles appointment booking, rescheduling, and cancellation through conversation
- Multi-language support with automatic language detection
- Fallback system with circuit breaker pattern for high availability

---

## Limitations

- **Non-Diagnostic:** The system is for administrative purposes only — no medical diagnoses or treatment recommendations.
- **Internet Required:** All features require a stable internet connection.
- **No Data Migration:** Bulk import from existing digital records is not supported; data must be entered manually.
- **Self-Contained:** No integration with external accounting, payment gateway, or insurance platforms.
- **AI Accuracy:** The chatbot may occasionally misinterpret complex queries and require rephrasing.

---

## Technology Stack

| Category | Technology |
| --- | --- |
| **Frontend** | Next.js 14, React 19, TypeScript, Tailwind CSS v4, shadcn/ui |
| **Backend** | Django 4.2, Django REST Framework |
| **Database** | SQLite (development), PostgreSQL (production) |
| **AI** | Google Gemini 2.5 Flash, RAG with Gemini Embeddings |
| **File Storage** | Azure Blob Storage (production) |
| **Email** | Resend |
| **PDF Generation** | WeasyPrint |
| **Deployment** | Railway (backend), Vercel (frontend) |

---

## Repository Structure

```plaintext
.
├── dorotheo-dental-clinic-website/
│   ├── backend/          # Django REST API, AI chatbot, invoice generation
│   └── frontend/         # Next.js application (App Router, TypeScript)
├── project-documentation/
│   ├── academic-deliverables/   # Course deliverables (MSYADD1, MNTSDEV)
│   ├── business-requirements/   # Business requirements and use case analysis
│   ├── deployment-guides/       # Production deployment instructions
│   ├── features/                # Feature implementation documentation
│   ├── fixes-and-issues/        # Bug fixes and issue resolution logs
│   ├── multi-clinic/            # Multi-clinic feature documentation
│   ├── project-management/      # Project planning and management
│   ├── setup-guides/            # Local development setup guides
│   └── testing/                 # Test plans and results
└── README.md
```

---

## Project Documentation

All project documentation is organized in the `project-documentation/` directory.

| Folder | Description |
| --- | --- |
| `academic-deliverables/` | Course deliverables including analysis documents, tech stack definitions, and midterm/finals submissions |
| `business-requirements/` | Business requirements analysis, use case documentation, and gap analysis |
| `deployment-guides/` | Guides for deploying to Railway, Vercel, and Azure, including CORS and environment configuration |
| `features/` | Detailed documentation for major features (AI chatbot, audit controls, encryption, invoicing, payments) |
| `fixes-and-issues/` | Documented bug fixes, patches, and issue resolutions |
| `multi-clinic/` | Multi-clinic architecture and implementation details |
| `setup-guides/` | Step-by-step local development setup instructions |
| `testing/` | Test plans, test cases, and testing results |

---

## Our Team

This project is brought to you by the members of **TechTalk**.

| Name | Role |
| --- | --- |
| **Ezekiel Galauran** | **Team Leader** |
| Gabriel Villanueva | Member |
| Airo Ravinera | Member |
| Michael Orenze | Member |
| Jasper Valdez | Member |

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- pnpm (recommended) or npm

### Quick Start (Windows PowerShell)

```powershell
cd dorotheo-dental-clinic-website\backend
.\setup.ps1
```

The script handles everything: virtual environment, dependencies, database setup, clinic locations, default accounts, and frontend packages.

<details>
<summary><strong>Alternative setup scripts</strong></summary>

**Windows CMD:**
```cmd
cd dorotheo-dental-clinic-website\backend
setup.bat
```

**Linux/Mac/Git Bash:**
```bash
cd dorotheo-dental-clinic-website/backend
chmod +x setup.sh && ./setup.sh
```

> Note: `.bat` and `.sh` scripts set up the backend only. You will need to run `pnpm install` in the frontend directory separately.

</details>

<details>
<summary><strong>Manual setup (if scripts fail)</strong></summary>

```powershell
# Backend
cd dorotheo-dental-clinic-website\backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install --upgrade pip
pip install -r requirements.txt
python manage.py migrate
python manage.py create_clinics
python create_initial_accounts.py

# Frontend (new terminal)
cd dorotheo-dental-clinic-website\frontend
pnpm install
```

> `psycopg2-binary` may fail locally — this is expected. SQLite is used for local development; PostgreSQL is only needed in production.

</details>

### Default Login Credentials

| Role | Email | Password |
| --- | --- | --- |
| Owner | `owner@admin.dorotheo.com` | `owner123` |
| Receptionist | `receptionist@gmail.com` | `Receptionist2546!` |
| Dentist | `dentist@gmail.com` | `Dentist2546!` |
| Patient | `airoravinera@gmail.com` | `Airo2546!` |

---

## Starting the Application

Both servers must be running simultaneously.

**Backend** (in `dorotheo-dental-clinic-website/backend/`):
```powershell
.\venv\Scripts\Activate.ps1
python manage.py runserver
```
→ `http://localhost:8000`

**Frontend** (in `dorotheo-dental-clinic-website/frontend/`, separate terminal):
```powershell
pnpm dev
```
→ `http://localhost:3000`