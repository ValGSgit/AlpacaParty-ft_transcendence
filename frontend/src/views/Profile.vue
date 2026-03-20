<!--
  Profile View — current user's profile page with edit, avatar upload, stats
  @owner fankahou, LukasStefanek
  @issue https://github.com/ValGSgit/AlpacaParty/issues/9
-->
<template>
  <div class="profile-page">
    <div class="profile-card" v-if="authStore.user">
      <div class="profile-header">
        <div class="avatar-wrapper">
          <img :src="authStore.user.avatar || '/avatars/default.svg'" alt="avatar" class="avatar" />
        </div>
        <h2>{{ authStore.user.username }}</h2>
        <span class="status">{{ authStore.user.status || 'No status set' }}</span>
      </div>

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
          <span>💰 {{ authStore.user.coins ?? 0 }}</span>
        </div>
        <div class="info-row">
          <span class="label">Joined</span>
          <span>{{ new Date(authStore.user.created_at).toLocaleDateString() }}</span>
        </div>
      </div>

      <button class="btn-edit" @click="editing = !editing">
        {{ editing ? 'Cancel' : '✏️ Edit Profile' }}
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
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useAuthStore } from '../stores/auth.js'

const authStore = useAuthStore()
const editing = ref(false)
const saving = ref(false)
const editMsg = ref(null)

const form = ref({
  bio: authStore.user?.bio || '',
  status: authStore.user?.status || '',
})

const xpPercent = computed(() => {
  const xp = authStore.user?.xp || 0
  const threshold = 100 // XP per level
  return Math.min((xp % threshold) / threshold * 100, 100)
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
  padding: 2rem;
  width: 100%;
  max-width: 560px;
}

.profile-header {
  text-align: center;
  margin-bottom: 1.5rem;
}

.avatar-wrapper { position: relative; display: inline-block; }

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

.status {
  color: #999;
  font-size: 0.9rem;
}

.xp-section {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
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

.btn-primary:disabled {
  opacity: 0.5;
}

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
</style>
