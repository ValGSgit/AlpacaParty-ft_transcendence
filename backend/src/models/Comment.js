/**
 * Comment Model — Prisma data access layer
 */
import prisma from "#config/prisma.js";
import { stripDangerousHtml } from "#utils/htmlSanitizer.js";

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
          content: typeof content === "string" ? stripDangerousHtml(content) : content,
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
    // Fail-safe: without one of the two ids the where becomes {} and we'd
    // read every comment in the database. The current caller always passes
    // one, but the model shouldn't trust that.
    if (postId == null && repostId == null) {
      throw new Error("Comment.getByThread requires postId or repostId");
    }
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

  /**
   * Delete a comment. Authorised when:
   *   - the requester is the comment author, OR
   *   - the requester owns the parent post/repost, OR
   *   - the requester has role admin/superadmin.
   *
   * Returns true on delete, false on not-found, throws nothing for auth.
   * The caller's auth status (isAdmin) must be passed in; the model
   * doesn't do role lookups itself.
   */
  async delete(id, requesterId, { isAdmin = false } = {}) {
    const comment = await prisma.comment.findUnique({ where: { id: Number(id) } });
    if (!comment) return false;

    const isAuthor = comment.authorId === Number(requesterId);
    let isThreadOwner = false;
    if (!isAuthor && !isAdmin) {
      if (comment.postId !== null) {
        const post = await prisma.post.findUnique({
          where: { id: comment.postId },
          select: { authorId: true },
        });
        isThreadOwner = post?.authorId === Number(requesterId);
      } else if (comment.repostId !== null) {
        const repost = await prisma.repost.findUnique({
          where: { id: comment.repostId },
          select: { authorId: true },
        });
        isThreadOwner = repost?.authorId === Number(requesterId);
      }
    }
    if (!isAuthor && !isAdmin && !isThreadOwner) return false;

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
