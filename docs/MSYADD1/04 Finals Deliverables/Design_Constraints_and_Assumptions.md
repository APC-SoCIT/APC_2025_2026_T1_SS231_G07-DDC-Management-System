# Design and Implementation Constraints & Assumptions
## Dorotheo Dental Clinic Management System

**Version 1.0**  
**Date:** December 4, 2025  
**Prepared by:** APC_2025_2026_T1_SS231_G07 - TechTalk

---

## 2.1 Design and Implementation Constraints

This section describes the constraints, limitations, and requirements that will restrict the design and implementation choices available to the development team for the Dorotheo Dental Clinic Management System.

### 2.1.1 Software Development Methodology

**COMET (Concurrent Object Modeling and Architectural Design Method)**

The system MUST be designed using the **COMET methodology**, a use case-based software development method for concurrent, distributed, and real-time applications.

- **Reference:** Gomaa, H. (2011). *Software Modeling and Design: UML, Use Cases, Patterns, and Software Architectures*. Cambridge University Press.
- **Rationale:** COMET provides a systematic approach to software design that aligns with our distributed web-based architecture and supports iterative development.
- **Application:** The team will follow COMET's phases including requirements modeling, analysis modeling, design modeling, and incremental software construction.

**UML (Unified Modeling Language)**

All system modeling and design documentation SHALL be created using **UML 2.5** notation standards.

- **Reference:** Object Management Group (OMG). (2015). *OMG Unified Modeling Language (OMG UML), Version 2.5*. Available at: https://www.omg.org/spec/UML/2.5/
- **Required Diagrams:**
  - Use Case Diagrams (functional requirements)
  - Class Diagrams (system structure)
  - Sequence Diagrams (interaction flows)
  - Activity Diagrams (business processes)
  - Deployment Diagrams (system architecture)
  - Entity Relationship Diagrams (database schema)
- **Tools:** Visual Paradigm, Lucidchart, or PlantUML for UML diagram creation

### 2.1.2 Technology Stack Constraints

#### Frontend Technology Constraints

**Framework: Next.js 15.x**
- The frontend MUST be built using Next.js (React framework) version 15.x or later
- **Constraint Reason:** Next.js provides server-side rendering, routing, and performance optimizations essential for our web application
- **Impact:** Development team must have React and Next.js expertise

**Language: TypeScript**
- All frontend code MUST be written in TypeScript (not plain JavaScript)
- **Constraint Reason:** Type safety reduces bugs and improves code maintainability
- **Impact:** Requires stricter coding discipline and TypeScript knowledge

**Styling: Tailwind CSS 4.x**
- UI styling SHALL use Tailwind CSS utility-first framework
- **Constraint Reason:** Ensures consistent design system and rapid UI development
- **Impact:** Designers and developers must follow Tailwind conventions

**UI Components: shadcn/ui and Radix UI**
- Pre-built components SHALL be sourced from shadcn/ui component library
- Accessibility primitives MUST use Radix UI
- **Constraint Reason:** Ensures accessibility compliance (WCAG 2.1 AA) and consistent UX
- **Impact:** Limited to available component patterns

#### Backend Technology Constraints

**Framework: Django 4.2.x**
- Backend API MUST be built using Django web framework version 4.2 or later
- **Constraint Reason:** Django provides robust ORM, admin interface, and security features
- **Impact:** Team must have Python and Django expertise

**API Architecture: Django REST Framework (DRF) 3.14+**
- All APIs SHALL be RESTful and built with Django REST Framework
- **Constraint Reason:** Standardized API design and automatic API documentation
- **Impact:** Must follow REST principles and DRF conventions

**Language: Python 3.11+**
- All backend code MUST be written in Python 3.11 or later
- **Constraint Reason:** Performance improvements and modern Python features
- **Impact:** Development environment must support Python 3.11+

#### Database Constraints

**Development Database: SQLite**
- Local development SHALL use SQLite database
- **Constraint Reason:** Zero-configuration, lightweight, sufficient for development
- **Impact:** Limited to single-user development scenarios

**Production Database: PostgreSQL 16+**
- Production deployment MUST use PostgreSQL (hosted on Supabase)
- **Constraint Reason:** ACID compliance, scalability, and advanced features
- **Impact:** Production queries must be PostgreSQL-compatible

**ORM: Django ORM**
- All database operations SHALL use Django's Object-Relational Mapper
- **Constraint Reason:** Database abstraction and migration management
- **Impact:** Direct SQL queries are discouraged; must use ORM query syntax

### 2.1.3 Deployment and Hosting Constraints

**Frontend Hosting: Vercel**
- The Next.js frontend MUST be deployed on Vercel platform
- **Constraint Reason:** Optimal Next.js performance and automatic deployments
- **Impact:** Must comply with Vercel's serverless architecture limitations

**Backend Hosting: Railway or Render**
- The Django backend MUST be deployed on Railway or Render cloud platform
- **Constraint Reason:** Cost-effective, Python-friendly PaaS with database integration
- **Impact:** Must work within platform's resource limits (memory, CPU)

**HTTPS Requirement**
- All production deployments SHALL use HTTPS/TLS encryption
- **Constraint Reason:** Security best practice and browser requirements
- **Impact:** SSL certificates must be configured and maintained

### 2.1.4 Performance Constraints

**Response Time**
- API responses MUST complete within 2 seconds for 95% of requests
- Page load time SHALL be under 3 seconds on standard broadband connections
- **Impact:** Database queries must be optimized; consider caching strategies

**Concurrent Users**
- System MUST support at least 50 concurrent users without degradation
- **Constraint Reason:** Typical clinic staff (5-10) plus patients accessing portal
- **Impact:** Requires connection pooling and efficient resource management

**Database Size**
- System SHALL efficiently handle databases with 10,000+ patient records
- **Impact:** Proper indexing and pagination required for large datasets

### 2.1.5 Security Constraints

**Authentication: JWT (JSON Web Tokens)**
- User authentication MUST use token-based authentication (JWT)
- **Constraint Reason:** Stateless authentication for REST APIs
- **Impact:** Token expiration, refresh logic, and secure storage required

**Password Security**
- Passwords MUST be hashed using Django's PBKDF2 algorithm
- **Constraint Reason:** Industry-standard password security
- **Impact:** Cannot store or retrieve plain-text passwords

**CORS (Cross-Origin Resource Sharing)**
- API SHALL enforce CORS policies restricting access to authorized domains
- **Constraint Reason:** Prevent unauthorized API access
- **Impact:** Frontend domain must be whitelisted in backend configuration

**Data Privacy Compliance**
- System MUST comply with Philippine Data Privacy Act of 2012
- **Constraint Reason:** Legal requirement for handling personal health information
- **Impact:** Requires user consent, data encryption, and audit trails

### 2.1.6 Browser and Device Compatibility

**Supported Browsers**
- System MUST support:
  - Google Chrome 100+ (primary)
  - Mozilla Firefox 100+
  - Microsoft Edge 100+
  - Safari 15+ (macOS/iOS)
- **Constraint Reason:** Modern browser features (ES6+, CSS Grid, etc.)
- **Impact:** Cannot support Internet Explorer or older browsers

**Responsive Design**
- UI MUST be responsive and functional on:
  - Desktop (1920x1080 and 1366x768)
  - Tablet (1024x768 and 768x1024)
  - Mobile (375x667 and 414x896)
- **Constraint Reason:** Multi-device accessibility requirement
- **Impact:** All components must be tested across breakpoints

**Internet Connectivity**
- System requires stable internet connection (minimum 1 Mbps)
- **Constraint Reason:** Cloud-based architecture with no offline mode
- **Impact:** Users without internet cannot access the system

### 2.1.7 Third-Party Dependencies

**Payment Gateway Limitation**
- Current version does NOT integrate with online payment processors (PayPal, Stripe)
- **Constraint Reason:** Scope limitation and cost considerations
- **Impact:** Payments must be recorded manually by staff

**No Integration with External Systems**
- System does NOT integrate with:
  - Accounting software (QuickBooks, Xero)
  - Insurance claims platforms
  - Laboratory information systems
  - Pharmacy systems
- **Constraint Reason:** Complexity and API availability limitations
- **Impact:** Manual data entry required for external systems

### 2.1.8 Programming Standards and Conventions

**Code Style**
- Python code MUST follow PEP 8 style guide
- TypeScript code MUST follow ESLint Airbnb configuration
- **Impact:** Code reviews will enforce style compliance

**Documentation**
- All functions and classes MUST have docstrings (Python) or JSDoc comments (TypeScript)
- **Impact:** Increases development time but improves maintainability

**Version Control**
- All code MUST be managed in Git with meaningful commit messages
- Branching strategy: feature branches merged via pull requests
- **Impact:** No direct commits to main branch; requires code review

### 2.1.9 Accessibility Requirements

**WCAG 2.1 Level AA Compliance**
- UI components MUST meet Web Content Accessibility Guidelines 2.1 Level AA
- **Constraint Reason:** Legal and ethical obligation for accessibility
- **Impact:** Requires semantic HTML, ARIA labels, keyboard navigation, and color contrast compliance

### 2.1.10 Maintenance and Support Constraints

**Client Maintenance Responsibility**
- Dorotheo Dental Clinic will be responsible for:
  - Content updates (services, staff information)
  - User account management
  - Backup verification
- **Impact:** System must have user-friendly admin interfaces

**Development Team Support Window**
- Post-deployment support limited to 6 months (academic project timeline)
- **Impact:** System must be well-documented for future maintainers

---

## 2.2 Assumptions and Dependencies

This section lists critical assumptions that could affect the system requirements and identifies dependencies on external factors.

### 2.2.1 Environmental Assumptions

**Assumption 1: Internet Availability**
- **Assumption:** Dorotheo Dental Clinic has reliable, high-speed internet connectivity (minimum 10 Mbps) at all clinic locations.
- **Impact if Incorrect:** System will be unusable during internet outages. May require offline mode development.
- **Mitigation:** Verify clinic's internet infrastructure before deployment.

**Assumption 2: Device Availability**
- **Assumption:** Clinic staff have access to modern computers (Windows 10+, macOS 11+, or equivalent) with up-to-date browsers.
- **Impact if Incorrect:** Staff may experience compatibility issues or poor performance.
- **Mitigation:** Conduct device audit before deployment; provide minimum hardware requirements.

**Assumption 3: Staff Technical Literacy**
- **Assumption:** Clinic staff have basic computer skills (can use web browsers, fill forms, navigate interfaces).
- **Impact if Incorrect:** Extensive training required; may delay adoption.
- **Mitigation:** Provide comprehensive user training and documentation.

### 2.2.2 Data Assumptions

**Assumption 4: No Existing Digital Data**
- **Assumption:** Clinic does not have existing digital patient records that need bulk migration.
- **Impact if Incorrect:** Manual data entry will be time-consuming and error-prone.
- **Mitigation:** Develop data import scripts if legacy data exists.

**Assumption 5: Patient Contact Information Accuracy**
- **Assumption:** Patients will provide accurate email addresses and phone numbers for authentication and notifications.
- **Impact if Incorrect:** Notification system (email, potential SMS) will fail for some users.
- **Mitigation:** Implement contact information verification during registration.

**Assumption 6: Data Volume Growth**
- **Assumption:** Patient database will grow at ~500 new patients per year (based on clinic estimates).
- **Impact if Incorrect:** Database and hosting may be under-provisioned or over-provisioned.
- **Mitigation:** Monitor growth and scale infrastructure as needed.

### 2.2.3 Business Process Assumptions

**Assumption 7: Single-Clinic Initial Deployment**
- **Assumption:** Initial deployment will be for Dorotheo Dental Clinic's primary location only.
- **Impact if Incorrect:** Multi-location features may be incomplete or untested.
- **Mitigation:** Multi-location architecture is built-in but can be enabled later.

**Assumption 8: Standard Appointment Duration**
- **Assumption:** Most appointments follow standard time slots (30 min, 1 hour, etc.).
- **Impact if Incorrect:** Scheduling logic may not accommodate variable-length procedures.
- **Mitigation:** Allow custom appointment durations in booking interface.

**Assumption 9: Manual Payment Processing**
- **Assumption:** Clinic staff will manually process payments and update system records (no online payment).
- **Impact if Incorrect:** May require payment gateway integration (additional cost and development).
- **Mitigation:** Design system to support future payment gateway integration.

### 2.2.4 Technical Dependencies

**Dependency 1: Third-Party Frameworks**
- **Dependency:** System relies on Next.js, Django, React, and other open-source frameworks maintained by third parties.
- **Risk:** Framework updates may introduce breaking changes; security vulnerabilities may be discovered.
- **Mitigation:** Pin dependency versions; monitor security advisories; plan for regular updates.

**Dependency 2: Cloud Platform Availability**
- **Dependency:** System depends on Vercel (frontend) and Railway/Render (backend) platform uptime and reliability.
- **Risk:** Platform outages will make system inaccessible.
- **Mitigation:** Choose platforms with 99.9%+ uptime SLA; have backup/migration plan.

**Dependency 3: Supabase PostgreSQL**
- **Dependency:** Production database hosted on Supabase cloud platform.
- **Risk:** Supabase service interruption or data loss could be catastrophic.
- **Mitigation:** Enable automated backups; test disaster recovery procedures.

**Dependency 4: DNS and Domain Name**
- **Dependency:** System requires a registered domain name and DNS configuration.
- **Risk:** Domain expiration or DNS misconfiguration will break access.
- **Mitigation:** Set domain auto-renewal; document DNS configuration.

### 2.2.5 Component Reuse Dependencies

**Dependency 5: shadcn/ui Component Library**
- **Dependency:** UI components sourced from shadcn/ui open-source library.
- **Risk:** Components may have bugs or lack certain features.
- **Mitigation:** Test components thoroughly; be prepared to customize or replace.

**Dependency 6: Django REST Framework**
- **Dependency:** API functionality depends on DRF's serializers, viewsets, and authentication classes.
- **Risk:** DRF updates may change behavior or deprecate features.
- **Mitigation:** Follow DRF best practices; test thoroughly after updates.

### 2.2.6 User Behavior Assumptions

**Assumption 10: Patient Portal Adoption**
- **Assumption:** At least 50% of patients will actively use the patient portal for appointments and records.
- **Impact if Incorrect:** Portal development effort may not provide expected ROI.
- **Mitigation:** Market the portal to patients; gather feedback and improve UX.

**Assumption 11: Browser Usage**
- **Assumption:** Users will access the system via Chrome, Firefox, Edge, or Safari (not IE or outdated browsers).
- **Impact if Incorrect:** Users with old browsers will experience errors or incompatibility.
- **Mitigation:** Display browser compatibility warning; recommend browser upgrades.

### 2.2.7 Regulatory and Compliance Assumptions

**Assumption 12: No HIPAA Compliance Required**
- **Assumption:** System is deployed in the Philippines and does not need to comply with U.S. HIPAA regulations.
- **Impact if Incorrect:** Significant additional compliance requirements and documentation.
- **Mitigation:** Confirm jurisdiction and applicable regulations with legal counsel.

**Assumption 13: Philippine Data Privacy Act Compliance Sufficient**
- **Assumption:** Compliance with Philippine Data Privacy Act of 2012 is sufficient for legal operation.
- **Impact if Incorrect:** May face legal penalties or need to implement additional safeguards.
- **Mitigation:** Consult with data privacy officer or legal expert.

### 2.2.8 Development Environment Assumptions

**Assumption 14: Development Team Access**
- **Assumption:** Development team has access to:
  - GitHub for version control
  - Local development machines with Python 3.11+ and Node.js 18+
  - Cloud platform accounts (Vercel, Railway, Supabase)
  - Communication tools (Discord, email)
- **Impact if Incorrect:** Development workflow disrupted.
- **Mitigation:** Provision all required accounts and tools at project start.

**Assumption 15: Academic Timeline**
- **Assumption:** Project must be completed within one academic semester (approximately 4 months).
- **Impact if Incorrect:** Scope may need to be reduced or timeline extended.
- **Mitigation:** Prioritize features; use agile methodology for iterative delivery.

### 2.2.9 Financial Assumptions

**Assumption 16: Free-Tier Cloud Services**
- **Assumption:** Development and initial deployment can use free tiers of Vercel, Railway, and Supabase.
- **Impact if Incorrect:** May incur unexpected hosting costs.
- **Mitigation:** Monitor usage; plan for potential upgrade to paid tiers.

**Assumption 17: No SMS Notification Costs Initially**
- **Assumption:** SMS notifications (if implemented) will be deferred or use a free-tier service initially.
- **Impact if Incorrect:** SMS costs could be significant with high usage.
- **Mitigation:** Make SMS optional; monitor costs closely.

### 2.2.10 Client Collaboration Assumptions

**Assumption 18: Client Availability for Feedback**
- **Assumption:** Dorotheo Dental Clinic owner and staff will be available for requirements clarification, UAT, and feedback sessions.
- **Impact if Incorrect:** Requirements misunderstandings could lead to rework.
- **Mitigation:** Schedule regular client meetings; document all decisions.

**Assumption 19: Client Provides Test Data**
- **Assumption:** Client will provide sample patient data (anonymized) for testing.
- **Impact if Incorrect:** Testing may use unrealistic synthetic data.
- **Mitigation:** Create realistic test data based on typical clinic operations.

---

## 2.3 Summary of Critical Risks

Based on the constraints and assumptions above, the following are HIGH-RISK items that could significantly impact the project:

| Risk ID | Risk Description | Probability | Impact | Mitigation Strategy |
|---------|------------------|-------------|--------|---------------------|
| R-01 | Cloud platform (Vercel/Railway) outage during demo/deployment | Low | High | Have local development build ready as backup |
| R-02 | Team members lack expertise in Next.js or Django | Medium | High | Allocate time for training; pair programming |
| R-03 | Client changes requirements significantly mid-project | Medium | High | Use agile methodology; formal change control process |
| R-04 | Database migration from SQLite to PostgreSQL fails | Low | High | Test migration early and often; have rollback plan |
| R-05 | Browser compatibility issues discovered late | Low | Medium | Test on all supported browsers throughout development |
| R-06 | Performance issues with large datasets | Medium | Medium | Load testing with realistic data; optimize queries early |
| R-07 | Dependency updates break existing functionality | Medium | Medium | Pin versions; test updates in staging before production |
| R-08 | Academic timeline constraint forces scope reduction | High | Medium | Prioritize features by business value; have MVP defined |

---

## References

1. Gomaa, H. (2011). *Software Modeling and Design: UML, Use Cases, Patterns, and Software Architectures*. Cambridge University Press. ISBN: 978-0521764148.

2. Object Management Group (OMG). (2015). *OMG Unified Modeling Language (OMG UML), Version 2.5*. Retrieved from https://www.omg.org/spec/UML/2.5/

3. Republic of the Philippines. (2012). *Data Privacy Act of 2012 (Republic Act No. 10173)*. Official Gazette. Retrieved from https://www.officialgazette.gov.ph/2012/08/15/republic-act-no-10173/

4. World Wide Web Consortium (W3C). (2018). *Web Content Accessibility Guidelines (WCAG) 2.1*. Retrieved from https://www.w3.org/TR/WCAG21/

5. Van Rossum, G., Warsaw, B., & Coghlan, N. (2001). *PEP 8 – Style Guide for Python Code*. Python.org. Retrieved from https://www.python.org/dev/peps/pep-0008/

---

**Document Version:** 1.0  
**Last Updated:** December 4, 2025  
**Status:** Final

---

*This document is part of the Software Requirements Specification for the Dorotheo Dental Clinic Management System and should be read in conjunction with the complete SRS document.*
