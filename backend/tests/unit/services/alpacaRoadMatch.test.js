import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals'
import { AlpacaRoadMatch } from '../../../src/services/AlpacaRoadMatch.js'

function makeMockNamespace() {
  const emit = jest.fn()
  const to = jest.fn().mockReturnValue({ emit })
  return { to, emit, _emit: emit }
}

function makeSocket(id) {
  return { id, join: jest.fn() }
}

let ns, match

beforeEach(() => {
  jest.useFakeTimers()
  ns = makeMockNamespace()
  match = new AlpacaRoadMatch('room-1', ns, "Test Room", jest.fn())
})

afterEach(() => {
  match.stop()
  jest.useRealTimers()
  jest.clearAllMocks()
})

describe('AlpacaRoadMatch constructor', () => {
  test('initializes game fields', () => {
    expect(match.obstacles).toEqual([])
    expect(match.isPlaying).toBe(false)
    expect(match.level).toBe(1)
    expect(match.roadSpeed).toBe(0)
    expect(match.status).toBe('LOBBY')
  })
})

describe('addPlayer', () => {
  test('assigns lane 0 to first player', () => {
    const socket = makeSocket('s1')
    match.addPlayer(socket, 'Alice', 'red')
    expect(match.players.get('s1').lane).toBe(0)
  })

  test('assigns incrementing lanes to multiple players', () => {
    match.addPlayer(makeSocket('s1'), 'A', 'r')
    match.addPlayer(makeSocket('s2'), 'B', 'b')
    match.addPlayer(makeSocket('s3'), 'C', 'g')
    expect(match.players.get('s1').lane).toBe(0)
    expect(match.players.get('s2').lane).toBe(1)
    expect(match.players.get('s3').lane).toBe(2)
  })

  test('sets jump/active/lastActive fields on player', () => {
    const socket = makeSocket('s1')
    match.addPlayer(socket, 'Alice', 'red')
    const player = match.players.get('s1')
    expect(player.isJumping).toBe(false)
    expect(player.isActive).toBe(true)
    expect(typeof player.lastActive).toBe('number')
  })
})

describe('stop', () => {
  test('sets isPlaying to false, clears obstacles, roadSpeed', () => {
    match.isPlaying = true
    match.obstacles = [{ id: '1' }]
    match.roadSpeed = 50
    match.stop()
    expect(match.isPlaying).toBe(false)
    expect(match.obstacles).toEqual([])
    expect(match.roadSpeed).toBe(0)
    expect(match.status).toBe('FINISHED')
  })
})

describe('start', () => {
  test('sets status to COUNTDOWN and inits obstacles', () => {
    match.addPlayer(makeSocket('s1'), 'Alice', 'red')
    match.start()
    expect(match.status).toBe('COUNTDOWN')
    expect(match.obstacles.length).toBeGreaterThan(0)
  })

  test('transitions to PLAYING after 4s countdown', () => {
    match.addPlayer(makeSocket('s1'), 'Alice', 'red')
    match.start()
    expect(match.isPlaying).toBe(false)
    jest.advanceTimersByTime(4000)
    expect(match.isPlaying).toBe(true)
    expect(match.status).toBe('PLAYING')
    expect(match.roadSpeed).toBe(30)
  })
})

describe('handlePlayerHit', () => {
  test('decrements hp when player is hit', () => {
    match.addPlayer(makeSocket('s1'), 'Alice', 'red')
    const player = match.players.get('s1')
    const prevHp = player.hp
    match.handlePlayerHit('s1')
    expect(player.isHit).toBe(true)
    expect(player.hp).toBe(prevHp - 1)
  })

  test('marks player as dead when hp reaches 0', () => {
    match.addPlayer(makeSocket('s1'), 'Alice', 'red')
    const player = match.players.get('s1')
    player.hp = 1
    match.handlePlayerHit('s1')
    expect(player.isDead).toBe(true)
  })

  test('does nothing for unknown socket', () => {
    expect(() => match.handlePlayerHit('unknown')).not.toThrow()
  })

  test('does nothing when player is already dead', () => {
    match.addPlayer(makeSocket('s1'), 'Alice', 'red')
    const player = match.players.get('s1')
    player.isDead = true
    const originalHp = player.hp
    match.handlePlayerHit('s1')
    expect(player.hp).toBe(originalHp)
  })

  test('does nothing when player is already hit', () => {
    match.addPlayer(makeSocket('s1'), 'Alice', 'red')
    const player = match.players.get('s1')
    player.isHit = true
    const originalHp = player.hp
    match.handlePlayerHit('s1')
    expect(player.hp).toBe(originalHp)
  })
})

describe('handlePlayerHitComplete', () => {
  test('clears isHit flag', () => {
    match.addPlayer(makeSocket('s1'), 'Alice', 'red')
    const player = match.players.get('s1')
    player.isHit = true
    match.handlePlayerHitComplete('s1')
    expect(player.isHit).toBe(false)
  })

  test('does nothing when player is not hit', () => {
    match.addPlayer(makeSocket('s1'), 'Alice', 'red')
    const player = match.players.get('s1')
    player.isHit = false
    match.handlePlayerHitComplete('s1')
    expect(player.isHit).toBe(false)
  })

  test('does nothing for unknown socket', () => {
    expect(() => match.handlePlayerHitComplete('unknown')).not.toThrow()
  })
})

describe('handlePlayerJump', () => {
  test('sets isJumping true, resets after 600ms', () => {
    match.addPlayer(makeSocket('s1'), 'Alice', 'red')
    const player = match.players.get('s1')
    match.handlePlayerJump('s1')
    expect(player.isJumping).toBe(true)
    jest.advanceTimersByTime(600)
    expect(player.isJumping).toBe(false)
  })

  test('does nothing when player is already jumping', () => {
    match.addPlayer(makeSocket('s1'), 'Alice', 'red')
    const player = match.players.get('s1')
    player.isJumping = true
    match.handlePlayerJump('s1')
    // still jumping, no additional side effects
    expect(player.isJumping).toBe(true)
  })

  test('does nothing when player is dead', () => {
    match.addPlayer(makeSocket('s1'), 'Alice', 'red')
    const player = match.players.get('s1')
    player.isDead = true
    match.handlePlayerJump('s1')
    expect(player.isJumping).toBe(false)
  })

  test('jump timeout is safe when player has left', () => {
    match.addPlayer(makeSocket('s1'), 'Alice', 'red')
    match.handlePlayerJump('s1')
    match.players.delete('s1')
    expect(() => jest.advanceTimersByTime(600)).not.toThrow()
  })

  test('does nothing for unknown socket', () => {
    expect(() => match.handlePlayerJump('unknown')).not.toThrow()
  })
})

describe('handleActive', () => {
  test('updates lastActive and sets isActive true for alive player', () => {
    match.addPlayer(makeSocket('s1'), 'Alice', 'red')
    const player = match.players.get('s1')
    player.isActive = false
    const before = player.lastActive
    jest.advanceTimersByTime(100)
    match.handleActive('s1')
    expect(player.isActive).toBe(true)
    expect(player.lastActive).toBeGreaterThanOrEqual(before)
  })

  test('does nothing for dead player', () => {
    match.addPlayer(makeSocket('s1'), 'Alice', 'red')
    const player = match.players.get('s1')
    player.isDead = true
    player.isActive = false
    match.handleActive('s1')
    expect(player.isActive).toBe(false)
  })

  test('does nothing for unknown socket', () => {
    expect(() => match.handleActive('unknown')).not.toThrow()
  })
})

describe('createObstacle', () => {
  test('adds an obstacle with required shape', () => {
    match.addPlayer(makeSocket('s1'), 'Alice', 'red')
    match.createObstacle(500)
    expect(match.obstacles).toHaveLength(1)
    const obs = match.obstacles[0]
    expect(obs).toHaveProperty('id')
    expect(obs).toHaveProperty('typeId')
    expect(obs).toHaveProperty('lane')
    expect(obs.z).toBe(500)
    expect(typeof obs.isFull).toBe('boolean')
    expect(obs.pointGiven).toBe(false)
  })

  test('uses default z=700 when no position given', () => {
    match.addPlayer(makeSocket('s1'), 'Alice', 'red')
    match.createObstacle()
    expect(match.obstacles[0].z).toBe(700)
  })

  test('picks a random lane when no active players', () => {
    match.createObstacle(100)
    const obs = match.obstacles[0]
    expect(obs.lane).toBeGreaterThanOrEqual(0)
    expect(obs.lane).toBeLessThan(4)
  })
})

describe('initObstacles', () => {
  test('creates 8 obstacles spaced along the road', () => {
    match.addPlayer(makeSocket('s1'), 'Alice', 'red')
    match.initObstacles()
    expect(match.obstacles).toHaveLength(8)
  })
})

describe('updateDifficulty', () => {
  test('increases level and road speed when enough points accumulated', () => {
    match.totalPoints = 10
    match.roadSpeed = 30
    match.level = 1
    const originalLevel = match.level
    match.updateDifficulty()
    // At level 1: pointsPerLevel = 5, newLevel = floor(10/5)+1 = 3
    expect(match.level).toBeGreaterThan(originalLevel)
    expect(match.roadSpeed).toBeGreaterThan(30)
  })

  test('does not change level when not enough points', () => {
    match.totalPoints = 0
    match.level = 1
    match.roadSpeed = 30
    match.updateDifficulty()
    expect(match.level).toBe(1)
    expect(match.roadSpeed).toBe(30)
  })
})

describe('checkActivity', () => {
  test('marks player inactive after 3s without activity', () => {
    match.isPlaying = true
    match.addPlayer(makeSocket('s1'), 'Alice', 'red')
    const player = match.players.get('s1')
    player.lastActive = Date.now() - 4000 // 4 seconds ago
    match.checkActivity()
    expect(player.isActive).toBe(false)
  })

  test('does nothing when isPlaying is false', () => {
    match.isPlaying = false
    match.addPlayer(makeSocket('s1'), 'Alice', 'red')
    const player = match.players.get('s1')
    player.isActive = true
    player.lastActive = Date.now() - 4000
    match.checkActivity()
    expect(player.isActive).toBe(true)
  })

  test('does not mark dead players inactive', () => {
    match.isPlaying = true
    match.addPlayer(makeSocket('s1'), 'Alice', 'red')
    const player = match.players.get('s1')
    player.isDead = true
    player.isActive = true
    player.lastActive = Date.now() - 4000
    match.checkActivity()
    // Dead players are skipped
    expect(player.isActive).toBe(true)
  })
})

describe('update', () => {
  test('broadcasts tick with player and obstacle state', () => {
    match.addPlayer(makeSocket('s1'), 'Alice', 'red')
    ns._emit.mockClear()
    match.update()
    expect(ns.to).toHaveBeenCalledWith('room-1')
    expect(ns._emit).toHaveBeenCalledWith('tick', expect.objectContaining({
      obstacles: expect.any(Array),
      players: expect.any(Array),
      roadSpeed: expect.any(Number),
    }))
  })

  test('moves obstacles when playing', () => {
    match.isPlaying = true
    match.roadSpeed = 30
    match.obstacles.push({ id: '1', z: 100, pointGiven: false, isFull: false, lane: 0 })
    match.addPlayer(makeSocket('s1'), 'Alice', 'red')
    match.update()
    expect(match.obstacles[0].z).toBeLessThan(100)
  })

  test('filters out obstacles far behind (z < -50)', () => {
    match.isPlaying = true
    match.obstacles.push({ id: '1', z: -60, pointGiven: true, isFull: false, lane: 0 })
    match.addPlayer(makeSocket('s1'), 'Alice', 'red')
    match.update()
    expect(match.obstacles.find(o => o.id === '1')).toBeUndefined()
  })

  test('awards point to active alive player who passes obstacle in their lane', () => {
    match.isPlaying = true
    match.roadSpeed = 0
    match.addPlayer(makeSocket('s1'), 'Alice', 'red')
    const player = match.players.get('s1')
    player.lane = 0
    player.isActive = true
    player.isDead = false
    player.isHit = false
    match.obstacles.push({ id: 'o1', z: -0.3, pointGiven: false, isFull: false, lane: 0 })
    match.update()
    expect(player.points).toBe(1)
  })

  test('damages inactive player when obstacle is in their lane (does not park isHit)', () => {
    // Inactive players take HP loss but isHit stays false — otherwise on
    // resume the !player.isHit guard in handlePlayerHit would silently no-op
    // and the player would be permanently undamageable.
    match.isPlaying = true
    match.roadSpeed = 0
    match.addPlayer(makeSocket('s1'), 'Alice', 'red')
    const player = match.players.get('s1')
    player.lane = 0
    player.isActive = false
    player.isDead = false
    player.isHit = false
    match.obstacles.push({ id: 'o1', z: -0.3, pointGiven: false, isFull: false, lane: 0 })
    match.update()
    expect(player.isHit).toBe(false)
    expect(player.hp).toBe(2)
  })

  test('spawns new obstacle when spawnTimer expires', () => {
    match.isPlaying = true
    match.spawnTimer = -1
    match.addPlayer(makeSocket('s1'), 'Alice', 'red')
    const beforeCount = match.obstacles.length
    match.update()
    expect(match.obstacles.length).toBeGreaterThan(beforeCount)
  })

  test('triggers game_over when all players are dead', () => {
    match.isPlaying = true
    match.addPlayer(makeSocket('s1'), 'Alice', 'red')
    match.players.get('s1').isDead = true
    match.update()
    // game_over is broadcast after 1500ms timeout
    jest.advanceTimersByTime(1500)
    expect(ns._emit).toHaveBeenCalledWith('game_over', undefined)
  })
})
