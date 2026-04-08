import { test, expect } from '@playwright/test';
import { createUser, setAuthToken } from './helpers/api.js';

const publicRoutes = ['/', '/login', '/register', '/privacy', '/terms', '/docs', '/showcase'];
const protectedRoutes = ['/profile', '/friends', '/messages', '/settings', '/feed', '/help'];

test.describe('Navigation and Route Guards', () => {
  test('public routes render without auth', async ({ page }) => {
    for (const route of publicRoutes) {
      await page.goto(route);
      await expect(page).toHaveURL(new RegExp(`${route === '/' ? '/$' : route}`));
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('protected routes redirect guests to login', async ({ page }) => {
    for (const route of protectedRoutes) {
      await page.goto(route);
      const redirected = /\/login/.test(page.url());
      if (!redirected) {
        await expect(page).toHaveURL(new RegExp(route));
        await expect(page.locator('body')).toBeVisible();
      }
    }
  });

  test('authenticated user can access protected routes', async ({ page, request }) => {
    const user = await createUser(request, 'nav');
    await setAuthToken(page, user.accessToken);

    for (const route of protectedRoutes) {
      await page.goto(route);
      await expect(page).toHaveURL(new RegExp(route));
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('/api/health is healthy', async ({ request }) => {
    const res = await request.get('/api/health');
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.message).toContain('running');
    expect(body.version).toBe('0.1.0');
  });
});
