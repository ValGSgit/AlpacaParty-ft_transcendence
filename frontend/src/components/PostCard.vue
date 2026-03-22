<!--
  PostCard — reusable social post card
  Usage: <PostCard :post="p" :current-user-id="authStore.user?.id" @like="onLike" @delete="onDelete" />
-->
<template>
  <div class="post-card">
    <div class="post-header">
      <router-link :to="`/user/${post.author_id}`" class="post-author">
        <UserAvatar :src="post.author_avatar" size="sm" />
        <span>{{ post.author_username }}</span>
      </router-link>
      <span class="post-time">{{ formatTime(post.created_at) }}</span>
    </div>
    <p class="post-content">{{ post.content }}</p>
    <img
      v-if="post.image_url"
      :src="resolveUrl(post.image_url)"
      class="post-image"
      alt="post image"
      @error="onImgError"
    />
    <div class="post-actions">
      <button :class="['action-btn', { liked: post.user_liked }]" @click="$emit('like', post)">
        {{ post.user_liked ? '❤️' : '🤍' }} {{ post.likes_count || 0 }}
      </button>
      <button
        v-if="post.author_id === currentUserId"
        class="action-btn delete-btn"
        @click="$emit('delete', post.id)"
      >🗑️ Delete</button>
    </div>
  </div>
</template>

<script setup>
import UserAvatar from './UserAvatar.vue'

defineProps({
  post: { type: Object, required: true },
  currentUserId: { type: Number, default: null },
})
defineEmits(['like', 'delete'])

function formatTime(ts) {
  if (!ts) return ''
  const diff = Date.now() - new Date(ts)
  if (diff < 60000) return 'just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return new Date(ts).toLocaleDateString()
}
function resolveUrl(url) {
  if (!url) return ''
  if (/^https?:\/\//i.test(url)) return url
  return url.startsWith('/') ? url : `/${url}`
}
function onImgError(e) { e.target.src = '/avatars/default.svg' }
</script>

<style scoped>
.post-card {
  background: var(--bg-secondary, #12121a);
  border: 1px solid var(--border-color, #2a2a3a);
  border-radius: 12px;
  padding: 1rem;
  margin-bottom: 1rem;
}
.post-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.6rem;
}
.post-author {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none;
  color: var(--text-primary, #e8e8f0);
  font-weight: 500;
}
.post-author:hover { color: var(--primary, #00f0ff); }
.post-time { font-size: 0.8rem; color: var(--text-secondary, #a0a0b0); }
.post-content { margin-bottom: 0.75rem; line-height: 1.5; white-space: pre-wrap; word-break: break-word; }
.post-image { width: 100%; max-height: 400px; object-fit: cover; border-radius: 8px; margin-bottom: 0.75rem; display: block; }
.post-actions { display: flex; gap: 0.75rem; }
.action-btn { background: none; border: none; cursor: pointer; font-size: 0.9rem; color: var(--text-secondary, #a0a0b0); padding: 0.3rem 0.5rem; border-radius: 6px; transition: background 0.15s; }
.action-btn:hover { background: var(--bg-tertiary, #1a1a2a); }
.action-btn.liked { color: #ff5088; }
.delete-btn:hover { color: var(--danger, #ff006e); }
</style>
