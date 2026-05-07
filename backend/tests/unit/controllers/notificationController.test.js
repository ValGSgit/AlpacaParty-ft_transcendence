import { jest, describe, test, expect, beforeEach } from '@jest/globals';

// ── Mocks ────────────────────────────────────────────────────────────────────
const mockNotification = {
  getForUser: jest.fn(),
  countUnread: jest.fn(),
  markRead: jest.fn(),
  markAllRead: jest.fn(),
  delete: jest.fn(),
};
jest.unstable_mockModule('../../../src/models/Notification.js', () => ({
  default: mockNotification,
}));

const {
  listNotifications, markRead, markAllRead, deleteNotification,
} = await import('../../../src/controllers/notificationController.js');

// ── Helpers ──────────────────────────────────────────────────────────────────
function createReqRes(overrides = {}) {
  const req = {
    user: { id: 1},
    params: {}, query: {}, body: {},
    ...overrides,
  };
  const res = {
    _status: 200,
    _json: null,
    status(code) { res._status = code; return res; },
    json(body) { res._json = body; return res; },
  };
  return { req, res, next: jest.fn() };
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ── listNotifications ────────────────────────────────────────────────────────
describe('listNotifications', () => {
  test('should return notifications and unreadCount', async () => {
    const notifications = [{ id: 1, title: 'Hello' }];
    mockNotification.getForUser.mockResolvedValue(notifications);
    mockNotification.countUnread.mockResolvedValue(3);

    const { req, res, next } = createReqRes();
    await listNotifications(req, res, next);

    expect(mockNotification.getForUser).toHaveBeenCalledWith(1, {
      limit: 30, offset: 0, unreadOnly: false,
    });
    expect(mockNotification.countUnread).toHaveBeenCalledWith(1);
    expect(res._json).toEqual({ notifications, unreadCount: 3 });
  });

  test('should respect query params', async () => {
    mockNotification.getForUser.mockResolvedValue([]);
    mockNotification.countUnread.mockResolvedValue(0);

    const { req, res, next } = createReqRes({
      query: { unreadOnly: 'true', limit: '10', offset: '5' },
    });
    await listNotifications(req, res, next);

    expect(mockNotification.getForUser).toHaveBeenCalledWith(1, {
      limit: 10, offset: 5, unreadOnly: true,
    });
  });

  test('should treat unreadOnly !== "true" as false', async () => {
    mockNotification.getForUser.mockResolvedValue([]);
    mockNotification.countUnread.mockResolvedValue(0);

    const { req, res, next } = createReqRes({ query: { unreadOnly: 'false' } });
    await listNotifications(req, res, next);

    expect(mockNotification.getForUser).toHaveBeenCalledWith(1, {
      limit: 30, offset: 0, unreadOnly: false,
    });
  });

  test('should call next on error', async () => {
    const error = new Error('fail');
    mockNotification.getForUser.mockRejectedValue(error);

    const { req, res, next } = createReqRes();
    await listNotifications(req, res, next);
    expect(next).toHaveBeenCalledWith(error);
  });
});

// ── markRead ─────────────────────────────────────────────────────────────────
describe('markRead', () => {
  test('should mark notification as read', async () => {
    const notification = { id: 5, isRead: true };
    mockNotification.markRead.mockResolvedValue(notification);

    const { req, res, next } = createReqRes({ params: { id: '5' } });
    await markRead(req, res, next);

    expect(mockNotification.markRead).toHaveBeenCalledWith(5, 1);
    expect(res._json).toEqual({ notification });
  });

  test('should return 404 if notification not found', async () => {
    mockNotification.markRead.mockResolvedValue(null);

    const { req, res, next } = createReqRes({ params: { id: '999' } });
    await markRead(req, res, next);

    expect(res._status).toBe(404);
    expect(res._json).toEqual({ error: { message: 'Notification not found' } });
  });

  test('should call next on error', async () => {
    const error = new Error('fail');
    mockNotification.markRead.mockRejectedValue(error);

    const { req, res, next } = createReqRes({ params: { id: '5' } });
    await markRead(req, res, next);
    expect(next).toHaveBeenCalledWith(error);
  });
});

// ── markAllRead ──────────────────────────────────────────────────────────────
describe('markAllRead', () => {
  test('should mark all notifications as read', async () => {
    mockNotification.markAllRead.mockResolvedValue(true);

    const { req, res, next } = createReqRes();
    await markAllRead(req, res, next);

    expect(mockNotification.markAllRead).toHaveBeenCalledWith(1);
    expect(res._json).toEqual({ message: 'All notifications marked as read' });
  });

  test('should call next on error', async () => {
    const error = new Error('fail');
    mockNotification.markAllRead.mockRejectedValue(error);

    const { req, res, next } = createReqRes();
    await markAllRead(req, res, next);
    expect(next).toHaveBeenCalledWith(error);
  });
});

// ── deleteNotification ───────────────────────────────────────────────────────
describe('deleteNotification', () => {
  test('should delete notification', async () => {
    mockNotification.delete.mockResolvedValue(true);

    const { req, res, next } = createReqRes({ params: { id: '5' } });
    await deleteNotification(req, res, next);

    expect(mockNotification.delete).toHaveBeenCalledWith(5, 1);
    expect(res._json).toEqual({ message: 'Notification deleted' });
  });

  test('should return 404 if notification not found', async () => {
    mockNotification.delete.mockResolvedValue(false);

    const { req, res, next } = createReqRes({ params: { id: '999' } });
    await deleteNotification(req, res, next);

    expect(res._status).toBe(404);
    expect(res._json).toEqual({ error: { message: 'Notification not found' } });
  });

  test('should return 404 when delete returns null', async () => {
    mockNotification.delete.mockResolvedValue(null);

    const { req, res, next } = createReqRes({ params: { id: '999' } });
    await deleteNotification(req, res, next);

    expect(res._status).toBe(404);
  });

  test('should call next on error', async () => {
    const error = new Error('fail');
    mockNotification.delete.mockRejectedValue(error);

    const { req, res, next } = createReqRes({ params: { id: '5' } });
    await deleteNotification(req, res, next);
    expect(next).toHaveBeenCalledWith(error);
  });
});
