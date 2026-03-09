/**
 * E2E: Navigation & Route Guard Tests
 */
import { test, expect } from '@playwright/test'

test.describe('Navigation', () => {
  test('home page loads correctly', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1')).toContainText('Welcome to AlpacaParty')
    await expect(page.locator('.nav-logo')).toBeVisible()
  })

  test('navbar always shows Home link', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('a.nav-link[href="/"]')).toBeVisible()
  })

  test('unauthenticated user sees login/register in navbar', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('a[href="/login"]')).toBeVisible()
    await expect(page.locator('a[href="/register"]')).toBeVisible()
    await expect(page.locator('a[href="/profile"]')).not.toBeVisible()
  })

  test('clicking logo navigates to home', async ({ page }) => {
    await page.goto('/login')
    await page.locator('.nav-logo').click()
    await expect(page).toHaveURL('/')
  })

  test('clicking login link navigates to login page', async ({ page }) => {
    await page.goto('/')
    await page.locator('a[href="/login"]').click()
    await expect(page).toHaveURL('/login')
    await expect(page.locator('h2')).toHaveText('Login')
  })

  test('clicking register link navigates to register page', async ({ page }) => {
    await page.goto('/')
    await page.locator('a[href="/register"]').click()
    await expect(page).toHaveURL('/register')
    await expect(page.locator('h2')).toHaveText('Create Account')
  })
})

test.describe('Route Guards', () => {
  test('redirects unauthenticated users from /profile to /login', async ({ page }) => {
    // Clear any stored tokens
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
    })

    await page.goto('/profile')
    await expect(page).toHaveURL(/\/login/)
  })

  test('redirects authenticated users from /login to home', async ({ page }) => {
    // Register and login first
    const uid = `navtest${Date.now()}`
    await page.goto('/register')
    await page.fill('input#username', uid)
    await page.fill('input#email', `${uid}@test.com`)
    await page.fill('input#password', 'NavTest123')
    await page.fill('input#confirm', 'NavTest123')
    await page.click('button[type="submit"]')
    await page.waitForURL('/')

    // Now try to visit login page
    await page.goto('/login')
    await expect(page).toHaveURL('/')
  })

  test('redirects authenticated users from /register to home', async ({ page }) => {
    const uid = `navtest2${Date.now()}`
    await page.goto('/register')
    await page.fill('input#username', uid)
    await page.fill('input#email', `${uid}@test.com`)
    await page.fill('input#password', 'NavTest123')
    await page.fill('input#confirm', 'NavTest123')
    await page.click('button[type="submit"]')
    await page.waitForURL('/')

    await page.goto('/register')
    await expect(page).toHaveURL('/')
  })
})

test.describe('API Health', () => {
  test('/api/health returns ok', async ({ request }) => {
    const response = await request.get('/api/health')
    expect(response.ok()).toBe(true)

    const body = await response.json()
    expect(body.status).toBe('ok')
    expect(body.message).toMatch(/running/i)
    expect(body.version).toBe('0.1.0')
  })
})
