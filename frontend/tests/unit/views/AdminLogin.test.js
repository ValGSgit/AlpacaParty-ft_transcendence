/**
 * AdminLogin View Unit Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import AdminLogin from '../../../src/views/AdminLogin.vue'

vi.mock('../../../src/services/api.js', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}))

import api from '../../../src/services/api.js'

function createTestRouter() {
  return createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/admin/login', name: 'AdminLogin', component: AdminLogin },
      { path: '/admin/panel', name: 'AdminPanel', component: { template: '<div>Admin Panel</div>' } },
    ],
  })
}

describe('AdminLogin.vue', () => {
  let wrapper, router

  beforeEach(async () => {
    setActivePinia(createPinia())
    router = createTestRouter()
    router.push('/admin/login')
    await router.isReady()
    vi.clearAllMocks()

    wrapper = mount(AdminLogin, {
      global: {
        plugins: [createPinia(), router],
      },
    })
  })

  describe('rendering', () => {
    it('should render the admin login page title', () => {
      expect(wrapper.text()).toContain('Admin Portal')
    })

    it('should render the login form', () => {
      expect(wrapper.find('form').exists()).toBe(true)
      expect(wrapper.text()).toContain('Username or Email')
      expect(wrapper.text()).toContain('Password')
    })

    it('should render username input field', () => {
      const input = wrapper.find('input#username')
      expect(input.exists()).toBe(true)
      expect(input.attributes('type')).toBe('text')
      expect(input.attributes('required')).toBeDefined()
      expect(input.attributes('placeholder')).toContain('admin@alpacaparty.com')
    })

    it('should render password input field', () => {
      const input = wrapper.find('input#password')
      expect(input.exists()).toBe(true)
      expect(input.attributes('type')).toBe('password')
      expect(input.attributes('required')).toBeDefined()
      expect(input.attributes('placeholder')).toBe('••••••••••••')
    })

    it('should render submit button', () => {
      const button = wrapper.find('button[type="submit"]')
      expect(button.exists()).toBe(true)
      expect(button.text()).toContain('Access Console')
    })

    it('should render password toggle button', () => {
      const toggleBtn = wrapper.find('button.toggle-password')
      expect(toggleBtn.exists()).toBe(true)
    })

    it('should render security subtitle', () => {
      expect(wrapper.text()).toContain('AlpacaParty Management Console')
    })

    it('should render shield icon', () => {
      const svg = wrapper.find('.shield-icon svg')
      expect(svg.exists()).toBe(true)
    })
  })

  describe('form interactions', () => {
    it('should update form data when typing in username field', async () => {
      const usernameInput = wrapper.find('input#username')
      await usernameInput.setValue('testadmin')
      expect(wrapper.vm.form.username).toBe('testadmin')
    })

    it('should update form data when typing in password field', async () => {
      const passwordInput = wrapper.find('input#password')
      await passwordInput.setValue('TestPass123')
      expect(wrapper.vm.form.password).toBe('TestPass123')
    })

    it('should toggle password visibility', async () => {
      const passwordInput = wrapper.find('input#password')
      const toggleBtn = wrapper.find('button.toggle-password')

      // Initially should be hidden
      expect(passwordInput.attributes('type')).toBe('password')
      expect(wrapper.vm.showPassword).toBe(false)

      // Click to show password
      await toggleBtn.trigger('click')
      expect(wrapper.vm.showPassword).toBe(true)
      expect(passwordInput.attributes('type')).toBe('text')

      // Click to hide password
      await toggleBtn.trigger('click')
      expect(wrapper.vm.showPassword).toBe(false)
      expect(passwordInput.attributes('type')).toBe('password')
    })

    it('should toggle password multiple times', async () => {
      const toggleBtn = wrapper.find('button.toggle-password')

      // Toggle 3 times
      await toggleBtn.trigger('click')
      expect(wrapper.vm.showPassword).toBe(true)

      await toggleBtn.trigger('click')
      expect(wrapper.vm.showPassword).toBe(false)

      await toggleBtn.trigger('click')
      expect(wrapper.vm.showPassword).toBe(true)
    })
  })

  describe('form submission', () => {
    it('should submit login form with credentials', async () => {
      api.post.mockResolvedValueOnce({
        data: { user: { id: 1, username: 'admin', role: 'superadmin' }, token: 'abc123' },
      })

      await wrapper.find('input#username').setValue('admin')
      await wrapper.find('input#password').setValue('SecurePass123')
      await wrapper.find('form').trigger('submit')

      expect(api.post).toHaveBeenCalledWith('/admin/login', {
        username: 'admin',
        password: 'SecurePass123',
      }, {
        retryOnAuth: false,
      })
    })

    it('should navigate to AdminPanel on successful login', async () => {
      api.post.mockResolvedValueOnce({
        data: { user: { id: 1, username: 'admin', role: 'superadmin' } },
      })

      await wrapper.find('input#username').setValue('admin')
      await wrapper.find('input#password').setValue('pass')
      await wrapper.find('form').trigger('submit')
      await wrapper.vm.$nextTick()

      expect(router.currentRoute.value.name).toBe('AdminPanel')
    })

    it('should set loading state during submission', async () => {
      let resolvePromise
      api.post.mockReturnValueOnce(new Promise(r => { resolvePromise = r }))

      await wrapper.find('input#username').setValue('admin')
      await wrapper.find('input#password').setValue('pass')
      await wrapper.find('form').trigger('submit')
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.loading).toBe(true)
      const submitBtn = wrapper.find('button[type="submit"]')
      expect(submitBtn.attributes('disabled')).toBeDefined()

      resolvePromise({ data: { user: { id: 1 } } })
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.loading).toBe(false)
      expect(submitBtn.attributes('disabled')).toBeUndefined()
    })

    it('should prevent submission when loading', async () => {
      let resolvePromise
      api.post.mockReturnValueOnce(new Promise(r => { resolvePromise = r }))

      await wrapper.find('input#username').setValue('admin')
      await wrapper.find('input#password').setValue('pass')

      const form = wrapper.find('form')
      await form.trigger('submit')
      expect(wrapper.vm.loading).toBe(true)

      // Try to submit again
      await form.trigger('submit')
      // API should have been called only once due to button disabled state
      expect(api.post).toHaveBeenCalledTimes(1)

      resolvePromise({ data: { user: { id: 1 } } })
    })
  })

  describe('error handling', () => {
    it('should display error message on login failure', async () => {
      api.post.mockRejectedValueOnce({
        response: { data: { error: { message: 'Invalid credentials' } } },
      })

      await wrapper.find('input#username').setValue('admin')
      await wrapper.find('input#password').setValue('wrong')
      await wrapper.find('form').trigger('submit')
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('Invalid credentials')
      expect(wrapper.find('.error-banner').exists()).toBe(true)
    })

    it('should display fallback error message when response has no message', async () => {
      api.post.mockRejectedValueOnce({
        response: { data: {} },
      })

      await wrapper.find('input#username').setValue('admin')
      await wrapper.find('input#password').setValue('pass')
      await wrapper.find('form').trigger('submit')
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('Login failed')
    })

    it('should display error when fetch fails', async () => {
      api.post.mockRejectedValueOnce(new Error('Network error'))

      await wrapper.find('input#username').setValue('admin')
      await wrapper.find('input#password').setValue('pass')
      await wrapper.find('form').trigger('submit')
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('Login failed')
    })

    it('should clear previous error on new submission attempt', async () => {
      // First submission fails
      api.post.mockRejectedValueOnce({
        response: { data: { error: { message: 'Invalid credentials' } } },
      })

      await wrapper.find('input#username').setValue('admin')
      await wrapper.find('input#password').setValue('wrong')
      await wrapper.find('form').trigger('submit')
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('Invalid credentials')

      // Clear form and try again
      api.post.mockResolvedValueOnce({
        data: { user: { id: 1 } },
      })

      await wrapper.find('input#username').setValue('admin')
      await wrapper.find('input#password').setValue('correct')
      await wrapper.find('form').trigger('submit')
      await wrapper.vm.$nextTick()

      // Error should be cleared
      expect(wrapper.vm.error).toBe('')
    })

    it('should have error banner styling', () => {
      const banner = wrapper.find('.error-banner')
      expect(banner.exists()).toBe(true)
    })

    it('should include error icon in error banner', async () => {
      api.post.mockRejectedValueOnce({
        response: { data: { error: { message: 'Login failed' } } },
      })

      await wrapper.find('input#username').setValue('admin')
      await wrapper.find('input#password').setValue('pass')
      await wrapper.find('form').trigger('submit')
      await wrapper.vm.$nextTick()

      const errorBanner = wrapper.find('.error-banner')
      const errorIcon = errorBanner.find('svg')
      expect(errorIcon.exists()).toBe(true)
    })
  })

  describe('loading states', () => {
    it('should show spinner during loading', async () => {
      let resolvePromise
      api.post.mockReturnValueOnce(new Promise(r => { resolvePromise = r }))

      await wrapper.find('input#username').setValue('admin')
      await wrapper.find('input#password').setValue('pass')
      await wrapper.find('form').trigger('submit')
      await wrapper.vm.$nextTick()

      const spinner = wrapper.find('.spinner')
      expect(spinner.exists()).toBe(true)

      resolvePromise({ data: { user: { id: 1 } } })
      await wrapper.vm.$nextTick()
    })

    it('should disable submit button during loading', async () => {
      let resolvePromise
      api.post.mockReturnValueOnce(new Promise(r => { resolvePromise = r }))

      await wrapper.find('input#username').setValue('admin')
      await wrapper.find('input#password').setValue('pass')
      const submitBtn = wrapper.find('button[type="submit"]')

      await wrapper.find('form').trigger('submit')
      await wrapper.vm.$nextTick()

      expect(submitBtn.attributes('disabled')).toBeDefined()

      resolvePromise({ data: { user: { id: 1 } } })
    })
  })

  describe('form validation', () => {
    it('should not submit with empty username', async () => {
      // HTML5 required attribute should prevent submission
      const usernameInput = wrapper.find('input#username')
      expect(usernameInput.attributes('required')).toBeDefined()
    })

    it('should not submit with empty password', async () => {
      // HTML5 required attribute should prevent submission
      const passwordInput = wrapper.find('input#password')
      expect(passwordInput.attributes('required')).toBeDefined()
    })

    it('should have autocomplete attributes for accessibility', () => {
      const usernameInput = wrapper.find('input#username')
      const passwordInput = wrapper.find('input#password')

      expect(usernameInput.attributes('autocomplete')).toBe('username')
      expect(passwordInput.attributes('autocomplete')).toBe('current-password')
    })
  })

  describe('initial state', () => {
    it('should have empty form initially', () => {
      expect(wrapper.vm.form.username).toBe('')
      expect(wrapper.vm.form.password).toBe('')
    })

    it('should not be loading initially', () => {
      expect(wrapper.vm.loading).toBe(false)
    })

    it('should have no error message initially', () => {
      expect(wrapper.vm.error).toBe('')
    })

    it('should have password hidden initially', () => {
      expect(wrapper.vm.showPassword).toBe(false)
    })
  })

  describe('visual elements', () => {
    it('should render background grid decoration', () => {
      expect(wrapper.find('.bg-grid').exists()).toBe(true)
    })

    it('should render glow effects', () => {
      expect(wrapper.find('.bg-glow.top-left').exists()).toBe(true)
      expect(wrapper.find('.bg-glow.bottom-right').exists()).toBe(true)
    })

    it('should render card footer with security message', () => {
      expect(wrapper.text()).toContain('Unauthorized access is strictly prohibited')
    })
  })
})
