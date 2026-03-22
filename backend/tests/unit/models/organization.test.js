/**
 * Organization Model Unit Tests
 */
import { jest, describe, test, expect, beforeEach } from '@jest/globals';

const mockPrisma = {
  organization: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  organizationMember: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    upsert: jest.fn(),
    deleteMany: jest.fn(),
  },
  $transaction: jest.fn(),
};

jest.unstable_mockModule('../../../src/config/prisma.js', () => ({ default: mockPrisma }));

const { default: Organization } = await import('../../../src/models/Organization.js');

beforeEach(() => jest.clearAllMocks());

// ── create ───────────────────────────────────────────────────────────────────
describe('create', () => {
  test('creates org and owner member in transaction', async () => {
    const org = { id: 1, name: 'TestOrg' };
    mockPrisma.$transaction.mockImplementation(async (cb) => {
      const tx = {
        organization: { create: jest.fn().mockResolvedValue(org) },
        organizationMember: { create: jest.fn().mockResolvedValue({}) },
      };
      const result = await cb(tx);
      expect(tx.organization.create).toHaveBeenCalledWith({
        data: { name: 'TestOrg', description: 'A test org', ownerId: 1, avatar: '/avatars/default-org.svg' },
      });
      expect(tx.organizationMember.create).toHaveBeenCalledWith({
        data: { orgId: 1, userId: 1, role: 'owner' },
      });
      return result;
    });
    const result = await Organization.create({ name: 'TestOrg', description: 'A test org', ownerId: 1 });
    expect(result).toEqual(org);
    expect(mockPrisma.$transaction).toHaveBeenCalled();
  });

  test('uses default avatar when none provided', async () => {
    mockPrisma.$transaction.mockImplementation(async (cb) => {
      const tx = {
        organization: { create: jest.fn().mockResolvedValue({ id: 1 }) },
        organizationMember: { create: jest.fn().mockResolvedValue({}) },
      };
      return cb(tx);
    });
    await Organization.create({ name: 'Org', ownerId: 1 });
    expect(mockPrisma.$transaction).toHaveBeenCalled();
  });

  test('uses custom avatar when provided', async () => {
    mockPrisma.$transaction.mockImplementation(async (cb) => {
      const tx = {
        organization: { create: jest.fn().mockResolvedValue({ id: 1 }) },
        organizationMember: { create: jest.fn().mockResolvedValue({}) },
      };
      const result = await cb(tx);
      expect(tx.organization.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ avatar: '/custom.png' }) }),
      );
      return result;
    });
    await Organization.create({ name: 'Org', ownerId: 1, avatar: '/custom.png' });
  });
});

// ── findById ─────────────────────────────────────────────────────────────────
describe('findById', () => {
  test('finds org by id', async () => {
    const org = { id: 1, name: 'Org1' };
    mockPrisma.organization.findUnique.mockResolvedValue(org);
    const result = await Organization.findById(1);
    expect(mockPrisma.organization.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(result).toEqual(org);
  });

  test('returns null when not found', async () => {
    mockPrisma.organization.findUnique.mockResolvedValue(null);
    const result = await Organization.findById(999);
    expect(result).toBeNull();
  });

  test('converts string id to number', async () => {
    mockPrisma.organization.findUnique.mockResolvedValue(null);
    await Organization.findById('5');
    expect(mockPrisma.organization.findUnique).toHaveBeenCalledWith({ where: { id: 5 } });
  });
});

// ── update ───────────────────────────────────────────────────────────────────
describe('update', () => {
  test('updates only provided fields', async () => {
    mockPrisma.organization.update.mockResolvedValue({ id: 1, name: 'NewName' });
    const result = await Organization.update(1, { name: 'NewName' });
    expect(mockPrisma.organization.update).toHaveBeenCalledWith({
      where: { id: 1 }, data: { name: 'NewName' },
    });
    expect(result.name).toBe('NewName');
  });

  test('updates description when provided', async () => {
    mockPrisma.organization.update.mockResolvedValue({ id: 1, description: 'New desc' });
    await Organization.update(1, { description: 'New desc' });
    expect(mockPrisma.organization.update).toHaveBeenCalledWith({
      where: { id: 1 }, data: { description: 'New desc' },
    });
  });

  test('updates avatar when provided', async () => {
    mockPrisma.organization.update.mockResolvedValue({ id: 1, avatar: '/new.png' });
    await Organization.update(1, { avatar: '/new.png' });
    expect(mockPrisma.organization.update).toHaveBeenCalledWith({
      where: { id: 1 }, data: { avatar: '/new.png' },
    });
  });

  test('returns existing org when no fields to update', async () => {
    mockPrisma.organization.findUnique.mockResolvedValue({ id: 1, name: 'Org' });
    const result = await Organization.update(1, {});
    expect(mockPrisma.organization.update).not.toHaveBeenCalled();
    expect(result.name).toBe('Org');
  });

  test('updates multiple fields at once', async () => {
    mockPrisma.organization.update.mockResolvedValue({ id: 1, name: 'X', description: 'Y', avatar: '/z.png' });
    await Organization.update(1, { name: 'X', description: 'Y', avatar: '/z.png' });
    expect(mockPrisma.organization.update).toHaveBeenCalledWith({
      where: { id: 1 }, data: { name: 'X', description: 'Y', avatar: '/z.png' },
    });
  });
});

// ── delete ───────────────────────────────────────────────────────────────────
describe('delete', () => {
  test('returns true on successful delete', async () => {
    mockPrisma.organization.delete.mockResolvedValue({});
    const result = await Organization.delete(1);
    expect(result).toBe(true);
    expect(mockPrisma.organization.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  test('returns false on failure', async () => {
    mockPrisma.organization.delete.mockRejectedValue(new Error('not found'));
    const result = await Organization.delete(999);
    expect(result).toBe(false);
  });
});

// ── addMember ────────────────────────────────────────────────────────────────
describe('addMember', () => {
  test('uses upsert to add member', async () => {
    const member = { orgId: 1, userId: 2, role: 'member' };
    mockPrisma.organizationMember.upsert.mockResolvedValue(member);
    const result = await Organization.addMember(1, 2);
    expect(mockPrisma.organizationMember.upsert).toHaveBeenCalledWith({
      where: { orgId_userId: { orgId: 1, userId: 2 } },
      update: {},
      create: { orgId: 1, userId: 2, role: 'member' },
    });
    expect(result).toEqual(member);
  });

  test('uses custom role', async () => {
    mockPrisma.organizationMember.upsert.mockResolvedValue({});
    await Organization.addMember(1, 2, 'admin');
    expect(mockPrisma.organizationMember.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: { orgId: 1, userId: 2, role: 'admin' } }),
    );
  });
});

// ── removeMember ─────────────────────────────────────────────────────────────
describe('removeMember', () => {
  test('deletes member record', async () => {
    mockPrisma.organizationMember.deleteMany.mockResolvedValue({ count: 1 });
    await Organization.removeMember(1, 2);
    expect(mockPrisma.organizationMember.deleteMany).toHaveBeenCalledWith({
      where: { orgId: 1, userId: 2 },
    });
  });
});

// ── getMembers ───────────────────────────────────────────────────────────────
describe('getMembers', () => {
  test('returns shaped member list', async () => {
    mockPrisma.organizationMember.findMany.mockResolvedValue([
      { user: { id: 1, username: 'alice', avatar: '/a.png', isOnline: true }, role: 'owner', joinedAt: '2024-01-01' },
      { user: { id: 2, username: 'bob', avatar: '/b.png', isOnline: false }, role: 'member', joinedAt: '2024-02-01' },
    ]);
    const members = await Organization.getMembers(1);
    expect(members).toHaveLength(2);
    expect(members[0]).toEqual({ id: 1, username: 'alice', avatar: '/a.png', isOnline: true, role: 'owner', joinedAt: '2024-01-01' });
  });

  test('applies pagination', async () => {
    mockPrisma.organizationMember.findMany.mockResolvedValue([]);
    await Organization.getMembers(1, { limit: 10, offset: 5 });
    expect(mockPrisma.organizationMember.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 10, skip: 5 }),
    );
  });
});

// ── isMember ─────────────────────────────────────────────────────────────────
describe('isMember', () => {
  test('returns membership when found', async () => {
    mockPrisma.organizationMember.findUnique.mockResolvedValue({ role: 'owner' });
    const result = await Organization.isMember(1, 1);
    expect(result).toEqual({ role: 'owner' });
  });

  test('returns null when not a member', async () => {
    mockPrisma.organizationMember.findUnique.mockResolvedValue(null);
    const result = await Organization.isMember(1, 99);
    expect(result).toBeNull();
  });
});

// ── getUserOrgs ──────────────────────────────────────────────────────────────
describe('getUserOrgs', () => {
  test('returns user orgs with role', async () => {
    mockPrisma.organizationMember.findMany.mockResolvedValue([
      { org: { id: 1, name: 'Org1' }, role: 'owner' },
      { org: { id: 2, name: 'Org2' }, role: 'member' },
    ]);
    const orgs = await Organization.getUserOrgs(1);
    expect(orgs).toHaveLength(2);
    expect(orgs[0]).toEqual({ id: 1, name: 'Org1', role: 'owner' });
  });
});

// ── findAll ──────────────────────────────────────────────────────────────────
describe('findAll', () => {
  test('returns orgs with member count', async () => {
    mockPrisma.organization.findMany.mockResolvedValue([
      { id: 1, name: 'Org1', _count: { members: 5 } },
      { id: 2, name: 'Org2', _count: { members: 3 } },
    ]);
    const orgs = await Organization.findAll({ limit: 10, offset: 0 });
    expect(orgs).toHaveLength(2);
    expect(orgs[0].memberCount).toBe(5);
    expect(orgs[0]._count).toBeUndefined();
  });

  test('applies default pagination', async () => {
    mockPrisma.organization.findMany.mockResolvedValue([]);
    await Organization.findAll();
    expect(mockPrisma.organization.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 50, skip: 0 }),
    );
  });

  test('applies custom pagination', async () => {
    mockPrisma.organization.findMany.mockResolvedValue([]);
    await Organization.findAll({ limit: 5, offset: 10 });
    expect(mockPrisma.organization.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 5, skip: 10 }),
    );
  });
});

// ── search ───────────────────────────────────────────────────────────────────
describe('search', () => {
  test('searches by name and description', async () => {
    mockPrisma.organization.findMany.mockResolvedValue([
      { id: 1, name: 'Alpaca Club', _count: { members: 10 } },
    ]);
    const orgs = await Organization.search('alpaca');
    expect(mockPrisma.organization.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { name: { contains: 'alpaca', mode: 'insensitive' } },
            { description: { contains: 'alpaca', mode: 'insensitive' } },
          ],
        },
      }),
    );
    expect(orgs[0].memberCount).toBe(10);
  });

  test('applies default limit', async () => {
    mockPrisma.organization.findMany.mockResolvedValue([]);
    await Organization.search('test');
    expect(mockPrisma.organization.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 20 }),
    );
  });

  test('applies custom limit', async () => {
    mockPrisma.organization.findMany.mockResolvedValue([]);
    await Organization.search('test', { limit: 5 });
    expect(mockPrisma.organization.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 5 }),
    );
  });
});
