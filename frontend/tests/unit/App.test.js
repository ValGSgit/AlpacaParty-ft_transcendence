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

    expect(wrapper.find('.logo-text').text()).toBe('AlpacaParty')
  })

  it('shows login/register links when not authenticated', () => {
    const wrapper = mount(App, {
      global: { plugins: [pinia, router] },
    })

    expect(wrapper.find('a[href="/login"]').exists()).toBe(true)
    expect(wrapper.find('a[href="/register"]').exists()).toBe(true)
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
})
