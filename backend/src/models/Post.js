/**
 * Post Model — Prisma data access layer
 * @owner ValGSgit
 */
import prisma from '../config/prisma.js';

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
    const vid = viewerId ? Number(viewerId) : null;
    const [posts, liked, viewerReposts, recentReposts] = await Promise.all([
      prisma.post.findMany({
        where: { isPublic: true, author: { isPublic: true } },
        include: { author: AUTHOR_SELECT },
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
        skip: Number(offset),
      }),
      vid
        ? prisma.postLike.findMany({ where: { userId: vid }, select: { postId: true } })
        : Promise.resolve([]),
      vid
        ? prisma.repost.findMany({ where: { authorId: vid }, select: { postId: true } })
        : Promise.resolve([]),
      // Fetch recent reposts to interleave into the feed
      prisma.repost.findMany({
        include: { post: { include: { author: AUTHOR_SELECT } }, author: AUTHOR_SELECT },
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
        skip: Number(offset),
      }),
    ]);
    const likedIds = new Set(liked.map((l) => l.postId));
    const repostedIds = new Set(viewerReposts.map((r) => r.postId));

    // Shape original posts
    const shaped = posts.map((p) => shapePost(p, likedIds, repostedIds));

    // Shape reposts (carry _repostBy metadata)
    const seenIds = new Set(shaped.map((p) => `${p.id}`));
    for (const r of recentReposts) {
      if (!r.post || !r.post.isPublic) continue;
      const key = `${r.post.id}-repost-${r.authorId}`;
      if (seenIds.has(key)) continue;
      seenIds.add(key);
      shaped.push(shapePost(r.post, likedIds, repostedIds, {
        username: r.author?.username,
        authorId: r.authorId,
        comment: r.comment,
      }));
    }

    // Sort combined feed by created_at desc
    shaped.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return shaped.slice(0, Number(limit));
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

  async repost(postId, authorId, comment = null) {
    let repost = null;
    try {
      repost = await prisma.$transaction(async (tx) => {
        const r = await tx.repost.create({
          data: { postId: Number(postId), authorId: Number(authorId), comment: comment ?? null },
          include: { author: AUTHOR_SELECT },
        });
        const count = await tx.repost.count({ where: { postId: Number(postId) } });
        await tx.post.update({ where: { id: Number(postId) }, data: { repostsCount: count } });
        return r;
      });
    } catch (e) {
      if (e.code === 'P2002') return null; // already reposted
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
      await tx.repost.deleteMany({ where: { postId: Number(postId), authorId: Number(authorId) } });
      const count = await tx.repost.count({ where: { postId: Number(postId) } });
      await tx.post.update({ where: { id: Number(postId) }, data: { repostsCount: count } });
    });
  },

  async count() {
    return prisma.post.count();
  },
};

export default Post;
