<!--
  Feed View — Social posts feed with create, like, comment and repost
  @owner ValGSgit
-->
<template>
  <div class="feed-layout">
    <!-- Left sidebar: fake ad -->
    <aside class="feed-sidebar">
      <FakeAd :sidebar="true" />
    </aside>

    <!-- Centre: feed -->
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
      <!-- Repost header (if this card is a repost) -->
      <div v-if="post._repostBy" class="repost-header">
        🔁 <router-link :to="`/user/${post._repostById}`">{{ post._repostBy }}</router-link> reposted
        <span v-if="post._repostComment" class="repost-quote">{{ post._repostComment }}</span>
      </div>

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
        <!-- Like -->
        <button class="action-btn" :class="{ liked: post.user_liked }" @click="toggleLike(post)">
          {{ post.user_liked ? '❤️' : '🤍' }} {{ post.likes_count || 0 }}
        </button>

        <!-- Comment toggle -->
        <button class="action-btn" :class="{ active: commentsOpen.has(post.id) }" @click="toggleComments(post)">
          💬 {{ post.comments_count || 0 }}
        </button>

        <!-- Repost -->
        <button
          v-if="authStore.isAuthenticated"
          class="action-btn"
          :class="{ reposted: post.user_reposted }"
          @click="openRepostModal(post)"
        >
          🔁 {{ post.reposts_count || 0 }}
        </button>

        <!-- Delete (author only) -->
        <button v-if="post.author_id === authStore.user?.id" class="action-btn delete-btn" @click="deletePost(post.id)">
          🗑️ Delete
        </button>
      </div>

      <!-- Comment Section -->
      <div v-if="commentsOpen.has(post.id)" class="comment-section">
        <div v-if="commentLoading.has(post.id)" class="comment-loading">Loading…</div>
        <div v-else>
          <div v-if="!(postComments[post.id]?.length)" class="no-comments">No comments yet.</div>
          <div v-for="c in (postComments[post.id] || [])" :key="c.id" class="comment">
            <router-link :to="`/user/${c.author_id}`" class="comment-author">
              <img :src="c.author_avatar || '/avatars/default.svg'" class="comment-avatar" alt="" />
              <strong>{{ c.author_username }}</strong>
            </router-link>
            <span class="comment-time">{{ formatTime(c.created_at) }}</span>
            <p class="comment-content">{{ c.content }}</p>
            <button
              v-if="c.author_id === authStore.user?.id"
              class="comment-delete"
              @click="deleteComment(post, c)"
            >✕</button>
          </div>
        </div>

        <!-- New comment form -->
        <form v-if="authStore.isAuthenticated" class="comment-form" @submit.prevent="submitComment(post)">
          <input
            v-model="commentDraft[post.id]"
            type="text"
            placeholder="Write a comment…"
            maxlength="2000"
            class="comment-input"
          />
          <button type="submit" class="comment-submit" :disabled="!commentDraft[post.id]?.trim()">Send</button>
        </form>
      </div>
    </div>

    <!-- Repost Modal (inside feed-page so stacking context is correct) -->
    <div v-if="repostModalPost" class="modal-overlay" @click.self="closeRepostModal">
      <div class="modal">
        <h3>🔁 Repost</h3>
        <div class="modal-original-post">
          <strong>{{ repostModalPost.author_username }}</strong>: {{ repostModalPost.content }}
        </div>
        <textarea
          v-model="repostComment"
          placeholder="Add a comment (optional)…"
          rows="3"
          maxlength="500"
          class="modal-textarea"
        ></textarea>
        <div class="modal-actions">
          <button class="btn-secondary" @click="submitRepost(false)">Repost without comment</button>
          <button class="btn-primary" @click="submitRepost(true)" :disabled="!repostComment.trim()">
            Repost with comment
          </button>
        </div>
        <button class="modal-close" @click="closeRepostModal">✕</button>
      </div>
    </div>
    </div><!-- /feed-page -->

    <!-- Right sidebar: live leaderboard -->
    <aside class="feed-sidebar">
      <ActiveLeaderboard />
    </aside>
  </div><!-- /feed-layout -->
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth.js'
import api from '../services/api.js'
import FakeAd from '../components/FakeAd.vue'
import ActiveLeaderboard from '../components/ActiveLeaderboard.vue'

const authStore = useAuthStore()
const posts = ref([])
const loading = ref(true)
const posting = ref(false)
const error = ref(null)
const newPostContent = ref('')
const selectedImage = ref(null)
const uploadProgress = ref(0)

// Comments state
const commentsOpen = reactive(new Set())
const commentLoading = reactive(new Set())
const postComments = reactive({})
const commentDraft = reactive({})

// Repost modal state
const repostModalPost = ref(null)
const repostComment = ref('')

function formatTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  const now = new Date()
  const diff = now - d
  if (diff < 60000) return 'just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`
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

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024
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

// ── Comments ──────────────────────────────────────────────────────────────

async function toggleComments(post) {
  if (commentsOpen.has(post.id)) {
    commentsOpen.delete(post.id)
    return
  }
  commentsOpen.add(post.id)
  if (!postComments[post.id]) {
    await loadComments(post.id)
  }
}

async function loadComments(postId) {
  commentLoading.add(postId)
  try {
    const { data } = await api.get(`/posts/${postId}/comments`)
    postComments[postId] = data.comments || []
  } catch {
    postComments[postId] = []
  } finally {
    commentLoading.delete(postId)
  }
}

async function submitComment(post) {
  const content = commentDraft[post.id]?.trim()
  if (!content) return
  try {
    const { data } = await api.post(`/posts/${post.id}/comments`, { content })
    if (!postComments[post.id]) postComments[post.id] = []
    postComments[post.id].push(data.comment)
    commentDraft[post.id] = ''
    post.comments_count = (post.comments_count || 0) + 1
  } catch {
    error.value = 'Failed to post comment'
  }
}

async function deleteComment(post, comment) {
  try {
    await api.delete(`/posts/${post.id}/comments/${comment.id}`)
    postComments[post.id] = postComments[post.id].filter(c => c.id !== comment.id)
    post.comments_count = Math.max(0, (post.comments_count || 1) - 1)
  } catch {
    error.value = 'Failed to delete comment'
  }
}

// ── Repost ────────────────────────────────────────────────────────────────

function openRepostModal(post) {
  repostModalPost.value = post
  repostComment.value = ''
}

function closeRepostModal() {
  repostModalPost.value = null
  repostComment.value = ''
}

async function submitRepost(withComment) {
  const post = repostModalPost.value
  if (!post) return
  const comment = withComment ? repostComment.value.trim() : null
  try {
    await api.post(`/posts/${post.id}/repost`, { comment })
    post.reposts_count = (post.reposts_count || 0) + 1
    post.user_reposted = true
    closeRepostModal()
  } catch (e) {
    const msg = e.response?.data?.error?.message
    if (msg === 'Already reposted') {
      // toggle off
      await api.delete(`/posts/${post.id}/repost`)
      post.reposts_count = Math.max(0, (post.reposts_count || 1) - 1)
      post.user_reposted = false
      closeRepostModal()
    } else {
      error.value = msg || 'Failed to repost'
    }
  }
}

onMounted(fetchPosts)
</script>

<style scoped>
/* 3-column layout */
.feed-layout {
  display: grid;
  grid-template-columns: 260px minmax(0, 640px) 260px;
  gap: 1.5rem;
  justify-content: center;
  align-items: start;
  padding: 1.5rem 1rem;
  max-width: 1280px;
  margin: 0 auto;
}

.feed-sidebar {
  position: sticky;
  top: 1.5rem;
}

/* Hide sidebars on smaller screens */
@media (max-width: 1024px) {
  .feed-layout {
    grid-template-columns: 1fr;
  }
  .feed-sidebar {
    display: none;
  }
}

.feed-page {
  min-width: 0;
}

.feed-page h1 { margin-bottom: 1.5rem; }

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

.upload-btn { font-size: 0.85rem; color: var(--primary, #00f0ff); cursor: pointer; }
.selected-file { font-size: 0.8rem; color: #999; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

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

.btn-secondary {
  padding: 0.5rem 1.25rem;
  background: transparent;
  color: var(--text-primary, #e8e8f0);
  border: 1px solid var(--border-color, #2a2a3a);
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
}

.upload-progress {
  margin-top: 0.5rem;
  position: relative;
  height: 6px;
  background: var(--bg-tertiary, #1a1a2a);
  border-radius: 3px;
  overflow: hidden;
}
.upload-progress-bar { height: 100%; background: var(--primary, #00f0ff); border-radius: 3px; transition: width 0.2s; }
.upload-progress-label { position: absolute; top: 8px; left: 0; font-size: 0.75rem; color: var(--text-secondary, #a0a0b0); }

.loading, .empty { text-align: center; padding: 2rem; color: #999; }

.error-banner {
  background: rgba(255, 80, 80, 0.15);
  color: #ff5050;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  margin-bottom: 1rem;
}

/* Post card */
.post-card {
  background: var(--bg-secondary, #12121a);
  border: 1px solid var(--border-color, #2a2a3a);
  border-radius: 12px;
  padding: 1rem;
  margin-bottom: 1rem;
}

.repost-header {
  font-size: 0.8rem;
  color: var(--text-secondary, #a0a0b0);
  margin-bottom: 0.6rem;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
}
.repost-header a { color: var(--primary, #00f0ff); text-decoration: none; }
.repost-quote {
  font-style: italic;
  color: var(--text-primary, #e8e8f0);
  border-left: 2px solid var(--primary, #00f0ff);
  padding-left: 0.5rem;
  margin-left: 0.25rem;
}

.post-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; }
.post-author { display: flex; align-items: center; gap: 0.5rem; text-decoration: none; color: var(--primary, #00f0ff); font-weight: 500; }
.post-avatar { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; }
.post-time { font-size: 0.8rem; color: #666; }
.post-content { margin: 0 0 0.75rem; line-height: 1.5; white-space: pre-wrap; word-break: break-word; }
.post-image { width: 100%; max-height: 400px; object-fit: cover; border-radius: 8px; margin-bottom: 0.75rem; }

.post-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
.action-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #999;
  font-size: 0.9rem;
  padding: 0.3rem 0.5rem;
  border-radius: 6px;
  transition: background 0.15s;
}
.action-btn:hover { background: var(--bg-tertiary, #1a1a2a); }
.action-btn.liked { color: #ff5050; }
.action-btn.active { color: var(--primary, #00f0ff); }
.action-btn.reposted { color: #4ade80; }
.delete-btn { color: #ff5050; }

/* Comments */
.comment-section {
  margin-top: 0.75rem;
  border-top: 1px solid var(--border-color, #2a2a3a);
  padding-top: 0.75rem;
}

.comment-loading, .no-comments { font-size: 0.85rem; color: #777; padding: 0.25rem 0; }

.comment {
  position: relative;
  display: grid;
  grid-template-columns: auto 1fr auto;
  grid-template-rows: auto auto;
  gap: 0.15rem 0.5rem;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid rgba(255,255,255,0.04);
}
.comment-author {
  grid-column: 1;
  grid-row: 1;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  text-decoration: none;
  color: var(--primary, #00f0ff);
  font-size: 0.85rem;
}
.comment-avatar { width: 22px; height: 22px; border-radius: 50%; object-fit: cover; }
.comment-time { grid-column: 2; grid-row: 1; font-size: 0.75rem; color: #666; }
.comment-content { grid-column: 1 / 3; grid-row: 2; font-size: 0.88rem; line-height: 1.4; margin: 0; white-space: pre-wrap; word-break: break-word; }
.comment-delete {
  grid-column: 3;
  grid-row: 1 / 3;
  background: none;
  border: none;
  cursor: pointer;
  color: #555;
  font-size: 0.75rem;
  padding: 0.2rem 0.35rem;
  border-radius: 4px;
  align-self: start;
}
.comment-delete:hover { color: #ff5050; }

.comment-form { display: flex; gap: 0.5rem; margin-top: 0.6rem; }
.comment-input {
  flex: 1;
  background: var(--bg-tertiary, #1a1a2a);
  border: 1px solid var(--border-color, #2a2a3a);
  border-radius: 999px;
  padding: 0.4rem 0.85rem;
  color: inherit;
  font-size: 0.875rem;
  outline: none;
}
.comment-submit {
  background: var(--primary, #00f0ff);
  color: #000;
  border: none;
  border-radius: 999px;
  padding: 0.4rem 0.9rem;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
}
.comment-submit:disabled { opacity: 0.45; }

/* Repost Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  backdrop-filter: blur(4px);
}
.modal {
  position: relative;
  background: var(--bg-secondary, #12121a);
  border: 1px solid var(--border-color, #2a2a3a);
  border-radius: 16px;
  padding: 1.5rem;
  width: min(520px, 92vw);
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}
.modal h3 { margin: 0; }
.modal-original-post {
  background: var(--bg-tertiary, #1a1a2a);
  border-radius: 8px;
  padding: 0.75rem;
  font-size: 0.9rem;
  color: var(--text-secondary, #a0a0b0);
  max-height: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
}
.modal-textarea {
  width: 100%;
  background: var(--bg-tertiary, #1a1a2a);
  border: 1px solid var(--border-color, #2a2a3a);
  border-radius: 8px;
  padding: 0.75rem;
  color: inherit;
  font-size: 0.9rem;
  resize: vertical;
}
.modal-actions { display: flex; gap: 0.75rem; flex-wrap: wrap; }
.modal-close {
  position: absolute;
  top: 0.85rem;
  right: 0.85rem;
  background: none;
  border: none;
  color: #999;
  font-size: 1rem;
  cursor: pointer;
}
.modal-close:hover { color: var(--text-primary, #e8e8f0); }
</style>
