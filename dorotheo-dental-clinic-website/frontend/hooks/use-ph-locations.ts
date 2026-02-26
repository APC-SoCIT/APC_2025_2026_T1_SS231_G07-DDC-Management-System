"use client"

import { useMemo, useCallback } from "react"
import {
  provinces as allProvinces,
  getCityMunByProvince,
  getBarangayByMun,
} from "philippine-location-json-for-geer"

interface Province {
  id: number
  psgc_code: string
  name: string
  reg_code: string
  prov_code: string
}

interface CityMun {
  id: number
  psgc_code: string
  name: string
  reg_code: string
  prov_code: string
  mun_code: string
}

interface Barangay {
  id: number
  brgy_code: string
  name: string
  reg_code: string
  prov_code: string
  mun_code: string
}

/**
 * Formats a raw Philippine location name from ALL-CAPS to Title Case.
 * For example: "QUEZON CITY" → "Quezon City"
 * Handles special cases: keeps "of", "and", "the" lowercase (except at start),
 * and preserves acronyms like "NCR".
 */
function toTitleCase(str: string): string {
  // Words that should remain lowercase (unless at the start or after a comma)
  const lowercaseWords = new Set(['of', 'the', 'and', 'in', 'on', 'at', 'to', 'for', 'de', 'del'])
  
  // Known acronyms that should remain uppercase
  const acronyms = new Set(['ncr', 'ncrpp', 'armm', 'car', 'psgc'])
  
  return str
    .toLowerCase()
    .split(/\s+/)
    .map((word, index) => {
      // Handle words with commas (e.g., "ncr,")
      if (word.includes(',')) {
        const parts = word.split(',')
        return parts.map((part) => {
          if (!part) return ''
          if (acronyms.has(part)) {
            return part.toUpperCase()
          }
          return part.charAt(0).toUpperCase() + part.slice(1)
        }).join(',')
      }
      
      // Keep acronyms uppercase
      if (acronyms.has(word)) {
        return word.toUpperCase()
      }
      
      // First word should always be capitalized
      if (index === 0) {
        return word.charAt(0).toUpperCase() + word.slice(1)
      }
      
      // Keep certain words lowercase
      if (lowercaseWords.has(word)) {
        return word
      }
      
      // Capitalize other words
      return word.charAt(0).toUpperCase() + word.slice(1)
    })
    .join(' ')
}

/**
 * Custom hook that provides Philippine geographic division data
 * for cascading Province → City/Municipality → Barangay dropdowns.
 */
export function usePhLocations() {
  /** Sorted list of all provinces (title-cased), deduplicated by prov_code. */
  const provinces = useMemo(() => {
    const seen = new Map<string, { code: string; name: string }>()
    for (const p of allProvinces as Province[]) {
      if (!seen.has(p.prov_code)) {
        seen.set(p.prov_code, { code: p.prov_code, name: toTitleCase(p.name) })
      }
    }
    return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [])

  /** Returns cities/municipalities for a given province code. */
  const getCities = useCallback((provCode: string) => {
    if (!provCode) return []
    return (getCityMunByProvince(provCode) as CityMun[])
      .map((c) => ({
        code: c.mun_code,
        name: toTitleCase(c.name),
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [])

  /** Returns barangays for a given city/municipality code. */
  const getBarangays = useCallback((munCode: string) => {
    if (!munCode) return []
    return (getBarangayByMun(munCode) as Barangay[])
      .map((b) => ({
        code: b.brgy_code,
        name: toTitleCase(b.name),
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [])

  return { provinces, getCities, getBarangays }
}
