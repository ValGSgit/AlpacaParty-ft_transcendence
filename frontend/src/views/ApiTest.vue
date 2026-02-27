<!--
  API Test Dashboard — one button per backend endpoint
  Access at /api-test (no auth guard).
-->
<template>
  <div class="api-test">
    <h1>API Endpoint Tester</h1>
    <p class="subtitle">Click any button to fire the request. Results appear in the log below.</p>

    <!-- ── Auth state ─────────────────────────────────────── -->
    <section class="auth-box">
      <h3>Quick Auth</h3>
      <div class="inline-form">
        <input v-model="regUsername" placeholder="username" />
        <input v-model="regEmail" placeholder="email" />
        <input v-model="regPassword" placeholder="password" type="password" />
        <button @click="doRegister">Register</button>
        <button @click="doLogin">Login</button>
        <button @click="doLogout" :disabled="!token">Logout</button>
      </div>
      <div class="inline-form" style="margin-top:.5rem">
        <small>Token: {{ token ? token.slice(0, 20) + '…' : '(none)' }}</small>
        <small style="margin-left:1rem">User ID: {{ userId ?? '–' }}</small>
      </div>
    </section>

    <!-- ── Sections ───────────────────────────────────────── -->
    <section v-for="section in sections" :key="section.title" class="section">
      <h2>{{ section.title }}</h2>
      <div class="btn-grid">
        <button
          v-for="ep in section.endpoints"
          :key="ep.label"
          class="ep-btn"
          :class="ep.method?.toLowerCase()"
          @click="fire(ep)"
        >
          <span class="method">{{ ep.method ?? 'GET' }}</span>
          {{ ep.label }}
        </button>
      </div>
    </section>

    <!-- ── Dynamic inputs ─────────────────────────────────── -->
    <section class="section">
      <h2>Custom / Dynamic IDs</h2>
      <div class="inline-form">
        <label>Target User ID<input v-model.number="targetUserId" type="number" placeholder="2" /></label>
        <label>Post ID<input v-model.number="targetPostId" type="number" placeholder="1" /></label>
        <label>Room ID<input v-model.number="targetRoomId" type="number" placeholder="1" /></label>
        <label>Org ID<input v-model.number="targetOrgId" type="number" placeholder="1" /></label>
        <label>Request ID<input v-model.number="targetReqId" type="number" placeholder="1" /></label>
        <label>Notif ID<input v-model.number="targetNotifId" type="number" placeholder="1" /></label>
        <label>File ID<input v-model.number="targetFileId" type="number" placeholder="1" /></label>
      </div>
    </section>

    <!-- ── Log ────────────────────────────────────────────── -->
    <section class="log-section">
      <div class="log-header">
        <h2>Response Log</h2>
        <button class="clear-btn" @click="logs = []">Clear</button>
      </div>
      <div class="log-box" ref="logBox">
        <div v-for="(entry, i) in logs" :key="i" class="log-entry" :class="entry.ok ? 'ok' : 'err'">
          <div class="log-meta">
            <span class="log-method">{{ entry.method }}</span>
            <span class="log-url">{{ entry.url }}</span>
            <span class="log-status">{{ entry.status }}</span>
            <span class="log-time">{{ entry.time }}ms</span>
          </div>
          <pre class="log-body">{{ entry.body }}</pre>
        </div>
        <div v-if="logs.length === 0" class="log-empty">No requests yet.</div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'
import axios from 'axios'

// ── Reactive state ──────────────────────────────────────────
const BASE = '/api'

const token = ref(localStorage.getItem('accessToken') || '')
const refreshToken = ref(localStorage.getItem('refreshToken') || '')
const userId = ref(null)

const regUsername = ref('testuser')
const regEmail    = ref('test@test.com')
const regPassword = ref('Test1234')

const targetUserId = ref(2)
const targetPostId = ref(1)
const targetRoomId = ref(1)
const targetOrgId  = ref(1)
const targetReqId  = ref(1)
const targetNotifId = ref(1)
const targetFileId = ref(1)

const logs = ref([])
const logBox = ref(null)

// ── Helpers ─────────────────────────────────────────────────
function authHeaders() {
  return token.value ? { Authorization: `Bearer ${token.value}` } : {}
}
function apiKeyHeaders() {
  return { 'X-API-Key': 'test-api-key' }
}

async function request(method, path, body = undefined, extraHeaders = {}) {
  const url = `${BASE}${path}`
  const start = Date.now()
  let entry = { method: method.toUpperCase(), url, status: 0, body: '', ok: false, time: 0 }
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
  if (logBox.value) logBox.value.scrollTop = logBox.value.scrollHeight
}

// ── Auth helpers ────────────────────────────────────────────
async function doRegister() {
  try {
    const res = await axios.post(`${BASE}/auth/register`, {
      username: regUsername.value,
      email: regEmail.value,
      password: regPassword.value,
    })
    handleAuthResponse(res)
    addLog('POST', '/auth/register', res)
  } catch (e) { addErrLog('POST', '/auth/register', e) }
}

async function doLogin() {
  try {
    const res = await axios.post(`${BASE}/auth/login`, {
      email: regEmail.value,
      password: regPassword.value,
    })
    handleAuthResponse(res)
    addLog('POST', '/auth/login', res)
  } catch (e) { addErrLog('POST', '/auth/login', e) }
}

async function doLogout() {
  try {
    const res = await axios.post(`${BASE}/auth/logout`, {}, { headers: authHeaders() })
    token.value = ''
    refreshToken.value = ''
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    userId.value = null
    addLog('POST', '/auth/logout', res)
  } catch (e) { addErrLog('POST', '/auth/logout', e) }
}

function handleAuthResponse(res) {
  const d = res.data
  if (d.accessToken)  { token.value = d.accessToken;  localStorage.setItem('accessToken', d.accessToken) }
  if (d.refreshToken) { refreshToken.value = d.refreshToken; localStorage.setItem('refreshToken', d.refreshToken) }
  if (d.user?.id)     { userId.value = d.user.id }
}

function addLog(method, path, res) {
  logs.value.push({ method, url: `${BASE}${path}`, status: res.status, body: JSON.stringify(res.data, null, 2), ok: true, time: 0 })
}
function addErrLog(method, path, e) {
  logs.value.push({ method, url: `${BASE}${path}`, status: e.response?.status ?? 0, body: JSON.stringify(e.response?.data ?? e.message, null, 2), ok: false, time: 0 })
}

// ── Fire generic endpoint ───────────────────────────────────
function fire(ep) {
  const method = (ep.method ?? 'GET').toLowerCase()
  const path = typeof ep.path === 'function' ? ep.path() : ep.path
  const body = typeof ep.body === 'function' ? ep.body() : ep.body
  const extra = ep.headers ? (typeof ep.headers === 'function' ? ep.headers() : ep.headers) : {}
  request(method, path, body, extra)
}

// ── Endpoint definitions ────────────────────────────────────
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
      { label: 'Refresh Token', method: 'POST', path: '/auth/refresh', body: () => ({ refreshToken: refreshToken.value }) },
      { label: 'Get Me (auth)', path: '/auth/me' },
    ],
  },
  {
    title: '👤 Users',
    endpoints: [
      { label: 'Get My Profile', path: '/users/me' },
      { label: 'Update My Profile', method: 'PUT', path: '/users/me', body: () => ({ bio: 'Updated via test page at ' + new Date().toLocaleTimeString() }) },
      { label: 'Change Password', method: 'PUT', path: '/users/me/password', body: () => ({ currentPassword: regPassword.value, newPassword: regPassword.value }) },
      { label: 'Export My Data', path: '/users/me/export' },
      { label: 'Request Deletion', method: 'POST', path: '/users/me/delete-request' },
      { label: 'List Data Requests', path: '/users/me/data-requests' },
      { label: 'List Users', path: '/users' },
      { label: 'Get User by ID', path: () => `/users/${targetUserId.value}` },
    ],
  },
  {
    title: '🤝 Friends',
    endpoints: [
      { label: 'List Friends', path: '/friends' },
      { label: 'Online Friends', path: '/friends/online' },
      { label: 'Blocked Users', path: '/friends/blocked' },
      { label: 'Friend Requests', path: '/friends/requests' },
      { label: 'Send Friend Request', method: 'POST', path: '/friends/requests', body: () => ({ receiverId: targetUserId.value }) },
      { label: 'Accept Request', method: 'PUT', path: () => `/friends/requests/${targetReqId.value}/accept` },
      { label: 'Decline Request', method: 'PUT', path: () => `/friends/requests/${targetReqId.value}/decline` },
      { label: 'Remove Friend', method: 'DELETE', path: () => `/friends/${targetUserId.value}` },
      { label: 'Block User', method: 'POST', path: '/friends/block', body: () => ({ userId: targetUserId.value }) },
      { label: 'Unblock User', method: 'DELETE', path: () => `/friends/block/${targetUserId.value}` },
    ],
  },
  {
    title: '💬 Chat',
    endpoints: [
      { label: 'List Conversations', path: '/chat/conversations' },
      { label: 'Unread Count', path: '/chat/unread' },
      { label: 'Get DM', path: () => `/chat/dm/${targetUserId.value}` },
      { label: 'List Rooms', path: '/chat/rooms' },
      { label: 'Create Room', method: 'POST', path: '/chat/rooms', body: () => ({ name: 'TestRoom ' + Date.now() }) },
      { label: 'Room Messages', path: () => `/chat/rooms/${targetRoomId.value}/messages` },
      { label: 'Add Room Member', method: 'POST', path: () => `/chat/rooms/${targetRoomId.value}/members`, body: () => ({ userId: targetUserId.value }) },
      { label: 'Remove Room Member', method: 'DELETE', path: () => `/chat/rooms/${targetRoomId.value}/members/${targetUserId.value}` },
      { label: 'Delete Room', method: 'DELETE', path: () => `/chat/rooms/${targetRoomId.value}` },
    ],
  },
  {
    title: '📝 Posts',
    endpoints: [
      { label: 'Get Feed', path: '/posts' },
      { label: 'User Posts', path: () => `/posts/user/${targetUserId.value}` },
      { label: 'Get Post', path: () => `/posts/${targetPostId.value}` },
      { label: 'Create Post', method: 'POST', path: '/posts', body: () => ({ content: 'Test post at ' + new Date().toLocaleTimeString() }) },
      { label: 'Update Post', method: 'PUT', path: () => `/posts/${targetPostId.value}`, body: () => ({ content: 'Updated at ' + new Date().toLocaleTimeString() }) },
      { label: 'Delete Post', method: 'DELETE', path: () => `/posts/${targetPostId.value}` },
      { label: 'Like Post', method: 'POST', path: () => `/posts/${targetPostId.value}/like` },
      { label: 'Unlike Post', method: 'DELETE', path: () => `/posts/${targetPostId.value}/like` },
    ],
  },
  {
    title: '🎮 Game',
    endpoints: [
      { label: 'My Stats', path: '/game/stats' },
      { label: 'Game History', path: '/game/history' },
      { label: 'Leaderboard', path: '/game/leaderboard' },
      { label: 'Get Farm', path: '/game/farm' },
      { label: 'Save Farm', method: 'PUT', path: '/game/farm', body: () => ({ farm_data: { alpacas: [], resources: { gold: 200, food: 100 }, level: 2 } }) },
      { label: 'Achievements', path: '/game/achievements' },
      { label: 'Daily Challenges', path: '/game/challenges' },
    ],
  },
  {
    title: '🏢 Organizations',
    endpoints: [
      { label: 'List Orgs', path: '/organizations' },
      { label: 'My Orgs', path: '/organizations/mine' },
      { label: 'Get Org', path: () => `/organizations/${targetOrgId.value}` },
      { label: 'Create Org', method: 'POST', path: '/organizations', body: () => ({ name: 'TestOrg' + Date.now(), description: 'Test organization' }) },
      { label: 'Update Org', method: 'PUT', path: () => `/organizations/${targetOrgId.value}`, body: () => ({ description: 'Updated at ' + new Date().toLocaleTimeString() }) },
      { label: 'Delete Org', method: 'DELETE', path: () => `/organizations/${targetOrgId.value}` },
      { label: 'Add Org Member', method: 'POST', path: () => `/organizations/${targetOrgId.value}/members`, body: () => ({ userId: targetUserId.value }) },
      { label: 'Remove Org Member', method: 'DELETE', path: () => `/organizations/${targetOrgId.value}/members/${targetUserId.value}` },
    ],
  },
  {
    title: '🔔 Notifications',
    endpoints: [
      { label: 'List Notifications', path: '/notifications' },
      { label: 'Mark All Read', method: 'PUT', path: '/notifications/read-all' },
      { label: 'Mark One Read', method: 'PUT', path: () => `/notifications/${targetNotifId.value}/read` },
      { label: 'Delete Notification', method: 'DELETE', path: () => `/notifications/${targetNotifId.value}` },
    ],
  },
  {
    title: '📁 Uploads',
    endpoints: [
      { label: 'List My Files', path: '/uploads' },
      { label: 'Delete File', method: 'DELETE', path: () => `/uploads/${targetFileId.value}` },
      // Upload is multipart — handled separately below
    ],
  },
  {
    title: '🔑 Public API (needs X-API-Key)',
    endpoints: [
      { label: 'Docs', path: '/public', headers: () => apiKeyHeaders() },
      { label: 'Public Users', path: '/public/users', headers: () => apiKeyHeaders() },
      { label: 'Public User', path: () => `/public/users/${targetUserId.value}`, headers: () => apiKeyHeaders() },
      { label: 'Public Leaderboard', path: '/public/leaderboard', headers: () => apiKeyHeaders() },
      { label: 'Public Posts', path: '/public/posts', headers: () => apiKeyHeaders() },
      { label: 'Public Orgs', path: '/public/organizations', headers: () => apiKeyHeaders() },
    ],
  },
  {
    title: '🛡️ Admin (must be admin)',
    endpoints: [
      { label: 'Admin Stats', path: '/admin/stats' },
      { label: 'Admin Users', path: '/admin/users' },
      { label: 'Delete User', method: 'DELETE', path: () => `/admin/users/${targetUserId.value}` },
      { label: 'Toggle Admin', method: 'PUT', path: () => `/admin/users/${targetUserId.value}/toggle-admin` },
      { label: 'Data Requests', path: '/admin/data-requests' },
      { label: 'Process Data Req', method: 'POST', path: () => `/admin/data-requests/${targetReqId.value}/process` },
    ],
  },
])
</script>

<style scoped>
.api-test {
  max-width: 1100px;
  margin: 0 auto;
  padding: 2rem 1.5rem 4rem;
  font-family: 'Segoe UI', system-ui, sans-serif;
  color: #e0e0e0;
}
h1 { margin: 0 0 .25rem; font-size: 2rem; }
.subtitle { color: #999; margin: 0 0 1.5rem; }

/* auth box */
.auth-box {
  background: #1a1a2e;
  border: 1px solid #2a2a4a;
  border-radius: 10px;
  padding: 1rem 1.25rem;
  margin-bottom: 2rem;
}
.auth-box h3 { margin: 0 0 .75rem; color: #7c7cff; }
.inline-form {
  display: flex;
  flex-wrap: wrap;
  gap: .5rem;
  align-items: center;
}
.inline-form label {
  display: flex;
  flex-direction: column;
  font-size: .75rem;
  color: #aaa;
  gap: .2rem;
}
input {
  padding: .45rem .6rem;
  border: 1px solid #333;
  border-radius: 6px;
  background: #12121a;
  color: #e0e0e0;
  font-size: .85rem;
  width: 140px;
}
input:focus { outline: none; border-color: #7c7cff; }

/* sections */
.section {
  margin-bottom: 1.75rem;
}
.section h2 {
  font-size: 1.15rem;
  margin: 0 0 .6rem;
  border-bottom: 1px solid #2a2a3a;
  padding-bottom: .35rem;
}

.btn-grid {
  display: flex;
  flex-wrap: wrap;
  gap: .45rem;
}

/* endpoint buttons */
.ep-btn {
  padding: .4rem .75rem;
  border: 1px solid #333;
  border-radius: 6px;
  background: #1e1e30;
  color: #e0e0e0;
  cursor: pointer;
  font-size: .8rem;
  transition: background .15s, border-color .15s;
}
.ep-btn:hover { background: #2a2a4a; border-color: #555; }

.method {
  font-weight: 700;
  margin-right: .35rem;
  font-size: .7rem;
}
.ep-btn.get .method   { color: #4ecdc4; }
.ep-btn.post .method  { color: #ffd93d; }
.ep-btn.put .method   { color: #6c9bff; }
.ep-btn.delete .method { color: #ff6b6b; }

/* log */
.log-section { margin-top: 2rem; }
.log-header { display: flex; justify-content: space-between; align-items: center; }
.log-header h2 { margin: 0; }
.clear-btn {
  background: #ff6b6b22;
  border: 1px solid #ff6b6b;
  color: #ff6b6b;
  border-radius: 6px;
  padding: .3rem .75rem;
  cursor: pointer;
  font-size: .8rem;
}
.clear-btn:hover { background: #ff6b6b44; }

.log-box {
  margin-top: .75rem;
  max-height: 420px;
  overflow-y: auto;
  background: #0d0d14;
  border: 1px solid #222;
  border-radius: 8px;
  padding: .75rem;
}
.log-empty { color: #555; text-align: center; padding: 2rem; }

.log-entry {
  margin-bottom: .75rem;
  border-left: 3px solid #444;
  padding-left: .75rem;
}
.log-entry.ok  { border-color: #4ecdc4; }
.log-entry.err { border-color: #ff6b6b; }

.log-meta {
  display: flex;
  gap: .75rem;
  font-size: .78rem;
  margin-bottom: .25rem;
}
.log-method { font-weight: 700; color: #7c7cff; }
.log-url    { color: #aaa; flex: 1; word-break: break-all; }
.log-status { font-weight: 700; }
.log-entry.ok .log-status  { color: #4ecdc4; }
.log-entry.err .log-status { color: #ff6b6b; }
.log-time { color: #888; }

.log-body {
  margin: 0;
  padding: .5rem;
  background: #12121a;
  border-radius: 4px;
  font-size: .75rem;
  max-height: 200px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
  color: #ccc;
}

/* buttons everywhere */
button {
  padding: .45rem .85rem;
  border: 1px solid #444;
  border-radius: 6px;
  background: #2a2a4a;
  color: #e0e0e0;
  cursor: pointer;
  font-size: .85rem;
}
button:hover { background: #3a3a5e; }
button:disabled { opacity: .4; cursor: not-allowed; }
</style>
