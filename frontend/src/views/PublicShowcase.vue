<!--
  Public API Showcase — demonstrates all /api/public/* endpoints
  No authentication required. Needs a valid API key.
  @owner ValGSgit
-->
<template>
  <div class="showcase-page">
    <h1>Public API Showcase</h1>
    <p class="subtitle">
      Live data from <code>/api/public/*</code>. All requests require an
      <code>X-API-Key</code> header.
    </p>

    <!-- API Key input -->
    <section class="api-key-section">
      <label for="api-key-input">API Key</label>
      <div class="key-row">
        <input
          id="api-key-input"
          v-model="apiKey"
          type="text"
          placeholder="Enter your API key…"
          spellcheck="false"
        />
        <button class="btn-primary" @click="fetchAll" :disabled="!apiKey.trim() || loading">
          {{ loading ? 'Loading…' : 'Fetch All' }}
        </button>
      </div>
      <p v-if="globalError" class="error-msg">{{ globalError }}</p>
    </section>

    <!-- Users -->
    <section v-if="users !== null" class="showcase-section">
      <h2>Users <span class="badge">{{ users.length }}</span></h2>
      <div class="card-grid">
        <div v-for="u in users" :key="u.id" class="data-card">
          <img :src="u.avatar || '/avatars/default.svg'" :alt="u.username" class="avatar" />
          <div class="card-body">
            <strong>{{ u.username }}</strong>
            <span class="meta">Lv {{ u.level }} · {{ u.xp }} XP</span>
            <span class="meta online-dot" :class="{ online: u.is_online }">
              {{ u.is_online ? '🟢 Online' : '⚫ Offline' }}
            </span>
          </div>
        </div>
      </div>
      <div class="pagination">
        <button class="btn-page" :disabled="pagination.users.offset === 0" @click="pagination.users.offset -= pagination.users.limit; fetchSection('users')">Previous</button>
        <span class="page-info">Page {{ Math.floor(pagination.users.offset / pagination.users.limit) + 1 }}</span>
        <button class="btn-page" :disabled="users.length < pagination.users.limit" @click="pagination.users.offset += pagination.users.limit; fetchSection('users')">Next</button>
      </div>
    </section>

    <!-- Leaderboard -->
    <section v-if="leaderboard !== null" class="showcase-section">
      <h2>Leaderboard</h2>
      <table class="showcase-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Username</th>
            <th>ELO</th>
            <th>W/L/D</th>
            <th>Game Type</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(entry, i) in leaderboard" :key="entry.userId ?? i">
            <td>{{ pagination.leaderboard.offset + i + 1 }}</td>
            <td>{{ entry.username ?? `User #${entry.userId}` }}</td>
            <td>{{ entry.elo ?? '—' }}</td>
            <td>{{ entry.wins ?? 0 }}/{{ entry.losses ?? 0 }}/{{ entry.draws ?? 0 }}</td>
            <td>{{ entry.gameType ?? '—' }}</td>
          </tr>
          <tr v-if="leaderboard.length === 0">
            <td colspan="5" class="empty">No entries yet.</td>
          </tr>
        </tbody>
      </table>
      <div class="pagination">
        <button class="btn-page" :disabled="pagination.leaderboard.offset === 0" @click="pagination.leaderboard.offset -= pagination.leaderboard.limit; fetchSection('leaderboard')">Previous</button>
        <span class="page-info">Page {{ Math.floor(pagination.leaderboard.offset / pagination.leaderboard.limit) + 1 }}</span>
        <button class="btn-page" :disabled="leaderboard.length < pagination.leaderboard.limit" @click="pagination.leaderboard.offset += pagination.leaderboard.limit; fetchSection('leaderboard')">Next</button>
      </div>
    </section>

    <!-- Posts -->
    <section v-if="posts !== null" class="showcase-section">
      <h2>Posts <span class="badge">{{ posts.length }}</span></h2>
      <div v-for="post in posts" :key="post.id" class="post-card">
        <div class="post-header">
          <strong>{{ post.author_username ?? `User #${post.author_id}` }}</strong>
          <span class="meta">{{ formatDate(post.created_at) }}</span>
        </div>
        <p class="post-body">{{ post.content }}</p>
        <img v-if="post.image_url" :src="post.image_url" class="post-image" alt="post image" />
      </div>
      <p v-if="posts.length === 0" class="empty">No public posts yet.</p>
      <div class="pagination">
        <button class="btn-page" :disabled="pagination.posts.offset === 0" @click="pagination.posts.offset -= pagination.posts.limit; fetchSection('posts')">Previous</button>
        <span class="page-info">Page {{ Math.floor(pagination.posts.offset / pagination.posts.limit) + 1 }}</span>
        <button class="btn-page" :disabled="posts.length < pagination.posts.limit" @click="pagination.posts.offset += pagination.posts.limit; fetchSection('posts')">Next</button>
      </div>
    </section>

    <!-- Organizations -->
    <section v-if="organizations !== null" class="showcase-section">
      <h2>Organizations <span class="badge">{{ organizations.length }}</span></h2>
      <div class="card-grid">
        <div v-for="org in organizations" :key="org.id" class="data-card">
          <div class="card-body">
            <strong>{{ org.name }}</strong>
            <span class="meta">{{ org.memberCount ?? org.member_count ?? 0 }} members</span>
            <span class="meta">{{ org.description || 'No description.' }}</span>
          </div>
        </div>
      </div>
      <p v-if="organizations.length === 0" class="empty">No organizations yet.</p>
      <div class="pagination">
        <button class="btn-page" :disabled="pagination.organizations.offset === 0" @click="pagination.organizations.offset -= pagination.organizations.limit; fetchSection('organizations')">Previous</button>
        <span class="page-info">Page {{ Math.floor(pagination.organizations.offset / pagination.organizations.limit) + 1 }}</span>
        <button class="btn-page" :disabled="organizations.length < pagination.organizations.limit" @click="pagination.organizations.offset += pagination.organizations.limit; fetchSection('organizations')">Next</button>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'

const apiKey = ref('')
const loading = ref(false)
const globalError = ref('')

const users = ref(null)
const leaderboard = ref(null)
const posts = ref(null)
const organizations = ref(null)

const pagination = reactive({
  users: { limit: 20, offset: 0 },
  leaderboard: { limit: 20, offset: 0 },
  posts: { limit: 20, offset: 0 },
  organizations: { limit: 20, offset: 0 },
})

function formatDate(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`
}

async function apiFetch(path) {
  const res = await fetch(`/api/public${path}`, {
    headers: { 'X-API-Key': apiKey.value.trim() },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.error?.message ?? `HTTP ${res.status}`)
  }
  return res.json()
}

async function fetchSection(section) {
  try {
    const p = pagination[section]
    const query = `?limit=${p.limit}&offset=${p.offset}`
    if (section === 'users') {
      const res = await apiFetch(`/users${query}`)
      users.value = res.users ?? []
    } else if (section === 'leaderboard') {
      const res = await apiFetch(`/leaderboard${query}`)
      leaderboard.value = res.leaderboard ?? res.entries ?? []
    } else if (section === 'posts') {
      const res = await apiFetch(`/posts${query}`)
      posts.value = res.posts ?? []
    } else if (section === 'organizations') {
      const res = await apiFetch(`/organizations${query}`)
      organizations.value = res.organizations ?? []
    }
  } catch (err) {
    globalError.value = err.message
  }
}

async function fetchAll() {
  loading.value = true
  globalError.value = ''
  users.value = null
  leaderboard.value = null
  posts.value = null
  organizations.value = null

  // Reset pagination offsets
  pagination.users.offset = 0
  pagination.leaderboard.offset = 0
  pagination.posts.offset = 0
  pagination.organizations.offset = 0

  try {
    const [usersRes, lbRes, postsRes, orgsRes] = await Promise.all([
      apiFetch('/users?limit=20&offset=0'),
      apiFetch('/leaderboard?limit=20&offset=0'),
      apiFetch('/posts?limit=20&offset=0'),
      apiFetch('/organizations?limit=20&offset=0'),
    ])
    users.value = usersRes.users ?? []
    leaderboard.value = lbRes.leaderboard ?? lbRes.entries ?? []
    posts.value = postsRes.posts ?? []
    organizations.value = orgsRes.organizations ?? []
  } catch (err) {
    globalError.value = err.message
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.showcase-page {
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem 1rem 4rem;
}

h1 {
  font-size: 2rem;
  color: var(--primary, #00f0ff);
  margin-bottom: 0.25rem;
}

.subtitle {
  color: #a0a0b0;
  margin-bottom: 2rem;
}

.api-key-section {
  background: var(--bg-secondary, #12121a);
  border: 1px solid var(--border-color, #2a2a3a);
  border-radius: 10px;
  padding: 1.25rem 1.5rem;
  margin-bottom: 2rem;
}

.api-key-section label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.key-row {
  display: flex;
  gap: 0.75rem;
}

.key-row input {
  flex: 1;
  padding: 0.6rem 0.9rem;
  border: 1px solid var(--border-color, #2a2a3a);
  border-radius: 8px;
  background: var(--bg, #0d0d14);
  color: inherit;
  font-family: monospace;
  font-size: 0.9rem;
}

.btn-primary {
  padding: 0.6rem 1.4rem;
  background: var(--primary, #00f0ff);
  color: #000;
  font-weight: 700;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: opacity 0.2s;
}
.btn-primary:disabled { opacity: 0.5; cursor: default; }
.btn-primary:not(:disabled):hover { opacity: 0.85; }

.error-msg {
  margin-top: 0.75rem;
  color: #ff6b6b;
  font-size: 0.9rem;
}

.showcase-section {
  margin-bottom: 2.5rem;
}

.showcase-section h2 {
  font-size: 1.25rem;
  margin-bottom: 1rem;
  border-bottom: 1px solid var(--border-color, #2a2a3a);
  padding-bottom: 0.4rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.badge {
  background: var(--primary, #00f0ff);
  color: #000;
  font-size: 0.75rem;
  font-weight: 700;
  border-radius: 999px;
  padding: 0.1rem 0.55rem;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.75rem;
}

.data-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: var(--bg-secondary, #12121a);
  border: 1px solid var(--border-color, #2a2a3a);
  border-radius: 10px;
  padding: 0.75rem;
}

.avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}

.card-body strong {
  font-size: 0.95rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.meta {
  font-size: 0.78rem;
  color: #a0a0b0;
}

.showcase-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.showcase-table th,
.showcase-table td {
  padding: 0.55rem 0.75rem;
  text-align: left;
  border-bottom: 1px solid var(--border-color, #2a2a3a);
}

.showcase-table thead th {
  color: var(--primary, #00f0ff);
  font-weight: 600;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.post-card {
  background: var(--bg-secondary, #12121a);
  border: 1px solid var(--border-color, #2a2a3a);
  border-radius: 8px;
  padding: 0.9rem 1rem;
  margin-bottom: 0.75rem;
}

.post-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.4rem;
}

.post-body {
  font-size: 0.9rem;
  line-height: 1.5;
  color: #d0d0e0;
  margin: 0;
}

.empty {
  color: #a0a0b0;
  font-style: italic;
  font-size: 0.9rem;
}

code {
  background: rgba(0, 240, 255, 0.1);
  border-radius: 4px;
  padding: 0.1em 0.35em;
  font-size: 0.9em;
}

.post-image {
  width: 100%;
  max-height: 300px;
  object-fit: cover;
  border-radius: 8px;
  margin-top: 0.5rem;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-top: 1rem;
}

.btn-page {
  padding: 0.4rem 1rem;
  background: var(--bg-secondary, #12121a);
  border: 1px solid var(--border-color, #2a2a3a);
  border-radius: 8px;
  color: var(--primary, #00f0ff);
  cursor: pointer;
  font-size: 0.85rem;
}

.btn-page:disabled {
  opacity: 0.4;
  cursor: default;
}

.page-info {
  font-size: 0.85rem;
  color: #999;
}
</style>
