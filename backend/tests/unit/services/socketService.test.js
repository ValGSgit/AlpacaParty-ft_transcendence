import { jest, describe, test, expect, beforeEach } from '@jest/globals'

const mockSetIo = jest.fn()

jest.unstable_mockModule('socket.io', () => ({
  Server: jest.fn().mockImplementation(() => mockIo),
}))

jest.unstable_mockModule('../../../src/models/User.js', () => ({
  default: {
    setOnline: jest.fn(),
    setOffline: jest.fn(),
  },
}))

jest.unstable_mockModule('../../../src/models/Friend.js', () => ({
  default: {
    isBlockedBetween: jest.fn(),
    areFriends: jest.fn(),
  },
}))

jest.unstable_mockModule('../../../src/models/Message.js', () => ({
  default: {
    create: jest.fn(),
    markAsRead: jest.fn(),
  },
}))

jest.unstable_mockModule('../../../src/models/Game.js', () => ({
  default: {
    findWaiting: jest.fn(),
    joinGame: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    finishGame: jest.fn(),
    cancelGame: jest.fn(),
    getStats: jest.fn(),
    updateStats: jest.fn(),
    updateElo: jest.fn(),
    updateFarm: jest.fn(),
    getFarm: jest.fn(),
  },
}))

jest.unstable_mockModule('../../../src/services/notificationService.js', () => ({
  default: {
    setIo: mockSetIo,
    newMessage: jest.fn().mockResolvedValue(undefined),
  },
}))

jest.unstable_mockModule('cookie-parser', () => ({
  default: jest.fn(() => (_req, _res, next) => next()),
}))

jest.unstable_mockModule('../../../src/services/socketAuth.js', () => ({
  socketAuthMiddleware: jest.fn(() => (_socket, next) => next()),
}))

const mockMatchManager = {}

jest.unstable_mockModule('../../../src/services/MatchManager.js', () => ({
  MatchManager: jest.fn().mockImplementation(() => mockMatchManager),
}))

const mockNamespaceOf = {
  use: jest.fn(),
  on: jest.fn(),
  emit: jest.fn(),
}

const mockIo = {
  engine: { use: jest.fn() },
  use: jest.fn(),
  on: jest.fn(),
  emit: jest.fn(),
  of: jest.fn().mockReturnValue(mockNamespaceOf),
  to: jest.fn().mockReturnValue({ emit: jest.fn() }),
}

let initializeSocket
let connectionHandler

beforeEach(async () => {
  jest.clearAllMocks()
  connectionHandler = undefined
  mockIo.on.mockImplementation((event, handler) => {
    if (event === 'connection') connectionHandler = handler
  })
  const module = await import('../../../src/services/socketService.js')
  initializeSocket = module.initializeSocket
})

// ── Helpers ───────────────────────────────────────────────────────────────────

let Friend, Message

beforeEach(async () => {
  Friend = (await import('../../../src/models/Friend.js')).default
  Message = (await import('../../../src/models/Message.js')).default
})

async function connectSocket(overrides = {}) {
  initializeSocket({}, ['https://localhost:8443'])

  const dmHandlers = {}
  const socket = {
    id: 'socket-1',
    user: { id: 7, username: 'alice', avatar: null },
    join: jest.fn(),
    disconnect: jest.fn(),
    emit: jest.fn(),
    on: jest.fn((event, handler) => { dmHandlers[event] = handler }),
    _trigger: (event, ...args) => dmHandlers[event]?.(...args),
    ...overrides,
  }
  await connectionHandler(socket)
  return socket
}

// ── initializeSocket ──────────────────────────────────────────────────────────

describe('initializeSocket', () => {
  test('disconnects the socket when connection setup fails', async () => {
    const { default: User } = await import('../../../src/models/User.js')
    User.setOnline.mockRejectedValueOnce(new Error('simulated failure'))

    initializeSocket({}, ['https://localhost:8443'])

    const socket = {
      id: 'socket-1',
      user: { id: 7, username: 'alice' },
      join: jest.fn(),
      on: jest.fn(),
      disconnect: jest.fn(),
    }

    await connectionHandler(socket)

    expect(socket.join).toHaveBeenCalledWith('user:7')
    expect(socket.disconnect).toHaveBeenCalledWith(true)
    expect(socket.on).not.toHaveBeenCalled()
  })
})

// ── dm:send ───────────────────────────────────────────────────────────────────

describe('dm:send', () => {
  test('rejects when sender and receiver are the same user', async () => {
    const socket = await connectSocket()
    const ack = jest.fn()
    await socket._trigger('dm:send', { receiverId: 7, content: 'hi' }, ack)
    expect(ack).toHaveBeenCalledWith({ error: 'Cannot send a message to yourself' })
  })

  test('rejects when either user has blocked the other', async () => {
    Friend.isBlockedBetween.mockResolvedValue(true)
    const socket = await connectSocket()
    const ack = jest.fn()
    await socket._trigger('dm:send', { receiverId: 99, content: 'hi' }, ack)
    expect(ack).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringMatching(/blocked/) }))
    expect(Message.create).not.toHaveBeenCalled()
  })

  test('rejects when users are not friends', async () => {
    Friend.isBlockedBetween.mockResolvedValue(false)
    Friend.areFriends.mockResolvedValue(false)
    const socket = await connectSocket()
    const ack = jest.fn()
    await socket._trigger('dm:send', { receiverId: 99, content: 'hi' }, ack)
    expect(ack).toHaveBeenCalledWith({ error: 'You can only message friends' })
    expect(Message.create).not.toHaveBeenCalled()
  })

  test('sends message when users are friends and not blocked', async () => {
    Friend.isBlockedBetween.mockResolvedValue(false)
    Friend.areFriends.mockResolvedValue(true)
    Message.create.mockResolvedValue({
      id: 1, senderId: 7, receiverId: 99, content: 'hi',
      isRead: false, createdAt: new Date(),
    })
    const socket = await connectSocket()
    const ack = jest.fn()
    await socket._trigger('dm:send', { receiverId: 99, content: 'hi' }, ack)
    expect(Message.create).toHaveBeenCalled()
    expect(ack).toHaveBeenCalledWith(expect.objectContaining({ ok: true }))
  })

  test('rejects when content is empty', async () => {
    const socket = await connectSocket()
    const ack = jest.fn()
    await socket._trigger('dm:send', { receiverId: 99, content: '   ' }, ack)
    expect(ack).toHaveBeenCalledWith({ error: 'Empty message' })
  })
})