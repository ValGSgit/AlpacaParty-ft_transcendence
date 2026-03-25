/**
 * Comment Model — Prisma data access layer
 */
import prisma from '../config/prisma.js';

const AUTHOR_SELECT = { select: { username: true, avatar: true } };

function shapeComment(c) {
  return {
    id: c.id,
    post_id: c.postId,
    author_id: c.authorId,
    content: c.content,
    created_at: c.createdAt,
    updated_at: c.updatedAt,
    author_username: c.author?.username,
    author_avatar: c.author?.avatar,
  };
}

const Comment = {
  async create({ postId, authorId, content }) {
    const comment = await prisma.$transaction(async (tx) => {
      const c = await tx.comment.create({
        data: { postId: Number(postId), authorId: Number(authorId), content },
        include: { author: AUTHOR_SELECT },
      });
      const count = await tx.comment.count({ where: { postId: Number(postId) } });
      await tx.post.update({ where: { id: Number(postId) }, data: { commentsCount: count } });
      return c;
    });
    return shapeComment(comment);
  },

  async getByPost(postId, { limit = 50, offset = 0 } = {}) {
    const comments = await prisma.comment.findMany({
      where: { postId: Number(postId) },
      include: { author: AUTHOR_SELECT },
      orderBy: { createdAt: 'asc' },
      take: Number(limit),
      skip: Number(offset),
    });
    return comments.map(shapeComment);
  },

  async delete(id, authorId) {
    const comment = await prisma.comment.findUnique({ where: { id: Number(id) } });
    if (!comment || comment.authorId !== Number(authorId)) return false;
    await prisma.$transaction(async (tx) => {
      await tx.comment.delete({ where: { id: Number(id) } });
      const count = await tx.comment.count({ where: { postId: comment.postId } });
      await tx.post.update({ where: { id: comment.postId }, data: { commentsCount: count } });
    });
    return true;
  },
};

export default Comment;
