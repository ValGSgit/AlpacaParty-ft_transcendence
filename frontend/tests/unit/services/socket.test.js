import { beforeEach, describe, expect, it, vi } from 'vitest'

const ioMock = vi.fn()

vi.mock('socket.io-client', () => ({
  io: ioMock,
}))

describe('frontend socket service', () => {
  beforeEach(() => {
    vi.resetModules()
    ioMock.mockReset()
  })

  it('reuses an existing live socket instance', async () => {
    const socketInstance = {
      connected: false,
      disconnected: false,
      disconnect: vi.fn(),
    }
    ioMock.mockReturnValue(socketInstance)

    const { connectSocket } = await import('../../../src/services/socket.js')

    const first = connectSocket()
    const second = connectSocket()

    expect(first).toBe(socketInstance)
    expect(second).toBe(socketInstance)
    expect(ioMock).toHaveBeenCalledTimes(1)
  })

  it('creates a new socket after disconnect', async () => {
    const firstSocket = {
      connected: true,
      disconnected: false,
      disconnect: vi.fn(),
    }
    const secondSocket = {
      connected: true,
      disconnected: false,
      disconnect: vi.fn(),
    }
    ioMock.mockReturnValueOnce(firstSocket).mockReturnValueOnce(secondSocket)

    const { connectSocket, disconnectSocket } = await import('../../../src/services/socket.js')

    const first = connectSocket()
    disconnectSocket()
    const second = connectSocket()

    expect(first).toBe(firstSocket)
    expect(firstSocket.disconnect).toHaveBeenCalledTimes(1)
    expect(second).toBe(secondSocket)
    expect(ioMock).toHaveBeenCalledTimes(2)
  })
})