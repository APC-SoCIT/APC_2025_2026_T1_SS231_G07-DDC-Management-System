"use client"

import { useState, useEffect, useRef } from 'react'
import { Bell, Check, X } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import AlertModal from './alert-modal'

interface Notification {
  id: number
  notification_type: string
  message: string
  created_at: string
  is_read: boolean
  appointment_details?: {
    id: number
    patient_name: string
    date: string
    time: string
    service_name: string
    status: string
    requested_date?: string
    requested_time?: string
    cancel_reason?: string
  }
}

export default function NotificationBell() {
  const { user, isLoading: authLoading, token: authToken } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [birthdayNotifications, setBirthdayNotifications] = useState<Array<{name: string, role: string}>>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [processingId, setProcessingId] = useState<number | null>(null)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const canFetchUnreadRef = useRef(false)
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean
    type: "success" | "error" | "warning" | "info"
    title: string
    message: string
  }>({ isOpen: false, type: "info", title: "", message: "" })

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) {
      console.log('[NotificationBell] Waiting for auth to load...')
      return
    }
    
    // Only fetch notifications for owner and staff users
    if (!user || user.user_type === 'patient') {
      console.log('[NotificationBell] User check:', { user, userType: user?.user_type })
      return
    }
    
    // Double-check both localStorage token AND auth context token exist
    const token = localStorage.getItem('token')
    if (!token || token.trim() === '' || !authToken) {
      console.log('[NotificationBell] No valid token available yet', { hasLocalStorage: !!token, hasAuthToken: !!authToken })
      return
    }
    
    console.log('[NotificationBell] Initializing notifications for user:', user.user_type, user.email)
    
    // Fetch notifications first to verify token works
    fetchNotifications().then(() => {
      console.log('[NotificationBell] Notifications loaded successfully, can now poll unread count')
      // Mark that we can now safely fetch unread count (use ref to avoid closure issues)
      canFetchUnreadRef.current = true
    }).catch(err => {
      console.log('[NotificationBell] Failed to load notifications:', err)
    })
    
    fetchBirthdays()
    
    // Poll for unread count every 30 seconds (only after initial load succeeds)
    const interval = setInterval(() => {
      if (canFetchUnreadRef.current) {
        fetchUnreadCount()
      }
    }, 30000)
    
    return () => clearInterval(interval)
  }, [user, authLoading, authToken])

  // Separate effect to refresh when dropdown opens
  useEffect(() => {
    if (isOpen && user && !authLoading && user.user_type !== 'patient' && canFetchUnreadRef.current) {
      const token = localStorage.getItem('token')
      if (token && token.trim() !== '') {
        console.log('[NotificationBell] Dropdown opened, refreshing...')
        fetchNotifications()
        fetchBirthdays()
        fetchUnreadCount()
      }
    }
  }, [isOpen])

  const fetchBirthdays = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return
      
      // Fetch staff members
      const staffData = await api.getStaff(token)
      const allStaff = staffData.filter((s: any) => s.user_type === 'staff')
      
      // Add owner if they have a birthday
      const allPeople = [...allStaff]
      if (user?.birthday) {
        allPeople.push({
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          birthday: user.birthday,
          role: 'Owner',
          user_type: 'owner'
        })
      }
      
      // Check for today's birthdays
      const today = new Date()
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
      
      const todaysBirthdays = allPeople
        .filter((person: any) => {
          if (!person.birthday) return false
          const birthDate = new Date(person.birthday)
          const birthdayThisYear = `${today.getFullYear()}-${String(birthDate.getMonth() + 1).padStart(2, '0')}-${String(birthDate.getDate()).padStart(2, '0')}`
          return birthdayThisYear === todayStr
        })
        .map((person: any) => ({
          name: `${person.first_name} ${person.last_name}`,
          role: person.user_type === 'owner' ? 'Owner' : person.role === 'dentist' ? 'Dentist' : 'Receptionist'
        }))
      
      setBirthdayNotifications(todaysBirthdays)
    } catch (error) {
      console.error('Failed to fetch birthdays:', error)
    }
  }

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        console.log('[NotificationBell] No token found')
        setNotifications([])
        return
      }
      
      console.log('[NotificationBell] Fetching notifications from API...')
      // Use the new AppointmentNotification API
      const data = await api.getAppointmentNotifications(token)
      console.log('[NotificationBell] Received notifications:', data)
      
      // Handle both paginated response and plain array
      let notificationsArray: Notification[]
      if (data && typeof data === 'object' && 'results' in data) {
        // Paginated response
        console.log('[NotificationBell] Handling paginated response')
        notificationsArray = Array.isArray(data.results) ? data.results : []
      } else {
        // Plain array response
        notificationsArray = Array.isArray(data) ? data : []
      }
      
      console.log('[NotificationBell] Setting notifications:', notificationsArray.length, 'items')
      setNotifications(notificationsArray)
      
      // Calculate unread count from notifications to avoid extra API call
      const unread = notificationsArray.filter(n => !n.is_read).length
      console.log('[NotificationBell] Calculated unread count:', unread)
      setUnreadCount(unread)
    } catch (error: any) {
      // Silently fail for 401 errors (user not authenticated or token expired)
      if (error?.message?.includes('401') || error?.message?.includes('Unauthorized')) {
        console.log('[NotificationBell] Authentication error:', error)
        setNotifications([])
        return
      }
      console.error('[NotificationBell] Failed to fetch notifications:', error)
      // Ensure notifications is always an array even on error
      setNotifications([])
    }
  }

  const fetchUnreadCount = async () => {
    // Only fetch if we've confirmed tokens work via successful notification fetch
    if (!canFetchUnreadRef.current) {
      console.log('[NotificationBell] Skipping unread count - not ready yet')
      return
    }
    
    try {
      const token = localStorage.getItem('token')
      if (!token || token.trim() === '') {
        console.log('[NotificationBell] No valid token for unread count')
        setUnreadCount(0)
        return
      }
      
      console.log('[NotificationBell] Fetching unread count...')
      const data = await api.getAppointmentNotificationUnreadCount(token)
      console.log('[NotificationBell] Unread count:', data.unread_count)
      setUnreadCount(data.unread_count || 0)
    } catch (error: any) {
      // Silently fail for 401 errors (user not authenticated or token expired)
      if (error?.message?.includes('401') || error?.message?.includes('Unauthorized')) {
        console.log('[NotificationBell] Auth error on unread count')
        setUnreadCount(0)
        return
      }
      console.error('[NotificationBell] Failed to fetch unread count:', error)
    }
  }

  const handleMarkAsRead = async (id: number) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return
      
      setLoading(true)
      await api.markAppointmentNotificationRead(id, token)
      
      // Update local state
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === id ? { ...notif, is_read: true } : notif
        )
      )
      
      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return
      
      setLoading(true)
      await api.markAllAppointmentNotificationsRead(token)
      
      // Update local state
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, is_read: true }))
      )
      
      setUnreadCount(0)
    } catch (error) {
      console.error('Failed to mark all as read:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleClearAll = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return
      
      setLoading(true)
      await api.clearAllAppointmentNotifications(token)
      
      // Clear local state
      setNotifications([])
      setUnreadCount(0)
      setShowClearConfirm(false)
    } catch (error) {
      console.error('Failed to clear all notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApproveReschedule = async (appointmentId: number, notificationId: number) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return
      
      setProcessingId(notificationId)
      await api.approveReschedule(appointmentId, token)
      
      // Mark notification as read and refresh
      await handleMarkAsRead(notificationId)
      await fetchNotifications()
      
      setAlertModal({
        isOpen: true,
        type: "success",
        title: "Request Approved",
        message: "Reschedule request approved successfully!"
      })
    } catch (error: any) {
      console.error('Failed to approve reschedule:', error)
      const errorMessage = error?.response?.data?.error || error?.message || 'Failed to approve reschedule request. Please try again.'
      setAlertModal({
        isOpen: true,
        type: "error",
        title: "Failed",
        message: errorMessage
      })
    } finally {
      setProcessingId(null)
    }
  }

  const handleRejectReschedule = async (appointmentId: number, notificationId: number) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return
      
      setProcessingId(notificationId)
      await api.rejectReschedule(appointmentId, token)
      
      // Mark notification as read and refresh
      await handleMarkAsRead(notificationId)
      await fetchNotifications()
      
      setAlertModal({
        isOpen: true,
        type: "info",
        title: "Request Rejected",
        message: "Reschedule request rejected."
      })
    } catch (error) {
      console.error('Failed to reject reschedule:', error)
      setAlertModal({
        isOpen: true,
        type: "error",
        title: "Failed",
        message: "Failed to reject reschedule request. Please try again."
      })
    } finally {
      setProcessingId(null)
    }
  }

  const handleApproveCancel = async (appointmentId: number, notificationId: number) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return
      
      setProcessingId(notificationId)
      await api.approveCancel(appointmentId, token)
      
      // Mark notification as read and refresh
      await handleMarkAsRead(notificationId)
      await fetchNotifications()
      
      setAlertModal({
        isOpen: true,
        type: "success",
        title: "Request Approved",
        message: "Cancellation request approved successfully!"
      })
    } catch (error) {
      console.error('Failed to approve cancellation:', error)
      setAlertModal({
        isOpen: true,
        type: "error",
        title: "Failed",
        message: "Failed to approve cancellation request. Please try again."
      })
    } finally {
      setProcessingId(null)
    }
  }

  const handleRejectCancel = async (appointmentId: number, notificationId: number) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return
      
      setProcessingId(notificationId)
      await api.rejectCancel(appointmentId, token)
      
      // Mark notification as read and refresh
      await handleMarkAsRead(notificationId)
      await fetchNotifications()
      
      setAlertModal({
        isOpen: true,
        type: "info",
        title: "Request Rejected",
        message: "Cancellation request rejected."
      })
    } catch (error) {
      console.error('Failed to reject cancellation:', error)
      setAlertModal({
        isOpen: true,
        type: "error",
        title: "Failed",
        message: "Failed to reject cancellation request. Please try again."
      })
    } finally {
      setProcessingId(null)
    }
  }

  const formatNotificationType = (type: string) => {
    switch (type) {
      case 'new_appointment':
        return 'New Appointment'
      case 'reschedule_request':
        return 'Reschedule Request'
      case 'cancel_request':
        return 'Cancellation Request'
      case 'appointment_confirmed':
        return 'Appointment Confirmed'
      case 'reschedule_approved':
        return 'Reschedule Approved'
      case 'reschedule_rejected':
        return 'Reschedule Rejected'
      case 'cancel_approved':
        return 'Cancellation Approved'
      case 'cancel_rejected':
        return 'Cancellation Rejected'
      case 'inventory_alert':
        return 'Low Stock Alert'
      default:
        return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
    }
  }

  const getNotificationColor = (type: string) => {
    // Inventory alerts - orange/amber color for both staff and patients
    if (type === 'inventory_alert') {
      return 'bg-amber-100 text-amber-800'
    }
    
    // For patients - use new color scheme
    if (user?.user_type === 'patient') {
      // Green for confirmed/approved actions
      if (type === 'appointment_confirmed' || type === 'reschedule_approved') {
        return 'bg-green-100 text-green-800'
      }
      // Red for cancellation approved
      if (type === 'cancel_approved') {
        return 'bg-red-100 text-red-800'
      }
      // Yellow for requests and rejections
      if (type === 'reschedule_request' || type === 'cancel_request' || 
          type === 'reschedule_rejected' || type === 'cancel_rejected') {
        return 'bg-yellow-100 text-yellow-800'
      }
      // Default blue for new appointments
      return 'bg-blue-100 text-blue-800'
    }
    
    // For staff/owner - use original color scheme
    if (type === 'new_appointment') {
      return 'bg-green-100 text-green-800'
    }
    if (type === 'reschedule_request') {
      return 'bg-yellow-100 text-yellow-800'
    }
    if (type === 'cancel_request' || type === 'appointment_cancelled') {
      return 'bg-red-100 text-red-800'
    }
    // Default
    return 'bg-blue-100 text-blue-800'
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    
    return date.toLocaleDateString()
  }

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen)
          if (!isOpen) fetchNotifications()
        }}
        className="relative p-2 hover:bg-gray-100 rounded-full transition-colors"
      >
        <Bell className="w-6 h-6 text-gray-700" />
        {(unreadCount + birthdayNotifications.length) > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {(unreadCount + birthdayNotifications.length) > 9 ? '9+' : (unreadCount + birthdayNotifications.length)}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Notifications Panel */}
          <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[600px] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900">Notifications</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    disabled={loading}
                    className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
                  >
                    Mark all as read
                  </button>
                )}
              </div>
              {Array.isArray(notifications) && notifications.length > 0 && (
                showClearConfirm ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600">Clear all?</span>
                    <button
                      onClick={handleClearAll}
                      disabled={loading}
                      className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => setShowClearConfirm(false)}
                      className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowClearConfirm(true)}
                    disabled={loading}
                    className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50 flex items-center gap-1"
                  >
                    <X className="w-3 h-3" />
                    Clear all notifications
                  </button>
                )
              )}
            </div>

            {/* Notifications List */}
            <div className="overflow-y-auto flex-1">
              {(!Array.isArray(notifications) || notifications.length === 0) && birthdayNotifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-500">
                  <Bell className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>No notifications yet</p>
                </div>
              ) : (
                <>
                  {/* Birthday Notifications */}
                  {birthdayNotifications.map((birthday, index) => (
                    <div
                      key={`birthday-${index}`}
                      className="px-4 py-3 border-b border-gray-100 bg-pink-50 hover:bg-pink-100 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">🎉</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            {birthday.name}'s birthday is today!
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            Wish them a happy birthday!
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Appointment Notifications */}
                  {Array.isArray(notifications) && notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                      !notif.is_read ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        {/* Type Badge */}
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            getNotificationColor(notif.notification_type)
                          }`}>
                            {formatNotificationType(notif.notification_type)}
                          </span>
                          {!notif.is_read && (
                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                          )}
                        </div>

                        {/* Message */}
                        <p className="text-sm text-gray-900 mb-2">{notif.message}</p>

                        {/* Appointment Details */}
                        {notif.appointment_details && (
                          <div className="text-xs text-gray-600 space-y-1 mb-2">
                            <p><strong>Patient:</strong> {notif.appointment_details.patient_name}</p>
                            <p><strong>Current Date:</strong> {new Date(notif.appointment_details.date).toLocaleDateString()} at {notif.appointment_details.time}</p>
                            {notif.appointment_details.requested_date && (
                              <p className="text-blue-600"><strong>Requested Date:</strong> {new Date(notif.appointment_details.requested_date).toLocaleDateString()} at {notif.appointment_details.requested_time}</p>
                            )}
                            {notif.appointment_details.cancel_reason && (
                              <p className="text-red-600"><strong>Reason:</strong> {notif.appointment_details.cancel_reason}</p>
                            )}
                            <p><strong>Service:</strong> {notif.appointment_details.service_name}</p>
                          </div>
                        )}

                        {/* Action Buttons for Reschedule/Cancel Requests */}
                        {notif.appointment_details && 
                         (notif.notification_type === 'reschedule_request' || notif.notification_type === 'cancel_request') && (
                          <>
                            {/* Show buttons only if still in requested state */}
                            {notif.appointment_details.status === (notif.notification_type === 'reschedule_request' ? 'reschedule_requested' : 'cancel_requested') ? (
                              <div className="flex gap-2 mb-2">
                                <button
                                  onClick={() => {
                                    if (notif.notification_type === 'reschedule_request') {
                                      handleApproveReschedule(notif.appointment_details!.id, notif.id)
                                    } else {
                                      handleApproveCancel(notif.appointment_details!.id, notif.id)
                                    }
                                  }}
                                  disabled={processingId === notif.id}
                                  className="flex items-center gap-1 px-3 py-1.5 bg-green-500 text-white text-xs rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                  <Check className="w-3 h-3" />
                                  Approve
                                </button>
                                <button
                                  onClick={() => {
                                    if (notif.notification_type === 'reschedule_request') {
                                      handleRejectReschedule(notif.appointment_details!.id, notif.id)
                                    } else {
                                      handleRejectCancel(notif.appointment_details!.id, notif.id)
                                    }
                                  }}
                                  disabled={processingId === notif.id}
                                  className="flex items-center gap-1 px-3 py-1.5 bg-red-500 text-white text-xs rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                  <X className="w-3 h-3" />
                                  Reject
                                </button>
                              </div>
                            ) : (
                              /* Show status if already handled */
                              <div className="mb-2">
                                {notif.notification_type === 'reschedule_request' ? (
                                  notif.appointment_details.status === 'confirmed' ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                                      <Check className="w-3 h-3" />
                                      Already approved
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                                      <X className="w-3 h-3" />
                                      Already rejected
                                    </span>
                                  )
                                ) : (
                                  notif.appointment_details.status === 'cancelled' ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                                      <Check className="w-3 h-3" />
                                      Already approved
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                                      <X className="w-3 h-3" />
                                      Already rejected
                                    </span>
                                  )
                                )}
                              </div>
                            )}
                          </>
                        )}

                        {/* Timestamp */}
                        <p className="text-xs text-gray-500">{formatDate(notif.created_at)}</p>
                      </div>

                      {/* Mark as Read Button */}
                      {!notif.is_read && (
                        <button
                          onClick={() => handleMarkAsRead(notif.id)}
                          disabled={loading}
                          className="text-xs text-blue-600 hover:text-blue-800 whitespace-nowrap disabled:opacity-50"
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                </>
              )}
            </div>

            {/* Footer */}
            {Array.isArray(notifications) && notifications.length > 0 && (
              <div className="px-4 py-3 border-t border-gray-200 text-center">
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-sm text-gray-600 hover:text-gray-800"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </>
      )}

      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
        type={alertModal.type}
        title={alertModal.title}
        message={alertModal.message}
      />
    </div>
  )
}
