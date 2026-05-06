/**
 * Post Model — Prisma data access layer
 * @owner ValGSgit
 */
import prisma from "#config/prisma.js";

const AUTHOR_SELECT = { select: { username: true, avatar: true } };

function shapePost(p, likedIds = null, repostedIds = null, repostMeta = null) {
  const shaped = {
    id: p.id,
    author_id: p.authorId,
    content: p.content,
    image_url: p.imageUrl,
    is_public: p.isPublic,
    likes_count: p.likesCount,
    likeCount: p.likesCount,
    comments_count: p.commentsCount ?? 0,
    reposts_count: p.repostsCount ?? 0,
    created_at: p.createdAt,
    updated_at: p.updatedAt,
    author_username: p.author?.username,
    author_avatar: p.author?.avatar,
    user_liked: likedIds ? likedIds.has(p.id) : false,
    user_reposted: repostedIds ? repostedIds.has(p.id) : false,
  };
  if (repostMeta) {
    shaped._repostBy = repostMeta.username;
    shaped._repostById = repostMeta.authorId;
    shaped._repostComment = repostMeta.comment;
  }
  return shaped;
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

  async update(id, fields) {
    const data = {};
    if (fields.content !== undefined) data.content = fields.content;
    if (fields.imageUrl !== undefined) data.imageUrl = fields.imageUrl;
    if (fields.isPublic !== undefined) data.isPublic = fields.isPublic;
    if (Object.keys(data).length === 0) return this.findById(id);

    const post = await prisma.post.update({
      where: { id: Number(id) },
      data,
      include: { author: AUTHOR_SELECT },
    });
    return post ? shapePost(post) : null;
  },

  async delete(postId) {
    const { count } = await prisma.post.deleteMany({
      where: { id: Number(postId) },
    });
    return count > 0;
  },

  async getFeed({ limit = 200, offset = 0, viewerId = null } = {}) {
    const vid = viewerId ? Number(viewerId) : null;
    const lim = Number(limit);
    const off = Number(offset);

    // Build base where clause for public posts by public authors.
    const baseWhere = {
      isPublic: true,
      author: { userSettings: { isPublic: true } },
    };

    // If viewerId is provided, exclude posts where the author blocked the viewer
    // or the viewer blocked the author.
    if (vid !== null) {
      baseWhere.NOT = [
        { author: { blockedUsers: { some: { blockedUserId: vid } } } }, // author blocked viewer
        { author: { blockedBy: { some: { userId: vid } } } }, // viewer blocked author
      ];
    }

    const [posts, liked, viewerReposts, recentReposts] = await Promise.all([
      prisma.post.findMany({
        where: baseWhere,
        include: { author: AUTHOR_SELECT },
        orderBy: { createdAt: "desc" },
        take: lim,
        skip: off,
      }),
      vid
        ? prisma.postLike.findMany({
            where: { userId: vid },
            select: { postId: true },
          })
        : Promise.resolve([]),
      vid
        ? prisma.repost.findMany({
            where: { authorId: vid },
            select: { postId: true },
          })
        : Promise.resolve([]),
      // Fetch recent reposts of public posts by public authors only
      prisma.repost.findMany({
        where: {
          post: {
            isPublic: true,
            author: { userSettings: { isPublic: true } },
            ...(vid !== null
              ? {
                  NOT: [
                    { author: { blockedUsers: { some: { blockedUserId: vid } } } },
                    { author: { blockedBy: { some: { userId: vid } } } },
                  ],
                }
              : {}),
          },
        },
        include: {
          post: { include: { author: AUTHOR_SELECT } },
          author: AUTHOR_SELECT,
        },
        orderBy: { createdAt: "desc" },
        take: lim,
      }),
    ]);

    const likedIds = new Set(liked.map((l) => l.postId));
    const repostedIds = new Set(viewerReposts.map((r) => r.postId));

    // Shape original posts
    const shaped = posts.map((p) => shapePost(p, likedIds, repostedIds));

    // Interleave reposts, deduplicating by (postId, reposter) key
    const seenKeys = new Set(shaped.map((p) => `${p.id}`));
    for (const r of recentReposts) {
      const key = `${r.post.id}-repost-${r.authorId}`;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
      const repostShaped = shapePost(r.post, likedIds, repostedIds, {
        username: r.author?.username,
        authorId: r.authorId,
        comment: r.comment,
      });
      // Use the repost record's timestamp so reposts are ordered by repost time
      repostShaped.created_at = r.createdAt;
      shaped.push(repostShaped);
    }

    // Sort combined feed by created_at desc and return one page
    shaped.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return shaped.slice(0, lim);
  },

  async getByUser(userId, { limit = 20, offset = 0 } = {}) {
    const posts = await prisma.post.findMany({
      where: { authorId: Number(userId) },
      include: { author: AUTHOR_SELECT },
      orderBy: { createdAt: "desc" },
      take: Number(limit),
      skip: Number(offset),
    });
    return posts.map((p) => shapePost(p));
  },

  async like(postId, userId) {
    await prisma.$transaction(async (tx) => {
      try {
        await tx.postLike.create({
          data: { postId: Number(postId), userId: Number(userId) },
        });
      } catch (e) {
        if (e.code === "P2002") return; // already liked — no-op
        throw e;
      }
      await tx.post.update({
        where: { id: Number(postId) },
        data: { likesCount: { increment: 1 } },
      });
    });
  },

  async unlike(postId, userId) {
    await prisma.$transaction(async (tx) => {
      const { count } = await tx.postLike.deleteMany({
        where: { postId: Number(postId), userId: Number(userId) },
      });
      if (count > 0) {
        await tx.post.update({
          where: { id: Number(postId) },
          data: { likesCount: { decrement: 1 } },
        });
      }
    });
  },

  async repost(postId, authorId, comment = null) {
    let repost = null;
    try {
      repost = await prisma.$transaction(async (tx) => {
        const r = await tx.repost.create({
          data: {
            postId: Number(postId),
            authorId: Number(authorId),
            comment: comment ?? null,
          },
          include: { author: AUTHOR_SELECT },
        });
        await tx.post.update({
          where: { id: Number(postId) },
          data: { repostsCount: { increment: 1 } },
        });
        return r;
      });
    } catch (e) {
      if (e.code === "P2002") return null; // already reposted
      throw e;
    }
    if (!repost) return null;
    return {
      id: repost.id,
      post_id: repost.postId,
      author_id: repost.authorId,
      comment: repost.comment,
      created_at: repost.createdAt,
      author_username: repost.author?.username,
      author_avatar: repost.author?.avatar,
    };
  },

  async unrepost(postId, authorId) {
    await prisma.$transaction(async (tx) => {
      const { count } = await tx.repost.deleteMany({
        where: { postId: Number(postId), authorId: Number(authorId) },
      });
      if (count > 0) {
        await tx.post.update({
          where: { id: Number(postId) },
          data: { repostsCount: { decrement: 1 } },
        });
      }
    });
  },

  async count() {
    return prisma.post.count();
  },
};

export default Post;
