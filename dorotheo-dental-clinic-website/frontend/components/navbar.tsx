"use client"

import { useState } from "react"
import Link from "next/link"
import { Menu, X, User, LogOut } from "lucide-react"
import { useAuth } from "@/lib/auth"
import { useRouter } from "next/navigation"
import RegisterModal from "./register-modal"

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isRegisterOpen, setIsRegisterOpen] = useState(false)
  const { user, logout } = useAuth()
  const router = useRouter()

  // Determine dashboard route based on user type
  const getDashboardRoute = () => {
    if (!user) return "/login"
    switch (user.user_type) {
      case "patient":
        return "/patient/dashboard"
      case "staff":
        return "/staff/dashboard"
      case "owner":
        return "/owner/dashboard"
      default:
        return "/login"
    }
  }

  const handleLogout = () => {
    logout()
    router.push("/")
    setIsMenuOpen(false)
  }

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[var(--color-primary)] border-b border-[var(--color-primary-dark)] shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3">
              <img src="/logo.png" alt="Dorotheo Dental Clinic" className="h-12 w-auto object-contain" />
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              <Link href="#services" className="text-white/90 hover:text-[var(--color-accent)] transition-colors">
                Services
              </Link>
              <Link href="#about" className="text-white/90 hover:text-[var(--color-accent)] transition-colors">
                About Us
              </Link>
              <Link href="#contact" className="text-white/90 hover:text-[var(--color-accent)] transition-colors">
                Contact
              </Link>
              <Link href="#sitemap" className="text-white/90 hover:text-[var(--color-accent)] transition-colors">
                Locations
              </Link>
              <button
                onClick={() => setIsRegisterOpen(true)}
                className="px-6 py-2.5 bg-[var(--color-accent)] text-white rounded-lg hover:bg-[var(--color-accent-dark)] transition-colors font-medium"
              >
                Schedule Appointment
              </button>
              
              {user ? (
                <div className="flex items-center gap-3">
                  <Link
                    href={getDashboardRoute()}
                    className="p-2.5 rounded-lg border border-white/20 hover:bg-white/10 transition-colors flex items-center gap-2"
                    title={`${user.first_name} ${user.last_name}`}
                  >
                    <div className="w-8 h-8 bg-[var(--color-accent)] rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {user.first_name.charAt(0)}{user.last_name.charAt(0)}
                      </span>
                    </div>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="p-2.5 rounded-lg border border-white/20 hover:bg-red-500/20 transition-colors flex items-center gap-2"
                    title="Logout"
                  >
                    <LogOut className="w-5 h-5 text-white" />
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="p-2.5 rounded-lg border border-white/20 hover:bg-white/10 transition-colors flex items-center gap-2"
                  title="Login"
                >
                  <User className="w-5 h-5 text-white" />
                </Link>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-white/10 text-white"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="md:hidden py-4 border-t border-white/20">
              <div className="flex flex-col gap-4">
                <Link href="#services" className="text-white/90 hover:text-[var(--color-accent)]">
                  Services
                </Link>
                <Link href="#about" className="text-white/90 hover:text-[var(--color-accent)]">
                  About Us
                </Link>
                <Link href="#contact" className="text-white/90 hover:text-[var(--color-accent)]">
                  Contact
                </Link>
                <Link href="#sitemap" className="text-white/90 hover:text-[var(--color-accent)]">
                  Locations
                </Link>
                <button
                  onClick={() => setIsRegisterOpen(true)}
                  className="px-6 py-2.5 bg-[var(--color-accent)] text-white rounded-lg hover:bg-[var(--color-accent-dark)] transition-colors font-medium text-left"
                >
                  Schedule Appointment
                </button>
                
                {user ? (
                  <>
                    <Link 
                      href={getDashboardRoute()} 
                      className="flex items-center gap-2 text-white hover:text-[var(--color-accent)]"
                    >
                      <div className="w-8 h-8 bg-[var(--color-accent)] rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-medium">
                          {user.first_name.charAt(0)}{user.last_name.charAt(0)}
                        </span>
                      </div>
                      <span>{user.first_name} {user.last_name}</span>
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 text-white hover:text-red-400 transition-colors"
                    >
                      <LogOut className="w-5 h-5" />
                      <span>Logout</span>
                    </button>
                  </>
                ) : (
                  <Link 
                    href="/login" 
                    className="flex items-center gap-2 text-white hover:text-[var(--color-accent)]"
                  >
                    <User className="w-5 h-5" />
                    <span>Login</span>
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>

      <RegisterModal isOpen={isRegisterOpen} onClose={() => setIsRegisterOpen(false)} />
    </>
  )
}
