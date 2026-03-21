/**
 * App.vue Unit Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import App from '../../src/App.vue'
import { useAuthStore } from '../../src/stores/auth.js'

vi.mock('../../src/services/api.js', () => ({
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

function createTestRouter() {
  return createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/', name: 'Home', component: { template: '<div>Home</div>' } },
      { path: '/login', name: 'Login', component: { template: '<div>Login</div>' } },
      { path: '/register', name: 'Register', component: { template: '<div>Register</div>' } },
      { path: '/profile', name: 'Profile', component: { template: '<div>Profile</div>' } },
      { path: '/friends', name: 'Friends', component: { template: '<div>Friends</div>' } },
      { path: '/messages', name: 'Messages', component: { template: '<div>Messages</div>' } },
      { path: '/game', name: 'Game', component: { template: '<div>Game</div>' } },
      { path: '/settings', name: 'Settings', component: { template: '<div>Settings</div>' } },
      { path: '/help', name: 'Help', component: { template: '<div>Help</div>' } },
      { path: '/api-test', name: 'ApiTest', component: { template: '<div>ApiTest</div>' } },
      { path: '/privacy', name: 'PrivacyPolicy', component: { template: '<div>Privacy</div>' } },
      { path: '/terms', name: 'TermsOfService', component: { template: '<div>Terms</div>' } },
    ],
  })
}

describe('App.vue', () => {
  let pinia, router

  beforeEach(async () => {
    pinia = createPinia()
    setActivePinia(pinia)
    router = createTestRouter()
    router.push('/')
    await router.isReady()
  })

  it('renders navbar with logo', () => {
    const wrapper = mount(App, {
      global: { plugins: [pinia, router] },
    })

    expect(wrapper.find('.logo-text').text()).toBe('Alpaca Party!')
  })

  it('shows login/register links when not authenticated', () => {
    const wrapper = mount(App, {
      global: { plugins: [pinia, router] },
    })

    expect(wrapper.find('a[href="/login"]').exists()).toBe(true)
    expect(wrapper.find('a[href="/profile"]').exists()).toBe(false)
  })

  it('shows profile/logout when authenticated', async () => {
    const store = useAuthStore()
    store.user = { id: 1, username: 'user' }

    const wrapper = mount(App, {
      global: { plugins: [pinia, router] },
    })

    await wrapper.vm.$nextTick()

    expect(wrapper.find('a[href="/profile"]').exists()).toBe(true)
    expect(wrapper.find('a[href="/login"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Logout')
  })

  it('has Home link always visible', () => {
    const wrapper = mount(App, {
      global: { plugins: [pinia, router] },
    })

    expect(wrapper.find('a[href="/"]').exists()).toBe(true)
  })

  it('notification bell is visible when authenticated', async () => {
    const store = useAuthStore()
    store.user = { id: 1, username: 'user' }

    const wrapper = mount(App, { global: { plugins: [pinia, router] } })
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.notification-btn').exists()).toBe(true)
  })

  it('notification panel is hidden initially', async () => {
    const store = useAuthStore()
    store.user = { id: 1, username: 'user' }

    const wrapper = mount(App, { global: { plugins: [pinia, router] } })
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.notif-panel').exists()).toBe(false)
  })

  it('notification panel opens on bell click', async () => {
    const { default: api } = await import('../../src/services/api.js')
    api.get.mockResolvedValue({ data: { notifications: [] } })

    const store = useAuthStore()
    store.user = { id: 1, username: 'user' }

    const wrapper = mount(App, { global: { plugins: [pinia, router] } })
    await wrapper.vm.$nextTick()

    await wrapper.find('.notification-btn').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.notif-panel').exists()).toBe(true)
  })

  it('shows unread badge count when unread notifications exist', async () => {
    const { default: api } = await import('../../src/services/api.js')
    api.get.mockResolvedValue({
      data: {
        notifications: [
          { id: 1, message: 'You have a new friend request', is_read: false, created_at: new Date() },
          { id: 2, message: 'Your post was liked', is_read: true, created_at: new Date() },
        ],
      },
    })

    const store = useAuthStore()
    store.user = { id: 1, username: 'user' }

    const wrapper = mount(App, { global: { plugins: [pinia, router] } })
    await wrapper.vm.$nextTick()

    // Open panel to trigger fetchNotifications
    await wrapper.find('.notification-btn').trigger('click')
    await wrapper.vm.$nextTick()
    await new Promise(r => setTimeout(r, 10))
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.notif-badge').exists()).toBe(true)
  })
})
