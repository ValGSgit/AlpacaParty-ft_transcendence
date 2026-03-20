<!--
  UserCard — compact user card for lists, friend requests, search results
  Usage: <UserCard :user="u" @action="onAction" action-label="Add Friend" />
-->
<template>
  <div class="user-card">
    <router-link :to="`/user/${user.id}`" class="user-card-link">
      <UserAvatar :src="user.avatar" size="md" :online="user.is_online" :show-online="showOnline" />
      <div class="user-info">
        <span class="username">{{ user.username }}</span>
        <span v-if="user.bio" class="bio">{{ user.bio }}</span>
        <div class="user-meta">
          <span v-if="showLevel" class="level">Lv {{ user.level || 1 }}</span>
          <span v-if="user.is_online && showOnline" class="online-text">Online</span>
        </div>
      </div>
    </router-link>
    <div v-if="$slots.actions || actionLabel" class="user-card-actions">
      <slot name="actions">
        <button v-if="actionLabel" class="action-btn" @click="$emit('action', user)">
          {{ actionLabel }}
        </button>
      </slot>
    </div>
  </div>
</template>

<script setup>
import UserAvatar from './UserAvatar.vue'

defineProps({
  user: { type: Object, required: true },
  actionLabel: { type: String, default: '' },
  showOnline: { type: Boolean, default: false },
  showLevel: { type: Boolean, default: false },
})
defineEmits(['action'])
</script>

<style scoped>
.user-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.65rem 1rem;
  border-bottom: 1px solid var(--border-color, #2a2a3a);
  transition: background 0.15s;
}
.user-card:hover { background: var(--bg-tertiary, #1a1a2a); }
.user-card-link {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  text-decoration: none;
  color: inherit;
  flex: 1;
  overflow: hidden;
}
.user-info { display: flex; flex-direction: column; overflow: hidden; }
.username { font-weight: 500; font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.bio { font-size: 0.78rem; color: var(--text-secondary, #a0a0b0); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.user-meta { display: flex; gap: 0.5rem; margin-top: 0.15rem; }
.level { font-size: 0.72rem; color: var(--primary, #00f0ff); font-weight: 600; }
.online-text { font-size: 0.72rem; color: var(--success, #00ff88); }
.user-card-actions { flex-shrink: 0; }
.action-btn { padding: 0.3rem 0.7rem; border-radius: 5px; border: 1px solid var(--border-color, #2a2a3a); background: transparent; color: inherit; cursor: pointer; font-size: 0.82rem; transition: background 0.15s, color 0.15s; }
.action-btn:hover { background: var(--primary, #00f0ff); color: #0a0a0f; border-color: transparent; }
</style>
