/**
 * API Service — Axios instance for backend communication
 * @owner fankahou, LukasStefanek
 * @issue https://github.com/ValGSgit/Cleanscendence/issues/1
 *
 * Auth interceptors will be added with Issue #8
 */
import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// TODO: Add request/response interceptors for JWT (Issue #8)

export default api
