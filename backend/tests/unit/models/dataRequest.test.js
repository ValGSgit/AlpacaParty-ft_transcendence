/**
 * DataRequest Model Unit Tests
 */
import { jest, describe, test, expect, beforeEach } from '@jest/globals';

const mockPrisma = {
  dataRequest: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
};
jest.unstable_mockModule('../../../src/config/prisma.js', () => ({ default: mockPrisma }));

const { default: DataRequest } = await import('../../../src/models/DataRequest.js');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('DataRequest.create', () => {
  test('should create a data request', async () => {
    const fakeRequest = { id: 1, userId: 5, type: 'export', status: 'pending' };
    mockPrisma.dataRequest.create.mockResolvedValue(fakeRequest);
    const result = await DataRequest.create({ userId: 5, type: 'export' });
    expect(mockPrisma.dataRequest.create).toHaveBeenCalledWith({
      data: { userId: 5, type: 'export' },
    });
    expect(result).toEqual(fakeRequest);
  });

  test('should convert userId to number', async () => {
    mockPrisma.dataRequest.create.mockResolvedValue({});
    await DataRequest.create({ userId: '5', type: 'deletion' });
    expect(mockPrisma.dataRequest.create).toHaveBeenCalledWith({
      data: { userId: 5, type: 'deletion' },
    });
  });
});

describe('DataRequest.findById', () => {
  test('should find request by id', async () => {
    const fakeRequest = { id: 1, userId: 5, type: 'export' };
    mockPrisma.dataRequest.findUnique.mockResolvedValue(fakeRequest);
    const result = await DataRequest.findById(1);
    expect(mockPrisma.dataRequest.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(result).toEqual(fakeRequest);
  });

  test('should return null when not found', async () => {
    mockPrisma.dataRequest.findUnique.mockResolvedValue(null);
    const result = await DataRequest.findById(999);
    expect(result).toBeNull();
  });
});

describe('DataRequest.getByUser', () => {
  test('should return requests ordered by createdAt desc', async () => {
    const requests = [
      { id: 2, userId: 5, type: 'export' },
      { id: 1, userId: 5, type: 'deletion' },
    ];
    mockPrisma.dataRequest.findMany.mockResolvedValue(requests);
    const result = await DataRequest.getByUser(5);
    expect(mockPrisma.dataRequest.findMany).toHaveBeenCalledWith({
      where: { userId: 5 },
      orderBy: { createdAt: 'desc' },
    });
    expect(result).toHaveLength(2);
  });

  test('should return empty array when user has no requests', async () => {
    mockPrisma.dataRequest.findMany.mockResolvedValue([]);
    const result = await DataRequest.getByUser(999);
    expect(result).toEqual([]);
  });
});

describe('DataRequest.updateStatus', () => {
  test('should update status to processing without completedAt', async () => {
    const updated = { id: 1, status: 'processing', completedAt: null };
    mockPrisma.dataRequest.update.mockResolvedValue(updated);
    const result = await DataRequest.updateStatus(1, 'processing');
    expect(mockPrisma.dataRequest.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({
        status: 'processing',
        completedAt: null,
      }),
    });
    expect(result).toEqual(updated);
  });

  test('should set completedAt for completed status', async () => {
    const updated = { id: 1, status: 'completed', completedAt: expect.any(Date) };
    mockPrisma.dataRequest.update.mockResolvedValue(updated);
    await DataRequest.updateStatus(1, 'completed');
    const call = mockPrisma.dataRequest.update.mock.calls[0][0];
    expect(call.data.status).toBe('completed');
    expect(call.data.completedAt).toBeInstanceOf(Date);
  });

  test('should set completedAt for cancelled status', async () => {
    mockPrisma.dataRequest.update.mockResolvedValue({});
    await DataRequest.updateStatus(1, 'cancelled');
    const call = mockPrisma.dataRequest.update.mock.calls[0][0];
    expect(call.data.completedAt).toBeInstanceOf(Date);
  });

  test('should include fileUrl when provided', async () => {
    mockPrisma.dataRequest.update.mockResolvedValue({});
    await DataRequest.updateStatus(1, 'completed', '/exports/data.json');
    const call = mockPrisma.dataRequest.update.mock.calls[0][0];
    expect(call.data.fileUrl).toBe('/exports/data.json');
  });

  test('should not include fileUrl when not provided', async () => {
    mockPrisma.dataRequest.update.mockResolvedValue({});
    await DataRequest.updateStatus(1, 'processing');
    const call = mockPrisma.dataRequest.update.mock.calls[0][0];
    expect(call.data.fileUrl).toBeUndefined();
  });
});

describe('DataRequest.getPending', () => {
  test('should return pending/processing requests with username', async () => {
    mockPrisma.dataRequest.findMany.mockResolvedValue([
      { id: 1, userId: 5, status: 'pending', user: { username: 'alice' } },
      { id: 2, userId: 3, status: 'processing', user: { username: 'bob' } },
    ]);
    const result = await DataRequest.getPending();
    expect(mockPrisma.dataRequest.findMany).toHaveBeenCalledWith({
      where: { status: { in: ['pending', 'processing'] } },
      include: { user: { select: { username: true } } },
      orderBy: { createdAt: 'asc' },
    });
    expect(result).toHaveLength(2);
    expect(result[0].username).toBe('alice');
    expect(result[0].user).toBeUndefined();
  });

  test('should return empty array when no pending requests', async () => {
    mockPrisma.dataRequest.findMany.mockResolvedValue([]);
    const result = await DataRequest.getPending();
    expect(result).toEqual([]);
  });
});
