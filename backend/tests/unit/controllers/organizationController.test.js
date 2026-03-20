/**
 * Organization Controller Unit Tests
 */
import { jest, describe, test, expect, beforeEach } from '@jest/globals';

const mockOrganization = {
  findAll: jest.fn(),
  search: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  getUserOrgs: jest.fn(),
  getMembers: jest.fn(),
  isMember: jest.fn(),
  addMember: jest.fn(),
  removeMember: jest.fn(),
};
const mockNotificationService = {
  orgInvite: jest.fn().mockResolvedValue(undefined),
};
const mockGamificationService = {
  checkOrgAchievements: jest.fn().mockResolvedValue(undefined),
};

jest.unstable_mockModule('../../../src/models/Organization.js', () => ({ default: mockOrganization }));
jest.unstable_mockModule('../../../src/services/notificationService.js', () => ({ default: mockNotificationService }));
jest.unstable_mockModule('../../../src/services/gamificationService.js', () => ({ default: mockGamificationService }));

const {
  listOrgs, listMyOrgs, getOrg, createOrg, updateOrg, deleteOrg, addMember, removeMember,
} = await import('../../../src/controllers/organizationController.js');

function createReqRes(overrides = {}) {
  const req = { user: { id: 1, username: 'tester', isAdmin: false }, params: {}, query: {}, body: {}, ...overrides };
  const res = {
    _status: 200, _json: null,
    status(code) { res._status = code; return res; },
    json(body) { res._json = body; return res; },
  };
  return { req, res, next: jest.fn() };
}

beforeEach(() => jest.clearAllMocks());

// ── listOrgs ─────────────────────────────────────────────────────────────────
describe('listOrgs', () => {
  test('returns all orgs with default pagination', async () => {
    const orgs = [{ id: 1, name: 'Org1' }];
    mockOrganization.findAll.mockResolvedValue(orgs);
    const { req, res, next } = createReqRes();
    await listOrgs(req, res, next);
    expect(mockOrganization.findAll).toHaveBeenCalledWith({ limit: 50, offset: 0 });
    expect(res._json.organizations).toEqual(orgs);
  });

  test('uses search when provided', async () => {
    mockOrganization.search.mockResolvedValue([{ id: 1, name: 'Alpaca' }]);
    const { req, res, next } = createReqRes({ query: { search: 'alp', limit: '10' } });
    await listOrgs(req, res, next);
    expect(mockOrganization.search).toHaveBeenCalledWith('alp', { limit: 10 });
  });

  test('calls next on error', async () => {
    const err = new Error('fail');
    mockOrganization.findAll.mockRejectedValue(err);
    const { req, res, next } = createReqRes();
    await listOrgs(req, res, next);
    expect(next).toHaveBeenCalledWith(err);
  });
});

// ── listMyOrgs ───────────────────────────────────────────────────────────────
describe('listMyOrgs', () => {
  test('returns user orgs', async () => {
    const orgs = [{ id: 1, name: 'MyOrg', role: 'owner' }];
    mockOrganization.getUserOrgs.mockResolvedValue(orgs);
    const { req, res, next } = createReqRes();
    await listMyOrgs(req, res, next);
    expect(mockOrganization.getUserOrgs).toHaveBeenCalledWith(1);
    expect(res._json.organizations).toEqual(orgs);
  });

  test('calls next on error', async () => {
    const err = new Error('fail');
    mockOrganization.getUserOrgs.mockRejectedValue(err);
    const { req, res, next } = createReqRes();
    await listMyOrgs(req, res, next);
    expect(next).toHaveBeenCalledWith(err);
  });
});

// ── getOrg ───────────────────────────────────────────────────────────────────
describe('getOrg', () => {
  test('returns org with members', async () => {
    mockOrganization.findById.mockResolvedValue({ id: 1, name: 'Org1' });
    mockOrganization.getMembers.mockResolvedValue([{ id: 1, username: 'alice', role: 'owner' }]);
    const { req, res, next } = createReqRes({ params: { id: '1' } });
    await getOrg(req, res, next);
    expect(res._json.organization.name).toBe('Org1');
    expect(res._json.members).toHaveLength(1);
  });

  test('returns 404 when org not found', async () => {
    mockOrganization.findById.mockResolvedValue(null);
    const { req, res, next } = createReqRes({ params: { id: '999' } });
    await getOrg(req, res, next);
    expect(res._status).toBe(404);
    expect(res._json.error.message).toBe('Organization not found');
  });

  test('calls next on error', async () => {
    const err = new Error('fail');
    mockOrganization.findById.mockRejectedValue(err);
    const { req, res, next } = createReqRes({ params: { id: '1' } });
    await getOrg(req, res, next);
    expect(next).toHaveBeenCalledWith(err);
  });
});

// ── createOrg ────────────────────────────────────────────────────────────────
describe('createOrg', () => {
  test('creates org successfully', async () => {
    const org = { id: 1, name: 'NewOrg' };
    mockOrganization.create.mockResolvedValue(org);
    const { req, res, next } = createReqRes({ body: { name: 'NewOrg', description: 'A new org' } });
    await createOrg(req, res, next);
    expect(res._status).toBe(201);
    expect(res._json.organization).toEqual(org);
    expect(mockOrganization.create).toHaveBeenCalledWith({
      name: 'NewOrg', description: 'A new org', ownerId: 1, avatar: null,
    });
    expect(mockGamificationService.checkOrgAchievements).toHaveBeenCalledWith(1);
  });

  test('returns 400 when name is missing', async () => {
    const { req, res, next } = createReqRes({ body: {} });
    await createOrg(req, res, next);
    expect(res._status).toBe(400);
    expect(res._json.error.message).toBe('Organization name is required');
  });

  test('returns 400 when name is empty', async () => {
    const { req, res, next } = createReqRes({ body: { name: '   ' } });
    await createOrg(req, res, next);
    expect(res._status).toBe(400);
    expect(res._json.error.message).toBe('Organization name is required');
  });

  test('returns 400 when name exceeds 100 chars', async () => {
    const { req, res, next } = createReqRes({ body: { name: 'a'.repeat(101) } });
    await createOrg(req, res, next);
    expect(res._status).toBe(400);
    expect(res._json.error.message).toBe('Organization name must be 100 characters or fewer');
  });

  test('returns 400 when description exceeds 2000 chars', async () => {
    const { req, res, next } = createReqRes({ body: { name: 'Org', description: 'a'.repeat(2001) } });
    await createOrg(req, res, next);
    expect(res._status).toBe(400);
    expect(res._json.error.message).toBe('Description must be 2000 characters or fewer');
  });

  test('returns 400 when avatar is invalid', async () => {
    const { req, res, next } = createReqRes({ body: { name: 'Org', avatar: 123 } });
    await createOrg(req, res, next);
    expect(res._status).toBe(400);
    expect(res._json.error.message).toBe('Invalid avatar URL');
  });

  test('returns 400 when avatar URL exceeds 2048 chars', async () => {
    const { req, res, next } = createReqRes({ body: { name: 'Org', avatar: 'a'.repeat(2049) } });
    await createOrg(req, res, next);
    expect(res._status).toBe(400);
    expect(res._json.error.message).toBe('Invalid avatar URL');
  });

  test('calls next on error', async () => {
    const err = new Error('fail');
    mockOrganization.create.mockRejectedValue(err);
    const { req, res, next } = createReqRes({ body: { name: 'Org' } });
    await createOrg(req, res, next);
    expect(next).toHaveBeenCalledWith(err);
  });
});

// ── updateOrg ────────────────────────────────────────────────────────────────
describe('updateOrg', () => {
  test('updates org when user is owner', async () => {
    mockOrganization.isMember.mockResolvedValue({ role: 'owner' });
    mockOrganization.update.mockResolvedValue({ id: 1, name: 'Updated' });
    const { req, res, next } = createReqRes({ params: { id: '1' }, body: { name: 'Updated' } });
    await updateOrg(req, res, next);
    expect(res._json.organization.name).toBe('Updated');
  });

  test('updates org when user is admin', async () => {
    mockOrganization.isMember.mockResolvedValue({ role: 'admin' });
    mockOrganization.update.mockResolvedValue({ id: 1, name: 'Updated' });
    const { req, res, next } = createReqRes({ params: { id: '1' }, body: { name: 'Updated' } });
    await updateOrg(req, res, next);
    expect(res._json.organization.name).toBe('Updated');
  });

  test('returns 403 when user is regular member', async () => {
    mockOrganization.isMember.mockResolvedValue({ role: 'member' });
    const { req, res, next } = createReqRes({ params: { id: '1' }, body: { name: 'Updated' } });
    await updateOrg(req, res, next);
    expect(res._status).toBe(403);
  });

  test('returns 403 when user is not a member', async () => {
    mockOrganization.isMember.mockResolvedValue(null);
    const { req, res, next } = createReqRes({ params: { id: '1' }, body: { name: 'Updated' } });
    await updateOrg(req, res, next);
    expect(res._status).toBe(403);
  });

  test('returns 400 for empty name', async () => {
    mockOrganization.isMember.mockResolvedValue({ role: 'owner' });
    const { req, res, next } = createReqRes({ params: { id: '1' }, body: { name: '' } });
    await updateOrg(req, res, next);
    expect(res._status).toBe(400);
    expect(res._json.error.message).toBe('Name must be between 1 and 100 characters');
  });

  test('returns 400 for name exceeding 100 chars', async () => {
    mockOrganization.isMember.mockResolvedValue({ role: 'owner' });
    const { req, res, next } = createReqRes({ params: { id: '1' }, body: { name: 'a'.repeat(101) } });
    await updateOrg(req, res, next);
    expect(res._status).toBe(400);
  });

  test('returns 400 for description exceeding 2000 chars', async () => {
    mockOrganization.isMember.mockResolvedValue({ role: 'owner' });
    const { req, res, next } = createReqRes({ params: { id: '1' }, body: { description: 'a'.repeat(2001) } });
    await updateOrg(req, res, next);
    expect(res._status).toBe(400);
  });

  test('returns 400 for invalid avatar', async () => {
    mockOrganization.isMember.mockResolvedValue({ role: 'owner' });
    const { req, res, next } = createReqRes({ params: { id: '1' }, body: { avatar: 123 } });
    await updateOrg(req, res, next);
    expect(res._status).toBe(400);
    expect(res._json.error.message).toBe('Invalid avatar URL');
  });

  test('calls next on error', async () => {
    const err = new Error('fail');
    mockOrganization.isMember.mockRejectedValue(err);
    const { req, res, next } = createReqRes({ params: { id: '1' }, body: { name: 'X' } });
    await updateOrg(req, res, next);
    expect(next).toHaveBeenCalledWith(err);
  });
});

// ── deleteOrg ────────────────────────────────────────────────────────────────
describe('deleteOrg', () => {
  test('deletes org when user is owner', async () => {
    mockOrganization.findById.mockResolvedValue({ id: 1, ownerId: 1 });
    mockOrganization.delete.mockResolvedValue(true);
    const { req, res, next } = createReqRes({ params: { id: '1' } });
    await deleteOrg(req, res, next);
    expect(res._json.message).toBe('Organization deleted');
  });

  test('deletes org when user is admin', async () => {
    mockOrganization.findById.mockResolvedValue({ id: 1, ownerId: 99 });
    mockOrganization.delete.mockResolvedValue(true);
    const { req, res, next } = createReqRes({ params: { id: '1' }, user: { id: 1, isAdmin: true } });
    await deleteOrg(req, res, next);
    expect(res._json.message).toBe('Organization deleted');
  });

  test('returns 404 when org not found', async () => {
    mockOrganization.findById.mockResolvedValue(null);
    const { req, res, next } = createReqRes({ params: { id: '999' } });
    await deleteOrg(req, res, next);
    expect(res._status).toBe(404);
  });

  test('returns 403 when user is not owner and not admin', async () => {
    mockOrganization.findById.mockResolvedValue({ id: 1, ownerId: 99 });
    const { req, res, next } = createReqRes({ params: { id: '1' } });
    await deleteOrg(req, res, next);
    expect(res._status).toBe(403);
    expect(res._json.error.message).toBe('Only the owner can delete an organization');
  });

  test('calls next on error', async () => {
    const err = new Error('fail');
    mockOrganization.findById.mockRejectedValue(err);
    const { req, res, next } = createReqRes({ params: { id: '1' } });
    await deleteOrg(req, res, next);
    expect(next).toHaveBeenCalledWith(err);
  });
});

// ── addMember ────────────────────────────────────────────────────────────────
describe('addMember', () => {
  test('adds member successfully', async () => {
    mockOrganization.isMember.mockResolvedValue({ role: 'owner' });
    mockOrganization.findById.mockResolvedValue({ id: 1, name: 'Org1' });
    mockOrganization.addMember.mockResolvedValue({});
    const { req, res, next } = createReqRes({ params: { id: '1' }, body: { userId: 2 } });
    await addMember(req, res, next);
    expect(res._status).toBe(201);
    expect(res._json.message).toBe('Member added');
    expect(mockOrganization.addMember).toHaveBeenCalledWith(1, 2, 'member');
    expect(mockNotificationService.orgInvite).toHaveBeenCalledWith(2, 'Org1', 1);
  });

  test('adds member with custom role', async () => {
    mockOrganization.isMember.mockResolvedValue({ role: 'admin' });
    mockOrganization.findById.mockResolvedValue({ id: 1, name: 'Org1' });
    mockOrganization.addMember.mockResolvedValue({});
    const { req, res, next } = createReqRes({ params: { id: '1' }, body: { userId: 3, role: 'admin' } });
    await addMember(req, res, next);
    expect(mockOrganization.addMember).toHaveBeenCalledWith(1, 3, 'admin');
  });

  test('returns 400 when userId is missing', async () => {
    const { req, res, next } = createReqRes({ params: { id: '1' }, body: {} });
    await addMember(req, res, next);
    expect(res._status).toBe(400);
    expect(res._json.error.message).toBe('userId is required');
  });

  test('returns 403 when user lacks permission', async () => {
    mockOrganization.isMember.mockResolvedValue({ role: 'member' });
    const { req, res, next } = createReqRes({ params: { id: '1' }, body: { userId: 2 } });
    await addMember(req, res, next);
    expect(res._status).toBe(403);
  });

  test('returns 403 when user is not a member', async () => {
    mockOrganization.isMember.mockResolvedValue(null);
    const { req, res, next } = createReqRes({ params: { id: '1' }, body: { userId: 2 } });
    await addMember(req, res, next);
    expect(res._status).toBe(403);
  });

  test('calls next on error', async () => {
    const err = new Error('fail');
    mockOrganization.isMember.mockRejectedValue(err);
    const { req, res, next } = createReqRes({ params: { id: '1' }, body: { userId: 2 } });
    await addMember(req, res, next);
    expect(next).toHaveBeenCalledWith(err);
  });
});

// ── removeMember ─────────────────────────────────────────────────────────────
describe('removeMember', () => {
  test('allows self-removal without permission check', async () => {
    mockOrganization.removeMember.mockResolvedValue(undefined);
    const { req, res, next } = createReqRes({ params: { id: '1', userId: '1' } });
    await removeMember(req, res, next);
    expect(mockOrganization.isMember).not.toHaveBeenCalled();
    expect(mockOrganization.removeMember).toHaveBeenCalledWith(1, 1);
    expect(res._json.message).toBe('Member removed');
  });

  test('allows owner to remove other member', async () => {
    mockOrganization.isMember.mockResolvedValue({ role: 'owner' });
    mockOrganization.removeMember.mockResolvedValue(undefined);
    const { req, res, next } = createReqRes({ params: { id: '1', userId: '2' } });
    await removeMember(req, res, next);
    expect(mockOrganization.removeMember).toHaveBeenCalledWith(1, 2);
    expect(res._json.message).toBe('Member removed');
  });

  test('returns 403 when non-admin tries to remove other member', async () => {
    mockOrganization.isMember.mockResolvedValue({ role: 'member' });
    const { req, res, next } = createReqRes({ params: { id: '1', userId: '2' } });
    await removeMember(req, res, next);
    expect(res._status).toBe(403);
  });

  test('calls next on error', async () => {
    const err = new Error('fail');
    mockOrganization.removeMember.mockRejectedValue(err);
    const { req, res, next } = createReqRes({ params: { id: '1', userId: '1' } });
    await removeMember(req, res, next);
    expect(next).toHaveBeenCalledWith(err);
  });
});
