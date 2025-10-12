// API configuration for Django backend
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://reimagined-guide-4jw4x9gj6q6v2q77q-8000.app.github.dev/api"

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

// Patient API
export const patientAPI = {
  getAll: () => apiRequest("/patients/"),
  getById: (id) => apiRequest(`/patients/${id}/`),
  create: (data) =>
    apiRequest("/patients/", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id, data) =>
    apiRequest(`/patients/${id}/`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id) =>
    apiRequest(`/patients/${id}/`, {
      method: "DELETE",
    }),
  getStatistics: () => apiRequest("/patients/statistics/"),
}

// Appointment API
export const appointmentAPI = {
  getAll: () => apiRequest("/appointments/"),
  getById: (id) => apiRequest(`/appointments/${id}/`),
  create: (data) =>
    apiRequest("/appointments/", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id, data) =>
    apiRequest(`/appointments/${id}/`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id) =>
    apiRequest(`/appointments/${id}/`, {
      method: "DELETE",
    }),
  getUpcoming: () => apiRequest("/appointments/upcoming/"),
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
