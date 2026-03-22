<template>
  <div class="lb-panel">
    <!-- Header -->
    <div class="lb-header">
      <span class="lb-title">Leaderboard</span>
      <span class="lb-live" :class="{ 'lb-live--on': socketConnected }">
        <span class="lb-dot"></span>LIVE
      </span>
    </div>

    <!-- Game type tabs -->
    <div class="lb-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.value"
        class="lb-tab"
        :class="{ 'lb-tab--active': gameType === tab.value }"
        @click="switchTab(tab.value)"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- List -->
    <div v-if="loading" class="lb-loading">Loading…</div>
    <div v-else-if="!entries.length" class="lb-empty">No data yet</div>
    <div v-else class="lb-list">
      <div
        v-for="(entry, i) in entries"
        :key="entry.userId"
        class="lb-entry"
        :class="{ 'lb-entry--gold': i === 0, 'lb-entry--silver': i === 1, 'lb-entry--bronze': i === 2 }"
      >
        <span class="lb-rank">{{ rankLabel(i) }}</span>
        <img
          :src="entry.avatar || '/avatars/default.svg'"
          class="lb-avatar"
          alt=""
          @error="onAvatarError"
        />
        <div class="lb-info">
          <span class="lb-username">{{ entry.username }}</span>
          <span class="lb-record">{{ entry.wins }}W · {{ entry.losses }}L<span v-if="entry.draws"> · {{ entry.draws }}D</span></span>
        </div>
        <span class="lb-elo">{{ entry.elo }}</span>
      </div>
    </div>

    <!-- Footer -->
    <div class="lb-footer">
      <span>Updated {{ lastUpdated }}</span>
      <button class="lb-refresh" @click="fetchLeaderboard" :disabled="loading">↻</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import api from '../services/api.js'
import { getSocket } from '../services/socket.js'

const tabs = [
  { label: 'Pong', value: 'pong' },
  { label: 'Spit Royale', value: 'spitroyale' },
]

const gameType = ref('pong')
const entries = ref([])
const loading = ref(false)
const updatedAt = ref(null)
const socketConnected = ref(false)

let socket = null
let unsubscribeGameFinish = null

const lastUpdated = computed(() => {
  if (!updatedAt.value) return '—'
  const diff = Date.now() - updatedAt.value
  if (diff < 60000) return 'just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  return `${Math.floor(diff / 3600000)}h ago`
})

function rankLabel(i) {
  if (i === 0) return '🥇'
  if (i === 1) return '🥈'
  if (i === 2) return '🥉'
  return `#${i + 1}`
}

function onAvatarError(e) {
  e.target.src = '/avatars/default.svg'
}

async function fetchLeaderboard() {
  loading.value = true
  try {
    const { data } = await api.get(`/game/leaderboard?gameType=${gameType.value}&limit=10`)
    entries.value = data.leaderboard || []
    updatedAt.value = Date.now()
  } catch {
    entries.value = []
  } finally {
    loading.value = false
  }
}

function switchTab(type) {
  gameType.value = type
  fetchLeaderboard()
}

function setupSocket() {
  socket = getSocket()
  if (!socket) return

  socketConnected.value = socket.connected

  socket.on('connect', () => { socketConnected.value = true })
  socket.on('disconnect', () => { socketConnected.value = false })

  // Refresh leaderboard whenever any game finishes
  const onGameFinish = () => fetchLeaderboard()
  socket.on('game:finish', onGameFinish)

  unsubscribeGameFinish = () => socket.off('game:finish', onGameFinish)
}

onMounted(() => {
  fetchLeaderboard()
  setupSocket()
})

onUnmounted(() => {
  if (unsubscribeGameFinish) unsubscribeGameFinish()
  if (socket) {
    socket.off('connect')
    socket.off('disconnect')
  }
})
</script>

<style scoped>
.lb-panel {
  background: var(--bg-secondary, #12121a);
  border: 1px solid var(--border-color, #2a2a3a);
  border-radius: 16px;
  overflow: hidden;
  font-size: 0.875rem;
}

/* Header */
.lb-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border-color, #2a2a3a);
}

.lb-title {
  font-weight: 700;
  font-size: 0.95rem;
  letter-spacing: 0.5px;
  color: var(--text-primary, #e8e8f0);
}

.lb-live {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 1px;
  color: #666;
  text-transform: uppercase;
}

.lb-live--on { color: #4ade80; }

.lb-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
}

.lb-live--on .lb-dot {
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.3; }
}

/* Tabs */
.lb-tabs {
  display: flex;
  border-bottom: 1px solid var(--border-color, #2a2a3a);
}

.lb-tab {
  flex: 1;
  padding: 0.5rem;
  background: none;
  border: none;
  color: var(--text-secondary, #a0a0b0);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: color 0.15s, border-color 0.15s;
}

.lb-tab:hover { color: var(--text-primary, #e8e8f0); }

.lb-tab--active {
  color: var(--primary, #00f0ff);
  border-bottom-color: var(--primary, #00f0ff);
}

/* Loading / empty */
.lb-loading, .lb-empty {
  padding: 1.5rem;
  text-align: center;
  color: #666;
}

/* List */
.lb-list {
  display: flex;
  flex-direction: column;
}

.lb-entry {
  display: grid;
  grid-template-columns: 2rem 2rem 1fr auto;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1rem;
  border-bottom: 1px solid var(--border-color, #2a2a3a);
  transition: background 0.12s;
}

.lb-entry:last-child { border-bottom: none; }
.lb-entry:hover { background: var(--bg-tertiary, #1a1a2a); }

.lb-entry--gold   { background: rgba(255, 215, 0, 0.05); }
.lb-entry--silver { background: rgba(192, 192, 192, 0.04); }
.lb-entry--bronze { background: rgba(205, 127, 50, 0.04); }

.lb-rank {
  font-size: 1rem;
  text-align: center;
  color: var(--text-secondary, #a0a0b0);
  font-weight: 700;
  font-size: 0.78rem;
}

.lb-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid var(--border-color, #2a2a3a);
}

.lb-info {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.lb-username {
  font-weight: 600;
  color: var(--text-primary, #e8e8f0);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 0.85rem;
}

.lb-record {
  font-size: 0.72rem;
  color: var(--text-secondary, #a0a0b0);
}

.lb-elo {
  font-weight: 700;
  color: var(--primary, #00f0ff);
  font-size: 0.85rem;
  white-space: nowrap;
}

/* Footer */
.lb-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 1rem;
  border-top: 1px solid var(--border-color, #2a2a3a);
  color: #555;
  font-size: 0.72rem;
}

.lb-refresh {
  background: none;
  border: 1px solid var(--border-color, #2a2a3a);
  border-radius: 6px;
  color: #666;
  padding: 0.15rem 0.4rem;
  cursor: pointer;
  font-size: 0.85rem;
  transition: color 0.15s, border-color 0.15s;
}
.lb-refresh:hover { color: var(--primary, #00f0ff); border-color: var(--primary, #00f0ff); }
.lb-refresh:disabled { opacity: 0.4; cursor: default; }
</style>
