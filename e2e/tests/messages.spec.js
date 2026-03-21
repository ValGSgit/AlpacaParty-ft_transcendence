import { test, expect } from '@playwright/test';
import { acceptFirstPending, authHeaders, createUser, requestFriendship } from './helpers/api.js';

test.describe('Messages and Rooms Workflow', () => {
  test('friendship + DM endpoints + unread count', async ({ request }) => {
    const a = await createUser(request, 'dm_a');
    const b = await createUser(request, 'dm_b');

    await requestFriendship(request, a.accessToken, b.user.id);
    await acceptFirstPending(request, b.accessToken);

    const listFriends = await request.get('/api/friends', {
      headers: { Authorization: `Bearer ${a.accessToken}` },
    });
    expect(listFriends.ok()).toBeTruthy();

    const friendsBody = await listFriends.json();
    const hasB = friendsBody.friends.some((f) => f.id === b.user.id);
    expect(hasB).toBeTruthy();

    const dm = await request.get(`/api/chat/dm/${b.user.id}`, {
      headers: { Authorization: `Bearer ${a.accessToken}` },
    });
    expect(dm.ok()).toBeTruthy();

    const dmBody = await dm.json();
    expect(Array.isArray(dmBody.messages)).toBeTruthy();

    const unread = await request.get('/api/chat/unread', {
      headers: { Authorization: `Bearer ${b.accessToken}` },
    });
    expect(unread.ok()).toBeTruthy();

    const unreadBody = await unread.json();
    expect(typeof unreadBody.count).toBe('number');
  });

  test('room create/add member/list/get messages', async ({ request }) => {
    const owner = await createUser(request, 'room_owner');
    const member = await createUser(request, 'room_member');

    const created = await request.post('/api/chat/rooms', {
      headers: authHeaders(owner.accessToken),
      data: { name: `room_${Date.now()}`, isPrivate: false },
    });
    expect(created.status()).toBe(201);

    const room = (await created.json()).room;
    expect(room.id).toBeTruthy();

    const addMember = await request.post(`/api/chat/rooms/${room.id}/members`, {
      headers: authHeaders(owner.accessToken),
      data: { userId: member.user.id },
    });
    expect([200, 201].includes(addMember.status())).toBeTruthy();

    const rooms = await request.get('/api/chat/rooms', {
      headers: { Authorization: `Bearer ${member.accessToken}` },
    });
    expect(rooms.ok()).toBeTruthy();

    const roomsBody = await rooms.json();
    expect(roomsBody.rooms.some((r) => r.id === room.id)).toBeTruthy();

    const messages = await request.get(`/api/chat/rooms/${room.id}/messages`, {
      headers: { Authorization: `Bearer ${member.accessToken}` },
    });
    expect(messages.ok()).toBeTruthy();

    const messagesBody = await messages.json();
    expect(Array.isArray(messagesBody.messages)).toBeTruthy();
  });

  test('cannot message yourself in DM endpoint', async ({ request }) => {
    const user = await createUser(request, 'dm_self');

    const res = await request.get(`/api/chat/dm/${user.user.id}`, {
      headers: { Authorization: `Bearer ${user.accessToken}` },
    });

    expect(res.status()).toBe(400);
  });
});
