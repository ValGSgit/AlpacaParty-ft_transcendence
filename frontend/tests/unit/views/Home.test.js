/**
 * Home View Unit Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { RouterLinkStub } from '@vue/test-utils'
import Home from '../../../src/views/Home.vue'

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

function mountHome(authUser = null) {
  const pinia = createPinia()
  setActivePinia(pinia)
  if (authUser) {
    const { useAuthStore } = require('../../../src/stores/auth.js')
    useAuthStore().user = authUser
  }
  return mount(Home, {
    global: {
      plugins: [pinia],
      stubs: { RouterLink: RouterLinkStub },
    },
  })
}

describe('Home.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders welcome heading', () => {
    const wrapper = mountHome()
    expect(wrapper.find('h1').text()).toContain('Alpaca Party!')
  })

  it('renders description text', () => {
    const wrapper = mountHome()
    expect(wrapper.find('p').text()).toContain('alpaca farm')
  })

  it('has proper class', () => {
    const wrapper = mountHome()
    expect(wrapper.find('.home').exists()).toBe(true)
  })

  it('renders main heading with correct text', () => {
    const wrapper = mountHome()
    const heading = wrapper.find('.hero-title')
    expect(heading.exists()).toBe(true)
    expect(heading.text()).toBe('Alpaca Party!')
  })

  it('renders for unauthenticated user with get started and login links', () => {
    const wrapper = mountHome()
    const links = wrapper.findAllComponents(RouterLinkStub)
    const destinations = links.map(l => l.props('to'))

    expect(destinations).toContain('/register')
    expect(destinations).toContain('/login')
    // Should NOT show Play Now for guests
    expect(wrapper.text()).not.toContain('Play Now')
  })

  it('renders for authenticated user with play now link', () => {
    const wrapper = mountHome({ id: 1, username: 'alice' })
    const links = wrapper.findAllComponents(RouterLinkStub)
    const destinations = links.map(l => l.props('to'))

    expect(destinations).toContain('/game')
    expect(wrapper.text()).toContain('Play Now')
    // Should NOT show Get Started for authenticated users
    expect(wrapper.text()).not.toContain('Get Started')
  })
})
