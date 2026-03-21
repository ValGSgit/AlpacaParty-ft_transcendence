/**
 * API Service — Axios instance for backend communication
 * @owner fankahou, LukasStefanek
 * @issue https://github.com/ValGSgit/AlpacaParty/issues/1
 *
 * Includes JWT interceptors for automatic token management.
 */
import axios from 'axios'

const env = import.meta?.env || {}

const api = axios.create({
  baseURL: env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// ── Request interceptor: attach access token ──────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ── Response interceptor: handle 401 & auto-refresh ───────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // If 401 and we haven't already tried to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      const refreshToken = localStorage.getItem('refreshToken')
      if (refreshToken) {
        try {
          const { data } = await axios.post(
            `${api.defaults.baseURL}/auth/refresh`,
            { refreshToken },
          )
          localStorage.setItem('accessToken', data.accessToken)
          localStorage.setItem('refreshToken', data.refreshToken)
          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`
          return api(originalRequest)
        } catch {
          // Refresh failed — clear tokens
          localStorage.removeItem('accessToken')
          localStorage.removeItem('refreshToken')
        }
      }
    }

    return Promise.reject(error)
  },
)

export default api
