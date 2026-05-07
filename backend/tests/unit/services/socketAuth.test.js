import { jest, describe, test, expect, beforeEach } from '@jest/globals'

const mockVerifyToken = jest.fn()
const mockFindById = jest.fn()

jest.unstable_mockModule('../../../src/services/authService.js', () => ({
  default: { verifyToken: mockVerifyToken },
}))

jest.unstable_mockModule('../../../src/models/User.js', () => ({
  default: { findById: mockFindById },
}))

const { socketAuthMiddleware } = await import('../../../src/services/socketAuth.js')

function makeSocket(cookies = {}) {
  return { request: { cookies } }
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('socketAuthMiddleware', () => {
  test('calls next with error when no token cookie', async () => {
    const socket = makeSocket({})
    const next = jest.fn()
    await socketAuthMiddleware()(socket, next)
    expect(next).toHaveBeenCalledTimes(1)
    expect(next.mock.calls[0][0]).toBeInstanceOf(Error)
    expect(next.mock.calls[0][0].message).toBe('Authentication required')
  })

  test('calls next with error when verifyToken returns null', async () => {
    mockVerifyToken.mockReturnValue(null)
    const socket = makeSocket({ jwt_token: 'bad-token' })
    const next = jest.fn()
    await socketAuthMiddleware()(socket, next)
    expect(next.mock.calls[0][0].message).toBe('Invalid token')
  })

  test('calls next with error when token type is refresh', async () => {
    mockVerifyToken.mockReturnValue({ id: 1, type: 'refresh' })
    const socket = makeSocket({ jwt_token: 'refresh-token' })
    const next = jest.fn()
    await socketAuthMiddleware()(socket, next)
    expect(next.mock.calls[0][0].message).toBe('Invalid token')
  })

  test('calls next with error when user not found', async () => {
    mockVerifyToken.mockReturnValue({ id: 99, type: 'access' })
    mockFindById.mockResolvedValue(null)
    const socket = makeSocket({ jwt_token: 'valid-token' })
    const next = jest.fn()
    await socketAuthMiddleware()(socket, next)
    expect(next.mock.calls[0][0].message).toBe('User not found')
  })

  test('attaches user to socket and calls next() on success', async () => {
    const user = { id: 1, username: 'alice' }
    mockVerifyToken.mockReturnValue({ id: 1, type: 'access' })
    mockFindById.mockResolvedValue(user)
    const socket = makeSocket({ jwt_token: 'valid-token' })
    const next = jest.fn()
    await socketAuthMiddleware()(socket, next)
    expect(socket.user).toBe(user)
    expect(next).toHaveBeenCalledWith()
  })

  test('calls next with error when verifyToken throws', async () => {
    mockVerifyToken.mockImplementation(() => { throw new Error('jwt malformed') })
    const socket = makeSocket({ jwt_token: 'token' })
    const next = jest.fn()
    await socketAuthMiddleware()(socket, next)
    expect(next.mock.calls[0][0].message).toBe('jwt malformed')
  })

  test('calls next with error when findById rejects', async () => {
    mockVerifyToken.mockReturnValue({ id: 1, type: 'access' })
    mockFindById.mockRejectedValue(new Error('DB error'))
    const socket = makeSocket({ jwt_token: 'token' })
    const next = jest.fn()
    await socketAuthMiddleware()(socket, next)
    expect(next.mock.calls[0][0].message).toBe('DB error')
  })
})
