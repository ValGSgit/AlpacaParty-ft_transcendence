/**
 * Login View Unit Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import Login from '../../../src/views/Login.vue'

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

import api from '../../../src/services/api.js'

function createTestRouter() {
  return createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/', name: 'Home', component: { template: '<div>Home</div>' } },
      { path: '/login', name: 'Login', component: Login },
      { path: '/register', name: 'Register', component: { template: '<div>Register</div>' } },
    ],
  })
}

describe('Login.vue', () => {
  let wrapper, router

  beforeEach(async () => {
    setActivePinia(createPinia())
    router = createTestRouter()
    router.push('/login')
    await router.isReady()
    vi.clearAllMocks()

    wrapper = mount(Login, {
      global: {
        plugins: [createPinia(), router],
      },
    })
  })

  it('renders login form', () => {
    expect(wrapper.find('h2').text()).toBe('Login')
    expect(wrapper.find('input#username').exists()).toBe(true)
    expect(wrapper.find('input#password').exists()).toBe(true)
    expect(wrapper.find('button[type="submit"]').exists()).toBe(true)
  })

  it('renders register link', () => {
    const link = wrapper.find('a[href="/register"]')
    expect(link.exists()).toBe(true)
  })

  it('submits login form', async () => {
    api.post.mockResolvedValueOnce({
      data: { user: { id: 1 }, accessToken: 'a', refreshToken: 'r' },
    })

    await wrapper.find('#username').setValue('testuser')
    await wrapper.find('#password').setValue('TestPass1')
    await wrapper.find('form').trigger('submit')

    expect(api.post).toHaveBeenCalledWith('/auth/login', {
      username: 'testuser',
      password: 'TestPass1',
    })
  })

  it('shows error on login failure', async () => {
    api.post.mockRejectedValueOnce({
      response: { data: { error: { message: 'Invalid credentials' } } },
    })

    await wrapper.find('#username').setValue('bad')
    await wrapper.find('#password').setValue('wrong')
    await wrapper.find('form').trigger('submit')

    // Wait for DOM update
    await vi.dynamicImportSettled()
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Invalid credentials')
  })

  it('disables button during loading', async () => {
    let resolveLogin
    api.post.mockReturnValueOnce(new Promise(r => { resolveLogin = r }))

    await wrapper.find('#username').setValue('u')
    await wrapper.find('#password').setValue('p')
    await wrapper.find('form').trigger('submit')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('button').text()).toContain('Logging in')

    resolveLogin({ data: { user: {}, accessToken: 'a', refreshToken: 'r' } })
  })
})
