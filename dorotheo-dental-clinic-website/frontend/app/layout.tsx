import type React from "react"
import { Geist, Playfair_Display } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/lib/auth"
import { ClinicProvider } from "@/lib/clinic-context"

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
})

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
})

export const metadata = {
  title: "Dorotheo Dental Clinic Website",
  description: "Quality dental services with experienced professionals",
  generator: 'v0.app'
}

// Viewport configuration for mobile responsiveness
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${geistSans.variable} ${playfair.variable}`}>
      <body>
        <AuthProvider>
          <ClinicProvider>
            {children}
          </ClinicProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
