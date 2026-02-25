declare module "philippine-location-json-for-geer" {
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

  interface Region 
    id: number
    psgc_code: string
    name: string
    reg_code: string
  

  export const regions: Region[]
  export const provinces: Province[]
  export const city_mun: CityMun[]
  export const barangays: Barangay[]

  export function getProvincesByRegion(regCode: string): Province[]
  export function getCityMunByProvince(provCode: string): CityMun[]
  export function getBarangayByMun(munCode: string): Barangay[]
  export function sort(
    arr: any[],
    key?: string,
    order?: "asc" | "desc"
  ): any[]
}
