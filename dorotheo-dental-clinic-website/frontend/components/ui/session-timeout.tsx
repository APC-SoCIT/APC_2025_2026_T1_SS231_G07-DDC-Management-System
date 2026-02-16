"use client"

import { useEffect, useRef, useCallback } from "react"
import { useAuth } from "@/lib/auth"
import { useRouter } from "next/navigation"

const INACTIVITY_LIMIT = 15 * 60 * 1000 // 15 minutes

export function SessionTimeout() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const handleLogout = useCallback(() => {
    if (user) {
      console.log("Auto-logging out due to inactivity")
      logout()
      router.push("/login?reason=timeout")
    }
  }, [user, logout, router])

  const resetTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }
    if (user) {
      timerRef.current = setTimeout(handleLogout, INACTIVITY_LIMIT)
    }
  }, [user, handleLogout])

  useEffect(() => {
    if (!user) return

    // Events to track activity
    const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart"]

    // Initial timer set
    resetTimer()

    // Event listeners
    const handleActivity = () => {
      resetTimer()
    }

    events.forEach((event) => {
      window.addEventListener(event, handleActivity)
    })

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity)
      })
    }
  }, [user, resetTimer])

  return null // This component doesn't render anything visible
}
