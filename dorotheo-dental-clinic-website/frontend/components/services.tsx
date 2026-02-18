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
  duration: number
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

  // Format duration to show hours and minutes
  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} mins`
    }
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (mins === 0) {
      return `${hours}hr${hours > 1 ? 's' : ''}`
    }
    return `${hours}hr${hours > 1 ? 's' : ''} ${mins}mins`
  }

  // Fetch services from API
  useEffect(() => {
    const fetchServices = async () => {
      try {
        setIsLoading(true)
        const data = await api.getServices()
        // Ensure data is always an array
        setServices(Array.isArray(data) ? data : [])
      } catch (error) {
        console.error("Failed to fetch services:", error)
        setServices([]) // Set empty array on error
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
    <section id="services" className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8 sm:mb-10 md:mb-12">
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[var(--color-primary)] mb-3 sm:mb-4">Our Services</h2>
          <p className="text-base sm:text-lg text-[var(--color-text-muted)] max-w-2xl mx-auto px-4">
            Comprehensive dental care tailored to your needs
          </p>
        </div>

        {showAll && (
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-6 sm:mb-8 px-2">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg font-medium transition-colors text-sm sm:text-base touch-manipulation ${
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
          <div className="flex justify-center items-center py-16 sm:py-20">
            <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-[var(--color-primary)]"></div>
          </div>
        ) : services.length === 0 ? (
          <div className="text-center py-16 sm:py-20 bg-[var(--color-background)] rounded-xl mx-4">
            <p className="text-[var(--color-text-muted)] text-base sm:text-lg">No services available yet.</p>
            <p className="text-[var(--color-text-muted)] text-sm mt-2">Services will appear here once added by the clinic.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8 mb-6 sm:mb-8">
              {displayedServices.map((service) => (
                <div
                  key={service.id}
                  className="bg-white border border-[var(--color-border)] rounded-xl overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <div className="relative h-40 sm:h-48">
                    <Image 
                      src={service.image || "/placeholder.svg"} 
                      alt={service.name} 
                      fill 
                      className="object-cover"
                      unoptimized
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  </div>
                  <div className="p-4 sm:p-6">
                    <div className="flex items-start justify-between mb-2 gap-2">
                      <h3 className="text-lg sm:text-xl font-semibold text-[var(--color-primary)] flex-1">{service.name}</h3>
                      <span className="inline-block px-2 sm:px-3 py-1 bg-blue-50 text-blue-600 text-xs rounded-full font-medium whitespace-nowrap flex-shrink-0">
                        {formatDuration(service.duration)}
                      </span>
                    </div>
                    <p className="text-sm sm:text-base text-[var(--color-text-muted)] leading-relaxed">{service.description}</p>
                  </div>
                </div>
              ))}
            </div>

            {filteredServices.length > 3 && (
              <div className="text-center px-4">
                <button
                  onClick={() => setShowAll(!showAll)}
                  className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 bg-[var(--color-accent)] text-white rounded-lg hover:bg-[var(--color-accent-dark)] transition-colors font-medium text-sm sm:text-base touch-manipulation"
                >
                  {showAll ? "Show Less" : "More Services"}
                  <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}
