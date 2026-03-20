/**
 * E2E: Authentication Flow Tests
 *
 * Tests registration, login and logout via the browser against the running app.
 * Run with: docker compose up -d && cd e2e && npm test
 */
import { test, expect } from '@playwright/test'

// Generate unique user per test run to avoid DB conflicts
const ts = Date.now()
const TEST_USER = {
  username: `e2euser${ts}`,
  email: `e2e${ts}@test.com`,
  password: 'E2eTest123',
}

// ────────────────────────────────────────────────────────────────
// Registration
// ────────────────────────────────────────────────────────────────
test.describe('Registration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register')
  })

  test('shows registration form', async ({ page }) => {
    await expect(page.locator('h2')).toHaveText('Create Account')
    await expect(page.locator('input#username')).toBeVisible()
    await expect(page.locator('input#email')).toBeVisible()
    await expect(page.locator('input#password')).toBeVisible()
    await expect(page.locator('input#confirm')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('shows error when passwords do not match', async ({ page }) => {
    await page.fill('input#username', 'testuser')
    await page.fill('input#email', 'match@test.com')
    await page.fill('input#password', 'Password1')
    await page.fill('input#confirm', 'Different1')
    await page.click('button[type="submit"]')

    await expect(page.locator('.error-message')).toContainText('Passwords do not match')
  })

  test('registers a new user and redirects to home', async ({ page }) => {
    await page.fill('input#username', TEST_USER.username)
    await page.fill('input#email', TEST_USER.email)
    await page.fill('input#password', TEST_USER.password)
    await page.fill('input#confirm', TEST_USER.password)
    await page.click('button[type="submit"]')

    // After successful registration, should redirect to home
    await expect(page).toHaveURL('/')
    // Navbar should show Profile/Logout (authenticated)
    await expect(page.locator('a[href="/profile"]')).toBeVisible()
  })

  test('shows error for duplicate username', async ({ page }) => {
    // Register first
    await page.fill('input#username', TEST_USER.username)
    await page.fill('input#email', `other${ts}@test.com`)
    await page.fill('input#password', TEST_USER.password)
    await page.fill('input#confirm', TEST_USER.password)
    await page.click('button[type="submit"]')

    // Logout and try to register the same username again
    await page.goto('/register')
    await page.fill('input#username', TEST_USER.username)
    await page.fill('input#email', `another${ts}@test.com`)
    await page.fill('input#password', TEST_USER.password)
    await page.fill('input#confirm', TEST_USER.password)
    await page.click('button[type="submit"]')

    await expect(page.locator('.error-message')).toContainText('Username already taken')
  })

  test('shows navigation link to login page', async ({ page }) => {
    const loginLink = page.locator('a[href="/login"]').last()
    await expect(loginLink).toBeVisible()
    await loginLink.click()
    await expect(page).toHaveURL('/login')
  })

  test('shows error for special characters in username', async ({ page }) => {
    const uid = `bad<user>${Date.now()}`
    await page.fill('input#username', uid)
    await page.fill('input#email', `special${Date.now()}@test.com`)
    await page.fill('input#password', 'SpecialChar1')
    await page.fill('input#confirm', 'SpecialChar1')
    await page.click('button[type="submit"]')

    // Should show an error — special characters are not allowed in usernames
    await expect(page.locator('.error-message')).toBeVisible()
  })

  test('password visibility toggle works if present', async ({ page }) => {
    const toggleBtn = page.locator('button.toggle-password, .password-toggle, [aria-label*="password" i]').first()
    const passwordInput = page.locator('input#password')

    // Fill in a password first so the toggle is meaningful
    await passwordInput.fill('TestPassword1')

    if (await toggleBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      // Password field should start as type="password"
      await expect(passwordInput).toHaveAttribute('type', 'password')

      await toggleBtn.click()

      // After toggle, should be type="text"
      await expect(passwordInput).toHaveAttribute('type', 'text')

      await toggleBtn.click()

      // After toggling back, should be type="password" again
      await expect(passwordInput).toHaveAttribute('type', 'password')
    }
  })
})

// ────────────────────────────────────────────────────────────────
// Login
// ────────────────────────────────────────────────────────────────
test.describe('Login', () => {
  let registeredUser

  test.beforeAll(async ({ browser }) => {
    // Register a user once for all login tests
    const page = await browser.newPage()
    await page.goto('/register')
    const uid = `logintest${Date.now()}`
    registeredUser = { username: uid, email: `${uid}@test.com`, password: 'LoginTest1' }

    await page.fill('input#username', registeredUser.username)
    await page.fill('input#email', registeredUser.email)
    await page.fill('input#password', registeredUser.password)
    await page.fill('input#confirm', registeredUser.password)
    await page.click('button[type="submit"]')
    await page.waitForURL('/')
    await page.close()
  })

  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
  })

  test('shows login form', async ({ page }) => {
    await expect(page.locator('h2')).toHaveText('Login')
    await expect(page.locator('input#username')).toBeVisible()
    await expect(page.locator('input#password')).toBeVisible()
  })

  test('shows error for invalid credentials', async ({ page }) => {
    await page.fill('input#username', 'nonexistent')
    await page.fill('input#password', 'WrongPass1')
    await page.click('button[type="submit"]')

    await expect(page.locator('.error-message')).toContainText('Invalid credentials')
  });

  test('logs in successfully and redirects to home', async ({ page }) => {
    await page.fill('input#username', registeredUser.username)
    await page.fill('input#password', registeredUser.password)
    await page.click('button[type="submit"]')

    await expect(page).toHaveURL('/')
    await expect(page.locator('a[href="/profile"]')).toBeVisible()
  })

  test('logs in with email', async ({ page }) => {
    await page.fill('input#username', registeredUser.email)
    await page.fill('input#password', registeredUser.password)
    await page.click('button[type="submit"]')

    await expect(page).toHaveURL('/')
    await expect(page.locator('a[href="/profile"]')).toBeVisible()
  })

  test('shows navigation link to register page', async ({ page }) => {
    const registerLink = page.locator('a[href="/register"]').last()
    await expect(registerLink).toBeVisible()
    await registerLink.click()
    await expect(page).toHaveURL('/register')
  })

  test('login persists after page reload', async ({ page }) => {
    await page.fill('input#username', registeredUser.username)
    await page.fill('input#password', registeredUser.password)
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/')

    // Reload the page and verify the user is still authenticated
    await page.reload()
    await page.waitForLoadState('networkidle')

    await expect(page.locator('a[href="/profile"]')).toBeVisible()
  })

  test('multiple failed login attempts show errors each time', async ({ page }) => {
    // First failed attempt
    await page.fill('input#username', 'wronguser1')
    await page.fill('input#password', 'WrongPass1')
    await page.click('button[type="submit"]')
    await expect(page.locator('.error-message')).toContainText('Invalid credentials')

    // Second failed attempt
    await page.fill('input#username', 'wronguser2')
    await page.fill('input#password', 'WrongPass2')
    await page.click('button[type="submit"]')
    await expect(page.locator('.error-message')).toContainText('Invalid credentials')

    // Third failed attempt
    await page.fill('input#username', 'wronguser3')
    await page.fill('input#password', 'WrongPass3')
    await page.click('button[type="submit"]')
    await expect(page.locator('.error-message')).toContainText('Invalid credentials')

    // User should still be on the login page
    await expect(page).toHaveURL('/login')
  })
})

// ────────────────────────────────────────────────────────────────
// Logout
// ────────────────────────────────────────────────────────────────
test.describe('Logout', () => {
  test.beforeEach(async ({ page }) => {
    // Register + login a fresh user
    const uid = `logouttest${Date.now()}`
    await page.goto('/register')
    await page.fill('input#username', uid)
    await page.fill('input#email', `${uid}@test.com`)
    await page.fill('input#password', 'LogoutTest1')
    await page.fill('input#confirm', 'LogoutTest1')
    await page.click('button[type="submit"]')
    await page.waitForURL('/')
  })

  test('logs out and shows guest navigation', async ({ page }) => {
    const logoutBtn = page.locator('button.nav-btn', { hasText: 'Logout' })
    await expect(logoutBtn).toBeVisible()
    await logoutBtn.click()

    await expect(page).toHaveURL('/')
    await expect(page.locator('a[href="/register"]')).toBeVisible()
    await expect(page.locator('a[href="/profile"]')).not.toBeVisible()
  })

  test('cannot access profile after logout', async ({ page }) => {
    const logoutBtn = page.locator('button.nav-btn', { hasText: 'Logout' })
    await logoutBtn.click()
    await page.waitForURL('/')

    await page.goto('/profile')
    await expect(page).toHaveURL(/\/login/)
  })
})
