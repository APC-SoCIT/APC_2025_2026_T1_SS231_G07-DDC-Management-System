import Link from "next/link"
import type React from "react"

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-background)]">
      {/* Header */}
      <header className="bg-[var(--color-primary)] text-white py-4 px-4 sm:px-6 lg:px-8 shadow-md">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-3">
            <div className="px-4 py-2 bg-white/10 rounded-lg">
              <img src="/logo.png" alt="Dorotheo Dental Clinic" className="h-8 w-auto object-contain" />
            </div>
            <span className="text-lg font-semibold hidden sm:inline">Dorotheo Dental Clinic</span>
          </Link>
          <Link
            href="/login"
            className="text-sm text-white/80 hover:text-[var(--color-accent)] transition-colors"
          >
            Back to Login
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">{children}</div>
      </main>

      {/* Footer */}
      <footer className="bg-[var(--color-primary)] text-white/60 text-sm py-6 px-4 sm:px-6 lg:px-8 text-center">
        <div className="max-w-4xl mx-auto space-y-2">
          <div className="flex items-center justify-center gap-4">
            <Link href="/privacy-policy" className="hover:text-[var(--color-accent)] transition-colors">
              Privacy Policy
            </Link>
            <span>|</span>
            <Link href="/terms-and-conditions" className="hover:text-[var(--color-accent)] transition-colors">
              Terms &amp; Conditions
            </Link>
          </div>
          <p>&copy; 2025 Dorotheo Dental Clinic. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
