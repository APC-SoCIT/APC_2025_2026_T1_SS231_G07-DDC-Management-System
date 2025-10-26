import Image from "next/image"

export default function Hero() {
  return (
    <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-5xl lg:text-6xl font-serif font-bold text-[var(--color-primary)] mb-6 text-balance">
              Your Smile, Our Priority
            </h1>
            <p className="text-lg text-[var(--color-text-muted)] mb-8 leading-relaxed">
              We make some of the best dental practices from other countries available in the Philippines.
            </p>
            <div className="flex flex-wrap gap-4">
              <a
                href="#services"
                className="px-8 py-3.5 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors font-medium"
              >
                Our Services
              </a>
              <a
                href="#contact"
                className="px-8 py-3.5 border-2 border-[var(--color-primary)] text-[var(--color-primary)] rounded-lg hover:bg-[var(--color-primary)] hover:text-white transition-colors font-medium"
              >
                Contact Us
              </a>
            </div>
          </div>

          <div className="relative h-[500px] rounded-2xl overflow-hidden shadow-2xl">
            <Image src="/professional-dentist-in-modern-clinic.jpg" alt="Professional Dentist" fill className="object-cover" />
          </div>
        </div>
      </div>
    </section>
  )
}
