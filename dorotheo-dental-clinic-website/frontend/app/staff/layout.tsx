"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LayoutDashboard, Users, Calendar, Package, CreditCard, LogOut, Menu, X, ChevronDown, User } from "lucide-react"
import { useAuth } from "@/lib/auth"
import NotificationBell from "@/components/notification-bell"

export default function StaffLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname()
  const router = useRouter()
  const { logout, user } = useAuth()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)

  const navigation = [
    { name: "Overview", href: "/staff/dashboard", icon: LayoutDashboard },
    { name: "Patients", href: "/staff/patients", icon: Users },
    { name: "Appointments", href: "/staff/appointments", icon: Calendar },
    { name: "Inventory", href: "/staff/inventory", icon: Package },
    { name: "Billing", href: "/staff/billing", icon: CreditCard },
  ]

  const handleLogout = () => {
    logout()
    router.push("/")
  }

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-[var(--color-border)] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Dorotheo Dental Clinic" className="h-10 w-auto object-contain" />
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          {/* Mobile Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="w-10 h-10 bg-[var(--color-primary)] rounded-full flex items-center justify-center"
            >
              <User className="w-5 h-5 text-white" />
            </button>
            {isProfileOpen && (
              <div className="absolute right-0 top-12 w-48 bg-white rounded-lg shadow-lg border border-[var(--color-border)] p-2 z-50">
                <Link
                  href="/staff/profile"
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
          <NotificationBell />
          <div className="relative">
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--color-background)] transition-colors"
            >
              <div className="text-right">
                <p className="font-medium text-[var(--color-text)] text-sm">
                  {user ? `${user.first_name} ${user.last_name}` : "Staff Member"}
                </p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {user?.role === 'receptionist' ? 'Receptionist' : user?.role === 'dentist' ? 'Dentist' : 'Staff'}
                </p>
              </div>
              <div className="w-10 h-10 bg-[var(--color-primary)] rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <ChevronDown className={`w-4 h-4 transition-transform ${isProfileOpen ? "rotate-180" : ""}`} />
            </button>

            {isProfileOpen && (
              <div className="absolute right-0 top-14 w-48 bg-white rounded-lg shadow-lg border border-[var(--color-border)] p-2 z-50">
                <Link
                  href="/staff/profile"
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
            <div className="flex items-center justify-center">
              <img src="/logo.png" alt="Dorotheo Dental Clinic" className="h-14 w-auto object-contain" />
            </div>
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
