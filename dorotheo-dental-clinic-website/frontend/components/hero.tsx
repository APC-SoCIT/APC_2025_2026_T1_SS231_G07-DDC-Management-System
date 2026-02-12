import Image from "next/image"

export default function Hero() {
  return (
    <section className="pt-24 sm:pt-28 md:pt-32 pb-12 sm:pb-14 md:pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-10 lg:gap-12 items-center">
          <div className="text-center lg:text-left">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-[var(--color-primary)] mb-4 sm:mb-6 text-balance leading-tight">
              Your Smile, Our Priority
            </h1>
            <p className="text-base sm:text-lg text-[var(--color-text-muted)] mb-6 sm:mb-8 leading-relaxed max-w-xl mx-auto lg:mx-0">
              We make some of the best dental practices from other countries available in the Philippines.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start">
              <a
                href="#services"
                className="px-6 sm:px-8 py-3 sm:py-3.5 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors font-medium text-center touch-manipulation"
              >
                Our Services
              </a>
              <a
                href="#contact"
                className="px-6 sm:px-8 py-3 sm:py-3.5 border-2 border-[var(--color-primary)] text-[var(--color-primary)] rounded-lg hover:bg-[var(--color-primary)] hover:text-white transition-colors font-medium text-center touch-manipulation"
              >
                Contact Us
              </a>
            </div>
          </div>

          <div className="relative h-64 sm:h-80 md:h-96 lg:h-[500px] rounded-xl md:rounded-2xl overflow-hidden shadow-xl md:shadow-2xl order-first lg:order-last">
            <Image 
              src="/professional-dentist-in-modern-clinic.jpg" 
              alt="Professional Dentist" 
              fill 
              className="object-cover" 
              priority
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 600px"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
