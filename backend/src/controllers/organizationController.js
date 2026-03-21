/**
 * Organization Controller
 * @owner ValGSgit
 */
import Organization from '../models/Organization.js';
import NotificationService from '../services/notificationService.js';
import GamificationService from '../services/gamificationService.js';

/** GET /api/organizations */
export const listOrgs = async (req, res, next) => {
  try {
    const { search, limit = 50, offset = 0 } = req.query;
    const orgs = search
      ? await Organization.search(search, { limit: Number(limit) })
      : await Organization.findAll({ limit: Number(limit), offset: Number(offset) });
    res.json({ organizations: orgs });
  } catch (err) { next(err); }
};

/** GET /api/organizations/mine */
export const listMyOrgs = async (req, res, next) => {
  try {
    const orgs = await Organization.getUserOrgs(req.user.id);
    res.json({ organizations: orgs });
  } catch (err) { next(err); }
};

/** GET /api/organizations/:id */
export const getOrg = async (req, res, next) => {
  try {
    const org = await Organization.findById(Number(req.params.id));
    if (!org) return res.status(404).json({ error: { message: 'Organization not found' } });
    const members = await Organization.getMembers(org.id);
    res.json({ organization: org, members });
  } catch (err) { next(err); }
};

/** POST /api/organizations */
export const createOrg = async (req, res, next) => {
  try {
    const { name, description, avatar } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: { message: 'Organization name is required' } });
    if (name.length > 100) return res.status(400).json({ error: { message: 'Organization name must be 100 characters or fewer' } });
    if (description && description.length > 2000) return res.status(400).json({ error: { message: 'Description must be 2000 characters or fewer' } });
    if (avatar && (typeof avatar !== 'string' || avatar.length > 2048)) return res.status(400).json({ error: { message: 'Invalid avatar URL' } });

    const org = await Organization.create({ name: name.trim(), description: description?.trim() || null, ownerId: req.user.id, avatar: avatar || null });
    await GamificationService.checkOrgAchievements(req.user.id);
    res.status(201).json({ organization: org });
  } catch (err) { next(err); }
};

/** PUT /api/organizations/:id */
export const updateOrg = async (req, res, next) => {
  try {
    const membership = await Organization.isMember(Number(req.params.id), req.user.id);
    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return res.status(403).json({ error: { message: 'Insufficient permissions' } });
    }
    const { name, description, avatar } = req.body;
    if (name !== undefined && (!name?.trim() || name.length > 100)) {
      return res.status(400).json({ error: { message: 'Name must be between 1 and 100 characters' } });
    }
    if (description !== undefined && description !== null && description.length > 2000) {
      return res.status(400).json({ error: { message: 'Description must be 2000 characters or fewer' } });
    }
    if (avatar !== undefined && avatar !== null && (typeof avatar !== 'string' || avatar.length > 2048)) {
      return res.status(400).json({ error: { message: 'Invalid avatar URL' } });
    }
    const org = await Organization.update(Number(req.params.id), { name: name?.trim(), description: description?.trim(), avatar });
    res.json({ organization: org });
  } catch (err) { next(err); }
};

/** DELETE /api/organizations/:id */
export const deleteOrg = async (req, res, next) => {
  try {
    const org = await Organization.findById(Number(req.params.id));
    if (!org) return res.status(404).json({ error: { message: 'Organization not found' } });
    if (org.ownerId !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({ error: { message: 'Only the owner can delete an organization' } });
    }
    await Organization.delete(org.id);
    res.json({ message: 'Organization deleted' });
  } catch (err) { next(err); }
};

/** POST /api/organizations/:id/members */
export const addMember = async (req, res, next) => {
  try {
    const { userId, role = 'member' } = req.body;
    if (!userId) return res.status(400).json({ error: { message: 'userId is required' } });
    const membership = await Organization.isMember(Number(req.params.id), req.user.id);
    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return res.status(403).json({ error: { message: 'Insufficient permissions' } });
    }
    const org = await Organization.findById(Number(req.params.id));
    await Organization.addMember(org.id, Number(userId), role);
    NotificationService.orgInvite(Number(userId), org.name, org.id).catch(() => {});
    res.status(201).json({ message: 'Member added' });
  } catch (err) { next(err); }
};

/** DELETE /api/organizations/:id/members/:userId */
export const removeMember = async (req, res, next) => {
  try {
    const targetId = Number(req.params.userId);
    if (targetId !== req.user.id) {
      const membership = await Organization.isMember(Number(req.params.id), req.user.id);
      if (!membership || !['owner', 'admin'].includes(membership.role)) {
        return res.status(403).json({ error: { message: 'Insufficient permissions' } });
      }
    }
    await Organization.removeMember(Number(req.params.id), targetId);
    res.json({ message: 'Member removed' });
  } catch (err) { next(err); }
};
