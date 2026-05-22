<template>
  <div class="profile-wrap">

    <!-- ── Tab bar — pill switcher ── -->
    <nav class="tab-pills" role="tablist">
      <button
        class="tab-pill"
        :class="{ active: activeTab === 'overview' }"
        role="tab" :aria-selected="activeTab === 'overview'"
        @click="setActiveTab('overview')"
      >Overview</button>
      <button
        class="tab-pill"
        :class="{ active: activeTab === 'settings' }"
        role="tab" :aria-selected="activeTab === 'settings'"
        @click="setActiveTab('settings')"
      >Settings</button>
    </nav>

    <!-- ══════════════════════ OVERVIEW TAB ══════════════════════ -->
    <section v-if="activeTab === 'overview'" class="overview">

      <!-- 1. Hero banner -->
      <header class="hero">
        <div class="hero-bg" aria-hidden="true">
          <span class="hero-blob a"></span>
          <span class="hero-blob b"></span>
          <span class="hero-grid"></span>
        </div>
        <div class="hero-content">
          <div class="avatar-wrap" :class="{ on: authStore.user?.isOnline }">
            <div class="hero-avatar">
              <img v-if="authStore.user?.avatar" :src="authStore.user.avatar" :alt="authStore.user?.username" />
              <span v-else class="avatar-initials">{{ authStore.user?.username?.slice(0,2).toUpperCase() }}</span>
            </div>
            <span class="presence-dot" :class="{ on: authStore.user?.isOnline }"></span>
          </div>
          <div class="hero-meta">
            <div class="name-row">
              <h1 class="display-name">{{ authStore.user?.username }}</h1>
              <span class="online-badge" :class="authStore.user?.isOnline ? 'badge-on' : 'badge-off'">
                <span class="badge-dot"></span>
                {{ authStore.user?.isOnline ? 'Online' : 'Offline' }}
              </span>
            </div>
            <p class="handle">@{{ authStore.user?.username }}</p>
            <p class="bio" v-if="authStore.user?.bio">{{ authStore.user.bio }}</p>
            <p class="status-line" v-if="authStore.user?.status">
              <span class="status-glyph">⌬</span> {{ authStore.user.status }}
            </p>
          </div>
        </div>
      </header>

      <!-- 2. XP progression -->
      <section class="xp-row">
        <span class="level-pill">Lv.&nbsp;<b>{{ userStats.level }}</b></span>
        <div class="xp-track">
          <div class="xp-label">
            <span><b>{{ intoLevel }}</b> / 100 XP to level {{ userStats.level + 1 }}</span>
            <span class="xp-remaining">{{ xpToNextLevel }} XP to go</span>
          </div>
          <div class="xp-bar">
            <div class="xp-fill" :style="{ width: xpProgress + '%' }">
              <span class="xp-shimmer"></span>
            </div>
          </div>
        </div>
        <span class="level-pill level-pill-next">Lv.&nbsp;<b>{{ userStats.level + 1 }}</b></span>
      </section>

      <!-- 3. Stats row -->
      <section class="stats-row">
        <article class="stat-card">
          <span class="stat-icon stat-icon-wins" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M7 4h10v3a5 5 0 0 1-10 0V4Z"/><path d="M5 5H3v2a3 3 0 0 0 3 3"/><path d="M19 5h2v2a3 3 0 0 1-3 3"/><path d="M9 19h6M12 13v6"/></svg>
          </span>
          <span class="stat-val">{{ userStats.wins.toLocaleString() }}</span>
          <span class="stat-label">Wins</span>
        </article>
        <article class="stat-card">
          <span class="stat-icon stat-icon-losses" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M5 11a7 7 0 1 1 14 0v3a2 2 0 0 1-1 1.7V18a2 2 0 0 1-2 2h-1v-2h-2v2h-2v-2H9v2H8a2 2 0 0 1-2-2v-2.3A2 2 0 0 1 5 14v-3Z"/><circle cx="9" cy="12" r="1.2" fill="currentColor"/><circle cx="15" cy="12" r="1.2" fill="currentColor"/></svg>
          </span>
          <span class="stat-val">{{ userStats.losses.toLocaleString() }}</span>
          <span class="stat-label">Losses</span>
        </article>
        <article class="stat-card">
          <span class="stat-icon stat-icon-elo" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M3 20h18"/><path d="M5 16l4-6 4 4 6-9"/></svg>
          </span>
          <span class="stat-val">{{ userStats.elo.toLocaleString() }}</span>
          <span class="stat-label">ELO</span>
        </article>
        <article class="stat-card">
          <span class="stat-icon stat-icon-coins" aria-hidden="true">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 6v2m0 8v2M8 12h8"/></svg>
          </span>
          <span class="stat-val">{{ (authStore.user?.coins ?? userStats.coins ?? 0).toLocaleString() }}</span>
          <span class="stat-label">Coins</span>
        </article>
      </section>

      <!-- 4. Achievements -->
      <section class="ach-section">
        <header class="section-head">
          <h2>Achievements</h2>
          <span class="section-count">
            {{ achievements.filter(a => a.unlocked).length }} / {{ allAchievements.length || achievements.length }}
          </span>
        </header>
        <div class="ach-grid" v-if="allAchievements.length">
          <article
            v-for="a in allAchievements"
            :key="a.id"
            class="ach-card"
            :class="{ unlocked: unlockedMap[a.id], locked: !unlockedMap[a.id] }"
            :title="unlockedMap[a.id] ? (a.unlockedAt ? `Unlocked ${new Date(a.unlockedAt).toLocaleDateString()}` : 'Unlocked') : 'Locked — ' + a.description"
          >
            <div class="ach-icon">
              <img v-if="a.icon && a.icon.startsWith('/')" :src="a.icon" class="ach-icon-img" alt="" />
              <span v-else>{{ a.icon || '🏆' }}</span>
            </div>
            <div class="ach-name">{{ a.name }}</div>
            <div class="ach-desc">{{ a.description }}</div>
            <div class="ach-foot">
              <span class="xp-pip">+{{ a.xpReward ?? a.points ?? 0 }} XP</span>
              <span v-if="!unlockedMap[a.id]" class="lock-icon">🔒</span>
            </div>
          </article>
        </div>
        <div class="ach-grid" v-else-if="achievements.length">
          <article
            v-for="a in achievements"
            :key="a.id"
            class="ach-card unlocked"
            :title="a.description"
          >
            <div class="ach-icon">
              <img v-if="a.icon && a.icon.startsWith('/')" :src="a.icon" class="ach-icon-img" alt="" />
              <span v-else>{{ a.icon || '🏆' }}</span>
            </div>
            <div class="ach-name">{{ a.name }}</div>
            <div class="ach-desc">{{ a.description }}</div>
            <div class="ach-foot">
              <span class="xp-pip">+{{ a.xpReward ?? a.points ?? 0 }} XP</span>
            </div>
          </article>
        </div>
        <p v-if="!allAchievements.length && !achievements.length" class="empty-msg">No achievements yet.</p>
      </section>

      <!-- 5. My Posts -->
      <section class="posts-section">
        <header class="section-head">
          <h2>My Posts</h2>
        </header>
        <div v-if="postsLoading" class="empty-msg">Loading posts…</div>
        <div v-else-if="!userPosts.length" class="empty-msg">No posts yet — go spit some facts.</div>
        <div v-for="post in userPosts" :key="post.id" class="mini-post">
          <p class="mini-post-content">{{ post.content }}</p>
          <img v-if="post.image_url" :src="post.image_url" class="mini-post-image" alt="" />
          <div class="mini-post-footer">
            <span>{{ post.likes_count || 0 }} likes · {{ post.comments_count || 0 }} comments</span>
            <span>{{ formatDate(post.created_at) }}</span>
          </div>
        </div>
      </section>
    </section>

    <!-- ══════════════════════ SETTINGS TAB ══════════════════════ -->
    <div v-else-if="activeTab === 'settings'" class="settings" :class="{ mounted: settingsMounted }">

      <!-- Flash banner -->
      <Transition name="flash">
        <div v-if="globalMsg" class="flash" :class="'flash-' + globalMsg.type" role="status">
          <span class="flash-icon" aria-hidden="true">
            <svg v-if="globalMsg.type === 'success'" viewBox="0 0 24 24"><path d="M5 12l4 4 10-10"/></svg>
            <svg v-else viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 17v.01"/></svg>
          </span>
          <span class="flash-text">{{ globalMsg.text }}</span>
          <button class="flash-x" @click="globalMsg = null" aria-label="Dismiss">
            <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>
          </button>
        </div>
      </Transition>

      <!-- 1. Edit Profile -->
      <section class="settings-section" style="--i:0">
        <h3>Edit Profile</h3>
        <form @submit.prevent="saveProfile">
          <div class="field">
            <label for="f-username">Username</label>
            <input id="f-username" v-model="profileForm.username" type="text" autocomplete="username" maxlength="32" />
          </div>
          <div class="field">
            <label for="f-email">Email</label>
            <input id="f-email" v-model="profileForm.email" type="email" autocomplete="email" />
          </div>
          <div class="field">
            <label for="f-bio">Bio</label>
            <textarea id="f-bio" v-model="profileForm.bio" rows="3" maxlength="500"></textarea>
            <span class="counter">{{ (profileForm.bio || '').length }}/500</span>
          </div>
          <div class="field">
            <label for="f-status">Status</label>
            <input id="f-status" v-model="profileForm.status" type="text" maxlength="200" />
            <span class="counter">{{ (profileForm.status || '').length }}/200</span>
          </div>
          <div class="field">
            <label>Avatar</label>
            <div class="avatar-row">
              <div class="avatar-preview">
                <img v-if="profileForm.avatar" :src="profileForm.avatar" alt="avatar preview" />
                <span v-else class="avatar-fallback">{{ profileForm.username?.slice(0,2).toUpperCase() }}</span>
              </div>
              <div class="avatar-actions">
                <label class="btn btn-secondary file-btn">
                  Upload Image
                  <input type="file" accept="image/*" @change="uploadAvatar" hidden />
                </label>
              </div>
            </div>
          </div>
          <div class="s-actions">
            <button type="submit" class="btn btn-primary" :disabled="savingProfile">
              {{ savingProfile ? 'Saving…' : 'Save Profile' }}
            </button>
          </div>
        </form>
      </section>

      <!-- 2. Privacy -->
      <section class="settings-section" style="--i:1">
        <h3>Privacy</h3>
        <div class="s-row">
          <div class="s-row-meta">
            <div class="s-row-label">Public Profile</div>
            <p class="s-row-desc">Allow anyone to view your profile via the public API.</p>
          </div>
          <label class="toggle">
            <input type="checkbox" v-model="profileForm.is_public" @change="saveProfile" />
            <span class="toggle-track"><span class="toggle-thumb"></span></span>
          </label>
        </div>
      </section>

      <!-- 3. Change Password -->
      <section class="settings-section" style="--i:2">
        <h3>Change Password</h3>
        <!-- Hidden username field for password manager accessibility -->
        <input type="text" :value="profileForm.username" autocomplete="username" aria-hidden="true" tabindex="-1" class="visually-hidden" readonly />
        <form @submit.prevent="changePassword">
          <div class="field">
            <label for="f-pw1">Current Password</label>
            <input id="f-pw1" v-model="pwForm.current" type="password" autocomplete="current-password" maxlength="50" />
          </div>
          <div class="field">
            <label for="f-pw2">New Password</label>
            <input id="f-pw2" v-model="pwForm.newPw" type="password" autocomplete="new-password" maxlength="50" />
          </div>
          <div class="field">
            <label for="f-pw3">Confirm New Password</label>
            <input id="f-pw3" v-model="pwForm.confirm" type="password" autocomplete="new-password" maxlength="50" />
          </div>
          <p v-if="pwError" class="error-msg">{{ pwError }}</p>
          <div class="s-actions">
            <button type="submit" class="btn btn-primary" :disabled="savingPw">
              {{ savingPw ? 'Updating…' : 'Update Password' }}
            </button>
          </div>
        </form>
      </section>

      <!-- 4. Public API Key -->
      <section class="settings-section" style="--i:3">
        <h3>Public API Key</h3>
        <p class="s-muted">
          Use this key to access the <router-link to="/docs" class="s-link">Public API</router-link>.
          Pass it as the <code>X-API-Key</code> header on every request.
        </p>
        <div v-if="apiKeyMsg" class="flash" :class="'flash-' + apiKeyMsg.type" style="margin-bottom:1rem">
          <span class="flash-text">{{ apiKeyMsg.text }}</span>
        </div>

        <template v-if="currentApiKey">
          <div class="key-row">
            <code class="key-value">{{ maskedKey }}</code>
            <div class="key-actions">
              <button class="btn btn-pill btn-secondary" @click="revealKey = !revealKey">
                {{ revealKey ? 'Hide' : 'Reveal' }}
              </button>
              <button class="btn btn-pill btn-secondary copy-btn" @click="copyApiKey">
                Copy
                <span class="copied-tip" :class="{ show: Date.now() - copiedAt < 1500 }">Copied!</span>
              </button>
              <button class="btn btn-pill btn-danger" :disabled="apiKeyLoading" @click="revokeApiKey">Revoke</button>
            </div>
          </div>
          <div class="s-actions s-actions-full">
            <button class="btn btn-primary btn-full" :disabled="apiKeyLoading" @click="generateApiKey">
              {{ apiKeyLoading ? 'Working…' : 'Regenerate Key' }}
            </button>
          </div>
        </template>

        <template v-else>
          <p class="s-muted">No API key generated yet.</p>
          <div class="s-actions">
            <button class="btn btn-primary" :disabled="apiKeyLoading" @click="generateApiKey">
              {{ apiKeyLoading ? 'Working…' : 'Generate Key' }}
            </button>
          </div>
        </template>
      </section>

      <!-- 5. My Data — danger zone -->
      <section class="settings-section danger-zone" style="--i:4">
        <h3>My Data</h3>
        <div class="data-row">
          <div class="s-row-meta">
            <div class="s-row-label">Export My Data</div>
            <p class="s-row-desc">Request a full export of your account data.</p>
          </div>
          <div class="s-row-action">
            <select v-model="exportFormat" class="s-select">
              <option value="json">JSON</option>
              <option value="csv">CSV</option>
              <option value="xml">XML</option>
            </select>
            <button class="btn btn-pill btn-secondary" :disabled="requestingData" @click="requestExport">
              {{ requestingData ? 'Wait…' : 'Export' }}
            </button>
          </div>
        </div>
        <div class="data-row last">
          <div class="s-row-meta">
            <div class="s-row-label danger-text">Delete Account</div>
            <p class="s-row-desc">Permanently delete your account and all associated data. This cannot be undone.</p>
          </div>
          <div class="s-row-action">
            <button class="btn btn-pill btn-danger-solid" :disabled="requestingData" @click="confirmDelete">Delete</button>
          </div>
        </div>
      </section>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'
import api from '../services/api.js'
import { devError } from '../services/logger.js'

const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()

// UI State
const activeTab = ref('overview')
const settingsMounted = ref(false)

// Profile Data State
const achievements = ref([])
const allAchievements = ref([])
const unlockedMap = ref({})
const userPosts = ref([])
const postsLoading = ref(true)

// Game stats
const userStats = ref({ xp: 0, level: 0, wins: 0, losses: 0, elo: 1000, coins: 0 })

// XP computed props
const xpToNextLevel = computed(() => {
  const lvl = userStats.value.level
  return (lvl + 1) * 100 - userStats.value.xp
})
const xpProgress = computed(() => {
  const lvl = userStats.value.level
  const into = userStats.value.xp - lvl * 100
  return Math.max(0, Math.min(100, into))
})
const intoLevel = computed(() => userStats.value.xp - userStats.value.level * 100)

// Settings Data State
const globalMsg = ref(null)
const savingProfile = ref(false)
const savingPw = ref(false)
const requestingData = ref(false)
const pwError = ref(null)
const exportFormat = ref('json')

// API Key State
const currentApiKey = ref(null)
const apiKeyLoading = ref(false)
const apiKeyMsg = ref(null)
const revealKey = ref(false)
const copiedAt = ref(0)

const maskedKey = computed(() => {
  if (!currentApiKey.value) return ''
  if (revealKey.value) return currentApiKey.value
  return currentApiKey.value.slice(0, 6) + '•'.repeat(Math.max(0, currentApiKey.value.length - 6))
})

const MAX_AVATAR_BYTES = 10 * 1024 * 1024
const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']

const profileForm = ref({
  username: '', email: '', bio: '', status: '', avatar: '', is_public: false
})
const pwForm = ref({ current: '', newPw: '', confirm: '' })

// Helpers
function formatDate(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`
}

function flash(text, type = 'success') {
  globalMsg.value = { text, type }
  setTimeout(() => { globalMsg.value = null }, 4000)
}

function setActiveTab(tab) {
  const nextTab = tab === 'settings' ? 'settings' : 'overview'
  activeTab.value = nextTab
  router.replace({
    name: 'Profile',
    query: nextTab === 'settings' ? { tab: 'settings' } : {},
  })
}

watch(
  () => route.query.tab,
  (tab) => { activeTab.value = tab === 'settings' ? 'settings' : 'overview' },
  { immediate: true },
)

// Stagger animation trigger for settings tab
watch(activeTab, (tab) => {
  if (tab === 'settings') {
    settingsMounted.value = false
    requestAnimationFrame(() => { settingsMounted.value = true })
  }
})

// Initialization
onMounted(async () => {
  // 1. Initialize Profile Form
  const u = authStore.user
  if (u) {
    profileForm.value = {
      username:  u.username  ?? '',
      email:     u.email     ?? '',
      bio:       u.bio       ?? '',
      status:    u.status    ?? '',
      avatar:    u.avatar    ?? '',
      is_public: u.is_public ?? false,
    }
  }

  // 2. Fetch Achievements
  try {
    const { data } = await api.get('/game/achievements')
    const all = data.achievements || []
    allAchievements.value = all
    achievements.value = all.filter(a => a.unlocked)
    const map = {}
    for (const a of achievements.value) { map[a.id] = true }
    unlockedMap.value = map
    // Derive XP from unlocked achievement rewards
    const totalXp = achievements.value.reduce((sum, a) => sum + (a.xpReward || a.points || 0), 0)
    userStats.value.xp = totalXp
    userStats.value.level = Math.floor(totalXp / 100)
  } catch (e) { devError(e) }

  // 3. Fetch game stats (wins/losses/elo)
  try {
    const { data } = await api.get('/game/stats')
    const s = Array.isArray(data.stats) ? data.stats[0] : data.stats
    if (s) {
      userStats.value.wins = s.wins ?? 0
      userStats.value.losses = s.losses ?? 0
      userStats.value.elo = s.elo ?? 1000
    }
  } catch { /* stats endpoint optional */ }

  // 4. Fetch Posts
  try {
    const { data } = await api.get(`/posts/user/${u?.id}?limit=10`)
    userPosts.value = data.posts || []
  } catch (e) { devError(e) } finally {
    postsLoading.value = false
  }

  // 5. Fetch API key status
  try {
    const { data } = await api.get('/users/me/api-key')
    currentApiKey.value = data.apiKey || null
  } catch (e) {
    if (e?.response?.status !== 404) devError(e)
    currentApiKey.value = null
  }

  // Trigger stagger animation if starting on settings tab
  if (activeTab.value === 'settings') {
    requestAnimationFrame(() => { settingsMounted.value = true })
  }
})

// Settings Methods
async function uploadAvatar(event) {
  const file = event.target.files?.[0]
  if (!file) return
  if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
    flash('Avatar must be a JPEG, PNG, GIF, WebP, or SVG image.', 'error')
    event.target.value = ''
    return
  }
  if (file.size > MAX_AVATAR_BYTES) {
    flash('Avatar must be 10 MB or smaller.', 'error')
    event.target.value = ''
    return
  }
  const formData = new FormData()
  formData.append('files', file)
  try {
    const { data } = await api.post('/uploads', formData)
    const url = data.files?.[0]?.url
    if (url) {
      await authStore.updateProfile({ avatar: url })
      profileForm.value.avatar = url
      flash('Avatar updated!')
    }
  } catch (e) {
    flash(e.response?.data?.error?.message || 'Avatar upload failed.', 'error')
  }
}

async function saveProfile() {
  savingProfile.value = true
  try {
    await authStore.updateProfile(profileForm.value)
    flash('Profile saved.')
  } catch (e) {
    flash(e.response?.data?.error?.message || 'Failed to save profile.', 'error')
  } finally {
    savingProfile.value = false
  }
}

async function changePassword() {
  pwError.value = null
  if (pwForm.value.newPw !== pwForm.value.confirm) {
    pwError.value = 'New passwords do not match.'
    return
  }
  if (pwForm.value.newPw.length < 8) {
    pwError.value = 'Password must be at least 8 characters.'
    return
  }
  savingPw.value = true
  try {
    await api.put('/users/me/password', {
      currentPassword: pwForm.value.current,
      newPassword:     pwForm.value.newPw,
    })
    pwForm.value = { current: '', newPw: '', confirm: '' }
    flash('Password updated.')
  } catch (e) {
    pwError.value = e.response?.data?.error?.message || 'Failed to update password.'
  } finally {
    savingPw.value = false
  }
}

function flashApiKey(text, type = 'success') {
  apiKeyMsg.value = { text, type }
  setTimeout(() => { apiKeyMsg.value = null }, 5000)
}

async function generateApiKey() {
  if (currentApiKey.value) {
    const ok = window.confirm(
      'Regenerate your API key?\n\nYour current key will be permanently invalidated and any integrations using it will stop working immediately.'
    )
    if (!ok) return
  }
  apiKeyLoading.value = true
  try {
    const { data } = await api.post('/users/me/api-key')
    currentApiKey.value = data.apiKey
    revealKey.value = true
    flashApiKey('API key generated. Copy it now — it will be partially hidden after you leave this page.')
  } catch (e) {
    flashApiKey(e.response?.data?.error?.message || 'Failed to generate API key.', 'error')
  } finally {
    apiKeyLoading.value = false
  }
}

async function revokeApiKey() {
  if (!window.confirm('Revoke your API key? Any integrations using it will stop working.')) return
  apiKeyLoading.value = true
  try {
    await api.delete('/users/me/api-key')
    currentApiKey.value = null
    revealKey.value = false
    flashApiKey('API key revoked.')
  } catch (e) {
    flashApiKey(e.response?.data?.error?.message || 'Failed to revoke API key.', 'error')
  } finally {
    apiKeyLoading.value = false
  }
}

async function copyApiKey() {
  if (!currentApiKey.value) return
  try {
    await navigator.clipboard.writeText(currentApiKey.value)
    copiedAt.value = Date.now()
    flashApiKey('Copied to clipboard.')
  } catch {
    flashApiKey('Could not copy — please select and copy manually.', 'error')
  }
}

async function requestExport() {
  requestingData.value = true
  try {
    const res = await api.get('/users/me/export', {
      params: { format: exportFormat.value },
      responseType: 'blob',
    })
    const ext = exportFormat.value
    const blob = new Blob([res.data])
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `alpacaparty-data.${ext}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    flash('Data exported successfully.')
  } catch (e) {
    flash(e.response?.data?.error?.message || 'Failed to export data.', 'error')
  } finally {
    requestingData.value = false
  }
}

async function confirmDelete() {
  if (!window.confirm('Are you sure? This will permanently delete your account.')) return
  requestingData.value = true
  try {
    await api.delete('/users/me')
    await authStore.logout()
    flash('Account deleted.')
    await router.replace('/login')
  } catch (e) {
    flash(e.response?.data?.error?.message || 'Failed to delete account.', 'error')
  } finally {
    requestingData.value = false
  }
}
</script>

<style scoped>
/* ── tokens shared across both tabs ── */
.profile-wrap {
  --bg-primary:    #0b0b13;
  --bg-secondary:  #12121a;
  --bg-tertiary:   #1a1a2a;
  --border-color:  #2a2a3a;
  --primary:       #00f0ff;
  --magenta:       #ff8ec4;
  --gold:          #f5c842;
  --green:         #36e07a;
  --text-primary:  #e8e8f0;
  --text-secondary:#a0a0b0;
  --text-muted:    #6a6c7c;
  --danger:        #ef4444;
  --success:       #4ade80;

  background: var(--bg-primary);
  color: var(--text-primary);
  font-family: 'Space Grotesk', system-ui, -apple-system, sans-serif;
  font-feature-settings: "ss01","tnum";
  max-width: 980px;
  margin: 0 auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-height: 100vh;
}

/* ── tab bar ── */
.tab-pills {
  align-self: flex-start;
  display: inline-flex; gap: 4px; padding: 4px;
  background: var(--bg-secondary); border: 1px solid var(--border-color);
  border-radius: 999px;
}
.tab-pill {
  appearance: none; border: 0; cursor: pointer;
  background: transparent; color: var(--text-secondary);
  font: inherit; font-size: 13px; font-weight: 600;
  padding: 8px 18px; border-radius: 999px;
  transition: background .18s ease, color .18s ease, box-shadow .2s ease;
}
.tab-pill:hover { color: var(--text-primary); background: var(--bg-tertiary); }
.tab-pill.active {
  background: var(--primary); color: #061114;
  box-shadow: 0 0 0 1px rgba(0,240,255,.4), 0 8px 22px -10px rgba(0,240,255,.7);
}

/* ══ OVERVIEW TAB ══ */
.overview { display: flex; flex-direction: column; gap: 18px; }

/* 1. Hero */
.hero {
  position: relative; overflow: hidden;
  border: 1px solid var(--border-color); border-radius: 18px;
  background: linear-gradient(180deg, #14141e 0%, #10101a 100%);
  padding: 22px;
}
.hero-bg { position: absolute; inset: 0; pointer-events: none; }
.hero-blob { position: absolute; border-radius: 50%; filter: blur(60px); }
.hero-blob.a { width: 340px; height: 340px; background: rgba(0,240,255,.18); left: -80px; top: -120px; }
.hero-blob.b { width: 300px; height: 300px; background: rgba(255,142,196,.18); right: -60px; bottom: -130px; }
.hero-grid {
  position: absolute; inset: 0; opacity: .06;
  background-image: linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px);
  background-size: 24px 24px;
  mask-image: radial-gradient(ellipse at center, #000 30%, transparent 75%);
}

.hero-content { position: relative; display: flex; align-items: center; gap: 22px; }
.avatar-wrap { position: relative; flex-shrink: 0; }
.hero-avatar {
  width: 96px; height: 96px; border-radius: 50%;
  background: linear-gradient(135deg, #2a2a3a, #1a1a2a);
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

/* 2. XP row */
.xp-row {
  display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 14px;
  padding: 14px 16px;
  background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 14px;
}
.level-pill {
  display: inline-flex; align-items: center;
  background: var(--primary); color: #061114;
  padding: 6px 12px; border-radius: 999px;
  font-size: 12px; letter-spacing: .04em;
  box-shadow: 0 0 0 1px rgba(0,240,255,.4), 0 6px 18px -8px rgba(0,240,255,.6);
}
.level-pill b { font-weight: 800; }
.level-pill-next { background: transparent; color: var(--text-secondary); border: 1px dashed var(--border-color); box-shadow: none; }

.xp-track { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.xp-label {
  display: flex; justify-content: space-between; gap: 10px;
  font-size: 12px; color: var(--text-secondary);
  font-family: 'JetBrains Mono', ui-monospace, monospace;
}
.xp-label b { color: var(--text-primary); font-weight: 700; }
.xp-remaining { color: var(--magenta); }

.xp-bar {
  position: relative; height: 10px; border-radius: 999px;
  background: var(--bg-tertiary); border: 1px solid var(--border-color); overflow: hidden;
}
.xp-fill {
  position: relative; height: 100%; border-radius: 999px;
  background: linear-gradient(90deg, var(--primary) 0%, #7ad3ff 50%, var(--magenta) 100%);
  box-shadow: 0 0 12px rgba(0,240,255,.4), inset 0 0 0 1px rgba(255,255,255,.08);
  transition: width .8s cubic-bezier(.2,.8,.2,1);
  animation: xp-grow 1.2s cubic-bezier(.2,.8,.2,1) both;
}
.xp-shimmer {
  position: absolute; inset: 0; border-radius: 999px;
  background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,.45) 50%, transparent 100%);
  transform: translateX(-100%);
  animation: xp-shimmer 2.4s ease-in-out infinite;
  animation-delay: 1s;
}
@keyframes xp-grow { from { width: 0; } }
@keyframes xp-shimmer { 0% { transform: translateX(-100%); } 60%, 100% { transform: translateX(120%); } }

/* 3. Stats row */
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
.stat-icon-elo    { color: var(--primary); }
.stat-icon-coins  { color: var(--green); }
.stat-val { font-size: 22px; font-weight: 800; letter-spacing: -.01em; font-variant-numeric: tabular-nums; }
.stat-label { font-size: 11px; letter-spacing: .14em; text-transform: uppercase; color: var(--text-secondary); font-weight: 600; }

/* 4. Achievements */
.section-head { display: flex; align-items: baseline; justify-content: space-between; margin: 8px 0 12px; }
.section-head h2 { margin: 0; font-size: 13px; letter-spacing: .14em; text-transform: uppercase; color: var(--text-secondary); font-weight: 700; }
.section-count { font-size: 12px; color: var(--text-muted); font-family: 'JetBrains Mono', ui-monospace, monospace; }

.ach-grid { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 12px; }
.ach-card {
  background: var(--bg-secondary); border: 1px solid var(--border-color);
  border-radius: 14px; padding: 14px 12px;
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  text-align: center; cursor: default;
  transition: transform .2s ease, border-color .2s ease, box-shadow .25s ease, opacity .2s ease;
}
.ach-icon {
  width: 48px; height: 48px; border-radius: 12px;
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 26px; line-height: 1;
  background: var(--bg-tertiary); border: 1px solid var(--border-color); margin-bottom: 4px;
  transition: filter .25s ease, box-shadow .25s ease;
}
.ach-icon-img { width: 32px; height: 32px; object-fit: contain; }
.ach-name { font-size: 13px; font-weight: 700; color: var(--text-primary); }
.ach-desc { font-size: 11.5px; color: var(--text-secondary); line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.ach-foot { display: flex; align-items: center; justify-content: space-between; width: 100%; margin-top: 4px; }
.xp-pip {
  font-size: 10px; letter-spacing: .08em; font-weight: 700; color: var(--primary);
  background: rgba(0,240,255,.08); border: 1px solid rgba(0,240,255,.3);
  padding: 2px 6px; border-radius: 4px; font-family: 'JetBrains Mono', ui-monospace, monospace;
}
.lock-icon { font-size: 12px; opacity: .7; }

.ach-card.unlocked .ach-icon { border-color: rgba(0,240,255,.45); box-shadow: 0 0 0 1px rgba(0,240,255,.2), 0 0 18px -2px rgba(0,240,255,.4); }
.ach-card.unlocked:hover { transform: scale(1.02); border-color: rgba(0,240,255,.5); box-shadow: 0 14px 30px -14px rgba(0,0,0,.7), 0 0 0 1px rgba(0,240,255,.25); }
.ach-card.locked { opacity: .3; }
.ach-card.locked .ach-icon { filter: grayscale(1) blur(1px); }
.ach-card.locked .xp-pip { color: var(--text-muted); background: transparent; border-color: var(--border-color); }
.ach-card.locked:hover { opacity: .45; }

/* 5. Posts mini */
.mini-post {
  background: var(--bg-secondary); border: 1px solid var(--border-color);
  border-radius: 12px; padding: 12px; margin-bottom: 8px;
}
.mini-post-content { margin: 0 0 6px; font-size: 14px; line-height: 1.5; white-space: pre-wrap; word-break: break-word; }
.mini-post-image { width: 100%; max-height: 200px; object-fit: cover; border-radius: 8px; margin-bottom: 6px; }
.mini-post-footer { display: flex; justify-content: space-between; font-size: 12px; color: var(--text-muted); font-family: 'JetBrains Mono', ui-monospace, monospace; }
.empty-msg { color: var(--text-muted); font-size: 13px; padding: 8px 0; text-align: center; font-style: italic; }

/* ══ SETTINGS TAB ══ */
.settings *, .settings *::before, .settings *::after { box-sizing: border-box; }
.settings {
  display: flex; flex-direction: column; gap: 1.5rem;
}

.settings-section {
  background: var(--bg-secondary); border: 1px solid var(--border-color);
  border-radius: 14px; padding: 1.5rem;
  opacity: 0; transform: translateY(10px);
  transition: opacity .5s ease, transform .5s cubic-bezier(.2,.8,.2,1);
  transition-delay: calc(var(--i, 0) * 70ms);
}
.settings.mounted .settings-section { opacity: 1; transform: none; }

.settings-section h3 {
  margin: 0 0 1rem; padding-bottom: 1rem;
  font-size: 1rem; font-weight: 600; color: var(--text-primary);
  border-bottom: 1px solid var(--border-color);
}

/* flash banner */
.flash {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px 10px 14px; border-radius: 10px;
  border-left: 3px solid currentColor;
  font-size: 0.875rem; font-weight: 500;
}
.flash-success { background: #1a3a2a; color: var(--success); }
.flash-error   { background: #3a1a1a; color: #f87171; }
.flash-icon svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; display: block; }
.flash-text { flex: 1; }
.flash-x {
  appearance: none; border: 0; background: transparent; cursor: pointer;
  color: currentColor; opacity: .7; padding: 4px; border-radius: 6px;
  display: inline-flex; align-items: center; justify-content: center;
}
.flash-x:hover { opacity: 1; background: rgba(255,255,255,.08); }
.flash-x svg { width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; }
.flash-enter-from, .flash-leave-to { opacity: 0; transform: translateY(-6px); }
.flash-enter-active, .flash-leave-active { transition: opacity .25s ease, transform .25s ease; }

/* form atoms */
.field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 1rem; position: relative; }
.field:last-of-type { margin-bottom: 0; }
label { font-size: 0.875rem; font-weight: 500; color: var(--text-secondary); }

input[type="text"], input[type="email"], input[type="password"], textarea, .s-select {
  width: 100%; background: var(--bg-tertiary); border: 1px solid var(--border-color);
  border-radius: 8px; padding: 0.5rem 0.75rem;
  color: var(--text-primary); font: inherit; font-size: 0.9375rem; outline: none;
  transition: border-color .15s ease, box-shadow .15s ease;
}
input:focus, textarea:focus, .s-select:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 2px rgba(0,240,255,.18);
}
textarea { resize: vertical; min-height: 84px; line-height: 1.5; }

.counter {
  position: absolute; right: 10px; bottom: 8px;
  font-size: 0.75rem; color: var(--text-muted);
  font-variant-numeric: tabular-nums; pointer-events: none;
  background: linear-gradient(90deg, transparent, var(--bg-tertiary) 30%);
  padding-left: 8px; font-family: 'JetBrains Mono', ui-monospace, monospace;
}

/* avatar row */
.avatar-row { display: flex; align-items: center; gap: 1rem; margin-top: 4px; }
.avatar-preview {
  width: 64px; height: 64px; border-radius: 50%;
  background: var(--bg-tertiary); border: 1px solid var(--border-color);
  overflow: hidden; flex-shrink: 0;
  display: inline-flex; align-items: center; justify-content: center;
}
.avatar-preview img { width: 100%; height: 100%; object-fit: cover; }
.avatar-fallback { font-size: 1.125rem; font-weight: 700; color: var(--text-secondary); }
.avatar-actions { display: flex; flex-direction: column; gap: 6px; flex: 1; min-width: 0; }
.file-btn { align-self: flex-start; cursor: pointer; }
.hint { margin: 0; font-size: 0.8rem; color: var(--text-muted); line-height: 1.4; }
.s-link { color: var(--primary); text-decoration: none; }
.s-link:hover { text-decoration: underline; }

/* buttons */
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
.btn-danger { background: transparent; color: var(--danger); border: 1px solid var(--danger); }
.btn-danger:hover:not(:disabled) { background: var(--danger); color: #fff; }
.btn-danger-solid { background: var(--danger); color: #fff; border: 1px solid var(--danger); }
.btn-danger-solid:hover:not(:disabled) { background: #dc2626; }
.btn-pill { padding: 0.375rem 0.875rem; font-size: 0.8125rem; }
.btn-full { width: 100%; }

.s-actions { display: flex; justify-content: flex-end; margin-top: 1rem; }
.s-actions-full { margin-top: 0.75rem; }

/* privacy toggle */
.s-row { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
.s-row-meta { flex: 1; min-width: 0; }
.s-row-label { font-weight: 600; color: var(--text-primary); font-size: 0.9rem; }
.s-row-desc { margin: 4px 0 0; font-size: 0.8rem; color: var(--text-muted); line-height: 1.4; }

.toggle { position: relative; display: inline-block; flex-shrink: 0; }
.toggle input { position: absolute; opacity: 0; pointer-events: none; }
.toggle-track {
  width: 44px; height: 24px; border-radius: 999px;
  background: var(--border-color); display: inline-block; position: relative;
  transition: background .2s ease; cursor: pointer;
}
.toggle-thumb {
  position: absolute; top: 2px; left: 2px;
  width: 20px; height: 20px; border-radius: 50%;
  background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,.4);
  transition: transform .2s ease;
}
.toggle input:checked + .toggle-track { background: var(--primary); }
.toggle input:checked + .toggle-track .toggle-thumb { transform: translateX(20px); }
.toggle input:focus-visible + .toggle-track { box-shadow: 0 0 0 2px rgba(0,240,255,.4); }

/* password */
.error-msg { margin: 0.25rem 0 0; font-size: 0.8125rem; color: var(--danger); }

/* API key */
.s-muted { margin: 0 0 1rem; font-size: 0.8rem; color: var(--text-muted); line-height: 1.5; }
.s-muted code { background: var(--bg-tertiary); padding: 1px 6px; border-radius: 4px; font-size: 0.75rem; color: var(--text-secondary); }
.key-row {
  background: var(--bg-primary); border: 1px solid var(--border-color);
  border-radius: 10px; padding: 10px 12px;
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
}
.key-value {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 0.8125rem; color: var(--text-secondary);
  flex: 1; min-width: 0; word-break: break-all; letter-spacing: .02em;
}
.key-actions { display: flex; gap: 6px; flex-shrink: 0; }

.copy-btn { position: relative; }
.copied-tip {
  position: absolute; bottom: calc(100% + 6px); left: 50%; transform: translateX(-50%) translateY(4px);
  background: var(--bg-tertiary); color: var(--text-primary);
  border: 1px solid var(--border-color); border-radius: 6px;
  padding: 3px 8px; font-size: 0.75rem; white-space: nowrap;
  opacity: 0; pointer-events: none;
  transition: opacity .2s ease, transform .2s ease;
}
.copied-tip.show { opacity: 1; transform: translateX(-50%) translateY(0); }

/* danger zone */
.danger-zone { border-left: 3px solid var(--danger); }
.data-row {
  display: flex; align-items: center; justify-content: space-between; gap: 1rem;
  padding: 1rem 0; border-bottom: 1px solid var(--border-color);
}
.data-row:first-of-type { padding-top: 0; }
.data-row.last { border-bottom: 0; padding-bottom: 0; }
.s-row-action { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.s-select { width: auto; padding: 0.375rem 0.625rem; font-size: 0.8125rem; }
.danger-text { color: var(--danger); }

/* a11y helper */
.visually-hidden {
  position: absolute; width: 1px; height: 1px;
  padding: 0; margin: -1px; overflow: hidden;
  clip: rect(0,0,0,0); white-space: nowrap; border: 0;
}

/* ── responsive ── */
@media (max-width: 720px) {
  .profile-wrap { padding: 16px; }
  .hero-content { flex-direction: column; align-items: flex-start; gap: 14px; }
  .stats-row { grid-template-columns: repeat(2, 1fr); }
  .ach-grid { grid-template-columns: repeat(2, 1fr); }
  .xp-row { grid-template-columns: auto 1fr; }
  .level-pill-next { display: none; }
  .data-row { flex-direction: column; align-items: flex-start; }
  .s-row-action { width: 100%; justify-content: flex-end; }
  .key-row { flex-direction: column; align-items: stretch; }
  .key-actions { justify-content: flex-end; }
}
</style>
