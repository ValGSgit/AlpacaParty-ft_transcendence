<!--
  Profile View — current user's profile page with edit, avatar upload, stats
  @owner fankahou, LukasStefanek
  @issue https://github.com/ValGSgit/AlpacaParty/issues/9
-->
<template>
  <div class="profile-page">
    <div class="profile-card" v-if="authStore.user">
      <!-- Profile Banner -->
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

        <!-- Level & XP bar -->
        <div class="xp-section">
          <div class="level-badge">Level {{ authStore.user.level || 1 }}</div>
          <div class="xp-bar">
            <div class="xp-fill" :style="{ width: xpPercent + '%' }"></div>
          </div>
          <span class="xp-text">{{ authStore.user.xp || 0 }} XP</span>
        </div>

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

        <button class="btn-edit" @click="editing = !editing">
          {{ editing ? 'Cancel' : 'Edit Profile' }}
        </button>

        <!-- Edit form -->
        <form v-if="editing" class="edit-form" @submit.prevent="saveProfile">
          <div v-if="editMsg" :class="['edit-banner', editMsg.type]">{{ editMsg.text }}</div>
          <div class="form-row">
            <label>Bio</label>
            <textarea v-model="form.bio" rows="2" placeholder="Tell us about yourself…"></textarea>
          </div>
          <div class="form-row">
            <label>Status</label>
            <input v-model="form.status" type="text" placeholder="What are you up to?" />
          </div>
          <button type="submit" class="btn-primary" :disabled="saving">
            {{ saving ? 'Saving…' : 'Save Changes' }}
          </button>
        </form>

        <!-- Achievements -->
        <section class="section-block" v-if="achievements.length || allAchievements.length">
          <h3>Achievements</h3>
          <div class="achievements-grid" v-if="allAchievements.length">
            <div
              v-for="a in allAchievements"
              :key="a.id"
              class="achievement-card"
              :class="{ unlocked: unlockedMap[a.id] }"
              :title="a.description + (unlockedMap[a.id] ? ' (Unlocked)' : ' (Locked)')"
            >
              <span class="achievement-icon">{{ a.icon || '🏆' }}</span>
              <span class="achievement-name">{{ a.name }}</span>
              <span class="achievement-pts">{{ a.points }} pts</span>
            </div>
          </div>
          <div v-else-if="achievements.length" class="achievements-grid">
            <div v-for="a in achievements" :key="a.id" class="achievement-card unlocked">
              <span class="achievement-icon">{{ a.icon || '🏆' }}</span>
              <span class="achievement-name">{{ a.name }}</span>
              <span class="achievement-pts">{{ a.points }} pts</span>
            </div>
          </div>
          <p v-if="!allAchievements.length && !achievements.length" class="empty-msg">No achievements yet.</p>
        </section>

        <!-- User Posts -->
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
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth.js'
import api from '../services/api.js'

const authStore = useAuthStore()
const editing = ref(false)
const saving = ref(false)
const editMsg = ref(null)
const achievements = ref([])
const allAchievements = ref([])
const unlockedMap = ref({})
const userPosts = ref([])
const postsLoading = ref(true)

const form = ref({
  bio: authStore.user?.bio || '',
  status: authStore.user?.status || '',
})

function formatDate(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`
}

const xpPercent = computed(() => {
  const xp = authStore.user?.xp || 0
  const threshold = 100
  return Math.min((xp % threshold) / threshold * 100, 100)
})

onMounted(async () => {
  // Fetch achievements
  try {
    const { data } = await api.get('/game/achievements')
    const all = data.achievements || []
    allAchievements.value = all
    achievements.value = all.filter(a => a.unlocked)
    const map = {}
    for (const a of achievements.value) {
      map[a.id] = true
    }
    unlockedMap.value = map
  } catch {}

  // Fetch user posts
  try {
    const { data } = await api.get(`/posts/user/${authStore.user?.id}?limit=10`)
    userPosts.value = data.posts || []
  } catch {} finally {
    postsLoading.value = false
  }
})

async function saveProfile() {
  saving.value = true
  editMsg.value = null
  try {
    await authStore.updateProfile(form.value)
    editMsg.value = { text: 'Profile updated!', type: 'success' }
    editing.value = false
  } catch (e) {
    editMsg.value = { text: e.response?.data?.error?.message || 'Failed to update', type: 'error' }
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
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

.profile-body h2 {
  margin: 0;
  color: var(--primary, #00f0ff);
}

.status {
  color: #999;
  font-size: 0.9rem;
}

.xp-section {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 1.25rem 0;
  padding: 0.5rem 0;
}

.level-badge {
  background: var(--primary, #00f0ff);
  color: #000;
  font-weight: 700;
  padding: 0.2rem 0.6rem;
  border-radius: 12px;
  font-size: 0.8rem;
  white-space: nowrap;
}

.xp-bar {
  flex: 1;
  height: 8px;
  background: var(--bg-tertiary, #1a1a2a);
  border-radius: 4px;
  overflow: hidden;
}

.xp-fill {
  height: 100%;
  background: var(--primary, #00f0ff);
  transition: width 0.3s;
}

.xp-text {
  font-size: 0.8rem;
  color: #999;
  white-space: nowrap;
}

.profile-info {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1rem;
  text-align: left;
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

.btn-edit {
  width: 100%;
  padding: 0.6rem;
  background: var(--bg-tertiary, #1a1a2a);
  border: 1px solid var(--border-color, #2a2a3a);
  border-radius: 8px;
  color: var(--primary, #00f0ff);
  cursor: pointer;
  font-size: 0.9rem;
  margin-bottom: 1rem;
}

.edit-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  text-align: left;
}

.form-row {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.form-row label {
  font-size: 0.85rem;
  color: #999;
}

.form-row input,
.form-row textarea {
  padding: 0.5rem;
  background: var(--bg-tertiary, #1a1a2a);
  border: 1px solid var(--border-color, #2a2a3a);
  border-radius: 6px;
  color: inherit;
  font-size: 0.9rem;
}

.btn-primary {
  padding: 0.6rem;
  background: var(--primary, #00f0ff);
  color: #000;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
}

.btn-primary:disabled { opacity: 0.5; }

.edit-banner {
  padding: 0.5rem;
  border-radius: 6px;
  font-size: 0.85rem;
  text-align: center;
}

.edit-banner.success {
  background: rgba(0, 200, 100, 0.15);
  color: #00c864;
}

.edit-banner.error {
  background: rgba(255, 80, 80, 0.15);
  color: #ff5050;
}

/* Achievements */
.section-block {
  margin-top: 1.5rem;
  text-align: left;
}

.section-block h3 {
  color: var(--primary, #00f0ff);
  font-size: 1rem;
  margin-bottom: 0.75rem;
  border-bottom: 1px solid var(--border-color, #2a2a3a);
  padding-bottom: 0.4rem;
}

.achievements-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 0.5rem;
}

.achievement-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
  padding: 0.6rem;
  background: var(--bg-tertiary, #1a1a2a);
  border: 1px solid var(--border-color, #2a2a3a);
  border-radius: 8px;
  opacity: 0.35;
  transition: opacity 0.2s;
}

.achievement-card.unlocked {
  opacity: 1;
  border-color: var(--primary, #00f0ff);
}

.achievement-icon { font-size: 1.5rem; }

.achievement-name {
  font-size: 0.75rem;
  font-weight: 600;
  text-align: center;
  color: #ccc;
}

.achievement-pts {
  font-size: 0.65rem;
  color: #888;
}

/* Posts */
.mini-post {
  background: var(--bg-tertiary, #1a1a2a);
  border: 1px solid var(--border-color, #2a2a3a);
  border-radius: 8px;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
}

.mini-post-content {
  margin: 0 0 0.5rem;
  font-size: 0.9rem;
  line-height: 1.4;
  white-space: pre-wrap;
  word-break: break-word;
}

.mini-post-image {
  width: 100%;
  max-height: 200px;
  object-fit: cover;
  border-radius: 6px;
  margin-bottom: 0.5rem;
}

.mini-post-footer {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: #888;
}

.empty-msg {
  color: #888;
  font-size: 0.9rem;
  font-style: italic;
  padding: 0.5rem 0;
}
</style>
