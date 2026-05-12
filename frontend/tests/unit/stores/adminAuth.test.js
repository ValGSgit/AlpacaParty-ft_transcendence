/**
 * Admin Auth Store Unit Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAdminAuthStore } from '../../../src/stores/adminAuth.js'

vi.mock('../../../src/services/api.js', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}))

import api from '../../../src/services/api.js'

describe('useAdminAuthStore', () => {
  let store

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useAdminAuthStore()
    vi.clearAllMocks()
  })

  describe('logout', () => {
    it('should clear admin state even if API call fails', async () => {
      store.admin = { id: 1, username: 'admin' }
      api.post.mockRejectedValueOnce(new Error('Network error'))

      try {
        await store.logout()
      } catch {
        // Expected - API call failed
      }

      expect(store.admin).toBeNull()
      expect(store.isAuthenticated).toBe(false)
    })

    it('should clear admin state after logout', async () => {
      store.admin = { id: 1, username: 'admin', role: 'superadmin' }
      api.post.mockResolvedValueOnce({})

      await store.logout()

      expect(api.post).toHaveBeenCalledWith('/admin/logout')
      expect(store.admin).toBeNull()
      expect(store.isAuthenticated).toBe(false)
    })

    it('should attempt to call logout endpoint', async () => {
      api.post.mockResolvedValueOnce({})
      store.admin = { id: 1 }

      await store.logout()

      expect(api.post).toHaveBeenCalledWith('/admin/logout')
    })
  })

  describe('login', () => {
    it('should login and set admin user', async () => {
      const mockResponse = {
        data: {
          user: { id: 1, username: 'admin', role: 'superadmin' },
        },
      }
      api.post.mockResolvedValueOnce(mockResponse)

      const result = await store.login({ username: 'admin', password: 'AdminPass1' })

      expect(api.post).toHaveBeenCalledWith('/admin/login', {
        username: 'admin',
        password: 'AdminPass1',
      }, {
        retryOnAuth: false,
      })
      expect(store.admin).toEqual(mockResponse.data.user)
      expect(store.isAuthenticated).toBe(true)
      expect(result).toEqual(mockResponse.data)
    })

    it('should set error on login failure', async () => {
      api.post.mockRejectedValueOnce({
        response: { data: { error: { message: 'Invalid credentials' } } },
      })

      await expect(store.login({ username: 'admin', password: 'wrong' })).rejects.toBeTruthy()

      expect(store.error).toBe('Invalid credentials')
      expect(store.admin).toBeNull()
    })
  })

  describe('fetchMe', () => {
    it('should fetch and set admin user', async () => {
      api.get.mockResolvedValueOnce({
        data: { admin: { id: 1, username: 'admin', role: 'superadmin' } },
      })

      await store.fetchMe()

      expect(api.get).toHaveBeenCalledWith('/admin/me')
      expect(store.admin).toEqual({ id: 1, username: 'admin', role: 'superadmin' })
      expect(store.isAuthenticated).toBe(true)
    })

    it('should clear admin when fetch fails', async () => {
      store.admin = { id: 1, username: 'stale' }
      api.get.mockRejectedValueOnce(new Error('401 Unauthorized'))

      await store.fetchMe()

      expect(store.admin).toBeNull()
      expect(store.isAuthenticated).toBe(false)
    })
  })

  describe('computed properties', () => {
    it('isAuthenticated should be true when admin is set', () => {
      store.admin = { id: 1, username: 'admin', role: 'admin' }
      expect(store.isAuthenticated).toBe(true)
    })

    it('isAuthenticated should be false when admin is null', () => {
      store.admin = null
      expect(store.isAuthenticated).toBe(false)
    })

    it('isSuperAdmin should be true when role is superadmin', () => {
      store.admin = { id: 1, username: 'admin', role: 'superadmin' }
      expect(store.isSuperAdmin).toBe(true)
    })

    it('isSuperAdmin should be false when role is admin', () => {
      store.admin = { id: 1, username: 'admin', role: 'admin' }
      expect(store.isSuperAdmin).toBe(false)
    })

    it('isSuperAdmin should be false when admin is null', () => {
      store.admin = null
      expect(store.isSuperAdmin).toBe(false)
    })
  })
})
