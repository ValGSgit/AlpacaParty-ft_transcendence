/**
 * E2E: Help Desk Page Tests
 *
 * The /help route requires authentication.
 * Tests the AI help chat interface.
 */
import { test, expect } from '@playwright/test'

test.describe('Help Desk', () => {
  let testUser

  test.beforeAll(async ({ browser }) => {
    // Register a user once for all help tests
    const uid = `helptest${Date.now()}`
    testUser = {
      username: uid,
      email: `${uid}@test.com`,
      password: 'HelpTest123',
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

  test('redirects unauthenticated users to login', async ({ browser }) => {
    const page = await browser.newPage()
    // Clear tokens
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
    })
    await page.goto('/help')
    await expect(page).toHaveURL(/\/login/)
    await page.close()
  })

  test('page loads for authenticated users', async ({ page }) => {
    await page.goto('/help')
    await expect(page).toHaveURL('/help')
    await expect(page.locator('h1')).toContainText('Help Desk')
  })

  test('shows subtitle', async ({ page }) => {
    await page.goto('/help')
    await expect(page.locator('.help-subtitle')).toContainText('Alpaca Party')
  })

  test('shows empty state with suggestion buttons', async ({ page }) => {
    await page.goto('/help')
    await expect(page.locator('.empty-state')).toBeVisible()
    await expect(page.locator('.empty-state')).toContainText('No messages yet')

    const suggestions = page.locator('.suggestion-btn')
    await expect(suggestions).toHaveCount(4)
  })

  test('shows input field with placeholder', async ({ page }) => {
    await page.goto('/help')
    const input = page.locator('.chat-input-bar input')
    await expect(input).toBeVisible()
    await expect(input).toHaveAttribute('placeholder', /type your question/i)
  })

  test('shows send button', async ({ page }) => {
    await page.goto('/help')
    await expect(page.locator('.send-btn')).toBeVisible()
  })

  test('send button is disabled when input is empty', async ({ page }) => {
    await page.goto('/help')
    await expect(page.locator('.send-btn')).toBeDisabled()
  })

  test('send button is enabled when input has text', async ({ page }) => {
    await page.goto('/help')
    await page.locator('.chat-input-bar input').fill('Hello')
    await expect(page.locator('.send-btn')).not.toBeDisabled()
  })

  test('typing a message and sending shows user message', async ({ page }) => {
    await page.goto('/help')
    const input = page.locator('.chat-input-bar input')
    await input.fill('How do I play the game?')
    await page.locator('.send-btn').click()

    // User message should appear
    const userMsg = page.locator('.message.user')
    await expect(userMsg).toBeVisible()
    await expect(userMsg).toContainText('How do I play the game?')
  })

  test('input is cleared after sending', async ({ page }) => {
    await page.goto('/help')
    const input = page.locator('.chat-input-bar input')
    await input.fill('Test message')
    await page.locator('.send-btn').click()
    await expect(input).toHaveValue('')
  })

  test('empty state disappears after first message', async ({ page }) => {
    await page.goto('/help')
    await expect(page.locator('.empty-state')).toBeVisible()

    await page.locator('.chat-input-bar input').fill('Hello')
    await page.locator('.send-btn').click()

    await expect(page.locator('.empty-state')).not.toBeVisible()
  })

  test('clicking a suggestion sends that message', async ({ page }) => {
    await page.goto('/help')
    const firstSuggestion = page.locator('.suggestion-btn').first()
    const suggestionText = await firstSuggestion.textContent()
    await firstSuggestion.click()

    // User message should appear with the suggestion text
    const userMsg = page.locator('.message.user')
    await expect(userMsg).toBeVisible()
    await expect(userMsg).toContainText(suggestionText.trim())
  })

  test('assistant responds after user message', async ({ page }) => {
    await page.goto('/help')
    await page.locator('.chat-input-bar input').fill('What is this app?')
    await page.locator('.send-btn').click()

    // Wait for assistant response (could be streaming or fallback error)
    const assistantMsg = page.locator('.message.assistant')
    await expect(assistantMsg).toBeVisible({ timeout: 30000 })
  })

  test('navbar shows Help link when authenticated', async ({ page }) => {
    await expect(page.locator('a[href="/help"]')).toBeVisible()
  })

  test('clicking Help nav link navigates to /help', async ({ page }) => {
    await page.locator('a[href="/help"]').click()
    await expect(page).toHaveURL('/help')
  })

  test('multiple messages create a conversation', async ({ page }) => {
    await page.goto('/help')

    // Send first message
    await page.locator('.chat-input-bar input').fill('Hello')
    await page.locator('.send-btn').click()

    // Wait for assistant response
    await expect(page.locator('.message.assistant').first()).toBeVisible({ timeout: 30000 })

    // Send second message
    await page.locator('.chat-input-bar input').fill('What can I do here?')
    await page.locator('.send-btn').click()

    // Should have multiple user messages
    const userMessages = page.locator('.message.user')
    await expect(userMessages).toHaveCount(2)
  })

  test('submit via Enter key works', async ({ page }) => {
    await page.goto('/help')
    const input = page.locator('.chat-input-bar input')
    await input.fill('Test via Enter')
    await input.press('Enter')

    const userMsg = page.locator('.message.user')
    await expect(userMsg).toBeVisible()
    await expect(userMsg).toContainText('Test via Enter')
  })
})
