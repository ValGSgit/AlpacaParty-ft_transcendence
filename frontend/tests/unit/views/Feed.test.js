/**
 * Feed.vue Unit Tests — upload validation and post creation
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import Feed from '../../../src/views/Feed.vue'
import { useAuthStore } from '../../../src/stores/auth.js'

vi.mock('../../../src/services/api.js', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  },
}))

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: { template: '<div />' } },
    { path: '/user/:id', name: 'UserProfile', component: { template: '<div />' } },
  ],
})

describe('Feed.vue', () => {
  let pinia

  beforeEach(async () => {
    pinia = createPinia()
    setActivePinia(pinia)

    const { default: api } = await import('../../../src/services/api.js')
    api.get.mockResolvedValue({ data: { posts: [] } })
    api.post.mockResolvedValue({ data: { post: {} } })
  })

  it('renders create post form when authenticated', async () => {
    const store = useAuthStore()
    store.user = { id: 1, username: 'alice' }

    const wrapper = mount(Feed, { global: { plugins: [pinia, router] } })
    await wrapper.vm.$nextTick()

    expect(wrapper.find('textarea').exists()).toBe(true)
    expect(wrapper.find('.upload-btn').exists()).toBe(true)
  })

  it('post button disabled when content is empty', async () => {
    const store = useAuthStore()
    store.user = { id: 1, username: 'alice' }

    const wrapper = mount(Feed, { global: { plugins: [pinia, router] } })
    await wrapper.vm.$nextTick()

    const btn = wrapper.find('button[type="submit"]')
    expect(btn.attributes('disabled')).toBeDefined()
  })

  it('post button enabled when content is non-empty', async () => {
    const store = useAuthStore()
    store.user = { id: 1, username: 'alice' }

    const wrapper = mount(Feed, { global: { plugins: [pinia, router] } })
    await wrapper.vm.$nextTick()

    await wrapper.find('textarea').setValue('Hello world!')
    await wrapper.vm.$nextTick()

    const btn = wrapper.find('button[type="submit"]')
    expect(btn.attributes('disabled')).toBeUndefined()
  })

  it('shows error for invalid file type', async () => {
    const store = useAuthStore()
    store.user = { id: 1, username: 'alice' }

    const wrapper = mount(Feed, { global: { plugins: [pinia, router] } })
    await wrapper.vm.$nextTick()

    // Simulate selectImage with invalid file type
    const vm = wrapper.vm
    const fakeEvent = {
      target: {
        files: [{ name: 'doc.pdf', type: 'application/pdf', size: 100 }],
        value: '',
      },
    }
    vm.selectImage ? vm.selectImage(fakeEvent) : null

    // Look for the exposed error ref via wrapper's vm properties
    // or check the DOM
    await wrapper.vm.$nextTick()
    // The component exposes error ref in template
    expect(wrapper.text()).toMatch(/only/i)
  })

  it('shows error for file that is too large', async () => {
    const store = useAuthStore()
    store.user = { id: 1, username: 'alice' }

    const wrapper = mount(Feed, { global: { plugins: [pinia, router] } })
    await wrapper.vm.$nextTick()

    const vm = wrapper.vm
    const fakeEvent = {
      target: {
        files: [{ name: 'big.jpg', type: 'image/jpeg', size: 15 * 1024 * 1024 }],
        value: '',
      },
    }
    vm.selectImage ? vm.selectImage(fakeEvent) : null
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toMatch(/too large/i)
  })

  it('calls POST /posts on form submit', async () => {
    const { default: api } = await import('../../../src/services/api.js')
    api.get.mockResolvedValue({ data: { posts: [] } })
    api.post.mockResolvedValue({ data: {} })

    const store = useAuthStore()
    store.user = { id: 1, username: 'alice' }

    const wrapper = mount(Feed, { global: { plugins: [pinia, router] } })
    await wrapper.vm.$nextTick()
    await wrapper.find('textarea').setValue('Test post content')
    await wrapper.vm.$nextTick()

    await wrapper.find('form').trigger('submit')
    await wrapper.vm.$nextTick()

    expect(api.post).toHaveBeenCalledWith('/posts', expect.objectContaining({ content: 'Test post content' }))
  })
})
