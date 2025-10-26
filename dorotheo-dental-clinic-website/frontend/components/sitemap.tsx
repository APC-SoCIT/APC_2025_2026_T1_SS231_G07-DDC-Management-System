"use client"

export default function Sitemap() {
  const locations = [
    {
      id: 1,
      name: "Makati Clinic",
      address: "G/F Centuria Medical, Kalayaan Ave. Cor. Salamanca St. Makati City",
      mapUrl:
        "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3861.6489267982474!2d121.03611931529658!3d14.556085089829166!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3397c90264a0990b%3A0x2a97c276dce6b48d!2sCenturia%20Medical%20Makati!5e0!3m2!1sen!2sph!4v1697468000000!5m2!1sen!2sph",
      // Alternative with marker: Use Google Maps place mode
      placeUrl: "https://www.google.com/maps?q=Centuria+Medical+Makati,+Kalayaan+Ave+Cor+Salamanca+St+Makati+City&output=embed",
    },
    {
      id: 2,
      name: "Bacoor Clinic",
      address: "RFC, Molino 2, City of Bacoor, 1402 Cavite",
      mapUrl:
        "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3865.0848795489457!2d120.96594931529296!3d14.399976889920582!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3397d3e6e4e4e4e5%3A0x1234567890abcdef!2sMolino%202%2C%20Bacoor%2C%20Cavite!5e0!3m2!1sen!2sph!4v1697468100000!5m2!1sen!2sph",
      placeUrl: "https://www.google.com/maps?q=RFC+Molino+2+City+of+Bacoor+Cavite&output=embed",
    },
    {
      id: 3,
      name: "Muntinlupa Clinic",
      address: "Unit 1009, 2301 Civic Place, Civic Drive, Filinvest Corporate City, Alabang, Muntinlupa City",
      mapUrl:
        "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3863.5089267982474!2d121.04511931529458!3d14.428085889829166!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3397d0e6e4e4e4e5%3A0x9876543210fedcba!2sFilinvest%20Corporate%20City%2C%20Alabang%2C%20Muntinlupa!5e0!3m2!1sen!2sph!4v1697468200000!5m2!1sen!2sph",
      placeUrl: "https://www.google.com/maps?q=2301+Civic+Place+Civic+Drive+Filinvest+Corporate+City+Alabang+Muntinlupa&output=embed",
    },
  ]

  return (
    <section id="sitemap" className="py-20 px-4 sm:px-6 lg:px-8 bg-[var(--color-background)]">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-serif font-bold text-[var(--color-primary)] mb-4">Our Locations</h2>
          <p className="text-lg text-[var(--color-text-muted)]">Visit us at any of our three convenient locations</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {locations.map((location) => (
            <div
              key={location.id}
              className="bg-white rounded-xl overflow-hidden shadow-md border border-[var(--color-border)]"
            >
              <div className="h-64">
                <iframe
                  src={location.placeUrl}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-semibold text-[var(--color-primary)] mb-2">{location.name}</h3>
                <p className="text-[var(--color-text-muted)]">{location.address}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
