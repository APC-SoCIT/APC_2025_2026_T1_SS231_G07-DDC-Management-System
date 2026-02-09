"use client"

import { useState, useEffect } from "react"
import { Camera, Download, X, Activity, Image as ImageIcon, Scan, FileHeart, FileText } from "lucide-react"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { ClinicBadge } from "@/components/clinic-badge"

interface ClinicLocation {
  id: number
  name: string
  address: string
  city: string
  state: string
  zipcode: string
  phone: string
  email: string
}

interface TeethImage {
  id: number
  image: string
  image_url: string
  uploaded_at: string
  uploaded_by: number
  uploaded_by_name?: string
  notes: string
  is_latest: boolean
  document_type?: string
  title?: string
  clinic?: number | null
  clinic_data?: ClinicLocation | null
}

type TabType = 'all' | 'xray' | 'dental_image' | 'scan'

export default function TeethImages() {
  const { user, token } = useAuth()
  const [allImages, setAllImages] = useState<TeethImage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState<TeethImage | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('all')

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id || !token) {
        console.log("Missing user or token", { userId: user?.id, hasToken: !!token })
        return
      }

      try {
        setIsLoading(true)
        
        console.log("Fetching dental images for patient:", user.id)
        
        // Fetch all patient documents
        const docs = await api.getDocuments(user.id, token)
        console.log("All documents:", docs)
        
        // Filter only image types (xray, dental_image, scan)
        const imageDocuments = docs.filter((doc: any) => 
          doc.document_type === 'xray' || 
          doc.document_type === 'dental_image' || 
          doc.document_type === 'scan'
        )
        
        // Convert to TeethImage format
        const images = imageDocuments.map((doc: any) => ({
          id: doc.id,
          image: doc.file,
          image_url: doc.file_url || doc.file,
          uploaded_at: doc.uploaded_at,
          uploaded_by: doc.uploaded_by,
          uploaded_by_name: doc.uploaded_by_name,
          notes: doc.description || '',
          is_latest: false,
          document_type: doc.document_type,
          title: doc.title,
          clinic: doc.clinic,
          clinic_data: doc.clinic_data
        }))
        
        console.log("Filtered image documents:", images)
        setAllImages(images)
      } catch (error) {
        console.error("Error fetching dental images:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [user?.id, token])

  // Filter images by active tab
  const getFilteredImages = () => {
    if (activeTab === 'all') {
      // Sort by upload date, newest first
      return [...allImages].sort((a, b) => 
        new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime()
      )
    }
    return allImages.filter(img => img.document_type === activeTab)
  }

  const filteredImages = getFilteredImages()

  // Count images by type
  const xrayCount = allImages.filter(img => img.document_type === 'xray').length
  const dentalImageCount = allImages.filter(img => img.document_type === 'dental_image').length
  const scanCount = allImages.filter(img => img.document_type === 'scan').length

  const handleDownloadImage = (imageUrl: string, filename: string) => {
    fetch(imageUrl)
      .then(response => response.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
      })
      .catch(error => {
        console.error('Download failed:', error)
        // Fallback to direct link
        const link = document.createElement('a')
        link.href = imageUrl
        link.download = filename
        link.target = '_blank'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      })
  }

  const renderImageCard = (image: TeethImage) => (
    <div key={image.id} className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow">
      {image.clinic_data && (
        <div className="mb-2">
          <ClinicBadge clinic={image.clinic_data} size="sm" />
        </div>
      )}
      <div 
        className="relative rounded overflow-hidden mb-2 bg-gray-100 cursor-pointer hover:opacity-90 transition-opacity"
        onClick={() => setSelectedImage(image)}
      >
        <img 
          src={image.image_url} 
          alt={image.title || `Image from ${new Date(image.uploaded_at).toLocaleDateString()}`} 
          className="w-full h-40 object-cover"
          onError={(e) => {
            e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='160'%3E%3Crect width='200' height='160' fill='%23f0f0f0'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='12' fill='%23999'%3ENo image%3C/text%3E%3C/svg%3E"
          }}
        />
      </div>
      {image.title && (
        <h4 className="font-medium text-sm text-gray-900 mb-1 line-clamp-1">{image.title}</h4>
      )}
      <p className="text-xs text-gray-500 mb-1">
        {new Date(image.uploaded_at).toLocaleDateString()}
      </p>
      {image.uploaded_by_name && (
        <p className="text-xs text-gray-500 mb-2">
          Dr. {image.uploaded_by_name}
        </p>
      )}
      {image.notes && (
        <p className="text-xs text-gray-600 mb-2 line-clamp-2">{image.notes}</p>
      )}
      <button
        onClick={() => handleDownloadImage(image.image_url, `${image.title || 'image'}-${image.uploaded_at}.jpg`)}
        className="w-full flex items-center justify-center gap-1 px-2 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors cursor-pointer"
      >
        <Download className="w-3 h-3" />
        Download
      </button>
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-[var(--color-primary)] mb-2">Teeth and X-Ray Images</h1>
        <p className="text-[var(--color-text-muted)]">View your dental photos and X-ray images</p>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-6">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)] mx-auto"></div>
          </div>
        </div>
      ) : (
        <>
          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <div className="flex flex-wrap gap-2 -mb-px">
              <button
                onClick={() => setActiveTab('all')}
                className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'all'
                    ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Activity className="w-4 h-4" />
                All Files
                <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700">
                  {allImages.length}
                </span>
              </button>
              
              <button
                onClick={() => setActiveTab('xray')}
                className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'xray'
                    ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Scan className="w-4 h-4" />
                X-Ray
                <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700">
                  {xrayCount}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('dental_image')}
                className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'dental_image'
                    ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <ImageIcon className="w-4 h-4" />
                Dental Pictures
                <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700">
                  {dentalImageCount}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('scan')}
                className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'scan'
                    ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FileHeart className="w-4 h-4" />
                Dental Scan
                <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700">
                  {scanCount}
                </span>
              </button>
            </div>
          </div>

          {/* Image Grid */}
          {filteredImages.length === 0 ? (
            <div className="bg-white rounded-xl border border-[var(--color-border)] p-6">
              <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">
                  {activeTab === 'all' 
                    ? 'No files uploaded yet'
                    : `No ${activeTab.replace('_', ' ')} files found`}
                </p>
                <p className="text-xs text-gray-400 mt-1">Your dentist will upload images during your visits</p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-[var(--color-border)] p-6">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {filteredImages.map((image) => renderImageCard(image))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Image Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div 
            className="relative max-w-5xl w-full bg-white rounded-xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 z-10 p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-6 h-6 text-gray-700" />
            </button>

            <div className="p-6">
              <div className="mb-4">
                <img 
                  src={selectedImage.image_url} 
                  alt="Teeth image" 
                  className="w-full h-auto max-h-[70vh] object-contain rounded-lg"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">
                      <strong>Uploaded:</strong> {new Date(selectedImage.uploaded_at).toLocaleDateString()}
                    </p>
                    {selectedImage.uploaded_by_name && (
                      <p className="text-sm text-gray-500">
                        <strong>Uploaded by:</strong> Dr. {selectedImage.uploaded_by_name}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDownloadImage(selectedImage.image_url, `teeth-${selectedImage.uploaded_at}.jpg`)}
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                </div>

                {selectedImage.notes && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-700 mb-1">Notes:</p>
                    <p className="text-sm text-gray-600">{selectedImage.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
