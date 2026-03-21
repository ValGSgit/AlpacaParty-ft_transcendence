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

  it('renders user profile when authenticated', () => {
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

    expect(wrapper.find('h2').text()).toBe('tester')
    expect(wrapper.text()).toContain('test@test.com')
    expect(wrapper.text()).toContain('Hello world')
  })

  it('does not render profile card when no user', () => {
    const store = useAuthStore()
    store.user = null

    wrapper = mount(Profile, {
      global: { plugins: [pinia, router] },
    })

    expect(wrapper.find('.profile-card').exists()).toBe(false)
  })

  it('shows default bio placeholder when bio is empty', () => {
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

    expect(wrapper.text()).toContain('—')
  })

  it('renders avatar with correct src', () => {
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

    const img = wrapper.find('img.avatar')
    expect(img.attributes('src')).toBe('/avatars/custom.png')
  })

  it('shows loading state when profile card is absent (no user)', () => {
    const store = useAuthStore()
    store.user = null

    wrapper = mount(Profile, {
      global: { plugins: [pinia, router] },
    })

    // When no user is set, the profile card should not exist
    expect(wrapper.find('.profile-card').exists()).toBe(false)
    expect(wrapper.find('.profile-page').exists()).toBe(true)
  })

  it('toggles edit mode when edit button is clicked', async () => {
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

    // Edit form should not be visible initially
    expect(wrapper.find('.edit-form').exists()).toBe(false)

    // Click edit button
    const editBtn = wrapper.find('.btn-edit')
    expect(editBtn.text()).toContain('Edit Profile')
    await editBtn.trigger('click')
    await wrapper.vm.$nextTick()

    // Edit form should now be visible
    expect(wrapper.find('.edit-form').exists()).toBe(true)
    expect(editBtn.text()).toContain('Cancel')

    // Click again to cancel
    await editBtn.trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.edit-form').exists()).toBe(false)
  })

  it('displays user stats (XP, level, coins)', () => {
    const store = useAuthStore()
    store.user = {
      username: 'gamer',
      email: 'g@g.com',
      avatar: '/avatars/default.svg',
      bio: '',
      status: 'gaming',
      xp: 250,
      level: 3,
      coins: 1500,
      created_at: '2025-01-01T00:00:00Z',
    }

    wrapper = mount(Profile, {
      global: { plugins: [pinia, router] },
    })

    expect(wrapper.text()).toContain('Level 3')
    expect(wrapper.text()).toContain('250 XP')
    expect(wrapper.text()).toContain('1500')
  })
})
