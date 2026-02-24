/**
 * User Model Unit Tests
 */
import { jest, describe, test, expect, beforeEach } from '@jest/globals';

const mockQuery = jest.fn();
jest.unstable_mockModule('../../../src/config/database.js', () => ({
  query: mockQuery,
  getClient: jest.fn(),
  default: { on: jest.fn(), query: mockQuery },
}));

const { default: User } = await import('../../../src/models/User.js');

const fakeUser = {
  id: 1,
  username: 'tester',
  email: 'tester@example.com',
  avatar: null,
  bio: null,
  status: 'online',
  is_online: true,
  is_admin: false,
  last_seen: null,
  created_at: new Date().toISOString(),
};

beforeEach(() => {
  mockQuery.mockReset();
});

describe('User.findById', () => {
  test('should return a user when found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [fakeUser] });
    const result = await User.findById(1);
    expect(result).toEqual(fakeUser);
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  test('should return null when user not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const result = await User.findById(999);
    expect(result).toBeNull();
  });
});

describe('User.findByUsername', () => {
  test('should return the matching user', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [fakeUser] });
    const result = await User.findByUsername('tester');
    expect(result).toEqual(fakeUser);
  });

  test('should return null when username not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const result = await User.findByUsername('ghost');
    expect(result).toBeNull();
  });
});

describe('User.findByEmail', () => {
  test('should return the matching user', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [fakeUser] });
    const result = await User.findByEmail('tester@example.com');
    expect(result).toEqual(fakeUser);
  });

  test('should return null when email not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const result = await User.findByEmail('nobody@example.com');
    expect(result).toBeNull();
  });
});

describe('User.create', () => {
  test('should return the newly created user', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [fakeUser] });
    const result = await User.create({
      username: 'tester',
      email: 'tester@example.com',
      passwordHash: 'hashedpw',
    });
    expect(result).toEqual(fakeUser);
    expect(mockQuery).toHaveBeenCalledTimes(1);
    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toMatch(/INSERT INTO users/i);
    expect(params).toContain('tester');
    expect(params).toContain('tester@example.com');
    expect(params).toContain('hashedpw');
  });
});

describe('User.update', () => {
  test('should return updated user on valid fields', async () => {
    const updated = { ...fakeUser, bio: 'New bio' };
    mockQuery.mockResolvedValueOnce({ rows: [updated] });
    const result = await User.update(1, { bio: 'New bio' });
    expect(result.bio).toBe('New bio');
  });

  test('should call findById when no valid fields supplied', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [fakeUser] });
    const result = await User.update(1, { unknown_field: 'ignored' });
    // Falls back to findById internally — still returns user
    expect(result).toEqual(fakeUser);
  });

  test('should return null when user not found after update', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const result = await User.update(999, { bio: 'ghost' });
    expect(result).toBeNull();
  });
});

describe('User.updatePassword', () => {
  test('should call query with new hash and id', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await User.updatePassword(1, 'newhash');
    expect(mockQuery).toHaveBeenCalledTimes(1);
    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toMatch(/UPDATE users SET password_hash/i);
    expect(params).toContain('newhash');
    expect(params).toContain(1);
  });
});

describe('User.setOnline', () => {
  test('should call query with isOnline=true', async () => {
    mockQuery.mockResolvedValueOnce({});
    await User.setOnline(1, true);
    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toMatch(/UPDATE users SET is_online/i);
    expect(params).toContain(true);
    expect(params).toContain(1);
  });

  test('should call query with isOnline=false', async () => {
    mockQuery.mockResolvedValueOnce({});
    await User.setOnline(1, false);
    const [, params] = mockQuery.mock.calls[0];
    expect(params).toContain(false);
  });
});

describe('User.findAll', () => {
  test('should return array of users with default pagination', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [fakeUser] });
    const result = await User.findAll();
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(1);
    const [, params] = mockQuery.mock.calls[0];
    expect(params[0]).toBe(50);  // default limit
    expect(params[1]).toBe(0);   // default offset
  });

  test('should forward custom limit and offset', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await User.findAll({ limit: 10, offset: 20 });
    const [, params] = mockQuery.mock.calls[0];
    expect(params[0]).toBe(10);
    expect(params[1]).toBe(20);
  });
});

describe('User.search', () => {
  test('should pass term as prefix pattern', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [fakeUser] });
    const result = await User.search('test');
    expect(result).toHaveLength(1);
    const [, params] = mockQuery.mock.calls[0];
    expect(params[0]).toBe('test%');
  });

  test('should return empty array when no matches', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const result = await User.search('zzz');
    expect(result).toHaveLength(0);
  });

  test('should forward custom limit', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await User.search('abc', { limit: 5 });
    const [, params] = mockQuery.mock.calls[0];
    expect(params[1]).toBe(5);
  });
});

describe('User.findByIdWithPassword', () => {
  test('should return user including password_hash', async () => {
    const withPw = { ...fakeUser, password_hash: 'secret' };
    mockQuery.mockResolvedValueOnce({ rows: [withPw] });
    const result = await User.findByIdWithPassword(1);
    expect(result.password_hash).toBe('secret');
  });

  test('should return null when not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const result = await User.findByIdWithPassword(999);
    expect(result).toBeNull();
  });
});
