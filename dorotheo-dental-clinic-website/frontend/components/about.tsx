import Image from "next/image"

export default function About() {
  return (
    <section id="about" className="py-20 px-4 sm:px-6 lg:px-8 bg-[var(--color-background)]">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-serif font-bold text-[var(--color-primary)] mb-4">About Us</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16">
          <div className="relative h-[400px] rounded-2xl overflow-hidden shadow-xl">
            <Image src="/professional-dentist-portrait.png" alt="Our Dentist" fill className="object-cover" />
          </div>

          <div>
            <h3 className="text-2xl font-serif font-bold text-[var(--color-primary)] mb-4">Meet Our Lead Dentist</h3>
            <p className="text-[var(--color-text-muted)] leading-relaxed mb-6">
              Dr. Marvin F. Dorotheo founded the Dorotheo Dental and Diagnostic Center in 2001, a year after attaining the degree of Doctor of Dental Medicine from one of the leading and renowned Dentistry Schools in the Philippines, the Centro Escolar University.
            </p>
            <p className="text-[var(--color-text-muted)] leading-relaxed">
              Dr. Marvs demonstrates a strong commitment to advancing his dental expertise through continuous education. He has pursued extensive training in the Philippines and internationally (USA, Australia, Netherlands), developing comprehensive skills in implantology, TMJ therapy, orthodontics, restorative and cosmetic dentistry, sleep medicine, and related disciplines.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          <div className="bg-white p-8 rounded-xl shadow-md border border-[var(--color-border)]">
            <div className="w-12 h-12 bg-[var(--color-primary)] rounded-lg flex items-center justify-center mb-4">
              <span className="text-[var(--color-accent)] text-2xl font-bold">M</span>
            </div>
            <h3 className="text-xl font-semibold text-[var(--color-primary)] mb-3">Our Mission</h3>
            <p className="text-[var(--color-text-muted)] leading-relaxed italic">
              "My vocation is my higher purpose. I sincerely believe in using my knowledge and expertise in helping people become the healthiest they can be. That is why I never stop learning because the field of dentistry continuously evolves and I only want to be able to provide the best dental solutions to my patients."
            </p>
            <p className="text-[var(--color-primary)] font-semibold mt-3 text-right">- Dr. Marvin F. Dorotheo</p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-md border border-[var(--color-border)]">
            <div className="w-12 h-12 bg-[var(--color-accent)] rounded-lg flex items-center justify-center mb-4">
              <span className="text-white text-2xl font-bold">★</span>
            </div>
            <h3 className="text-xl font-semibold text-[var(--color-primary)] mb-3">What Makes Us Different</h3>
            <p className="text-[var(--color-text-muted)] leading-relaxed mb-4">
              At Dr. Marvin F. Dorotheo's Dental Clinic in Quezon City, we go beyond standard care to deliver excellence through innovation and compassion.
            </p>
            <ul className="space-y-2 text-[var(--color-text-muted)]">
              <li className="flex items-start gap-2">
                <span className="text-[var(--color-accent)] mt-1">•</span>
                <span>Dedicated to your optimal oral health.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--color-accent)] mt-1">•</span>
                <span>Continuously evolving with the latest dental advancements.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--color-accent)] mt-1">•</span>
                <span>Provides personalized, patient-centered treatments.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--color-accent)] mt-1">•</span>
                <span>Prioritizes comfort, understanding, and long-term well-being.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--color-accent)] mt-1">•</span>
                <span>Partners with you to achieve a healthy, confident smile.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
