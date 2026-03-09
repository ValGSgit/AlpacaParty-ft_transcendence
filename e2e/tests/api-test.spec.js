/**
 * E2E: API Test Dashboard Tests
 *
 * Tests the /api-test page which is accessible without authentication.
 */
import { test, expect } from '@playwright/test'

test.describe('API Test Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/api-test')
  })

  test('page loads and shows title', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('API Endpoint Tester')
  })

  test('shows DEVELOPMENT or PRODUCTION badge', async ({ page }) => {
    const badge = page.locator('.env-badge')
    await expect(badge).toBeVisible()
    const text = await badge.textContent()
    expect(['DEVELOPMENT', 'PRODUCTION']).toContain(text.trim())
  })

  test('shows health status indicator', async ({ page }) => {
    const healthDot = page.locator('.health-dot')
    await expect(healthDot).toBeVisible()
    // Wait for health check to complete
    await page.waitForTimeout(2000)
    // Should be ok or err (not 'unknown' or 'loading')
    const classes = await healthDot.getAttribute('class')
    expect(classes).toMatch(/ok|err/)
  })

  test('shows Quick Auth section', async ({ page }) => {
    await expect(page.locator('.auth-box h3')).toContainText('Quick Auth')
  })

  test('renders auth form inputs', async ({ page }) => {
    const authBox = page.locator('.auth-box')
    await expect(authBox.locator('input').first()).toBeVisible()
  })

  test('shows Register, Login, and Logout buttons', async ({ page }) => {
    await expect(page.locator('.btn-auth', { hasText: 'Register' })).toBeVisible()
    await expect(page.locator('.btn-auth', { hasText: 'Login' })).toBeVisible()
    await expect(page.locator('.btn-auth', { hasText: 'Logout' })).toBeVisible()
  })

  test('shows Default IDs section', async ({ page }) => {
    await expect(page.locator('text=Default IDs')).toBeVisible()
  })

  test('shows search/filter input', async ({ page }) => {
    const searchInput = page.locator('.search-input')
    await expect(searchInput).toBeVisible()
    await expect(searchInput).toHaveAttribute('placeholder', /filter/i)
  })

  test('renders all endpoint sections', async ({ page }) => {
    const expectedSections = [
      'Health', 'Auth', 'Users', 'Friends', 'Chat', 'Posts',
      'Game', 'Organizations', 'Notifications', 'Uploads', 'Public', 'Admin',
    ]
    for (const section of expectedSections) {
      await expect(page.locator('.section-header h2', { hasText: section }).first()).toBeVisible()
    }
  })

  test('search filters endpoint sections', async ({ page }) => {
    const searchInput = page.locator('.search-input')
    await searchInput.fill('health')
    // Only Health section should remain
    const visibleSections = page.locator('.section')
    await expect(visibleSections).toHaveCount(1)
    await expect(visibleSections.first().locator('h2')).toContainText('Health')
  })

  test('clearing search shows all sections', async ({ page }) => {
    const searchInput = page.locator('.search-input')
    await searchInput.fill('health')
    await searchInput.fill('')
    const sections = page.locator('.section')
    await expect(sections).toHaveCount(12)
  })

  test('Health Check button fires and logs a response', async ({ page }) => {
    // Click the Health Check button
    const healthBtn = page.locator('.ep-btn', { hasText: 'Health Check' })
    await healthBtn.click()

    // Wait for log entry to appear
    const logEntry = page.locator('.log-entry').first()
    await expect(logEntry).toBeVisible({ timeout: 10000 })
    await expect(logEntry.locator('.log-method')).toContainText('GET')
    await expect(logEntry.locator('.log-url')).toContainText('/health')
  })

  test('response log shows correct status', async ({ page }) => {
    const healthBtn = page.locator('.ep-btn', { hasText: 'Health Check' })
    await healthBtn.click()

    await page.waitForTimeout(2000)
    const logEntry = page.locator('.log-entry').first()
    await expect(logEntry.locator('.log-status')).toContainText('200')
  })

  test('response log body can be expanded', async ({ page }) => {
    const healthBtn = page.locator('.ep-btn', { hasText: 'Health Check' })
    await healthBtn.click()

    await page.waitForTimeout(2000)
    const logBody = page.locator('.log-body').first()
    await expect(logBody).toBeVisible()
    await expect(logBody).toContainText('ok')
  })

  test('log counter increments after request', async ({ page }) => {
    await expect(page.locator('.log-count')).toContainText('(0)')
    const healthBtn = page.locator('.ep-btn', { hasText: 'Health Check' })
    await healthBtn.click()
    await page.waitForTimeout(2000)
    await expect(page.locator('.log-count')).not.toContainText('(0)')
  })

  test('clear log button works', async ({ page }) => {
    const healthBtn = page.locator('.ep-btn', { hasText: 'Health Check' })
    await healthBtn.click()
    await page.waitForTimeout(2000)

    const clearBtn = page.locator('.clear-btn')
    await clearBtn.click()
    await expect(page.locator('.log-empty')).toBeVisible()
  })

  test('section can be collapsed and expanded', async ({ page }) => {
    const healthHeader = page.locator('.section-header', { hasText: 'Health' }).first()
    const healthGrid = page.locator('.section', { hasText: 'Health' }).first().locator('.btn-grid')

    // Initially visible
    await expect(healthGrid).toBeVisible()

    // Collapse
    await healthHeader.click()
    await expect(healthGrid).not.toBeVisible()

    // Expand
    await healthHeader.click()
    await expect(healthGrid).toBeVisible()
  })

  test('login via Quick Auth and send authenticated request', async ({ page }) => {
    // Register a new user first
    const uid = `apitest${Date.now()}`
    await page.goto('/register')
    await page.fill('input#username', uid)
    await page.fill('input#email', `${uid}@test.com`)
    await page.fill('input#password', 'ApiTest123')
    await page.fill('input#confirm', 'ApiTest123')
    await page.click('button[type="submit"]')
    await page.waitForURL('/')

    // Go to api-test page
    await page.goto('/api-test')

    // Use Quick Auth to login
    const authBox = page.locator('.auth-box')
    const inputs = authBox.locator('input')
    await inputs.nth(0).fill(uid)
    await inputs.nth(1).fill(`${uid}@test.com`)
    await inputs.nth(2).fill('ApiTest123')
    await page.locator('.btn-auth', { hasText: 'Login' }).click()

    // Wait for token to appear
    await page.waitForTimeout(2000)
    await expect(page.locator('.token-row')).not.toContainText('(none)')

    // Now fire an authenticated endpoint
    const getMe = page.locator('.ep-btn', { hasText: 'Get Me' })
    await getMe.click()
    await page.waitForTimeout(2000)

    // Check that the log shows a successful response
    const logEntries = page.locator('.log-entry.ok')
    await expect(logEntries.first()).toBeVisible()
  })

  test('endpoint with modal opens editor on click', async ({ page }) => {
    // "Get User by ID" has params, so it should open a modal
    const btn = page.locator('.ep-btn', { hasText: 'Get User by ID' })
    await btn.click()

    const modal = page.locator('.modal')
    await expect(modal).toBeVisible()
    await expect(modal.locator('.badge-method')).toContainText('GET')

    // Close modal
    await page.locator('.modal-overlay').click({ position: { x: 10, y: 10 } })
    await expect(modal).not.toBeVisible()
  })

  test('accessible without authentication', async ({ page }) => {
    // Clear tokens
    await page.evaluate(() => {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
    })
    await page.goto('/api-test')
    // Should not redirect to login
    await expect(page).toHaveURL('/api-test')
    await expect(page.locator('h1')).toContainText('API Endpoint Tester')
  })

  test('navbar shows API Test link', async ({ page }) => {
    await page.goto('/')
    const apiTestLink = page.locator('a[href="/api-test"]')
    await expect(apiTestLink).toBeVisible()
    await apiTestLink.click()
    await expect(page).toHaveURL('/api-test')
  })
})
