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
