<template>
  <div class="profile-page">
    <div class="profile-card" v-if="authStore.user">
      <div class="profile-banner">
        <div class="banner-gradient"></div>
        <div class="avatar-wrapper">
          <img :src="authStore.user.avatar || '/avatars/default.svg'" alt="avatar" class="avatar" />
          <div class="online-indicator online"></div>
        </div>
      </div>

      <div class="profile-body">
        <h2>{{ authStore.user.username }}</h2>
        <span class="status">{{ authStore.user.status || 'No status set' }}</span>

        <div class="profile-tabs">
          <button :class="['tab-btn', { active: activeTab === 'overview' }]" @click="setActiveTab('overview')">
            Overview
          </button>
          <button :class="['tab-btn', { active: activeTab === 'settings' }]" @click="setActiveTab('settings')">
            Settings
          </button>
        </div>

        <div v-if="activeTab === 'overview'" class="tab-content">
          <div class="profile-info">
            <div class="info-row">
              <span class="label">Email</span>
              <span>{{ authStore.user.email }}</span>
            </div>
            <div class="info-row">
              <span class="label">Bio</span>
              <span>{{ authStore.user.bio || '—' }}</span>
            </div>
            <div class="info-row">
              <span class="label">Coins</span>
              <span>{{ authStore.user.coins ?? 0 }}</span>
            </div>
            <div class="info-row">
              <span class="label">Joined</span>
              <span>{{ formatDate(authStore.user.created_at) }}</span>
            </div>
          </div>

          <section class="section-block" v-if="achievements.length || allAchievements.length">
            <h3>Achievements</h3>
            <div class="achievements-grid" v-if="allAchievements.length">
              <div
                v-for="a in allAchievements"
                :key="a.id"
                class="achievement-card"
                :class="{ unlocked: unlockedMap[a.id] }"
                :title="a.description + (unlockedMap[a.id] ? ' ✓ Unlocked' : ' — Locked')"
              >
                <span class="achievement-icon">
                  <img v-if="a.icon && a.icon.startsWith('/')" :src="a.icon" class="achievement-icon-img" alt="" />
                  <span v-else>{{ a.icon || '🏆' }}</span>
                </span>
                <span class="achievement-name">{{ a.name }}</span>
                <span class="achievement-pts">+{{ a.xpReward ?? a.points ?? 0 }} xp</span>
              </div>
            </div>
            <div v-else-if="achievements.length" class="achievements-grid">
              <div v-for="a in achievements" :key="a.id" class="achievement-card unlocked">
                <span class="achievement-icon">
                  <img v-if="a.icon && a.icon.startsWith('/')" :src="a.icon" class="achievement-icon-img" alt="" />
                  <span v-else>{{ a.icon || '🏆' }}</span>
                </span>
                <span class="achievement-name">{{ a.name }}</span>
                <span class="achievement-pts">+{{ a.xpReward ?? a.points ?? 0 }} xp</span>
              </div>
            </div>
            <p v-if="!allAchievements.length && !achievements.length" class="empty-msg">No achievements yet.</p>
          </section>

          <section class="section-block">
            <h3>My Posts</h3>
            <div v-if="postsLoading" class="empty-msg">Loading posts…</div>
            <div v-else-if="!userPosts.length" class="empty-msg">No posts yet.</div>
            <div v-for="post in userPosts" :key="post.id" class="mini-post">
              <p class="mini-post-content">{{ post.content }}</p>
              <img v-if="post.image_url" :src="post.image_url" class="mini-post-image" alt="" />
              <div class="mini-post-footer">
                <span>{{ post.likes_count || 0 }} likes</span>
                <span>{{ formatDate(post.created_at) }}</span>
              </div>
            </div>
          </section>
        </div>

        <div v-else-if="activeTab === 'settings'" class="tab-content settings-view">
          <div v-if="globalMsg" :class="['banner', globalMsg.type]">{{ globalMsg.text }}</div>

          <section class="settings-section">
            <h3>Edit Profile</h3>
            <form @submit.prevent="saveProfile" class="settings-form">
              <div class="form-row">
                <label>Username</label>
                <input v-model="profileForm.username" type="text" autocomplete="username" maxlength="32" />
              </div>
              <div class="form-row">
                <label>Email</label>
                <input v-model="profileForm.email" type="email" autocomplete="email" />
              </div>
              <div class="form-row">
                <label>Bio</label>
                <textarea v-model="profileForm.bio" rows="3" placeholder="Tell us about yourself…" maxlength="500"></textarea>
                <small class="field-hint">{{ (profileForm.bio || '').length }}/500</small>
              </div>
              <div class="form-row">
                <label>Status</label>
                <input v-model="profileForm.status" type="text" placeholder="What are you up to?" maxlength="200" />
                <small class="field-hint">{{ (profileForm.status || '').length }}/200</small>
              </div>
              <div class="form-row">
                <label>Avatar</label>
                <div class="avatar-upload-row">
                  <img :src="profileForm.avatar || '/avatars/default.svg'" class="avatar-preview" alt="current avatar" />
                  <div class="avatar-actions">
                    <label class="btn-sm btn-secondary avatar-upload-label">
                      Upload Image
                      <input type="file" accept="image/*" @change="uploadAvatar" hidden />
                    </label>
                    <p class="field-hint">Or visit the <router-link to="/help" class="inline-link">Help page</router-link> to generate an AI alpaca avatar.</p>
                  </div>
                </div>
              </div>

              <button type="submit" class="btn-primary" :disabled="savingProfile">
                {{ savingProfile ? 'Saving…' : 'Save Profile' }}
              </button>
            </form>
          </section>

          <section class="settings-section">
            <h3>Privacy</h3>
            <div class="toggle-row">
              <div>
                <span class="toggle-label">Public Profile</span>
                <p class="toggle-desc">Allow anyone to view your profile via the public API.</p>
              </div>
              <label class="switch">
                <input type="checkbox" v-model="profileForm.is_public" @change="saveProfile" />
                <span class="slider"></span>
              </label>
            </div>
          </section>

          <section class="settings-section">
            <h3>Change Password</h3>
            <form @submit.prevent="changePassword" class="settings-form">
              <!-- Hidden username for password managers + screen readers (Chromium a11y warning) -->
              <input
                type="text"
                :value="profileForm.username"
                autocomplete="username"
                aria-hidden="true"
                tabindex="-1"
                class="visually-hidden"
                readonly
              />
              <div class="form-row">
                <label>Current Password</label>
                <input v-model="pwForm.current" type="password" autocomplete="current-password" maxlength="50" />
              </div>
              <div class="form-row">
                <label>New Password</label>
                <input v-model="pwForm.newPw" type="password" autocomplete="new-password" maxlength="50" />
              </div>
              <div class="form-row">
                <label>Confirm New Password</label>
                <input v-model="pwForm.confirm" type="password" autocomplete="new-password" maxlength="50" />
              </div>
              <p v-if="pwError" class="field-error">{{ pwError }}</p>
              <button type="submit" class="btn-primary" :disabled="savingPw">
                {{ savingPw ? 'Updating…' : 'Update Password' }}
              </button>
            </form>
          </section>

          <section class="settings-section">
            <h3>Public API Key</h3>
            <p class="toggle-desc" style="margin-bottom:1rem">
              Use this key to access the <router-link to="/docs" class="inline-link">Public API</router-link>.
              Pass it as the <code>X-API-Key</code> header on every request.
            </p>
            <div v-if="apiKeyMsg" :class="['banner', apiKeyMsg.type]">{{ apiKeyMsg.text }}</div>
            <div v-if="currentApiKey" class="api-key-display">
              <code class="api-key-value">{{ revealKey ? currentApiKey : currentApiKey.slice(0, 6) + '••••••••••••••••••••' }}</code>
              <div class="api-key-actions">
                <button class="btn-sm btn-secondary" @click="revealKey = !revealKey">
                  {{ revealKey ? 'Hide' : 'Reveal' }}
                </button>
                <button class="btn-sm btn-secondary" @click="copyApiKey">Copy</button>
                <button class="btn-sm btn-danger" @click="revokeApiKey" :disabled="apiKeyLoading">Revoke</button>
              </div>
            </div>
            <div v-else class="api-key-empty">
              <p class="toggle-desc">No API key generated yet.</p>
            </div>
            <button class="btn-primary" style="margin-top:0.9rem" @click="generateApiKey" :disabled="apiKeyLoading">
              {{ apiKeyLoading ? 'Working…' : currentApiKey ? 'Regenerate Key' : 'Generate Key' }}
            </button>
          </section>

          <section class="settings-section danger-zone-container">
            <h3>My Data</h3>
            <div class="data-actions">
              <div class="data-row">
                <div>
                  <span class="toggle-label">Export My Data</span>
                  <p class="toggle-desc">Request a full export of your account data.</p>
                </div>
                <div class="export-controls">
                  <select v-model="exportFormat" class="fmt-select">
                    <option value="json">JSON</option>
                    <option value="csv">CSV</option>
                    <option value="xml">XML</option>
                  </select>
                  <button class="btn-sm btn-secondary" @click="requestExport" :disabled="requestingData">
                    {{ requestingData ? 'Wait…' : 'Export' }}
                  </button>
                </div>
              </div>
              <div class="data-row danger-zone">
                <div>
                  <span class="toggle-label danger-text">Delete Account</span>
                  <p class="toggle-desc">Permanently delete your account and all associated data. This cannot be undone.</p>
                </div>
                <button class="btn-sm btn-danger" @click="confirmDelete" :disabled="requestingData">
                  Delete
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'
import api from '../services/api.js'
import { devError } from '../services/logger.js'

const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()

// UI State
const activeTab = ref('overview') // 'overview' | 'settings'

// Profile Data State
const achievements = ref([])
const allAchievements = ref([])
const unlockedMap = ref({})
const userPosts = ref([])
const postsLoading = ref(true)

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
  (tab) => {
    activeTab.value = tab === 'settings' ? 'settings' : 'overview'
  },
  { immediate: true },
)

// Initialization
onMounted(async () => {
  // 1. Initialize Profile Form with Auth Store Data
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
  } catch (e) { devError(e) }

  // 3. Fetch Posts
  try {
    const { data } = await api.get(`/posts/user/${u?.id}?limit=10`)
    userPosts.value = data.posts || []
  } catch (e) { devError(e) } finally {
    postsLoading.value = false
  }

  // 4. Fetch API key status — backend returns { apiKey: null } when none exists,
  // so a thrown error here is a real failure, not "no key yet".
  try {
    const { data } = await api.get('/users/me/api-key')
    currentApiKey.value = data.apiKey || null
  } catch (e) { devError(e) }
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
/* ── Base Layout ── */
.profile-page {
  display: flex;
  justify-content: center;
  padding: 2rem 1rem;
}

.profile-card {
  background: var(--bg-secondary, #12121a);
  border: 1px solid var(--border-color, #2a2a3a);
  border-radius: 12px;
  width: 100%;
  max-width: 640px;
  overflow: hidden;
}

/* ── Profile Header ── */
.profile-banner {
  position: relative;
  height: 140px;
  background: linear-gradient(135deg, #0a2463 0%, #00f0ff 50%, #7b2ff7 100%);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.banner-gradient {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, var(--bg-secondary, #12121a) 0%, transparent 60%);
}

.avatar-wrapper {
  position: relative;
  transform: translateY(40px);
  z-index: 1;
}

.avatar {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid var(--bg-secondary, #12121a);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.online-indicator {
  position: absolute;
  bottom: 4px;
  right: 4px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid var(--bg-secondary, #12121a);
}
.online-indicator.online { background: #00ff88; }

.profile-body {
  padding: 3rem 2rem 2rem;
  text-align: center;
}

.profile-body h2 { margin: 0; color: var(--primary, #00f0ff); }
.status { color: #999; font-size: 0.9rem; }

/* ── Tabs ── */
.profile-tabs {
  display: flex;
  gap: 1rem;
  border-bottom: 1px solid var(--border-color, #2a2a3a);
  margin-bottom: 1.5rem;
}
.tab-btn {
  flex: 1;
  background: none; border: none;
  color: #888; font-size: 1rem; font-weight: 600;
  padding: 0.75rem; cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: color 0.2s, border-color 0.2s;
}
.tab-btn:hover { color: #fff; }
.tab-btn.active {
  color: var(--primary, #00f0ff);
  border-bottom-color: var(--primary, #00f0ff);
}
.tab-content { animation: fadeIn 0.3s ease; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }

/* ── Overview Tab Content ── */
.profile-info {
  display: flex; flex-direction: column; gap: 0.75rem;
  margin-bottom: 1rem; text-align: left;
}
.info-row {
  display: flex; justify-content: space-between;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--border-color, #2a2a3a);
}
.label { color: #999; font-weight: 500; }

.section-block { margin-top: 1.5rem; text-align: left; }
.section-block h3 {
  color: var(--primary, #00f0ff); font-size: 1rem;
  margin-bottom: 0.75rem; border-bottom: 1px solid var(--border-color, #2a2a3a);
  padding-bottom: 0.4rem;
}

.achievements-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 0.5rem;
}
.achievement-card {
  display: flex; flex-direction: column; align-items: center; gap: 0.2rem;
  padding: 0.6rem; background: var(--bg-tertiary, #1a1a2a);
  border: 1px solid var(--border-color, #2a2a3a); border-radius: 8px;
  opacity: 0.35; transition: opacity 0.2s;
}
.achievement-card.unlocked { opacity: 1; border-color: var(--primary, #00f0ff); box-shadow: 0 0 8px rgba(0, 240, 255, 0.15); }
.achievement-icon { font-size: 1.5rem; display: flex; align-items: center; justify-content: center; }
.achievement-icon-img {
  width: 36px;
  height: 36px;
  object-fit: contain;
  filter: saturate(0) brightness(0.5);
  transition: filter 0.2s;
}
.achievement-card.unlocked .achievement-icon-img {
  filter: none;
}
.achievement-name { font-size: 0.75rem; font-weight: 600; text-align: center; color: #ccc; }
.achievement-pts { font-size: 0.65rem; color: #4ade80; font-weight: 600; }

.mini-post {
  background: var(--bg-tertiary, #1a1a2a);
  border: 1px solid var(--border-color, #2a2a3a); border-radius: 8px;
  padding: 0.75rem; margin-bottom: 0.5rem; text-align: left;
}
.mini-post-content { margin: 0 0 0.5rem; font-size: 0.9rem; line-height: 1.4; white-space: pre-wrap; word-break: break-word; }
.mini-post-image { width: 100%; max-height: 200px; object-fit: cover; border-radius: 6px; margin-bottom: 0.5rem; }
.mini-post-footer { display: flex; justify-content: space-between; font-size: 0.75rem; color: #888; }
.empty-msg { color: #888; font-size: 0.9rem; font-style: italic; padding: 0.5rem 0; text-align: center; }

/* ── Settings Tab Content ── */
.settings-view { text-align: left; }
.settings-section {
  background: var(--bg-tertiary, #1a1a2a);
  border: 1px solid var(--border-color, #2a2a3a);
  border-radius: 10px; padding: 1.25rem; margin-bottom: 1.25rem;
}
.settings-section h3 { margin: 0 0 1rem; font-size: 1.05rem; color: var(--primary, #00f0ff); }

.settings-form { display: flex; flex-direction: column; gap: 0.85rem; }
.form-row { display: flex; flex-direction: column; gap: 0.3rem; }
.form-row label { font-size: 0.85rem; color: #999; }
.form-row input, .form-row textarea {
  padding: 0.5rem 0.75rem; background: var(--bg-secondary, #12121a);
  border: 1px solid var(--border-color, #2a2a3a); border-radius: 6px;
  color: inherit; font-family: inherit; resize: vertical; font-size: 0.9rem;
}
.form-row input:focus, .form-row textarea:focus { outline: none; border-color: var(--primary, #00f0ff); }

.avatar-upload-row { display: flex; align-items: center; gap: 1rem; }
.avatar-preview { width: 56px; height: 56px; border-radius: 50%; object-fit: cover; border: 2px solid var(--primary, #00f0ff); }
.avatar-actions { display: flex; flex-direction: column; gap: 0.4rem; }
.avatar-upload-label { cursor: pointer; display: inline-block; }
.field-hint { font-size: 0.8rem; color: #666; margin-top: 0.2rem; }
.field-error { font-size: 0.85rem; color: var(--danger, #ff006e); }
.inline-link { color: var(--primary, #00f0ff); text-decoration: none; }
.inline-link:hover { text-decoration: underline; }

.toggle-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; }
.toggle-label { font-weight: 500; font-size: 0.9rem; }
.toggle-desc  { font-size: 0.82rem; color: #666; margin: 0.2rem 0 0; }

.switch { position: relative; display: inline-block; width: 44px; height: 24px; flex-shrink: 0; margin-top: 2px; }
.switch input { opacity: 0; width: 0; height: 0; }
.slider { position: absolute; inset: 0; background: #333; border-radius: 24px; cursor: pointer; transition: background 0.2s; }
.slider::before { content: ''; position: absolute; width: 18px; height: 18px; left: 3px; bottom: 3px; background: #fff; border-radius: 50%; transition: transform 0.2s; }
.switch input:checked + .slider { background: var(--primary, #00f0ff); }
.switch input:checked + .slider::before { transform: translateX(20px); }

.data-actions { display: flex; flex-direction: column; gap: 1rem; }
.data-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; }
.export-controls { display: flex; gap: 0.5rem; align-items: center; flex-shrink: 0; }
.fmt-select {
  padding: 0.35rem 0.6rem; background: var(--bg-secondary, #12121a);
  border: 1px solid var(--border-color, #2a2a3a); border-radius: 5px; color: inherit; font-size: 0.85rem;
}
.danger-zone { border-top: 1px solid var(--border-color, #2a2a3a); padding-top: 1rem; }
.danger-text { color: var(--danger, #ff006e); }

/* Buttons & Banners */
.btn-primary {
  align-self: flex-start; padding: 0.5rem 1.1rem;
  background: var(--primary, #00f0ff); color: #0a0a0f;
  border: none; border-radius: 6px; cursor: pointer; font-weight: 600;
}
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-secondary {
  padding: 0.4rem 0.9rem; background: transparent; color: var(--primary, #00f0ff);
  border: 1px solid var(--primary, #00f0ff); border-radius: 6px; cursor: pointer; font-size: 0.85rem;
}
.btn-secondary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-danger {
  padding: 0.4rem 0.9rem; flex-shrink: 0; background: transparent; color: var(--danger, #ff006e);
  border: 1px solid var(--danger, #ff006e); border-radius: 6px; cursor: pointer; font-size: 0.85rem;
}
.btn-danger:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-danger:hover:not(:disabled) { background: rgba(255,0,110,0.1); }
.btn-sm { padding: 0.3rem 0.7rem; }

.banner { padding: 0.6rem 1rem; margin-bottom: 1rem; border-radius: 6px; font-size: 0.9rem; text-align: center; }
.banner.success { background: rgba(0,255,136,0.1); border: 1px solid var(--success, #00ff88); color: var(--success, #00ff88); }
.banner.error   { background: rgba(255,0,110,0.1); border: 1px solid var(--danger, #ff006e); color: var(--danger, #ff006e); }

/* ── API Key ── */
.api-key-display { display: flex; flex-direction: column; gap: 0.6rem; }
.api-key-value {
  display: block; padding: 0.55rem 0.8rem;
  background: var(--bg-secondary, #12121a); border: 1px solid var(--border-color, #2a2a3a);
  border-radius: 6px; font-family: monospace; font-size: 0.85rem;
  word-break: break-all; color: var(--primary, #00f0ff);
}
.api-key-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
.api-key-empty { padding: 0.5rem 0; }

/* a11y helper — visually hidden but exposed to screen readers + autofill */
.visually-hidden {
  position: absolute;
  width: 1px; height: 1px;
  padding: 0; margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>