import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals'
import { BaseMatch } from '../../../src/services/BaseMatch.js'

function makeMockNamespace() {
  const emit = jest.fn()
  const to = jest.fn().mockReturnValue({ emit })
  return { to, emit, _emit: emit }
}

let match
let ns

beforeEach(() => {
  ns = makeMockNamespace()
  match = new BaseMatch('match-42', ns, 'Test Room')
})

afterEach(() => {
  if (match.heartbeat) clearInterval(match.heartbeat)
})

describe('BaseMatch constructor', () => {
  test('initializes fields correctly', () => {
    expect(match.matchId).toBe('match-42')
    expect(match.roomName).toBe('Test Room')
    expect(match.namespace).toBe(ns)
    expect(match.status).toBe('LOBBY')
    expect(match.players).toBeInstanceOf(Map)
    expect(match.players.size).toBe(0)
    expect(match.heartbeat).toBeNull()
  })
})

describe('addPlayer', () => {
  test('adds player with provided name and color', () => {
    const socket = { id: 'sid-1', join: jest.fn() }
    match.addPlayer(socket, 'Alice', '0xff0000')
    expect(match.players.size).toBe(1)
    const player = match.players.get('sid-1')
    expect(player.id).toBe('sid-1')
    expect(player.name).toBe('Alice')
    expect(player.color).toBe('0xff0000')
    expect(player.hp).toBe(3)
    expect(player.points).toBe(0)
    expect(player.isReady).toBe(false)
  })

  test('uses defaults when name/color omitted', () => {
    const socket = { id: 'sid-2', join: jest.fn() }
    match.addPlayer(socket)
    const player = match.players.get('sid-2')
    expect(player.name).toBe('Vue_Alpaca')
    expect(player.color).toBe('0x000000')
  })

  test('socket joins the match room', () => {
    const socket = { id: 'sid-3', join: jest.fn() }
    match.addPlayer(socket, 'Bob', 'blue')
    expect(socket.join).toHaveBeenCalledWith('match-42')
  })

  test('calls syncLobby after adding', () => {
    const socket = { id: 'sid-4', join: jest.fn() }
    match.addPlayer(socket, 'Carol', 'green')
    expect(ns.to).toHaveBeenCalledWith('match-42')
    expect(ns._emit).toHaveBeenCalledWith('lobby_update', expect.any(Array))
  })
})

describe('removePlayer', () => {
  test('removes the player and syncs lobby', () => {
    const socket = { id: 'sid-1', join: jest.fn() }
    match.addPlayer(socket, 'Alice', 'red')
    ns.to.mockClear()
    match.removePlayer('sid-1')
    expect(match.players.size).toBe(0)
    expect(ns.to).toHaveBeenCalledWith('match-42')
  })

  test('no-op when player id not found', () => {
    expect(() => match.removePlayer('unknown')).not.toThrow()
  })
})

describe('toggleReady', () => {
  test('sets player isReady and calls checkStart', () => {
    const socket = { id: 'sid-1', join: jest.fn() }
    match.addPlayer(socket, 'Alice', 'red')
    match.start = jest.fn()
    match.toggleReady('sid-1', true)
    expect(match.players.get('sid-1').isReady).toBe(true)
    expect(match.start).toHaveBeenCalled()
  })

  test('does nothing for unknown socket id', () => {
    match.start = jest.fn()
    expect(() => match.toggleReady('unknown', true)).not.toThrow()
    expect(match.start).not.toHaveBeenCalled()
  })
})

describe('checkStart', () => {
  test('does not start when player list is empty', () => {
    match.start = jest.fn()
    match.checkStart()
    expect(match.start).not.toHaveBeenCalled()
  })

  test('does not start when not all players are ready', () => {
    const s1 = { id: 's1', join: jest.fn() }
    const s2 = { id: 's2', join: jest.fn() }
    match.addPlayer(s1, 'A', 'r')
    match.addPlayer(s2, 'B', 'b')
    match.players.get('s1').isReady = true
    match.start = jest.fn()
    match.checkStart()
    expect(match.start).not.toHaveBeenCalled()
  })

  test('starts when all players are ready', () => {
    const s1 = { id: 's1', join: jest.fn() }
    match.addPlayer(s1, 'A', 'r')
    match.players.get('s1').isReady = true
    match.start = jest.fn()
    match.checkStart()
    expect(match.start).toHaveBeenCalled()
  })

  test('does not start if status is not LOBBY', () => {
    const s1 = { id: 's1', join: jest.fn() }
    match.addPlayer(s1, 'A', 'r')
    match.players.get('s1').isReady = true
    match.status = 'PLAYING'
    match.start = jest.fn()
    match.checkStart()
    expect(match.start).not.toHaveBeenCalled()
  })
})

describe('broadcast', () => {
  test('emits event to namespace room', () => {
    const payload = { x: 1 }
    match.broadcast('test:event', payload)
    expect(ns.to).toHaveBeenCalledWith('match-42')
    expect(ns._emit).toHaveBeenCalledWith('test:event', payload)
  })
})

describe('stop', () => {
  test('sets status to FINISHED and clears heartbeat', () => {
    match.heartbeat = setInterval(() => {}, 10000)
    match.stop()
    expect(match.status).toBe('FINISHED')
  })

  test('handles null heartbeat without throwing', () => {
    match.heartbeat = null
    expect(() => match.stop()).not.toThrow()
  })
})

describe('start / update stubs', () => {
  test('start is a no-op by default', () => {
    expect(() => match.start()).not.toThrow()
  })

  test('update is a no-op by default', () => {
    expect(() => match.update()).not.toThrow()
  })
})
