import { jest, describe, test, expect, beforeEach } from '@jest/globals'

const mockComment = {
  getByPost: jest.fn(),
  create: jest.fn(),
  delete: jest.fn(),
}

const mockPost = {
  findById: jest.fn(),
}

const mockNotificationService = {
  postCommented: jest.fn().mockResolvedValue(true),
}

const mockFriend = {
  isBlockedBetween: jest.fn().mockResolvedValue(false),
}

jest.unstable_mockModule('../../../src/models/Comment.js', () => ({
  default: mockComment,
}))

jest.unstable_mockModule('../../../src/models/Post.js', () => ({
  default: mockPost,
}))

jest.unstable_mockModule('../../../src/models/Friend.js', () => ({
  default: mockFriend,
}))

jest.unstable_mockModule('../../../src/services/notificationService.js', () => ({
  default: mockNotificationService,
}))

const {
  getComments,
  createComment,
  deleteComment,
} = await import('../../../src/controllers/commentController.js')

function makeReqRes(overrides = {}) {
  const req = {
    user: { id: 1, username: 'alice' },
    params: { id: '5', commentId: '10' },
    query: {},
    body: {},
    ...overrides,
  }
  const res = {
    _status: 200,
    _json: null,
    status(code) { this._status = code; return this },
    json(body) { this._json = body; return this },
  }
  return { req, res, next: jest.fn() }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockNotificationService.postCommented.mockResolvedValue(true)
  mockFriend.isBlockedBetween.mockResolvedValue(false)
})

// ── getComments ──────────────────────────────────────────────────────────────

describe('getComments', () => {
  test('returns comments array with defaults', async () => {
    const comments = [{ id: 1, content: 'hi' }]
    mockComment.getByPost.mockResolvedValue(comments)
    const { req, res, next } = makeReqRes()
    await getComments(req, res, next)
    // postId and pagination are parsed to integers at the boundary now.
    expect(mockComment.getByPost).toHaveBeenCalledWith(5, { limit: 50, offset: 0 })
    expect(res._json).toEqual({ comments })
    expect(next).not.toHaveBeenCalled()
  })

  test('uses query limit/offset when provided (coerced to integers and clamped)', async () => {
    mockComment.getByPost.mockResolvedValue([])
    const { req, res, next } = makeReqRes({ query: { limit: '10', offset: '5' } })
    await getComments(req, res, next)
    expect(mockComment.getByPost).toHaveBeenCalledWith(5, { limit: 10, offset: 5 })
  })

  test('caps limit at 100 even when client requests more', async () => {
    mockComment.getByPost.mockResolvedValue([])
    const { req, res, next } = makeReqRes({ query: { limit: '5000' } })
    await getComments(req, res, next)
    expect(mockComment.getByPost).toHaveBeenCalledWith(5, { limit: 100, offset: 0 })
  })

  test('returns 400 when post id is not a positive integer', async () => {
    const { req, res, next } = makeReqRes({ params: { id: 'abc' } })
    await getComments(req, res, next)
    expect(res._status).toBe(400)
    expect(mockComment.getByPost).not.toHaveBeenCalled()
  })

  test('calls next on error', async () => {
    const err = new Error('DB fail')
    mockComment.getByPost.mockRejectedValue(err)
    const { req, res, next } = makeReqRes()
    await getComments(req, res, next)
    expect(next).toHaveBeenCalledWith(err)
  })
})

// ── createComment ────────────────────────────────────────────────────────────

describe('createComment', () => {
  test('creates comment and returns 201', async () => {
    const post = { id: 5, author_id: 2 }
    const comment = { id: 100, content: 'nice post' }
    mockPost.findById.mockResolvedValue(post)
    mockComment.create.mockResolvedValue(comment)
    const { req, res, next } = makeReqRes({ body: { content: 'nice post' } })
    await createComment(req, res, next)
    expect(res._status).toBe(201)
    expect(res._json).toEqual({ comment })
  })

  test('sends notification when commenter is not the post author', async () => {
    const post = { id: 5, author_id: 99 }
    mockPost.findById.mockResolvedValue(post)
    mockComment.create.mockResolvedValue({ id: 1, content: 'hello' })
    const { req, res, next } = makeReqRes({ body: { content: 'hello' } })
    await createComment(req, res, next)
    expect(mockNotificationService.postCommented).toHaveBeenCalledWith(99, 'alice', 5)
  })

  test('does not notify when commenter is the post author', async () => {
    const post = { id: 5, author_id: 1 } // same as req.user.id
    mockPost.findById.mockResolvedValue(post)
    mockComment.create.mockResolvedValue({ id: 1, content: 'self' })
    const { req, res, next } = makeReqRes({ body: { content: 'self' } })
    await createComment(req, res, next)
    expect(mockNotificationService.postCommented).not.toHaveBeenCalled()
  })

  test('returns 400 when content is empty', async () => {
    const { req, res, next } = makeReqRes({ body: { content: '   ' } })
    await createComment(req, res, next)
    expect(res._status).toBe(400)
    expect(res._json.error.message).toBe('content is required')
  })

  test('returns 400 when content is missing', async () => {
    const { req, res, next } = makeReqRes({ body: {} })
    await createComment(req, res, next)
    expect(res._status).toBe(400)
  })

  test('returns 400 when content exceeds 2000 chars', async () => {
    const { req, res, next } = makeReqRes({ body: { content: 'a'.repeat(2001) } })
    await createComment(req, res, next)
    expect(res._status).toBe(400)
    expect(res._json.error.message).toMatch(/2000/)
  })

  test('returns 404 when post not found', async () => {
    mockPost.findById.mockResolvedValue(null)
    const { req, res, next } = makeReqRes({ body: { content: 'hi' } })
    await createComment(req, res, next)
    expect(res._status).toBe(404)
    expect(res._json.error.message).toBe('Post not found')
  })

  test('calls next on error', async () => {
    mockPost.findById.mockRejectedValue(new Error('fail'))
    const { req, res, next } = makeReqRes({ body: { content: 'hi' } })
    await createComment(req, res, next)
    expect(next).toHaveBeenCalled()
  })
})

// ── deleteComment ────────────────────────────────────────────────────────────

describe('deleteComment', () => {
  test('deletes comment and returns success message', async () => {
    mockComment.delete.mockResolvedValue(true)
    const { req, res, next } = makeReqRes()
    await deleteComment(req, res, next)
    expect(mockComment.delete).toHaveBeenCalledWith(10, 1, { isAdmin: false })
    expect(res._json).toEqual({ message: 'Comment deleted' })
  })

  test('returns 404 when comment not found', async () => {
    mockComment.delete.mockResolvedValue(false)
    const { req, res, next } = makeReqRes()
    await deleteComment(req, res, next)
    expect(res._status).toBe(404)
    expect(res._json.error.message).toBe('Comment not found or not yours')
  })

  test('calls next on error', async () => {
    mockComment.delete.mockRejectedValue(new Error('fail'))
    const { req, res, next } = makeReqRes()
    await deleteComment(req, res, next)
    expect(next).toHaveBeenCalled()
  })
})
