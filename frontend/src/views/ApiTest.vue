<!--
  API Test Dashboard — one button per backend endpoint
  Access at /api-test (no auth guard).
  Works in both dev (Vite proxy → localhost:3000) and prod (nginx → backend:3000).
-->
<template>
  <div class="api-test">

    <!-- ── Top bar ──────────────────────────────────────────── -->
    <div class="topbar">
      <div class="topbar-left">
        <h1>API Endpoint Tester</h1>
        <span class="env-badge" :class="isProd ? 'prod' : 'dev'">
          {{ isProd ? 'PRODUCTION' : 'DEVELOPMENT' }}
        </span>
      </div>
      <div class="topbar-right">
        <span class="base-url-label">Base URL:</span>
        <code class="base-url-display">{{ effectiveBase }}</code>
        <span class="health-dot" :class="healthStatus" :title="healthTitle">●</span>
        <button class="icon-btn" @click="pingHealth" title="Re-check health">⟳</button>
      </div>
    </div>
    <p class="subtitle">Click any endpoint button to fire it. For POST / PUT you can edit the body before sending.</p>

    <!-- ── Auth box ──────────────────────────────────────────── -->
    <section class="card auth-box">
      <h3>Quick Auth</h3>
      <div class="inline-form">
        <label>Username<input v-model="regUsername" placeholder="testuser" /></label>
        <label>Email<input v-model="regEmail" placeholder="test@test.com" /></label>
        <label>Password<input v-model="regPassword" placeholder="password" type="password" /></label>
        <button class="btn-auth" @click="doRegister" :disabled="loading.auth">Register</button>
        <button class="btn-auth" @click="doLogin"    :disabled="loading.auth">Login</button>
        <button class="btn-auth danger" @click="doLogout" :disabled="!token || loading.auth">Logout</button>
      </div>
      <div class="token-row">
        <span>Token: <code>{{ token ? token.slice(0, 30) + '…' : '(none)' }}</code></span>
        <span>User ID: <code>{{ userId ?? '–' }}</code></span>
        <button v-if="token" class="icon-btn small" @click="copyText(token)" title="Copy token">⎘</button>
      </div>
    </section>

    <!-- ── Custom ID inputs ──────────────────────────────────── -->
    <section class="card">
      <div class="section-header" @click="collapsed.ids = !collapsed.ids">
        <h3>Dynamic IDs &amp; Params</h3>
        <span class="chevron">{{ collapsed.ids ? '▶' : '▼' }}</span>
      </div>
      <div v-show="!collapsed.ids" class="inline-form padded">
        <label>Target User ID<input v-model.number="targetUserId"  type="number" placeholder="2" /></label>
        <label>Post ID<input        v-model.number="targetPostId"   type="number" placeholder="1" /></label>
        <label>Room ID<input        v-model.number="targetRoomId"   type="number" placeholder="1" /></label>
        <label>Org ID<input         v-model.number="targetOrgId"    type="number" placeholder="1" /></label>
        <label>Request ID<input     v-model.number="targetReqId"    type="number" placeholder="1" /></label>
        <label>Notif ID<input       v-model.number="targetNotifId"  type="number" placeholder="1" /></label>
        <label>File ID<input        v-model.number="targetFileId"   type="number" placeholder="1" /></label>
        <label>API Key<input        v-model="apiKey"               placeholder="test-api-key" /></label>
      </div>
    </section>

    <!-- ── Search ────────────────────────────────────────────── -->
    <div class="search-row">
      <input v-model="searchQuery" class="search-input" placeholder="🔍  Filter endpoints…" />
      <button class="icon-btn" @click="searchQuery = ''" v-if="searchQuery" title="Clear">✕</button>
    </div>

    <!-- ── Endpoint sections ─────────────────────────────────── -->
    <section
      v-for="section in filteredSections"
      :key="section.title"
      class="card section"
    >
      <div class="section-header" @click="toggleSection(section.title)">
        <h2>{{ section.title }}</h2>
        <span class="chevron">{{ collapsed[section.title] ? '▶' : '▼' }}</span>
      </div>
      <div v-show="!collapsed[section.title]" class="btn-grid">
        <button
          v-for="ep in section.endpoints"
          :key="ep.label"
          class="ep-btn"
          :class="[epMethodClass(ep), { 'is-loading': isLoading(ep) }]"
          @click="clickEndpoint(ep)"
          :disabled="isLoading(ep)"
        >
          <span class="spinner" v-if="isLoading(ep)">⟳</span>
          <span class="method" v-else>{{ ep.method ?? 'GET' }}</span>
          {{ ep.label }}
        </button>
      </div>
    </section>

    <!-- ── Body editor modal ─────────────────────────────────── -->
    <div v-if="editorOpen" class="modal-overlay" @click.self="editorOpen = false">
      <div class="modal">
        <div class="modal-header">
          <span class="modal-title">
            <span class="method" :class="editorEp?.method?.toLowerCase()">{{ editorEp?.method ?? 'GET' }}</span>
            {{ effectiveBase }}{{ resolvedEditorPath }}
          </span>
          <button class="icon-btn" @click="editorOpen = false">✕</button>
        </div>
        <label class="modal-label">Request Body (JSON)</label>
        <textarea v-model="editorBody" class="body-editor" rows="12" spellcheck="false" />
        <div class="modal-footer">
          <span class="modal-err" v-if="editorJsonErr">{{ editorJsonErr }}</span>
          <button class="btn-auth" @click="sendFromEditor">Send Request</button>
        </div>
      </div>
    </div>

    <!-- ── Log ───────────────────────────────────────────────── -->
    <section class="card log-section">
      <div class="log-header">
        <h2>Response Log <span class="log-count">({{ logs.length }})</span></h2>
        <div class="log-actions">
          <button class="icon-btn" @click="exportLog" title="Export log as JSON" :disabled="logs.length === 0">⬇ Export</button>
          <button class="clear-btn" @click="logs = []" :disabled="logs.length === 0">Clear</button>
        </div>
      </div>
      <div class="log-box" ref="logBox">
        <div v-if="logs.length === 0" class="log-empty">No requests yet.</div>
        <div
          v-for="(entry, i) in [...logs].reverse()"
          :key="i"
          class="log-entry"
          :class="entry.ok ? 'ok' : 'err'"
        >
          <div class="log-meta">
            <span class="log-method">{{ entry.method }}</span>
            <span class="log-url">{{ entry.url }}</span>
            <span class="log-status">{{ entry.status }}</span>
            <span class="log-time">{{ entry.time }}ms</span>
            <div class="log-actions-row">
              <button class="icon-btn small" @click="copyText(entry.body)" title="Copy response">⎘</button>
              <button class="icon-btn small" @click="entry.collapsed = !entry.collapsed" title="Toggle body">
                {{ entry.collapsed ? '▶' : '▼' }}
              </button>
            </div>
          </div>
          <pre v-show="!entry.collapsed" class="log-body">{{ entry.body }}</pre>
        </div>
      </div>
    </section>

  </div>
</template>

<script setup>
import { ref, computed, reactive, nextTick } from 'vue'
import axios from 'axios'

// ── Environment detection ───────────────────────────────────
const isProd = import.meta.env.PROD
const BASE = '/api'
const effectiveBase = computed(() => {
  if (isProd) return window.location.origin + BASE
  return BASE + ' (proxied → localhost:3000)'
})

// ── Auth state ──────────────────────────────────────────────
const token        = ref(localStorage.getItem('accessToken') || '')
const refreshToken = ref(localStorage.getItem('refreshToken') || '')
const userId       = ref(null)

// ── Quick-auth form ─────────────────────────────────────────
const regUsername = ref('testuser')
const regEmail    = ref('test@test.com')
const regPassword = ref('Test1234!')

// ── Dynamic ID params ────────────────────────────────────────
const targetUserId  = ref(2)
const targetPostId  = ref(1)
const targetRoomId  = ref(1)
const targetOrgId   = ref(1)
const targetReqId   = ref(1)
const targetNotifId = ref(1)
const targetFileId  = ref(1)
const apiKey        = ref('test-api-key')

// ── UI state ────────────────────────────────────────────────
const logs        = ref([])
const logBox      = ref(null)
const searchQuery = ref('')
const loading     = reactive({ auth: false })
const activeReqs  = reactive({})          // label → true while in-flight
const collapsed   = reactive({ ids: false })

// ── Health indicator ─────────────────────────────────────────
const healthStatus = ref('unknown')       // 'ok' | 'err' | 'unknown' | 'loading'
const healthTitle  = computed(() => ({
  ok: 'Backend healthy',
  err: 'Backend unreachable',
  unknown: 'Health unknown — click ⟳',
  loading: 'Checking…',
}[healthStatus.value]))

async function pingHealth() {
  healthStatus.value = 'loading'
  try {
    await axios.get(`${BASE}/health`, { timeout: 5000 })
    healthStatus.value = 'ok'
  } catch {
    healthStatus.value = 'err'
  }
}
pingHealth()

// ── Body editor modal ─────────────────────────────────────────
const editorOpen      = ref(false)
const editorEp        = ref(null)
const editorBody      = ref('')
const editorJsonErr   = ref('')
const resolvedEditorPath = ref('')

const editorJsonErrWatcher = computed(() => {
  if (!editorBody.value.trim()) { editorJsonErr.value = ''; return }
  try { JSON.parse(editorBody.value); editorJsonErr.value = '' }
  catch (e) { editorJsonErr.value = 'Invalid JSON: ' + e.message }
})

function clickEndpoint(ep) {
  const method = (ep.method ?? 'GET').toUpperCase()
  if ((method === 'POST' || method === 'PUT' || method === 'PATCH') && ep.body !== undefined) {
    // Open body editor
    editorEp.value = ep
    const rawBody = typeof ep.body === 'function' ? ep.body() : ep.body
    editorBody.value = rawBody != null ? JSON.stringify(rawBody, null, 2) : ''
    resolvedEditorPath.value = typeof ep.path === 'function' ? ep.path() : ep.path
    editorJsonErr.value = ''
    editorOpen.value = true
  } else {
    fire(ep)
  }
}

function sendFromEditor() {
  if (editorJsonErr.value) return
  let body
  try { body = editorBody.value.trim() ? JSON.parse(editorBody.value) : undefined } catch { return }
  const ep = { ...editorEp.value, body }
  editorOpen.value = false
  fire(ep)
}

// ── Helpers ──────────────────────────────────────────────────
function authHeaders() {
  return token.value ? { Authorization: `Bearer ${token.value}` } : {}
}
function apiKeyHeaders() {
  return { 'X-API-Key': apiKey.value }
}

function isLoading(ep) { return !!activeReqs[ep.label] }
function epMethodClass(ep) { return (ep.method ?? 'GET').toLowerCase() }

function toggleSection(title) {
  collapsed[title] = !collapsed[title]
}

async function copyText(text) {
  try { await navigator.clipboard.writeText(text) } catch { /* ignore */ }
}

function exportLog() {
  const blob = new Blob([JSON.stringify(logs.value, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `api-log-${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(a.href)
}

async function request(method, path, body = undefined, extraHeaders = {}) {
  const url = `${BASE}${path}`
  const start = Date.now()
  const entry = reactive({ method: method.toUpperCase(), url, status: 0, body: '', ok: false, time: 0, collapsed: false })
  try {
    const res = await axios({ method, url, data: body, headers: { ...authHeaders(), ...extraHeaders } })
    entry.status = res.status
    entry.body = JSON.stringify(res.data, null, 2)
    entry.ok = true
  } catch (e) {
    entry.status = e.response?.status ?? 0
    entry.body = JSON.stringify(e.response?.data ?? e.message, null, 2)
  }
  entry.time = Date.now() - start
  logs.value.push(entry)
  await nextTick()
  if (logBox.value) logBox.value.scrollTop = 0
}

// ── Auth helpers ─────────────────────────────────────────────
async function doRegister() {
  loading.auth = true
  try {
    const res = await axios.post(`${BASE}/auth/register`, {
      username: regUsername.value,
      email: regEmail.value,
      password: regPassword.value,
    })
    handleAuthResponse(res)
    addLog('POST', '/auth/register', res)
  } catch (e) { addErrLog('POST', '/auth/register', e) }
  finally { loading.auth = false }
}

async function doLogin() {
  loading.auth = true
  try {
    const res = await axios.post(`${BASE}/auth/login`, {
      email: regEmail.value,
      password: regPassword.value,
    })
    handleAuthResponse(res)
    addLog('POST', '/auth/login', res)
  } catch (e) { addErrLog('POST', '/auth/login', e) }
  finally { loading.auth = false }
}

async function doLogout() {
  loading.auth = true
  try {
    const res = await axios.post(`${BASE}/auth/logout`, {}, { headers: authHeaders() })
    token.value = ''; refreshToken.value = ''
    localStorage.removeItem('accessToken'); localStorage.removeItem('refreshToken')
    userId.value = null
    addLog('POST', '/auth/logout', res)
  } catch (e) { addErrLog('POST', '/auth/logout', e) }
  finally { loading.auth = false }
}

function handleAuthResponse(res) {
  const d = res.data
  if (d.accessToken)  { token.value = d.accessToken;  localStorage.setItem('accessToken', d.accessToken) }
  if (d.refreshToken) { refreshToken.value = d.refreshToken; localStorage.setItem('refreshToken', d.refreshToken) }
  if (d.user?.id)     { userId.value = d.user.id }
}

function addLog(method, path, res) {
  logs.value.push(reactive({ method, url: `${BASE}${path}`, status: res.status, body: JSON.stringify(res.data, null, 2), ok: true, time: 0, collapsed: false }))
}
function addErrLog(method, path, e) {
  logs.value.push(reactive({ method, url: `${BASE}${path}`, status: e.response?.status ?? 0, body: JSON.stringify(e.response?.data ?? e.message, null, 2), ok: false, time: 0, collapsed: false }))
}

// ── Fire endpoint ─────────────────────────────────────────────
async function fire(ep) {
  const method = (ep.method ?? 'GET').toLowerCase()
  const path   = typeof ep.path    === 'function' ? ep.path()    : ep.path
  const body   = typeof ep.body    === 'function' ? ep.body()    : ep.body
  const extra  = typeof ep.headers === 'function' ? ep.headers() : (ep.headers ?? {})
  activeReqs[ep.label] = true
  try { await request(method, path, body, extra) }
  finally { activeReqs[ep.label] = false }
}

// ── Endpoint definitions ──────────────────────────────────────
const sections = computed(() => [
  {
    title: '🏥 Health',
    endpoints: [
      { label: 'Health Check', path: '/health' },
    ],
  },
  {
    title: '🔐 Auth',
    endpoints: [
      { label: 'Refresh Token',  method: 'POST', path: '/auth/refresh', body: () => ({ refreshToken: refreshToken.value }) },
      { label: 'Get Me (auth)',  path: '/auth/me' },
    ],
  },
  {
    title: '👤 Users',
    endpoints: [
      { label: 'Get My Profile',   path: '/users/me' },
      { label: 'Update My Profile', method: 'PUT', path: '/users/me', body: () => ({ bio: 'Updated via test page at ' + new Date().toLocaleTimeString() }) },
      { label: 'Change Password',  method: 'PUT',  path: '/users/me/password', body: () => ({ currentPassword: regPassword.value, newPassword: regPassword.value }) },
      { label: 'Export My Data',   path: '/users/me/export' },
      { label: 'Request Deletion', method: 'POST', path: '/users/me/delete-request' },
      { label: 'List Data Requests', path: '/users/me/data-requests' },
      { label: 'List Users',       path: '/users' },
      { label: 'Get User by ID',   path: () => `/users/${targetUserId.value}` },
    ],
  },
  {
    title: '🤝 Friends',
    endpoints: [
      { label: 'List Friends',       path: '/friends' },
      { label: 'Online Friends',     path: '/friends/online' },
      { label: 'Blocked Users',      path: '/friends/blocked' },
      { label: 'Friend Requests',    path: '/friends/requests' },
      { label: 'Send Friend Request', method: 'POST',   path: '/friends/requests', body: () => ({ receiverId: targetUserId.value }) },
      { label: 'Accept Request',     method: 'PUT',    path: () => `/friends/requests/${targetReqId.value}/accept` },
      { label: 'Decline Request',    method: 'PUT',    path: () => `/friends/requests/${targetReqId.value}/decline` },
      { label: 'Remove Friend',      method: 'DELETE', path: () => `/friends/${targetUserId.value}` },
      { label: 'Block User',         method: 'POST',   path: '/friends/block', body: () => ({ userId: targetUserId.value }) },
      { label: 'Unblock User',       method: 'DELETE', path: () => `/friends/block/${targetUserId.value}` },
    ],
  },
  {
    title: '💬 Chat',
    endpoints: [
      { label: 'List Conversations', path: '/chat/conversations' },
      { label: 'Unread Count',       path: '/chat/unread' },
      { label: 'Get DM',             path: () => `/chat/dm/${targetUserId.value}` },
      { label: 'List Rooms',         path: '/chat/rooms' },
      { label: 'Create Room',        method: 'POST',   path: '/chat/rooms', body: () => ({ name: 'TestRoom ' + Date.now() }) },
      { label: 'Room Messages',      path: () => `/chat/rooms/${targetRoomId.value}/messages` },
      { label: 'Add Room Member',    method: 'POST',   path: () => `/chat/rooms/${targetRoomId.value}/members`, body: () => ({ userId: targetUserId.value }) },
      { label: 'Remove Room Member', method: 'DELETE', path: () => `/chat/rooms/${targetRoomId.value}/members/${targetUserId.value}` },
      { label: 'Delete Room',        method: 'DELETE', path: () => `/chat/rooms/${targetRoomId.value}` },
    ],
  },
  {
    title: '📝 Posts',
    endpoints: [
      { label: 'Get Feed',    path: '/posts' },
      { label: 'User Posts',  path: () => `/posts/user/${targetUserId.value}` },
      { label: 'Get Post',    path: () => `/posts/${targetPostId.value}` },
      { label: 'Create Post', method: 'POST',   path: '/posts', body: () => ({ content: 'Test post at ' + new Date().toLocaleTimeString() }) },
      { label: 'Update Post', method: 'PUT',    path: () => `/posts/${targetPostId.value}`, body: () => ({ content: 'Updated at ' + new Date().toLocaleTimeString() }) },
      { label: 'Delete Post', method: 'DELETE', path: () => `/posts/${targetPostId.value}` },
      { label: 'Like Post',   method: 'POST',   path: () => `/posts/${targetPostId.value}/like` },
      { label: 'Unlike Post', method: 'DELETE', path: () => `/posts/${targetPostId.value}/like` },
    ],
  },
  {
    title: '🎮 Game',
    endpoints: [
      { label: 'My Stats',         path: '/game/stats' },
      { label: 'Game History',     path: '/game/history' },
      { label: 'Leaderboard',      path: '/game/leaderboard' },
      { label: 'Get Farm',         path: '/game/farm' },
      { label: 'Save Farm',        method: 'PUT', path: '/game/farm', body: () => ({ farm_data: { alpacas: [], resources: { gold: 200, food: 100 }, level: 2 } }) },
      { label: 'Achievements',     path: '/game/achievements' },
      { label: 'Daily Challenges', path: '/game/challenges' },
    ],
  },
  {
    title: '🏢 Organizations',
    endpoints: [
      { label: 'List Orgs',        path: '/organizations' },
      { label: 'My Orgs',          path: '/organizations/mine' },
      { label: 'Get Org',          path: () => `/organizations/${targetOrgId.value}` },
      { label: 'Create Org',       method: 'POST',   path: '/organizations', body: () => ({ name: 'TestOrg' + Date.now(), description: 'Test organization' }) },
      { label: 'Update Org',       method: 'PUT',    path: () => `/organizations/${targetOrgId.value}`, body: () => ({ description: 'Updated at ' + new Date().toLocaleTimeString() }) },
      { label: 'Delete Org',       method: 'DELETE', path: () => `/organizations/${targetOrgId.value}` },
      { label: 'Add Org Member',   method: 'POST',   path: () => `/organizations/${targetOrgId.value}/members`, body: () => ({ userId: targetUserId.value }) },
      { label: 'Remove Org Member', method: 'DELETE', path: () => `/organizations/${targetOrgId.value}/members/${targetUserId.value}` },
    ],
  },
  {
    title: '🔔 Notifications',
    endpoints: [
      { label: 'List Notifications', path: '/notifications' },
      { label: 'Mark All Read',      method: 'PUT',    path: '/notifications/read-all' },
      { label: 'Mark One Read',      method: 'PUT',    path: () => `/notifications/${targetNotifId.value}/read` },
      { label: 'Delete Notification', method: 'DELETE', path: () => `/notifications/${targetNotifId.value}` },
    ],
  },
  {
    title: '📁 Uploads',
    endpoints: [
      { label: 'List My Files', path: '/uploads' },
      { label: 'Delete File',   method: 'DELETE', path: () => `/uploads/${targetFileId.value}` },
    ],
  },
  {
    title: '🔑 Public API (needs X-API-Key)',
    endpoints: [
      { label: 'Docs',               path: '/public',        headers: () => apiKeyHeaders() },
      { label: 'Public Users',       path: '/public/users',  headers: () => apiKeyHeaders() },
      { label: 'Public User',        path: () => `/public/users/${targetUserId.value}`, headers: () => apiKeyHeaders() },
      { label: 'Public Leaderboard', path: '/public/leaderboard', headers: () => apiKeyHeaders() },
      { label: 'Public Posts',       path: '/public/posts',  headers: () => apiKeyHeaders() },
      { label: 'Public Orgs',        path: '/public/organizations', headers: () => apiKeyHeaders() },
    ],
  },
  {
    title: '🛡️ Admin (must be admin)',
    endpoints: [
      { label: 'Admin Stats',      path: '/admin/stats' },
      { label: 'Admin Users',      path: '/admin/users' },
      { label: 'Delete User',      method: 'DELETE', path: () => `/admin/users/${targetUserId.value}` },
      { label: 'Toggle Admin',     method: 'PUT',    path: () => `/admin/users/${targetUserId.value}/toggle-admin` },
      { label: 'Data Requests',    path: '/admin/data-requests' },
      { label: 'Process Data Req', method: 'POST',   path: () => `/admin/data-requests/${targetReqId.value}/process` },
    ],
  },
])

// ── Search filter ─────────────────────────────────────────────
const filteredSections = computed(() => {
  const q = searchQuery.value.toLowerCase().trim()
  if (!q) return sections.value
  return sections.value
    .map(s => ({ ...s, endpoints: s.endpoints.filter(e => e.label.toLowerCase().includes(q) || (e.path?.toString() ?? '').toLowerCase().includes(q)) }))
    .filter(s => s.endpoints.length > 0)
})

// Force-watch computed for JSON validation side-effect
const _jsonWatch = editorJsonErrWatcher
</script>

<style scoped>
* { box-sizing: border-box; }

.api-test {
  max-width: 1100px;
  margin: 0 auto;
  padding: 1.5rem 1.5rem 4rem;
  font-family: 'Segoe UI', system-ui, sans-serif;
  color: #e0e0e0;
}

/* ── Top bar ──────────────────────────────────────────────── */
.topbar {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: .75rem;
  margin-bottom: .5rem;
}
.topbar-left { display: flex; align-items: center; gap: .75rem; }
.topbar-right { display: flex; align-items: center; gap: .5rem; flex-wrap: wrap; }
h1 { margin: 0; font-size: 1.8rem; }

.env-badge {
  font-size: .7rem;
  font-weight: 700;
  letter-spacing: .08em;
  padding: .2rem .55rem;
  border-radius: 4px;
}
.env-badge.dev  { background: #1a3a1a; color: #4ecdc4; border: 1px solid #4ecdc455; }
.env-badge.prod { background: #3a1a1a; color: #ff9900; border: 1px solid #ff990055; }

.base-url-label { font-size: .78rem; color: #888; }
.base-url-display { font-size: .78rem; color: #aaa; background: #1a1a2e; padding: .2rem .45rem; border-radius: 4px; }

.health-dot { font-size: 1.1rem; line-height: 1; }
.health-dot.ok      { color: #4ecdc4; }
.health-dot.err     { color: #ff6b6b; }
.health-dot.unknown { color: #666; }
.health-dot.loading { color: #ffd93d; animation: spin .8s linear infinite; }

.subtitle { color: #888; margin: 0 0 1.25rem; font-size: .88rem; }

/* ── Cards ────────────────────────────────────────────────── */
.card {
  background: #13131f;
  border: 1px solid #252535;
  border-radius: 10px;
  padding: 1rem 1.25rem;
  margin-bottom: 1rem;
}

/* ── Auth box ─────────────────────────────────────────────── */
.auth-box h3 { margin: 0 0 .75rem; color: #7c7cff; font-size: 1rem; }
.inline-form {
  display: flex;
  flex-wrap: wrap;
  gap: .5rem;
  align-items: flex-end;
}
.inline-form.padded { padding-top: .5rem; }
.inline-form label {
  display: flex;
  flex-direction: column;
  font-size: .73rem;
  color: #888;
  gap: .2rem;
}
input {
  padding: .4rem .6rem;
  border: 1px solid #333;
  border-radius: 6px;
  background: #0e0e18;
  color: #e0e0e0;
  font-size: .83rem;
  width: 130px;
}
input:focus { outline: none; border-color: #7c7cff; }

.token-row {
  display: flex;
  align-items: center;
  gap: .75rem;
  flex-wrap: wrap;
  font-size: .78rem;
  color: #888;
  margin-top: .6rem;
}
.token-row code { color: #aaa; }

/* ── Buttons ──────────────────────────────────────────────── */
button {
  padding: .4rem .8rem;
  border: 1px solid #444;
  border-radius: 6px;
  background: #1e1e32;
  color: #e0e0e0;
  cursor: pointer;
  font-size: .83rem;
  transition: background .12s;
}
button:hover:not(:disabled) { background: #2a2a4e; border-color: #555; }
button:disabled { opacity: .4; cursor: not-allowed; }

.btn-auth { background: #1e2e4e; border-color: #3a5a8a; }
.btn-auth:hover:not(:disabled) { background: #28407a; }
.btn-auth.danger { background: #3e1e1e; border-color: #8a3a3a; color: #ff9090; }
.btn-auth.danger:hover:not(:disabled) { background: #5a2828; }

.icon-btn { padding: .25rem .5rem; font-size: .8rem; background: transparent; border-color: #333; }
.icon-btn.small { padding: .15rem .35rem; font-size: .72rem; }

/* ── Search ───────────────────────────────────────────────── */
.search-row {
  display: flex;
  gap: .4rem;
  align-items: center;
  margin-bottom: .75rem;
}
.search-input {
  width: 100%;
  max-width: 400px;
  padding: .45rem .75rem;
  border: 1px solid #333;
  border-radius: 8px;
  background: #0e0e18;
  color: #e0e0e0;
  font-size: .85rem;
}
.search-input:focus { outline: none; border-color: #7c7cff; }

/* ── Section headers ──────────────────────────────────────── */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  user-select: none;
  margin-bottom: .1rem;
}
.section-header:hover { opacity: .85; }
.section-header h2, .section-header h3 { margin: 0; font-size: 1rem; }
.chevron { font-size: .75rem; color: #666; }

.btn-grid {
  display: flex;
  flex-wrap: wrap;
  gap: .4rem;
  padding-top: .65rem;
}

/* ── Endpoint buttons ─────────────────────────────────────── */
.ep-btn {
  padding: .35rem .7rem;
  border-radius: 6px;
  font-size: .78rem;
  display: flex;
  align-items: center;
  gap: .3rem;
}
.ep-btn.is-loading { opacity: .6; }

.method { font-weight: 700; font-size: .68rem; }
.ep-btn.get    .method { color: #4ecdc4; }
.ep-btn.post   .method { color: #ffd93d; }
.ep-btn.put    .method { color: #6c9bff; }
.ep-btn.delete .method { color: #ff6b6b; }
.ep-btn.patch  .method { color: #c97bff; }

@keyframes spin { to { transform: rotate(360deg); } }
.spinner { display: inline-block; animation: spin .7s linear infinite; }

/* ── Body editor modal ────────────────────────────────────── */
.modal-overlay {
  position: fixed; inset: 0;
  background: #000000aa;
  display: flex; align-items: center; justify-content: center;
  z-index: 999;
}
.modal {
  background: #15152a;
  border: 1px solid #2a2a55;
  border-radius: 12px;
  padding: 1.25rem;
  width: min(680px, 96vw);
  display: flex; flex-direction: column; gap: .75rem;
}
.modal-header {
  display: flex; justify-content: space-between; align-items: flex-start;
}
.modal-title { font-size: .88rem; color: #aaa; word-break: break-all; }
.modal-title .method { font-size: .85rem; margin-right: .4rem; }
.modal-label { font-size: .78rem; color: #888; margin-bottom: -.4rem; }
.body-editor {
  width: 100%; padding: .6rem; background: #0d0d1a; border: 1px solid #333;
  border-radius: 6px; color: #d0e0ff; font-family: monospace; font-size: .82rem;
  resize: vertical;
}
.body-editor:focus { outline: none; border-color: #7c7cff; }
.modal-footer { display: flex; justify-content: space-between; align-items: center; gap: .5rem; }
.modal-err { font-size: .75rem; color: #ff6b6b; flex: 1; }

/* ── Log ──────────────────────────────────────────────────── */
.log-section { margin-top: 1.5rem; }
.log-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: .6rem;
}
.log-header h2 { margin: 0; font-size: 1.05rem; }
.log-count { color: #666; font-size: .8rem; font-weight: normal; }
.log-actions { display: flex; gap: .4rem; align-items: center; }

.clear-btn {
  background: #3e1e1e22; border: 1px solid #ff6b6b66;
  color: #ff6b6b; border-radius: 6px; padding: .28rem .65rem;
  cursor: pointer; font-size: .78rem;
}
.clear-btn:hover:not(:disabled) { background: #ff6b6b22; }

.log-box {
  max-height: 480px; overflow-y: auto;
  background: #0b0b12; border: 1px solid #1e1e2e;
  border-radius: 8px; padding: .6rem;
  display: flex; flex-direction: column; gap: .5rem;
}
.log-empty { color: #444; text-align: center; padding: 2rem; font-size: .85rem; }

.log-entry {
  border-left: 3px solid #444;
  padding-left: .7rem;
}
.log-entry.ok  { border-color: #4ecdc4; }
.log-entry.err { border-color: #ff6b6b; }

.log-meta {
  display: flex; gap: .6rem; font-size: .75rem;
  margin-bottom: .2rem; align-items: center; flex-wrap: wrap;
}
.log-method { font-weight: 700; color: #7c7cff; min-width: 3.2rem; }
.log-url    { color: #999; flex: 1; word-break: break-all; }
.log-status { font-weight: 700; }
.log-entry.ok .log-status  { color: #4ecdc4; }
.log-entry.err .log-status { color: #ff6b6b; }
.log-time { color: #666; white-space: nowrap; }
.log-actions-row { display: flex; gap: .25rem; margin-left: auto; }

.log-body {
  margin: 0; padding: .4rem .5rem;
  background: #0e0e1a; border-radius: 4px;
  font-size: .73rem; max-height: 200px; overflow: auto;
  white-space: pre-wrap; word-break: break-word; color: #c0c8e0;
}
</style>
