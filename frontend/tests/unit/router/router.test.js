/**
 * Router Unit Tests
 */
import { describe, it, expect, vi } from 'vitest'

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

import router from '../../../src/router/index.js'

describe('Router', () => {
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

  it('all expected routes are defined', () => {
    const routeNames = router.getRoutes().map(r => r.name).filter(Boolean)
    const expectedRoutes = [
      'UserProfile',
      'Home',
      'Login',
      'Register',
      'Profile',
      'Friends',
      'Game',
      'Feed',
      'ApiDocs',
      'OAuthCallback',
      'PrivacyPolicy',
      'TermsOfService',
      'NotFound',
    ]
    expectedRoutes.forEach(name => {
      expect(routeNames).toContain(name)
    })
  })
})
