/**
 * File Model Unit Tests
 */
import { jest, describe, test, expect, beforeEach } from '@jest/globals';

const mockPrisma = {
  file: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    delete: jest.fn(),
  },
};
jest.unstable_mockModule('../../../src/config/prisma.js', () => ({ default: mockPrisma }));

const { default: File } = await import('../../../src/models/File.js');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('File.create', () => {
  test('should create a file record and convert BigInt sizeBytes to Number', async () => {
    const fakeRecord = {
      id: 1,
      uploaderId: 5,
      originalName: 'photo.png',
      storedName: '12345.png',
      mimeType: 'image/png',
      sizeBytes: BigInt(2048),
      url: '/uploads/12345.png',
    };
    mockPrisma.file.create.mockResolvedValue(fakeRecord);
    const result = await File.create({
      uploaderId: 5,
      originalName: 'photo.png',
      storedName: '12345.png',
      mimeType: 'image/png',
      sizeBytes: 2048,
      url: '/uploads/12345.png',
    });
    expect(mockPrisma.file.create).toHaveBeenCalledWith({
      data: {
        uploaderId: 5,
        originalName: 'photo.png',
        storedName: '12345.png',
        mimeType: 'image/png',
        sizeBytes: BigInt(2048),
        url: '/uploads/12345.png',
      },
    });
    expect(result.sizeBytes).toBe(2048);
    expect(typeof result.sizeBytes).toBe('number');
  });
});

describe('File.findById', () => {
  test('should find file by id and convert sizeBytes', async () => {
    mockPrisma.file.findUnique.mockResolvedValue({
      id: 1, sizeBytes: BigInt(1024),
    });
    const result = await File.findById(1);
    expect(mockPrisma.file.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(result.sizeBytes).toBe(1024);
  });

  test('should return null when not found', async () => {
    mockPrisma.file.findUnique.mockResolvedValue(null);
    const result = await File.findById(999);
    expect(result).toBeNull();
  });
});

describe('File.getByUploader', () => {
  test('should return files with converted sizeBytes', async () => {
    mockPrisma.file.findMany.mockResolvedValue([
      { id: 1, sizeBytes: BigInt(1024) },
      { id: 2, sizeBytes: BigInt(2048) },
    ]);
    const result = await File.getByUploader(5);
    expect(result).toHaveLength(2);
    expect(result[0].sizeBytes).toBe(1024);
    expect(result[1].sizeBytes).toBe(2048);
  });

  test('should use default limit and offset', async () => {
    mockPrisma.file.findMany.mockResolvedValue([]);
    await File.getByUploader(5);
    expect(mockPrisma.file.findMany).toHaveBeenCalledWith(expect.objectContaining({
      take: 50,
      skip: 0,
    }));
  });

  test('should use custom limit and offset', async () => {
    mockPrisma.file.findMany.mockResolvedValue([]);
    await File.getByUploader(5, { limit: 10, offset: 20 });
    expect(mockPrisma.file.findMany).toHaveBeenCalledWith(expect.objectContaining({
      take: 10,
      skip: 20,
    }));
  });
});

describe('File.delete', () => {
  test('should delete file when found and owned by uploader', async () => {
    const fakeRecord = { id: 1, uploaderId: 5, sizeBytes: BigInt(512) };
    mockPrisma.file.findFirst.mockResolvedValue(fakeRecord);
    mockPrisma.file.delete.mockResolvedValue({});
    const result = await File.delete(1, 5);
    expect(mockPrisma.file.findFirst).toHaveBeenCalledWith({
      where: { id: 1, uploaderId: 5 },
    });
    expect(mockPrisma.file.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(result.sizeBytes).toBe(512);
  });

  test('should return null when file not found', async () => {
    mockPrisma.file.findFirst.mockResolvedValue(null);
    const result = await File.delete(999, 5);
    expect(result).toBeNull();
    expect(mockPrisma.file.delete).not.toHaveBeenCalled();
  });

  test('should return null when file belongs to different uploader', async () => {
    mockPrisma.file.findFirst.mockResolvedValue(null);
    const result = await File.delete(1, 999);
    expect(result).toBeNull();
  });
});
