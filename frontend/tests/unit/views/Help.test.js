/**
 * Help.vue Unit Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

// Mock the api service
vi.mock('../../../src/services/api.js', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  },
}))

// Mock fetch globally
const mockFetch = vi.fn()
globalThis.fetch = mockFetch

import Help from '../../../src/views/Help.vue'
import api from '../../../src/services/api.js'

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  setActivePinia(createPinia())
})

function mountHelp() {
  return mount(Help, {
    global: {
      plugins: [createPinia()],
    },
  })
}

describe('Help.vue', () => {
  it('renders the help page container', () => {
    const wrapper = mountHelp()
    expect(wrapper.find('.help-page').exists()).toBe(true)
  })

  it('renders the header with title', () => {
    const wrapper = mountHelp()
    expect(wrapper.find('h1').text()).toContain('Help Desk')
  })

  it('renders the subtitle', () => {
    const wrapper = mountHelp()
    expect(wrapper.find('.help-subtitle').text()).toContain('Alpaca Party')
  })

  it('shows empty state when no messages', () => {
    const wrapper = mountHelp()
    expect(wrapper.find('.empty-state').exists()).toBe(true)
    expect(wrapper.find('.empty-state').text()).toContain('No messages yet')
  })

  it('renders suggestion buttons', () => {
    const wrapper = mountHelp()
    const buttons = wrapper.findAll('.suggestion-btn')
    expect(buttons.length).toBe(4)
    expect(buttons[0].text()).toContain('friends')
  })

  it('renders the input field', () => {
    const wrapper = mountHelp()
    const input = wrapper.find('.chat-input-bar input')
    expect(input.exists()).toBe(true)
    expect(input.attributes('placeholder')).toContain('Type your question')
  })

  it('renders the send button', () => {
    const wrapper = mountHelp()
    expect(wrapper.find('.send-btn').exists()).toBe(true)
  })

  it('disables send button when input is empty', () => {
    const wrapper = mountHelp()
    const sendBtn = wrapper.find('.send-btn')
    expect(sendBtn.attributes('disabled')).toBeDefined()
  })

  it('enables send button when input has text', async () => {
    const wrapper = mountHelp()
    const input = wrapper.find('.chat-input-bar input')
    await input.setValue('Hello')
    const sendBtn = wrapper.find('.send-btn')
    expect(sendBtn.attributes('disabled')).toBeUndefined()
  })

  it('adds user message on submit', async () => {
    // Mock a successful streaming response that ends immediately
    mockFetch.mockResolvedValueOnce({
      ok: true,
      body: {
        getReader: () => ({
          read: vi.fn()
            .mockResolvedValueOnce({
              done: false,
              value: new TextEncoder().encode('data: {"token":"Hi"}\n\ndata: [DONE]\n\n'),
            })
            .mockResolvedValueOnce({ done: true }),
        }),
      },
    })

    const wrapper = mountHelp()
    const input = wrapper.find('.chat-input-bar input')
    await input.setValue('How do I add friends?')
    await wrapper.find('.chat-input-bar').trigger('submit')

    // User message should appear
    const messages = wrapper.findAll('.message.user')
    expect(messages.length).toBe(1)
    expect(messages[0].text()).toContain('How do I add friends?')
  })

  it('clears input after sending a message', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      body: {
        getReader: () => ({
          read: vi.fn().mockResolvedValueOnce({ done: true }),
        }),
      },
    })

    const wrapper = mountHelp()
    const input = wrapper.find('.chat-input-bar input')
    await input.setValue('Test message')
    await wrapper.find('.chat-input-bar').trigger('submit')

    expect(input.element.value).toBe('')
  })

  it('sends auth token with fetch request', async () => {
    localStorage.setItem('accessToken', 'test-token-123')

    mockFetch.mockResolvedValueOnce({
      ok: true,
      body: {
        getReader: () => ({
          read: vi.fn().mockResolvedValueOnce({ done: true }),
        }),
      },
    })

    const wrapper = mountHelp()
    await wrapper.find('.chat-input-bar input').setValue('Hello')
    await wrapper.find('.chat-input-bar').trigger('submit')

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/help/chat/stream',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token-123',
        }),
      }),
    )
  })

  it('falls back to non-streaming when stream fails', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 })
    api.post.mockResolvedValueOnce({ data: { reply: 'Fallback answer' } })

    const wrapper = mountHelp()
    await wrapper.find('.chat-input-bar input').setValue('Help me')
    await wrapper.find('.chat-input-bar').trigger('submit')

    // Wait for async operations
    await vi.waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/help/chat', expect.objectContaining({
        messages: expect.any(Array),
      }))
    })
  })

  it('sends suggestion text when suggestion button is clicked', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      body: {
        getReader: () => ({
          read: vi.fn().mockResolvedValueOnce({ done: true }),
        }),
      },
    })

    const wrapper = mountHelp()
    const suggestionBtn = wrapper.findAll('.suggestion-btn')[0]
    await suggestionBtn.trigger('click')

    const messages = wrapper.findAll('.message.user')
    expect(messages.length).toBe(1)
    expect(messages[0].text()).toContain('friends')
  })

  it('does not submit when input is empty', async () => {
    const wrapper = mountHelp()
    await wrapper.find('.chat-input-bar').trigger('submit')

    expect(wrapper.findAll('.message').length).toBe(0)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('shows error message when request throws', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    const wrapper = mountHelp()
    await wrapper.find('.chat-input-bar input').setValue('Test')
    await wrapper.find('.chat-input-bar').trigger('submit')

    await vi.waitFor(() => {
      const assistantMsgs = wrapper.findAll('.message.assistant')
      expect(assistantMsgs.length).toBeGreaterThan(0)
      expect(assistantMsgs[0].text()).toContain('went wrong')
    })
  })

  it('suggestion buttons are visible on initial render', () => {
    const wrapper = mountHelp()
    const suggestions = wrapper.findAll('.suggestion-btn')
    expect(suggestions.length).toBeGreaterThan(0)
    suggestions.forEach(btn => {
      expect(btn.isVisible()).toBe(true)
    })
  })

  it('send button is disabled when input is empty and enabled when filled', async () => {
    const wrapper = mountHelp()
    const sendBtn = wrapper.find('.send-btn')

    // Initially disabled
    expect(sendBtn.attributes('disabled')).toBeDefined()

    // Type something
    const input = wrapper.find('.chat-input-bar input')
    await input.setValue('Question')
    expect(sendBtn.attributes('disabled')).toBeUndefined()

    // Clear
    await input.setValue('')
    expect(sendBtn.attributes('disabled')).toBeDefined()
  })

  it('input field clears after send', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      body: {
        getReader: () => ({
          read: vi.fn().mockResolvedValueOnce({ done: true }),
        }),
      },
    })

    const wrapper = mountHelp()
    const input = wrapper.find('.chat-input-bar input')
    await input.setValue('My question')
    expect(input.element.value).toBe('My question')

    await wrapper.find('.chat-input-bar').trigger('submit')
    expect(input.element.value).toBe('')
  })
})
