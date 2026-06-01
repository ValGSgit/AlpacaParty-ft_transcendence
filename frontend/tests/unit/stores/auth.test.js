/**
 * Auth Store Unit Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '../../../src/stores/auth.js'

// Mock the api module
vi.mock('../../../src/services/api.js', () => {
  return {
    default: {
      post: vi.fn(),
      get: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    },
  }
})

import api from '../../../src/services/api.js'

describe('useAuthStore', () => {
  let store

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useAuthStore()
    vi.clearAllMocks()
    localStorage.clear()
  })

  describe('initial state', () => {
    it('should have null user', () => {
      expect(store.user).toBeNull()
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

    it('should have empty username', () => {
      expect(store.username).toBe('')
    })
  })

  describe('register', () => {
    it('should register and set authenticated user', async () => {
      const mockResponse = {
        data: {
          user: { id: 1, username: 'tester', email: 'test@test.com' },
          accessToken: 'access-123',
          refreshToken: 'refresh-456',
        },
      }
      api.post.mockResolvedValueOnce(mockResponse)

      await store.register({ username: 'tester', email: 'test@test.com', password: 'TestPass1' })

      expect(api.post).toHaveBeenCalledWith('/auth/register', {
        username: 'tester',
        email: 'test@test.com',
        password: 'TestPass1',
      }, {
        retryOnAuth: false,
      })
      expect(store.user).toEqual(mockResponse.data.user)
      expect(store.isAuthenticated).toBe(true)
    })

    it('should set error on register failure', async () => {
      api.post.mockRejectedValueOnce({
        data: { error: { message: 'Username already taken' } },
      })

      await expect(store.register({ username: 'taken', email: 'a@b.com', password: 'Pass1234' }))
        .rejects.toBeTruthy()

      expect(store.error).toBe('Username already taken')
      expect(store.user).toBeNull()
    })

    it('should use fallback error message', async () => {
      api.post.mockRejectedValueOnce(new Error('Network error'))

      await expect(store.register({ username: 'u', email: 'e', password: 'p' }))
        .rejects.toBeTruthy()

      expect(store.error).toBe('Registration failed')
    })

    it('should set loading during register', async () => {
      let resolvePromise
      api.post.mockReturnValueOnce(new Promise(r => { resolvePromise = r }))

      const p = store.register({ username: 'u', email: 'e', password: 'p' })
      expect(store.loading).toBe(true)

      resolvePromise({ data: { user: {}, accessToken: 'a', refreshToken: 'r' } })
      await p

      expect(store.loading).toBe(false)
    })

    it('should clear previous error on new register attempt', async () => {
      // First call fails
      api.post.mockRejectedValueOnce(new Error('fail'))
      await expect(store.register({ username: 'u', email: 'e', password: 'p' })).rejects.toBeTruthy()
      expect(store.error).toBe('Registration failed')

      // Second call — error should be cleared at the start
      let resolvePromise
      api.post.mockReturnValueOnce(new Promise(r => { resolvePromise = r }))
      const p = store.register({ username: 'u2', email: 'e2', password: 'p2' })

      // While in-flight, error should already be null
      expect(store.error).toBeNull()

      resolvePromise({ data: { user: { id: 2 }, accessToken: 'a', refreshToken: 'r' } })
      await p
    })
  })

  describe('login', () => {
    it('should login and store tokens', async () => {
      const mockResponse = {
        data: {
          user: { id: 1, username: 'tester' },
          accessToken: 'access-789',
          refreshToken: 'refresh-012',
        },
      }
      api.post.mockResolvedValueOnce(mockResponse)

      await store.login({ username: 'tester', password: 'TestPass1' })

      expect(api.post).toHaveBeenCalledWith('/auth/login', {
        username: 'tester',
        password: 'TestPass1',
      }, {
        retryOnAuth: false,
      })
      expect(store.user).toEqual(mockResponse.data.user)
      expect(store.isAuthenticated).toBe(true)
    })

    it('should set error on login failure', async () => {
      api.post.mockRejectedValueOnce({
        data: { error: { message: 'Invalid credentials' } },
      })

      await expect(store.login({ username: 'u', password: 'p' })).rejects.toBeTruthy()

      expect(store.error).toBe('Invalid credentials')
    })

    it('should use fallback error message', async () => {
      api.post.mockRejectedValueOnce(new Error('oops'))

      await expect(store.login({ username: 'u', password: 'p' })).rejects.toBeTruthy()

      expect(store.error).toBe('Login failed')
    })

    it('should clear previous error on new login attempt', async () => {
      // First call fails
      api.post.mockRejectedValueOnce(new Error('oops'))
      await expect(store.login({ username: 'u', password: 'p' })).rejects.toBeTruthy()
      expect(store.error).toBe('Login failed')

      // Second call — error should be cleared at the start
      let resolvePromise
      api.post.mockReturnValueOnce(new Promise(r => { resolvePromise = r }))
      const p = store.login({ username: 'u2', password: 'p2' })

      expect(store.error).toBeNull()

      resolvePromise({ data: { user: { id: 1 }, accessToken: 'a', refreshToken: 'r' } })
      await p
    })
  })

  describe('logout', () => {
    it('should clear user state', async () => {
      store.user = { id: 1, username: 'tester' }
      api.post.mockResolvedValueOnce({})

      await store.logout()

      expect(store.user).toBeNull()
      expect(store.isAuthenticated).toBe(false)
      expect(localStorage.removeItem).not.toHaveBeenCalled()
    })

    it('should clear user even if API call fails', async () => {
      store.user = { id: 1 }
      api.post.mockRejectedValueOnce(new Error('fail'))

      await store.logout()

      expect(store.user).toBeNull()
      expect(localStorage.removeItem).not.toHaveBeenCalled()
    })
  })

  describe('fetchUser', () => {
    it('should fetch and set user', async () => {
      api.get.mockResolvedValueOnce({ data: { user: { id: 1, username: 'me' } } })

      await store.fetchUser()

      expect(api.get).toHaveBeenCalledWith('/auth/me', { retryOnAuth: false })
      expect(store.user).toEqual({ id: 1, username: 'me' })
    })

    it('should clear user when fetch fails', async () => {
      store.user = { id: 1, username: 'stale' }
      api.get.mockRejectedValueOnce(new Error('401'))

      await store.fetchUser()

      expect(api.get).toHaveBeenCalledWith('/auth/me', { retryOnAuth: false })
      expect(store.user).toBeNull()
    })

    it('should not manipulate localStorage on fetch error', async () => {
      api.get.mockRejectedValueOnce(new Error('401'))

      await store.fetchUser()

      expect(store.user).toBeNull()
      expect(localStorage.removeItem).not.toHaveBeenCalled()
    })

    it('should set loading state during fetchUser', async () => {
      let resolvePromise
      api.get.mockReturnValueOnce(new Promise(r => { resolvePromise = r }))

      const p = store.fetchUser()
      expect(store.loading).toBe(true)

      resolvePromise({ data: { user: { id: 1, username: 'me' } } })
      await p

      expect(store.loading).toBe(false)
    })
  })

  describe('updateProfile', () => {
    it('should update and set user', async () => {
      api.put.mockResolvedValueOnce({ data: { user: { id: 1, username: 'updated' } } })

      await store.updateProfile({ username: 'updated' })

      expect(api.put).toHaveBeenCalledWith('/users/me', { username: 'updated' })
      expect(store.user).toEqual({ id: 1, username: 'updated' })
    })

    it('should set error on failure', async () => {
      api.put.mockRejectedValueOnce({
        data: { error: { message: 'Username taken' } },
      })

      await expect(store.updateProfile({ username: 'taken' })).rejects.toBeTruthy()
      expect(store.error).toBe('Username taken')
    })

    it('should use fallback error message', async () => {
      api.put.mockRejectedValueOnce(new Error('oops'))

      await expect(store.updateProfile({})).rejects.toBeTruthy()
      expect(store.error).toBe('Update failed')
    })

    it('should update with empty object (no changes)', async () => {
      api.put.mockResolvedValueOnce({ data: { user: { id: 1, username: 'same' } } })

      await store.updateProfile({})

      expect(api.put).toHaveBeenCalledWith('/users/me', {})
      expect(store.user).toEqual({ id: 1, username: 'same' })
    })
  })

  describe('computed properties', () => {
    it('isAuthenticated should be true when user is set', () => {
      store.user = { id: 1, username: 'test' }
      expect(store.isAuthenticated).toBe(true)
    })

    it('isAuthenticated should be false when user is null', () => {
      store.user = null
      expect(store.isAuthenticated).toBe(false)
    })

    it('username should return the user username', () => {
      store.user = { id: 1, username: 'alice' }
      expect(store.username).toBe('alice')
    })

    it('username should return empty string when no user', () => {
      store.user = null
      expect(store.username).toBe('')
    })
  })
})
