import { test, expect } from '@playwright/test';
import { authHeaders, createUser } from './helpers/api.js';

test.describe('Help Assistant API', () => {
  test('rejects malformed request body', async ({ request }) => {
    const user = await createUser(request, 'helpbad');
    const res = await request.post('/api/help/chat', {
      headers: authHeaders(user.accessToken),
      data: {},
    });

    expect(res.status()).toBe(400);
  });

  test('returns answer when configured, otherwise returns clear 503', async ({ request }) => {
    const user = await createUser(request, 'helpok');
    const res = await request.post('/api/help/chat', {
      headers: authHeaders(user.accessToken),
      data: {
        message: 'How do I add friends?',
      },
    });

    expect([200, 503, 502].includes(res.status())).toBeTruthy();

    const body = await res.json();
    if (res.status() === 200) {
      expect(body.reply).toBeTruthy();
    } else {
      expect(body.error?.message).toBeTruthy();
    }
  });
});
