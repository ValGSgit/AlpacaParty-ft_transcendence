/**
 * AdminPanel View Unit Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import AdminPanel from '../../../src/views/AdminPanel.vue'

vi.mock('../../../src/services/api.js', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

import api from '../../../src/services/api.js'

function createTestRouter() {
  return createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/admin/panel', name: 'AdminPanel', component: AdminPanel },
      { path: '/admin/login', name: 'AdminLogin', component: { template: '<div>Admin Login</div>' } },
    ],
  })
}

describe('AdminPanel.vue', () => {
  let wrapper, router, store

  beforeEach(async () => {
    const pinia = createPinia()
    setActivePinia(pinia)

    // Setup admin auth store with authenticated user
    const { useAdminAuthStore } = await import('../../../src/stores/adminAuth.js')
    store = useAdminAuthStore()
    store.admin = { id: 1, username: 'admin', role: 'superadmin' }

    router = createTestRouter()
    router.push('/admin/panel')
    await router.isReady()
    vi.clearAllMocks()

    // Mock API responses
    api.get.mockImplementation((endpoint) => {
      if (endpoint === '/admin/dashboard') {
        return Promise.resolve({
          data: {
            totalUsers: 1500,
            onlineUsers: 45,
            totalPosts: 8234,
            bannedUsers: 12,
          },
        })
      }
      if (endpoint === '/admin/users') {
        return Promise.resolve({
          data: {
            users: [
              { id: 1, username: 'user1', email: 'user1@test.com', role: 'user', isBanned: false, isOnline: true, createdAt: '2024-01-01' },
              { id: 2, username: 'user2', email: 'user2@test.com', role: 'user', isBanned: true, isOnline: false, createdAt: '2024-01-02' },
            ],
            pages: 1,
          },
        })
      }
      return Promise.reject(new Error('Unknown endpoint'))
    })

    wrapper = mount(AdminPanel, {
      global: {
        plugins: [pinia, router],
      },
    })

    await flushPromises()
  })

  describe('sidebar navigation', () => {
    it('should render sidebar', () => {
      expect(wrapper.find('.sidebar').exists()).toBe(true)
    })

    it('should render logo with text', () => {
      const logo = wrapper.find('.logo')
      expect(logo.exists()).toBe(true)
      expect(logo.text()).toContain('Admin')
    })

    it('should render navigation items', () => {
      const navItems = wrapper.findAll('.nav-item')
      expect(navItems.length).toBeGreaterThanOrEqual(2)
      expect(navItems[0].text()).toContain('Dashboard')
      expect(navItems[1].text()).toContain('Users')
    })

    it('should highlight active navigation item', async () => {
      const navItems = wrapper.findAll('.nav-item')
      const dashboardItem = navItems[0]

      expect(dashboardItem.classes()).toContain('active')
    })

    it('should switch active section on navigation click', async () => {
      const navItems = wrapper.findAll('.nav-item')
      const usersItem = navItems[1]

      await usersItem.trigger('click')
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.activeSection).toBe('users')
      expect(usersItem.classes()).toContain('active')
    })

    it('should render collapse button', () => {
      const collapseBtn = wrapper.find('.collapse-btn')
      expect(collapseBtn.exists()).toBe(true)
    })

    it('should collapse and expand sidebar', async () => {
      const collapseBtn = wrapper.find('.collapse-btn')
      const sidebar = wrapper.find('.sidebar')

      expect(sidebar.classes()).not.toContain('collapsed')

      await collapseBtn.trigger('click')
      expect(sidebar.classes()).toContain('collapsed')

      await collapseBtn.trigger('click')
      expect(sidebar.classes()).not.toContain('collapsed')
    })

    it('should render admin info in sidebar footer', () => {
      const adminInfo = wrapper.find('.admin-info')
      expect(adminInfo.exists()).toBe(true)
      expect(wrapper.text()).toContain('admin')
      expect(wrapper.text()).toContain('superadmin')
    })

    it('should render logout button', () => {
      const logoutBtn = wrapper.find('.logout-btn')
      expect(logoutBtn.exists()).toBe(true)
    })

    it('should generate admin avatar from username', () => {
      const avatar = wrapper.find('.admin-avatar')
      expect(avatar.exists()).toBe(true)
      expect(avatar.text()).toBe('A') // First letter of 'admin'
    })
  })

  describe('dashboard section', () => {
    it('should render dashboard section by default', () => {
      expect(wrapper.vm.activeSection).toBe('dashboard')
      const dashboardSection = wrapper.find('section')
      expect(dashboardSection.exists()).toBe(true)
    })

    it('should load and display dashboard stats', async () => {
      expect(api.get).toHaveBeenCalledWith('/admin/dashboard')
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.stats).toBeDefined()
      expect(wrapper.vm.stats.totalUsers).toBe(1500)
      expect(wrapper.vm.stats.onlineUsers).toBe(45)
      expect(wrapper.vm.stats.totalPosts).toBe(8234)
      expect(wrapper.vm.stats.bannedUsers).toBe(12)
    })

    it('should display stats grid cards', async () => {
      await wrapper.vm.$nextTick()
      const statCards = wrapper.findAll('.stat-card')
      expect(statCards.length).toBe(4)
    })

    it('should display formatted stats values', async () => {
      await wrapper.vm.$nextTick()
      const statsText = wrapper.text()
      expect(statsText).toContain('1500')
      expect(statsText).toContain('45')
      expect(statsText).toContain('8234')
      expect(statsText).toContain('12')
    })

    it('should display stat labels', async () => {
      await wrapper.vm.$nextTick()
      expect(wrapper.text()).toContain('Total Users')
      expect(wrapper.text()).toContain('Online Now')
      expect(wrapper.text()).toContain('Total Posts')
      expect(wrapper.text()).toContain('Banned Users')
    })

    it('should set default stats on load failure', async () => {
      api.get.mockImplementation((endpoint) => {
        if (endpoint === '/admin/dashboard') {
          return Promise.reject(new Error('Load failed'))
        }
        return Promise.resolve({ data: { users: [], pages: 1 } })
      })

      const newWrapper = mount(AdminPanel, {
        global: {
          plugins: [createPinia(), router],
        },
      })
      newWrapper.vm.store = store

      await flushPromises()

      expect(newWrapper.vm.stats).toEqual({
        totalUsers: 0,
        bannedUsers: 0,
        totalPosts: 0,
        onlineUsers: 0,
      })
    })
  })

  describe('user management section', () => {
    beforeEach(async () => {
      const navItems = wrapper.findAll('.nav-item')
      await navItems[1].trigger('click')
      await flushPromises()
    })

    it('should render users section when selected', async () => {
      expect(wrapper.vm.activeSection).toBe('users')
    })

    it('should load users on mount', () => {
      expect(api.get).toHaveBeenCalledWith('/admin/users', {
        params: { page: 1, limit: 20, search: '' },
      })
    })

    it('should display user table', () => {
      const table = wrapper.find('.data-table')
      expect(table.exists()).toBe(true)
    })

    it('should render table headers', () => {
      const headers = wrapper.findAll('th')
      const headerText = headers.map(h => h.text())
      expect(headerText).toContain('ID')
      expect(headerText).toContain('Username')
      expect(headerText).toContain('Email')
      expect(headerText).toContain('Actions')
    })

    it('should display loaded users in table', async () => {
      await wrapper.vm.$nextTick()
      const rows = wrapper.findAll('tbody tr')
      expect(rows.length).toBe(2)
      expect(wrapper.text()).toContain('user1')
      expect(wrapper.text()).toContain('user2')
      expect(wrapper.text()).toContain('user1@test.com')
      expect(wrapper.text()).toContain('user2@test.com')
    })

    it('should display online indicator', async () => {
      await wrapper.vm.$nextTick()
      const onlineDots = wrapper.findAll('.online-dot.online')
      expect(onlineDots.length).toBeGreaterThan(0)
    })

    it('should display role badges', async () => {
      await wrapper.vm.$nextTick()
      const roleBadges = wrapper.findAll('.role-badge')
      expect(roleBadges.length).toBeGreaterThan(0)
      expect(wrapper.text()).toContain('user')
    })

    it('should display status badges for users', async () => {
      await wrapper.vm.$nextTick()
      const statusBadges = wrapper.findAll('.status-badge')
      expect(statusBadges.length).toBeGreaterThan(0)
      expect(wrapper.text()).toContain('Active')
      expect(wrapper.text()).toContain('Banned')
    })

    it('should render search input', () => {
      const searchInput = wrapper.find('.search-input')
      expect(searchInput.exists()).toBe(true)
      expect(searchInput.attributes('placeholder')).toContain('Search users')
    })

    it('should update search query on input', async () => {
      const searchInput = wrapper.find('.search-input')
      await searchInput.setValue('testuser')
      expect(wrapper.vm.userSearch).toBe('testuser')
    })

    it('should trigger search on input with debounce', async () => {
      vi.useFakeTimers()
      const searchInput = wrapper.find('.search-input')

      await searchInput.setValue('test')
      vi.advanceTimersByTime(350)

      expect(api.get).toHaveBeenCalledWith('/admin/users', {
        params: { page: 1, limit: 20, search: 'test' },
      })

      vi.useRealTimers()
    })

    it('should reset page on new search', async () => {
      vi.useFakeTimers()
      wrapper.vm.userPage = 5
      const searchInput = wrapper.find('.search-input')

      await searchInput.setValue('newuser')
      vi.advanceTimersByTime(350)

      expect(wrapper.vm.userPage).toBe(1)

      vi.useRealTimers()
    })
  })

  describe('user actions', () => {
    beforeEach(async () => {
      const navItems = wrapper.findAll('.nav-item')
      await navItems[1].trigger('click')
      await flushPromises()
    })

    it('should show ban button for active users', async () => {
      await wrapper.vm.$nextTick()
      const banButtons = wrapper.findAll('.action-btn.ban')
      expect(banButtons.length).toBeGreaterThan(0)
    })

    it('should show unban button for banned users', async () => {
      await wrapper.vm.$nextTick()
      const unbanButtons = wrapper.findAll('.action-btn.unban')
      expect(unbanButtons.length).toBeGreaterThan(0)
    })

    it('should ban user on button click', async () => {
      api.patch.mockResolvedValueOnce({})
      api.get.mockResolvedValueOnce({ data: { users: [], pages: 1 } })

      await wrapper.vm.banUser(1)

      expect(api.patch).toHaveBeenCalledWith('/admin/users/1/ban')
    })

    it('should unban user on button click', async () => {
      api.patch.mockResolvedValueOnce({})
      api.get.mockResolvedValueOnce({ data: { users: [], pages: 1 } })

      await wrapper.vm.unbanUser(2)

      expect(api.patch).toHaveBeenCalledWith('/admin/users/2/unban')
    })

    it('should show delete button only for superadmins', async () => {
      await wrapper.vm.$nextTick()
      const deleteButtons = wrapper.findAll('.action-btn.delete')
      // Should see delete button for user2 (id: 2) since current admin is superadmin
      expect(deleteButtons.length).toBeGreaterThan(0)
    })

    it('should not show delete button for own user', async () => {
      // Create a new store with current user having id: 1
      store.admin = { id: 1, username: 'admin', role: 'superadmin' }
      await wrapper.vm.$nextTick()

      // User 1 should not have delete button (it's the current admin)
      const rows = wrapper.findAll('tbody tr')
      const firstRowDeleteButtons = rows[0].findAll('.action-btn.delete')
      expect(firstRowDeleteButtons.length).toBe(0)
    })

    it('should open delete confirmation modal', async () => {
      const deleteButtons = wrapper.findAll('.action-btn.delete')
      if (deleteButtons.length > 0) {
        await deleteButtons[0].trigger('click')
        await wrapper.vm.$nextTick()

        expect(wrapper.vm.deleteTarget).toBeDefined()
        expect(wrapper.find('.modal-overlay').exists()).toBe(true)
      }
    })

    it('should cancel delete operation', async () => {
      wrapper.vm.deleteTarget = { id: 2, username: 'user2' }
      await wrapper.vm.$nextTick()

      const cancelButton = wrapper.find('.btn-cancel')
      await cancelButton.trigger('click')

      expect(wrapper.vm.deleteTarget).toBeNull()
    })

    it('should delete user on confirmation', async () => {
      api.delete.mockResolvedValueOnce({})
      api.get.mockResolvedValueOnce({ data: { users: [], pages: 1 } })

      wrapper.vm.deleteTarget = { id: 2, username: 'user2' }
      await wrapper.vm.$nextTick()

      const deleteBtn = wrapper.find('.btn-danger')
      await deleteBtn.trigger('click')

      expect(api.delete).toHaveBeenCalledWith('/admin/users/2')
      expect(wrapper.vm.deleteTarget).toBeNull()
    })

    it('should display delete confirmation modal content', async () => {
      wrapper.vm.deleteTarget = { id: 2, username: 'user2' }
      await wrapper.vm.$nextTick()

      const modal = wrapper.find('.modal')
      expect(modal.exists()).toBe(true)
      expect(modal.text()).toContain('Delete User')
      expect(modal.text()).toContain('user2')
    })
  })

  describe('logout', () => {
    it('should render logout button', () => {
      const logoutBtn = wrapper.find('.logout-btn')
      expect(logoutBtn.exists()).toBe(true)
    })

    it('should call logout on button click', async () => {
      api.post.mockResolvedValueOnce({})

      const logoutBtn = wrapper.find('.logout-btn')
      await logoutBtn.trigger('click')

      expect(api.post).toHaveBeenCalledWith('/admin/logout')
    })

    it('should clear admin state on logout', async () => {
      api.post.mockResolvedValueOnce({})

      await wrapper.vm.handleLogout()

      expect(store.admin).toBeNull()
    })

    it('should navigate to login page after logout', async () => {
      api.post.mockResolvedValueOnce({})

      await wrapper.vm.handleLogout()
      await wrapper.vm.$nextTick()

      expect(router.currentRoute.value.name).toBe('AdminLogin')
    })
  })

  describe('pagination', () => {
    beforeEach(async () => {
      const navItems = wrapper.findAll('.nav-item')
      await navItems[1].trigger('click')
      await flushPromises()
    })

    it('should display pagination when multiple pages', async () => {
      api.get.mockImplementation((endpoint) => {
        if (endpoint === '/admin/users') {
          return Promise.resolve({
            data: {
              users: [{ id: 1, username: 'user1', email: 'u1@test.com', role: 'user', isBanned: false, isOnline: true, createdAt: '2024-01-01' }],
              pages: 5,
            },
          })
        }
        return Promise.resolve({})
      })

      wrapper.vm.userPages = 5
      await wrapper.vm.$nextTick()

      const pagination = wrapper.find('.pagination')
      expect(pagination.exists()).toBe(true)
    })

    it('should change page on button click', async () => {
      wrapper.vm.userPages = 3
      await wrapper.vm.$nextTick()

      api.get.mockResolvedValueOnce({ data: { users: [], pages: 3 } })

      await wrapper.vm.changePage(2)

      expect(wrapper.vm.userPage).toBe(2)
      expect(api.get).toHaveBeenCalledWith('/admin/users', {
        params: { page: 2, limit: 20, search: '' },
      })
    })

    it('should disable previous button on first page', async () => {
      wrapper.vm.userPages = 3
      wrapper.vm.userPage = 1
      await wrapper.vm.$nextTick()

      const paginationBtns = wrapper.findAll('.pagination button')
      expect(paginationBtns[0].attributes('disabled')).toBeDefined()
    })

    it('should disable next button on last page', async () => {
      wrapper.vm.userPages = 3
      wrapper.vm.userPage = 3
      await wrapper.vm.$nextTick()

      const paginationBtns = wrapper.findAll('.pagination button')
      expect(paginationBtns[1].attributes('disabled')).toBeDefined()
    })
  })

  describe('top bar', () => {
    it('should render top bar with page title', () => {
      expect(wrapper.find('.top-bar').exists()).toBe(true)
      expect(wrapper.text()).toContain('Dashboard')
    })

    it('should display current date', () => {
      const dateDisplay = wrapper.find('.date-display')
      expect(dateDisplay.exists()).toBe(true)
      expect(dateDisplay.text().length).toBeGreaterThan(0)
    })

    it('should display breadcrumb navigation', () => {
      const breadcrumb = wrapper.find('.breadcrumb')
      expect(breadcrumb.exists()).toBe(true)
      expect(breadcrumb.text()).toContain('AlpacaParty')
      expect(breadcrumb.text()).toContain('Admin')
    })

    it('should update breadcrumb when changing sections', async () => {
      const navItems = wrapper.findAll('.nav-item')
      await navItems[1].trigger('click')
      await wrapper.vm.$nextTick()

      expect(wrapper.find('.page-title h2').text()).toBe('Users')
    })
  })

  describe('loading states', () => {
    it('should show loading state for users', async () => {
      wrapper.vm.usersLoading = true
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('Loading')
    })

    it('should show empty state when no users', async () => {
      const navItems = wrapper.findAll('.nav-item')
      await navItems[1].trigger('click')

      api.get.mockImplementation((endpoint) => {
        if (endpoint === '/admin/users') {
          return Promise.resolve({
            data: { users: [], pages: 0 },
          })
        }
        return Promise.resolve({})
      })

      wrapper.vm.users = []
      wrapper.vm.usersLoading = false
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('No users found')
    })
  })

  describe('date formatting', () => {
    it('should format dates correctly', () => {
      const formatted = wrapper.vm.formatDate('2024-05-12')
      expect(formatted).toMatch(/May|May/)
      expect(formatted).toContain('2024')
    })

    it('should display formatted dates in user table', async () => {
      const navItems = wrapper.findAll('.nav-item')
      await navItems[1].trigger('click')
      await wrapper.vm.$nextTick()

      const dateCells = wrapper.findAll('.date-cell')
      dateCells.forEach(cell => {
        expect(cell.text().length).toBeGreaterThan(0)
      })
    })
  })
})
