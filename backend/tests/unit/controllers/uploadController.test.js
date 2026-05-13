/**
 * Upload Controller Unit Tests
 */
import { jest, describe, test, expect, beforeEach } from '@jest/globals';

// Mock prisma
jest.unstable_mockModule('#config/prisma.js', () => ({
  default: { file: { create: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), delete: jest.fn() } },
}));

// Mock File model
const mockFile = {
  getByUploader: jest.fn(),
  delete: jest.fn(),
};
jest.unstable_mockModule('../../../src/models/File.js', () => ({ default: mockFile }));

// Mock uploadService
const mockSaveFileRecord = jest.fn();
const mockDeleteFileFromDisk = jest.fn();
const mockValidateFileMagicBytes = jest.fn().mockResolvedValue(true);
jest.unstable_mockModule('../../../src/services/uploadService.js', () => ({
  saveFileRecord: mockSaveFileRecord,
  deleteFileFromDisk: mockDeleteFileFromDisk,
  validateFileMagicBytes: mockValidateFileMagicBytes,
  upload: { single: jest.fn(), array: jest.fn() },
  default: { upload: { single: jest.fn(), array: jest.fn() }, saveFileRecord: mockSaveFileRecord, deleteFileFromDisk: mockDeleteFileFromDisk, validateFileMagicBytes: mockValidateFileMagicBytes },
}));

const { uploadFiles, listMyFiles, deleteFile } = await import('../../../src/controllers/uploadController.js');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('uploadFiles', () => {
  test('should return 400 when no files are uploaded', async () => {
    const req = { files: [], file: null, user: { id: 1 } };
    const res = mockRes();
    const next = jest.fn();
    await uploadFiles(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: { message: 'No file uploaded' } });
  });

  test('should return 400 when files is undefined and file is undefined', async () => {
    const req = { user: { id: 1 } };
    const res = mockRes();
    const next = jest.fn();
    await uploadFiles(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('should save multiple files and return 201', async () => {
    const files = [
      { filename: 'a.png', originalname: 'a.png', mimetype: 'image/png', size: 100 },
      { filename: 'b.png', originalname: 'b.png', mimetype: 'image/png', size: 200 },
    ];
    const req = { files, user: { id: 1 } };
    const res = mockRes();
    const next = jest.fn();
    mockSaveFileRecord.mockResolvedValueOnce({ id: 1 }).mockResolvedValueOnce({ id: 2 });
    await uploadFiles(req, res, next);
    expect(mockSaveFileRecord).toHaveBeenCalledTimes(2);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ files: [{ id: 1 }, { id: 2 }] });
  });

  test('should handle single file upload via req.file', async () => {
    const file = { filename: 'a.png', originalname: 'a.png', mimetype: 'image/png', size: 100 };
    const req = { file, user: { id: 1 } };
    const res = mockRes();
    const next = jest.fn();
    mockSaveFileRecord.mockResolvedValue({ id: 1 });
    await uploadFiles(req, res, next);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ files: [{ id: 1 }] });
  });

  test('should call next on error', async () => {
    const req = { files: [{ filename: 'a.png' }], user: { id: 1 } };
    const res = mockRes();
    const next = jest.fn();
    const err = new Error('DB error');
    mockSaveFileRecord.mockRejectedValue(err);
    await uploadFiles(req, res, next);
    expect(next).toHaveBeenCalledWith(err);
  });
});

describe('listMyFiles', () => {
  test('should return user files with default pagination', async () => {
    const files = [{ id: 1 }, { id: 2 }];
    mockFile.getByUploader.mockResolvedValue(files);
    const req = { user: { id: 1 }, query: {} };
    const res = mockRes();
    const next = jest.fn();
    await listMyFiles(req, res, next);
    expect(mockFile.getByUploader).toHaveBeenCalledWith(1, { limit: 50, offset: 0 });
    expect(res.json).toHaveBeenCalledWith({ files });
  });

  test('should use query params for pagination', async () => {
    mockFile.getByUploader.mockResolvedValue([]);
    const req = { user: { id: 1 }, query: { limit: '10', offset: '5' } };
    const res = mockRes();
    const next = jest.fn();
    await listMyFiles(req, res, next);
    expect(mockFile.getByUploader).toHaveBeenCalledWith(1, { limit: 10, offset: 5 });
  });

  test('should call next on error', async () => {
    mockFile.getByUploader.mockRejectedValue(new Error('fail'));
    const req = { user: { id: 1 }, query: {} };
    const res = mockRes();
    const next = jest.fn();
    await listMyFiles(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});

describe('deleteFile', () => {
  test('should delete file and return success message', async () => {
    const record = { id: 1, storedName: 'abc.png' };
    mockFile.delete.mockResolvedValue(record);
    mockDeleteFileFromDisk.mockResolvedValue(undefined);
    const req = { params: { id: '1' }, user: { id: 5 } };
    const res = mockRes();
    const next = jest.fn();
    await deleteFile(req, res, next);
    expect(mockFile.delete).toHaveBeenCalledWith(1, 5);
    expect(mockDeleteFileFromDisk).toHaveBeenCalledWith('abc.png');
    expect(res.json).toHaveBeenCalledWith({ message: 'File deleted' });
  });

  test('should return 404 when file not found', async () => {
    mockFile.delete.mockResolvedValue(null);
    const req = { params: { id: '999' }, user: { id: 5 } };
    const res = mockRes();
    const next = jest.fn();
    await deleteFile(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: { message: 'File not found or not yours' } });
  });

  test('should call next on error', async () => {
    mockFile.delete.mockRejectedValue(new Error('fail'));
    const req = { params: { id: '1' }, user: { id: 5 } };
    const res = mockRes();
    const next = jest.fn();
    await deleteFile(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
