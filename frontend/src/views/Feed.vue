<!--
  Feed View — Social posts feed with create, like, and comment
  @owner ValGSgit
-->
<template>
  <div class="feed-page">
    <h1>Feed</h1>

    <!-- Create Post -->
    <div class="create-post" v-if="authStore.isAuthenticated">
      <form @submit.prevent="createPost">
        <textarea v-model="newPostContent" placeholder="What's on your mind?" rows="3" maxlength="2000"></textarea>
        <div class="create-post-actions">
          <label class="upload-btn" title="Add image">
            📷 Add Image
            <input type="file" accept="image/*" @change="selectImage" hidden />
          </label>
          <span v-if="selectedImage" class="selected-file">{{ selectedImage.name }}</span>
          <button type="submit" class="btn-primary" :disabled="!newPostContent.trim() || posting">
            {{ posting ? 'Posting…' : 'Post' }}
          </button>
        </div>
        <!-- Upload progress -->
        <div v-if="uploadProgress > 0 && uploadProgress < 100" class="upload-progress">
          <div class="upload-progress-bar" :style="{ width: uploadProgress + '%' }"></div>
          <span class="upload-progress-label">Uploading… {{ uploadProgress }}%</span>
        </div>
      </form>
    </div>

    <div v-if="error" class="error-banner">{{ error }}</div>

    <!-- Posts -->
    <div v-if="loading" class="loading">Loading posts…</div>
    <div v-else-if="!posts.length" class="empty">No posts yet. Be the first to share something!</div>

    <div v-for="post in posts" :key="post.id" class="post-card">
      <div class="post-header">
        <router-link :to="`/user/${post.author_id}`" class="post-author">
          <img :src="post.author_avatar || '/avatars/default.svg'" class="post-avatar" alt="" />
          <span>{{ post.author_username }}</span>
        </router-link>
        <span class="post-time">{{ formatTime(post.created_at) }}</span>
      </div>
      <p class="post-content">{{ post.content }}</p>
      <img
        v-if="post.image_url"
        :src="resolveMediaUrl(post.image_url)"
        class="post-image"
        alt="post image"
        @error="onPostImageError"
      />
      <div class="post-actions">
        <button class="action-btn" :class="{ liked: post.user_liked }" @click="toggleLike(post)">
          {{ post.user_liked ? '❤️' : '🤍' }} {{ post.likes_count || 0 }}
        </button>
        <button v-if="post.author_id === authStore.user?.id" class="action-btn delete-btn" @click="deletePost(post.id)">
          🗑️ Delete
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth.js'
import api from '../services/api.js'

const authStore = useAuthStore()
const posts = ref([])
const loading = ref(true)
const posting = ref(false)
const error = ref(null)
const newPostContent = ref('')
const selectedImage = ref(null)
const uploadProgress = ref(0)

function formatTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  const now = new Date()
  const diff = now - d
  if (diff < 60000) return 'just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return d.toLocaleDateString()
}

function resolveMediaUrl(url) {
  if (!url) return ''
  if (/^https?:\/\//i.test(url)) return url
  return url.startsWith('/') ? url : `/${url}`
}

function onPostImageError(event) {
  event.target.src = '/avatars/default.svg'
}

async function fetchPosts() {
  loading.value = true
  error.value = null
  try {
    const { data } = await api.get('/posts')
    posts.value = data.posts || []
  } catch (e) {
    error.value = 'Failed to load posts'
  } finally {
    loading.value = false
  }
}

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024 // 10 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

function selectImage(event) {
  const file = event.target.files?.[0] || null
  if (file) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      error.value = 'Only JPEG, PNG, GIF, and WebP images are allowed'
      event.target.value = ''
      return
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      error.value = `Image is too large (max 10 MB). Your file: ${(file.size / 1024 / 1024).toFixed(1)} MB`
      event.target.value = ''
      return
    }
  }
  selectedImage.value = file
  error.value = null
}

async function createPost() {
  if (!newPostContent.value.trim()) return
  posting.value = true
  error.value = null
  uploadProgress.value = 0
  try {
    let imageUrl = null
    if (selectedImage.value) {
      const formData = new FormData()
      formData.append('files', selectedImage.value)
      const uploadRes = await api.post('/uploads', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress(evt) {
          if (evt.total) uploadProgress.value = Math.round((evt.loaded / evt.total) * 100)
        },
      })
      imageUrl = uploadRes.data.files?.[0]?.url
      if (!imageUrl) {
        error.value = 'Image upload failed — try a smaller file or different format'
        return
      }
    }
    await api.post('/posts', {
      content: newPostContent.value.trim(),
      imageUrl,
    })
    newPostContent.value = ''
    selectedImage.value = null
    uploadProgress.value = 0
    await fetchPosts()
  } catch (e) {
    const status = e.response?.status
    if (status === 413) {
      error.value = 'Image is too large — please use a file under 10 MB'
    } else {
      error.value = e.response?.data?.error?.message || 'Failed to create post'
    }
    uploadProgress.value = 0
  } finally {
    posting.value = false
  }
}

async function toggleLike(post) {
  try {
    if (post.user_liked) {
      await api.delete(`/posts/${post.id}/like`)
      post.user_liked = false
      post.likes_count = Math.max(0, (post.likes_count || 1) - 1)
    } else {
      await api.post(`/posts/${post.id}/like`)
      post.user_liked = true
      post.likes_count = (post.likes_count || 0) + 1
    }
  } catch {}
}

async function deletePost(postId) {
  if (!confirm('Delete this post?')) return
  try {
    await api.delete(`/posts/${postId}`)
    posts.value = posts.value.filter(p => p.id !== postId)
  } catch (e) {
    error.value = 'Failed to delete post'
  }
}

onMounted(fetchPosts)
</script>

<style scoped>
.feed-page {
  max-width: 640px;
  margin: 0 auto;
  padding: 1.5rem 1rem;
}

.feed-page h1 {
  margin-bottom: 1.5rem;
}

.create-post {
  background: var(--bg-secondary, #12121a);
  border: 1px solid var(--border-color, #2a2a3a);
  border-radius: 12px;
  padding: 1rem;
  margin-bottom: 1.5rem;
}

.create-post textarea {
  width: 100%;
  background: var(--bg-tertiary, #1a1a2a);
  border: 1px solid var(--border-color, #2a2a3a);
  border-radius: 8px;
  padding: 0.75rem;
  color: inherit;
  font-size: 0.95rem;
  resize: vertical;
}

.create-post-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.75rem;
}

.upload-btn {
  font-size: 0.85rem;
  color: var(--primary, #00f0ff);
  cursor: pointer;
}

.selected-file {
  font-size: 0.8rem;
  color: #999;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.btn-primary {
  padding: 0.5rem 1.25rem;
  background: var(--primary, #00f0ff);
  color: #000;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  margin-left: auto;
}

.btn-primary:disabled { opacity: 0.5; }

.upload-progress {
  margin-top: 0.5rem;
  position: relative;
  height: 6px;
  background: var(--bg-tertiary, #1a1a2a);
  border-radius: 3px;
  overflow: hidden;
}
.upload-progress-bar {
  height: 100%;
  background: var(--primary, #00f0ff);
  border-radius: 3px;
  transition: width 0.2s;
}
.upload-progress-label {
  position: absolute;
  top: 8px;
  left: 0;
  font-size: 0.75rem;
  color: var(--text-secondary, #a0a0b0);
}

.loading, .empty {
  text-align: center;
  padding: 2rem;
  color: #999;
}

.error-banner {
  background: rgba(255, 80, 80, 0.15);
  color: #ff5050;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  margin-bottom: 1rem;
}

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
  margin-bottom: 0.75rem;
}

.post-author {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none;
  color: var(--primary, #00f0ff);
  font-weight: 500;
}

.post-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
}

.post-time {
  font-size: 0.8rem;
  color: #666;
}

.post-content {
  margin: 0 0 0.75rem;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}

.post-image {
  width: 100%;
  max-height: 400px;
  object-fit: cover;
  border-radius: 8px;
  margin-bottom: 0.75rem;
}

.post-actions {
  display: flex;
  gap: 1rem;
}

.action-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #999;
  font-size: 0.9rem;
  padding: 0.3rem 0.5rem;
  border-radius: 6px;
}

.action-btn:hover { background: var(--bg-tertiary, #1a1a2a); }
.action-btn.liked { color: #ff5050; }
.delete-btn { color: #ff5050; }
</style>
