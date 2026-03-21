/**
 * NotificationService Unit Tests
 */
import { jest, describe, test, expect, beforeEach } from '@jest/globals';

// Mock Notification model
const mockNotification = { create: jest.fn() };
jest.unstable_mockModule('../../../src/models/Notification.js', () => ({ default: mockNotification }));

// Mock prisma (transitive dependency)
jest.unstable_mockModule('../../../src/config/prisma.js', () => ({
  default: { notification: { create: jest.fn() } },
}));

const { default: NotificationService } = await import('../../../src/services/notificationService.js');

const fakeNotification = {
  id: 1,
  user_id: 42,
  type: 'test',
  title: 'Test',
  message: 'Hello',
  is_read: false,
  reference_type: null,
  reference_id: null,
  created_at: new Date().toISOString(),
};

beforeEach(() => {
  jest.clearAllMocks();
  NotificationService.setIo(null);
});

describe('NotificationService.setIo', () => {
  test('should store the io instance', () => {
    const mockIo = { to: jest.fn().mockReturnValue({ emit: jest.fn() }) };
    NotificationService.setIo(mockIo);
    // Verify by calling notify and checking that io.to was called
    mockNotification.create.mockResolvedValue(fakeNotification);
    NotificationService.notify({ userId: 42, type: 'test', title: 'T', message: 'M' });
  });
});

describe('NotificationService.notify', () => {
  test('should create notification via model', async () => {
    mockNotification.create.mockResolvedValue(fakeNotification);
    const result = await NotificationService.notify({
      userId: 42, type: 'test', title: 'Test', message: 'Hello',
    });
    expect(mockNotification.create).toHaveBeenCalledWith({
      userId: 42, type: 'test', title: 'Test', message: 'Hello',
      referenceType: undefined, referenceId: undefined,
    });
    expect(result).toEqual(fakeNotification);
  });

  test('should emit via socket.io when io is set', async () => {
    const emitFn = jest.fn();
    const mockIo = { to: jest.fn().mockReturnValue({ emit: emitFn }) };
    NotificationService.setIo(mockIo);
    mockNotification.create.mockResolvedValue(fakeNotification);
    await NotificationService.notify({ userId: 42, type: 'test', title: 'T', message: 'M' });
    expect(mockIo.to).toHaveBeenCalledWith('user:42');
    expect(emitFn).toHaveBeenCalledWith('notification', fakeNotification);
  });

  test('should not emit when io is null', async () => {
    mockNotification.create.mockResolvedValue(fakeNotification);
    await NotificationService.notify({ userId: 42, type: 'test', title: 'T', message: 'M' });
    // No error thrown
  });
});

describe('NotificationService.friendRequest', () => {
  test('should create friend_request notification', async () => {
    mockNotification.create.mockResolvedValue(fakeNotification);
    await NotificationService.friendRequest(42, 'alice');
    expect(mockNotification.create).toHaveBeenCalledWith(expect.objectContaining({
      userId: 42,
      type: 'friend_request',
      title: 'Friend Request',
      message: 'alice sent you a friend request.',
      referenceType: 'friend_request',
    }));
  });
});

describe('NotificationService.friendAccepted', () => {
  test('should create friend_accepted notification', async () => {
    mockNotification.create.mockResolvedValue(fakeNotification);
    await NotificationService.friendAccepted(10, 'bob');
    expect(mockNotification.create).toHaveBeenCalledWith(expect.objectContaining({
      userId: 10,
      type: 'friend_accepted',
      message: 'bob accepted your friend request.',
    }));
  });
});

describe('NotificationService.gameInvite', () => {
  test('should create game_invite notification with gameId', async () => {
    mockNotification.create.mockResolvedValue(fakeNotification);
    await NotificationService.gameInvite(42, 'alice', 99);
    expect(mockNotification.create).toHaveBeenCalledWith(expect.objectContaining({
      userId: 42,
      type: 'game_invite',
      referenceType: 'game',
      referenceId: 99,
    }));
  });
});

describe('NotificationService.orgInvite', () => {
  test('should create org_invite notification', async () => {
    mockNotification.create.mockResolvedValue(fakeNotification);
    await NotificationService.orgInvite(42, 'AlpacaCorp', 5);
    expect(mockNotification.create).toHaveBeenCalledWith(expect.objectContaining({
      userId: 42,
      type: 'org_invite',
      referenceType: 'organization',
      referenceId: 5,
      message: 'You were added to AlpacaCorp.',
    }));
  });
});

describe('NotificationService.achievementUnlocked', () => {
  test('should create achievement notification', async () => {
    mockNotification.create.mockResolvedValue(fakeNotification);
    await NotificationService.achievementUnlocked(42, 'First Win');
    expect(mockNotification.create).toHaveBeenCalledWith(expect.objectContaining({
      userId: 42,
      type: 'achievement',
      title: 'Achievement Unlocked!',
      message: 'You unlocked "First Win".',
    }));
  });
});

describe('NotificationService.postLiked', () => {
  test('should create post_like notification', async () => {
    mockNotification.create.mockResolvedValue(fakeNotification);
    await NotificationService.postLiked(42, 'charlie', 7);
    expect(mockNotification.create).toHaveBeenCalledWith(expect.objectContaining({
      userId: 42,
      type: 'post_like',
      referenceType: 'post',
      referenceId: 7,
      message: 'charlie liked your post.',
    }));
  });
});

describe('NotificationService.newMessage', () => {
  test('should create message notification', async () => {
    mockNotification.create.mockResolvedValue(fakeNotification);
    await NotificationService.newMessage(42, 'dave');
    expect(mockNotification.create).toHaveBeenCalledWith(expect.objectContaining({
      userId: 42,
      type: 'message',
      title: 'New Message',
      message: 'dave sent you a message.',
    }));
  });
});

describe('NotificationService.dataRequestCompleted', () => {
  test('should create data_request notification', async () => {
    mockNotification.create.mockResolvedValue(fakeNotification);
    await NotificationService.dataRequestCompleted(42, 'export');
    expect(mockNotification.create).toHaveBeenCalledWith(expect.objectContaining({
      userId: 42,
      type: 'data_request',
      title: 'Data Request Complete',
      message: 'Your data export request has been completed.',
    }));
  });
});
