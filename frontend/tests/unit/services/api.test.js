/**
 * HTTP client (api.js) Unit Tests
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import api, { HttpError } from '../../../src/services/api.js'

/**
 * Build a minimal fetch Response stand-in.
 */
function makeResponse({ status = 200, contentType = 'application/json', body = {} } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name) => (name.toLowerCase() === 'content-type' ? contentType : null) },
    json: async () => body,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  }
}

describe('api HTTP client', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('verb helpers', () => {
    it('GET resolves to the parsed response envelope', async () => {
      fetch.mockResolvedValueOnce(makeResponse({ body: { ok: true } }))

      const res = await api.get('/things')

      expect(res.status).toBe(200)
      expect(res.data).toEqual({ ok: true })
      expect(res.config.method).toBe('GET')
      const [, init] = fetch.mock.calls[0]
      expect(init.method).toBe('GET')
      expect(init.body).toBeUndefined()
      expect(init.credentials).toBe('include')
    })

    it('POST serializes a JSON body and sets Content-Type', async () => {
      fetch.mockResolvedValueOnce(makeResponse({ status: 201, body: { id: 1 } }))

      await api.post('/things', { name: 'a' })

      const [, init] = fetch.mock.calls[0]
      expect(init.method).toBe('POST')
      expect(init.body).toBe(JSON.stringify({ name: 'a' }))
      expect(init.headers['Content-Type']).toBe('application/json')
    })

    it('PUT, PATCH and DELETE forward the right method', async () => {
      fetch.mockResolvedValue(makeResponse({ body: {} }))

      await api.put('/things/1', { a: 1 })
      await api.patch('/things/1', { a: 2 })
      await api.delete('/things/1')

      expect(fetch.mock.calls[0][1].method).toBe('PUT')
      expect(fetch.mock.calls[1][1].method).toBe('PATCH')
      expect(fetch.mock.calls[2][1].method).toBe('DELETE')
    })

    it('does not JSON-encode FormData bodies', async () => {
      fetch.mockResolvedValueOnce(makeResponse({ body: {} }))
      const form = new FormData()
      form.append('file', 'x')

      await api.post('/upload', form)

      const [, init] = fetch.mock.calls[0]
      expect(init.body).toBe(form)
      expect(init.headers['Content-Type']).toBeUndefined()
    })
  })

  describe('URL and params', () => {
    it('appends scalar params, repeats array params and skips null/undefined', async () => {
      fetch.mockResolvedValueOnce(makeResponse({ body: {} }))

      await api.get('/search', {
        params: { q: 'cats', tags: ['a', 'b'], skip: null, gone: undefined },
      })

      const url = new URL(fetch.mock.calls[0][0])
      expect(url.searchParams.get('q')).toBe('cats')
      expect(url.searchParams.getAll('tags')).toEqual(['a', 'b'])
      expect(url.searchParams.has('skip')).toBe(false)
      expect(url.searchParams.has('gone')).toBe(false)
    })
  })

  describe('response parsing', () => {
    it('returns null body on 204 No Content', async () => {
      fetch.mockResolvedValueOnce(makeResponse({ status: 204, contentType: '' }))

      const res = await api.delete('/things/1')

      expect(res.status).toBe(204)
      expect(res.data).toBeNull()
    })

    it('returns text when content-type is not JSON', async () => {
      fetch.mockResolvedValueOnce(
        makeResponse({ contentType: 'text/plain', body: 'hello' }),
      )

      const res = await api.get('/ping')

      expect(res.data).toBe('hello')
    })
  })

  describe('error handling', () => {
    it('throws HttpError carrying the parsed error body on a 4xx', async () => {
      fetch.mockResolvedValueOnce(
        makeResponse({ status: 400, body: { message: 'bad' } }),
      )

      await expect(api.get('/things')).rejects.toMatchObject({
        name: 'HttpError',
        data: { message: 'bad' },
      })
    })

    it('wraps a network failure in an HttpError', async () => {
      fetch.mockRejectedValueOnce(new TypeError('offline'))

      const err = await api.get('/things').catch((e) => e)
      expect(err).toBeInstanceOf(HttpError)
      expect(err.message).toBe('offline')
    })

    it('surfaces a timeout as an HttpError', async () => {
      // Simulate fetch honoring the abort signal.
      fetch.mockImplementationOnce(() => {
        const e = new Error('aborted')
        e.name = 'AbortError'
        return Promise.reject(e)
      })

      const err = await api.get('/slow', { timeout: 10 }).catch((e) => e)
      expect(err).toBeInstanceOf(HttpError)
      expect(err.message).toBe('Request timed out')
    })
  })

  describe('account banned', () => {
    it('dispatches an auth:banned event on a 403 with code ACCOUNT_BANNED', async () => {
      fetch.mockResolvedValueOnce(
        makeResponse({
          status: 403,
          body: { error: { code: 'ACCOUNT_BANNED', message: 'Account is banned' } },
        }),
      )
      const onBanned = vi.fn()
      window.addEventListener('auth:banned', onBanned)

      const err = await api.get('/feed').catch((e) => e)

      expect(err).toBeInstanceOf(HttpError)
      expect(onBanned).toHaveBeenCalledTimes(1)
      expect(onBanned.mock.calls[0][0].detail.message).toBe('Account is banned')
      window.removeEventListener('auth:banned', onBanned)
    })

    it('does not dispatch on an ordinary 403 without the ban code', async () => {
      fetch.mockResolvedValueOnce(
        makeResponse({ status: 403, body: { error: { message: 'Forbidden' } } }),
      )
      const onBanned = vi.fn()
      window.addEventListener('auth:banned', onBanned)

      await api.get('/feed').catch(() => {})

      expect(onBanned).not.toHaveBeenCalled()
      window.removeEventListener('auth:banned', onBanned)
    })
  })

  describe('401 refresh flow', () => {
    it('refreshes once on 401 then retries the original request', async () => {
      fetch
        .mockResolvedValueOnce(makeResponse({ status: 401, body: { message: 'expired' } })) // original
        .mockResolvedValueOnce(makeResponse({ body: { refreshed: true } })) // /auth/refresh
        .mockResolvedValueOnce(makeResponse({ body: { ok: true } })) // retry

      const res = await api.get('/secure')

      expect(res.data).toEqual({ ok: true })
      expect(fetch).toHaveBeenCalledTimes(3)
      const refreshCall = fetch.mock.calls[1]
      expect(String(refreshCall[0])).toContain('/auth/refresh')
      expect(refreshCall[1].method).toBe('POST')
    })

    it('surfaces the original 401 when the refresh itself fails', async () => {
      fetch
        .mockResolvedValueOnce(makeResponse({ status: 401, body: { message: 'expired' } })) // original
        .mockResolvedValueOnce(makeResponse({ status: 401, body: { message: 'no' } })) // refresh fails

      const err = await api.get('/secure').catch((e) => e)

      expect(err).toBeInstanceOf(HttpError)
      expect(err.data).toEqual({ message: 'expired' })
      expect(fetch).toHaveBeenCalledTimes(2)
    })
  })
})
