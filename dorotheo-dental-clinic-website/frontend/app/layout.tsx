import type React from "react"
import { Geist, Playfair_Display } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/lib/auth"

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${geistSans.variable} ${playfair.variable}`}>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
