"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LayoutDashboard, User, Calendar, FileText, CreditCard, LogOut, Menu, X, ChevronDown, ChevronRight, Camera, FolderOpen, Activity } from "lucide-react"
import { useAuth } from "@/lib/auth"
import { api } from "@/lib/api"
import ChatbotWidget from "@/components/chatbot-widget"
import NotificationBell from "@/components/notification-bell"

export default function PatientLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname()
  const router = useRouter()
  const { logout, user, token } = useAuth()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isDentalRecordsOpen, setIsDentalRecordsOpen] = useState(false)
  const [hasDocuments, setHasDocuments] = useState(false)
  const [hasImages, setHasImages] = useState(false)
  const [hasTreatmentHistory, setHasTreatmentHistory] = useState(false)

  // Check if user has data in each section
  useEffect(() => {
    const checkDataAvailability = async () => {
      if (!user?.id || !token) return

      try {
        // Check for documents
        const docs = await api.getDocuments(user.id, token)
        setHasDocuments(docs && docs.length > 0)

        // Check for images
        const images = await api.getPatientTeethImages(user.id, token)
        setHasImages(images && images.length > 0)

        // Check for treatment history (dental records)
        const records = await api.getDentalRecords(user.id, token)
        setHasTreatmentHistory(records && records.length > 0)
      } catch (error) {
        console.error("Error checking data availability:", error)
      }
    }

    checkDataAvailability()
  }, [user?.id, token])

  const navigation = [
    { name: "Overview", href: "/patient/dashboard", icon: LayoutDashboard },
    { name: "Appointments", href: "/patient/appointments", icon: Calendar },
  ]

  const dentalRecordsSubItems = [
    { name: "Treatment History", href: "/patient/records/treatment", icon: Activity, hasData: hasTreatmentHistory },
    { name: "Documents", href: "/patient/records/documents", icon: FolderOpen, hasData: hasDocuments },
    { name: "Teeth & X-Ray Images", href: "/patient/records/images", icon: Camera, hasData: hasImages },
  ]

  const handleLogout = () => {
    logout()
    router.push("/")
  }

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-[var(--color-border)] px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <img src="/logo.png" alt="Dorotheo Dental Clinic" className="h-10 w-auto object-contain" />
        </Link>
        <div className="flex items-center gap-2">
          {/* Notification Bell */}
          <NotificationBell />
          {/* Mobile Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="w-10 h-10 bg-[var(--color-accent)] rounded-full flex items-center justify-center"
            >
              <User className="w-5 h-5 text-white" />
            </button>
            {isProfileOpen && (
              <div className="absolute right-0 top-12 w-48 bg-white rounded-lg shadow-lg border border-[var(--color-border)] p-2 z-50">
                <Link
                  href="/patient/profile"
                  className="block px-3 py-2 text-sm text-[var(--color-text)] hover:bg-[var(--color-background)] rounded transition-colors"
                >
                  Edit Profile
                </Link>
              </div>
            )}
          </div>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2">
            {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Top Header for Desktop */}
      <div className="hidden lg:block fixed top-0 right-0 z-30 bg-white border-b border-[var(--color-border)] px-6 py-3" style={{left: '16rem'}}>
        <div className="flex items-center justify-end gap-4">
          {/* Notification Bell */}
          <NotificationBell />
          <div className="relative">
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--color-background)] transition-colors"
            >
              <div className="text-right">
                <p className="font-medium text-[var(--color-text)] text-sm">
                  {user ? `${user.first_name} ${user.last_name}` : "Patient"}
                </p>
                <p className="text-xs text-[var(--color-text-muted)]">Patient Account</p>
              </div>
              <div className="w-10 h-10 bg-[var(--color-accent)] rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
            </button>

            {isProfileOpen && (
              <div className="absolute right-0 top-14 w-48 bg-white rounded-lg shadow-lg border border-[var(--color-border)] p-2 z-50">
                <Link
                  href="/patient/profile"
                  className="block px-3 py-2 text-sm text-[var(--color-text)] hover:bg-[var(--color-background)] rounded transition-colors"
                >
                  Edit Profile
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-40 h-screen w-64 bg-white border-r border-[var(--color-border)] transition-transform ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        <div className="flex flex-col h-full">
          <div className="p-6 bg-[var(--color-primary)]">
            <Link href="/" className="flex items-center justify-center">
              <img src="/logo.png" alt="Dorotheo Dental Clinic" className="h-14 w-auto object-contain" />
            </Link>
          </div>

          <nav className="flex-1 p-4 space-y-2">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? "bg-[var(--color-primary)] text-white"
                      : "text-[var(--color-text)] hover:bg-[var(--color-background)]"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.name}</span>
                </Link>
              )
            })}

            {/* Dental Records Collapsible Section */}
            <div>
              <button
                onClick={() => setIsDentalRecordsOpen(!isDentalRecordsOpen)}
                className={`flex items-center justify-between gap-3 px-4 py-3 w-full rounded-lg transition-colors cursor-pointer ${
                  pathname.startsWith("/patient/records")
                    ? "bg-[var(--color-primary)] text-white"
                    : "text-[var(--color-text)] hover:bg-[var(--color-background)]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5" />
                  <span className="font-medium">Dental Records</span>
                </div>
                {isDentalRecordsOpen ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>

              {/* Dental Records Subsections */}
              {isDentalRecordsOpen && (
                <div className="mt-1 ml-4 space-y-1">
                  {dentalRecordsSubItems.map((subItem) => {
                    const isActive = pathname === subItem.href
                    return (
                      <Link
                        key={subItem.name}
                        href={subItem.href}
                        onClick={() => setIsSidebarOpen(false)}
                        className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors cursor-pointer ${
                          isActive
                            ? "bg-[var(--color-accent)] text-white"
                            : subItem.hasData
                            ? "text-[var(--color-text)] hover:bg-[var(--color-background)] hover:text-[var(--color-primary)]"
                            : "text-[var(--color-text-muted)] hover:bg-[var(--color-background)] hover:text-[var(--color-primary)]"
                        }`}
                      >
                        <subItem.icon className="w-4 h-4" />
                        <span className="text-sm">{subItem.name}</span>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Billing Link */}
            <Link
              href="/patient/billing"
              onClick={() => setIsSidebarOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                pathname === "/patient/billing"
                  ? "bg-[var(--color-primary)] text-white"
                  : "text-[var(--color-text)] hover:bg-[var(--color-background)]"
              }`}
            >
              <CreditCard className="w-5 h-5" />
              <span className="font-medium">Billing</span>
            </Link>
          </nav>

          <div className="p-4 border-t border-[var(--color-border)]">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 pt-16 lg:pt-16">
        <div className="p-6 lg:p-8">{children}</div>
      </main>

      {/* AI Chatbot Widget */}
      <ChatbotWidget />

      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden" 
          onClick={() => setIsSidebarOpen(false)}
          onKeyDown={(e) => e.key === 'Escape' && setIsSidebarOpen(false)}
          role="button"
          tabIndex={0}
          aria-label="Close sidebar"
        />
      )}
    </div>
  )
}
