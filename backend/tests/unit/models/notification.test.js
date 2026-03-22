/**
 * Notification Model Unit Tests
 */
import { jest, describe, test, expect, beforeEach } from '@jest/globals';

const mockPrisma = {
  notification: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
  },
};

jest.unstable_mockModule('../../../src/config/prisma.js', () => ({ default: mockPrisma }));

const { default: Notification } = await import('../../../src/models/Notification.js');

beforeEach(() => jest.clearAllMocks());

// ── create ───────────────────────────────────────────────────────────────────
describe('create', () => {
  test('creates notification and returns shaped result', async () => {
    const raw = {
      id: 1, userId: 1, type: 'friend_request', title: 'Friend Request',
      message: 'Alice sent you a request', isRead: false,
      referenceType: 'friend_request', referenceId: 5, createdAt: '2024-01-01',
    };
    mockPrisma.notification.create.mockResolvedValue(raw);
    const result = await Notification.create({
      userId: 1, type: 'friend_request', title: 'Friend Request',
      message: 'Alice sent you a request', referenceType: 'friend_request', referenceId: 5,
    });
    expect(mockPrisma.notification.create).toHaveBeenCalledWith({
      data: {
        userId: 1, type: 'friend_request', title: 'Friend Request',
        message: 'Alice sent you a request', referenceType: 'friend_request', referenceId: 5,
      },
    });
    expect(result).toEqual({
      id: 1, user_id: 1, type: 'friend_request', title: 'Friend Request',
      message: 'Alice sent you a request', is_read: false,
      reference_type: 'friend_request', reference_id: 5, created_at: '2024-01-01',
    });
  });

  test('handles null referenceType and referenceId', async () => {
    mockPrisma.notification.create.mockResolvedValue({
      id: 1, userId: 1, type: 'info', title: '', message: 'test',
      isRead: false, referenceType: null, referenceId: null, createdAt: '2024-01-01',
    });
    const result = await Notification.create({ userId: 1, type: 'info', message: 'test' });
    expect(mockPrisma.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ title: '', referenceType: null, referenceId: null }),
    });
    expect(result.reference_type).toBeNull();
    expect(result.reference_id).toBeNull();
  });
});

// ── getForUser ───────────────────────────────────────────────────────────────
describe('getForUser', () => {
  test('returns all notifications with defaults', async () => {
    mockPrisma.notification.findMany.mockResolvedValue([
      { id: 1, userId: 1, type: 'info', title: 'Hi', message: 'msg', isRead: false, referenceType: null, referenceId: null, createdAt: '2024-01-01' },
    ]);
    const result = await Notification.getForUser(1);
    expect(mockPrisma.notification.findMany).toHaveBeenCalledWith({
      where: { userId: 1 },
      orderBy: { createdAt: 'desc' },
      take: 30, skip: 0,
    });
    expect(result).toHaveLength(1);
    expect(result[0].user_id).toBe(1);
  });

  test('filters unread only', async () => {
    mockPrisma.notification.findMany.mockResolvedValue([]);
    await Notification.getForUser(1, { unreadOnly: true });
    expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 1, isRead: false } }),
    );
  });

  test('applies custom pagination', async () => {
    mockPrisma.notification.findMany.mockResolvedValue([]);
    await Notification.getForUser(1, { limit: 10, offset: 5 });
    expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 10, skip: 5 }),
    );
  });
});

// ── markRead ─────────────────────────────────────────────────────────────────
describe('markRead', () => {
  test('marks notification as read and returns it', async () => {
    mockPrisma.notification.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.notification.findUnique.mockResolvedValue({
      id: 1, userId: 1, type: 'info', title: 'Hi', message: 'msg',
      isRead: true, referenceType: null, referenceId: null, createdAt: '2024-01-01',
    });
    const result = await Notification.markRead(1, 1);
    expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
      where: { id: 1, userId: 1 }, data: { isRead: true },
    });
    expect(result.is_read).toBe(true);
  });

  test('returns null when notification not found', async () => {
    mockPrisma.notification.updateMany.mockResolvedValue({ count: 0 });
    const result = await Notification.markRead(999, 1);
    expect(result).toBeNull();
    expect(mockPrisma.notification.findUnique).not.toHaveBeenCalled();
  });
});

// ── markAllRead ──────────────────────────────────────────────────────────────
describe('markAllRead', () => {
  test('marks all unread notifications as read', async () => {
    mockPrisma.notification.updateMany.mockResolvedValue({ count: 5 });
    await Notification.markAllRead(1);
    expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
      where: { userId: 1, isRead: false }, data: { isRead: true },
    });
  });
});

// ── countUnread ──────────────────────────────────────────────────────────────
describe('countUnread', () => {
  test('counts unread notifications', async () => {
    mockPrisma.notification.count.mockResolvedValue(3);
    const result = await Notification.countUnread(1);
    expect(mockPrisma.notification.count).toHaveBeenCalledWith({
      where: { userId: 1, isRead: false },
    });
    expect(result).toBe(3);
  });

  test('returns 0 when no unread', async () => {
    mockPrisma.notification.count.mockResolvedValue(0);
    const result = await Notification.countUnread(1);
    expect(result).toBe(0);
  });
});

// ── delete ───────────────────────────────────────────────────────────────────
describe('delete', () => {
  test('returns true when notification deleted', async () => {
    mockPrisma.notification.deleteMany.mockResolvedValue({ count: 1 });
    const result = await Notification.delete(1, 1);
    expect(mockPrisma.notification.deleteMany).toHaveBeenCalledWith({
      where: { id: 1, userId: 1 },
    });
    expect(result).toBe(true);
  });

  test('returns false when notification not found', async () => {
    mockPrisma.notification.deleteMany.mockResolvedValue({ count: 0 });
    const result = await Notification.delete(999, 1);
    expect(result).toBe(false);
  });
});
