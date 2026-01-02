"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function DentalRecordsRedirect() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to treatment history as the default dental records page
    router.replace("/patient/records/treatment")
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)] mx-auto mb-4"></div>
        <p className="text-[var(--color-text-muted)]">Loading...</p>
      </div>
    </div>
  )
}
