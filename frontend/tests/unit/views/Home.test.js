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
})
