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
    </section>

    <!-- Leaderboard -->
    <section v-if="leaderboard !== null" class="showcase-section">
      <h2>Leaderboard</h2>
      <table class="showcase-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Username</th>
            <th>Score</th>
            <th>Game Type</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(entry, i) in leaderboard" :key="entry.id ?? i">
            <td>{{ i + 1 }}</td>
            <td>{{ entry.username ?? `User #${entry.user_id}` }}</td>
            <td>{{ entry.score ?? entry.player1_score ?? '—' }}</td>
            <td>{{ entry.game_type ?? '—' }}</td>
            <td>{{ entry.created_at ? new Date(entry.created_at).toLocaleDateString() : '—' }}</td>
          </tr>
          <tr v-if="leaderboard.length === 0">
            <td colspan="5" class="empty">No entries yet.</td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- Posts -->
    <section v-if="posts !== null" class="showcase-section">
      <h2>Posts <span class="badge">{{ posts.length }}</span></h2>
      <div v-for="post in posts" :key="post.id" class="post-card">
        <div class="post-header">
          <strong>{{ post.username ?? `User #${post.user_id}` }}</strong>
          <span class="meta">{{ post.created_at ? new Date(post.created_at).toLocaleDateString() : '' }}</span>
        </div>
        <p class="post-body">{{ post.content }}</p>
      </div>
      <p v-if="posts.length === 0" class="empty">No public posts yet.</p>
    </section>

    <!-- Organizations -->
    <section v-if="organizations !== null" class="showcase-section">
      <h2>Organizations <span class="badge">{{ organizations.length }}</span></h2>
      <div class="card-grid">
        <div v-for="org in organizations" :key="org.id" class="data-card">
          <div class="card-body">
            <strong>{{ org.name }}</strong>
            <span class="meta">{{ org.member_count ?? 0 }} members</span>
            <span class="meta">{{ org.description || 'No description.' }}</span>
          </div>
        </div>
      </div>
      <p v-if="organizations.length === 0" class="empty">No organizations yet.</p>
    </section>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const apiKey = ref('')
const loading = ref(false)
const globalError = ref('')

const users = ref(null)
const leaderboard = ref(null)
const posts = ref(null)
const organizations = ref(null)

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

async function fetchAll() {
  loading.value = true
  globalError.value = ''
  users.value = null
  leaderboard.value = null
  posts.value = null
  organizations.value = null

  try {
    const [usersRes, lbRes, postsRes, orgsRes] = await Promise.all([
      apiFetch('/users'),
      apiFetch('/leaderboard'),
      apiFetch('/posts'),
      apiFetch('/organizations'),
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
</style>
