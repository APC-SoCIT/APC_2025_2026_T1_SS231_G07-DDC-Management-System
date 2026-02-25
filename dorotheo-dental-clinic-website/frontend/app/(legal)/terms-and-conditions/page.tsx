import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Terms & Conditions — Dorotheo Dental Clinic",
  description:
    "Terms and Conditions for using the Dorotheo Dental Clinic Management System.",
}

const POLICY_VERSION = "1.0"
const EFFECTIVE_DATE = "February 25, 2026"

export default function TermsAndConditionsPage() {
  return (
    <article className="prose prose-gray max-w-none">
      {/* Title */}
      <h1 className="text-3xl sm:text-4xl font-display font-bold text-[var(--color-primary)] mb-2">
        Terms &amp; Conditions
      </h1>
      <p className="text-sm text-[var(--color-text-muted)] mb-8">
        Version {POLICY_VERSION} &middot; Effective {EFFECTIVE_DATE}
      </p>

      {/* ------------------------------------------------------------------ */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-[var(--color-primary)] mb-3">
          1. Acceptance of Terms
        </h2>
        <p className="text-[var(--color-text)] leading-relaxed mb-3">
          These Terms and Conditions (&ldquo;Terms&rdquo;) govern your access to and use of the
          Dorotheo Dental Clinic Management System (the &ldquo;System&rdquo;), including all
          associated websites, mobile interfaces, and services operated by Dorotheo Dental
          Clinic (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;).
        </p>
        <p className="text-[var(--color-text)] leading-relaxed">
          By creating an account, logging in, or otherwise accessing the System, you agree to
          be bound by these Terms and our{" "}
          <Link
            href="/privacy-policy"
            className="text-[var(--color-primary)] hover:text-[var(--color-primary-dark)] underline"
          >
            Privacy Policy
          </Link>
          . If you do not agree, you must not use the System.
        </p>
      </section>

      {/* ------------------------------------------------------------------ */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-[var(--color-primary)] mb-3">
          2. Eligibility
        </h2>
        <p className="text-[var(--color-text)] leading-relaxed">
          You must be at least eighteen (18) years old to register for an account. If you are
          registering on behalf of a minor, you represent that you are the parent or legal
          guardian and you accept these Terms on the minor&apos;s behalf. We reserve the right to
          verify your identity and refuse service at our discretion.
        </p>
      </section>

      {/* ------------------------------------------------------------------ */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-[var(--color-primary)] mb-3">
          3. Account Registration &amp; Security
        </h2>
        <ul className="list-disc list-inside text-[var(--color-text)] space-y-2">
          <li>
            You agree to provide accurate, current, and complete information during registration
            and to keep your account information up to date.
          </li>
          <li>
            You are responsible for maintaining the confidentiality of your login credentials. You
            must not share your account with others.
          </li>
          <li>
            You must immediately notify us of any unauthorized use of your account or any other
            security breach. We are not liable for any loss arising from unauthorized use of
            your account.
          </li>
          <li>
            Staff and owner accounts are provisioned by clinic administrators. Patients may
            self-register subject to identity verification.
          </li>
        </ul>
      </section>

      {/* ------------------------------------------------------------------ */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-[var(--color-primary)] mb-3">
          4. Permitted Use
        </h2>
        <p className="text-[var(--color-text)] leading-relaxed mb-3">
          The System is provided solely for the purpose of managing dental clinic operations,
          including but not limited to:
        </p>
        <ul className="list-disc list-inside text-[var(--color-text)] space-y-1 mb-3">
          <li>Booking, rescheduling, and cancelling dental appointments</li>
          <li>Viewing treatment history, dental records, and invoices</li>
          <li>Communicating with clinic staff via the AI chatbot assistant</li>
          <li>Managing clinic operations (for authorized staff and owners)</li>
          <li>Receiving appointment reminders and clinic notifications</li>
        </ul>
        <p className="text-[var(--color-text)] leading-relaxed">
          You agree <strong>not</strong> to use the System to:
        </p>
        <ul className="list-disc list-inside text-[var(--color-text)] space-y-1">
          <li>Attempt to gain unauthorized access to other accounts or system resources</li>
          <li>Transmit malicious code, spam, or any harmful content</li>
          <li>Scrape, crawl, or use automated tools to extract data from the System</li>
          <li>Interfere with or disrupt the integrity or performance of the System</li>
          <li>Impersonate any person or entity, including clinic staff</li>
          <li>Use the System for any unlawful purpose</li>
        </ul>
      </section>

      {/* ------------------------------------------------------------------ */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-[var(--color-primary)] mb-3">
          5. Appointment Booking &amp; Cancellation
        </h2>
        <ul className="list-disc list-inside text-[var(--color-text)] space-y-2">
          <li>
            Appointments booked through the System are subject to confirmation and dentist
            availability. Booking an appointment does not guarantee that the appointment will
            proceed as scheduled.
          </li>
          <li>
            You may cancel or reschedule appointments through the System subject to the
            clinic&apos;s cancellation policy. Repeated no-shows may result in restrictions on
            your booking privileges.
          </li>
          <li>
            The clinic reserves the right to cancel or reschedule appointments due to
            operational requirements, emergencies, or unforeseen circumstances.
          </li>
        </ul>
      </section>

      {/* ------------------------------------------------------------------ */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-[var(--color-primary)] mb-3">
          6. AI Chatbot Disclaimer
        </h2>
        <p className="text-[var(--color-text)] leading-relaxed mb-3">
          The System includes an AI-powered chatbot that assists with appointment booking,
          clinic inquiries, and general dental health information. You acknowledge and agree that:
        </p>
        <ul className="list-disc list-inside text-[var(--color-text)] space-y-1">
          <li>
            The chatbot is an informational tool only. It is <strong>not</strong> a licensed
            healthcare provider and does <strong>not</strong> provide medical diagnoses, treatment
            recommendations, or professional dental advice.
          </li>
          <li>
            Information provided by the chatbot should not be used as a substitute for
            professional dental consultation.
          </li>
          <li>
            While we strive for accuracy, AI-generated responses may occasionally be incomplete
            or incorrect.
          </li>
          <li>
            Chatbot interactions are logged for quality assurance and audit purposes.
          </li>
        </ul>
      </section>

      {/* ------------------------------------------------------------------ */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-[var(--color-primary)] mb-3">
          7. Payments &amp; Fees
        </h2>
        <p className="text-[var(--color-text)] leading-relaxed">
          All fees for dental services are denominated in Philippine Peso (PHP) and are
          subject to the clinic&apos;s current pricing schedule. Payment terms, accepted payment
          methods, and refund policies are communicated at the time of service or invoicing.
          The System may display invoices and payment history for your convenience. Disputes
          regarding charges should be raised directly with the clinic within thirty (30) days
          of the transaction date.
        </p>
      </section>

      {/* ------------------------------------------------------------------ */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-[var(--color-primary)] mb-3">
          8. Intellectual Property
        </h2>
        <p className="text-[var(--color-text)] leading-relaxed">
          All content, design, software, trademarks, logos, and other intellectual property
          displayed on or through the System are owned by or licensed to Dorotheo Dental Clinic.
          You may not copy, reproduce, distribute, or create derivative works from any part of
          the System without our prior written consent.
        </p>
      </section>

      {/* ------------------------------------------------------------------ */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-[var(--color-primary)] mb-3">
          9. Data Privacy &amp; Audit Logging
        </h2>
        <p className="text-[var(--color-text)] leading-relaxed mb-3">
          Your use of the System is also governed by our{" "}
          <Link
            href="/privacy-policy"
            className="text-[var(--color-primary)] hover:text-[var(--color-primary-dark)] underline"
          >
            Privacy Policy
          </Link>
          , which is incorporated into these Terms by reference. By using the System, you consent
          to the collection and processing of your data as described therein.
        </p>
        <p className="text-[var(--color-text)] leading-relaxed">
          You acknowledge that all interactions with the System — including data views, edits,
          and administrative actions — are recorded in an immutable audit trail for security,
          compliance, and accountability purposes as required by the Philippine Data Privacy
          Act of 2012.
        </p>
      </section>

      {/* ------------------------------------------------------------------ */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-[var(--color-primary)] mb-3">
          10. Limitation of Liability
        </h2>
        <p className="text-[var(--color-text)] leading-relaxed mb-3">
          To the maximum extent permitted by Philippine law:
        </p>
        <ul className="list-disc list-inside text-[var(--color-text)] space-y-1">
          <li>
            The System is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis. We make
            no warranties, express or implied, regarding the System&apos;s availability,
            accuracy, reliability, or fitness for a particular purpose.
          </li>
          <li>
            We shall not be liable for any indirect, incidental, consequential, or punitive
            damages arising out of your use of or inability to use the System.
          </li>
          <li>
            Our total liability for any claim arising from the use of the System shall not
            exceed the fees you paid to us (if any) in the twelve (12) months preceding the
            event giving rise to the claim.
          </li>
        </ul>
      </section>

      {/* ------------------------------------------------------------------ */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-[var(--color-primary)] mb-3">
          11. Termination &amp; Suspension
        </h2>
        <p className="text-[var(--color-text)] leading-relaxed">
          We reserve the right to suspend or terminate your access to the System at any time,
          with or without notice, if you violate these Terms or engage in conduct that we
          reasonably believe is harmful to other users, the clinic, or the System&apos;s
          integrity. Upon termination, your right to access the System ceases immediately.
          Provisions that by their nature should survive termination (including but not limited
          to intellectual property, limitation of liability, and dispute resolution) shall
          continue in full force and effect.
        </p>
      </section>

      {/* ------------------------------------------------------------------ */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-[var(--color-primary)] mb-3">
          12. Governing Law &amp; Dispute Resolution
        </h2>
        <p className="text-[var(--color-text)] leading-relaxed">
          These Terms shall be governed by and construed in accordance with the laws of the
          Republic of the Philippines. Any dispute arising from or in connection with these
          Terms or the System shall be resolved through good-faith negotiation. If no
          resolution is reached within thirty (30) days, either party may submit the dispute
          to the appropriate courts in Metro Manila, Philippines.
        </p>
      </section>

      {/* ------------------------------------------------------------------ */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-[var(--color-primary)] mb-3">
          13. Changes to These Terms
        </h2>
        <p className="text-[var(--color-text)] leading-relaxed">
          We may modify these Terms at any time. When we make material changes, we will update
          the version number and effective date at the top of this page. We may also provide
          notice via email or an in-app notification. Your continued use of the System after
          such changes constitutes your acceptance of the revised Terms.
        </p>
      </section>

      {/* ------------------------------------------------------------------ */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-[var(--color-primary)] mb-3">
          14. Contact Information
        </h2>
        <p className="text-[var(--color-text)] leading-relaxed mb-3">
          For questions or concerns about these Terms, please contact us:
        </p>
        <div className="bg-[var(--color-primary)]/5 border border-[var(--color-border)] rounded-lg p-4 text-[var(--color-text)]">
          <p className="font-medium">Dorotheo Dental Clinic</p>
          <p>Email: support@dorotheodental.com</p>
          <p>Phone: (02) 8123-4567</p>
          <p>Address: Metro Manila, Philippines</p>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      <section className="border-t border-[var(--color-border)] pt-6 mt-8">
        <p className="text-sm text-[var(--color-text-muted)]">
          <Link
            href="/privacy-policy"
            className="text-[var(--color-primary)] hover:text-[var(--color-primary-dark)] underline"
          >
            &larr; View our Privacy Policy
          </Link>
        </p>
      </section>
    </article>
  )
}
