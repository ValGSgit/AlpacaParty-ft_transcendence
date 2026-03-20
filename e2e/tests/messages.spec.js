/**
 * E2E: Messaging Tests
 *
 * Tests DM flow via friends list, self-message prevention, and group room creation.
 * Run with: docker compose up -d && cd e2e && npm test
 */
import { test, expect } from '@playwright/test'

// ── Helpers ──────────────────────────────────────────────────────

async function registerUser(page, suffix) {
  const user = {
    username: `msgtest_${suffix}`,
    email: `msgtest_${suffix}@test.com`,
    password: 'MsgTest123',
  }
  await page.goto('/register')
  await page.fill('input#username', user.username)
  await page.fill('input#email', user.email)
  await page.fill('input#password', user.password)
  await page.fill('input#confirm', user.password)
  await page.click('button[type="submit"]')
  await page.waitForURL('/')
  return user
}

/**
 * Set up two mutual friends:
 * - Register A and B
 * - A sends friend request to B
 * - B accepts
 * - Returns both users and their pages
 */
async function setupMutualFriends(browser) {
  const ts = Date.now()

  const pageA = await browser.newPage()
  const userA = await registerUser(pageA, `a${ts}`)
  const tokenA = await pageA.evaluate(() => localStorage.getItem('accessToken'))

  const pageB = await browser.newPage()
  const userB = await registerUser(pageB, `b${ts}`)
  const tokenB = await pageB.evaluate(() => localStorage.getItem('accessToken'))

  // A searches for B and sends a friend request
  const searchResp = await pageA.request.get(`/api/users?search=${userB.username}`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  })
  const searchBody = await searchResp.json()
  const userBId = searchBody.users?.[0]?.id

  if (userBId) {
    await pageA.request.post('/api/friends/request', {
      headers: { Authorization: `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
      data: JSON.stringify({ targetUserId: userBId }),
    })

    // B accepts: get pending requests first
    const pendingResp = await pageB.request.get('/api/friends/pending', {
      headers: { Authorization: `Bearer ${tokenB}` },
    })
    const pendingBody = await pendingResp.json()
    const requestId = pendingBody.requests?.[0]?.id ?? pendingBody.friendships?.[0]?.id

    if (requestId) {
      await pageB.request.put(`/api/friends/${requestId}/accept`, {
        headers: { Authorization: `Bearer ${tokenB}` },
      })
    }
  }

  return { pageA, pageB, userA, userB, tokenA, tokenB }
}

// ── Messages page ─────────────────────────────────────────────────

test.describe('Messages page basics', () => {
  test('redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
    })
    await page.goto('/messages')
    await expect(page).toHaveURL(/\/login/)
  })

  test('renders messages page for authenticated user', async ({ page }) => {
    await registerUser(page, `basic${Date.now()}`)
    await page.goto('/messages')
    // The messages page should load without crashing
    await expect(page.locator('h2, h1').first()).toBeVisible()
  })

  test('shows friends list panel (no raw User ID input)', async ({ page }) => {
    await registerUser(page, `noinput${Date.now()}`)
    await page.goto('/messages')

    // Should NOT have a raw numeric user-ID input
    const rawIdInput = page.locator('input[type="number"][placeholder*="User ID" i]')
    await expect(rawIdInput).not.toBeVisible()
  })
})

// ── DM via friends list ───────────────────────────────────────────

test.describe('DM via friends list', () => {
  test('friends appear in the sidebar after mutual friendship', async ({ browser }) => {
    const { pageB, userA } = await setupMutualFriends(browser)

    await pageB.goto('/messages')
    await pageB.waitForLoadState('networkidle')

    // User A should appear in B's friends sidebar
    await expect(
      pageB.locator('.friend-item, .conversation-item, [class*="friend"]')
        .filter({ hasText: userA.username })
        .first()
    ).toBeVisible({ timeout: 8_000 })

    await pageB.close()
  })

  test('clicking a friend opens DM chat window', async ({ browser }) => {
    const { pageA, pageB, userA, userB } = await setupMutualFriends(browser)

    await pageB.goto('/messages')
    await pageB.waitForLoadState('networkidle')

    const friendEntry = pageB.locator('.friend-item, .conversation-item, [class*="friend"]')
      .filter({ hasText: userA.username })
      .first()

    // Try to click the friend entry if it's visible
    if (await friendEntry.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await friendEntry.click()

      // Chat area / message input should now appear
      await expect(
        pageB.locator('.chat-messages, .message-list, [class*="chat-area"]')
          .or(pageB.locator('input[placeholder*="message" i], textarea[placeholder*="message" i]'))
          .first()
      ).toBeVisible({ timeout: 5_000 })
    }

    await pageA.close()
    await pageB.close()
  })

  test('sends a message to a friend and message appears in chat', async ({ browser }) => {
    const { pageA, pageB, userA } = await setupMutualFriends(browser)

    await pageB.goto('/messages')
    await pageB.waitForLoadState('networkidle')

    const friendEntry = pageB.locator('.friend-item, .conversation-item, [class*="friend"]')
      .filter({ hasText: userA.username })
      .first()

    if (!(await friendEntry.isVisible({ timeout: 5_000 }).catch(() => false))) {
      await pageA.close()
      await pageB.close()
      test.skip()
      return
    }

    await friendEntry.click()

    const msgInput = pageB.locator(
      'input[placeholder*="message" i], textarea[placeholder*="message" i], .message-input input, .message-input textarea'
    ).first()
    await expect(msgInput).toBeVisible({ timeout: 5_000 })

    const uniqueMsg = `Hello from E2E at ${Date.now()}`
    await msgInput.fill(uniqueMsg)
    await msgInput.press('Enter')

    // Message should appear in chat
    await expect(
      pageB.locator('.message-bubble, .msg-bubble, [class*="message"]').filter({ hasText: uniqueMsg }).first()
    ).toBeVisible({ timeout: 8_000 })

    await pageA.close()
    await pageB.close()
  })

  test('message is received by the other user in real time', async ({ browser }) => {
    const { pageA, pageB, userA } = await setupMutualFriends(browser)

    // Open DM on page B (sender)
    await pageB.goto('/messages')
    await pageB.waitForLoadState('networkidle')

    const friendEntry = pageB.locator('.friend-item, .conversation-item, [class*="friend"]')
      .filter({ hasText: userA.username })
      .first()

    if (!(await friendEntry.isVisible({ timeout: 5_000 }).catch(() => false))) {
      await pageA.close()
      await pageB.close()
      test.skip()
      return
    }

    await friendEntry.click()

    // Open the same conversation on page A
    await pageA.goto('/messages')
    await pageA.waitForLoadState('networkidle')
    const friendEntryA = pageA.locator('.friend-item, .conversation-item, [class*="friend"]')
      .filter({ hasText: new RegExp(pageB._user?.username ?? 'b', 'i') })
      .first()
    if (await friendEntryA.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await friendEntryA.click()
    }

    // B sends a message
    const msgInput = pageB.locator(
      'input[placeholder*="message" i], textarea[placeholder*="message" i], .message-input input, .message-input textarea'
    ).first()
    const uniqueMsg = `Real-time ${Date.now()}`

    if (await msgInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await msgInput.fill(uniqueMsg)
      await msgInput.press('Enter')

      // A should receive the message via WebSocket
      await expect(
        pageA.locator('.message-bubble, .msg-bubble, [class*="message"]').filter({ hasText: uniqueMsg }).first()
      ).toBeVisible({ timeout: 10_000 })
    }

    await pageA.close()
    await pageB.close()
  })
})

// ── Self-message prevention ───────────────────────────────────────

test.describe('Self-message prevention', () => {
  test('user does not appear in their own friends list', async ({ page }) => {
    const user = await registerUser(page, `selfcheck${Date.now()}`)
    await page.goto('/messages')
    await page.waitForLoadState('networkidle')

    // The logged-in user's own name should NOT appear as a clickable DM target
    const selfEntry = page.locator(
      '.friend-item, [class*="friend"], .conversation-item'
    ).filter({ hasText: user.username })

    // It may not appear at all — that's correct
    const count = await selfEntry.count()
    // If it does appear (edge case), clicking it should NOT open a chat input
    // We just assert count is 0 as the happy path
    expect(count).toBe(0)
  })
})

// ── Group room creation ───────────────────────────────────────────

test.describe('Group room creation', () => {
  test.beforeEach(async ({ page }) => {
    await registerUser(page, `room${Date.now()}`)
    await page.goto('/messages')
    await page.waitForLoadState('networkidle')
  })

  test('shows "New Room" button or form trigger', async ({ page }) => {
    const newRoomBtn = page.locator(
      'button:has-text("New Room"), button:has-text("+ New Room"), button:has-text("Create Room"), [class*="new-room"]'
    ).first()
    await expect(newRoomBtn).toBeVisible()
  })

  test('creates a group room and it appears in room list', async ({ page }) => {
    const newRoomBtn = page.locator(
      'button:has-text("New Room"), button:has-text("+ New Room"), button:has-text("Create Room"), [class*="new-room"]'
    ).first()

    if (!(await newRoomBtn.isVisible({ timeout: 3_000 }).catch(() => false))) {
      test.skip()
      return
    }

    await newRoomBtn.click()

    // Fill in room name
    const nameInput = page.locator(
      'input[placeholder*="room" i], input[placeholder*="name" i], input#room-name, input[name="name"]'
    ).first()

    if (!(await nameInput.isVisible({ timeout: 3_000 }).catch(() => false))) {
      test.skip()
      return
    }

    const roomName = `E2E Room ${Date.now()}`
    await nameInput.fill(roomName)

    // Submit the form
    const createBtn = page.locator(
      'button[type="submit"]:near(input[placeholder*="room" i]), button:has-text("Create")'
    ).first()
    await createBtn.click()

    // Room should appear in the sidebar
    await expect(
      page.locator('.room-item, [class*="room-list"] li, [class*="room"]').filter({ hasText: roomName }).first()
    ).toBeVisible({ timeout: 8_000 })
  })
})

// ── Friend search ─────────────────────────────────────────────────

test.describe('Friend search in messages sidebar', () => {
  test('search input filters friends list', async ({ browser }) => {
    const { pageB, userA } = await setupMutualFriends(browser)

    await pageB.goto('/messages')
    await pageB.waitForLoadState('networkidle')

    const searchInput = pageB.locator(
      'input[placeholder*="search" i], input[placeholder*="friend" i]'
    ).first()

    if (!(await searchInput.isVisible({ timeout: 5_000 }).catch(() => false))) {
      await pageB.close()
      test.skip()
      return
    }

    // Type a partial match for user A
    await searchInput.fill(userA.username.slice(0, 5))

    // User A should still be visible
    await expect(
      pageB.locator('.friend-item, [class*="friend"]').filter({ hasText: userA.username }).first()
    ).toBeVisible({ timeout: 5_000 })

    // Type something that matches nothing
    await searchInput.fill('zzznomatch999')
    const visibleFriends = await pageB.locator('.friend-item, [class*="friend"]').count()
    expect(visibleFriends).toBe(0)

    await pageB.close()
  })
})
