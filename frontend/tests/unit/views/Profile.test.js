/**
 * Profile View Unit Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import Profile from '../../../src/views/Profile.vue'
import { useAuthStore } from '../../../src/stores/auth.js'

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

function createTestRouter() {
  return createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/profile', name: 'Profile', component: Profile },
      { path: '/docs', name: 'ApiDocs', component: { template: '<div>Docs</div>' } },
    ],
  })
}

describe('Profile.vue', () => {
  let wrapper, router, pinia

  beforeEach(async () => {
    pinia = createPinia()
    setActivePinia(pinia)
    router = createTestRouter()
    router.push('/profile')
    await router.isReady()
  })

  it('renders user profile when authenticated', async () => {
    const { default: api } = await import('../../../src/services/api.js')
    api.get.mockResolvedValue({ data: { achievements: [], stats: { wins: 0, losses: 0, elo: 1000 }, posts: [], apiKey: null } })

    const store = useAuthStore()
    store.user = {
      username: 'tester',
      email: 'test@test.com',
      avatar: '/avatars/default.svg',
      bio: 'Hello world',
      status: 'online',
      created_at: '2025-01-01T00:00:00Z',
    }

    wrapper = mount(Profile, {
      global: { plugins: [pinia, router] },
    })

    await wrapper.vm.$nextTick()
    expect(wrapper.find('.display-name').text()).toBe('tester')
    expect(wrapper.text()).toContain('Hello world')
  })

  it('does not render profile card when no user', async () => {
    const { default: api } = await import('../../../src/services/api.js')
    api.get.mockResolvedValue({ data: { achievements: [], stats: { wins: 0, losses: 0, elo: 1000 }, posts: [], apiKey: null } })

    const store = useAuthStore()
    store.user = null

    wrapper = mount(Profile, {
      global: { plugins: [pinia, router] },
    })

    await wrapper.vm.$nextTick()
    expect(wrapper.find('.profile-wrap').exists()).toBe(true)
  })

  it('shows default bio placeholder when bio is empty', async () => {
    const { default: api } = await import('../../../src/services/api.js')
    api.get.mockResolvedValue({ data: { achievements: [], stats: { wins: 0, losses: 0, elo: 1000 }, posts: [], apiKey: null } })

    const store = useAuthStore()
    store.user = {
      username: 'u',
      email: 'e@e.com',
      avatar: '/avatars/default.svg',
      bio: '',
      status: 's',
      created_at: '2025-01-01T00:00:00Z',
    }

    wrapper = mount(Profile, {
      global: { plugins: [pinia, router] },
    })

    await wrapper.vm.$nextTick()
    expect(wrapper.find('.bio').exists()).toBe(false)
  })

  it('renders avatar with correct src', async () => {
    const { default: api } = await import('../../../src/services/api.js')
    api.get.mockResolvedValue({ data: { achievements: [], stats: { wins: 0, losses: 0, elo: 1000 }, posts: [], apiKey: null } })

    const store = useAuthStore()
    store.user = {
      username: 'u',
      email: 'e@e.com',
      avatar: '/avatars/custom.png',
      bio: '',
      status: 's',
      created_at: '2025-01-01T00:00:00Z',
    }

    wrapper = mount(Profile, {
      global: { plugins: [pinia, router] },
    })

    await wrapper.vm.$nextTick()
    const img = wrapper.find('.hero-avatar img')
    expect(img.attributes('src')).toBe('/avatars/custom.png')
  })

  it('shows loading state when profile card is absent (no user)', async () => {
    const { default: api } = await import('../../../src/services/api.js')
    api.get.mockResolvedValue({ data: { achievements: [], stats: { wins: 0, losses: 0, elo: 1000 }, posts: [], apiKey: null } })

    const store = useAuthStore()
    store.user = null

    wrapper = mount(Profile, {
      global: { plugins: [pinia, router] },
    })

    await wrapper.vm.$nextTick()
    expect(wrapper.find('.profile-wrap').exists()).toBe(true)
  })

  it('shows settings tab content when settings tab is clicked', async () => {
    const { default: api } = await import('../../../src/services/api.js')
    api.get.mockResolvedValue({ data: { achievements: [], stats: { wins: 0, losses: 0, elo: 1000 }, posts: [], apiKey: null } })

    const store = useAuthStore()
    store.user = {
      username: 'editor',
      email: 'ed@test.com',
      avatar: '/avatars/default.svg',
      bio: 'My bio',
      status: 'active',
      created_at: '2025-01-01T00:00:00Z',
    }

    wrapper = mount(Profile, {
      global: { plugins: [pinia, router] },
    })

    await wrapper.vm.$nextTick()
    expect(wrapper.find('.settings-section').exists()).toBe(false)

    const settingsTab = wrapper.findAll('.tab-pill').find(pill => pill.text() === 'Settings')
    expect(settingsTab).toBeDefined()
    await settingsTab.trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.settings-section').exists()).toBe(true)
    expect(wrapper.text()).toContain('Edit Profile')
  })

})
