import { test, expect } from '@playwright/test';
import { acceptFirstPending, authHeaders, createUser, requestFriendship } from './helpers/api.js';

test.describe('Messages Workflow', () => {
  test('friendship + DM endpoints + unread count', async ({ request }) => {
    const a = await createUser(request, 'dm_a');
    const b = await createUser(request, 'dm_b');

    await requestFriendship(request, a.accessToken, b.user.id);
    await acceptFirstPending(request, b.accessToken);


    const listFriends = await request.get('/api/friends', {
      headers: authHeaders(a.accessToken),
    });
    expect(listFriends.ok()).toBeTruthy();

    const friendsBody = await listFriends.json();
    const hasB = friendsBody.friends.some((f) => f.id === b.user.id);
    expect(hasB).toBeTruthy();

    const dm = await request.get(`/api/chat/dm/${b.user.id}`, {
      headers: authHeaders(a.accessToken),
    });
    expect(dm.ok()).toBeTruthy();

    const dmBody = await dm.json();
    expect(Array.isArray(dmBody.messages)).toBeTruthy();

    const unread = await request.get('/api/chat/unread', {
      headers: authHeaders(b.accessToken),
    });
    expect(unread.ok()).toBeTruthy();

    const unreadBody = await unread.json();
    expect(typeof unreadBody.count).toBe('number');
  });

  test('cannot message yourself in DM endpoint', async ({ request }) => {
    const user = await createUser(request, 'dm_self');

    const res = await request.get(`/api/chat/dm/${user.user.id}`, {
      headers: authHeaders(user.accessToken),
    });

    expect(res.status()).toBe(400);
  });

  test('GET /chat/conversations returns conversation list', async ({ request }) => {
    const a = await createUser(request, 'conv_a');
    const b = await createUser(request, 'conv_b');

    await requestFriendship(request, a.accessToken, b.user.id);
    await acceptFirstPending(request, b.accessToken);

    // Fetch conversations (initially empty is fine — endpoint must respond)
    const res = await request.get('/api/chat/conversations', {
      headers: authHeaders(a.accessToken),
    });
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    expect(Array.isArray(body.conversations)).toBeTruthy();
  });

  test('DM history supports limit and offset pagination', async ({ request }) => {
    const a = await createUser(request, 'pagdm_a');
    const b = await createUser(request, 'pagdm_b');

    await requestFriendship(request, a.accessToken, b.user.id);
    await acceptFirstPending(request, b.accessToken);

    const page1 = await request.get(`/api/chat/dm/${b.user.id}?limit=5&offset=0`, {
      headers: authHeaders(a.accessToken),
    });
    expect(page1.ok()).toBeTruthy();
    const body1 = await page1.json();
    expect(Array.isArray(body1.messages)).toBeTruthy();
    expect(body1.messages.length).toBeLessThanOrEqual(5);
  });
});
