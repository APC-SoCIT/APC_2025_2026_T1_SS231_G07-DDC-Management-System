/**
 * Tests for patient pagination behavior in frontend API calls.
 *
 * Covers:
 *   - getPatients: default params, custom params, response structure, empty, errors
 *   - getPatientStats: endpoint URL, clinic filter, response structure
 *   - searchPatients: short query guard, valid query, lightweight objects
 *   - getPatientById: fetches single patient by ID
 *   - getAllPatients: removed from api object (dead code removal)
 */

// Mock fetch globally
const mockFetch = jest.fn()
global.fetch = mockFetch as any

// Mock environment
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:8000/api'

import { api } from '@/lib/api'

// Helper: build a successful Response-like object
function mockResponse(body: any, ok = true, status = 200) {
  return Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(body),
  })
}

beforeEach(() => {
  mockFetch.mockReset()
})

// ─────────────────────────────────────────────────────────────
// getPatients
// ─────────────────────────────────────────────────────────────

describe('api.getPatients', () => {
  const token = 'test-token-123'

  test('calls correct URL with default params', async () => {
    mockFetch.mockReturnValueOnce(
      mockResponse({ count: 0, next: null, previous: null, results: [] })
    )

    await api.getPatients(token)

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, options] = mockFetch.mock.calls[0]
    expect(url).toContain('/users/patients/')
    expect(url).toContain('page=1')
    expect(url).toContain('page_size=20')
    expect(options.headers.Authorization).toBe('Token test-token-123')
  })

  test('supports custom page and page_size', async () => {
    mockFetch.mockReturnValueOnce(
      mockResponse({ count: 100, next: null, previous: null, results: [] })
    )

    await api.getPatients(token, 3, 10)

    const [url] = mockFetch.mock.calls[0]
    expect(url).toContain('page=3')
    expect(url).toContain('page_size=10')
  })

  test('returns paginated response structure', async () => {
    const mockData = {
      count: 50,
      next: 'http://localhost:8000/api/users/patients/?page=2',
      previous: null,
      results: [
        { id: 1, first_name: 'Alice', last_name: 'Smith', email: 'alice@test.com' },
      ],
    }
    mockFetch.mockReturnValueOnce(mockResponse(mockData))

    const result = await api.getPatients(token)

    expect(result).toHaveProperty('count', 50)
    expect(result).toHaveProperty('next')
    expect(result).toHaveProperty('previous')
    expect(result).toHaveProperty('results')
    expect(result.results).toHaveLength(1)
  })

  test('handles empty results', async () => {
    mockFetch.mockReturnValueOnce(
      mockResponse({ count: 0, next: null, previous: null, results: [] })
    )

    const result = await api.getPatients(token)

    expect(result.count).toBe(0)
    expect(result.results).toHaveLength(0)
  })

  test('throws on HTTP error', async () => {
    mockFetch.mockReturnValueOnce(
      mockResponse({ detail: 'Unauthorized' }, false, 401)
    )

    await expect(api.getPatients(token)).rejects.toThrow('Failed to fetch patients')
  })

  test('normalizes non-array results to empty array', async () => {
    mockFetch.mockReturnValueOnce(
      mockResponse({ count: 1, next: null, previous: null, results: 'bad-data' })
    )

    const result = await api.getPatients(token)
    expect(result.results).toEqual([])
  })
})

// ─────────────────────────────────────────────────────────────
// getPatientStats
// ─────────────────────────────────────────────────────────────

describe('api.getPatientStats', () => {
  const token = 'test-token-123'

  test('calls correct endpoint without clinic filter', async () => {
    mockFetch.mockReturnValueOnce(
      mockResponse({ total_patients: 50, active_patients: 25, inactive_patients: 25 })
    )

    await api.getPatientStats(token)

    const [url] = mockFetch.mock.calls[0]
    expect(url).toContain('/users/patient_stats/')
    expect(url).not.toContain('clinic=')
  })

  test('includes clinic filter when provided', async () => {
    mockFetch.mockReturnValueOnce(
      mockResponse({ total_patients: 30, active_patients: 20, inactive_patients: 10 })
    )

    await api.getPatientStats(token, 5)

    const [url] = mockFetch.mock.calls[0]
    expect(url).toContain('/users/patient_stats/?clinic=5')
  })

  test('returns stats response structure', async () => {
    const stats = { total_patients: 50, active_patients: 25, inactive_patients: 25 }
    mockFetch.mockReturnValueOnce(mockResponse(stats))

    const result = await api.getPatientStats(token)

    expect(result).toHaveProperty('total_patients')
    expect(result).toHaveProperty('active_patients')
    expect(result).toHaveProperty('inactive_patients')
    expect(result.total_patients).toBe(
      result.active_patients + result.inactive_patients
    )
  })

  test('throws on HTTP error', async () => {
    mockFetch.mockReturnValueOnce(
      mockResponse({ detail: 'Error' }, false, 500)
    )

    await expect(api.getPatientStats(token)).rejects.toThrow('Failed to fetch patient stats')
  })
})

// ─────────────────────────────────────────────────────────────
// searchPatients
// ─────────────────────────────────────────────────────────────

describe('api.searchPatients', () => {
  const token = 'test-token-123'

  test('returns empty array for short query without making fetch', async () => {
    const result = await api.searchPatients(token, 'A')

    expect(result).toEqual([])
    expect(mockFetch).not.toHaveBeenCalled()
  })

  test('returns empty array for empty query without making fetch', async () => {
    const result = await api.searchPatients(token, '')

    expect(result).toEqual([])
    expect(mockFetch).not.toHaveBeenCalled()
  })

  test('calls correct endpoint for valid query', async () => {
    mockFetch.mockReturnValueOnce(
      mockResponse([
        { id: 1, first_name: 'Alice', last_name: 'Smith', email: 'alice@test.com' },
      ])
    )

    await api.searchPatients(token, 'Alice')

    const [url, options] = mockFetch.mock.calls[0]
    expect(url).toContain('/users/patient_search/?q=Alice')
    expect(options.headers.Authorization).toBe('Token test-token-123')
  })

  test('encodes query parameter', async () => {
    mockFetch.mockReturnValueOnce(mockResponse([]))

    await api.searchPatients(token, 'John Doe')

    const [url] = mockFetch.mock.calls[0]
    expect(url).toContain('q=John%20Doe')
  })

  test('returns lightweight patient objects', async () => {
    const results = [
      { id: 1, first_name: 'Alice', last_name: 'Smith', email: 'alice@test.com' },
      { id: 2, first_name: 'Bob', last_name: 'Jones', email: 'bob@test.com' },
    ]
    mockFetch.mockReturnValueOnce(mockResponse(results))

    const data = await api.searchPatients(token, 'test')

    expect(data).toHaveLength(2)
    expect(data[0]).toHaveProperty('id')
    expect(data[0]).toHaveProperty('first_name')
    expect(data[0]).toHaveProperty('last_name')
    expect(data[0]).toHaveProperty('email')
  })

  test('throws on HTTP error', async () => {
    mockFetch.mockReturnValueOnce(
      mockResponse({ detail: 'Error' }, false, 500)
    )

    await expect(api.searchPatients(token, 'test')).rejects.toThrow('Failed to search patients')
  })
})

// ─────────────────────────────────────────────────────────────
// getPatientById
// ─────────────────────────────────────────────────────────────

describe('api.getPatientById', () => {
  const token = 'test-token-123'

  test('calls correct URL for patient ID', async () => {
    const patient = { id: 42, first_name: 'Alice', last_name: 'Smith' }
    mockFetch.mockReturnValueOnce(mockResponse(patient))

    await api.getPatientById(42, token)

    const [url, options] = mockFetch.mock.calls[0]
    expect(url).toContain('/users/42/')
    expect(options.headers.Authorization).toBe('Token test-token-123')
  })

  test('returns single patient object', async () => {
    const patient = {
      id: 42,
      first_name: 'Alice',
      last_name: 'Smith',
      email: 'alice@test.com',
      user_type: 'patient',
    }
    mockFetch.mockReturnValueOnce(mockResponse(patient))

    const result = await api.getPatientById(42, token)

    expect(result.id).toBe(42)
    expect(result.first_name).toBe('Alice')
    expect(result.last_name).toBe('Smith')
  })

  test('throws on HTTP error', async () => {
    mockFetch.mockReturnValueOnce(
      mockResponse({ detail: 'Not found' }, false, 404)
    )

    await expect(api.getPatientById(999, token)).rejects.toThrow('Failed to fetch patient')
  })
})

// ─────────────────────────────────────────────────────────────
// getAllPatients — dead code removal verification
// ─────────────────────────────────────────────────────────────

describe('Dead code removal', () => {
  test('getAllPatients no longer exists on api object', () => {
    expect((api as any).getAllPatients).toBeUndefined()
  })
})
