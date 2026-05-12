/**
 * Admin Auth Store Unit Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAdminAuthStore } from '../../../src/stores/adminAuth.js'

// Mock the api module
vi.mock('../../../src/services/api.js', () => {
  return {
    default: {
      post: vi.fn(),
      get: vi.fn(),
    },
  }
})

import api from '../../../src/services/api.js'

describe('useAdminAuthStore', () => {
  let store

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useAdminAuthStore()
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('should have null admin', () => {
      expect(store.admin).toBeNull()
    })

    it('should not be authenticated', () => {
      expect(store.isAuthenticated).toBe(false)
    })

    it('should not be loading', () => {
      expect(store.loading).toBe(false)
    })

    it('should have no error', () => {
      expect(store.error).toBeNull()
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

    it('should use fallback error message when no response data', async () => {
      api.post.mockRejectedValueOnce(new Error('Network error'))

      await expect(store.login({ username: 'admin', password: 'pass' })).rejects.toBeTruthy()

      expect(store.error).toBe('Login failed')
    })

    it('should set loading during login', async () => {
      let resolvePromise
      api.post.mockReturnValueOnce(new Promise(r => { resolvePromise = r }))

      const p = store.login({ username: 'admin', password: 'pass' })
      expect(store.loading).toBe(true)

      resolvePromise({ data: { user: { id: 1, username: 'admin' } } })
      await p

      expect(store.loading).toBe(false)
    })

    it('should clear previous error on new login attempt', async () => {
      // First call fails
      api.post.mockRejectedValueOnce(new Error('fail'))
      await expect(store.login({ username: 'u', password: 'p' })).rejects.toBeTruthy()
      expect(store.error).toBe('Login failed')

      // Second call — error should be cleared at the start
      let resolvePromise
      api.post.mockReturnValueOnce(new Promise(r => { resolvePromise = r }))
      const p = store.login({ username: 'u2', password: 'p2' })

      expect(store.error).toBeNull()

      resolvePromise({ data: { user: { id: 2 } } })
      await p
    })

    it('should return response data including tokens', async () => {
      const mockResponse = {
        data: {
          user: { id: 1, username: 'admin', role: 'admin' },
          token: 'admin-token-xyz',
        },
      }
      api.post.mockResolvedValueOnce(mockResponse)

      const result = await store.login({ username: 'admin', password: 'pass' })

      expect(result).toHaveProperty('user')
      expect(result).toHaveProperty('token')
    })
  })

  describe('logout', () => {
    it('should clear admin state after logout', async () => {
      store.admin = { id: 1, username: 'admin', role: 'superadmin' }
      api.post.mockResolvedValueOnce({})

      await store.logout()

      expect(api.post).toHaveBeenCalledWith('/admin/logout')
      expect(store.admin).toBeNull()
      expect(store.isAuthenticated).toBe(false)
    })

    it('should clear admin state even if API call fails', async () => {
      store.admin = { id: 1, username: 'admin' }
      api.post.mockRejectedValueOnce(new Error('Network error'))

      await store.logout()

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

    it('should not throw on fetch error', async () => {
      api.get.mockRejectedValueOnce(new Error('Network error'))

      await expect(store.fetchMe()).resolves.not.toThrow()
      expect(store.admin).toBeNull()
    })

    it('should preserve admin state on successful fetch', async () => {
      const adminUser = { id: 2, username: 'superadmin', role: 'superadmin', email: 'admin@example.com' }
      api.get.mockResolvedValueOnce({ data: { admin: adminUser } })

      await store.fetchMe()

      expect(store.admin).toEqual(adminUser)
      expect(store.admin.id).toBe(2)
      expect(store.admin.email).toBe('admin@example.com')
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

    it('isSuperAdmin should be false when role is user', () => {
      store.admin = { id: 1, username: 'admin', role: 'user' }
      expect(store.isSuperAdmin).toBe(false)
    })
  })

  describe('state reactivity', () => {
    it('should update loading state during async operations', async () => {
      let resolvePromise
      api.post.mockReturnValueOnce(new Promise(r => { resolvePromise = r }))

      const p = store.login({ username: 'u', password: 'p' })
      expect(store.loading).toBe(true)
      expect(store.isAuthenticated).toBe(false)

      resolvePromise({ data: { user: { id: 1 } } })
      await p

      expect(store.loading).toBe(false)
      expect(store.isAuthenticated).toBe(true)
    })

    it('should maintain error state between calls', async () => {
      api.post.mockRejectedValueOnce({
        response: { data: { error: { message: 'Error 1' } } },
      })

      await expect(store.login({ username: 'u', password: 'p' })).rejects.toBeTruthy()
      expect(store.error).toBe('Error 1')

      // Error should persist until new attempt
      api.post.mockRejectedValueOnce({
        response: { data: { error: { message: 'Error 2' } } },
      })

      const p = store.login({ username: 'u2', password: 'p2' })
      // Error is cleared at start of new login
      expect(store.error).toBeNull()

      await expect(p).rejects.toBeTruthy()
      expect(store.error).toBe('Error 2')
    })
  })

  describe('edge cases', () => {
    it('should handle empty username and password', async () => {
      api.post.mockResolvedValueOnce({
        data: { user: { id: 1 } },
      })

      await store.login({ username: '', password: '' })

      expect(api.post).toHaveBeenCalledWith('/admin/login', {
        username: '',
        password: '',
      }, {
        retryOnAuth: false,
      })
    })

    it('should handle admin with missing role property', () => {
      store.admin = { id: 1, username: 'admin' }
      expect(store.isSuperAdmin).toBe(false)
    })

    it('should handle null error response in login', async () => {
      api.post.mockRejectedValueOnce({
        response: { data: null },
      })

      await expect(store.login({ username: 'u', password: 'p' })).rejects.toBeTruthy()
      expect(store.error).toBe('Login failed')
    })
  })
})
