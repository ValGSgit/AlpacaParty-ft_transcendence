/**
 * UploadService Unit Tests
 */
import { jest, describe, test, expect, beforeEach } from '@jest/globals';

// Mock fs before anything else
const mockMkdirSync = jest.fn();
const mockUnlink = jest.fn();
jest.unstable_mockModule('fs', () => ({
  default: {
    mkdirSync: mockMkdirSync,
    promises: { unlink: mockUnlink },
  },
  mkdirSync: mockMkdirSync,
  promises: { unlink: mockUnlink },
}));

// Mock multer
const mockMulterInstance = { single: jest.fn(), array: jest.fn() };
const mockMulter = jest.fn().mockReturnValue(mockMulterInstance);
mockMulter.diskStorage = jest.fn().mockReturnValue({});
jest.unstable_mockModule('multer', () => ({ default: mockMulter }));

// Mock crypto
jest.unstable_mockModule('crypto', () => ({
  default: { randomBytes: jest.fn().mockReturnValue({ toString: () => 'abcdef01' }) },
  randomBytes: jest.fn().mockReturnValue({ toString: () => 'abcdef01' }),
}));

// Mock config
jest.unstable_mockModule('../../../src/config/index.js', () => ({
  default: {
    uploads: {
      dir: '/tmp/test-uploads',
      maxSizeBytes: 10 * 1024 * 1024,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
    },
  },
}));

// Mock prisma
const mockPrisma = {
  file: { create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), findFirst: jest.fn(), delete: jest.fn() },
};
jest.unstable_mockModule('../../../src/config/prisma.js', () => ({ default: mockPrisma }));

// Mock File model
const mockFile = { create: jest.fn() };
jest.unstable_mockModule('../../../src/models/File.js', () => ({ default: mockFile }));

const { saveFileRecord, deleteFileFromDisk } = await import('../../../src/services/uploadService.js');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('saveFileRecord', () => {
  test('should create a file record via File model', async () => {
    const multerFile = {
      filename: '12345-abcdef01.png',
      originalname: 'photo.png',
      mimetype: 'image/png',
      size: 2048,
    };
    const fakeRecord = { id: 1, url: '/uploads/12345-abcdef01.png' };
    mockFile.create.mockResolvedValue(fakeRecord);
    const result = await saveFileRecord(1, multerFile);
    expect(mockFile.create).toHaveBeenCalledWith({
      uploaderId: 1,
      originalName: 'photo.png',
      storedName: '12345-abcdef01.png',
      mimeType: 'image/png',
      sizeBytes: 2048,
      url: '/uploads/12345-abcdef01.png',
    });
    expect(result).toEqual(fakeRecord);
  });
});

describe('deleteFileFromDisk', () => {
  test('should attempt to unlink the file', async () => {
    mockUnlink.mockResolvedValue(undefined);
    await deleteFileFromDisk('12345-abcdef01.png');
    expect(mockUnlink).toHaveBeenCalledWith('/tmp/test-uploads/12345-abcdef01.png');
  });

  test('should not throw when file does not exist', async () => {
    mockUnlink.mockRejectedValue(new Error('ENOENT'));
    await expect(deleteFileFromDisk('nonexistent.png')).resolves.not.toThrow();
  });
});

describe('multer configuration', () => {
  test('should call mkdirSync with recursive option on module load', () => {
    expect(mockMkdirSync).toHaveBeenCalledWith('/tmp/test-uploads', { recursive: true });
  });

  test('should create multer with storage, fileFilter, and limits', () => {
    expect(mockMulter).toHaveBeenCalledWith(expect.objectContaining({
      limits: { fileSize: 10 * 1024 * 1024 },
    }));
  });
});
