import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Privacy Policy — Dorotheo Dental Clinic",
  description:
    "Privacy Policy for the Dorotheo Dental Clinic Management System, compliant with the Philippine Data Privacy Act of 2012 (RA 10173).",
}

/**
 * Policy version identifier — increment when material changes are made.
 * This must stay in sync with the backend `policy_version` default on the User model.
 */
export const POLICY_VERSION = "1.0"
const EFFECTIVE_DATE = "February 25, 2026"

export default function PrivacyPolicyPage() {
  return (
    <article className="prose prose-gray max-w-none">
      {/* Title */}
      <h1 className="text-3xl sm:text-4xl font-display font-bold text-[var(--color-primary)] mb-2">
        Privacy Policy
      </h1>
      <p className="text-sm text-[var(--color-text-muted)] mb-8">
        Version {POLICY_VERSION} &middot; Effective {EFFECTIVE_DATE}
      </p>

      {/* ------------------------------------------------------------------ */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-[var(--color-primary)] mb-3">
          1. Introduction
        </h2>
        <p className="text-[var(--color-text)] leading-relaxed mb-3">
          Welcome to the Dorotheo Dental Clinic Management System (the &ldquo;System&rdquo;),
          operated by Dorotheo Dental Clinic (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;).
          We are committed to protecting and respecting your personal information in
          accordance with Republic Act No. 10173 — the{" "}
          <strong>Data Privacy Act of 2012 (DPA)</strong> — and its Implementing
          Rules and Regulations (IRR), as enforced by the National Privacy Commission
          (NPC) of the Philippines.
        </p>
        <p className="text-[var(--color-text)] leading-relaxed">
          This Privacy Policy explains how we collect, use, store, share, and
          protect your personal and sensitive personal information when you use our
          System. By registering for an account or using the System, you
          acknowledge that you have read and understood this policy.
        </p>
      </section>

      {/* ------------------------------------------------------------------ */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-[var(--color-primary)] mb-3">
          2. Information We Collect
        </h2>
        <p className="text-[var(--color-text)] leading-relaxed mb-3">
          We may collect the following categories of personal data:
        </p>

        <h3 className="text-lg font-medium text-[var(--color-primary-light)] mb-2">
          2.1 Personal Information
        </h3>
        <ul className="list-disc list-inside text-[var(--color-text)] space-y-1 mb-3">
          <li>Full name, date of birth, gender, and contact number</li>
          <li>Email address (used as your login identifier)</li>
          <li>Home or mailing address</li>
          <li>Emergency contact details</li>
        </ul>

        <h3 className="text-lg font-medium text-[var(--color-primary-light)] mb-2">
          2.2 Sensitive Personal Information (Health Data)
        </h3>
        <ul className="list-disc list-inside text-[var(--color-text)] space-y-1 mb-3">
          <li>Dental and medical history, diagnoses, and treatment records</li>
          <li>Treatment plans, clinical notes, and prescriptions</li>
          <li>Dental images, x-rays, and uploaded documents</li>
          <li>Appointment history and status</li>
        </ul>

        <h3 className="text-lg font-medium text-[var(--color-primary-light)] mb-2">
          2.3 Technical &amp; Usage Data
        </h3>
        <ul className="list-disc list-inside text-[var(--color-text)] space-y-1">
          <li>IP address, browser type, device information</li>
          <li>Usage logs (pages visited, features used, timestamps)</li>
          <li>Chatbot conversation logs (used solely to provide and improve the AI assistant service)</li>
        </ul>
      </section>

      {/* ------------------------------------------------------------------ */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-[var(--color-primary)] mb-3">
          3. How We Use Your Information
        </h2>
        <p className="text-[var(--color-text)] leading-relaxed mb-3">
          We process your information for the following lawful purposes under the DPA:
        </p>
        <ul className="list-disc list-inside text-[var(--color-text)] space-y-1">
          <li>
            <strong>Performance of a contract:</strong> Scheduling appointments, providing dental services,
            processing payments, and managing your patient account.
          </li>
          <li>
            <strong>Consent:</strong> Sending appointment reminders, promotional communications, and
            using the AI chatbot assistant to help you with clinic inquiries.
          </li>
          <li>
            <strong>Legitimate interest:</strong> Improving clinic operations, analytics, and maintaining
            the security and integrity of the System.
          </li>
          <li>
            <strong>Legal obligation:</strong> Complying with legal, regulatory, and professional requirements
            related to healthcare record-keeping, tax obligations, and regulatory reporting.
          </li>
        </ul>
      </section>

      {/* ------------------------------------------------------------------ */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-[var(--color-primary)] mb-3">
          4. Data Storage &amp; Security
        </h2>
        <p className="text-[var(--color-text)] leading-relaxed mb-3">
          We employ industry-standard organizational, physical, and technical security
          measures to protect your data:
        </p>
        <ul className="list-disc list-inside text-[var(--color-text)] space-y-2">
          <li>
            <strong>Database:</strong> All structured data (personal information, health records,
            appointments) is stored in a <strong>PostgreSQL</strong> database hosted on{" "}
            <strong>Supabase</strong>, which provides encryption at rest and in transit (TLS).
          </li>
          <li>
            <strong>Backend hosting:</strong> The server-side application is deployed on{" "}
            <strong>Microsoft Azure App Service</strong>, benefiting from Azure&apos;s enterprise-grade
            security infrastructure, network isolation, and compliance certifications.
          </li>
          <li>
            <strong>Frontend hosting:</strong> The patient-facing web application is deployed on{" "}
            <strong>Vercel</strong>, served over HTTPS with automatic TLS certificate management.
          </li>
          <li>
            <strong>File storage:</strong> Uploaded documents (e.g., dental images, clinical files) are
            stored in <strong>Azure Blob Storage</strong> with access-controlled, signed URLs.
          </li>
          <li>
            <strong>Authentication:</strong> We use JSON Web Tokens (JWT) with HttpOnly, Secure refresh
            cookies. Access tokens are stored in-memory only and are never persisted in browser
            storage, minimizing exposure to cross-site scripting (XSS) attacks.
          </li>
          <li>
            <strong>Immutable audit trail:</strong> <em>Every</em> access to your data — whether
            a read, create, update, or delete operation performed by patients, clinic staff, or
            system administrators — is recorded in an <strong>append-only audit log</strong> that
            cannot be modified or deleted. This ensures full accountability and traceability of
            all data access in compliance with the DPA&apos;s accountability principle.
          </li>
          <li>
            <strong>Rate limiting:</strong> Login attempts and sensitive endpoints are rate-limited to
            protect against brute-force and denial-of-service attacks.
          </li>
        </ul>
      </section>

      {/* ------------------------------------------------------------------ */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-[var(--color-primary)] mb-3">
          5. Data Sharing &amp; Third-Party Services
        </h2>
        <p className="text-[var(--color-text)] leading-relaxed mb-3">
          We do <strong>not</strong> sell your personal information to third parties. We may share
          your data only with the following, and only to the extent necessary:
        </p>
        <ul className="list-disc list-inside text-[var(--color-text)] space-y-1">
          <li>
            <strong>Service providers:</strong> Supabase (database), Microsoft Azure (hosting &amp; storage),
            Vercel (frontend hosting), Resend (transactional emails), and Google (Gemini AI for the
            chatbot feature). These providers process data on our behalf under data processing agreements.
          </li>
          <li>
            <strong>Regulatory &amp; legal authorities:</strong> When required by law, court order, or
            government regulation.
          </li>
          <li>
            <strong>Professional referrals:</strong> Other healthcare providers if a referral is made for
            your continued care, and only with your consent.
          </li>
        </ul>
      </section>

      {/* ------------------------------------------------------------------ */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-[var(--color-primary)] mb-3">
          6. Data Retention
        </h2>
        <p className="text-[var(--color-text)] leading-relaxed">
          We retain your personal and health data for as long as necessary to fulfill the
          purposes stated in this policy, and in compliance with applicable laws governing
          medical record retention in the Philippines. Audit logs are retained indefinitely
          as required for legal accountability. When your data is no longer needed, we will
          securely delete or anonymize it in accordance with the DPA.
        </p>
      </section>

      {/* ------------------------------------------------------------------ */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-[var(--color-primary)] mb-3">
          7. Your Rights Under the Data Privacy Act
        </h2>
        <p className="text-[var(--color-text)] leading-relaxed mb-3">
          As a data subject under RA 10173, you have the following rights:
        </p>
        <ul className="list-disc list-inside text-[var(--color-text)] space-y-1">
          <li>
            <strong>Right to be informed:</strong> You have the right to know what personal data we
            collect, how we use it, and to whom it may be disclosed.
          </li>
          <li>
            <strong>Right to access:</strong> You may request access to your personal data held by us.
          </li>
          <li>
            <strong>Right to rectification:</strong> You may request correction of inaccurate or
            incomplete personal data.
          </li>
          <li>
            <strong>Right to erasure or blocking:</strong> You may request deletion or blocking of your
            personal data when it is incomplete, outdated, unlawfully obtained, or no longer necessary
            for the purpose for which it was collected, subject to legal retention requirements.
          </li>
          <li>
            <strong>Right to data portability:</strong> You may request an electronic copy of your
            personal data in a structured, commonly used format.
          </li>
          <li>
            <strong>Right to object:</strong> You may object to the processing of your personal data,
            including processing for direct marketing purposes.
          </li>
          <li>
            <strong>Right to file a complaint:</strong> You may file a complaint with the{" "}
            <strong>National Privacy Commission (NPC)</strong> if you believe your data privacy rights
            have been violated.
          </li>
        </ul>
        <p className="text-[var(--color-text)] leading-relaxed mt-3">
          To exercise any of these rights, please contact us using the details provided in Section 10
          below. We will respond to your request within a reasonable period, and no later than thirty
          (30) days from the date of your request.
        </p>
      </section>

      {/* ------------------------------------------------------------------ */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-[var(--color-primary)] mb-3">
          8. Use of AI &amp; Chatbot
        </h2>
        <p className="text-[var(--color-text)] leading-relaxed">
          Our System includes an AI-powered chatbot that uses Google Gemini to assist with
          appointment booking, clinic inquiries, and general dental information. Your chatbot
          messages are processed to generate responses and may be stored temporarily for
          conversation continuity. The chatbot does <strong>not</strong> make medical diagnoses or
          treatment decisions. Clinic-specific information provided by the chatbot is retrieved from
          our database in real time and is not hardcoded. All chatbot interactions are logged in
          the audit trail.
        </p>
      </section>

      {/* ------------------------------------------------------------------ */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-[var(--color-primary)] mb-3">
          9. Changes to This Policy
        </h2>
        <p className="text-[var(--color-text)] leading-relaxed">
          We may update this Privacy Policy from time to time. When we make material changes, we
          will update the version number and effective date at the top of this page and, where
          appropriate, notify you via email or an in-app notice. Your continued use of the System
          after any changes constitutes acceptance of the updated policy.
        </p>
      </section>

      {/* ------------------------------------------------------------------ */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-[var(--color-primary)] mb-3">
          10. Contact Us
        </h2>
        <p className="text-[var(--color-text)] leading-relaxed mb-3">
          If you have any questions, concerns, or requests regarding this Privacy Policy or
          your personal data, please contact our Data Protection Officer:
        </p>
        <div className="bg-[var(--color-primary)]/5 border border-[var(--color-border)] rounded-lg p-4 text-[var(--color-text)]">
          <p className="font-medium">Dorotheo Dental Clinic — Data Protection Officer</p>
          <p>Email: privacy@dorotheodental.com</p>
          <p>Phone: (02) 8123-4567</p>
          <p>Address: Metro Manila, Philippines</p>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      <section className="border-t border-[var(--color-border)] pt-6 mt-8">
        <p className="text-sm text-[var(--color-text-muted)]">
          You may also file a complaint with the{" "}
          <strong>National Privacy Commission</strong> of the Philippines at{" "}
          <a
            href="https://www.privacy.gov.ph"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--color-primary)] hover:text-[var(--color-primary-dark)] underline"
          >
            www.privacy.gov.ph
          </a>
          .
        </p>
        <p className="text-sm text-[var(--color-text-muted)] mt-4">
          <Link
            href="/terms-and-conditions"
            className="text-[var(--color-primary)] hover:text-[var(--color-primary-dark)] underline"
          >
            View our Terms &amp; Conditions &rarr;
          </Link>
        </p>
      </section>
    </article>
  )
}
