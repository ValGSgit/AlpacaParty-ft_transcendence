import { jest, describe, test, expect, beforeEach } from '@jest/globals'

// Shared mock instance returned by every `new AlpacaRoadMatch(...)` call
const mockMatch = {
  addPlayer: jest.fn(),
  toggleReady: jest.fn(),
  handlePlayerHit: jest.fn(),
  handlePlayerHitComplete: jest.fn(),
  handlePlayerJump: jest.fn(),
  handleActive: jest.fn(),
  removePlayer: jest.fn(),
  stop: jest.fn(),
  players: new Map(),
  status: 'LOBBY',
  matchId: '',
  roomName: '',
}

jest.unstable_mockModule('../../../src/services/AlpacaRoadMatch.js', () => ({
  AlpacaRoadMatch: jest.fn().mockImplementation((id, ns, roomName) => {
    mockMatch.matchId = id
    mockMatch.roomName = roomName
    return mockMatch
  }),
}))

const { MatchManager } = await import('../../../src/services/MatchManager.js')

function makeIo() {
  let connectionHandler
  const io = {
    emit: jest.fn(),
    on: jest.fn((event, handler) => {
      if (event === 'connection') connectionHandler = handler
    }),
    _trigger: (socket) => connectionHandler(socket),
  }
  return io
}

function makeSocket(id = 'socket-1') {
  const handlers = {}
  return {
    id,
    emit: jest.fn(),
    on: jest.fn((event, handler) => { handlers[event] = handler }),
    _trigger: (event, data) => handlers[event]?.(data),
    _handlers: handlers,
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockMatch.players = new Map()
  mockMatch.status = 'LOBBY'
  mockMatch.addPlayer.mockReset()
  mockMatch.toggleReady.mockReset()
  mockMatch.handlePlayerHit.mockReset()
  mockMatch.handlePlayerHitComplete.mockReset()
  mockMatch.handlePlayerJump.mockReset()
  mockMatch.handleActive.mockReset()
  mockMatch.removePlayer.mockReset()
  mockMatch.stop.mockReset()
})

describe('MatchManager constructor', () => {
  test('initializes empty maps and sets up connection listener', () => {
    const io = makeIo()
    const manager = new MatchManager(io)
    expect(manager.matches).toBeInstanceOf(Map)
    expect(manager.playerToMatch).toBeInstanceOf(Map)
    expect(io.on).toHaveBeenCalledWith('connection', expect.any(Function))
  })
})

describe('broadcastPublicRooms', () => {
  test('emits empty array when no matches', () => {
    const io = makeIo()
    const manager = new MatchManager(io)
    io.emit.mockClear()
    manager.broadcastPublicRooms()
    expect(io.emit).toHaveBeenCalledWith('available_rooms', [])
  })

  test('includes LOBBY matches with fewer than 4 players', () => {
    const io = makeIo()
    const manager = new MatchManager(io)
    mockMatch.players.set('p1', {})
    manager.matches.set('room-1', mockMatch)
    io.emit.mockClear()
    manager.broadcastPublicRooms()
    expect(io.emit).toHaveBeenCalledWith('available_rooms', [
      { id: mockMatch.matchId, name: mockMatch.roomName, playerCount: 1 },
    ])
  })

  test('excludes matches that are not LOBBY', () => {
    const io = makeIo()
    const manager = new MatchManager(io)
    mockMatch.status = 'PLAYING'
    manager.matches.set('room-1', mockMatch)
    io.emit.mockClear()
    manager.broadcastPublicRooms()
    expect(io.emit).toHaveBeenCalledWith('available_rooms', [])
  })
})

describe('create_room', () => {
  test('creates match, adds player, emits join_success and available_rooms', () => {
    const io = makeIo()
    const manager = new MatchManager(io)
    const socket = makeSocket('s1')
    io._trigger(socket)
    socket._trigger('create_room', { name: 'Alice', color: 'red' })

    expect(mockMatch.addPlayer).toHaveBeenCalledWith(socket, 'Alice', 'red')
    expect(socket.emit).toHaveBeenCalledWith('join_success', expect.objectContaining({ roomName: expect.any(String) }))
    expect(io.emit).toHaveBeenCalledWith('available_rooms', expect.any(Array))
    expect(manager.playerToMatch.has('s1')).toBe(true)
  })
})

describe('join_room', () => {
  test('joins an existing LOBBY room and emits join_success', () => {
    const io = makeIo()
    const manager = new MatchManager(io)

    // Create a room with socket1
    const s1 = makeSocket('s1')
    io._trigger(s1)
    s1._trigger('create_room', { name: 'Alice', color: 'red' })
    const roomId = manager.playerToMatch.get('s1')

    // A second socket joins
    const s2 = makeSocket('s2')
    io._trigger(s2)
    s2._trigger('join_room', { name: 'Bob', roomId, color: 'blue' })

    expect(mockMatch.addPlayer).toHaveBeenCalledWith(s2, 'Bob', 'blue')
    expect(s2.emit).toHaveBeenCalledWith('join_success', expect.objectContaining({ roomId }))
  })

  test('does not join when match not found', () => {
    const io = makeIo()
    const manager = new MatchManager(io)
    const socket = makeSocket('s1')
    io._trigger(socket)
    socket._trigger('join_room', { name: 'Bob', roomId: 'nonexistent', color: 'blue' })
    expect(mockMatch.addPlayer).not.toHaveBeenCalled()
    expect(socket.emit).not.toHaveBeenCalledWith('join_success', expect.any(Object))
  })

  test('does not join when match is full (4+ players)', () => {
    const io = makeIo()
    const manager = new MatchManager(io)

    const s1 = makeSocket('s1')
    io._trigger(s1)
    s1._trigger('create_room', { name: 'Alice', color: 'red' })
    const roomId = manager.playerToMatch.get('s1')

    // Simulate 4 players already in the room
    mockMatch.players.set('p1', {})
    mockMatch.players.set('p2', {})
    mockMatch.players.set('p3', {})
    mockMatch.players.set('p4', {})

    const s2 = makeSocket('s2')
    io._trigger(s2)
    mockMatch.addPlayer.mockClear()
    s2._trigger('join_room', { name: 'Bob', roomId, color: 'blue' })
    expect(mockMatch.addPlayer).not.toHaveBeenCalled()
  })

  test('does not join a non-LOBBY match', () => {
    const io = makeIo()
    const manager = new MatchManager(io)

    const s1 = makeSocket('s1')
    io._trigger(s1)
    s1._trigger('create_room', { name: 'Alice', color: 'red' })
    const roomId = manager.playerToMatch.get('s1')
    mockMatch.status = 'PLAYING'

    const s2 = makeSocket('s2')
    io._trigger(s2)
    mockMatch.addPlayer.mockClear()
    s2._trigger('join_room', { name: 'Bob', roomId, color: 'blue' })
    expect(mockMatch.addPlayer).not.toHaveBeenCalled()
  })
})

describe('ready_toggle', () => {
  test('calls toggleReady when player is in a match', () => {
    const io = makeIo()
    const manager = new MatchManager(io)
    const socket = makeSocket('s1')
    io._trigger(socket)
    socket._trigger('create_room', { name: 'Alice', color: 'red' })
    socket._trigger('ready_toggle', { isReady: true })
    expect(mockMatch.toggleReady).toHaveBeenCalledWith('s1', true)
  })

  test('does nothing when player has no match', () => {
    const io = makeIo()
    new MatchManager(io)
    const socket = makeSocket('s1')
    io._trigger(socket)
    socket._trigger('ready_toggle', { isReady: true })
    expect(mockMatch.toggleReady).not.toHaveBeenCalled()
  })
})

describe('player events', () => {
  test('player_hit calls handlePlayerHit', () => {
    const io = makeIo()
    const manager = new MatchManager(io)
    const socket = makeSocket('s1')
    io._trigger(socket)
    socket._trigger('create_room', { name: 'A', color: 'r' })
    socket._trigger('player_hit')
    expect(mockMatch.handlePlayerHit).toHaveBeenCalledWith('s1')
  })

  test('player_hit does nothing when player not in match', () => {
    const io = makeIo()
    new MatchManager(io)
    const socket = makeSocket('s1')
    io._trigger(socket)
    socket._trigger('player_hit')
    expect(mockMatch.handlePlayerHit).not.toHaveBeenCalled()
  })

  test('player_hit_complete calls handlePlayerHitComplete', () => {
    const io = makeIo()
    const manager = new MatchManager(io)
    const socket = makeSocket('s1')
    io._trigger(socket)
    socket._trigger('create_room', { name: 'A', color: 'r' })
    socket._trigger('player_hit_complete')
    expect(mockMatch.handlePlayerHitComplete).toHaveBeenCalledWith('s1')
  })

  test('player_hit_complete does nothing when not in match', () => {
    const io = makeIo()
    new MatchManager(io)
    const socket = makeSocket('s1')
    io._trigger(socket)
    socket._trigger('player_hit_complete')
    expect(mockMatch.handlePlayerHitComplete).not.toHaveBeenCalled()
  })

  test('player_jump calls handlePlayerJump', () => {
    const io = makeIo()
    const manager = new MatchManager(io)
    const socket = makeSocket('s1')
    io._trigger(socket)
    socket._trigger('create_room', { name: 'A', color: 'r' })
    socket._trigger('player_jump')
    expect(mockMatch.handlePlayerJump).toHaveBeenCalledWith('s1')
  })

  test('player_jump does nothing when not in match', () => {
    const io = makeIo()
    new MatchManager(io)
    const socket = makeSocket('s1')
    io._trigger(socket)
    socket._trigger('player_jump')
    expect(mockMatch.handlePlayerJump).not.toHaveBeenCalled()
  })

  test('player_active calls handleActive', () => {
    const io = makeIo()
    const manager = new MatchManager(io)
    const socket = makeSocket('s1')
    io._trigger(socket)
    socket._trigger('create_room', { name: 'A', color: 'r' })
    socket._trigger('player_active')
    expect(mockMatch.handleActive).toHaveBeenCalledWith('s1')
  })

  test('player_active does nothing when not in match', () => {
    const io = makeIo()
    new MatchManager(io)
    const socket = makeSocket('s1')
    io._trigger(socket)
    socket._trigger('player_active')
    expect(mockMatch.handleActive).not.toHaveBeenCalled()
  })
})

describe('disconnect', () => {
  test('removes player; stops and deletes match when it becomes empty', () => {
    const io = makeIo()
    const manager = new MatchManager(io)
    const socket = makeSocket('s1')
    io._trigger(socket)
    socket._trigger('create_room', { name: 'Alice', color: 'red' })
    const roomId = manager.playerToMatch.get('s1')

    // Simulate match now empty after remove
    mockMatch.players = new Map()

    socket._trigger('disconnect')

    expect(mockMatch.removePlayer).toHaveBeenCalledWith('s1')
    expect(mockMatch.stop).toHaveBeenCalled()
    expect(manager.matches.has(roomId)).toBe(false)
    expect(manager.playerToMatch.has('s1')).toBe(false)
  })

  test('keeps match alive when other players remain', () => {
    const io = makeIo()
    const manager = new MatchManager(io)
    const socket = makeSocket('s1')
    io._trigger(socket)
    socket._trigger('create_room', { name: 'Alice', color: 'red' })

    // Simulate another player staying in the match
    mockMatch.players.set('s2', {})

    socket._trigger('disconnect')

    expect(mockMatch.stop).not.toHaveBeenCalled()
  })

  test('does nothing when player was not in any match', () => {
    const io = makeIo()
    new MatchManager(io)
    const socket = makeSocket('s1')
    io._trigger(socket)
    socket._trigger('disconnect')
    expect(mockMatch.removePlayer).not.toHaveBeenCalled()
  })
})
