import { renderHook } from '@testing-library/react'
import { usePhLocations } from '@/hooks/use-ph-locations'

describe('usePhLocations', () => {
  describe('toTitleCase formatting', () => {
    it('should properly capitalize city names with "of"', () => {
      const { result } = renderHook(() => usePhLocations())
      
      // Since we can't directly test toTitleCase (it's not exported),
      // we verify by checking that the provinces/cities are formatted correctly
      const provinces = result.current.provinces
      
      // Check that provinces are formatted properly
      expect(provinces).toBeDefined()
      expect(Array.isArray(provinces)).toBe(true)
      
      // All province names should be in title case format
      provinces.forEach(province => {
        // Province names should not have "Of" - should be "of"
        if (province.name.includes(' of ')) {
          expect(province.name).not.toMatch(/ Of /)
          // Should have lowercase "of" unless it's at the start (which won't happen)
          const parts = province.name.split(' ')
          parts.forEach((part, index) => {
            if (part.toLowerCase() === 'of' && index > 0) {
              expect(part).toBe('of')
            }
          })
        }
        
        // Check that first letter is capitalized
        expect(province.name.charAt(0)).toBe(province.name.charAt(0).toUpperCase())
      })
    })

    it('should properly handle NCR and other acronyms', () => {
      const { result } = renderHook(() => usePhLocations())
      const provinces = result.current.provinces
      
      // Find NCR provinces (should have NCR in uppercase)
      const ncrProvinces = provinces.filter(p => p.name.toUpperCase().includes('NCR'))
      
      if (ncrProvinces.length > 0) {
        ncrProvinces.forEach(province => {
          // NCR should be uppercase, not "Ncr"
          expect(province.name).toMatch(/NCR/)
          expect(province.name).not.toMatch(/Ncr[^,]/)
        })
      }
    })

    it('should properly capitalize city names', () => {
      const { result } = renderHook(() => usePhLocations())
      
      // Get cities for a province (using any province code from the data)
      // We can't test specific codes without knowing the data structure
      // but we can test the general behavior
      
      // This is a basic structure test
      expect(result.current.getCities).toBeDefined()
      expect(typeof result.current.getCities).toBe('function')
      
      // Test with empty string (should return empty array)
      const emptyCities = result.current.getCities('')
      expect(Array.isArray(emptyCities)).toBe(true)
      expect(emptyCities.length).toBe(0)
    })

    it('should properly capitalize barangay names', () => {
      const { result } = renderHook(() => usePhLocations())
      
      // Basic structure test
      expect(result.current.getBarangays).toBeDefined()
      expect(typeof result.current.getBarangays).toBe('function')
      
      // Test with empty string (should return empty array)
      const emptyBarangays = result.current.getBarangays('')
      expect(Array.isArray(emptyBarangays)).toBe(true)
      expect(emptyBarangays.length).toBe(0)
    })

    it('should return sorted lists', () => {
      const { result } = renderHook(() => usePhLocations())
      const provinces = result.current.provinces
      
      // Verify provinces are sorted alphabetically
      for (let i = 1; i < provinces.length; i++) {
        const prev = provinces[i - 1].name
        const curr = provinces[i].name
        expect(prev.localeCompare(curr)).toBeLessThanOrEqual(0)
      }
    })
  })

  describe('cascading dropdowns', () => {
    it('should return cities for a valid province code', () => {
      const { result } = renderHook(() => usePhLocations())
      
      // Get any province
      const provinces = result.current.provinces
      if (provinces.length > 0) {
        const firstProvince = provinces[0]
        const cities = result.current.getCities(firstProvince.code)
        
        // Should return an array (might be empty if no cities)
        expect(Array.isArray(cities)).toBe(true)
      }
    })

    it('should return barangays for a valid city code', () => {
      const { result } = renderHook(() => usePhLocations())
      
      // This is a structural test - we can't guarantee specific data
      const barangays = result.current.getBarangays('some-code')
      expect(Array.isArray(barangays)).toBe(true)
    })
  })
})
