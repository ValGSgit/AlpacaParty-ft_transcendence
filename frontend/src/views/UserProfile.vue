<!--
  UserProfile View — view another user's public profile
  @owner ValGSgit
-->
<template>
  <div class="profile-page">
    <div v-if="loading" class="loading-msg">Loading profile…</div>
    <div v-else-if="error" class="error-msg">{{ error }}</div>
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

      <div class="xp-section" v-if="profile.level">
        <div class="level-badge">Level {{ profile.level }}</div>
        <span class="xp-text">{{ profile.xp || 0 }} XP</span>
      </div>

      <div class="profile-info">
        <div class="info-row">
          <span class="label">Bio</span>
          <span>{{ profile.bio || '—' }}</span>
        </div>
        <div class="info-row">
          <span class="label">Joined</span>
          <span>{{ new Date(profile.created_at).toLocaleDateString() }}</span>
        </div>
      </div>

      <!-- Actions -->
      <div class="profile-actions" v-if="authStore.isAuthenticated && profile.id !== authStore.user?.id">
        <button class="btn-primary" @click="sendFriendRequest">Add Friend</button>
        <router-link :to="{ name: 'Messages', query: { dm: profile.id } }" class="btn-secondary">
          Send Message
        </router-link>
      </div>

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
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'
import api from '../services/api.js'

const route = useRoute()
const authStore = useAuthStore()

const profile = ref(null)
const stats = ref(null)
const loading = ref(true)
const error = ref(null)

onMounted(async () => {
  const userId = route.params.id
  try {
    const { data } = await api.get(`/users/${userId}`)
    profile.value = data.user
  } catch (e) {
    if (e.response?.status === 403) {
      error.value = 'This profile is private and visible only to friends or admins.'
    } else {
      error.value = e.response?.data?.error?.message || 'User not found'
    }
  } finally {
    loading.value = false
  }

  // Try to fetch game stats
  try {
    const { data } = await api.get(`/game/stats?userId=${route.params.id}&gameType=pong`)
    stats.value = data.stats
  } catch {
    // stats not available
  }
})

async function sendFriendRequest() {
  try {
    await api.post('/friends/requests', { receiverId: profile.value.id })
    alert('Friend request sent!')
  } catch (e) {
    alert(e.response?.data?.error?.message || 'Failed to send request')
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

.xp-section {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
  justify-content: center;
}

.level-badge {
  background: var(--primary, #00f0ff);
  color: #000;
  font-weight: 700;
  padding: 0.2rem 0.6rem;
  border-radius: 12px;
  font-size: 0.8rem;
}

.xp-text {
  font-size: 0.8rem;
  color: #999;
}

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
</style>
