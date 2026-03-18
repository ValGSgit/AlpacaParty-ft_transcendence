/**
 * File Model — Prisma data access layer
 * @owner ValGSgit
 */
import prisma from '../config/prisma.js';

const File = {
  async create({ uploaderId, originalName, storedName, mimeType, sizeBytes, url }) {
    return prisma.file.create({
      data: {
        uploaderId: Number(uploaderId),
        originalName,
        storedName,
        mimeType,
        sizeBytes: BigInt(sizeBytes),
        url,
      },
    });
  },

  async findById(id) {
    return prisma.file.findUnique({ where: { id: Number(id) } });
  },

  async getByUploader(uploaderId, { limit = 50, offset = 0 } = {}) {
    return prisma.file.findMany({
      where: { uploaderId: Number(uploaderId) },
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
      skip: Number(offset),
    });
  },

  async delete(id, uploaderId) {
    const record = await prisma.file.findFirst({
      where: { id: Number(id), uploaderId: Number(uploaderId) },
    });
    if (!record) return null;
    await prisma.file.delete({ where: { id: Number(id) } });
    return record;
  },
};

export default File;
