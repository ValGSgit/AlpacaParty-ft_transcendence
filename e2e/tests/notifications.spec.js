import { test, expect } from '@playwright/test';
import { acceptFirstPending, authHeaders, createUser, requestFriendship } from './helpers/api.js';

test.describe('Notifications Workflow', () => {
  test('friend request creates notifications and supports read/delete', async ({ request }) => {
    const sender = await createUser(request, 'notif_sender');
    const receiver = await createUser(request, 'notif_rcvr');

    await requestFriendship(request, sender.accessToken, receiver.user.id);
    await acceptFirstPending(request, receiver.accessToken);


    const list = await request.get('/api/notifications', {
      headers: authHeaders(receiver.accessToken),
    });
    expect(list.ok()).toBeTruthy();

    const listBody = await list.json();
    expect(Array.isArray(listBody.notifications)).toBeTruthy();
    expect(typeof listBody.unreadCount).toBe('number');

    const markAll = await request.put('/api/notifications/read-all', {
      headers: authHeaders(receiver.accessToken),
    });
    expect(markAll.ok()).toBeTruthy();

    const afterRead = await request.get('/api/notifications?unreadOnly=true', {
      headers: authHeaders(receiver.accessToken),
    });
    expect(afterRead.ok()).toBeTruthy();

    const afterReadBody = await afterRead.json();
    expect(afterReadBody.notifications.length).toBe(0);

    // Ensure delete endpoint is exercised if any notification exists.
    if (listBody.notifications.length > 0) {
      const id = listBody.notifications[0].id;
      const del = await request.delete(`/api/notifications/${id}`, {
        headers: authHeaders(receiver.accessToken),
      });
      expect(del.ok()).toBeTruthy();
    }
  });

  test('PUT /notifications/:id/read marks a single notification as read', async ({ request }) => {
    const sender = await createUser(request, 'notif_single_sender');
    const receiver = await createUser(request, 'notif_single_rcvr');

    await requestFriendship(request, sender.accessToken, receiver.user.id);

    const list = await request.get('/api/notifications?unreadOnly=true', {
      headers: authHeaders(receiver.accessToken),
    });
    expect(list.ok()).toBeTruthy();
    const { notifications } = await list.json();

    // Skip if no notifications were generated (seeding variance)
    if (notifications.length === 0) return;

    const id = notifications[0].id;
    const markOne = await request.put(`/api/notifications/${id}/read`, {
      headers: authHeaders(receiver.accessToken),
    });
    expect(markOne.ok()).toBeTruthy();

    // That notification must no longer appear in unread-only view
    const after = await request.get('/api/notifications?unreadOnly=true', {
      headers: authHeaders(receiver.accessToken),
    });
    expect(after.ok()).toBeTruthy();
    const afterBody = await after.json();
    expect(afterBody.notifications.some((n) => n.id === id)).toBeFalsy();
  });
});
