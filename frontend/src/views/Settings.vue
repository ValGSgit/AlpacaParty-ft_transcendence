<!--
  Settings View — profile edit, password change, privacy, data management
  @owner fankahou
-->
<template>
  <div class="settings-page">
    <h1>Settings</h1>

    <div v-if="globalMsg" :class="['banner', globalMsg.type]">{{ globalMsg.text }}</div>

    <!-- ── Profile ── -->
    <section class="settings-section">
      <h2>Profile</h2>
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
              <label class="btn-secondary avatar-upload-label">
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

    <!-- ── Privacy ── -->
    <section class="settings-section">
      <h2>Privacy</h2>
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

    <!-- ── Password ── -->
    <section class="settings-section">
      <h2>Change Password</h2>
      <form @submit.prevent="changePassword" class="settings-form">
        <div class="form-row">
          <label>Current Password</label>
          <input v-model="pwForm.current" type="password" autocomplete="current-password" />
        </div>
        <div class="form-row">
          <label>New Password</label>
          <input v-model="pwForm.newPw" type="password" autocomplete="new-password" />
        </div>
        <div class="form-row">
          <label>Confirm New Password</label>
          <input v-model="pwForm.confirm" type="password" autocomplete="new-password" />
        </div>
        <p v-if="pwError" class="field-error">{{ pwError }}</p>
        <button type="submit" class="btn-primary" :disabled="savingPw">
          {{ savingPw ? 'Updating…' : 'Update Password' }}
        </button>
      </form>
    </section>

    <!-- ── Data ── -->
    <section class="settings-section">
      <h2>My Data</h2>
      <div class="data-actions">
        <div class="data-row">
          <div>
            <span class="toggle-label">Export My Data</span>
            <p class="toggle-desc">Request a full export of your account data (JSON/CSV/XML).</p>
          </div>
          <div class="export-controls">
            <select v-model="exportFormat" class="fmt-select">
              <option value="json">JSON</option>
              <option value="csv">CSV</option>
              <option value="xml">XML</option>
            </select>
            <button class="btn-secondary" @click="requestExport" :disabled="requestingData">
              {{ requestingData ? 'Requesting…' : 'Request Export' }}
            </button>
          </div>
        </div>
        <div class="data-row danger-zone">
          <div>
            <span class="toggle-label danger-text">Delete Account</span>
            <p class="toggle-desc">Permanently delete your account and all associated data. This cannot be undone.</p>
          </div>
          <button class="btn-danger" @click="confirmDelete" :disabled="requestingData">
            Delete Account
          </button>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'
import api from '../services/api.js'

const authStore = useAuthStore()
const router    = useRouter()

const globalMsg     = ref(null)
const savingProfile = ref(false)
const savingPw      = ref(false)
const requestingData = ref(false)
const pwError       = ref(null)
const exportFormat  = ref('json')

const profileForm = ref({
  username: '',
  email: '',
  bio: '',
  status: '',
  avatar: '',
  is_public: false,
})

const pwForm = ref({
  current: '',
  newPw: '',
  confirm: '',
})

function flash(text, type = 'success') {
  globalMsg.value = { text, type }
  setTimeout(() => { globalMsg.value = null }, 4000)
}

async function uploadAvatar(event) {
  const file = event.target.files?.[0]
  if (!file) return
  const formData = new FormData()
  formData.append('files', file)
  try {
    const { data } = await api.post('/uploads', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
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

onMounted(() => {
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
})

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
    await router.push('/login')
  } catch (e) {
    flash(e.response?.data?.error?.message || 'Failed to delete account.', 'error')
  } finally {
    requestingData.value = false
  }
}
</script>

<style scoped>
.settings-page { max-width: 620px; margin: 0 auto; }
h1 { margin-bottom: 1.5rem; color: var(--primary, #00f0ff); }
h2 { font-size: 1.1rem; color: var(--primary, #00f0ff); margin: 0 0 1rem; }

.settings-section {
  background: var(--bg-secondary, #12121a);
  border: 1px solid var(--border-color, #2a2a3a);
  border-radius: 10px; padding: 1.25rem; margin-bottom: 1.25rem;
}

.settings-form { display: flex; flex-direction: column; gap: 0.85rem; }
.form-row { display: flex; flex-direction: column; gap: 0.3rem; }
.form-row label { font-size: 0.85rem; color: #999; }
.form-row input, .form-row textarea {
  padding: 0.5rem 0.75rem;
  background: var(--bg-tertiary, #1a1a2a);
  border: 1px solid var(--border-color, #2a2a3a);
  border-radius: 6px; color: inherit; font-family: inherit; resize: vertical;
}
.form-row input:focus, .form-row textarea:focus { outline: none; border-color: var(--primary, #00f0ff); }
.preview-row { flex-direction: row; align-items: center; gap: 1rem; }
.avatar-preview { width: 56px; height: 56px; border-radius: 50%; object-fit: cover; border: 2px solid var(--primary, #00f0ff); }

.avatar-upload-row { display: flex; align-items: center; gap: 1rem; }
.avatar-actions { display: flex; flex-direction: column; gap: 0.4rem; }
.avatar-upload-label { cursor: pointer; display: inline-block; }
.generate-row { display: flex; gap: 0.5rem; }
.generate-row input { flex: 1; }
.field-hint { font-size: 0.8rem; color: #666; margin-top: 0.2rem; }
.inline-link { color: var(--primary, #00f0ff); text-decoration: none; }
.inline-link:hover { text-decoration: underline; }

.toggle-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; }
.toggle-label { font-weight: 500; }
.toggle-desc  { font-size: 0.82rem; color: #666; margin: 0.2rem 0 0; }

/* Toggle switch */
.switch { position: relative; display: inline-block; width: 44px; height: 24px; flex-shrink: 0; margin-top: 2px; }
.switch input { opacity: 0; width: 0; height: 0; }
.slider {
  position: absolute; inset: 0; background: #333; border-radius: 24px; cursor: pointer;
  transition: background 0.2s;
}
.slider::before {
  content: ''; position: absolute; width: 18px; height: 18px; left: 3px; bottom: 3px;
  background: #fff; border-radius: 50%; transition: transform 0.2s;
}
.switch input:checked + .slider { background: var(--primary, #00f0ff); }
.switch input:checked + .slider::before { transform: translateX(20px); }

.data-actions { display: flex; flex-direction: column; gap: 1rem; }
.data-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; }
.export-controls { display: flex; gap: 0.5rem; align-items: flex-start; flex-shrink: 0; }
.fmt-select {
  padding: 0.35rem 0.6rem;
  background: var(--bg-tertiary, #1a1a2a);
  border: 1px solid var(--border-color, #2a2a3a);
  border-radius: 5px; color: inherit;
}
.danger-zone { border-top: 1px solid var(--border-color, #2a2a3a); padding-top: 1rem; }
.danger-text { color: var(--danger, #ff006e); }

.field-error { font-size: 0.85rem; color: var(--danger, #ff006e); }

.btn-primary {
  align-self: flex-start; padding: 0.45rem 1.1rem;
  background: var(--primary, #00f0ff); color: #0a0a0f;
  border: none; border-radius: 6px; cursor: pointer; font-weight: 600;
}
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-secondary {
  padding: 0.4rem 0.9rem;
  background: transparent; color: var(--primary, #00f0ff);
  border: 1px solid var(--primary, #00f0ff); border-radius: 6px; cursor: pointer;
}
.btn-secondary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-danger {
  padding: 0.4rem 0.9rem; flex-shrink: 0;
  background: transparent; color: var(--danger, #ff006e);
  border: 1px solid var(--danger, #ff006e); border-radius: 6px; cursor: pointer;
}
.btn-danger:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-danger:hover { background: rgba(255,0,110,0.1); }

.banner {
  padding: 0.6rem 1rem; margin-bottom: 1rem; border-radius: 6px; font-size: 0.9rem;
}
.banner.success { background: rgba(0,255,136,0.1); border: 1px solid var(--success, #00ff88); color: var(--success, #00ff88); }
.banner.error   { background: rgba(255,0,110,0.1);  border: 1px solid var(--danger, #ff006e);  color: var(--danger, #ff006e); }
</style>
