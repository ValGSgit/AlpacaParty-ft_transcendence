/**
 * Organization Model — Prisma data access layer
 * @owner ValGSgit
 */
import prisma from '../config/prisma.js';

function shapeOrg(org) {
  return {
    ...org,
    memberCount: org._count?.members ?? undefined,
    _count: undefined,
  };
}

const Organization = {
  async create({ name, description = '', ownerId, avatar }) {
    return prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name,
          description: description || '',
          ownerId: Number(ownerId),
          avatar: avatar || '/avatars/default-org.svg',
        },
      });
      await tx.organizationMember.create({
        data: { orgId: org.id, userId: Number(ownerId), role: 'owner' },
      });
      return org;
    });
  },

  async findById(id) {
    return prisma.organization.findUnique({ where: { id: Number(id) } });
  },

  async update(id, fields) {
    const data = {};
    if (fields.name !== undefined) data.name = fields.name;
    if (fields.description !== undefined) data.description = fields.description;
    if (fields.avatar !== undefined) data.avatar = fields.avatar;
    if (Object.keys(data).length === 0) return this.findById(id);
    return prisma.organization.update({ where: { id: Number(id) }, data });
  },

  async delete(id) {
    try {
      await prisma.organization.delete({ where: { id: Number(id) } });
      return true;
    } catch {
      return false;
    }
  },

  async addMember(orgId, userId, role = 'member') {
    return prisma.organizationMember.upsert({
      where: { orgId_userId: { orgId: Number(orgId), userId: Number(userId) } },
      update: {},
      create: { orgId: Number(orgId), userId: Number(userId), role },
    });
  },

  async removeMember(orgId, userId) {
    await prisma.organizationMember.deleteMany({
      where: { orgId: Number(orgId), userId: Number(userId) },
    });
  },

  async getMembers(orgId, { limit = 50, offset = 0 } = {}) {
    const rows = await prisma.organizationMember.findMany({
      where: { orgId: Number(orgId) },
      include: { user: { select: { id: true, username: true, avatar: true, isOnline: true } } },
      orderBy: [{ role: 'asc' }, { user: { username: 'asc' } }],
      take: Number(limit),
      skip: Number(offset),
    });
    return rows.map((r) => ({ ...r.user, role: r.role, joinedAt: r.joinedAt }));
  },

  async isMember(orgId, userId) {
    return prisma.organizationMember.findUnique({
      where: { orgId_userId: { orgId: Number(orgId), userId: Number(userId) } },
      select: { role: true },
    });
  },

  async getUserOrgs(userId) {
    const rows = await prisma.organizationMember.findMany({
      where: { userId: Number(userId) },
      include: { org: true },
      orderBy: { org: { name: 'asc' } },
    });
    return rows.map((r) => ({ ...r.org, role: r.role }));
  },

  async findAll({ limit = 50, offset = 0 } = {}) {
    const orgs = await prisma.organization.findMany({
      include: { _count: { select: { members: true } } },
      orderBy: { name: 'asc' },
      take: Number(limit),
      skip: Number(offset),
    });
    return orgs.map(shapeOrg);
  },

  async search(term, { limit = 20 } = {}) {
    const orgs = await prisma.organization.findMany({
      where: {
        OR: [
          { name: { contains: term, mode: 'insensitive' } },
          { description: { contains: term, mode: 'insensitive' } },
        ],
      },
      include: { _count: { select: { members: true } } },
      orderBy: { name: 'asc' },
      take: Number(limit),
    });
    return orgs.map(shapeOrg);
  },
};

export default Organization;
