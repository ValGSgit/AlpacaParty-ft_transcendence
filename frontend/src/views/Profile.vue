<!--
  Profile View — current user's profile page
  @owner fankahou, LukasStefanek
  @issue https://github.com/ValGSgit/Cleanscendence/issues/9
-->
<template>
  <div class="profile-page">
    <div class="profile-card" v-if="authStore.user">
      <div class="profile-header">
        <img :src="authStore.user.avatar" alt="avatar" class="avatar" />
        <h2>{{ authStore.user.username }}</h2>
        <span class="status">{{ authStore.user.status }}</span>
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
          <span class="label">Joined</span>
          <span>{{ new Date(authStore.user.created_at).toLocaleDateString() }}</span>
        </div>
      </div>

      <!-- TODO: Add profile-edit form, avatar upload, password change -->
    </div>
  </div>
</template>

<script setup>
import { useAuthStore } from '../stores/auth.js'

const authStore = useAuthStore()
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

.profile-info {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
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
</style>
