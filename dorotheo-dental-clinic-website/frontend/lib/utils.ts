import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Calculate contrast color (white or dark) based on background color luminance
 * Uses WCAG formula to determine if a color is light or dark
 * @param hexColor - Hex color string (e.g., "#ffffff" or "ffffff")
 * @returns "#ffffff" for dark backgrounds, "#1f2937" for light backgrounds
 */
export function getContrastColor(hexColor: string): string {
  // Remove # if present
  const hex = hexColor.replace('#', '')
  
  // Convert to RGB
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  
  // Calculate relative luminance (using WCAG formula)
  // https://www.w3.org/TR/WCAG20-TECHS/G17.html
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  
  // Return white for dark colors, dark for light colors
  return luminance > 0.5 ? '#1f2937' : '#ffffff'
}

/**
 * Get a readable color from a given hex color by darkening if too light
 * Maintains the same color hue for a more subtle, transparent look
 * @param hexColor - Hex color string (e.g., "#ffffff" or "ffffff")
 * @returns A darkened version of the color if it's too light, otherwise the original color
 */
export function getReadableColor(hexColor: string): string {
  // Remove # if present
  const hex = hexColor.replace('#', '')
  
  // Convert to RGB
  let r = parseInt(hex.substring(0, 2), 16)
  let g = parseInt(hex.substring(2, 4), 16)
  let b = parseInt(hex.substring(4, 6), 16)
  
  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  
  // If color is too light (luminance > 0.7), darken it significantly
  // This maintains the color family while ensuring readability
  if (luminance > 0.7) {
    // Darken by 60-70% for very light colors
    r = Math.round(r * 0.3)
    g = Math.round(g * 0.3)
    b = Math.round(b * 0.3)
  } else if (luminance > 0.5) {
    // Darken by 40% for moderately light colors
    r = Math.round(r * 0.6)
    g = Math.round(g * 0.6)
    b = Math.round(b * 0.6)
  }
  // For dark colors (luminance <= 0.5), return as-is
  
  // Convert back to hex
  const toHex = (n: number) => {
    const hex = Math.max(0, Math.min(255, n)).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }
  
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

/**
 * Get service badge styles with special handling for white and black colors
 * @param hexColor - Hex color string (e.g., "#ffffff" or "ffffff")
 * @returns Object with backgroundColor, color, and borderColor for the badge
 */
export function getServiceBadgeStyle(hexColor: string): { 
  backgroundColor: string
  color: string
  borderColor: string 
} {
  // Remove # if present and normalize
  const hex = hexColor.replace('#', '').toLowerCase()
  
  // Validate hex color format
  if (hex.length !== 6 || !/^[0-9a-f]{6}$/.test(hex)) {
    // Return default gray if invalid
    return {
      backgroundColor: 'rgba(107, 114, 128, 0.2)',
      color: '#374151',
      borderColor: 'rgba(107, 114, 128, 0.6)'
    }
  }
  
  // Convert to RGB to check luminance
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  
  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  
  // Special handling for very light colors (white, near-white)
  if (luminance > 0.95) {
    return {
      backgroundColor: 'rgba(31, 41, 55, 0.4)', // gray-800 at 40% opacity
      color: '#f9fafb', // gray-50 (light text)
      borderColor: 'rgba(75, 85, 99, 0.4)' // gray-600 at 40% opacity
    }
  }
  
  // Special handling for very dark colors (black, near-black)
  if (luminance < 0.1) {
    return {
      backgroundColor: '#e5e7eb', // gray-200
      color: '#1f2937', // gray-800 (dark text)
      borderColor: '#9ca3af' // gray-400
    }
  }
  
  // Default: transparent background with darkened text
  return {
    backgroundColor: `${hexColor}20`,
    color: getReadableColor(hexColor),
    borderColor: `${hexColor}60`
  }
}
