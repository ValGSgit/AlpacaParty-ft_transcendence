/**
 * Post Model — Prisma data access layer
 * @owner ValGSgit
 */
import prisma from '../config/prisma.js';

const AUTHOR_SELECT = { select: { username: true, avatar: true } };

function shapePost(p, likedIds = null) {
  return {
    ...p,
    authorUsername: p.author?.username,
    authorAvatar: p.author?.avatar,
    liked: likedIds ? likedIds.has(p.id) : false,
    author: undefined,
  };
}

const Post = {
  async create({ authorId, content, imageUrl = null, isPublic = true }) {
    const post = await prisma.post.create({
      data: { authorId, content, imageUrl, isPublic },
      include: { author: AUTHOR_SELECT },
    });
    return shapePost(post);
  },

  async findById(id) {
    const post = await prisma.post.findUnique({
      where: { id: Number(id) },
      include: { author: AUTHOR_SELECT },
    });
    return post ? shapePost(post) : null;
  },

  async update(id, authorId, fields) {
    const data = {};
    if (fields.content !== undefined) data.content = fields.content;
    if (fields.image_url !== undefined) data.imageUrl = fields.image_url;
    if (fields.imageUrl !== undefined) data.imageUrl = fields.imageUrl;
    if (fields.is_public !== undefined) data.isPublic = fields.is_public;
    if (fields.isPublic !== undefined) data.isPublic = fields.isPublic;
    if (Object.keys(data).length === 0) return this.findById(id);

    const post = await prisma.post.update({
      where: { id: Number(id), authorId: Number(authorId) },
      data,
      include: { author: AUTHOR_SELECT },
    }).catch(() => null);
    return post ? shapePost(post) : null;
  },

  async delete(id, authorId) {
    const { count } = await prisma.post.deleteMany({
      where: { id: Number(id), authorId: Number(authorId) },
    });
    return count > 0;
  },

  async getFeed({ limit = 20, offset = 0, viewerId = null } = {}) {
    const [posts, liked] = await Promise.all([
      prisma.post.findMany({
        where: { isPublic: true, author: { isPublic: true } },
        include: { author: AUTHOR_SELECT },
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
        skip: Number(offset),
      }),
      viewerId
        ? prisma.postLike.findMany({ where: { userId: Number(viewerId) }, select: { postId: true } })
        : Promise.resolve([]),
    ]);
    const likedIds = new Set(liked.map((l) => l.postId));
    return posts.map((p) => shapePost(p, likedIds));
  },

  async getByUser(userId, { limit = 20, offset = 0 } = {}) {
    const posts = await prisma.post.findMany({
      where: { authorId: Number(userId) },
      include: { author: AUTHOR_SELECT },
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
      skip: Number(offset),
    });
    return posts.map((p) => shapePost(p));
  },

  async like(postId, userId) {
    await prisma.$transaction(async (tx) => {
      try {
        await tx.postLike.create({ data: { postId: Number(postId), userId: Number(userId) } });
      } catch (e) {
        if (e.code === 'P2002') return; // already liked
        throw e;
      }
      const count = await tx.postLike.count({ where: { postId: Number(postId) } });
      await tx.post.update({ where: { id: Number(postId) }, data: { likesCount: count } });
    });
  },

  async unlike(postId, userId) {
    await prisma.$transaction(async (tx) => {
      await tx.postLike.deleteMany({ where: { postId: Number(postId), userId: Number(userId) } });
      const count = await tx.postLike.count({ where: { postId: Number(postId) } });
      await tx.post.update({ where: { id: Number(postId) }, data: { likesCount: count } });
    });
  },

  async count() {
    return prisma.post.count();
  },
};

export default Post;
