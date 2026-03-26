import { test, expect } from '@playwright/test';
import { authHeaders, createUser, setAuthToken } from './helpers/api.js';

test.describe('Profile and User Data', () => {
  test('fetch/update own profile and fetch public profile by id', async ({ request, page }) => {
    const me = await createUser(request, 'profile');

    const getMe = await request.get('/api/users/me', {
      headers: { Authorization: `Bearer ${me.accessToken}` },
    });
    expect(getMe.ok()).toBeTruthy();

    const update = await request.put('/api/users/me', {
      headers: authHeaders(me.accessToken),
      data: {
        bio: 'Updated by e2e',
        status: 'Online and testing',
      },
    });
    expect(update.ok()).toBeTruthy();

    const updatedBody = await update.json();
    expect(updatedBody.user.bio).toContain('Updated by e2e');

    const byId = await request.get(`/api/users/${me.user.id}`, {
      headers: { Authorization: `Bearer ${me.accessToken}` },
    });
    expect(byId.ok()).toBeTruthy();

    const byIdBody = await byId.json();
    expect(byIdBody.user.id).toBe(me.user.id);

    await setAuthToken(page, me.accessToken);
    await page.goto('/profile');
    await expect(page).toHaveURL(/\/profile/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('change password then login with new password', async ({ request }) => {
    const user = await createUser(request, 'pwd');
    const newPassword = 'NewPass123!';

    const change = await request.put('/api/users/me/password', {
      headers: authHeaders(user.accessToken),
      data: {
        currentPassword: user.password,
        newPassword,
      },
    });
    expect(change.ok()).toBeTruthy();

    const login = await request.post('/api/auth/login', {
      data: {
        username: user.username,
        password: newPassword,
      },
    });
    expect(login.ok()).toBeTruthy();
  });
});
