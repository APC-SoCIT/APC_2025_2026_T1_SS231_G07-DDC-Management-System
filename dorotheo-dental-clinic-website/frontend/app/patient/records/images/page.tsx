"use client"

import { useState, useEffect } from "react"
import { Camera, Download } from "lucide-react"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"

interface TeethImage {
  id: number
  image: string
  image_url: string
  uploaded_at: string
  uploaded_by: number
  uploaded_by_name?: string
  notes: string
  is_latest: boolean
}

export default function TeethImages() {
  const { user, token } = useAuth()
  const [latestImage, setLatestImage] = useState<TeethImage | null>(null)
  const [previousImages, setPreviousImages] = useState<TeethImage[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id || !token) return

      try {
        setIsLoading(true)
        
        // Fetch latest teeth image
        const latest = await api.getLatestTeethImage(user.id, token)
        setLatestImage(latest)

        // Fetch all patient teeth images
        const allImages = await api.getPatientTeethImages(user.id, token)
        setPreviousImages(allImages.filter((img: TeethImage) => !img.is_latest))
      } catch (error) {
        console.error("Error fetching teeth images:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [user?.id, token])

  const handleDownloadImage = (imageUrl: string, filename: string) => {
    const link = document.createElement('a')
    link.href = imageUrl
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold text-[var(--color-primary)] mb-2">Teeth & X-Ray Images</h1>
        <p className="text-[var(--color-text-muted)]">View your dental photos and X-ray images</p>
      </div>

      <div className="bg-white rounded-xl border border-[var(--color-border)] p-6">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)] mx-auto"></div>
          </div>
        ) : latestImage || previousImages.length > 0 ? (
          <div className="space-y-6">
            {/* Latest Image */}
            {latestImage && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xl font-semibold text-gray-900">Current Image</h2>
                  <button 
                    onClick={() => handleDownloadImage(latestImage.image_url, `teeth-${latestImage.uploaded_at}.jpg`)}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                </div>
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="relative rounded-lg overflow-hidden mb-3 bg-gray-100">
                    <img 
                      src={latestImage.image_url} 
                      alt="Current teeth condition" 
                      className="w-full h-auto object-contain"
                      onError={(e) => {
                        e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='400'%3E%3Crect width='800' height='400' fill='%23f0f0f0'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='24' fill='%23999'%3ENo image available%3C/text%3E%3C/svg%3E"
                      }}
                    />
                  </div>
                  <div className="text-sm text-gray-500 mb-2">
                    <strong>Uploaded:</strong> {new Date(latestImage.uploaded_at).toLocaleDateString()}
                  </div>
                  {latestImage.uploaded_by_name && (
                    <div className="text-sm text-gray-500 mb-2">
                      <strong>Uploaded by:</strong> Dr. {latestImage.uploaded_by_name}
                    </div>
                  )}
                  {latestImage.notes && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm font-medium text-gray-700 mb-1">Notes:</p>
                      <p className="text-sm text-gray-600">{latestImage.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Previous Images */}
            {previousImages.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">Previous Images</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {previousImages.map((image) => (
                    <div key={image.id} className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow">
                      <div className="relative rounded overflow-hidden mb-2 bg-gray-100">
                        <img 
                          src={image.image_url} 
                          alt={`Teeth from ${new Date(image.uploaded_at).toLocaleDateString()}`} 
                          className="w-full h-32 object-cover"
                          onError={(e) => {
                            e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='128'%3E%3Crect width='200' height='128' fill='%23f0f0f0'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='12' fill='%23999'%3ENo image%3C/text%3E%3C/svg%3E"
                          }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mb-1">
                        {new Date(image.uploaded_at).toLocaleDateString()}
                      </p>
                      {image.uploaded_by_name && (
                        <p className="text-xs text-gray-500 mb-2">
                          Dr. {image.uploaded_by_name}
                        </p>
                      )}
                      <button
                        onClick={() => handleDownloadImage(image.image_url, `teeth-${image.uploaded_at}.jpg`)}
                        className="w-full flex items-center justify-center gap-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                      >
                        <Download className="w-3 h-3" />
                        Download
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <Camera className="w-16 h-16 mx-auto mb-4 text-gray-400 opacity-30" />
            <p className="text-lg font-medium text-gray-900 mb-2">No Teeth Images Yet</p>
            <p className="text-sm text-gray-600">Your dentist will upload images during your visits</p>
          </div>
        )}
      </div>
    </div>
  )
}
