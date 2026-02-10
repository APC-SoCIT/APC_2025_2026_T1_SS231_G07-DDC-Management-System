# 02 Technology Stack Definition and Implementation

This directory provides a detailed breakdown of the technology stack selected for the **Dental Clinic Management System**. Each subfolder contains in-depth documentation, justification, and implementation details for its respective component.

---

## 🛠️ Technology Stack Overview

The following table summarizes the core technologies that power this project.

| Category             | Selected Technology                                                     |
| -------------------- | ----------------------------------------------------------------------- |
| **Frontend** | **React**, **TypeScript**, **Tailwind CSS** |
| **Backend** | **Django REST Framework** (Python)                                      |
| **Databases** | **PostgreSQL** (Transactional), **Pinecone** (Vector Search)                    |
| **AI & Orchestration** | **LangChain**, **OpenAI API** |
| **Communication** | **REST API** |

---

## 📂 Documentation Index

Navigate to the relevant folder for specific documentation on each part of the stack.

- **[021 Frontend Framework](./021%20Frontend%20Framework/)**
  - **Technology:** React
  - **Contents:** Documentation on the frontend architecture, key libraries, component structure, and state management.

- **[022 Backend Framework](./022%20Backend%20Framework/)**
  - **Technology:** Django REST Framework (Python)
  - **Contents:** Details on the backend architecture, API endpoint specifications, data models, and business logic.

- **[023 Realtime Cloud Database](./023%20Realtime%20Cloud%20database/)**
  - **Technology:** PostgreSQL & Pinecone
  - **Contents:** Covers the database schemas for both the transactional (PostgreSQL) and vector (Pinecone) databases.

- **[024 Cloud Integration Workflow Services](./024%20Cloud%20integration%20workflow%20services/)**
  - **Status:** Not Applicable
  - **Contents:** This section is not used as the project does not rely on external workflow services like Zapier or n8n.

- **[025 Prebuilt Open Source Solutions](./025%20Prebuilt%20Open%20Source%20solutions/)**
  - **Status:** Not Applicable
  - **Contents:** This section is not used as the project is a custom-built solution.

- **[026 Frontend Backend Communication](./026%20Frontend%20Backend%20communication/)**
  - **Technology:** REST API
  - **Contents:** Documents the API communication protocol, authentication methods, and data exchange formats (JSON).

- **[027 Others](./027%20Others/)**
  - **Contents:** Contains documentation for other key technologies and strategies, such as the AI services (LangChain, OpenAI) and the overall deployment plan.