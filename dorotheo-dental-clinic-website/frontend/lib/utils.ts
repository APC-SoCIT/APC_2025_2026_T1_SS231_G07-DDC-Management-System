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
