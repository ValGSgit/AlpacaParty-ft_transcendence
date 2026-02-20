/**
 * Router Unit Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('../../../src/services/api.js', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  },
}))

// Import router after mocking api
import router from '../../../src/router/index.js'
import { useAuthStore } from '../../../src/stores/auth.js'

describe('Router', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('has correct routes defined', () => {
    const routeNames = router.getRoutes().map(r => r.name)
    expect(routeNames).toContain('Home')
    expect(routeNames).toContain('Login')
    expect(routeNames).toContain('Register')
    expect(routeNames).toContain('Profile')
  })

  it('marks profile as requiresAuth', () => {
    const profileRoute = router.getRoutes().find(r => r.name === 'Profile')
    expect(profileRoute.meta.requiresAuth).toBe(true)
  })

  it('marks login as guestOnly', () => {
    const loginRoute = router.getRoutes().find(r => r.name === 'Login')
    expect(loginRoute.meta.guestOnly).toBe(true)
  })

  it('marks register as guestOnly', () => {
    const registerRoute = router.getRoutes().find(r => r.name === 'Register')
    expect(registerRoute.meta.guestOnly).toBe(true)
  })

  it('redirects to login when accessing protected route while unauthenticated', async () => {
    const store = useAuthStore()
    store.user = null

    await router.push('/profile')
    await router.isReady()

    expect(router.currentRoute.value.name).toBe('Login')
  })

  it('redirects authenticated users away from guest-only pages', async () => {
    const store = useAuthStore()
    store.user = { id: 1, username: 'u' }

    await router.push('/login')
    await router.isReady()

    expect(router.currentRoute.value.name).toBe('Home')
  })

  it('allows unauthenticated users to access home', async () => {
    const store = useAuthStore()
    store.user = null

    await router.push('/')
    await router.isReady()

    expect(router.currentRoute.value.name).toBe('Home')
  })
})
