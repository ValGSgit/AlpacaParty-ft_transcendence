<!--
  UserProfile View — view another user's public profile
  @owner ValGSgit
-->
<template>
  <div class="profile-wrap">
    <div v-if="loading" class="loading-msg">Loading profile…</div>

    <!-- Error (404 / network) -->
    <div v-else-if="error" class="error-msg">{{ error }}</div>

    <!-- Locked profile — private user, not friends -->
    <section v-else-if="isPrivate && profile" class="overview">
      <!-- Hero banner with lock overlay -->
      <header class="hero">
        <div class="hero-bg" aria-hidden="true">
          <span class="hero-blob a"></span>
          <span class="hero-blob b"></span>
          <span class="hero-grid"></span>
        </div>
        <div class="hero-content">
          <div class="avatar-wrap" :class="{ on: profile.isOnline }">
            <div class="hero-avatar">
              <img v-if="profile.avatar" :src="profile.avatar" :alt="profile.username" />
              <span v-else class="avatar-initials">{{ profile.username?.slice(0,2).toUpperCase() }}</span>
            </div>
            <span class="presence-dot" :class="{ on: profile.isOnline }"></span>
          </div>
          <div class="hero-meta">
            <div class="name-row">
              <h1 class="display-name">{{ profile.username }}</h1>
              <span class="online-badge" :class="profile.isOnline ? 'badge-on' : 'badge-off'">
                <span class="badge-dot"></span>
                {{ profile.isOnline ? 'Online' : 'Offline' }}
              </span>
            </div>
            <p class="handle">@{{ profile.username }}</p>
          </div>
        </div>
      </header>

      <!-- Locked banner with friend actions -->
      <div class="locked-banner">
        <span class="lock-icon">🔒</span>
        <p>This profile is private.<br />Add <strong>{{ profile.username }}</strong> as a friend to see their stats and posts.</p>
        <div v-if="authStore.isAuthenticated && profile.id !== authStore.user?.id" class="friend-actions">
          <template v-if="friendStatus?.status === 'pending_sent'">
            <button class="btn btn-pill btn-secondary" disabled>Request Sent</button>
          </template>
          <template v-else-if="friendStatus?.status === 'pending_received'">
            <button class="btn btn-pill btn-primary" @click="acceptFriendRequest">Accept Request</button>
            <button class="btn btn-pill btn-secondary" @click="declineFriendRequest">Decline</button>
          </template>
          <template v-else>
            <button class="btn btn-pill btn-primary" @click="sendFriendRequest">Add Friend</button>
          </template>
        </div>
      </div>

      <div class="locked-preview" aria-hidden="true">
        <div class="locked-row"></div>
        <div class="locked-row short"></div>
        <div class="locked-row"></div>
        <div class="locked-row short"></div>
      </div>
    </section>

    <!-- Full profile -->
    <section v-else-if="profile" class="overview">
      <!-- Hero banner -->
      <header class="hero">
        <div class="hero-bg" aria-hidden="true">
          <span class="hero-blob a"></span>
          <span class="hero-blob b"></span>
          <span class="hero-grid"></span>
        </div>
        <div class="hero-content">
          <div class="avatar-wrap" :class="{ on: profile.is_online }">
            <div class="hero-avatar">
              <img v-if="profile.avatar" :src="profile.avatar" :alt="profile.username" />
              <span v-else class="avatar-initials">{{ profile.username?.slice(0,2).toUpperCase() }}</span>
            </div>
            <span class="presence-dot" :class="{ on: profile.is_online }"></span>
          </div>
          <div class="hero-meta">
            <div class="name-row">
              <h1 class="display-name">{{ profile.username }}</h1>
              <span class="online-badge" :class="profile.is_online ? 'badge-on' : 'badge-off'">
                <span class="badge-dot"></span>
                {{ profile.is_online ? 'Online' : 'Offline' }}
              </span>
            </div>
            <p class="handle">@{{ profile.username }}</p>
            <p class="bio" v-if="profile.bio">{{ profile.bio }}</p>
            <p class="status-line" v-if="profile.status">
              <span class="status-glyph">⌬</span> {{ profile.status }}
            </p>
          </div>
        </div>
      </header>

      <!-- Stats row -->
      <section v-if="stats" class="stats-row">
        <article class="stat-card">
          <span class="stat-icon stat-icon-wins" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M7 4h10v3a5 5 0 0 1-10 0V4Z"/><path d="M5 5H3v2a3 3 0 0 0 3 3"/><path d="M19 5h2v2a3 3 0 0 1-3 3"/><path d="M9 19h6M12 13v6"/></svg>
          </span>
          <span class="stat-val">{{ (stats.wins || 0).toLocaleString() }}</span>
          <span class="stat-label">Wins</span>
        </article>
        <article class="stat-card">
          <span class="stat-icon stat-icon-losses" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M5 11a7 7 0 1 1 14 0v3a2 2 0 0 1-1 1.7V18a2 2 0 0 1-2 2h-1v-2h-2v2h-2v-2H9v2H8a2 2 0 0 1-2-2v-2.3A2 2 0 0 1 5 14v-3Z"/><circle cx="9" cy="12" r="1.2" fill="currentColor"/><circle cx="15" cy="12" r="1.2" fill="currentColor"/></svg>
          </span>
          <span class="stat-val">{{ (stats.losses || 0).toLocaleString() }}</span>
          <span class="stat-label">Losses</span>
        </article>
        <article class="stat-card">
          <span class="stat-icon stat-icon-coins" aria-hidden="true">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 6v2m0 8v2M8 12h8"/></svg>
          </span>
          <span class="stat-val">{{ winRate }}</span>
          <span class="stat-label">Win Rate</span>
        </article>
      </section>

      <!-- Friend Actions (if applicable) -->
      <div v-if="authStore.isAuthenticated && profile.id !== authStore.user?.id && actionError" class="action-error">{{ actionError }}</div>
      <div v-if="authStore.isAuthenticated && profile.id !== authStore.user?.id" class="friend-actions-row">
        <template v-if="friendStatus?.status === 'pending_sent'">
          <button class="btn btn-pill btn-secondary" disabled>Request Sent</button>
        </template>
        <template v-else-if="friendStatus?.status === 'pending_received'">
          <button class="btn btn-pill btn-primary" @click="acceptFriendRequest">Accept Request</button>
          <button class="btn btn-pill btn-secondary" @click="declineFriendRequest">Decline</button>
        </template>
        <template v-else-if="friendStatus?.status === 'friends'">
          <button class="btn btn-pill btn-secondary" @click="removeFriend">Remove Friend</button>
        </template>
        <template v-else>
          <button class="btn btn-pill btn-primary" @click="sendFriendRequest">Add Friend</button>
        </template>
      </div>

      <!-- Posts section -->
      <section v-if="userPosts.length" class="posts-section">
        <header class="section-head">
          <h2>Posts</h2>
        </header>
        <div v-for="post in userPosts" :key="post.id" class="mini-post">
          <p class="mini-post-content">{{ post.content }}</p>
          <img v-if="post.image_url" :src="post.image_url" class="mini-post-image" alt="" />
          <div class="mini-post-footer">
            <span>{{ post.likes_count || 0 }} likes · {{ post.comments_count || 0 }} comments</span>
            <span>{{ formatDate(post.created_at) }}</span>
          </div>
        </div>
      </section>
      <div v-else-if="userPosts.length === 0" class="empty-msg">No posts yet.</div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
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
const friendStatus = ref(null) // { status: 'none'|'pending_sent'|'pending_received'|'friends', requestId? }
const actionError = ref(null)

const winRate = computed(() => {
  if (!stats.value) return '0%'
  const total = (stats.value.wins || 0) + (stats.value.losses || 0)
  if (total === 0) return '0%'
  const rate = Math.round(((stats.value.wins || 0) / total) * 100)
  return `${rate}%`
})

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
    friendStatus.value = data.friend_status
  } catch (e) {
    if (e.response?.status === 403) {
      isPrivate.value = true
      profile.value = e.response?.data?.user ?? null
      friendStatus.value = e.response?.data?.friend_status ?? null
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
    const { data } = await api.post('/friends/requests', { userId: profile.value.id })
    friendStatus.value = data.autoAccepted
      ? { status: 'friends' }
      : { status: 'pending_sent' }
  } catch (e) {
    actionError.value = e.response?.data?.error?.message || 'Failed to send request'
  }
}

async function acceptFriendRequest() {
  actionError.value = null
  try {
    await api.put(`/friends/requests/${friendStatus.value.requestId}/accept`)
    friendStatus.value = { status: 'friends' }
  } catch (e) {
    actionError.value = e.response?.data?.error?.message || 'Failed to accept request'
  }
}

async function declineFriendRequest() {
  actionError.value = null
  try {
    await api.put(`/friends/requests/${friendStatus.value.requestId}/decline`)
    friendStatus.value = { status: 'none' }
  } catch (e) {
    actionError.value = e.response?.data?.error?.message || 'Failed to decline request'
  }
}

async function removeFriend() {
  actionError.value = null
  try {
    await api.delete(`/friends/${profile.value.id}`)
    friendStatus.value = { status: 'none' }
  } catch (e) {
    actionError.value = e.response?.data?.error?.message || 'Failed to remove friend'
  }
}
</script>

<style scoped>
.profile-wrap {
  max-width: 876px;
  margin: 0 auto;
  padding: 2rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.loading-msg, .error-msg {
  padding: 2rem;
  text-align: center;
  color: var(--text-muted);
  font-size: 0.9rem;
}

.error-msg { color: var(--danger); }

/* ══════════════════════ HERO SECTION ══════════════════════ */
.overview {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.hero {
  position: relative;
  border: 1px solid var(--border-color);
  border-radius: 14px;
  padding: 2rem;
  background: var(--bg-secondary);
  overflow: hidden;
}

.hero-bg {
  position: absolute; inset: 0; z-index: 0;
  opacity: 0.3; pointer-events: none;
}

.hero-blob {
  position: absolute; border-radius: 50%; opacity: 0.06;
  animation: blob-float 12s ease-in-out infinite;
}
.hero-blob.a {
  width: 320px; height: 320px; top: -80px; right: -80px; background: var(--primary);
  animation-delay: 0s;
}
.hero-blob.b {
  width: 280px; height: 280px; bottom: -60px; left: -60px; background: var(--magenta);
  animation-delay: 8s;
}
@keyframes blob-float {
  0%, 100% { transform: translate(0, 0); }
  25% { transform: translate(20px, -20px); }
  50% { transform: translate(-10px, 15px); }
  75% { transform: translate(-20px, -10px); }
}

.hero-grid {
  position: absolute; inset: 0;
  background-image:
    linear-gradient(0deg, transparent 24%, rgba(0,240,255,.04) 25%, rgba(0,240,255,.04) 26%, transparent 27%, transparent 74%, rgba(0,240,255,.04) 75%, rgba(0,240,255,.04) 76%, transparent 77%, transparent),
    linear-gradient(90deg, transparent 24%, rgba(0,240,255,.04) 25%, rgba(0,240,255,.04) 26%, transparent 27%, transparent 74%, rgba(0,240,255,.04) 75%, rgba(0,240,255,.04) 76%, transparent 77%, transparent);
  background-size: 60px 60px;
}

.hero-content {
  position: relative; z-index: 1;
  display: flex; gap: 1.5rem; align-items: flex-start;
}

.avatar-wrap {
  position: relative; flex-shrink: 0;
}

.hero-avatar {
  width: 96px; height: 96px; border-radius: 16px;
  border: 3px solid var(--text-muted);
  display: inline-flex; align-items: center; justify-content: center;
  overflow: hidden;
  transition: border-color .25s ease, box-shadow .25s ease;
}
.hero-avatar img { width: 100%; height: 100%; object-fit: cover; }
.avatar-initials { font-size: 30px; font-weight: 800; color: var(--text-primary); }
.avatar-wrap.on .hero-avatar {
  border-color: var(--primary);
  box-shadow: 0 0 0 4px rgba(0,240,255,.12), 0 0 28px -2px rgba(0,240,255,.55);
}
.presence-dot {
  position: absolute; right: 4px; bottom: 4px;
  width: 16px; height: 16px; border-radius: 50%;
  background: var(--text-muted); border: 3px solid var(--bg-primary);
}
.presence-dot.on { background: var(--green); box-shadow: 0 0 8px var(--green); }

.hero-meta { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.name-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.display-name { margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -.01em; }
.handle { margin: 0; color: var(--text-muted); font-size: 13px; font-family: 'JetBrains Mono', ui-monospace, monospace; }
.bio { margin: 6px 0 0; font-size: 14px; line-height: 1.5; color: var(--text-secondary); }
.status-line { margin: 8px 0 0; font-size: 12.5px; color: var(--text-secondary); display: inline-flex; align-items: center; gap: 6px; }
.status-glyph { color: var(--primary); }

.online-badge {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 10.5px; letter-spacing: .12em; text-transform: uppercase; font-weight: 700;
  padding: 3px 9px; border-radius: 999px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
}
.badge-dot { width: 6px; height: 6px; border-radius: 50%; }
.badge-on { color: var(--green); background: rgba(54,224,122,.08); border: 1px solid rgba(54,224,122,.3); }
.badge-on .badge-dot { background: var(--green); box-shadow: 0 0 6px var(--green); }
.badge-off { color: var(--text-muted); background: rgba(138,140,154,.06); border: 1px solid var(--border-color); }
.badge-off .badge-dot { background: var(--text-muted); }

/* ── Locked profile state ─────────────────────────────────── */
.locked-banner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 1.5rem;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  text-align: center;
  margin-bottom: 1.25rem;
}

.lock-icon {
  font-size: 2rem;
}

.locked-banner p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.9rem;
  line-height: 1.5;
}

.locked-banner strong {
  color: var(--text-primary);
}

.friend-actions {
  display: flex;
  gap: 0.625rem;
  width: 100%;
  margin-top: 0.5rem;
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
  background: var(--border-color);
  border-radius: 6px;
}

.locked-row.short {
  width: 55%;
}

/* ══════════════════════ STATS SECTION ══════════════════════ */
.stats-row { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 12px; }
.stat-card {
  background: var(--bg-secondary); border: 1px solid var(--border-color);
  border-radius: 14px; padding: 14px;
  display: flex; flex-direction: column; gap: 4px;
  transition: transform .18s ease, border-color .18s ease, box-shadow .25s ease;
  position: relative; overflow: hidden;
}
.stat-card::after {
  content: ""; position: absolute; top: 0; left: 0; right: 0; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(0,240,255,.4), transparent);
  opacity: 0; transition: opacity .25s ease;
}
.stat-card:hover { transform: translateY(-3px); border-color: rgba(0,240,255,.3); box-shadow: 0 14px 30px -16px rgba(0,0,0,.7), 0 0 0 1px rgba(0,240,255,.15); }
.stat-card:hover::after { opacity: 1; }
.stat-icon {
  width: 36px; height: 36px; border-radius: 10px;
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--bg-tertiary); border: 1px solid var(--border-color); margin-bottom: 4px;
}
.stat-icon svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.stat-icon-wins   { color: var(--gold); }
.stat-icon-losses { color: var(--magenta); }
.stat-icon-level  { color: var(--primary); }
.stat-icon-coins  { color: var(--green); }
.stat-val { font-size: 22px; font-weight: 800; letter-spacing: -.01em; font-variant-numeric: tabular-nums; }
.stat-label { font-size: 11px; letter-spacing: .14em; text-transform: uppercase; color: var(--text-secondary); font-weight: 600; }

/* ══════════════════════ FRIEND ACTIONS ══════════════════════ */
.action-error {
  color: var(--danger);
  font-size: 0.85rem;
  margin-bottom: 0.5rem;
}

.friend-actions-row {
  display: flex;
  gap: 0.625rem;
}

.btn {
  appearance: none; border: 0; cursor: pointer;
  font: inherit; font-size: 0.875rem; font-weight: 600;
  padding: 0.5rem 1.25rem; border-radius: 999px;
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  transition: background .15s ease, color .15s ease, transform .12s ease, opacity .15s ease, box-shadow .2s ease;
  white-space: nowrap;
}
.btn:active { transform: translateY(1px); }
.btn:disabled { opacity: .55; cursor: not-allowed; }
.btn-primary {
  background: linear-gradient(180deg, #00f0ff, #00c8d6); color: #061114;
  box-shadow: 0 0 0 1px rgba(0,240,255,.4), 0 6px 18px -8px rgba(0,240,255,.6);
}
.btn-primary:hover:not(:disabled) { box-shadow: 0 0 0 1px rgba(0,240,255,.6), 0 8px 22px -6px rgba(0,240,255,.8); }
.btn-secondary { background: transparent; color: var(--text-muted); border: 1px solid var(--border-color); }
.btn-secondary:hover:not(:disabled) { background: var(--bg-tertiary); color: var(--text-primary); }
.btn-pill { padding: 0.375rem 0.875rem; font-size: 0.8125rem; }

/* ══════════════════════ POSTS SECTION ══════════════════════ */
.section-head { display: flex; align-items: baseline; justify-content: space-between; margin: 8px 0 12px; }
.section-head h2 { margin: 0; font-size: 13px; letter-spacing: .14em; text-transform: uppercase; color: var(--text-secondary); font-weight: 700; }

.mini-post {
  background: var(--bg-secondary); border: 1px solid var(--border-color);
  border-radius: 12px; padding: 12px; margin-bottom: 8px;
}
.mini-post-content { margin: 0 0 6px; font-size: 14px; line-height: 1.5; white-space: pre-wrap; word-break: break-word; }
.mini-post-image { width: 100%; max-height: 200px; object-fit: cover; border-radius: 8px; margin-bottom: 6px; }
.mini-post-footer { display: flex; justify-content: space-between; font-size: 12px; color: var(--text-muted); font-family: 'JetBrains Mono', ui-monospace, monospace; }
.empty-msg { color: var(--text-muted); font-size: 13px; padding: 8px 0; text-align: center; font-style: italic; }

/* ══ RESPONSIVE ══ */
@media (max-width: 720px) {
  .profile-wrap { padding: 16px; }
  .hero-content { flex-direction: column; align-items: flex-start; gap: 14px; }
  .stats-row { grid-template-columns: repeat(2, 1fr); }
  .friend-actions, .friend-actions-row { flex-wrap: wrap; }
}
</style>
