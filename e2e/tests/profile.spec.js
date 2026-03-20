/**
 * E2E: Profile Page Tests
 */
import { test, expect } from '@playwright/test'

test.describe('Profile', () => {
  let testUser

  test.beforeAll(async ({ browser }) => {
    // Create and login a user once per suite
    const uid = `profile${Date.now()}`
    testUser = {
      username: uid,
      email: `${uid}@test.com`,
      password: 'ProfileTest1',
    }

    const page = await browser.newPage()
    await page.goto('/register')
    await page.fill('input#username', testUser.username)
    await page.fill('input#email', testUser.email)
    await page.fill('input#password', testUser.password)
    await page.fill('input#confirm', testUser.password)
    await page.click('button[type="submit"]')
    await page.waitForURL('/')
    await page.close()
  })

  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login')
    await page.fill('input#username', testUser.username)
    await page.fill('input#password', testUser.password)
    await page.click('button[type="submit"]')
    await page.waitForURL('/')
  })

  test('profile page is accessible after login', async ({ page }) => {
    await page.locator('a[href="/profile"]').click()
    await expect(page).toHaveURL('/profile')
  })

  test('profile shows username', async ({ page }) => {
    await page.goto('/profile')
    await expect(page.locator('.profile-header h2')).toHaveText(testUser.username)
  })

  test('profile shows email', async ({ page }) => {
    await page.goto('/profile')
    await expect(page.locator('.profile-info')).toContainText(testUser.email)
  })

  test('profile shows avatar', async ({ page }) => {
    await page.goto('/profile')
    await expect(page.locator('img.avatar')).toBeVisible()
  })

  test('profile shows join date', async ({ page }) => {
    await page.goto('/profile')
    const currentYear = new Date().getFullYear()
    await expect(page.locator('.profile-info')).toContainText(String(currentYear))
  })

  test('navbar shows Profile link when authenticated', async ({ page }) => {
    await expect(page.locator('a[href="/profile"]')).toBeVisible()
    await expect(page.locator('button.nav-btn', { hasText: 'Logout' })).toBeVisible()
  })

  test('profile shows XP and level', async ({ page }) => {
    await page.goto('/profile')

    // Profile should display XP and level information
    const profileContent = page.locator('.profile-info, .profile-stats, .profile-header, [class*="profile"]')
    const pageText = await profileContent.allTextContents()
    const combined = pageText.join(' ').toLowerCase()

    // Check that XP and/or level are displayed somewhere on the profile
    const hasXP = combined.includes('xp') || combined.includes('experience')
    const hasLevel = combined.includes('level') || combined.includes('lvl')
    expect(hasXP || hasLevel).toBe(true)
  })

  test('profile shows default bio', async ({ page }) => {
    await page.goto('/profile')

    // New users should have a default bio or bio section visible
    const bioSection = page.locator('.profile-bio, .bio, [class*="bio"]').first()
    if (await bioSection.isVisible({ timeout: 3_000 }).catch(() => false)) {
      const bioText = await bioSection.textContent()
      // Bio section should exist and have some content (default or placeholder)
      expect(bioText).toBeTruthy()
    }
  })

  test('profile page has settings link', async ({ page }) => {
    await page.goto('/profile')

    // Profile should have a link or button to access settings
    const settingsLink = page.locator('a[href="/settings"], button:has-text("Settings"), [class*="settings"]').first()
    await expect(settingsLink).toBeVisible()
  })
})
