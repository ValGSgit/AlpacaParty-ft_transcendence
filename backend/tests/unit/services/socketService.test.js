import { jest, describe, test, expect, beforeEach } from '@jest/globals'

const mockSetIo = jest.fn()
const mockInitializeSpitRoyaleNamespace = jest.fn()
const mockInitializeAlpacaRoadNamespace = jest.fn()

const mockChatRoom = {
  getUserRooms: jest.fn(),
}

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
  },
}))

jest.unstable_mockModule('../../../src/models/Message.js', () => ({
  default: {
    create: jest.fn(),
    markAsRead: jest.fn(),
  },
}))

jest.unstable_mockModule('../../../src/models/ChatRoom.js', () => ({
  default: mockChatRoom,
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
    newMessage: jest.fn(),
  },
}))

jest.unstable_mockModule('cookie-parser', () => ({
  default: jest.fn(() => (_req, _res, next) => next()),
}))

jest.unstable_mockModule('../../../src/services/spitRoyaleNamespace.js', () => ({
  initializeSpitRoyaleNamespace: mockInitializeSpitRoyaleNamespace,
}))

jest.unstable_mockModule('../../../src/services/alpacaRoadNamespace.js', () => ({
  initializeAlpacaRoadNamespace: mockInitializeAlpacaRoadNamespace,
}))

jest.unstable_mockModule('../../../src/services/socketAuth.js', () => ({
  socketAuthMiddleware: jest.fn(() => (_socket, next) => next()),
}))

const mockIo = {
  engine: { use: jest.fn() },
  use: jest.fn(),
  on: jest.fn(),
  emit: jest.fn(),
}

let initializeSocket
let connectionHandler

beforeEach(async () => {
  jest.clearAllMocks()
  connectionHandler = undefined
  mockIo.on.mockImplementation((event, handler) => {
    if (event === 'connection') connectionHandler = handler
  })

  mockChatRoom.getUserRooms.mockReset()

  const module = await import('../../../src/services/socketService.js')
  initializeSocket = module.initializeSocket
})

describe('initializeSocket', () => {
  test('disconnects the socket when connection setup fails', async () => {
    mockChatRoom.getUserRooms.mockRejectedValue(new Error('room lookup failed'))

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