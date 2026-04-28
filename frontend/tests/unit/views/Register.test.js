/**
 * Register View Unit Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import Register from '../../../src/views/Register.vue'

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
      { path: '/login', name: 'Login', component: { template: '<div>Login</div>' } },
      { path: '/register', name: 'Register', component: Register },
    ],
  })
}

describe('Register.vue', () => {
  let wrapper, router

  beforeEach(async () => {
    setActivePinia(createPinia())
    router = createTestRouter()
    router.push('/register')
    await router.isReady()
    vi.clearAllMocks()

    wrapper = mount(Register, {
      global: {
        plugins: [createPinia(), router],
      },
    })
  })

  it('renders registration form', () => {
    expect(wrapper.find('h2').text()).toBe('Create Account')
    expect(wrapper.find('input#username').exists()).toBe(true)
    expect(wrapper.find('input#email').exists()).toBe(true)
    expect(wrapper.find('input#password').exists()).toBe(true)
    expect(wrapper.find('input#confirm').exists()).toBe(true)
    expect(wrapper.find('button[type="submit"]').exists()).toBe(true)
  })

  it('renders login link', () => {
    const link = wrapper.find('a[href="/login"]')
    expect(link.exists()).toBe(true)
  })

  it('shows error when passwords do not match', async () => {
    await wrapper.find('#username').setValue('user')
    await wrapper.find('#email').setValue('u@u.com')
    await wrapper.find('#password').setValue('Password1')
    await wrapper.find('#confirm').setValue('Different1')
    await wrapper.find('form').trigger('submit')

    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Passwords do not match')
  })

  it('submits registration when data is valid', async () => {
    api.post.mockResolvedValueOnce({
      data: { user: { id: 1 }, accessToken: 'a', refreshToken: 'r' },
    })

    await wrapper.find('#username').setValue('newuser')
    await wrapper.find('#email').setValue('new@test.com')
    await wrapper.find('#password').setValue('ValidPass1')
    await wrapper.find('#confirm').setValue('ValidPass1')
    await wrapper.find('form').trigger('submit')

    expect(api.post).toHaveBeenCalledWith('/auth/register', {
      username: 'newuser',
      email: 'new@test.com',
      password: 'ValidPass1',
    }, {
      retryOnAuth: false,
    })
  })

  it('shows API error on registration failure', async () => {
    api.post.mockRejectedValueOnce({
      response: { data: { error: { message: 'Email already registered' } } },
    })

    await wrapper.find('#username').setValue('user')
    await wrapper.find('#email').setValue('dup@test.com')
    await wrapper.find('#password').setValue('ValidPass1')
    await wrapper.find('#confirm').setValue('ValidPass1')
    await wrapper.find('form').trigger('submit')

    await vi.dynamicImportSettled()
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Email already registered')
  })

  it('disables button during loading', async () => {
    let resolveRegister
    api.post.mockReturnValueOnce(new Promise(r => { resolveRegister = r }))

    await wrapper.find('#username').setValue('validuser')
    await wrapper.find('#email').setValue('e@e.com')
    await wrapper.find('#password').setValue('ValidPass1')
    await wrapper.find('#confirm').setValue('ValidPass1')
    await wrapper.find('form').trigger('submit')

    await wrapper.vm.$nextTick()
    expect(wrapper.find('button').text()).toContain('Creating account')

    resolveRegister({ data: { user: {}, accessToken: 'a', refreshToken: 'r' } })
  })

  it('confirm password field has type="password"', () => {
    const confirmInput = wrapper.find('input#confirm')
    expect(confirmInput.attributes('type')).toBe('password')
  })

  it('empty form does not call API', async () => {
    // All fields empty — submit
    await wrapper.find('form').trigger('submit')
    await wrapper.vm.$nextTick()

    expect(api.post).not.toHaveBeenCalled()
  })

  it('shows validation error for short username', async () => {
    await wrapper.find('#username').setValue('ab')
    await wrapper.find('#email').setValue('a@b.com')
    await wrapper.find('#password').setValue('ValidPass1')
    await wrapper.find('#confirm').setValue('ValidPass1')
    await wrapper.find('form').trigger('submit')
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Username must be between 3 and 32 characters')
    expect(api.post).not.toHaveBeenCalled()
  })

  it('successful registration navigates to home', async () => {
    api.post.mockResolvedValueOnce({
      data: { user: { id: 1 }, accessToken: 'a', refreshToken: 'r' },
    })

    const pushSpy = vi.spyOn(router, 'push')

    await wrapper.find('#username').setValue('newuser')
    await wrapper.find('#email').setValue('new@test.com')
    await wrapper.find('#password').setValue('ValidPass1')
    await wrapper.find('#confirm').setValue('ValidPass1')
    await wrapper.find('form').trigger('submit')

    await vi.waitFor(() => {
      expect(pushSpy).toHaveBeenCalledWith('/')
    })
  })
})
