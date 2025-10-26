import { Phone, Facebook, Instagram } from "lucide-react"

export default function Contact() {
  return (
    <section id="contact" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-serif font-bold text-[var(--color-primary)] mb-4">Contact Us</h2>
          <p className="text-lg text-[var(--color-text-muted)]">Get in touch with us for appointments and inquiries</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="flex flex-col items-center text-center p-6 bg-[var(--color-background)] rounded-xl">
            <div className="w-16 h-16 bg-[var(--color-primary)] rounded-full flex items-center justify-center mb-4">
              <Phone className="w-8 h-8 text-[var(--color-accent)]" />
            </div>
            <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-2">Phone</h3>
            <p className="text-[var(--color-text-muted)]">+63 912 345 6789</p>
          </div>

          <a 
            href="https://www.facebook.com/dental.dorotheo"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center text-center p-6 bg-[var(--color-background)] rounded-xl hover:shadow-lg transition-shadow"
          >
            <div className="w-16 h-16 bg-[var(--color-primary)] rounded-full flex items-center justify-center mb-4">
              <Facebook className="w-8 h-8 text-[var(--color-accent)]" />
            </div>
            <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-2">Facebook</h3>
            <p className="text-[var(--color-text-muted)]">Dorotheo Dental FB</p>
          </a>

          <a 
            href="https://www.instagram.com/dorotheo.dental?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw%3D%3D"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center text-center p-6 bg-[var(--color-background)] rounded-xl hover:shadow-lg transition-shadow"
          >
            <div className="w-16 h-16 bg-[var(--color-primary)] rounded-full flex items-center justify-center mb-4">
              <Instagram className="w-8 h-8 text-[var(--color-accent)]" />
            </div>
            <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-2">Instagram</h3>
            <p className="text-[var(--color-text-muted)]">Dorotheo Dental IG</p>
          </a>
        </div>
      </div>
    </section>
  )
}
