/**
 * Export Utilities for Patient Records
 * Handles downloading patient data as JSON or formatted text
 */

import * as api from "./api"

/**
 * Format date for display
 */
export const formatDate = (dateStr: string | null) => {
  if (!dateStr) return "N/A"
  const date = new Date(dateStr)
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

/**
 * Format datetime for display
 */
export const formatDateTime = (dateStr: string | null) => {
  if (!dateStr) return "N/A"
  const date = new Date(dateStr)
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

/**
 * Download JSON data as a file
 */
export const downloadJSON = (data: any, filename: string) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Export patient records as JSON
 */
export const exportPatientRecordsJSON = async (patientId: number, token: string) => {
  try {
    const data = await api.exportPatientRecords(patientId, token)
    
    const filename = `patient_records_${data.patient.last_name}_${data.patient.first_name}_${new Date().toISOString().split("T")[0]}.json`
    
    downloadJSON(data, filename)
    
    return { success: true, message: "Records exported successfully!" }
  } catch (error) {
    console.error("Error exporting records:", error)
    return { success: false, message: "Failed to export records" }
  }
}

/**
 * Convert patient data to formatted text
 */
export const formatPatientRecordsAsText = (data: any): string => {
  let text = ""

  // Header
  text += "========================================\n"
  text += "       PATIENT RECORDS EXPORT\n"
  text += "========================================\n\n"
  text += `Export Date: ${formatDateTime(new Date().toISOString())}\n\n`

  // Patient Information
  text += "PATIENT INFORMATION\n"
  text += "-------------------\n"
  text += `Name: ${data.patient.first_name} ${data.patient.last_name}\n`
  text += `Email: ${data.patient.email}\n`
  text += `Phone: ${data.patient.phone_number || "N/A"}\n`
  text += `Date of Birth: ${formatDate(data.patient.date_of_birth)}\n`
  text += `Address: ${data.patient.address || "N/A"}\n`
  text += `Date Registered: ${formatDate(data.patient.date_joined)}\n\n`

  // Appointments
  text += "APPOINTMENTS\n"
  text += "------------\n"
  if (data.appointments && data.appointments.length > 0) {
    data.appointments.forEach((apt: any, index: number) => {
      text += `\n${index + 1}. ${apt.service_name || "General Appointment"}\n`
      text += `   Date: ${formatDateTime(apt.appointment_date)}\n`
      text += `   Dentist: ${apt.dentist_name || "Not assigned"}\n`
      text += `   Status: ${apt.status}\n`
      if (apt.notes) text += `   Notes: ${apt.notes}\n`
    })
  } else {
    text += "No appointments found.\n"
  }
  text += "\n"

  // Dental Records
  text += "DENTAL RECORDS\n"
  text += "--------------\n"
  if (data.dental_records && data.dental_records.length > 0) {
    data.dental_records.forEach((record: any, index: number) => {
      text += `\n${index + 1}. Date: ${formatDate(record.date)}\n`
      text += `   Diagnosis: ${record.diagnosis}\n`
      text += `   Treatment: ${record.treatment}\n`
      if (record.notes) text += `   Notes: ${record.notes}\n`
      text += `   Next Visit: ${formatDate(record.next_visit_date)}\n`
    })
  } else {
    text += "No dental records found.\n"
  }
  text += "\n"

  // Clinical Notes
  text += "CLINICAL NOTES\n"
  text += "--------------\n"
  if (data.clinical_notes && data.clinical_notes.length > 0) {
    data.clinical_notes.forEach((note: any, index: number) => {
      text += `\n${index + 1}. Date: ${formatDateTime(note.created_at)}\n`
      text += `   Author: ${note.author_name || "Unknown"}\n`
      if (note.appointment_id) text += `   Related Appointment: #${note.appointment_id}\n`
      text += `   Content:\n   ${note.content.split("\n").join("\n   ")}\n`
    })
  } else {
    text += "No clinical notes found.\n"
  }
  text += "\n"

  // Treatment Assignments
  text += "TREATMENT ASSIGNMENTS\n"
  text += "--------------------\n"
  if (data.treatment_assignments && data.treatment_assignments.length > 0) {
    data.treatment_assignments.forEach((treatment: any, index: number) => {
      text += `\n${index + 1}. ${treatment.treatment_name}\n`
      text += `   Status: ${treatment.status}\n`
      text += `   Assigned Dentist: ${treatment.dentist_name || "Not assigned"}\n`
      text += `   Date Assigned: ${formatDate(treatment.date_assigned)}\n`
      if (treatment.scheduled_date) text += `   Scheduled: ${formatDate(treatment.scheduled_date)}\n`
      if (treatment.completed_date) text += `   Completed: ${formatDate(treatment.completed_date)}\n`
      if (treatment.description) text += `   Description: ${treatment.description}\n`
    })
  } else {
    text += "No treatment assignments found.\n"
  }
  text += "\n"

  // Billing History
  text += "BILLING HISTORY\n"
  text += "---------------\n"
  if (data.billing && data.billing.length > 0) {
    let totalBilled = 0
    let totalPaid = 0
    data.billing.forEach((bill: any, index: number) => {
      text += `\n${index + 1}. Date: ${formatDate(bill.date)}\n`
      text += `   Service: ${bill.service_name || "N/A"}\n`
      text += `   Amount: $${parseFloat(bill.amount).toFixed(2)}\n`
      text += `   Paid: $${parseFloat(bill.amount_paid).toFixed(2)}\n`
      text += `   Balance: $${parseFloat(bill.balance).toFixed(2)}\n`
      text += `   Status: ${bill.payment_status}\n`
      totalBilled += parseFloat(bill.amount)
      totalPaid += parseFloat(bill.amount_paid)
    })
    text += `\nTotal Billed: $${totalBilled.toFixed(2)}\n`
    text += `Total Paid: $${totalPaid.toFixed(2)}\n`
    text += `Outstanding Balance: $${(totalBilled - totalPaid).toFixed(2)}\n`
  } else {
    text += "No billing records found.\n"
  }
  text += "\n"

  // Intake Form
  text += "PATIENT INTAKE FORM\n"
  text += "-------------------\n"
  if (data.intake_form) {
    const form = data.intake_form
    text += `Medical History: ${form.medical_history || "N/A"}\n`
    text += `Allergies: ${form.allergies || "None"}\n`
    text += `Current Medications: ${form.current_medications || "None"}\n`
    text += `Emergency Contact: ${form.emergency_contact_name || "N/A"}\n`
    text += `Emergency Phone: ${form.emergency_contact_phone || "N/A"}\n`
    text += `Relationship: ${form.emergency_contact_relationship || "N/A"}\n`
    text += `Insurance Provider: ${form.insurance_provider || "N/A"}\n`
    text += `Policy Number: ${form.insurance_policy_number || "N/A"}\n`
    text += `Dental Concerns: ${form.dental_concerns || "None"}\n`
    text += `Preferred Dentist: ${form.preferred_dentist_name || "No preference"}\n`
  } else {
    text += "No intake form on file.\n"
  }
  text += "\n"

  // Footer
  text += "========================================\n"
  text += "         END OF PATIENT RECORDS\n"
  text += "========================================\n"

  return text
}

/**
 * Export patient records as formatted text file
 */
export const exportPatientRecordsText = async (patientId: number, token: string) => {
  try {
    const data = await api.exportPatientRecords(patientId, token)
    
    const text = formatPatientRecordsAsText(data)
    
    const filename = `patient_records_${data.patient.last_name}_${data.patient.first_name}_${new Date().toISOString().split("T")[0]}.txt`
    
    const blob = new Blob([text], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    return { success: true, message: "Records exported successfully!" }
  } catch (error) {
    console.error("Error exporting records:", error)
    return { success: false, message: "Failed to export records" }
  }
}

/**
 * Export patient records with format selection
 */
export const exportPatientRecords = async (
  patientId: number,
  token: string,
  format: "json" | "text" = "text"
) => {
  if (format === "json") {
    return await exportPatientRecordsJSON(patientId, token)
  } else {
    return await exportPatientRecordsText(patientId, token)
  }
}
