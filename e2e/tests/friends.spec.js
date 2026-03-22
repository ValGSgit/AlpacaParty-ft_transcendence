import { test, expect } from '@playwright/test';
import { authHeaders, createUser, requestFriendship, acceptFirstPending } from './helpers/api.js';

// ── Helpers ────────────────────────────────────────────────────────────────────

async function loginAsSeeded(request, email, password = 'LiveSeed123!') {
  const res = await request.post('/api/auth/login', {
    data: { username: email, password },
  });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  return { token: body.accessToken, user: body.user };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

test.describe('Friend System', () => {
  test('send friend request, accept, and list friends', async ({ request }) => {
    // Use two fresh users to avoid conflicts with existing friendships
    const userA = await createUser(request, 'friend_a');
    const userB = await createUser(request, 'friend_b');

    // A sends friend request to B
    await requestFriendship(request, userA.accessToken, userB.user.id);

    // B should see the pending request
    const pendingRes = await request.get('/api/friends/requests', {
      headers: authHeaders(userB.accessToken),
    });
    expect(pendingRes.ok()).toBeTruthy();
    const pendingBody = await pendingRes.json();
    expect(pendingBody.received.length).toBeGreaterThan(0);

    const requestFromA = pendingBody.received.find(
      (r) => r.senderId === userA.user.id || r.sender?.id === userA.user.id,
    );
    expect(requestFromA).toBeTruthy();

    // B accepts the request
    await acceptFirstPending(request, userB.accessToken);

    // Both should see each other in friends list
    const friendsA = await request.get('/api/friends', {
      headers: authHeaders(userA.accessToken),
    });
    expect(friendsA.ok()).toBeTruthy();
    const friendsABody = await friendsA.json();
    expect(friendsABody.friends.some((f) => f.id === userB.user.id)).toBeTruthy();

    const friendsB = await request.get('/api/friends', {
      headers: authHeaders(userB.accessToken),
    });
    expect(friendsB.ok()).toBeTruthy();
    const friendsBBody = await friendsB.json();
    expect(friendsBBody.friends.some((f) => f.id === userA.user.id)).toBeTruthy();
  });

  test('decline friend request', async ({ request }) => {
    const userA = await createUser(request, 'decline_a');
    const userB = await createUser(request, 'decline_b');

    // A sends friend request to B
    await requestFriendship(request, userA.accessToken, userB.user.id);

    // B gets the pending request
    const pendingRes = await request.get('/api/friends/requests', {
      headers: authHeaders(userB.accessToken),
    });
    expect(pendingRes.ok()).toBeTruthy();
    const { received } = await pendingRes.json();
    const reqId = received[0]?.id;
    expect(reqId).toBeTruthy();

    // B declines
    const declineRes = await request.put(`/api/friends/requests/${reqId}/decline`, {
      headers: authHeaders(userB.accessToken),
    });
    expect(declineRes.ok()).toBeTruthy();

    // They should NOT be friends
    const friendsB = await request.get('/api/friends', {
      headers: authHeaders(userB.accessToken),
    });
    expect(friendsB.ok()).toBeTruthy();
    const friendsBody = await friendsB.json();
    expect(friendsBody.friends.some((f) => f.id === userA.user.id)).toBeFalsy();
  });

  test('remove friend after accepting', async ({ request }) => {
    const userA = await createUser(request, 'remove_a');
    const userB = await createUser(request, 'remove_b');

    await requestFriendship(request, userA.accessToken, userB.user.id);
    await acceptFirstPending(request, userB.accessToken);

    // A removes B
    const removeRes = await request.delete(`/api/friends/${userB.user.id}`, {
      headers: authHeaders(userA.accessToken),
    });
    expect(removeRes.ok()).toBeTruthy();

    // Verify they are no longer friends
    const friendsA = await request.get('/api/friends', {
      headers: authHeaders(userA.accessToken),
    });
    expect(friendsA.ok()).toBeTruthy();
    const body = await friendsA.json();
    expect(body.friends.some((f) => f.id === userB.user.id)).toBeFalsy();
  });

  test('block and unblock a user', async ({ request }) => {
    const userA = await createUser(request, 'block_a');
    const userB = await createUser(request, 'block_b');

    // A blocks B
    const blockRes = await request.post('/api/friends/block', {
      headers: authHeaders(userA.accessToken),
      data: { userId: userB.user.id },
    });
    expect(blockRes.ok()).toBeTruthy();

    // Verify B is in A's blocked list
    const blockedRes = await request.get('/api/friends/blocked', {
      headers: authHeaders(userA.accessToken),
    });
    expect(blockedRes.ok()).toBeTruthy();
    const blockedBody = await blockedRes.json();
    const blocked = blockedBody.blocked ?? blockedBody.users ?? blockedBody;
    expect(Array.isArray(blocked)).toBeTruthy();
    expect(blocked.some((u) => u.id === userB.user.id)).toBeTruthy();

    // A unblocks B
    const unblockRes = await request.delete(`/api/friends/block/${userB.user.id}`, {
      headers: authHeaders(userA.accessToken),
    });
    expect(unblockRes.ok()).toBeTruthy();

    // Verify B is no longer blocked
    const afterUnblock = await request.get('/api/friends/blocked', {
      headers: authHeaders(userA.accessToken),
    });
    expect(afterUnblock.ok()).toBeTruthy();
    const afterBody = await afterUnblock.json();
    const afterList = afterBody.blocked ?? afterBody.users ?? afterBody;
    expect(afterList.some((u) => u.id === userB.user.id)).toBeFalsy();
  });

  test('online friends endpoint returns list', async ({ request }) => {
    const user = await createUser(request, 'online_check');

    const res = await request.get('/api/friends/online', {
      headers: authHeaders(user.accessToken),
    });
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    const online = body.friends ?? body.online ?? body;
    expect(Array.isArray(online)).toBeTruthy();
  });

  test('cannot send friend request to yourself', async ({ request }) => {
    const user = await createUser(request, 'self_friend');

    const res = await request.post('/api/friends/requests', {
      headers: authHeaders(user.accessToken),
      data: { userId: user.user.id },
    });
    expect(res.status()).toBe(400);
  });
});
