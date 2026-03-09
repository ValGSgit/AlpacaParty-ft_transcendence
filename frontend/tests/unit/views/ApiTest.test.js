/**
 * ApiTest.vue Unit Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

// Mock axios (used directly in ApiTest.vue, not via api service)
vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    request: vi.fn(),
    create: vi.fn(() => ({
      interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
    })),
    // The component uses `axios({ method, url, ... })` as a function
    __esModule: true,
  },
}))

// Reimport after mock is set up — axios is used as a callable default
import axios from 'axios'
// Make axios callable as a function (for the `request` helper)
const axiosFn = vi.fn()
Object.assign(axiosFn, axios)
vi.mocked(axios).get = vi.fn()
vi.mocked(axios).post = vi.fn()

import ApiTest from '../../../src/views/ApiTest.vue'

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()

  // Default: health check succeeds
  vi.mocked(axios).get.mockResolvedValue({ data: { status: 'ok' } })
})

describe('ApiTest.vue', () => {
  it('renders the page container', () => {
    const wrapper = mount(ApiTest)
    expect(wrapper.find('.api-test').exists()).toBe(true)
  })

  it('renders the page title', () => {
    const wrapper = mount(ApiTest)
    expect(wrapper.find('h1').text()).toContain('API Endpoint Tester')
  })

  it('shows DEVELOPMENT badge in dev mode', () => {
    const wrapper = mount(ApiTest)
    const badge = wrapper.find('.env-badge')
    expect(badge.exists()).toBe(true)
    // In test env, import.meta.env.PROD is false
    expect(badge.text()).toBe('DEVELOPMENT')
  })

  it('renders the Quick Auth section', () => {
    const wrapper = mount(ApiTest)
    expect(wrapper.find('.auth-box').exists()).toBe(true)
    expect(wrapper.find('.auth-box h3').text()).toContain('Quick Auth')
  })

  it('renders auth form inputs', () => {
    const wrapper = mount(ApiTest)
    const authBox = wrapper.find('.auth-box')
    const inputs = authBox.findAll('input')
    // Username, email, password
    expect(inputs.length).toBeGreaterThanOrEqual(3)
  })

  it('renders Register, Login, and Logout buttons', () => {
    const wrapper = mount(ApiTest)
    const buttons = wrapper.findAll('.btn-auth')
    const labels = buttons.map(b => b.text())
    expect(labels).toContain('Register')
    expect(labels).toContain('Login')
    expect(labels).toContain('Logout')
  })

  it('shows token as (none) when not authenticated', () => {
    const wrapper = mount(ApiTest)
    expect(wrapper.find('.token-row').text()).toContain('(none)')
  })

  it('renders the Default IDs section', () => {
    const wrapper = mount(ApiTest)
    // Section header text should contain "Default IDs"
    const headers = wrapper.findAll('.section-header h3')
    const idsHeader = headers.find(h => h.text().includes('Default IDs'))
    expect(idsHeader).toBeDefined()
  })

  it('renders search input', () => {
    const wrapper = mount(ApiTest)
    const searchInput = wrapper.find('.search-input')
    expect(searchInput.exists()).toBe(true)
    expect(searchInput.attributes('placeholder')).toContain('Filter')
  })

  it('renders all endpoint sections', () => {
    const wrapper = mount(ApiTest)
    const sectionHeaders = wrapper.findAll('.section-header h2')
    const titles = sectionHeaders.map(h => h.text())

    expect(titles).toEqual(expect.arrayContaining([
      expect.stringContaining('Health'),
      expect.stringContaining('Auth'),
      expect.stringContaining('Users'),
      expect.stringContaining('Friends'),
      expect.stringContaining('Chat'),
      expect.stringContaining('Posts'),
      expect.stringContaining('Game'),
      expect.stringContaining('Organizations'),
      expect.stringContaining('Notifications'),
      expect.stringContaining('Uploads'),
      expect.stringContaining('Public'),
      expect.stringContaining('Admin'),
    ]))
  })

  it('filters endpoints by search query', async () => {
    const wrapper = mount(ApiTest)
    const searchInput = wrapper.find('.search-input')
    await searchInput.setValue('health')

    const visibleSections = wrapper.findAll('.section')
    // Only Health section should be visible after filtering
    const visibleTitles = visibleSections.map(s => s.find('h2').text())
    expect(visibleTitles.length).toBe(1)
    expect(visibleTitles[0]).toContain('Health')
  })

  it('shows clear button when search has text', async () => {
    const wrapper = mount(ApiTest)
    const searchInput = wrapper.find('.search-input')

    // No clear button initially
    expect(wrapper.findAll('.search-row .icon-btn').length).toBe(0)

    await searchInput.setValue('test')
    const clearBtn = wrapper.find('.search-row .icon-btn')
    expect(clearBtn.exists()).toBe(true)
    expect(clearBtn.text()).toBe('✕')
  })

  it('clears search when clear button is clicked', async () => {
    const wrapper = mount(ApiTest)
    const searchInput = wrapper.find('.search-input')
    await searchInput.setValue('health')

    const clearBtn = wrapper.find('.search-row .icon-btn')
    await clearBtn.trigger('click')

    expect(searchInput.element.value).toBe('')
    // All sections should be visible again
    const sections = wrapper.findAll('.section')
    expect(sections.length).toBe(12) // 12 endpoint sections
  })

  it('renders method badges on endpoint buttons', () => {
    const wrapper = mount(ApiTest)
    const badges = wrapper.findAll('.method-badge')
    expect(badges.length).toBeGreaterThan(0)

    // Check that GET, POST, PUT, DELETE methods are all present
    const methods = badges.map(b => b.text())
    expect(methods).toContain('GET')
    expect(methods).toContain('POST')
    expect(methods).toContain('PUT')
    expect(methods).toContain('DELETE')
  })

  it('renders edit icon on endpoints that need modal', () => {
    const wrapper = mount(ApiTest)
    const editIcons = wrapper.findAll('.edit-icon')
    // Several endpoints have params or bodies
    expect(editIcons.length).toBeGreaterThan(0)
  })

  it('renders the log section', () => {
    const wrapper = mount(ApiTest)
    expect(wrapper.find('.log-section').exists()).toBe(true)
    expect(wrapper.find('.log-header h2').text()).toContain('Response Log')
  })

  it('shows empty log message initially', () => {
    const wrapper = mount(ApiTest)
    expect(wrapper.find('.log-empty').exists()).toBe(true)
    expect(wrapper.find('.log-empty').text()).toContain('No requests yet')
  })

  it('disables Logout button when no token', () => {
    const wrapper = mount(ApiTest)
    const logoutBtn = wrapper.findAll('.btn-auth').find(b => b.text() === 'Logout')
    expect(logoutBtn.attributes('disabled')).toBeDefined()
  })

  it('pings health on mount', () => {
    mount(ApiTest)
    expect(axios.get).toHaveBeenCalledWith('/api/health', expect.objectContaining({ timeout: 5000 }))
  })

  it('shows health dot with ok class on successful health check', async () => {
    vi.mocked(axios).get.mockResolvedValue({ data: { status: 'ok' } })
    const wrapper = mount(ApiTest)
    await flushPromises()

    const healthDot = wrapper.find('.health-dot')
    expect(healthDot.classes()).toContain('ok')
  })

  it('shows health dot with err class on failed health check', async () => {
    vi.mocked(axios).get.mockRejectedValue(new Error('fail'))
    const wrapper = mount(ApiTest)
    await flushPromises()

    const healthDot = wrapper.find('.health-dot')
    expect(healthDot.classes()).toContain('err')
  })

  it('restores token from localStorage', () => {
    localStorage.setItem('accessToken', 'stored-token')
    const wrapper = mount(ApiTest)
    expect(wrapper.find('.token-row').text()).toContain('stored-token')
  })

  it('collapses and expands sections on header click', async () => {
    const wrapper = mount(ApiTest)
    const healthHeader = wrapper.findAll('.section-header').find(h => h.find('h2').text().includes('Health'))

    // Initially visible
    const section = healthHeader.element.closest('.section')
    const grid = section.querySelector('.btn-grid')
    expect(grid).not.toBeNull()

    // Click to collapse
    await healthHeader.trigger('click')
    // Click again to expand
    await healthHeader.trigger('click')
    // Still exists in DOM (v-show, not v-if)
    expect(section.querySelector('.btn-grid')).not.toBeNull()
  })

  it('renders danger-styled endpoint buttons', () => {
    const wrapper = mount(ApiTest)
    const dangerBtns = wrapper.findAll('.ep-danger')
    // Multiple danger endpoints: delete-request, remove friend, delete room, etc.
    expect(dangerBtns.length).toBeGreaterThan(0)
  })
})
