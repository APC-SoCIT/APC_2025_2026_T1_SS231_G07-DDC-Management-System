"use client"

import { useState, useEffect } from 'react'
import { Bell, Check, X } from 'lucide-react'
import { api } from '@/lib/api'

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
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [processingId, setProcessingId] = useState<number | null>(null)

  useEffect(() => {
    fetchNotifications()
    fetchUnreadCount()
    
    // Poll for new notifications every 30 seconds
    const interval = setInterval(() => {
      fetchUnreadCount()
      if (isOpen) {
        fetchNotifications()
      }
    }, 30000)
    
    return () => clearInterval(interval)
  }, [isOpen])

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
    } catch (error) {
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
      default:
        return type
    }
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
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
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
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
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

            {/* Notifications List */}
            <div className="overflow-y-auto flex-1">
              {notifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-500">
                  <Bell className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>No notifications yet</p>
                </div>
              ) : (
                notifications.map((notif) => (
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
                            notif.notification_type === 'new_appointment' 
                              ? 'bg-green-100 text-green-800'
                              : notif.notification_type === 'reschedule_request'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
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
                         (notif.notification_type === 'reschedule_request' || notif.notification_type === 'cancel_request') &&
                         notif.appointment_details.status === (notif.notification_type === 'reschedule_request' ? 'reschedule_requested' : 'cancel_requested') && (
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
                ))
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
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
    </div>
  )
}
