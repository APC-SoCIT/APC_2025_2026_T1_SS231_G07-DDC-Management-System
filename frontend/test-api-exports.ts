// Quick test to verify API exports
import { api } from './lib/api'

console.log('API object:', api)
console.log('Has updateStaffAvailability:', typeof api.updateStaffAvailability === 'function')
console.log('Has getStaffAvailability:', typeof api.getStaffAvailability === 'function')
console.log('Has getUnreadNotificationCount:', typeof api.getUnreadNotificationCount === 'function')
console.log('Has getNotifications:', typeof api.getNotifications === 'function')
console.log('Has requestPasswordReset:', typeof api.requestPasswordReset === 'function')

export {}
