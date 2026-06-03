/**
 * ListFetcher Unit Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the api module that ListFetcher depends on.
vi.mock('../../../src/services/api.js', () => {
  return {
    default: {
      get: vi.fn(),
    },
  }
})

import api from '../../../src/services/api.js'
import ListFetcher from '../../../src/utils/ListFetcher.js'

describe('ListFetcher', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('constructor', () => {
    it('uses default values when no args are passed', () => {
      const lf = new ListFetcher()
      expect(lf.pageSize).toBe(10)
      expect(lf.page).toBe(1)
      expect(lf.filter).toEqual({})
      expect(lf.sort).toEqual({})
      expect(lf.additionalParams).toEqual({})
      expect(lf.total).toBe(0)
      expect(lf.loading).toBe(false)
    })

    it('accepts custom values', () => {
      const lf = new ListFetcher(25, 3, { name: 'a' }, { name: 'asc' }, { q: 'x' })
      expect(lf.pageSize).toBe(25)
      expect(lf.page).toBe(3)
      expect(lf.filter).toEqual({ name: 'a' })
      expect(lf.sort).toEqual({ name: 'asc' })
      expect(lf.additionalParams).toEqual({ q: 'x' })
    })
  })

  describe('updateParams', () => {
    it('updates pageSize and page', () => {
      const lf = new ListFetcher()
      lf.updateParams({ pageSize: 50, page: 4 })
      expect(lf.pageSize).toBe(50)
      expect(lf.page).toBe(4)
    })

    it('resets to page 1 when filter changes', () => {
      const lf = new ListFetcher(10, 5)
      lf.updateParams({ filter: { name: 'b' } })
      expect(lf.filter).toEqual({ name: 'b' })
      expect(lf.page).toBe(1)
    })

    it('updates sort without touching the page', () => {
      const lf = new ListFetcher(10, 5)
      lf.updateParams({ sort: { createdAt: 'desc' } })
      expect(lf.sort).toEqual({ createdAt: 'desc' })
      expect(lf.page).toBe(5)
    })

    it('clones additionalParams', () => {
      const lf = new ListFetcher()
      const params = { a: 1 }
      lf.updateParams({ additionalParams: params })
      expect(lf.additionalParams).toEqual({ a: 1 })
      expect(lf.additionalParams).not.toBe(params)
    })

    it('is a no-op when called with no args', () => {
      const lf = new ListFetcher(10, 2)
      lf.updateParams()
      expect(lf.pageSize).toBe(10)
      expect(lf.page).toBe(2)
    })
  })

  describe('pagination helpers', () => {
    it('nextPage increments the page', () => {
      const lf = new ListFetcher()
      lf.nextPage()
      expect(lf.page).toBe(2)
    })

    it('previousPage decrements but never goes below 1', () => {
      const lf = new ListFetcher(10, 2)
      lf.previousPage()
      expect(lf.page).toBe(1)
      lf.previousPage()
      expect(lf.page).toBe(1)
    })

    it('isFirstPage reflects the current page', () => {
      const lf = new ListFetcher()
      expect(lf.isFirstPage()).toBe(true)
      lf.nextPage()
      expect(lf.isFirstPage()).toBe(false)
    })

    it('isLastPage is true when the page covers the total', () => {
      const lf = new ListFetcher(10, 1)
      lf.total = 5
      expect(lf.isLastPage()).toBe(true)
      lf.total = 25
      expect(lf.isLastPage()).toBe(false)
    })

    it('multiplePages is true only when total exceeds pageSize', () => {
      const lf = new ListFetcher(10, 1)
      lf.total = 10
      expect(lf.multiplePages()).toBe(false)
      lf.total = 11
      expect(lf.multiplePages()).toBe(true)
    })
  })

  describe('fetch', () => {
    it('builds limit/offset params and stores total from the response', async () => {
      api.get.mockResolvedValue({ data: { total: 42, items: [] } })
      const lf = new ListFetcher(10, 3)

      const res = await lf.fetch('/api/items')

      expect(api.get).toHaveBeenCalledWith('/api/items', {
        params: { limit: 10, offset: 20 },
      })
      expect(lf.total).toBe(42)
      expect(lf.loading).toBe(false)
      expect(res.data.total).toBe(42)
    })

    it('serializes filter and sort while skipping empty/invalid values', async () => {
      api.get.mockResolvedValue({ data: { total: 1 } })
      const lf = new ListFetcher(
        10,
        1,
        { name: 'alice', empty: '', missing: null, undef: undefined },
        { name: 'asc', bad: 'sideways' },
        { extra: 'yes' },
      )

      await lf.fetch('/api/users')

      expect(api.get).toHaveBeenCalledWith('/api/users', {
        params: {
          extra: 'yes',
          limit: 10,
          offset: 0,
          'filter[name]': 'alice',
          'sort[name]': 'asc',
        },
      })
    })

    it('defaults total to 0 when the response omits it', async () => {
      api.get.mockResolvedValue({ data: {} })
      const lf = new ListFetcher()

      await lf.fetch('/api/items')

      expect(lf.total).toBe(0)
    })

    it('resets total and loading then rethrows on error', async () => {
      const err = new Error('boom')
      api.get.mockRejectedValue(err)
      const lf = new ListFetcher()
      lf.total = 99

      await expect(lf.fetch('/api/items')).rejects.toThrow('boom')
      expect(lf.total).toBe(0)
      expect(lf.loading).toBe(false)
    })
  })
})
