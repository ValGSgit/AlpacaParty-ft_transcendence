/**
 * DataExportService Unit Tests
 */
import { jest, describe, test, expect, beforeEach } from '@jest/globals';

// Mock prisma
jest.unstable_mockModule('#config/prisma.js', () => ({
  default: { user: { findUnique: jest.fn() } },
}));

// Mock User model
const mockUser = { getFullExport: jest.fn() };
jest.unstable_mockModule('../../../src/models/User.js', () => ({ default: mockUser }));

const { default: DataExportService } = await import('../../../src/services/dataExportService.js');

const sampleExportData = {
  profile: { id: 1, username: 'alice', email: 'alice@example.com' },
  friends: [
    { id: 2, username: 'bob' },
    { id: 3, username: 'charlie' },
  ],
  posts: [
    { id: 10, content: 'Hello world' },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUser.getFullExport.mockResolvedValue(sampleExportData);
});

describe('DataExportService.exportUserData', () => {
  describe('JSON format', () => {
    test('should return JSON stringified data', async () => {
      const result = await DataExportService.exportUserData(1, 'json');
      expect(result.contentType).toBe('application/json');
      expect(result.extension).toBe('json');
      const parsed = JSON.parse(result.data);
      expect(parsed.profile.username).toBe('alice');
      expect(parsed.friends).toHaveLength(2);
    });

    test('should default to JSON when no format is specified', async () => {
      const result = await DataExportService.exportUserData(1);
      expect(result.contentType).toBe('application/json');
      expect(result.extension).toBe('json');
    });

    test('should default to JSON for unknown format', async () => {
      const result = await DataExportService.exportUserData(1, 'yaml');
      expect(result.contentType).toBe('application/json');
    });
  });

  describe('CSV format', () => {
    test('should return CSV with section headers', async () => {
      const result = await DataExportService.exportUserData(1, 'csv');
      expect(result.contentType).toBe('text/csv');
      expect(result.extension).toBe('csv');
      expect(result.data).toContain('# profile');
      expect(result.data).toContain('# friends');
      expect(result.data).toContain('# posts');
    });

    test('should include CSV headers from object keys', async () => {
      const result = await DataExportService.exportUserData(1, 'csv');
      expect(result.data).toContain('id,username');
    });

    test('should handle values with quotes', async () => {
      mockUser.getFullExport.mockResolvedValue({
        posts: [{ id: 1, content: 'He said "hello"' }],
      });
      const result = await DataExportService.exportUserData(1, 'csv');
      expect(result.data).toContain('""hello""');
    });
  });

  describe('XML format', () => {
    test('should return valid XML', async () => {
      const result = await DataExportService.exportUserData(1, 'xml');
      expect(result.contentType).toBe('application/xml');
      expect(result.extension).toBe('xml');
      expect(result.data).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(result.data).toContain('<userExport>');
    });

    test('should escape XML special characters', async () => {
      mockUser.getFullExport.mockResolvedValue({
        posts: [{ content: '<script>alert("xss")</script>' }],
      });
      const result = await DataExportService.exportUserData(1, 'xml');
      expect(result.data).toContain('&lt;script&gt;');
      expect(result.data).not.toContain('<script>');
    });
  });

  test('should call User.getFullExport with the userId', async () => {
    await DataExportService.exportUserData(42, 'json');
    expect(mockUser.getFullExport).toHaveBeenCalledWith(42);
  });

  test('should handle empty export data', async () => {
    mockUser.getFullExport.mockResolvedValue({});
    const result = await DataExportService.exportUserData(1, 'json');
    expect(JSON.parse(result.data)).toEqual({});
  });
});
