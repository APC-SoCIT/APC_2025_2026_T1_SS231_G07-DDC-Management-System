"use client"

import { useState, useEffect } from 'react'
import { Bell, Check, X } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'

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
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [birthdayNotifications, setBirthdayNotifications] = useState<Array<{name: string, role: string}>>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [processingId, setProcessingId] = useState<number | null>(null)
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  useEffect(() => {
    // Only fetch notifications for owner and staff users
    if (!user || user.role === 'patient') {
      return
    }
    
    fetchNotifications()
    fetchUnreadCount()
    fetchBirthdays()
    
    // Poll for new notifications every 30 seconds only for owner/staff
    const interval = setInterval(() => {
      fetchUnreadCount()
      if (isOpen) {
        fetchNotifications()
        fetchBirthdays()
      }
    }, 30000)
    
    return () => clearInterval(interval)
  }, [isOpen, user])

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
      if (!token) return
      
      // Use the new AppointmentNotification API
      const data = await api.getAppointmentNotifications(token)
      setNotifications(data)
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    }
  }

  const fetchUnreadCount = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return
      
      const data = await api.getAppointmentNotificationUnreadCount(token)
      setUnreadCount(data.unread_count || 0)
    } catch (error: any) {
      // Silently fail for 401 errors (user not authenticated or token expired)
      if (error?.message?.includes('401') || error?.message?.includes('Unauthorized')) {
        setUnreadCount(0)
        return
      }
      console.error('Failed to fetch unread count:', error)
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
      
      alert('Reschedule request approved successfully!')
    } catch (error) {
      console.error('Failed to approve reschedule:', error)
      alert('Failed to approve reschedule request. Please try again.')
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
      
      alert('Reschedule request rejected.')
    } catch (error) {
      console.error('Failed to reject reschedule:', error)
      alert('Failed to reject reschedule request. Please try again.')
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
      
      alert('Cancellation request approved successfully!')
    } catch (error) {
      console.error('Failed to approve cancellation:', error)
      alert('Failed to approve cancellation request. Please try again.')
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
      
      alert('Cancellation request rejected.')
    } catch (error) {
      console.error('Failed to reject cancellation:', error)
      alert('Failed to reject cancellation request. Please try again.')
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
        className="relative p-2 hover:bg-gray-100 rounded-full transition-colors touch-manipulation tap-target"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700" />
        {(unreadCount + birthdayNotifications.length) > 0 && (
          <span className="absolute -top-1 -right-1 sm:top-0 sm:right-0 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {(unreadCount + birthdayNotifications.length) > 9 ? '9+' : (unreadCount + birthdayNotifications.length)}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40 bg-black/20 sm:bg-transparent" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Notifications Panel */}
          <div className="fixed inset-x-2 top-16 sm:absolute sm:right-0 sm:left-auto sm:top-auto sm:mt-2 sm:w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[calc(100vh-5rem)] sm:max-h-[600px] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-3 sm:px-4 py-3 border-b border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-base sm:text-lg text-gray-900">Notifications</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    disabled={loading}
                    className="text-xs sm:text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50 touch-manipulation px-2 py-1"
                  >
                    Mark all as read
                  </button>
                )}
              </div>
              {notifications.length > 0 && (
                showClearConfirm ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600">Clear all?</span>
                    <button
                      onClick={handleClearAll}
                      disabled={loading}
                      className="text-xs px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 touch-manipulation tap-target"
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => setShowClearConfirm(false)}
                      className="text-xs px-3 py-1.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 touch-manipulation tap-target"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowClearConfirm(true)}
                    disabled={loading}
                    className="text-xs sm:text-sm text-red-600 hover:text-red-800 disabled:opacity-50 flex items-center gap-1 touch-manipulation px-2 py-1"
                  >
                    <X className="w-3 h-3" />
                    Clear all notifications
                  </button>
                )
              )}
            </div>

            {/* Notifications List */}
            <div className="overflow-y-auto flex-1 scrollbar-hide">
              {notifications.length === 0 && birthdayNotifications.length === 0 ? (
                <div className="px-3 sm:px-4 py-8 text-center text-gray-500">
                  <Bell className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm sm:text-base">No notifications yet</p>
                </div>
              ) : (
                <>
                  {/* Birthday Notifications */}
                  {birthdayNotifications.map((birthday, index) => (
                    <div
                      key={`birthday-${index}`}
                      className="px-3 sm:px-4 py-3 border-b border-gray-100 bg-pink-50 hover:bg-pink-100 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-xl sm:text-2xl flex-shrink-0">🎉</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 break-words">
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
                  {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`px-3 sm:px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                      !notif.is_read ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        {/* Type Badge */}
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            getNotificationColor(notif.notification_type)
                          }`}>
                            {formatNotificationType(notif.notification_type)}
                          </span>
                          {!notif.is_read && (
                            <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></span>
                          )}
                        </div>

                        {/* Message */}
                        <p className="text-sm text-gray-900 mb-2 break-words">{notif.message}</p>

                        {/* Appointment Details */}
                        {notif.appointment_details && (
                          <div className="text-xs text-gray-600 space-y-1 mb-2 break-words">
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
                         (notif.notification_type === 'reschedule_request' || notif.notification_type === 'cancel_request') &&
                         notif.appointment_details.status === (notif.notification_type === 'reschedule_request' ? 'reschedule_requested' : 'cancel_requested') && (
                          <div className="flex gap-2 mb-2 flex-wrap">
                            <button
                              onClick={() => {
                                if (notif.notification_type === 'reschedule_request') {
                                  handleApproveReschedule(notif.appointment_details!.id, notif.id)
                                } else {
                                  handleApproveCancel(notif.appointment_details!.id, notif.id)
                                }
                              }}
                              disabled={processingId === notif.id}
                              className="flex items-center gap-1 px-4 py-2 bg-green-500 text-white text-xs rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-manipulation tap-target"
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
                              className="flex items-center gap-1 px-4 py-2 bg-red-500 text-white text-xs rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-manipulation tap-target"
                            >
                              <X className="w-3 h-3" />
                              Reject
                            </button>
                          </div>
                        )}

                        {/* Timestamp */}
                        <p className="text-xs text-gray-500">{formatDate(notif.created_at)}</p>
                      </div>

                      {/* Mark as Read Button */}
                      {!notif.is_read && (
                        <button
                          onClick={() => handleMarkAsRead(notif.id)}
                          disabled={loading}
                          className="text-xs text-blue-600 hover:text-blue-800 whitespace-nowrap disabled:opacity-50 touch-manipulation px-2 py-1 flex-shrink-0"
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
            {notifications.length > 0 && (
              <div className="px-3 sm:px-4 py-3 border-t border-gray-200 text-center">
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-sm text-gray-600 hover:text-gray-800 touch-manipulation px-4 py-2 tap-target"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
