"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { ChevronRight } from "lucide-react"
import { api } from "@/lib/api"

interface Service {
  id: number
  name: string
  category: string
  description: string
  image: string
}

const categories = [
  { id: "all", label: "All Services" },
  { id: "orthodontics", label: "Orthodontics" },
  { id: "restorations", label: "Restorations" },
  { id: "xrays", label: "X-Rays" },
  { id: "oral_surgery", label: "Oral Surgery" },
  { id: "preventive", label: "Preventive" },
]

export default function Services() {
  const [services, setServices] = useState<Service[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAll, setShowAll] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState("all")

  // Fetch services from API
  useEffect(() => {
    const fetchServices = async () => {
      try {
        setIsLoading(true)
        const data = await api.getServices()
        setServices(data)
      } catch (error) {
        console.error("Failed to fetch services:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchServices()
  }, [])

  // Filter services by category
  const filteredServices = selectedCategory === "all" 
    ? services 
    : services.filter(service => service.category === selectedCategory)

  const displayedServices = showAll ? filteredServices : filteredServices.slice(0, 3)

  return (
    <section id="services" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-serif font-bold text-[var(--color-primary)] mb-4">Our Services</h2>
          <p className="text-lg text-[var(--color-text-muted)] max-w-2xl mx-auto">
            Comprehensive dental care tailored to your needs
          </p>
        </div>

        {showAll && (
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-6 py-2.5 rounded-lg font-medium transition-colors ${
                  selectedCategory === category.id
                    ? "bg-[var(--color-primary)] text-white"
                    : "bg-[var(--color-background)] text-[var(--color-text)] hover:bg-[var(--color-border)]"
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)]"></div>
          </div>
        ) : services.length === 0 ? (
          <div className="text-center py-20 bg-[var(--color-background)] rounded-xl">
            <p className="text-[var(--color-text-muted)] text-lg">No services available yet.</p>
            <p className="text-[var(--color-text-muted)] text-sm mt-2">Services will appear here once added by the clinic.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
              {displayedServices.map((service) => (
                <div
                  key={service.id}
                  className="bg-white border border-[var(--color-border)] rounded-xl overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <div className="relative h-48">
                    <Image 
                      src={service.image || "/placeholder.svg"} 
                      alt={service.name} 
                      fill 
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-semibold text-[var(--color-primary)] mb-2">{service.name}</h3>
                    <p className="text-[var(--color-text-muted)] leading-relaxed">{service.description}</p>
                  </div>
                </div>
              ))}
            </div>

            {filteredServices.length > 3 && (
              <div className="text-center">
                <button
                  onClick={() => setShowAll(!showAll)}
                  className="inline-flex items-center gap-2 px-8 py-3 bg-[var(--color-accent)] text-white rounded-lg hover:bg-[var(--color-accent-dark)] transition-colors font-medium"
                >
                  {showAll ? "Show Less" : "More Services"}
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}
