<!--
  UserProfile View — view another user's public profile
  @owner ValGSgit
-->
<template>
  <div class="profile-page">
    <div v-if="loading" class="loading-msg">Loading profile…</div>

    <!-- Locked profile — private user, not friends -->
    <div v-else-if="isPrivate && profile" class="profile-card">
      <div class="profile-header">
        <img :src="profile.avatar || '/avatars/default.svg'" alt="avatar" class="avatar" />
        <h2>{{ profile.username }}</h2>
        <div class="online-status">
          <span class="dot" :class="{ online: profile.isOnline }"></span>
          {{ profile.isOnline ? 'Online' : 'Offline' }}
        </div>
      </div>

      <div class="locked-banner">
        <span class="lock-icon">🔒</span>
        <p>This profile is private.<br />Add <strong>{{ profile.username }}</strong> as a friend to see their stats and posts.</p>
        <button
          v-if="authStore.isAuthenticated && profile.id !== authStore.user?.id"
          class="btn-primary"
          :disabled="requestSent"
          @click="sendFriendRequest"
        >
          {{ requestSent ? 'Request sent' : 'Add Friend' }}
        </button>
      </div>

      <div class="locked-preview" aria-hidden="true">
        <div class="locked-row"></div>
        <div class="locked-row short"></div>
        <div class="locked-row"></div>
        <div class="locked-row short"></div>
      </div>
    </div>

    <!-- Error (404 / network) -->
    <div v-else-if="error" class="error-msg">{{ error }}</div>

    <!-- Full profile -->
    <div v-else-if="profile" class="profile-card">
      <div class="profile-header">
        <img :src="profile.avatar || '/avatars/default.svg'" alt="avatar" class="avatar" />
        <h2>{{ profile.username }}</h2>
        <div class="online-status">
          <span class="dot" :class="{ online: profile.is_online }"></span>
          {{ profile.is_online ? 'Online' : 'Offline' }}
        </div>
        <span class="status">{{ profile.status || '' }}</span>
      </div>

      <div class="profile-info">
        <div class="info-row">
          <span class="label">Bio</span>
          <span>{{ profile.bio || '—' }}</span>
        </div>
        <div class="info-row">
          <span class="label">Joined</span>
          <span>{{ formatDate(profile.created_at) }}</span>
        </div>
      </div>

      <!-- Actions -->
      <div class="profile-actions" v-if="authStore.isAuthenticated && profile.id !== authStore.user?.id">
        <button
          class="btn-primary"
          :disabled="requestSent"
          @click="sendFriendRequest"
        >
          {{ requestSent ? 'Request sent' : 'Add Friend' }}
        </button>
        <router-link :to="{ name: 'Messages', query: { dm: profile.id } }" class="btn-secondary">
          Send Message
        </router-link>
      </div>

      <div v-if="actionError" class="action-error">{{ actionError }}</div>

      <!-- Game Stats -->
      <div v-if="stats" class="stats-section">
        <h3>Game Stats</h3>
        <div class="stats-grid">
          <div class="stat-card">
            <span class="stat-value">{{ stats.wins || 0 }}</span>
            <span class="stat-label">Wins</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">{{ stats.losses || 0 }}</span>
            <span class="stat-label">Losses</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">{{ stats.elo || 1000 }}</span>
            <span class="stat-label">ELO</span>
          </div>
        </div>
      </div>

      <!-- User Posts -->
      <div v-if="userPosts.length" class="stats-section">
        <h3>Posts</h3>
        <div v-for="post in userPosts" :key="post.id" class="user-post">
          <p class="user-post-content">{{ post.content }}</p>
          <img v-if="post.image_url" :src="post.image_url" class="user-post-image" alt="" />
          <div class="user-post-footer">
            <span>{{ post.likes_count || 0 }} likes</span>
            <span>{{ formatDate(post.created_at) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'
import api from '../services/api.js'
import { devError } from '../services/logger.js'

const route = useRoute()
const authStore = useAuthStore()

const profile = ref(null)
const stats = ref(null)
const userPosts = ref([])
const loading = ref(true)
const error = ref(null)
const isPrivate = ref(false)
const requestSent = ref(false)
const actionError = ref(null)

function formatDate(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`
}

onMounted(async () => {
  const userId = route.params.id
  try {
    const { data } = await api.get(`/users/${userId}`)
    profile.value = data.user
  } catch (e) {
    if (e.response?.status === 403) {
      isPrivate.value = true
      profile.value = e.response?.data?.user ?? null
    } else {
      error.value = e.response?.data?.error?.message || 'User not found'
    }
  } finally {
    loading.value = false
  }

  if (isPrivate.value) return

  // Fetch game stats and posts in parallel only for visible profiles
  try {
    const { data } = await api.get(`/game/stats?userId=${userId}&gameType=spit_royale`)
    stats.value = data.stats
  } catch (e) { devError(e) }

  try {
    const { data } = await api.get(`/posts/user/${userId}?limit=10`)
    userPosts.value = data.posts || []
  } catch (e) { devError(e) }
})

async function sendFriendRequest() {
  actionError.value = null
  try {
    await api.post('/friends/requests', { userId: profile.value.id })
    requestSent.value = true
  } catch (e) {
    actionError.value = e.response?.data?.error?.message || 'Failed to send request'
  }
}
</script>

<style scoped>
.profile-page {
  display: flex;
  justify-content: center;
  padding: 2rem 1rem;
}

.loading-msg, .error-msg {
  padding: 2rem;
  text-align: center;
  color: #999;
}

.error-msg { color: #ff5050; }

.profile-card {
  background: var(--bg-secondary, #12121a);
  border: 1px solid var(--border-color, #2a2a3a);
  border-radius: 12px;
  padding: 2rem;
  width: 100%;
  max-width: 560px;
}

.profile-header {
  text-align: center;
  margin-bottom: 1.5rem;
}

.avatar {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--primary, #00f0ff);
  margin-bottom: 0.75rem;
}

.profile-header h2 {
  margin: 0;
  color: var(--primary, #00f0ff);
}

.online-status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  font-size: 0.85rem;
  color: #999;
  margin: 0.3rem 0;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #666;
}

.dot.online { background: #00ff88; }

.status {
  color: #999;
  font-size: 0.9rem;
}

/* ── Locked state ──────────────────────────────────────────────────── */

.locked-banner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 1.5rem;
  background: var(--bg-tertiary, #1a1a2a);
  border: 1px solid var(--border-color, #2a2a3a);
  border-radius: 10px;
  text-align: center;
  margin-bottom: 1.25rem;
}

.lock-icon {
  font-size: 2rem;
}

.locked-banner p {
  margin: 0;
  color: #999;
  font-size: 0.9rem;
  line-height: 1.5;
}

.locked-banner strong {
  color: var(--text-primary, #e8e8f0);
}

.locked-preview {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  opacity: 0.2;
  pointer-events: none;
  user-select: none;
}

.locked-row {
  height: 14px;
  background: var(--border-color, #2a2a3a);
  border-radius: 6px;
}

.locked-row.short {
  width: 55%;
}

/* ── Normal profile ────────────────────────────────────────────────── */

.profile-info {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--border-color, #2a2a3a);
}

.label {
  color: #999;
  font-weight: 500;
}

.profile-actions {
  display: flex;
  gap: 0.75rem;
  margin: 1rem 0;
}

.action-error {
  color: #ff5050;
  font-size: 0.85rem;
  margin-top: -0.5rem;
  margin-bottom: 0.5rem;
}

.btn-primary, .btn-secondary {
  flex: 1;
  padding: 0.6rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  text-align: center;
  text-decoration: none;
  font-size: 0.9rem;
}

.btn-primary {
  background: var(--primary, #00f0ff);
  color: #000;
  border: none;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: default;
}

.btn-secondary {
  background: transparent;
  border: 1px solid var(--primary, #00f0ff);
  color: var(--primary, #00f0ff);
}

.stats-section {
  margin-top: 1.5rem;
}

.stats-section h3 {
  margin-bottom: 0.75rem;
  color: var(--primary, #00f0ff);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
}

.stat-card {
  background: var(--bg-tertiary, #1a1a2a);
  border-radius: 8px;
  padding: 0.75rem;
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--primary, #00f0ff);
}

.stat-label {
  font-size: 0.8rem;
  color: #999;
}

.user-post {
  background: var(--bg-tertiary, #1a1a2a);
  border: 1px solid var(--border-color, #2a2a3a);
  border-radius: 8px;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
}

.user-post-content {
  margin: 0 0 0.5rem;
  font-size: 0.9rem;
  line-height: 1.4;
  white-space: pre-wrap;
  word-break: break-word;
}

.user-post-image {
  width: 100%;
  max-height: 200px;
  object-fit: cover;
  border-radius: 6px;
  margin-bottom: 0.5rem;
}

.user-post-footer {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: #888;
}
</style>
