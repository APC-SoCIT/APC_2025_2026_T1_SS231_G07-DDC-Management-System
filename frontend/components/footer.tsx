export default function Footer() {
  return (
    <footer className="bg-[var(--color-primary)] text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <h3 className="text-xl font-semibold mb-4 text-[var(--color-accent)]">Dorotheo Dental Clinic</h3>
            <p className="text-white/80 leading-relaxed">
              Providing quality dental care with compassion and excellence since 2010.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-4 text-[var(--color-accent)]">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <a href="#services" className="text-white/80 hover:text-[var(--color-accent)] transition-colors">
                  Services
                </a>
              </li>
              <li>
                <a href="#about" className="text-white/80 hover:text-[var(--color-accent)] transition-colors">
                  About Us
                </a>
              </li>
              <li>
                <a href="#contact" className="text-white/80 hover:text-[var(--color-accent)] transition-colors">
                  Contact
                </a>
              </li>
              <li>
                <a href="#sitemap" className="text-white/80 hover:text-[var(--color-accent)] transition-colors">
                  Locations
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-4 text-[var(--color-accent)]">Hours</h3>
            <ul className="space-y-2 text-white/80">
              <li>Monday - Friday: 9:00 AM - 6:00 PM</li>
              <li>Saturday: 9:00 AM - 3:00 PM</li>
              <li>Sunday: Closed</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/20 pt-8 text-center text-white/60">
          <p>&copy; 2025 Dorotheo Dental Clinic. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
