import { jest, describe, test, expect, beforeEach } from '@jest/globals'

const mockAlpacaFarm = {
  findFirst: jest.fn(),
  upsert: jest.fn(),
}

jest.unstable_mockModule('#config/prisma.js', () => ({
  default: {
    alpacaFarm: mockAlpacaFarm,
  },
}))

const { getFarmData, updateFarmData } = await import('../../../src/controllers/alpacaFarmController.js')

function makeReqRes(overrides = {}) {
  const req = {
    user: { id: 7 },
    body: {},
    query: {},
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
})

// ── getFarmData ──────────────────────────────────────────────────────────────

describe('getFarmData', () => {
  test('returns farmData for the authenticated user', async () => {
    const farmData = { userId: 7, coins: 50, alpacas: [] }
    mockAlpacaFarm.findFirst.mockResolvedValue(farmData)
    const { req, res, next } = makeReqRes()
    await getFarmData(req, res, next)
    expect(mockAlpacaFarm.findFirst).toHaveBeenCalledWith({ where: { userId: 7 } })
    expect(res._status).toBe(200)
    expect(res._json).toEqual({ farmData })
    expect(next).not.toHaveBeenCalled()
  })

  test('returns null farmData when user has no farm yet', async () => {
    mockAlpacaFarm.findFirst.mockResolvedValue(null)
    const { req, res, next } = makeReqRes()
    await getFarmData(req, res, next)
    expect(res._json).toEqual({ farmData: null })
  })

  test('calls next on error', async () => {
    mockAlpacaFarm.findFirst.mockRejectedValue(new Error('DB error'))
    const { req, res, next } = makeReqRes()
    await getFarmData(req, res, next)
    expect(next).toHaveBeenCalledWith(expect.any(Error))
  })
})

// ── updateFarmData ───────────────────────────────────────────────────────────

describe('updateFarmData', () => {
  test('upserts farm data and returns updated record', async () => {
    const updated = { userId: 7, coins: 100, alpacas: ['a1'], items: [], upgrades: 1, herdsize: 3 }
    mockAlpacaFarm.upsert.mockResolvedValue(updated)
    const body = { items: [], alpacas: ['a1'], coins: 100, upgrades: 1, herdsize: 3 }
    const { req, res, next } = makeReqRes({ body })
    await updateFarmData(req, res, next)
    expect(mockAlpacaFarm.upsert).toHaveBeenCalledWith({
      where: { userId: 7 },
      update: { items: [], alpacas: ['a1'], coins: 100, upgrades: 1, herdsize: 3 },
      create: { userId: 7, items: [], alpacas: ['a1'], coins: 100, upgrades: 1, herdsize: 3 },
    })
    expect(res._status).toBe(200)
    expect(res._json).toEqual({ farmData: updated })
    expect(next).not.toHaveBeenCalled()
  })

  test('uses default values when body fields are undefined', async () => {
    const updated = { userId: 7, coins: 10, alpacas: [], items: [], upgrades: 0, herdsize: 0 }
    mockAlpacaFarm.upsert.mockResolvedValue(updated)
    const { req, res, next } = makeReqRes({ body: {} })
    await updateFarmData(req, res, next)
    expect(mockAlpacaFarm.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          coins: 10,
          upgrades: 0,
          herdsize: 0,
        }),
      }),
    )
  })

  test('calls next on error', async () => {
    mockAlpacaFarm.upsert.mockRejectedValue(new Error('DB error'))
    const { req, res, next } = makeReqRes({ body: { coins: 5 } })
    await updateFarmData(req, res, next)
    expect(next).toHaveBeenCalledWith(expect.any(Error))
  })
})
