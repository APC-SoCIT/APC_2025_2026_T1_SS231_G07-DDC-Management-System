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
 */
function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase())
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
