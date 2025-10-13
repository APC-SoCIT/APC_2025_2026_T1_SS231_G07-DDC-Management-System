// API configuration for Django backend
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"

// Helper function to handle API requests
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`

  const config = {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  }

  const response = await fetch(url, config)

  if (!response.ok) {
    let errorMessage = "API request failed"
    try {
      const error = await response.json()
      errorMessage = error.message || error.detail || JSON.stringify(error)
    } catch {
      errorMessage = `HTTP ${response.status}: ${response.statusText}`
    }
    throw new Error(errorMessage)
  }

  // Handle DELETE requests that return no content
  if (response.status === 204) {
    return null
  }

  return await response.json()
}

// Data transformation helpers
const transformUserForDisplay = (user) => ({
  ...user,
  // Map new fields to old field names for backward compatibility
  name: user.full_name || `${user.f_name || ''} ${user.l_name || ''}`.trim(),
  patient_id: user.id, // Use id as patient_id
  initials: user.initials,
  created_at: user.date_of_creation,
  // Keep new fields as well
  f_name: user.f_name,
  l_name: user.l_name,
  full_name: user.full_name,
  date_of_creation: user.date_of_creation
})

const transformUserForBackend = (user) => ({
  f_name: user.f_name || user.name?.split(' ')[0] || '',
  l_name: user.l_name || user.name?.split(' ').slice(1).join(' ') || '',
  email: user.email,
  // Map other fields as needed
  date_of_birth: user.date_of_birth,
  age: user.age,
  contact: user.contact,
  address: user.address
})

const transformAppointmentForDisplay = (appointment) => ({
  ...appointment,
  // Extract date and time from appointment_start_time for backward compatibility
  date: appointment.appointment_start_time ? 
    new Date(appointment.appointment_start_time).toISOString().split('T')[0] : 
    appointment.date,
  time: appointment.appointment_start_time ? 
    new Date(appointment.appointment_start_time).toTimeString().slice(0, 5) : 
    appointment.time,
  doctor: appointment.staff_name || appointment.doctor,
  treatment: appointment.reason_for_visit || appointment.treatment,
  patient_name: appointment.patient_name,
  // Keep new fields
  appointment_start_time: appointment.appointment_start_time,
  appointment_end_time: appointment.appointment_end_time,
  reason_for_visit: appointment.reason_for_visit,
  staff_name: appointment.staff_name
})

const transformAppointmentForBackend = (appointment) => {
  // Handle both old and new format
  let startTime = appointment.appointment_start_time
  
  if (!startTime && appointment.date && appointment.time) {
    startTime = `${appointment.date}T${appointment.time}:00`
  }
  
  return {
    appointment_start_time: startTime,
    appointment_end_time: appointment.appointment_end_time,
    status: appointment.status === 'scheduled' ? 'Scheduled' : 
           appointment.status === 'completed' ? 'Completed' :
           appointment.status === 'cancelled' ? 'Cancelled' :
           appointment.status || 'Scheduled',
    reason_for_visit: appointment.reason_for_visit || appointment.treatment,
    notes: appointment.notes,
    patient: appointment.patient,
    staff: appointment.staff || appointment.doctor_id, // Handle doctor field
    invoice: appointment.invoice || 1 // Default invoice ID if not provided
  }
}

// NEW API: Users (patients/staff) - replaces patientAPI
export const userAPI = {
  getAll: async () => {
    const users = await apiRequest("/users/")
    return users.map(transformUserForDisplay)
  },
  getById: async (id) => {
    const user = await apiRequest(`/users/${id}/`)
    return transformUserForDisplay(user)
  },
  create: async (data) => {
    const transformedData = transformUserForBackend(data)
    const user = await apiRequest("/users/", {
      method: "POST",
      body: JSON.stringify(transformedData),
    })
    return transformUserForDisplay(user)
  },
  update: async (id, data) => {
    const transformedData = transformUserForBackend(data)
    const user = await apiRequest(`/users/${id}/`, {
      method: "PUT",
      body: JSON.stringify(transformedData),
    })
    return transformUserForDisplay(user)
  },
  delete: (id) => apiRequest(`/users/${id}/`, { method: "DELETE" }),
  getStatistics: () => apiRequest("/users/statistics/"),
}

// Service API
export const serviceAPI = {
  getAll: () => apiRequest("/services/"),
  getById: (id) => apiRequest(`/services/${id}/`),
  create: (data) =>
    apiRequest("/services/", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id, data) =>
    apiRequest(`/services/${id}/`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id) => apiRequest(`/services/${id}/`, { method: "DELETE" }),
}

// Invoice API
export const invoiceAPI = {
  getAll: () => apiRequest("/invoices/"),
  getById: (id) => apiRequest(`/invoices/${id}/`),
  create: (data) =>
    apiRequest("/invoices/", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id, data) =>
    apiRequest(`/invoices/${id}/`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id) => apiRequest(`/invoices/${id}/`, { method: "DELETE" }),
}

// LEGACY: Patient API - Use userAPI instead
export const patientAPI = {
  getAll: async () => {
    // Try new API first, fallback to legacy
    try {
      return await userAPI.getAll()
    } catch (error) {
      const patients = await apiRequest("/patients/")
      return patients
    }
  },
  getById: async (id) => {
    try {
      return await userAPI.getById(id)
    } catch (error) {
      return await apiRequest(`/patients/${id}/`)
    }
  },
  create: async (data) => {
    try {
      return await userAPI.create(data)
    } catch (error) {
      return await apiRequest("/patients/", {
        method: "POST",
        body: JSON.stringify(data),
      })
    }
  },
  update: async (id, data) => {
    try {
      return await userAPI.update(id, data)
    } catch (error) {
      return await apiRequest(`/patients/${id}/`, {
        method: "PUT",
        body: JSON.stringify(data),
      })
    }
  },
  delete: async (id) => {
    try {
      return await userAPI.delete(id)
    } catch (error) {
      return await apiRequest(`/patients/${id}/`, { method: "DELETE" })
    }
  },
  getStatistics: async () => {
    try {
      return await userAPI.getStatistics()
    } catch (error) {
      return await apiRequest("/patients/statistics/")
    }
  },
}

// Appointment API (updated for new schema)
export const appointmentAPI = {
  getAll: async () => {
    const appointments = await apiRequest("/appointments/")
    return appointments.map(transformAppointmentForDisplay)
  },
  getById: async (id) => {
    const appointment = await apiRequest(`/appointments/${id}/`)
    return transformAppointmentForDisplay(appointment)
  },
  create: async (data) => {
    const transformedData = transformAppointmentForBackend(data)
    const appointment = await apiRequest("/appointments/", {
      method: "POST",
      body: JSON.stringify(transformedData),
    })
    return transformAppointmentForDisplay(appointment)
  },
  update: async (id, data) => {
    const transformedData = transformAppointmentForBackend(data)
    const appointment = await apiRequest(`/appointments/${id}/`, {
      method: "PUT",
      body: JSON.stringify(transformedData),
    })
    return transformAppointmentForDisplay(appointment)
  },
  delete: (id) => apiRequest(`/appointments/${id}/`, { method: "DELETE" }),
  getUpcoming: async () => {
    const appointments = await apiRequest("/appointments/upcoming/")
    return appointments.map(transformAppointmentForDisplay)
  },
  getStatistics: () => apiRequest("/appointments/statistics/"),
}

// Inventory API
export const inventoryAPI = {
  getAll: () => apiRequest("/inventory/"),
  getById: (id) => apiRequest(`/inventory/${id}/`),
  create: (data) =>
    apiRequest("/inventory/", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id, data) =>
    apiRequest(`/inventory/${id}/`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id) =>
    apiRequest(`/inventory/${id}/`, {
      method: "DELETE",
    }),
  updateQuantity: (id, delta) =>
    apiRequest(`/inventory/${id}/update_quantity/`, {
      method: "POST",
      body: JSON.stringify({ delta }),
    }),
  getLowStock: () => apiRequest("/inventory/low_stock/"),
  getAlerts: () => apiRequest("/inventory/alerts/"),
}

// Billing API
export const billingAPI = {
  getAll: () => apiRequest("/billing/"),
  getById: (id) => apiRequest(`/billing/${id}/`),
  create: (data) =>
    apiRequest("/billing/", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id, data) =>
    apiRequest(`/billing/${id}/`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id) =>
    apiRequest(`/billing/${id}/`, {
      method: "DELETE",
    }),
  getStatistics: () => apiRequest("/billing/statistics/"),
}

// Financial API
export const financialAPI = {
  getAll: () => apiRequest("/financial/"),
  getRevenue: () => apiRequest("/financial/revenue/"),
  getExpenses: () => apiRequest("/financial/expenses/"),
}

// Dashboard API
export const dashboardAPI = {
  getOverview: () => apiRequest("/dashboard/overview/"),
}
