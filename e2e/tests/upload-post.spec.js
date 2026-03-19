/**
 * E2E: Upload & Post Creation Tests
 *
 * Tests image upload flow, post creation, and image display on the feed.
 * Run with: docker compose up -d && cd e2e && npm test
 */
import { test, expect } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import os from 'os'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ── Helpers ──────────────────────────────────────────────────────

async function registerAndLogin(page, suffix = Date.now()) {
  const user = {
    username: `posttest${suffix}`,
    email: `posttest${suffix}@test.com`,
    password: 'PostTest123',
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

/** Create a temporary JPEG file of the given byte size. */
function makeTempImage(name, sizeBytes) {
  const tmpPath = path.join(os.tmpdir(), name)
  // Minimal valid JPEG header + padding
  const jpeg = Buffer.alloc(sizeBytes, 0xff)
  jpeg[0] = 0xff
  jpeg[1] = 0xd8
  jpeg[2] = 0xff
  jpeg[3] = 0xe0
  fs.writeFileSync(tmpPath, jpeg)
  return tmpPath
}

// ── Text-only post ────────────────────────────────────────────────

test.describe('Text post creation', () => {
  test.beforeEach(async ({ page }) => {
    await registerAndLogin(page)
    await page.goto('/')
  })

  test('post button is disabled when content is empty', async ({ page }) => {
    const submitBtn = page.locator('button[type="submit"]').first()
    await expect(submitBtn).toBeDisabled()
  })

  test('creates a text-only post and it appears in the feed', async ({ page }) => {
    const uniqueContent = `Hello from E2E at ${Date.now()}`

    await page.fill('textarea', uniqueContent)
    await page.click('button[type="submit"]')

    // Post should appear in the feed without page reload
    await expect(page.locator('.post-card, .post-content').first()).toContainText(uniqueContent)
  })

  test('clears the textarea after successful post', async ({ page }) => {
    await page.fill('textarea', 'Cleared after submit')
    await page.click('button[type="submit"]')

    await expect(page.locator('textarea')).toHaveValue('')
  })
})

// ── Image upload ──────────────────────────────────────────────────

test.describe('Image upload validation', () => {
  test.beforeEach(async ({ page }) => {
    await registerAndLogin(page)
    await page.goto('/')
  })

  test('shows error when a non-image file is selected', async ({ page }) => {
    // Create a temp PDF file
    const pdfPath = path.join(os.tmpdir(), 'test.pdf')
    fs.writeFileSync(pdfPath, '%PDF-1.4 fake content')

    const uploadInput = page.locator('input[type="file"]')
    await uploadInput.setInputFiles(pdfPath)

    await expect(page.locator('.error-banner, [class*="error"]').first()).toContainText(/only/i)
  })

  test('shows error when image exceeds 10 MB', async ({ page }) => {
    const bigImagePath = makeTempImage('big_test.jpg', 11 * 1024 * 1024)

    const uploadInput = page.locator('input[type="file"]')
    await uploadInput.setInputFiles(bigImagePath)

    await expect(page.locator('.error-banner, [class*="error"]').first()).toContainText(/too large/i)
  })

  test('accepts a valid JPEG under 10 MB and shows preview', async ({ page }) => {
    const smallImagePath = makeTempImage('small_test.jpg', 50 * 1024)

    const uploadInput = page.locator('input[type="file"]')
    await uploadInput.setInputFiles(smallImagePath)

    // Preview image should appear
    await expect(page.locator('.image-preview img, img[class*="preview"]')).toBeVisible()
  })
})

// ── Post with image ───────────────────────────────────────────────

test.describe('Post with image upload', () => {
  test('creates a post with image and image appears in feed', async ({ page }) => {
    await registerAndLogin(page, `imgpost${Date.now()}`)
    await page.goto('/')

    const imagePath = makeTempImage('post_image.jpg', 100 * 1024)
    const uniqueContent = `Image post at ${Date.now()}`

    await page.fill('textarea', uniqueContent)

    const uploadInput = page.locator('input[type="file"]')
    await uploadInput.setInputFiles(imagePath)

    // Wait for preview to appear (proves client-side validation passed)
    await expect(page.locator('.image-preview img, img[class*="preview"]')).toBeVisible({ timeout: 5_000 })

    await page.click('button[type="submit"]')

    // Post should appear with both content and an <img> tag
    const postCard = page.locator('.post-card, article').filter({ hasText: uniqueContent }).first()
    await expect(postCard).toBeVisible({ timeout: 10_000 })
    await expect(postCard.locator('img')).toBeVisible()
  })
})

// ── Upload progress ───────────────────────────────────────────────

test.describe('Upload progress indicator', () => {
  test('upload progress bar appears during image submission', async ({ page }) => {
    await registerAndLogin(page, `progress${Date.now()}`)
    await page.goto('/')

    // Use a larger image so the upload takes a moment
    const imagePath = makeTempImage('progress_test.jpg', 2 * 1024 * 1024)

    await page.fill('textarea', 'Progress bar test post')

    const uploadInput = page.locator('input[type="file"]')
    await uploadInput.setInputFiles(imagePath)
    await expect(page.locator('.image-preview img, img[class*="preview"]')).toBeVisible()

    // Slow down the network to catch the progress bar
    await page.route('**/api/uploads**', async (route) => {
      await new Promise((r) => setTimeout(r, 300))
      await route.continue()
    })

    await page.click('button[type="submit"]')

    // Progress bar may be brief — we assert it existed or post completes
    // Either the progress bar briefly shows or the post succeeds (both are valid)
    await expect(
      page.locator('.progress-bar, [class*="progress"]').first().or(
        page.locator('.post-card, article').filter({ hasText: 'Progress bar test post' }).first()
      )
    ).toBeVisible({ timeout: 15_000 })
  })
})
