// Normalize API base to always point to the backend API (prevents hitting Next.js frontend 404s)
const rawBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"
const trimmedBase = rawBase.replace(/\/+$/, "")
const API_BASE_URL = trimmedBase.endsWith("/api") ? trimmedBase : `${trimmedBase}/api`

interface LoginResponse {
  token: string
  user: {
    id: number
    username: string
    email: string
    user_type: "patient" | "staff" | "owner"
    first_name: string
    last_name: string
  }
}

export const api = {
  // Auth endpoints
  login: async (username: string, password: string): Promise<LoginResponse> => {
    const response = await fetch(`${API_BASE_URL}/login/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    })
    
    if (!response.ok) {
      // Parse error response
      const errorData = await response.json().catch(() => ({ error: "Login failed" }))
      
      // For 401 Unauthorized (invalid credentials), throw user-friendly error without console.error
      if (response.status === 401) {
        throw new Error(errorData.error || "Invalid username or password")
      }
      
      // For other errors (500, 503, etc.), log to console for debugging
      console.error("[API Error] Login failed:", response.status, errorData)
      throw new Error(errorData.error || "Login failed")
    }
    
    return response.json()
  },

  register: async (data: any) => {
    const response = await fetch(`${API_BASE_URL}/register/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      const error = await response.json()
      // Create a custom error object that preserves the error data
      const err: any = new Error("Registration failed")
      err.data = error
      throw err
    }
    return response.json()
  },

  logout: async (token: string) => {
    const response = await fetch(`${API_BASE_URL}/logout/`, {
      method: "POST",
      headers: {
        Authorization: `Token ${token}`,
        "Content-Type": "application/json",
      },
    })
    return response.json()
  },

  // Profile endpoints
  getProfile: async (token: string) => {
    const response = await fetch(`${API_BASE_URL}/profile/`, {
      headers: { Authorization: `Token ${token}` },
    })
    if (!response.ok) throw new Error("Failed to fetch profile")
    return response.json()
  },

  updateProfile: async (token: string, data: any) => {
    const response = await fetch(`${API_BASE_URL}/profile/`, {
      method: "PATCH",
      headers: {
        Authorization: `Token ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })
    if (!response.ok) throw new Error("Failed to update profile")
    return response.json()
  },

  // Services endpoints
  getServices: async (clinicId?: number) => {
    const params = clinicId ? `?clinic_id=${clinicId}` : '';
    const response = await fetch(`${API_BASE_URL}/services/${params}`)
    if (!response.ok) {
      throw new Error(`Failed to fetch services: ${response.statusText}`)
    }
    const data = await response.json()
    // Handle both paginated (object with results) and non-paginated (array) responses
    return Array.isArray(data) ? data : (data?.results || [])
  },

  createService: async (data: FormData, token: string) => {
    const response = await fetch(`${API_BASE_URL}/services/`, {
      method: "POST",
      headers: { Authorization: `Token ${token}` },
      body: data,
    })
    if (!response.ok) {
      // Try to parse error response
      let errorData: any = {}
      const contentType = response.headers.get("content-type")
      
      try {
        if (contentType?.includes("application/json")) {
          errorData = await response.json()
        } else {
          const textError = await response.text()
          console.error("Non-JSON error response:", textError)
          errorData = { error: textError }
        }
      } catch (e) {
        console.error("Failed to parse error response:", e)
      }
      
      console.error("Create service failed:", {
        status: response.status,
        statusText: response.statusText,
        errorData: errorData
      })
      
      // Handle authentication errors
      if (response.status === 401) {
        throw new Error("Your session has expired. Please log out and log in again.")
      }
      
      // Extract error message
      let errorMessage = "Failed to create service"
      if (errorData.detail) {
        errorMessage = errorData.detail
      } else if (errorData.error) {
        errorMessage = errorData.error
      } else if (typeof errorData === 'object' && Object.keys(errorData).length > 0) {
        // Handle field-specific errors
        const errors = Object.entries(errorData).map(([field, msgs]) => {
          const messages = Array.isArray(msgs) ? msgs.join(", ") : msgs
          return `${field}: ${messages}`
        }).join("; ")
        if (errors) errorMessage = errors
      }
      
      throw new Error(errorMessage)
    }
    return response.json()
  },

  updateService: async (id: number, data: FormData, token: string) => {
    const response = await fetch(`${API_BASE_URL}/services/${id}/`, {
      method: "PUT",
      headers: { Authorization: `Token ${token}` },
      body: data,
    })
    if (!response.ok) throw new Error("Failed to update service")
    return response.json()
  },

  deleteService: async (id: number, token: string) => {
    const response = await fetch(`${API_BASE_URL}/services/${id}/`, {
      method: "DELETE",
      headers: { Authorization: `Token ${token}` },
    })
    if (!response.ok) {
      // Try to parse error message from response
      try {
        const errorData = await response.json()
        throw new Error(errorData.message || errorData.error || "Failed to delete service")
      } catch (parseError) {
        throw new Error("Failed to delete service")
      }
    }
  },

  // Appointments endpoints
  getAppointments: async (token: string, clinicId?: number) => {
    const params = clinicId ? `?clinic_id=${clinicId}` : '';
    const response = await fetch(`${API_BASE_URL}/appointments/${params}`, {
      headers: { Authorization: `Token ${token}` },
    })
    if (!response.ok) {
      throw new Error(`Failed to fetch appointments: ${response.statusText}`)
    }
    const data = await response.json()
    // Ensure we always return an array
    return Array.isArray(data) ? data : (data.results || [])
  },

  createAppointment: async (data: any, token: string) => {
    const response = await fetch(`${API_BASE_URL}/appointments/`, {
      method: "POST",
      headers: {
        Authorization: `Token ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      const errorData = await response.json()
      const error: any = new Error(errorData.message || "Failed to create appointment")
      error.response = { data: errorData }
      throw error
    }
    return response.json()
  },

  updateAppointment: async (id: number, data: any, token: string) => {
    const response = await fetch(`${API_BASE_URL}/appointments/${id}/`, {
      method: "PATCH",
      headers: {
        Authorization: `Token ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })
    if (!response.ok) throw new Error("Failed to update appointment")
    return response.json()
  },

  deleteAppointment: async (id: number, token: string) => {
    const response = await fetch(`${API_BASE_URL}/appointments/${id}/`, {
      method: "DELETE",
      headers: { Authorization: `Token ${token}` },
    })
    if (!response.ok) throw new Error("Failed to delete appointment")
  },

  // Get booked time slots for double booking prevention
  getBookedSlots: async (dentistId?: number, date?: string, token?: string) => {
    const params = new URLSearchParams()
    if (dentistId) params.append('dentist_id', dentistId.toString())
    if (date) params.append('date', date)
    
    const headers: any = {}
    if (token) headers.Authorization = `Token ${token}`
    
    const response = await fetch(`${API_BASE_URL}/appointments/booked_slots/?${params.toString()}`, {
      headers,
    })
    if (!response.ok) throw new Error("Failed to fetch booked slots")
    return response.json()
  },

  // Reschedule request endpoints
  requestReschedule: async (id: number, data: { date: string; time: string; service?: number; dentist?: number; notes?: string }, token: string) => {
    const response = await fetch(`${API_BASE_URL}/appointments/${id}/request_reschedule/`, {
      method: "POST",
      headers: {
        Authorization: `Token ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })
    if (!response.ok) throw new Error("Failed to request reschedule")
    return response.json()
  },

  approveReschedule: async (id: number, token: string) => {
    const response = await fetch(`${API_BASE_URL}/appointments/${id}/approve_reschedule/`, {
      method: "POST",
      headers: {
        Authorization: `Token ${token}`,
        "Content-Type": "application/json",
      },
    })
    if (!response.ok) throw new Error("Failed to approve reschedule")
    return response.json()
  },

  rejectReschedule: async (id: number, token: string) => {
    const response = await fetch(`${API_BASE_URL}/appointments/${id}/reject_reschedule/`, {
      method: "POST",
      headers: {
        Authorization: `Token ${token}`,
        "Content-Type": "application/json",
      },
    })
    if (!response.ok) throw new Error("Failed to reject reschedule")
    return response.json()
  },

  // Cancel request endpoints
  requestCancel: async (id: number, reason: string, token: string) => {
    const response = await fetch(`${API_BASE_URL}/appointments/${id}/request_cancel/`, {
      method: "POST",
      headers: {
        Authorization: `Token ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ reason }),
    })
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = errorData.error || errorData.detail || "Failed to request cancellation"
      throw new Error(errorMessage)
    }
    return response.json()
  },

  approveCancel: async (id: number, token: string) => {
    const response = await fetch(`${API_BASE_URL}/appointments/${id}/approve_cancel/`, {
      method: "POST",
      headers: {
        Authorization: `Token ${token}`,
        "Content-Type": "application/json",
      },
    })
    if (!response.ok) throw new Error("Failed to approve cancellation")
    return response.json()
  },

  rejectCancel: async (id: number, token: string) => {
    const response = await fetch(`${API_BASE_URL}/appointments/${id}/reject_cancel/`, {
      method: "POST",
      headers: {
        Authorization: `Token ${token}`,
        "Content-Type": "application/json",
      },
    })
    if (!response.ok) throw new Error("Failed to reject cancellation")
    return response.json()
  },

  // Mark appointment as complete/missed
  markAppointmentComplete: async (id: number, data: { treatment?: string; diagnosis?: string; notes?: string }, token: string) => {
    const response = await fetch(`${API_BASE_URL}/appointments/${id}/mark_completed/`, {
      method: "POST",
      headers: {
        Authorization: `Token ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })
    if (!response.ok) throw new Error("Failed to mark appointment as complete")
    return response.json()
  },

  markAppointmentMissed: async (id: number, token: string) => {
    const response = await fetch(`${API_BASE_URL}/appointments/${id}/mark_missed/`, {
      method: "POST",
      headers: {
        Authorization: `Token ${token}`,
        "Content-Type": "application/json",
      },
    })
    if (!response.ok) throw new Error("Failed to mark appointment as missed")
    return response.json()
  },

  // Patients endpoints
  getPatients: async (token: string, page: number = 1, pageSize: number = 20) => {
    const response = await fetch(
      `${API_BASE_URL}/users/patients/?page=${page}&page_size=${pageSize}`,
      {
        headers: { Authorization: `Token ${token}` },
      }
    )
    if (!response.ok) throw new Error('Failed to fetch patients')
    // Response format: { count: number, next: string|null, previous: string|null, results: Patient[] }
    const data = await response.json()
    // Ensure results array exists
    if (data.results && !Array.isArray(data.results)) {
      data.results = []
    }
    return data
  },

  // Get all patients without pagination (for backward compatibility)
  getAllPatients: async (token: string) => {
    const response = await fetch(`${API_BASE_URL}/users/patients/?page_size=10000`, {
      headers: { Authorization: `Token ${token}` },
    })
    if (!response.ok) throw new Error('Failed to fetch patients')
    const data = await response.json()
    // Return just the results array for backward compatibility
    return data.results || data
  },

  getPatientById: async (patientId: number, token: string) => {
    const response = await fetch(`${API_BASE_URL}/users/${patientId}/`, {
      headers: { Authorization: `Token ${token}` },
    })
    if (!response.ok) throw new Error('Failed to fetch patient')
    return response.json()
  },

  // Inventory endpoints
  getInventory: async (token: string, clinicId?: number) => {
    const url = clinicId 
      ? `${API_BASE_URL}/inventory/?clinic_id=${clinicId}`
      : `${API_BASE_URL}/inventory/`
    const response = await fetch(url, {
      headers: { Authorization: `Token ${token}` },
    })
    if (!response.ok) return []
    const data = await response.json()
    // Handle both paginated (object with results) and non-paginated (array) responses
    return Array.isArray(data) ? data : (data?.results || [])
  },

  createInventoryItem: async (data: any, token: string) => {
    const response = await fetch(`${API_BASE_URL}/inventory/`, {
      method: 'POST',
      headers: {
        Authorization: `Token ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
    if (!response.ok) throw new Error('Failed to create inventory item')
    return response.json()
  },

  updateInventoryItem: async (id: number, data: any, token: string) => {
    const response = await fetch(`${API_BASE_URL}/inventory/${id}/`, {
      method: 'PATCH',
      headers: {
        Authorization: `Token ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
    if (!response.ok) throw new Error('Failed to update inventory item')
    return response.json()
  },

  deleteInventoryItem: async (id: number, token: string) => {
    const response = await fetch(`${API_BASE_URL}/inventory/${id}/`, {
      method: 'DELETE',
      headers: { Authorization: `Token ${token}` },
    })
    if (!response.ok) throw new Error('Failed to delete inventory item')
  },

  getLowStockCount: async (token: string) => {
    const response = await fetch(`${API_BASE_URL}/inventory/low_stock_count/`, {
      headers: { Authorization: `Token ${token}` },
    })
    if (!response.ok) throw new Error('Failed to fetch low stock count')
    return response.json()
  },

  // Billing endpoints
  getBilling: async (token: string) => {
    const response = await fetch(`${API_BASE_URL}/billing/`, {
      headers: { Authorization: `Token ${token}` },
    })
    return response.json()
  },

  // Staff endpoints (owner only)
  getStaff: async (token: string) => {
    const response = await fetch(`${API_BASE_URL}/users/staff/`, {
      headers: { Authorization: `Token ${token}` },
    })
    if (!response.ok) return []
    const data = await response.json()
    // Handle both paginated (object with results) and non-paginated (array) responses
    return Array.isArray(data) ? data : (data?.results || [])
  },

  createStaff: async (data: any, token: string) => {
    const response = await fetch(`${API_BASE_URL}/users/`, {
      method: "POST",
      headers: {
        Authorization: `Token ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })
    if (!response.ok) throw new Error("Failed to create staff")
    return response.json()
  },

  deleteStaff: async (id: number, token: string) => {
    const response = await fetch(`${API_BASE_URL}/users/${id}/`, {
      method: "DELETE",
      headers: { Authorization: `Token ${token}` },
    })
    if (!response.ok) throw new Error("Failed to delete staff")
  },

  updateStaff: async (id: number, data: any, token: string) => {
    const response = await fetch(`${API_BASE_URL}/users/${id}/`, {
      method: "PATCH",
      headers: {
        Authorization: `Token ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })
    if (!response.ok) throw new Error("Failed to update staff")
    return response.json()
  },

  // Analytics endpoints (owner/staff only)
  getAnalytics: async (token: string, params?: {
    period?: 'daily' | 'weekly' | 'monthly' | 'annual'
    clinic_id?: number | null
    start_date?: string
    end_date?: string
  }) => {
    const searchParams = new URLSearchParams()
    if (params?.period) searchParams.set('period', params.period)
    if (params?.clinic_id) searchParams.set('clinic_id', params.clinic_id.toString())
    if (params?.start_date) searchParams.set('start_date', params.start_date)
    if (params?.end_date) searchParams.set('end_date', params.end_date)

    const queryString = searchParams.toString()
    const url = `${API_BASE_URL}/analytics/${queryString ? `?${queryString}` : ''}`

    const response = await fetch(url, {
      headers: { Authorization: `Token ${token}` },
    })
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `Analytics request failed with status ${response.status}`)
    }
    return response.json()
  },

  // Teeth images endpoints
  uploadTeethImage: async (patientId: number, imageFile: File, notes: string, token: string, appointmentId?: number) => {
    const formData = new FormData()
    formData.append('patient', patientId.toString())
    formData.append('image', imageFile)
    formData.append('notes', notes)
    if (appointmentId) {
      formData.append('appointment', appointmentId.toString())
    }

    const response = await fetch(`${API_BASE_URL}/teeth-images/`, {
      method: 'POST',
      headers: { Authorization: `Token ${token}` },
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Failed to upload teeth image')
    }
    return response.json()
  },

  getLatestTeethImage: async (patientId: number, token: string) => {
    const response = await fetch(`${API_BASE_URL}/teeth-images/latest/?patient_id=${patientId}`, {
      headers: { Authorization: `Token ${token}` },
    })
    if (!response.ok) return null
    return response.json()
  },

  getPatientTeethImages: async (patientId: number, token: string) => {
    const response = await fetch(`${API_BASE_URL}/teeth-images/by_patient/?patient_id=${patientId}`, {
      headers: { Authorization: `Token ${token}` },
    })
    if (!response.ok) return []
    return response.json()
  },

  deleteTeethImage: async (id: number, token: string) => {
    const response = await fetch(`${API_BASE_URL}/teeth-images/${id}/`, {
      method: 'DELETE',
      headers: { Authorization: `Token ${token}` },
    })
    if (!response.ok) throw new Error('Failed to delete teeth image')
  },

  // Billing status endpoints
  updateBillingStatus: async (billingId: number, status: 'pending' | 'paid' | 'cancelled', token: string) => {
    const response = await fetch(`${API_BASE_URL}/billing/${billingId}/update_status/`, {
      method: 'PATCH',
      headers: {
        Authorization: `Token ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Failed to update billing status')
    }
    return response.json()
  },

  getBillingByStatus: async (status: string, token: string) => {
    const url = status === 'all' 
      ? `${API_BASE_URL}/billing/`
      : `${API_BASE_URL}/billing/?status=${status}`
    
    const response = await fetch(url, {
      headers: { Authorization: `Token ${token}` },
    })
    if (!response.ok) return []
    const data = await response.json()
    // Handle both paginated (object with results) and non-paginated (array) responses
    return Array.isArray(data) ? data : (data?.results || [])
  },

  // Dental Records endpoints
  getDentalRecords: async (patientId: number | null, token: string) => {
    const url = patientId 
      ? `${API_BASE_URL}/dental-records/?patient=${patientId}`
      : `${API_BASE_URL}/dental-records/`
    
    const response = await fetch(url, {
      headers: { Authorization: `Token ${token}` },
    })
    if (!response.ok) return []
    const data = await response.json()
    // Handle both paginated (object with results) and non-paginated (array) responses
    return Array.isArray(data) ? data : (data?.results || [])
  },

  getDentalRecord: async (id: number, token: string) => {
    const response = await fetch(`${API_BASE_URL}/dental-records/${id}/`, {
      headers: { Authorization: `Token ${token}` },
    })
    if (!response.ok) throw new Error('Failed to fetch dental record')
    return response.json()
  },

  createDentalRecord: async (data: any, token: string) => {
    const response = await fetch(`${API_BASE_URL}/dental-records/`, {
      method: 'POST',
      headers: {
        Authorization: `Token ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
    if (!response.ok) throw new Error('Failed to create dental record')
    return response.json()
  },

  // Documents (X-ray images) endpoints
  getDocuments: async (patientId: number | null, token: string) => {
    const url = patientId 
      ? `${API_BASE_URL}/documents/?patient=${patientId}`
      : `${API_BASE_URL}/documents/`
    
    const response = await fetch(url, {
      headers: { Authorization: `Token ${token}` },
    })
    if (!response.ok) return []
    const data = await response.json()
    // Ensure we always return an array
    return Array.isArray(data) ? data : (data.results || [])
  },

  uploadDocument: async (patientId: number, file: File, documentType: string, title: string, description: string, token: string, appointmentId?: number) => {
    const formData = new FormData()
    formData.append('patient', patientId.toString())
    formData.append('file', file)
    formData.append('document_type', documentType)
    formData.append('title', title)
    formData.append('description', description)
    if (appointmentId) {
      formData.append('appointment', appointmentId.toString())
    }

    const response = await fetch(`${API_BASE_URL}/documents/`, {
      method: 'POST',
      headers: { Authorization: `Token ${token}` },
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Failed to upload document')
    }
    return response.json()
  },

  deleteDocument: async (id: number, token: string) => {
    const response = await fetch(`${API_BASE_URL}/documents/${id}/`, {
      method: 'DELETE',
      headers: { Authorization: `Token ${token}` },
    })
    if (!response.ok) throw new Error('Failed to delete document')
  },

  // Password Reset endpoints
  requestPasswordReset: async (email: string) => {
    const response = await fetch(`${API_BASE_URL}/password-reset/request/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    if (!response.ok) throw new Error('Failed to request password reset')
    return response.json()
  },

  resetPassword: async (token: string, new_password: string) => {
    const response = await fetch(`${API_BASE_URL}/password-reset/confirm/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, new_password }),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to reset password')
    }
    return response.json()
  },

  // Staff Availability endpoints
  getStaffAvailability: async (staffId: number, token: string) => {
    const response = await fetch(`${API_BASE_URL}/staff-availability/?staff_id=${staffId}`, {
      headers: { Authorization: `Token ${token}` },
    })
    if (!response.ok) throw new Error('Failed to fetch staff availability')
    return response.json()
  },

  updateStaffAvailability: async (staffId: number, availability: any[], token: string) => {
    const response = await fetch(`${API_BASE_URL}/staff-availability/bulk_update/`, {
      method: 'POST',
      headers: {
        Authorization: `Token ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ staff_id: staffId, availability }),
    })
    if (!response.ok) throw new Error('Failed to update staff availability')
    return response.json()
  },

  getAvailableStaffByDate: async (date: string, token: string) => {
    const response = await fetch(`${API_BASE_URL}/staff-availability/by_date/?date=${date}`, {
      headers: { Authorization: `Token ${token}` },
    })
    if (!response.ok) throw new Error('Failed to fetch available staff')
    return response.json()
  },

  getDentistAvailability: async (dentistId: number, startDate: string, endDate: string, token: string) => {
    const response = await fetch(
      `${API_BASE_URL}/dentist-availability/?dentist_id=${dentistId}&start_date=${startDate}&end_date=${endDate}`,
      {
        headers: { Authorization: `Token ${token}` },
      }
    )
    if (!response.ok) return []
    return response.json()
  },

  // Dentist Notification endpoints (kept for backward compatibility)
  getNotifications: async (token: string) => {
    const response = await fetch(`${API_BASE_URL}/notifications/`, {
      headers: { Authorization: `Token ${token}` },
    })
    if (!response.ok) throw new Error('Failed to fetch notifications')
    return response.json()
  },

  markNotificationRead: async (id: number, token: string) => {
    const response = await fetch(`${API_BASE_URL}/notifications/${id}/mark_read/`, {
      method: 'POST',
      headers: { Authorization: `Token ${token}` },
    })
    if (!response.ok) throw new Error('Failed to mark notification as read')
    return response.json()
  },

  markAllNotificationsRead: async (token: string) => {
    const response = await fetch(`${API_BASE_URL}/notifications/mark_all_read/`, {
      method: 'POST',
      headers: { Authorization: `Token ${token}` },
    })
    if (!response.ok) throw new Error('Failed to mark all notifications as read')
    return response.json()
  },

  getUnreadNotificationCount: async (token: string) => {
    const response = await fetch(`${API_BASE_URL}/notifications/unread_count/`, {
      headers: { Authorization: `Token ${token}` },
    })
    if (!response.ok) throw new Error('Failed to fetch unread count')
    return response.json()
  },

  // Appointment Notification endpoints (for staff and owner)
  getAppointmentNotifications: async (token: string) => {
    const response = await fetch(`${API_BASE_URL}/appointment-notifications/`, {
      headers: { Authorization: `Token ${token}` },
    })
    if (!response.ok) throw new Error('Failed to fetch appointment notifications')
    return response.json()
  },

  markAppointmentNotificationRead: async (id: number, token: string) => {
    const response = await fetch(`${API_BASE_URL}/appointment-notifications/${id}/mark_read/`, {
      method: 'POST',
      headers: { Authorization: `Token ${token}` },
    })
    if (!response.ok) throw new Error('Failed to mark notification as read')
    return response.json()
  },

  markAllAppointmentNotificationsRead: async (token: string) => {
    const response = await fetch(`${API_BASE_URL}/appointment-notifications/mark_all_read/`, {
      method: 'POST',
      headers: { Authorization: `Token ${token}` },
    })
    if (!response.ok) throw new Error('Failed to mark all notifications as read')
    return response.json()
  },

  clearAllAppointmentNotifications: async (token: string) => {
    const response = await fetch(`${API_BASE_URL}/appointment-notifications/clear_all/`, {
      method: 'POST',
      headers: { Authorization: `Token ${token}` },
    })
    if (!response.ok) throw new Error('Failed to clear all notifications')
    return response.json()
  },

  getAppointmentNotificationUnreadCount: async (token: string) => {
    if (!token || token.trim() === '') {
      throw new Error('No authentication token provided')
    }
    const response = await fetch(`${API_BASE_URL}/appointment-notifications/unread_count/`, {
      headers: { Authorization: `Token ${token}` },
    })
    if (!response.ok) throw new Error('Failed to fetch unread count')
    return response.json()
  },

  // Patient Intake Form endpoints
  getIntakeForms: async (token: string) => {
    const response = await fetch(`${API_BASE_URL}/intake-forms/`, {
      headers: { Authorization: `Token ${token}` },
    })
    if (!response.ok) throw new Error('Failed to fetch intake forms')
    return response.json()
  },

  getIntakeFormByPatient: async (patientId: number, token: string) => {
    const response = await fetch(`${API_BASE_URL}/intake-forms/by_patient/?patient_id=${patientId}`, {
      headers: { Authorization: `Token ${token}` },
    })
    if (!response.ok) throw new Error('Failed to fetch intake form')
    return response.json()
  },

  createIntakeForm: async (data: any, token: string) => {
    const response = await fetch(`${API_BASE_URL}/intake-forms/`, {
      method: 'POST',
      headers: {
        Authorization: `Token ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
    if (!response.ok) throw new Error('Failed to create intake form')
    return response.json()
  },

  updateIntakeForm: async (id: number, data: any, token: string) => {
    const response = await fetch(`${API_BASE_URL}/intake-forms/${id}/`, {
      method: 'PUT',
      headers: {
        Authorization: `Token ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
    if (!response.ok) throw new Error('Failed to update intake form')
    return response.json()
  },

  deleteIntakeForm: async (id: number, token: string) => {
    const response = await fetch(`${API_BASE_URL}/intake-forms/${id}/`, {
      method: 'DELETE',
      headers: { Authorization: `Token ${token}` },
    })
    if (!response.ok) throw new Error('Failed to delete intake form')
    return response.json()
  },

  // File Attachment endpoints
  getFileAttachments: async (token: string) => {
    const response = await fetch(`${API_BASE_URL}/file-attachments/`, {
      headers: { Authorization: `Token ${token}` },
    })
    if (!response.ok) throw new Error('Failed to fetch file attachments')
    return response.json()
  },

  getFilesByPatient: async (patientId: number, token: string) => {
    const response = await fetch(`${API_BASE_URL}/file-attachments/by_patient/?patient_id=${patientId}`, {
      headers: { Authorization: `Token ${token}` },
    })
    if (!response.ok) throw new Error('Failed to fetch files')
    return response.json()
  },

  uploadFile: async (formData: FormData, token: string) => {
    const response = await fetch(`${API_BASE_URL}/file-attachments/`, {
      method: 'POST',
      headers: { Authorization: `Token ${token}` },
      body: formData,
    })
    if (!response.ok) throw new Error('Failed to upload file')
    return response.json()
  },

  deleteFile: async (id: number, token: string) => {
    const response = await fetch(`${API_BASE_URL}/file-attachments/${id}/`, {
      method: 'DELETE',
      headers: { Authorization: `Token ${token}` },
    })
    if (!response.ok) throw new Error('Failed to delete file')
    return response.json()
  },

  // Clinical Notes endpoints
  getClinicalNotes: async (token: string) => {
    const response = await fetch(`${API_BASE_URL}/clinical-notes/`, {
      headers: { Authorization: `Token ${token}` },
    })
    if (!response.ok) throw new Error('Failed to fetch clinical notes')
    return response.json()
  },

  getNotesByPatient: async (patientId: number, token: string) => {
    const response = await fetch(`${API_BASE_URL}/clinical-notes/by_patient/?patient_id=${patientId}`, {
      headers: { Authorization: `Token ${token}` },
    })
    if (!response.ok) throw new Error('Failed to fetch notes')
    return response.json()
  },

  createClinicalNote: async (data: any, token: string) => {
    const response = await fetch(`${API_BASE_URL}/clinical-notes/`, {
      method: 'POST',
      headers: {
        Authorization: `Token ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
    if (!response.ok) throw new Error('Failed to create clinical note')
    return response.json()
  },

  updateClinicalNote: async (id: number, data: any, token: string) => {
    const response = await fetch(`${API_BASE_URL}/clinical-notes/${id}/`, {
      method: 'PUT',
      headers: {
        Authorization: `Token ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
    if (!response.ok) throw new Error('Failed to update clinical note')
    return response.json()
  },

  deleteClinicalNote: async (id: number, token: string) => {
    const response = await fetch(`${API_BASE_URL}/clinical-notes/${id}/`, {
      method: 'DELETE',
      headers: { Authorization: `Token ${token}` },
    })
    if (!response.ok) throw new Error('Failed to delete clinical note')
    return response.json()
  },

  // Treatment Assignment endpoints
  getTreatmentAssignments: async (token: string) => {
    const response = await fetch(`${API_BASE_URL}/treatment-assignments/`, {
      headers: { Authorization: `Token ${token}` },
    })
    if (!response.ok) throw new Error('Failed to fetch treatment assignments')
    return response.json()
  },

  getAssignmentsByPatient: async (patientId: number, token: string) => {
    const response = await fetch(`${API_BASE_URL}/treatment-assignments/by_patient/?patient_id=${patientId}`, {
      headers: { Authorization: `Token ${token}` },
    })
    if (!response.ok) throw new Error('Failed to fetch assignments')
    return response.json()
  },

  createTreatmentAssignment: async (data: any, token: string) => {
    const response = await fetch(`${API_BASE_URL}/treatment-assignments/`, {
      method: 'POST',
      headers: {
        Authorization: `Token ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
    if (!response.ok) throw new Error('Failed to create treatment assignment')
    return response.json()
  },

  updateTreatmentAssignment: async (id: number, data: any, token: string) => {
    const response = await fetch(`${API_BASE_URL}/treatment-assignments/${id}/`, {
      method: 'PUT',
      headers: {
        Authorization: `Token ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
    if (!response.ok) throw new Error('Failed to update treatment assignment')
    return response.json()
  },

  updateTreatmentStatus: async (id: number, status: string, token: string) => {
    const response = await fetch(`${API_BASE_URL}/treatment-assignments/${id}/update_status/`, {
      method: 'PATCH',
      headers: {
        Authorization: `Token ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status }),
    })
    if (!response.ok) throw new Error('Failed to update treatment status')
    return response.json()
  },

  deleteTreatmentAssignment: async (id: number, token: string) => {
    const response = await fetch(`${API_BASE_URL}/treatment-assignments/${id}/`, {
      method: 'DELETE',
      headers: { Authorization: `Token ${token}` },
    })
    if (!response.ok) throw new Error('Failed to delete treatment assignment')
    return response.json()
  },

  // Archive/Restore Patient endpoints
  archivePatient: async (patientId: number, token: string) => {
    const response = await fetch(`${API_BASE_URL}/users/${patientId}/archive/`, {
      method: 'POST',
      headers: { Authorization: `Token ${token}` },
    })
    if (!response.ok) throw new Error('Failed to archive patient')
    return response.json()
  },

  restorePatient: async (patientId: number, token: string) => {
    const response = await fetch(`${API_BASE_URL}/users/${patientId}/restore/`, {
      method: 'POST',
      headers: { Authorization: `Token ${token}` },
    })
    if (!response.ok) throw new Error('Failed to restore patient')
    return response.json()
  },

  getArchivedPatients: async (token: string) => {
    const response = await fetch(`${API_BASE_URL}/users/archived_patients/`, {
      headers: { Authorization: `Token ${token}` },
    })
    if (!response.ok) throw new Error('Failed to fetch archived patients')
    return response.json()
  },

  // Export Patient Records endpoint
  exportPatientRecords: async (patientId: number, token: string) => {
    const response = await fetch(`${API_BASE_URL}/users/${patientId}/export_records/`, {
      headers: { Authorization: `Token ${token}` },
    })
    if (!response.ok) throw new Error('Failed to export patient records')
    return response.json()
  },

  // Chatbot endpoint
  chatbotQuery: async (message: string, conversationHistory: Array<{ role: string; content: string }>, token?: string) => {
    const headers: HeadersInit = { 'Content-Type': 'application/json' }
    if (token) {
      headers['Authorization'] = `Token ${token}`
    }
    
    const response = await fetch(`${API_BASE_URL}/chatbot/`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ message, conversation_history: conversationHistory }),
    })
    if (!response.ok) throw new Error('Failed to query chatbot')
    return response.json()
  },

  // Invoice endpoints
  createInvoice: async (data: any, token: string) => {
    const response = await fetch(`${API_BASE_URL}/invoices/create_invoice/`, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      const error = await response.json()
      console.error('Invoice creation failed:', error)
      // Get detailed error message(s)
      const errorMessage = error.error || error.detail || error.message || 
        (error.appointment_id ? `Appointment: ${error.appointment_id}` : null) ||
        (error.service_charge ? `Service charge: ${error.service_charge}` : null) ||
        (error.items ? `Items: ${JSON.stringify(error.items)}` : null) ||
        JSON.stringify(error) ||
        'Failed to create invoice'
      throw new Error(errorMessage)
    }
    return response.json()
  },

  getInvoices: async (token: string, patientId?: number) => {
    const params = patientId ? `?patient_id=${patientId}` : ''
    const response = await fetch(`${API_BASE_URL}/invoices/${params}`, {
      headers: { 'Authorization': `Token ${token}` },
    })
    if (!response.ok) throw new Error('Failed to fetch invoices')
    const data = await response.json()
    return Array.isArray(data) ? data : (data?.results || [])
  },

  getInvoice: async (invoiceId: number, token: string) => {
    const response = await fetch(`${API_BASE_URL}/invoices/${invoiceId}/`, {
      headers: { 'Authorization': `Token ${token}` },
    })
    if (!response.ok) throw new Error('Failed to fetch invoice')
    return response.json()
  },

  downloadInvoicePDF: async (invoiceId: number, token: string) => {
    const response = await fetch(`${API_BASE_URL}/invoices/${invoiceId}/download-pdf/`, {
      headers: { 'Authorization': `Token ${token}` },
    })
    
    if (!response.ok) {
      // Try to get error message from JSON response
      try {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to download invoice PDF')
      } catch (e) {
        // If parsing JSON fails, throw generic error
        if (e instanceof Error && e.message !== 'Failed to download invoice PDF') {
          throw new Error('Failed to download invoice PDF')
        }
        throw e
      }
    }
    
    // Get the filename from Content-Disposition header
    const contentDisposition = response.headers.get('Content-Disposition')
    let filename = `invoice-${invoiceId}.pdf`
    if (contentDisposition) {
      const matches = /filename="?([^"]+)"?/.exec(contentDisposition)
      if (matches && matches[1]) {
        filename = matches[1]
      }
    }
    
    // Get the blob and trigger download
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  },

  getPatientBalance: async (patientId: number, token: string) => {
    const response = await fetch(`${API_BASE_URL}/invoices/patient_balance/${patientId}/`, {
      headers: { 'Authorization': `Token ${token}` },
    })
    if (!response.ok) throw new Error('Failed to fetch patient balance')
    return response.json()
  },

  // Payment endpoints
  recordPayment: async (data: any, token: string) => {
    const response = await fetch(`${API_BASE_URL}/payments/record_payment/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${token}`,
      },
      body: JSON.stringify(data),
    })
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to record payment' }))
      console.error('Payment recording failed:', error)
      throw new Error(error.error || error.detail || 'Failed to record payment')
    }
    
    return response.json()
  },

  getPayments: async (token: string, filters?: {
    patient_id?: number
    clinic_id?: number
    start_date?: string
    end_date?: string
    payment_method?: string
    include_voided?: boolean
  }) => {
    const params = new URLSearchParams()
    if (filters?.patient_id) params.append('patient_id', filters.patient_id.toString())
    if (filters?.clinic_id) params.append('clinic_id', filters.clinic_id.toString())
    if (filters?.start_date) params.append('start_date', filters.start_date)
    if (filters?.end_date) params.append('end_date', filters.end_date)
    if (filters?.payment_method) params.append('payment_method', filters.payment_method)
    if (filters?.include_voided !== undefined) params.append('include_voided', filters.include_voided.toString())
    
    const queryString = params.toString()
    const response = await fetch(`${API_BASE_URL}/payments/${queryString ? `?${queryString}` : ''}`, {
      headers: { 'Authorization': `Token ${token}` },
    })
    
    if (!response.ok) throw new Error('Failed to fetch payments')
    const data = await response.json()
    return Array.isArray(data) ? data : (data?.results || [])
  },

  getPayment: async (paymentId: number, token: string) => {
    const response = await fetch(`${API_BASE_URL}/payments/${paymentId}/`, {
      headers: { 'Authorization': `Token ${token}` },
    })
    if (!response.ok) throw new Error('Failed to fetch payment')
    return response.json()
  },

  getPatientPayments: async (patientId: number, token: string) => {
    const response = await fetch(`${API_BASE_URL}/payments/patient_payments/${patientId}/`, {
      headers: { 'Authorization': `Token ${token}` },
    })
    if (!response.ok) throw new Error('Failed to fetch patient payments')
    return response.json()
  },

  voidPayment: async (paymentId: number, reason: string, token: string) => {
    const response = await fetch(`${API_BASE_URL}/payments/${paymentId}/void/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${token}`,
      },
      body: JSON.stringify({ reason }),
    })
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to void payment' }))
      throw new Error(error.error || 'Failed to void payment')
    }
    
    return response.json()
  },
}

// Export all API functions
export const {
  login,
  register,
  logout,
  getProfile,
  updateProfile,
  getServices,
  createService,
  updateService,
  deleteService,
  getAppointments,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  getBookedSlots,
  requestReschedule,
  approveReschedule,
  rejectReschedule,
  requestCancel,
  approveCancel,
  rejectCancel,
  markAppointmentComplete,
  markAppointmentMissed,
  getPatients,
  getPatientById,
  getInventory,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  getLowStockCount,
  getBilling,
  getStaff,
  createStaff,
  deleteStaff,
  updateStaff,
  getAnalytics,
  uploadTeethImage,
  getLatestTeethImage,
  getPatientTeethImages,
  deleteTeethImage,
  updateBillingStatus,
  getBillingByStatus,
  getDentalRecords,
  getDentalRecord,
  createDentalRecord,
  getDocuments,
  uploadDocument,
  deleteDocument,
  requestPasswordReset,
  resetPassword,
  getStaffAvailability,
  updateStaffAvailability,
  getAvailableStaffByDate,
  getDentistAvailability,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getUnreadNotificationCount,
  getAppointmentNotifications,
  markAppointmentNotificationRead,
  markAllAppointmentNotificationsRead,
  getAppointmentNotificationUnreadCount,
  getIntakeForms,
  getIntakeFormByPatient,
  createIntakeForm,
  updateIntakeForm,
  deleteIntakeForm,
  getFileAttachments,
  getFilesByPatient,
  uploadFile,
  deleteFile,
  getClinicalNotes,
  getNotesByPatient,
  createClinicalNote,
  updateClinicalNote,
  deleteClinicalNote,
  getTreatmentAssignments,
  getAssignmentsByPatient,
  createTreatmentAssignment,
  updateTreatmentAssignment,
  updateTreatmentStatus,
  deleteTreatmentAssignment,
  archivePatient,
  restorePatient,
  getArchivedPatients,
  exportPatientRecords,
  chatbotQuery,
  createInvoice,
  getInvoices,
  getInvoice,
  downloadInvoicePDF,
  getPatientBalance,
  recordPayment,
  getPayments,
  getPayment,
  getPatientPayments,
  voidPayment,
} = api
