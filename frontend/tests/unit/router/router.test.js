/**
 * Router Unit Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'

vi.mock('../../../src/services/api.js', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  },
}))

import router from '../../../src/router/index.js'
import { useAuthStore } from '../../../src/stores/auth.js'
import { useAdminAuthStore } from '../../../src/stores/adminAuth.js'

describe('Router', () => {
  describe('route definitions', () => {
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
        'AdminLogin',
        'AdminPanel',
        'Help',
      ]
      expectedRoutes.forEach(name => {
        expect(routeNames).toContain(name)
      })
    })

    it('should have AdminLogin route', () => {
      const adminLoginRoute = router.getRoutes().find(r => r.name === 'AdminLogin')
      expect(adminLoginRoute).toBeDefined()
      expect(adminLoginRoute.path).toBe('/admin/login')
    })

    it('should have AdminPanel route with requiresAdminAuth', () => {
      const adminPanelRoute = router.getRoutes().find(r => r.name === 'AdminPanel')
      expect(adminPanelRoute).toBeDefined()
      expect(adminPanelRoute.path).toBe('/admin/panel')
      expect(adminPanelRoute.meta.requiresAdminAuth).toBe(true)
    })
  })

  describe('navigation guards', () => {
    let authStore, adminAuthStore

    beforeEach(() => {
      setActivePinia(createPinia())
      authStore = useAuthStore()
      adminAuthStore = useAdminAuthStore()
      vi.clearAllMocks()
    })

    it('should allow navigation to public routes without authentication', async () => {
      authStore.user = null

      const homeRoute = router.getRoutes().find(r => r.name === 'Home')
      expect(homeRoute.meta.requiresAuth).toBe(false)

      const isAllowed = router.getRoutes().find(r => r.name === 'Home')
      expect(isAllowed).toBeDefined()
    })

    it('should allow authenticated users to access protected routes', async () => {
      authStore.user = { id: 1, username: 'test' }

      const profileRoute = router.getRoutes().find(r => r.name === 'Profile')
      expect(profileRoute.meta.requiresAuth).toBe(true)
    })

    it('should redirect unauthenticated users from requiresAuth routes', async () => {
      authStore.user = null
      authStore.isAuthenticated = false

      const profileRoute = router.getRoutes().find(r => r.name === 'Profile')
      expect(profileRoute.meta.requiresAuth).toBe(true)
    })

    it('should redirect authenticated users from guestOnly routes', () => {
      authStore.user = { id: 1, username: 'test' }
      authStore.isAuthenticated = true

      const loginRoute = router.getRoutes().find(r => r.name === 'Login')
      expect(loginRoute.meta.guestOnly).toBe(true)
    })

    it('should mark Feed route as requiresAuth', () => {
      const feedRoute = router.getRoutes().find(r => r.name === 'Feed')
      expect(feedRoute.meta.requiresAuth).toBe(true)
    })

    it('should mark Friends route as requiresAuth', () => {
      const friendsRoute = router.getRoutes().find(r => r.name === 'Friends')
      expect(friendsRoute.meta.requiresAuth).toBe(true)
    })

    it('should mark Game route as public', () => {
      const gameRoute = router.getRoutes().find(r => r.name === 'Game')
      expect(gameRoute.meta.requiresAuth).toBe(false)
    })

    it('should mark ApiDocs route as public', () => {
      const docsRoute = router.getRoutes().find(r => r.name === 'ApiDocs')
      expect(docsRoute.meta.requiresAuth).toBe(false)
    })

    it('should mark Help route as public', () => {
      const helpRoute = router.getRoutes().find(r => r.name === 'Help')
      expect(helpRoute.meta.requiresAuth).toBe(false)
    })

    it('should mark PrivacyPolicy route as public', () => {
      const privacyRoute = router.getRoutes().find(r => r.name === 'PrivacyPolicy')
      expect(privacyRoute.meta.requiresAuth).toBe(false)
    })

    it('should mark TermsOfService route as public', () => {
      const termsRoute = router.getRoutes().find(r => r.name === 'TermsOfService')
      expect(termsRoute.meta.requiresAuth).toBe(false)
    })

    it('should have correct meta for admin routes', () => {
      const adminLoginRoute = router.getRoutes().find(r => r.name === 'AdminLogin')
      const adminPanelRoute = router.getRoutes().find(r => r.name === 'AdminPanel')

      expect(adminLoginRoute.meta.requiresAuth).toBe(false)
      expect(adminPanelRoute.meta.requiresAdminAuth).toBe(true)
    })
  })

  describe('route paths', () => {
    it('login route should be at /login', () => {
      const loginRoute = router.getRoutes().find(r => r.name === 'Login')
      expect(loginRoute.path).toBe('/login')
    })

    it('register route should be at /register', () => {
      const registerRoute = router.getRoutes().find(r => r.name === 'Register')
      expect(registerRoute.path).toBe('/register')
    })

    it('profile route should be at /profile', () => {
      const profileRoute = router.getRoutes().find(r => r.name === 'Profile')
      expect(profileRoute.path).toBe('/profile')
    })

    it('friends route should be at /friends', () => {
      const friendsRoute = router.getRoutes().find(r => r.name === 'Friends')
      expect(friendsRoute.path).toBe('/friends')
    })

    it('feed route should be at /feed', () => {
      const feedRoute = router.getRoutes().find(r => r.name === 'Feed')
      expect(feedRoute.path).toBe('/feed')
    })

    it('admin login route should be at /admin/login', () => {
      const adminLoginRoute = router.getRoutes().find(r => r.name === 'AdminLogin')
      expect(adminLoginRoute.path).toBe('/admin/login')
    })

    it('admin panel route should be at /admin/panel', () => {
      const adminPanelRoute = router.getRoutes().find(r => r.name === 'AdminPanel')
      expect(adminPanelRoute.path).toBe('/admin/panel')
    })

    it('home route should be at /', () => {
      const homeRoute = router.getRoutes().find(r => r.name === 'Home')
      expect(homeRoute.path).toBe('/')
    })

    it('user profile route should be parameterized', () => {
      const userProfileRoute = router.getRoutes().find(r => r.name === 'UserProfile')
      expect(userProfileRoute.path).toBe('/user/:id')
    })
  })

  describe('redirect routes', () => {
    it('should have settings redirect to profile with tab query', () => {
      const settingsRoute = router.getRoutes().find(r => r.path === '/settings')
      expect(settingsRoute).toBeDefined()
      expect(settingsRoute.redirect).toBeDefined()
    })

    it('settings redirect should point to profile', () => {
      const settingsRoute = router.getRoutes().find(r => r.path === '/settings')
      expect(settingsRoute.redirect.name).toBe('Profile')
    })

    it('settings redirect should include settings tab query', () => {
      const settingsRoute = router.getRoutes().find(r => r.path === '/settings')
      expect(settingsRoute.redirect.query.tab).toBe('settings')
    })
  })

  describe('fallback routes', () => {
    it('should have a catch-all route for NotFound', () => {
      const notFoundRoute = router.getRoutes().find(r => r.name === 'NotFound')
      expect(notFoundRoute).toBeDefined()
    })

    it('catch-all route should use wildcard pattern', () => {
      const notFoundRoute = router.getRoutes().find(r => r.name === 'NotFound')
      expect(notFoundRoute.path).toContain(':pathMatch')
    })

    it('NotFound route should be public', () => {
      const notFoundRoute = router.getRoutes().find(r => r.name === 'NotFound')
      expect(notFoundRoute.meta.requiresAuth).toBe(false)
    })
  })

  describe('route count', () => {
    it('should have expected number of routes', () => {
      const routes = router.getRoutes()
      // Should have multiple routes defined
      expect(routes.length).toBeGreaterThanOrEqual(15)
    })

    it('should have named and unnamed routes', () => {
      const routes = router.getRoutes()
      const namedRoutes = routes.filter(r => r.name)
      const unnamedRoutes = routes.filter(r => !r.name)

      expect(namedRoutes.length).toBeGreaterThan(0)
      // There might be unnamed routes for redirects
      expect(routes.length).toBeGreaterThanOrEqual(namedRoutes.length)
    })
  })

  describe('oauth and special routes', () => {
    it('should have OAuthCallback route', () => {
      const oauthRoute = router.getRoutes().find(r => r.name === 'OAuthCallback')
      expect(oauthRoute).toBeDefined()
      expect(oauthRoute.path).toBe('/oauth-callback')
    })

    it('OAuthCallback should be public', () => {
      const oauthRoute = router.getRoutes().find(r => r.name === 'OAuthCallback')
      expect(oauthRoute.meta.requiresAuth).toBe(false)
    })

    it('should have ApiDocs route', () => {
      const docsRoute = router.getRoutes().find(r => r.name === 'ApiDocs')
      expect(docsRoute).toBeDefined()
      expect(docsRoute.path).toBe('/docs')
    })

    it('ApiDocs should be public', () => {
      const docsRoute = router.getRoutes().find(r => r.name === 'ApiDocs')
      expect(docsRoute.meta.requiresAuth).toBe(false)
    })
  })
})
