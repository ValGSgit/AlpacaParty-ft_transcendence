<template>
  <!-- Hidden SVG symbol defs -->
  <svg width="0" height="0" style="position:absolute;pointer-events:none" aria-hidden="true">
    <defs>
      <symbol id="i-trophy" viewBox="0 0 16 16" fill="none">
        <path d="M8 11c-2.761 0-5-2.239-5-5V2h10v4c0 2.761-2.239 5-5 5z" stroke="currentColor" stroke-width="1.5"/>
        <path d="M3 4H1.5A1.5 1.5 0 0 0 0 5.5C0 7.433 1.343 9 3 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        <path d="M13 4h1.5A1.5 1.5 0 0 1 16 5.5C16 7.433 14.657 9 13 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        <path d="M8 11v3M5 14h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </symbol>
      <symbol id="i-skull" viewBox="0 0 16 16" fill="none">
        <path d="M8 1a5 5 0 0 0-5 5c0 1.887 1.036 3.53 2.564 4.416L6 13h4l.436-2.584A5.001 5.001 0 0 0 8 1z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
        <path d="M6 13v2h4v-2" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
        <circle cx="6" cy="7" r="1" fill="currentColor"/><circle cx="10" cy="7" r="1" fill="currentColor"/>
      </symbol>
      <symbol id="i-flag" viewBox="0 0 16 16" fill="none">
        <path d="M3 1v14M3 2l10 3-10 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </symbol>
      <symbol id="i-coin" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="6.25" stroke="currentColor" stroke-width="1.5"/>
        <path d="M8 5v6M6.5 6.5h2a1 1 0 0 1 0 2h-1a1 1 0 0 0 0 2H9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </symbol>
      <symbol id="i-refresh" viewBox="0 0 16 16" fill="none">
        <path d="M13.5 8A5.5 5.5 0 1 1 8 2.5c1.52 0 2.9.616 3.9 1.613L13.5 5.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M14 2v4h-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </symbol>
    </defs>
  </svg>

  <div class="lb-panel">
    <!-- Header -->
    <div class="lb-header">
      <span class="lb-title">Leaderboard</span>
      <span class="lb-live" :class="{ 'lb-live--on': socketConnected }">
        <span class="lb-dot"></span>LIVE
      </span>
    </div>

    <!-- Segmented tabs -->
    <div class="lb-tabs" :data-tab="gameType">
      <button
        v-for="tab in tabs"
        :key="tab.value"
        class="lb-tab"
        :data-id="tab.value"
        :class="{ 'lb-tab--active': gameType === tab.value }"
        @click="switchTab(tab.value)"
      >
        <svg class="tab-icon" width="14" height="14" aria-hidden="true">
          <use :href="`#i-${tab.icon}`" />
        </svg>
        <span class="tab-label">{{ tab.label }}</span>
      </button>
    </div>

    <!-- Loading / empty -->
    <div v-if="loading" class="lb-loading">Loading…</div>
    <div v-else-if="!entries.length" class="lb-empty">No data yet</div>

    <!-- Entries -->
    <div v-else class="lb-list">
      <div
        v-for="(entry, i) in entries"
        :key="entry.userId"
        class="lb-entry"
        :class="{
          'lb-entry--gold':   i === 0,
          'lb-entry--silver': i === 1,
          'lb-entry--bronze': i === 2,
          'lb-entry--you':    isYou(entry),
        }"
      >
        <!-- Rank -->
        <span class="lb-rank">
          <svg v-if="i === 0" class="trophy-icon" width="14" height="14" aria-hidden="true">
            <use href="#i-trophy" />
          </svg>
          <span v-else-if="i < 3" class="medal-pill" :class="i === 1 ? 'medal-pill--silver' : 'medal-pill--bronze'">
            {{ i + 1 }}
          </span>
          <span v-else class="lb-rank-num">#{{ i + 1 }}</span>
        </span>

        <!-- Avatar -->
        <div class="lb-avatar-wrap">
          <img
            v-if="entry.avatar"
            :src="entry.avatar"
            class="lb-avatar"
            alt=""
            @error="e => (e.target.style.display = 'none')"
          />
          <div
            v-else
            class="lb-avatar lb-avatar--initials"
            :style="{ background: avatarColor(entry.userId) }"
          >
            {{ (entry.username?.[0] ?? '?').toUpperCase() }}
          </div>
        </div>

        <!-- Info -->
        <div class="lb-info">
          <span class="lb-username">
            {{ entry.username }}
            <span v-if="isYou(entry)" class="you-tag">you</span>
          </span>
          <span class="lb-record">
            <template v-if="gameType === 'coins'">Lv {{ entry.level ?? 1 }}</template>
            <template v-else-if="gameType === 'spit_royale'">{{ entry.kills ?? 0 }} ⚔ · {{ entry.obstacles ?? 0 }} ◄</template>
            <template v-else>{{ entry.wins ?? 0 }} stages · {{ entry.obstacles ?? 0 }} ◄</template>
          </span>
        </div>

        <!-- Score -->
        <span
          class="lb-score"
          :class="{
            'lb-score--kills':  gameType === 'spit_royale',
            'lb-score--stages': gameType === 'survival',
            'lb-score--coins':  gameType === 'coins',
            'lb-score--fresh':  freshIds.has(entry.userId),
          }"
        >
          <template v-if="gameType === 'coins'">
            <svg class="coin-glyph" width="11" height="11" aria-hidden="true"><use href="#i-coin" /></svg>
            {{ entry.coins ?? 0 }}
          </template>
          <template v-else>Lv {{ entry.level ?? 1 }}</template>
        </span>
      </div>
    </div>

    <!-- Footer -->
    <div class="lb-footer">
      <span>Updated {{ lastUpdated }}</span>
      <button
        class="lb-refresh"
        :class="{ 'lb-refresh--spinning': loading }"
        :disabled="loading"
        @click="fetchLeaderboard"
        aria-label="Refresh leaderboard"
      >
        <svg width="13" height="13" aria-hidden="true"><use href="#i-refresh" /></svg>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import api from '../services/api.js'
import { connectSocket, getSocket } from '../services/socket.js'
import { useAuthStore } from '../stores/auth.js'

const authStore = useAuthStore()

const tabs = [
  { label: 'Spit Royale', value: 'spit_royale', icon: 'skull' },
  { label: 'Alpaca Road', value: 'survival',     icon: 'flag'  },
  { label: 'Farm Coins',  value: 'coins',         icon: 'coin'  },
]

const AVATAR_PALETTE = [
  '#6c63ff','#ff6b6b','#ffa94d','#a9e34b','#4dabf7',
  '#f783ac','#63e6be','#da77f2','#74c0fc','#fcc419',
]

function avatarColor(userId) {
  return AVATAR_PALETTE[Number(userId) % AVATAR_PALETTE.length]
}

const gameType      = ref('spit_royale')
const entries       = ref([])
const loading       = ref(false)
const updatedAt     = ref(null)
const socketConnected = ref(false)
const freshIds      = ref(new Set())

let socket      = null
let freshTimer  = null

function isYou(entry) {
  return authStore.isAuthenticated && Number(entry.userId) === Number(authStore.user?.id)
}

const lastUpdated = computed(() => {
  if (!updatedAt.value) return '—'
  const diff = Date.now() - updatedAt.value
  if (diff < 60_000)   return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  return `${Math.floor(diff / 3_600_000)}h ago`
})

async function fetchLeaderboard() {
  loading.value = true
  try {
    const url = gameType.value === 'coins'
      ? '/game/leaderboard/coins?limit=10'
      : `/game/leaderboard?gameType=${gameType.value}&limit=10`
    const { data } = await api.get(url)
    const next = data.leaderboard || []

    // Mark rows whose score changed since last fetch
    const prevMap = new Map(entries.value.map(e => [e.userId, e]))
    const changed = new Set()
    next.forEach(e => {
      const prev = prevMap.get(e.userId)
      if (!prev) return
      const prevScore = gameType.value === 'coins' ? prev.coins : prev.level
      const nextScore = gameType.value === 'coins' ? e.coins    : e.level
      if (prevScore !== nextScore) changed.add(e.userId)
    })
    freshIds.value = changed
    if (freshTimer) clearTimeout(freshTimer)
    if (changed.size) freshTimer = setTimeout(() => { freshIds.value = new Set() }, 1400)

    entries.value = next
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

function handleSocketConnect()    { socketConnected.value = true  }
function handleSocketDisconnect() { socketConnected.value = false }
function handleGameFinish()       { fetchLeaderboard() }

function setupSocket() {
  socket = getSocket() || connectSocket()
  if (!socket) return
  socketConnected.value = socket.connected
  socket.off('connect',    handleSocketConnect)
  socket.off('disconnect', handleSocketDisconnect)
  socket.off('game:finish', handleGameFinish)
  socket.on('connect',    handleSocketConnect)
  socket.on('disconnect', handleSocketDisconnect)
  socket.on('game:finish', handleGameFinish)
}

onMounted(() => {
  fetchLeaderboard()
  setupSocket()
})

onUnmounted(() => {
  if (freshTimer) clearTimeout(freshTimer)
  if (socket) {
    socket.off('connect',    handleSocketConnect)
    socket.off('disconnect', handleSocketDisconnect)
    socket.off('game:finish', handleGameFinish)
  }
})
</script>

<style scoped>
/* ── Tokens ─────────────────────────────────────────────────── */
.lb-panel {
  --cyan:     #00f0ff;
  --magenta:  #ff8ec4;
  --gold:     #f5c842;
  --border-1: rgba(255,255,255,.06);
  --border-2: rgba(255,255,255,.10);
}

/* ── Panel shell ─────────────────────────────────────────────── */
.lb-panel {
  background: linear-gradient(180deg, #15151f 0%, #11111a 100%);
  border: 1px solid var(--border-1);
  border-radius: 14px;
  overflow: hidden;
  font-size: 0.875rem;
}

/* ── Header ──────────────────────────────────────────────────── */
.lb-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border-1);
}

.lb-title {
  font-weight: 700;
  font-size: 0.95rem;
  letter-spacing: 0.4px;
  color: #e8e8f0;
}

.lb-live {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: #3a3a4a;
  transition: color 0.3s;
}
.lb-live--on { color: #4ade80; }

.lb-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
}
.lb-live--on .lb-dot { animation: pulse 1.5s ease-in-out infinite; }

/* ── Tabs ────────────────────────────────────────────────────── */
.lb-tabs {
  display: flex;
  gap: 3px;
  padding: 5px;
  background: #0c0c14;
  border-bottom: 1px solid var(--border-1);
}

.lb-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 0.45rem 0.5rem;
  background: none;
  border: 1px solid transparent;
  border-radius: 7px;
  color: #555;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.15s, background 0.15s;
  position: relative;
}
.lb-tab:hover { color: #a0a0b0; }

.lb-tab--active {
  background: #15151f;
  color: #e8e8f0;
  border-color: var(--border-2);
  box-shadow:
    inset 0 0 0 1px var(--border-2),
    0 0 0 1px rgba(0,240,255,.15),
    0 6px 18px -10px rgba(0,240,255,.5);
}
.lb-tab--active::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 22%; right: 22%;
  height: 2px;
  border-radius: 2px 2px 0 0;
  background: var(--cyan);
  opacity: 0.65;
}

/* Per-tab icon accent colors when active */
.lb-tabs[data-tab="spit_royale"] .lb-tab[data-id="spit_royale"] svg { color: var(--magenta); }
.lb-tabs[data-tab="survival"]    .lb-tab[data-id="survival"]    svg { color: var(--cyan); }
.lb-tabs[data-tab="coins"]       .lb-tab[data-id="coins"]       svg { color: var(--gold); }

@media (max-width: 480px) {
  .tab-label { display: none; }
  .lb-tab    { padding: 0.55rem; }
}

/* ── Loading / empty ─────────────────────────────────────────── */
.lb-loading, .lb-empty {
  padding: 1.5rem;
  text-align: center;
  color: #555;
  font-size: 0.82rem;
}

/* ── List ────────────────────────────────────────────────────── */
.lb-list { display: flex; flex-direction: column; }

.lb-entry {
  display: grid;
  grid-template-columns: 30px 32px 1fr auto;
  align-items: center;
  gap: 8px;
  padding: 0.55rem 1rem;
  border-bottom: 1px solid var(--border-1);
  transition: background 0.12s, transform 0.12s;
  position: relative;
}
.lb-entry:last-child { border-bottom: none; }
.lb-entry:hover      { background: rgba(255,255,255,.025); transform: translateX(1px); }

/* Top-3 medal rows */
.lb-entry--gold   { background: rgba(255,215,0,.04); }
.lb-entry--silver { background: rgba(192,192,192,.03); }
.lb-entry--bronze { background: rgba(205,127,50,.03); }

/* "You" highlight */
.lb-entry--you {
  background: rgba(0,240,255,.04);
  border-color: rgba(0,240,255,.14);
}
.lb-entry--you::before {
  content: '';
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 3px;
  background: var(--cyan);
  border-radius: 0 2px 2px 0;
}

/* ── Rank cell ───────────────────────────────────────────────── */
.lb-rank {
  display: flex;
  align-items: center;
  justify-content: center;
}

.trophy-icon {
  color: #f5c842;
  filter: drop-shadow(0 0 5px rgba(245,200,66,.65));
}

.medal-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  font-size: 0.68rem;
  font-weight: 800;
}
.medal-pill--silver {
  background: radial-gradient(circle at 38% 32%, #d4d4d4, #888);
  color: #fff;
  box-shadow: 0 0 7px rgba(192,192,192,.4);
}
.medal-pill--bronze {
  background: radial-gradient(circle at 38% 32%, #e8a87c, #a0522d);
  color: #fff;
  box-shadow: 0 0 7px rgba(205,127,50,.4);
}

.lb-rank-num {
  font-size: 0.7rem;
  font-weight: 700;
  color: #555;
}

/* ── Avatar ──────────────────────────────────────────────────── */
.lb-avatar-wrap { display: flex; align-items: center; }

.lb-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid var(--border-2);
  flex-shrink: 0;
}
.lb-avatar--initials {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: 700;
  color: #fff;
}

/* ── Info ────────────────────────────────────────────────────── */
.lb-info {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.lb-username {
  display: flex;
  align-items: center;
  gap: 5px;
  font-weight: 600;
  color: #e8e8f0;
  font-size: 0.85rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.lb-record {
  font-size: 0.7rem;
  color: #555;
}

.you-tag {
  font-size: 0.6rem;
  font-weight: 700;
  color: var(--cyan);
  background: rgba(0,240,255,.12);
  border: 1px solid rgba(0,240,255,.22);
  border-radius: 4px;
  padding: 1px 4px;
  letter-spacing: 0.2px;
  flex-shrink: 0;
}

/* ── Score ───────────────────────────────────────────────────── */
.lb-score {
  font-weight: 700;
  font-size: 0.85rem;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 3px;
  transition: color 0.2s;
}
.lb-score--kills  { color: var(--magenta); }
.lb-score--stages { color: var(--cyan); }
.lb-score--coins  { color: var(--gold); }

.lb-score--fresh { animation: slide-in 0.3s ease-out, flash 1.4s ease-out; }

.coin-glyph { color: inherit; opacity: 0.85; }

/* ── Footer ──────────────────────────────────────────────────── */
.lb-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 1rem;
  border-top: 1px solid var(--border-1);
  color: #3a3a4a;
  font-size: 0.7rem;
}

.lb-refresh {
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: 1px solid var(--border-2);
  border-radius: 6px;
  color: #555;
  padding: 0.22rem 0.45rem;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
}
.lb-refresh:hover          { color: var(--cyan); border-color: var(--cyan); }
.lb-refresh:disabled       { opacity: 0.4; cursor: default; }
.lb-refresh--spinning svg  { animation: spin 0.7s linear infinite; }

/* ── Keyframes ───────────────────────────────────────────────── */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.3; }
}

@keyframes slide-in {
  from { opacity: 0; transform: translateX(5px); }
  to   { opacity: 1; transform: none; }
}

@keyframes flash {
  0%   { background: rgba(0,240,255,.14); }
  100% { background: transparent; }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
