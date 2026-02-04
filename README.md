# Dental Clinic Management System for Dorotheo Dental Clinic

[![Status](https://img.shields.io/badge/status-in_development-orange)](https://github.com/APC-SoCIT/APC_2025_2026_T1_SS231_G07-DDC-Management-System/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A comprehensive, web-based Dental Clinic Management System integrated with a state-of-the-art AI chatbot to streamline clinic operations and enhance the patient experience.

---

## 📖 Table of Contents

- [Introduction](#-introduction)
- [System Features](#-system-features)
- [Limitations](#️-limitations)
- [Technology Stack](#️-technology-stack)
- [Repository Structure](#-repository-structure)
- [Project Documentation](#-project-documentation)
- [Our Team](#-our-team)

---

## 📜 Introduction

Modern dental clinics face significant operational challenges, with administrative staff managing a high volume of patient inquiries, scheduling, and information dissemination. This manual workload creates a substantial administrative burden, leading to increased costs and potential for error.

This project proposes a transformative solution: a web-based management system integrated with an advanced conversational AI. By automating routine administrative workflows, our system reduces the operational load on staff, allowing them to focus on high-value patient care and engagement activities.

---

## ✨ System Features

### 👥 User Roles
- **Patients** - Book appointments, view dental records, access interactive tooth chart
- **Staff/Dentists** - Manage patients, appointments, inventory, billing
- **Owner** - Full system access, analytics, staff management

### 🎯 Key Features

#### 📋 Patient Records Management
- ✅ **Unified Patient Database** - Central repository for all patient information and records
- ✅ **Expandable Patient Records** - Click to view/edit full medical history
- ✅ **Document Management** - Upload and manage X-rays, scans, and reports
- ✅ **Medical History Tracking** - Comprehensive patient medical history and allergies

#### 📅 Appointment Management
- ✅ **Centralized Scheduling** - Unified calendar accessible to staff across all branches
- ✅ **Complete Appointment Lifecycle** - Book → Confirm → Complete → Dental Record
- ✅ **Auto-mark Missed Appointments** - System automatically detects and marks missed appointments
- ✅ **Reschedule & Cancel Requests** - Patient request system with staff approval workflow
- ✅ **Real-Time Notifications** - Staff and owner receive instant notifications for all appointment actions
- ✅ **Multi-Dentist Support** - Assign appointments to specific dentists

#### 📦 Inventory Management
- ✅ **Supply Tracking** - Monitor dental supplies and materials in real-time
- ✅ **Low Stock Alerts** - Automatic notifications when inventory falls below reorder points
- ✅ **Usage Recording** - Track inventory consumption and costs
- ✅ **Reorder Management** - Manage supplier information and reorder schedules

#### 💰 Billing & Financial Management
- ✅ **Invoice Generation** - Create itemized bills for services and materials
- ✅ **Payment Tracking** - Record and monitor patient payments
- ✅ **Statement of Accounts** - Generate comprehensive billing summaries
- ✅ **Financial Analytics** - Revenue and expense tracking with detailed reports

#### 🔐 Security & Authentication
- ✅ **Email Authentication** - Secure token-based login system
- ✅ **Role-Based Access Control** - Different permissions for patients, staff, and owners
- ✅ **Secure Patient Portal** - Protected access to personal health information

#### 🎨 User Experience
- ✅ **Responsive Design** - Works seamlessly on desktop, tablet, and mobile devices
- ✅ **AI Chatbot** - Patient support assistant for common inquiries
- ✅ **Intuitive Interface** - User-friendly design for all user types
- ✅ **Real-Time Updates** - Live data synchronization across all users

---

## ⚠️ Limitations

- **Non-Diagnostic Tool:** The system is strictly for administrative and informational purposes. It will not provide any medical diagnoses, treatment advice, or clinical recommendations.
- **Technical Requirements:** All features require a stable internet connection to function. The voice input feature needs a modern web browser with microphone permissions enabled.
- **Data Migration:** The scope does not include the bulk migration or import of data from any pre-existing digital formats (like spreadsheets or other software). All initial data must be entered manually or scanned.
- **Third-Party Integrations:** The platform will operate as a self-contained system. It does not include integration with external software such as accounting systems (e.g., QuickBooks), online payment gateways for patient billing, or dedicated insurance claims processing platforms.
- **AI Performance:** The AI assistant is designed to be highly accurate, but like any language model, its performance is not infallible. There may be instances where it misinterprets complex queries or requires the user to rephrase a question for clarity. Its speech-to-text accuracy is also dependent on the user's audio quality.

---

## 🛠️ Technology Stack

This project leverages a modern, robust technology stack to deliver a seamless and intelligent user experience.

| Category             | Technology                                                              |
| -------------------- | ----------------------------------------------------------------------- |
| **Frontend** | **React**, **TypeScript**, **Tailwind CSS** |
| **Backend** | **Django REST Framework** (Python)                                      |
| **Databases** | **PostgreSQL** (Transactional), **Pinecone** (Vector Search for RAG)      |
| **AI & Orchestration** | **LangChain**, **OpenAI API** (GPT Models)                              |
| **Speech Recognition** | **ASR API** (e.g., OpenAI's Whisper)                                    |
| **Communication** | **REST API** |

---

## 📁 Repository Structure

This project is organized into a monorepo-like structure with distinct folders for each part of the application.

```plaintext
.
├── 📂 backend/         # Contains the Python (Django) backend server and API
├── 📂 docs/            # All project documentation, analysis, and design files
├── 📂 frontend/        # The React (TypeScript) single-page application
└── 📄 README.md         # You are here
```

---

## 📚 Project Documentation

For detailed information about the project's design, architecture, and deliverables, please refer to the documents within the `/docs` directory.

- **01 Analysis and Design Documents**  
  Contains all planning documents, including diagrams (Use Case, ERD), user stories, and test cases.  
  🔗 [View Documentation](https://github.com/APC-SoCIT/APC_2025_2026_T1_SS231_G07-DDC-Management-System/tree/main/docs/MSYADD1/01%20Analysis%20and%20design%20documents)

- **02 Technology Stack Definition and Implementation**  
  In-depth documentation for each component of the technology stack.  
  🔗 [View Documentation](https://github.com/APC-SoCIT/APC_2025_2026_T1_SS231_G07-DDC-Management-System/tree/main/docs/MSYADD1/02%20Technology%20Stack%20Definition%20and%20Implementation)

- **03 Midterm Deliverables**  
  Contains all project artifacts and reports submitted for midterm evaluation.  
  🔗 [View Documentation](https://github.com/APC-SoCIT/APC_2025_2026_T1_SS231_G07-DDC-Management-System/tree/main/docs/MSYADD1/03%20Midterm%20Deliverables)
  
- **04 Finals Deliverables**  
  Contains all project artifacts and reports submitted for finals evaluation.  
  🔗 [View Documentation](https://github.com/APC-SoCIT/APC_2025_2026_T1_SS231_G07-DDC-Management-System/tree/main/docs/MSYADD1/04%20Finals%20Deliverables)
  

---

## 👨‍💻 Our Team

This project is brought to you by the talented members of TechTalk.

| Name                   | Role            |
| --------------------   | --------------- |
| **Ezekiel Galauran**   | **Team Leader** |
| Gabriel Villanueva     | Member          |
| Airo Ravinera          | Member          |
| Michael Orenze         | Member          |
| Jasper Valdez          | Member          |

---

## 🚀 Getting Started

### Prerequisites
- Python 3.11 or higher
- Node.js 18 or higher  
- pnpm (recommended) or npm
- Git

---

### 🎯 Quick Start - Backend (RECOMMENDED)

#### Windows PowerShell (Recommended)
```powershell
cd dorotheo-dental-clinic-website\backend
.\setup.ps1
```

#### Windows Command Prompt
```cmd
cd dorotheo-dental-clinic-website\backend
setup.bat
```

#### Linux/Mac/Git Bash
```bash
cd dorotheo-dental-clinic-website/backend
chmod +x setup.sh
./setup.sh
```

**That's it!** The script will:
- ✅ Create virtual environment
- ✅ Install all dependencies  
- ✅ Set up database
- ✅ Create 3 clinic locations (Bacoor 🟢, Alabang 🔵, Poblacion 🟣)
- ✅ Create default user accounts
- ✅ Display login credentials

**Total time: ~2-3 minutes**

📖 **For detailed instructions**, see [backend/README.md](dorotheo-dental-clinic-website/backend/README.md)

---

### 🔧 Backend Manual Setup (If Scripts Don't Work)

<details>
<summary>Click to expand manual setup instructions</summary>

1. **Navigate to the backend directory:**
   ```powershell
   cd dorotheo-dental-clinic-website\backend
   ```

2. **Create virtual environment:**
   ```powershell
   python -m venv venv
   ```

3. **Activate the virtual environment:**
   ```powershell
   # Windows PowerShell
   .\venv\Scripts\Activate.ps1
   
   # Windows CMD
   venv\Scripts\activate.bat
   
   # Linux/Mac/Git Bash
   source venv/bin/activate
   ```

4. **Install dependencies:**
   ```powershell
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

5. **Run database migrations:**
   ```powershell
   python manage.py migrate
   ```

6. **Create clinic locations:**
   ```powershell
   python manage.py create_clinics
   ```

7. **Create initial accounts:**
   ```powershell
   python create_initial_accounts.py
   ```

8. **Start the development server:**
   ```powershell
   python manage.py runserver
   ```

</details>

The backend will be accessible at `http://127.0.0.1:8000/`.

**Default Login Credentials:**
- Owner: `owner@admin.dorotheo.com` / `owner123`
- Receptionist: `receptionist@gmail.com` / `Receptionist2546!`
- Dentist: `dentist@gmail.com` / `Dentist2546!`
- Patient: `airoravinera@gmail.com` / `Airo2546!`

---

### Frontend Setup (Local Development)

1. **Navigate to the frontend directory:**
   ```bash
   cd dorotheo-dental-clinic-website/frontend
   ```

2. **Install dependencies (first time only):**
   ```bash
   pnpm install
   ```
   *Or if using npm:*
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   pnpm dev
   ```
   *Or if using npm:*
   ```bash
   npm run dev
   ```

The frontend will be accessible at `http://localhost:3000/`.

**Note:** These commands are for local development only. For production deployment, refer to the deployment guides in the backend directory.
