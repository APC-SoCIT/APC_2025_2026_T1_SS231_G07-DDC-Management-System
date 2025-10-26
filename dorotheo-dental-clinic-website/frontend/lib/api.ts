const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"

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
    console.log("[v0] Attempting login to:", `${API_BASE_URL}/login/`)
    const response = await fetch(`${API_BASE_URL}/login/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    })
    console.log("[v0] Login response status:", response.status)
    if (!response.ok) {
      const error = await response.text()
      console.error("[v0] Login error:", error)
      throw new Error("Login failed")
    }
    return response.json()
  },

  register: async (data: any) => {
    console.log("[v0] Attempting registration to:", `${API_BASE_URL}/register/`)
    console.log("[v0] Registration data:", data)
    const response = await fetch(`${API_BASE_URL}/register/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    console.log("[v0] Registration response status:", response.status)
    if (!response.ok) {
      const error = await response.json()
      console.error("[v0] Registration error:", error)
      throw new Error(JSON.stringify(error))
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
  getServices: async () => {
    const response = await fetch(`${API_BASE_URL}/services/`)
    return response.json()
  },

  createService: async (data: FormData, token: string) => {
    const response = await fetch(`${API_BASE_URL}/services/`, {
      method: "POST",
      headers: { Authorization: `Token ${token}` },
      body: data,
    })
    if (!response.ok) throw new Error("Failed to create service")
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
    if (!response.ok) throw new Error("Failed to delete service")
  },

  // Appointments endpoints
  getAppointments: async (token: string) => {
    const response = await fetch(`${API_BASE_URL}/appointments/`, {
      headers: { Authorization: `Token ${token}` },
    })
    return response.json()
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
    if (!response.ok) throw new Error("Failed to create appointment")
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
  getPatients: async (token: string) => {
    const response = await fetch(`${API_BASE_URL}/users/patients/`, {
      headers: { Authorization: `Token ${token}` },
    })
    return response.json()
  },

  getPatientById: async (patientId: number, token: string) => {
    const response = await fetch(`${API_BASE_URL}/users/${patientId}/`, {
      headers: { Authorization: `Token ${token}` },
    })
    if (!response.ok) throw new Error('Failed to fetch patient')
    return response.json()
  },

  // Inventory endpoints
  getInventory: async (token: string) => {
    const response = await fetch(`${API_BASE_URL}/inventory/`, {
      headers: { Authorization: `Token ${token}` },
    })
    return response.json()
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
    return response.json()
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

  // Analytics endpoints (owner only)
  getAnalytics: async (token: string) => {
    const response = await fetch(`${API_BASE_URL}/analytics/`, {
      headers: { Authorization: `Token ${token}` },
    })
    return response.json()
  },

  // Teeth images endpoints
  uploadTeethImage: async (patientId: number, imageFile: File, notes: string, token: string) => {
    const formData = new FormData()
    formData.append('patient', patientId.toString())
    formData.append('image', imageFile)
    formData.append('notes', notes)

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
    return response.json()
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
    return response.json()
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
    return response.json()
  },

  uploadDocument: async (patientId: number, file: File, documentType: string, title: string, description: string, token: string) => {
    const formData = new FormData()
    formData.append('patient', patientId.toString())
    formData.append('file', file)
    formData.append('document_type', documentType)
    formData.append('title', title)
    formData.append('description', description)

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

  getAppointmentNotificationUnreadCount: async (token: string) => {
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
  getBilling,
  getStaff,
  createStaff,
  deleteStaff,
  updateStaff,
  getAnalytics,
  uploadTeethImage,
  getLatestTeethImage,
  getPatientTeethImages,
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
} = api
