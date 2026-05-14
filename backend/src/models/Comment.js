/**
 * Comment Model — Prisma data access layer
 */
import prisma from "#config/prisma.js";

const AUTHOR_SELECT = { select: { username: true, avatar: true } };

function shapeComment(c) {
  const shaped = {
    id: c.id,
    post_id: c.postId,
    author_id: c.authorId,
    content: c.content,
    created_at: c.createdAt,
    updated_at: c.updatedAt,
    author_username: c.author?.username,
    author_avatar: c.author?.avatar,
  };
  if (c.repostId != null) shaped.repost_id = c.repostId;
  return shaped;
}

const Comment = {
  async create({ postId = null, repostId = null, authorId, content }) {
    const comment = await prisma.$transaction(async (tx) => {
      const c = await tx.comment.create({
        data: {
          postId: postId !== null ? Number(postId) : null,
          repostId: repostId !== null ? Number(repostId) : null,
          authorId: Number(authorId),
          content,
        },
        include: { author: AUTHOR_SELECT },
      });
      if (postId !== null) {
        const count = await tx.comment.count({ where: { postId: Number(postId) } });
        await tx.post.update({ where: { id: Number(postId) }, data: { commentsCount: count } });
      } else if (repostId !== null) {
        const count = await tx.comment.count({ where: { repostId: Number(repostId) } });
        await tx.repost.update({ where: { id: Number(repostId) }, data: { commentsCount: count } });
      }
      return c;
    });
    return shapeComment(comment);
  },

  async getByThread({ postId = null, repostId = null, limit = 50, offset = 0 } = {}) {
    const comments = await prisma.comment.findMany({
      where: {
        ...(postId !== null ? { postId: Number(postId) } : {}),
        ...(repostId !== null ? { repostId: Number(repostId) } : {}),
      },
      include: { author: AUTHOR_SELECT },
      orderBy: { createdAt: "asc" },
      take: Number(limit),
      skip: Number(offset),
    });
    return comments.map(shapeComment);
  },

  async getByPost(postId, options = {}) {
    return this.getByThread({ postId, ...options });
  },

  async delete(id, authorId) {
    const comment = await prisma.comment.findUnique({
      where: { id: Number(id) },
    });
    if (!comment || comment.authorId !== Number(authorId)) return false;
    await prisma.$transaction(async (tx) => {
      await tx.comment.delete({ where: { id: Number(id) } });
      if (comment.postId !== null) {
        const count = await tx.comment.count({ where: { postId: comment.postId } });
        await tx.post.update({ where: { id: comment.postId }, data: { commentsCount: count } });
      } else if (comment.repostId !== null) {
        const count = await tx.comment.count({ where: { repostId: comment.repostId } });
        await tx.repost.update({ where: { id: comment.repostId }, data: { commentsCount: count } });
      }
    });
    return true;
  },
};

export default Comment;
