<!--
  Feed View — Social posts feed with create, like, comment and repost
  @owner ValGSgit
-->
<template>
  <div class="feed-page">

    <!-- ░░░ LEFT SIDEBAR ░░░ -->
    <aside class="col col-left">
      <FakeAd :sidebar="true" />
      <div class="card mini-card">
        <h4>Trending</h4>
        <ul class="trend-list">
          <li><span class="hash">#</span>SpitRoyaleMeta <em>4.2k</em></li>
          <li><span class="hash">#</span>StageBoss <em>2.1k</em></li>
          <li><span class="hash">#</span>HayBalePass <em>1.8k</em></li>
          <li><span class="hash">#</span>AlpacaRoad <em>980</em></li>
        </ul>
      </div>
    </aside>

    <!-- ░░░ CENTER FEED ░░░ -->
    <main class="col col-center">

      <!-- Error banner -->
      <div v-if="error" class="error-banner">
        {{ error }}
        <button class="error-dismiss" @click="error = null" aria-label="Dismiss">×</button>
      </div>

      <!-- Composer -->
      <section
        v-if="authStore.isAuthenticated"
        class="card composer"
        :class="{ focused: composerFocused }"
      >
        <div class="composer-row">
          <div class="avatar" :class="avatarColor(authStore.user?.username)">
            <img v-if="authStore.user?.avatar" :src="authStore.user.avatar" :alt="authStore.user?.username" />
            <span v-else>{{ authStore.user?.username?.slice(0, 2).toUpperCase() }}</span>
          </div>
          <div class="composer-body">
            <textarea
              v-model="newPostContent"
              placeholder="What's on your paddock?"
              rows="2"
              maxlength="2000"
              @focus="composerFocused = true"
              @blur="composerFocused = false"
            ></textarea>
            <div class="composer-tools">
              <div class="tool-icons">
                <label class="tool" title="Add Image" aria-label="Add Image">
                  <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 17l-5-5-9 9"/></svg>
                  <input type="file" accept="image/*" @change="selectImage" hidden />
                </label>
              </div>
              <div class="composer-end">
                <span v-if="selectedImage" class="selected-file">{{ selectedImage.name }}</span>
                <span class="char-counter" :class="{ warn: newPostContent.length > 1800 }">
                  {{ 2000 - newPostContent.length }}
                </span>
                <button
                  class="btn btn-primary"
                  :disabled="!newPostContent.trim() || posting"
                  @click="createPost"
                >{{ posting ? 'Posting…' : 'Spit it' }}</button>
              </div>
            </div>
            <div v-if="uploadProgress > 0 && uploadProgress < 100" class="upload-bar">
              <div class="upload-bar-fill" :style="{ width: uploadProgress + '%' }"></div>
            </div>
          </div>
        </div>
      </section>

      <!-- Skeleton loading -->
      <template v-if="loading">
        <div v-for="n in 3" :key="'sk'+n" class="card skeleton-card">
          <div class="sk-row">
            <div class="sk-circle shimmer"></div>
            <div class="sk-stack">
              <div class="sk-line shimmer" style="width:38%"></div>
              <div class="sk-line shimmer" style="width:18%"></div>
            </div>
          </div>
          <div class="sk-line shimmer" style="width:92%"></div>
          <div class="sk-line shimmer" style="width:74%"></div>
          <div class="sk-line shimmer" style="width:60%"></div>
          <div class="sk-actions">
            <span class="sk-pill shimmer"></span>
            <span class="sk-pill shimmer"></span>
            <span class="sk-pill shimmer"></span>
          </div>
        </div>
      </template>

      <!-- Empty state -->
      <div v-else-if="!posts.length" class="empty">
        <div class="empty-art" aria-hidden="true">
          <div class="ring ring-1"></div>
          <div class="ring ring-2"></div>
          <div class="empty-llama">🦙</div>
        </div>
        <h3>It's quiet on the paddock…</h3>
        <p>Be the first to spit some facts 🦙</p>
      </div>

      <!-- Posts -->
      <article
        v-else
        v-for="post in posts"
        :key="post._displayId || post.id"
        class="card post"
        :class="{
          'post--mine':     post.author_id === authStore.user?.id,
          'post--liked':    post.user_liked && post.author_id !== authStore.user?.id,
          'post--reposted': post.user_reposted,
        }"
      >
        <!-- Repost banner -->
        <div v-if="post._repostBy" class="repost-banner">
          <svg viewBox="0 0 24 24" class="repost-ic" aria-hidden="true"><path d="M7 7h11l-2-2M17 17H6l2 2"/><path d="M18 7v4M6 17v-4"/></svg>
          <router-link v-if="post._repostById" :to="`/user/${post._repostById}`">{{ post._repostBy }}</router-link>
          <span v-else>{{ post._repostBy }}</span>
          reposted
          <span v-if="post._repostComment" class="repost-quote">{{ post._repostComment }}</span>
        </div>

        <!-- Tombstone: original post was deleted -->
        <template v-if="post._deleted">
          <div class="post-tombstone">
            <svg viewBox="0 0 24 24" class="tombstone-ic" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            <span>The original post was deleted.</span>
          </div>
        </template>

        <template v-else>
          <header class="post-head">
            <router-link v-if="post.author_id" :to="`/user/${post.author_id}`" class="author-avatar-link">
              <div class="avatar" :class="avatarColor(post.author_username)">
                <img v-if="post.author_avatar" :src="resolveMediaUrl(post.author_avatar)" :alt="post.author_username" @error="onPostImageError" />
                <span v-else>{{ post.author_username?.slice(0, 2).toUpperCase() }}</span>
              </div>
            </router-link>
            <div v-else class="avatar" :class="avatarColor(post.author_username)">
              <span>{{ post.author_username?.slice(0, 2).toUpperCase() }}</span>
            </div>

            <div class="post-meta">
              <router-link v-if="post.author_id" :to="`/user/${post.author_id}`" class="username">
                {{ post.author_username }}
                <span v-if="post.author_id === authStore.user?.id" class="self-tag">you</span>
              </router-link>
              <span v-else class="username">{{ post.author_username || 'Unknown' }}</span>
              <span class="dot-sep">·</span>
              <time class="ts" :title="new Date(post.created_at).toLocaleString()">{{ formatTime(post.created_at) }}</time>
            </div>

            <button
              v-if="post.author_id === authStore.user?.id"
              class="icon-btn danger"
              title="Delete post"
              @click="deletePost(post.id)"
            >
              <svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>
            </button>
          </header>

          <div class="post-body">
            <p class="post-text">{{ post.content }}</p>
            <img
              v-if="post.image_url"
              :src="resolveMediaUrl(post.image_url)"
              class="post-image"
              alt="post image"
              @error="onPostImageError"
            />
          </div>

          <!-- Action pills -->
          <footer class="post-actions">
            <button class="pill pill-like" :class="{ on: post.user_liked }" @click="toggleLike(post)">
              <svg viewBox="0 0 24 24" class="ic"><path d="M12 21s-7-4.6-9.5-9.1C1 8.5 3 5 6.4 5c2 0 3.4 1 4.6 2.6l1 1.4 1-1.4C14.2 6 15.6 5 17.6 5 21 5 23 8.5 21.5 11.9 19 16.4 12 21 12 21Z"/></svg>
              <span class="count">{{ post.likes_count || 0 }}</span>
            </button>

            <button class="pill pill-comment" :class="{ on: commentsOpen.has(post._displayId) }" @click="toggleComments(post)">
              <svg viewBox="0 0 24 24" class="ic"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.5A8 8 0 1 1 21 12Z"/></svg>
              <span class="count">{{ post.comments_count || 0 }}</span>
            </button>

            <button
              v-if="authStore.isAuthenticated"
              class="pill pill-repost"
              :class="{ on: post.user_reposted }"
              @click="openRepostModal(post)"
            >
              <svg viewBox="0 0 24 24" class="ic"><path d="M7 7h11l-2-2M17 17H6l2 2"/><path d="M18 7v4M6 17v-4"/></svg>
              <span class="count">{{ post.reposts_count || 0 }}</span>
            </button>
          </footer>
        </template>

        <!-- Comments panel (slide via max-height) -->
        <section class="comments" :class="{ open: commentsOpen.has(post.id) }">
          <div class="comments-inner">
            <div v-if="commentLoading.has(post.id)" class="no-comments">Loading…</div>
            <template v-else>
              <div v-if="!(postComments[post.id]?.length)" class="no-comments">No comments yet.</div>
              <div v-for="c in (postComments[post.id] || [])" :key="c.id" class="comment">
                <div class="avatar avatar-sm" :class="avatarColor(c.author_username)">
                  <img v-if="c.author_avatar" :src="resolveMediaUrl(c.author_avatar)" :alt="c.author_username" />
                  <span v-else>{{ c.author_username?.slice(0, 2).toUpperCase() }}</span>
                </div>
                <div class="comment-body">
                  <div class="comment-head">
                    <router-link v-if="c.author_id" :to="`/user/${c.author_id}`" class="username">{{ c.author_username }}</router-link>
                    <span v-else class="username">{{ c.author_username }}</span>
                    <time class="ts">{{ formatTime(c.created_at) }}</time>
                    <button
                      v-if="c.author_id === authStore.user?.id"
                      class="icon-btn danger"
                      style="width:22px;height:22px;margin-left:auto;flex-shrink:0"
                      @click="deleteComment(post, c)"
                    >
                      <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>
                    </button>
                  </div>
                  <p>{{ c.content }}</p>
                </div>
              </div>
            </template>

            <form v-if="authStore.isAuthenticated" class="comment-compose" @submit.prevent="submitComment(post)">
              <div class="avatar avatar-sm" :class="avatarColor(authStore.user?.username)">
                <img v-if="authStore.user?.avatar" :src="authStore.user.avatar" :alt="authStore.user?.username" />
                <span v-else>{{ authStore.user?.username?.slice(0, 2).toUpperCase() }}</span>
              </div>
              <input
                v-model="commentDraft[post.id]"
                type="text"
                placeholder="Reply with a witty alpaca-ism…"
                maxlength="1000"
              />
              <button
                class="btn btn-ghost btn-sm"
                type="submit"
                :disabled="!commentDraft[post.id]?.trim()"
              >Reply</button>
            </form>
          </div>
        </section>
      </article>
    </main>

    <!-- ░░░ RIGHT SIDEBAR ░░░ -->
    <aside class="col col-right">
      <ActiveLeaderboard />
    </aside>

    <!-- Mobile FAB -->
    <button class="fab" aria-label="Compose" @click="composerFocused = true">
      <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
    </button>

    <!-- Repost Modal -->
    <Transition name="modal">
      <div v-if="repostModalPost" class="modal-scrim" @click.self="closeRepostModal">
        <div class="modal">
          <header class="modal-head">
            <h3>Repost</h3>
            <button class="icon-btn" @click="closeRepostModal" aria-label="Close">
              <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>
            </button>
          </header>

          <textarea v-model="repostComment" placeholder="Add a comment (optional)…" rows="3"></textarea>

          <blockquote class="quoted">
            <header>
              <div class="avatar avatar-sm" :class="avatarColor(repostModalPost.author_username)">
                <img v-if="repostModalPost.author_avatar" :src="resolveMediaUrl(repostModalPost.author_avatar)" :alt="repostModalPost.author_username" />
                <span v-else>{{ repostModalPost.author_username?.slice(0, 2).toUpperCase() }}</span>
              </div>
              <span class="username">{{ repostModalPost.author_username }}</span>
              <span class="dot-sep">·</span>
              <time class="ts">{{ formatTime(repostModalPost.created_at) }}</time>
            </header>
            <p>{{ repostModalPost.content }}</p>
          </blockquote>

          <footer class="modal-foot">
            <button class="btn btn-ghost" @click="closeRepostModal">Cancel</button>
            <button class="btn btn-ghost" @click="submitRepost(false)">Repost</button>
            <button
              class="btn btn-primary"
              :disabled="!repostComment.trim()"
              @click="submitRepost(true)"
            >Repost with comment</button>
          </footer>
        </div>
      </div>
    </Transition>
  </div>
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
const composerFocused = ref(false)

// Comments state
const commentsOpen = reactive(new Set())
const commentLoading = reactive(new Set())
const postComments = reactive({})
const commentDraft = reactive({})

// Repost modal state
const repostModalPost = ref(null)
const repostComment = ref('')

function avatarColor(username) {
  const colors = ['av-cyan', 'av-gold', 'av-pink', 'av-aqua', 'av-mint', 'av-violet']
  let hash = 0
  for (const c of (username || '')) hash = (hash * 31 + c.charCodeAt(0)) & 0x7fffffff
  return colors[hash % colors.length]
}

function getPostDisplayId(post) {
  // For reposts, create a unique display ID to prevent state sharing
  // Use a stable key that includes repost metadata
  if (post._repostBy) {
    const repostId = post._repostById || post._repostBy
    // Create a unique ID that combines post id, repost author, and creation time
    return `repost|${post.id}|${repostId}|${post.created_at || ''}`
  }
  return `original|${post.id}`
}

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
    const newPosts = (data.posts || []).map(post => {
      post._displayId = getPostDisplayId(post)
      return post
    })

    // Clear comment state for posts that are no longer in the feed
    const newDisplayIds = new Set(newPosts.map(p => String(p.id)))
    for (const key of Object.keys(postComments)) {
      if (!newDisplayIds.has(key)) {
        delete postComments[key]
        delete commentDraft[key]
      }
    }

    posts.value = newPosts
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
      const uploadRes = await api.post('/uploads', formData)
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
  const wasLiked = post.user_liked
  post.user_liked = !wasLiked
  post.likes_count = wasLiked
    ? Math.max(0, (post.likes_count || 1) - 1)
    : (post.likes_count || 0) + 1
  try {
    if (wasLiked) {
      await api.delete(`/posts/${post.id}/like`)
    } else {
      await api.post(`/posts/${post.id}/like`)
    }
  } catch {
    post.user_liked = wasLiked
    post.likes_count = wasLiked
      ? (post.likes_count || 0) + 1
      : Math.max(0, (post.likes_count || 1) - 1)
  }
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
  const threadKey = String(post.id)
  if (commentsOpen.has(threadKey)) {
    commentsOpen.delete(threadKey)
    return
  }
  commentsOpen.add(threadKey)
  if (!postComments[threadKey]) {
    await loadComments(post.id, threadKey)
  }
}

async function loadComments(postId, threadKey) {
  commentLoading.add(threadKey)
  try {
    const { data } = await api.get(`/posts/${postId}/comments`)
    postComments[threadKey] = data.comments || []
  } catch {
    postComments[threadKey] = []
  } finally {
    commentLoading.delete(threadKey)
  }
}

async function submitComment(post) {
  const threadKey = String(post.id)
  const content = commentDraft[threadKey]?.trim()
  if (!content) return
  if (content.length > 1000) {
    error.value = 'Comments must be 1000 characters or fewer'
    return
  }
  try {
    const { data } = await api.post(`/posts/${post.id}/comments`, { content })
    if (!postComments[threadKey]) postComments[threadKey] = []
    postComments[threadKey].push(data.comment)
    commentDraft[threadKey] = ''
    post.comments_count = (post.comments_count || 0) + 1
  } catch {
    error.value = 'Failed to post comment'
  }
}

async function deleteComment(post, comment) {
  const threadKey = String(post.id)
  try {
    await api.delete(`/posts/${post.id}/comments/${comment.id}`)
    postComments[threadKey] = postComments[threadKey].filter(c => c.id !== comment.id)
    post.comments_count = Math.max(0, (post.comments_count || 1) - 1)
  } catch {
    error.value = 'Failed to delete comment'
  }
}

// ── Repost ────────────────────────────────────────────────────────────────

async function openRepostModal(post) {
  if (post.user_reposted) {
    try {
      await api.delete(`/posts/${post.id}/repost`)
      post.reposts_count = Math.max(0, (post.reposts_count || 1) - 1)
      post.user_reposted = false
    } catch (e) {
      error.value = e.response?.data?.error?.message || 'Failed to remove repost'
    }
    return
  }
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
    error.value = e.response?.data?.error?.message || 'Failed to repost'
  }
}

onMounted(fetchPosts)
</script>

<style scoped>
/* ── tokens ── */
.feed-page {
  --bg-primary:    #0b0b13;
  --bg-secondary:  #12121a;
  --bg-tertiary:   #1a1a2a;
  --border-color:  #2a2a3a;
  --primary:       #00f0ff;
  --magenta:       #ff8ec4;
  --gold:          #f5c842;
  --silver:        #cfd3df;
  --bronze:        #d68a4c;
  --green:         #36e07a;
  --text-primary:  #e8e8f0;
  --text-secondary:#a0a0b0;
  --text-muted:    #6a6c7c;

  background: var(--bg-primary);
  color: var(--text-primary);
  font-family: 'Space Grotesk', system-ui, -apple-system, sans-serif;
  font-feature-settings: "ss01","tnum";
  min-height: 100vh;

  display: grid;
  grid-template-columns: 260px minmax(0, 620px) 320px;
  gap: 24px;
  padding: 24px;
  max-width: 1280px;
  margin: 0 auto;
  align-items: start;
}

/* ── shared atoms ── */
.card {
  background: linear-gradient(180deg, #14141e 0%, #10101a 100%);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  padding: 14px;
  box-shadow: 0 1px 0 rgba(255,255,255,.03) inset, 0 18px 40px -28px rgba(0,0,0,.6);
}

.col { display: flex; flex-direction: column; gap: 14px; }
.col-left, .col-right { position: sticky; top: 24px; }

.btn {
  appearance: none; border: 0; cursor: pointer;
  font-family: inherit; font-size: 13px; font-weight: 600;
  padding: 8px 14px; border-radius: 999px;
  transition: transform .12s ease, background .15s ease, color .15s ease, box-shadow .2s ease;
}
.btn:active { transform: translateY(1px); }
.btn-primary {
  background: linear-gradient(180deg, #00f0ff, #00c8d6);
  color: #061114;
  box-shadow: 0 0 0 1px rgba(0,240,255,.4), 0 8px 24px -10px rgba(0,240,255,.7);
}
.btn-primary:hover { box-shadow: 0 0 0 1px rgba(0,240,255,.6), 0 10px 28px -8px rgba(0,240,255,.85); }
.btn-primary:disabled { background: #1a1a2a; color: var(--text-muted); box-shadow: none; cursor: not-allowed; }
.btn-ghost {
  background: transparent; color: var(--text-primary);
  border: 1px solid var(--border-color);
}
.btn-ghost:hover { background: var(--bg-tertiary); border-color: #3a3a4e; }
.btn-sm { padding: 6px 10px; font-size: 12px; }

.icon-btn {
  appearance: none; border: 0; cursor: pointer; background: transparent;
  width: 32px; height: 32px; border-radius: 8px; color: var(--text-secondary);
  display: inline-flex; align-items: center; justify-content: center;
  transition: background .15s, color .15s;
}
.icon-btn svg { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.icon-btn:hover { background: var(--bg-tertiary); color: var(--text-primary); }
.icon-btn.danger:hover { color: #ff7090; background: rgba(255,112,144,.08); }

/* avatars */
.avatar {
  width: 40px; height: 40px; border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 800; color: #0b0b13;
  border: 1px solid rgba(255,255,255,.06);
  flex-shrink: 0; overflow: hidden;
}
.avatar img { width: 100%; height: 100%; object-fit: cover; }
.avatar-sm { width: 28px; height: 28px; font-size: 11px; }
.av-cyan   { background: linear-gradient(135deg, #9eeaff, #00f0ff); color: #06161a; }
.av-gold   { background: linear-gradient(135deg, #ffe28a, #f5c842); }
.av-pink   { background: linear-gradient(135deg, #ffd1e6, #ff8ec4); color: #2a0a1c; }
.av-aqua   { background: linear-gradient(135deg, #b8ffe9, #3ad6c1); color: #06231e; }
.av-mint   { background: linear-gradient(135deg, #c5f6c2, #6ddc7a); color: #062a14; }
.av-violet { background: linear-gradient(135deg, #cdb6ff, #8a6cff); color: #fff; }

/* ── left sidebar ── */
.mini-card h4 {
  margin: 0 0 10px; font-size: 11px; color: var(--text-secondary);
  letter-spacing: .16em; text-transform: uppercase; font-weight: 600;
}
.trend-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; }
.trend-list li { display: flex; align-items: center; font-size: 13px; color: var(--text-primary); }
.trend-list .hash { color: var(--primary); margin-right: 4px; font-weight: 700; }
.trend-list em { margin-left: auto; font-style: normal; font-size: 11px; color: var(--text-muted); font-family: 'JetBrains Mono', ui-monospace, monospace; }

/* ── composer ── */
.composer { padding: 14px; transition: box-shadow .2s ease, border-color .2s ease; }
.composer.focused {
  border-color: rgba(0,240,255,.5);
  box-shadow: 0 0 0 1px rgba(0,240,255,.25), 0 0 24px -6px rgba(0,240,255,.35), 0 18px 40px -28px rgba(0,0,0,.6);
}
.composer-row { display: flex; gap: 12px; align-items: flex-start; }
.composer-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 10px; }
.composer textarea {
  width: 100%; resize: vertical; min-height: 64px;
  background: transparent; border: 0; outline: 0;
  color: var(--text-primary); font: inherit; font-size: 15px; line-height: 1.5;
  padding: 6px 0;
}
.composer textarea::placeholder { color: var(--text-muted); }

.composer-tools {
  display: flex; align-items: center; justify-content: space-between;
  padding-top: 8px; border-top: 1px dashed var(--border-color);
}
.tool-icons { display: flex; gap: 2px; }
.tool {
  appearance: none; border: 0; background: transparent; cursor: pointer;
  width: 32px; height: 32px; border-radius: 8px;
  color: var(--primary); display: inline-flex; align-items: center; justify-content: center;
  transition: background .15s ease;
}
.tool svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.tool:hover { background: rgba(0,240,255,.08); }

.composer-end { display: flex; align-items: center; gap: 12px; }
.selected-file { font-size: 11px; color: var(--text-muted); max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.char-counter { font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 11px; color: var(--text-muted); }
.char-counter.warn { color: var(--magenta); }

.upload-bar { height: 4px; background: var(--bg-tertiary); border-radius: 2px; overflow: hidden; margin-top: 6px; }
.upload-bar-fill { height: 100%; background: var(--primary); border-radius: 2px; transition: width .2s; }

/* ── post card ── */
.post { position: relative; padding: 14px 14px 8px; }
.post::before {
  content: ""; position: absolute; left: 0; top: 14px; bottom: 14px;
  width: 3px; border-radius: 0 3px 3px 0;
  background: transparent;
  transition: background .2s ease, box-shadow .2s ease;
}
.post--mine::before { background: var(--primary); box-shadow: 0 0 12px rgba(0,240,255,.55); }
.post--liked::before { background: var(--magenta); box-shadow: 0 0 12px rgba(255,142,196,.5); }
.post--reposted::before { background: var(--green); box-shadow: 0 0 12px rgba(54,224,122,.45); }

.repost-banner {
  display: flex; align-items: center; gap: 6px;
  font-size: 11.5px; color: var(--text-muted); margin-bottom: 10px;
  padding-bottom: 8px; border-bottom: 1px solid var(--border-color);
}
.repost-banner a { color: var(--primary); text-decoration: none; }
.repost-ic { width: 13px; height: 13px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; flex-shrink: 0; }
.repost-quote { border-left: 2px solid var(--primary); padding-left: 6px; color: var(--text-secondary); font-style: italic; }

.post-tombstone {
  display: flex; align-items: center; gap: 8px;
  padding: 14px 12px;
  background: rgba(255,255,255,.03);
  border: 1px dashed var(--border-color);
  border-radius: 8px;
  color: var(--text-muted);
  font-size: 13px;
  font-style: italic;
}
.tombstone-ic { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; flex-shrink: 0; opacity: .5; }

.author-avatar-link { text-decoration: none; flex-shrink: 0; }
.post-head { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.post-meta { flex: 1; min-width: 0; display: flex; align-items: baseline; gap: 6px; flex-wrap: wrap; }
.username {
  font-weight: 700; font-size: 14px; color: var(--text-primary);
  display: inline-flex; align-items: center; gap: 6px;
  text-decoration: none;
}
.username:hover { color: var(--primary); }
.self-tag {
  font-size: 9px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase;
  color: var(--primary); border: 1px solid rgba(0,240,255,.4);
  background: rgba(0,240,255,.08); padding: 1px 5px; border-radius: 4px;
}
.dot-sep { color: var(--text-muted); font-weight: 700; }
.ts {
  font-size: 12px; color: var(--text-muted);
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  cursor: help; border-bottom: 1px dotted transparent;
  transition: border-color .15s, color .15s;
}
.ts:hover { color: var(--text-secondary); border-bottom-color: var(--border-color); }

.post-text { margin: 0 0 10px; font-size: 15px; line-height: 1.55; color: var(--text-primary); white-space: pre-wrap; word-break: break-word; }
.post-image {
  display: block; width: 100%; max-height: 400px; object-fit: cover;
  border-radius: 12px; margin: 4px 0 10px;
  border: 1px solid var(--border-color);
  transition: transform .15s ease;
}
.post-image:hover { transform: translateY(-1px); }

/* action pills */
.post-actions {
  display: flex; gap: 4px; align-items: center;
  margin-top: 8px; padding: 4px 0 8px;
  border-top: 1px solid var(--border-color);
}
.pill {
  appearance: none; border: 0; cursor: pointer;
  background: transparent; color: var(--text-secondary);
  display: inline-flex; align-items: center; gap: 6px;
  font: inherit; font-size: 12.5px; font-weight: 600;
  padding: 6px 10px; border-radius: 999px;
  transition: color .18s ease, background .25s ease, transform .15s ease;
  position: relative; overflow: hidden;
}
.pill .ic { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; transition: stroke .2s, fill .2s, transform .2s ease; }
.pill .count { font-variant-numeric: tabular-nums; }
.pill::before {
  content: ""; position: absolute; inset: 0; border-radius: inherit;
  background: currentColor; opacity: 0;
  transform: scale(.6); transition: opacity .25s ease, transform .25s ease;
  z-index: -1;
}
.pill:hover { transform: translateY(-1px); }
.pill:hover::before { opacity: .12; transform: scale(1); }

.pill-like:hover, .pill-like.on { color: var(--magenta); }
.pill-like.on .ic { fill: var(--magenta); transform: scale(1.05); }
.pill-comment:hover, .pill-comment.on { color: var(--primary); }
.pill-repost:hover, .pill-repost.on { color: var(--green); }

/* comments */
.comments { max-height: 0; overflow: hidden; transition: max-height .35s ease, opacity .25s ease; opacity: 0; }
.comments.open { max-height: 1200px; opacity: 1; }
.comments-inner {
  border-top: 1px solid var(--border-color);
  padding: 12px 0 4px; display: flex; flex-direction: column; gap: 10px;
}
.no-comments { font-size: 12.5px; color: var(--text-muted); padding: 2px 0; }
.comment { display: flex; gap: 10px; align-items: flex-start; }
.comment-body {
  flex: 1; background: var(--bg-tertiary);
  border-radius: 10px; padding: 8px 10px; border: 1px solid var(--border-color);
}
.comment-head { display: flex; align-items: baseline; gap: 6px; margin-bottom: 4px; flex-wrap: wrap; }
.comment-head .username { font-size: 13px; }
.comment-head .ts { font-size: 11px; }
.comment p { margin: 0; font-size: 13.5px; line-height: 1.5; color: var(--text-primary); white-space: pre-wrap; word-break: break-word; }

.comment-compose { display: flex; align-items: center; gap: 10px; margin-top: 4px; }
.comment-compose input {
  flex: 1; min-width: 0;
  background: var(--bg-tertiary); border: 1px solid var(--border-color);
  border-radius: 999px; padding: 8px 14px;
  color: var(--text-primary); font: inherit; font-size: 13px; outline: 0;
  transition: border-color .15s, box-shadow .2s;
}
.comment-compose input:focus { border-color: rgba(0,240,255,.5); box-shadow: 0 0 0 3px rgba(0,240,255,.12); }

/* modal */
.modal-scrim {
  position: fixed; inset: 0; z-index: 90;
  background: rgba(5,5,10,.7); backdrop-filter: blur(6px);
  display: flex; align-items: center; justify-content: center; padding: 20px;
}
.modal {
  width: 100%; max-width: 520px;
  background: var(--bg-secondary); border: 1px solid var(--border-color);
  border-radius: 14px; padding: 16px;
  box-shadow: 0 30px 60px -20px rgba(0,0,0,.8);
  display: flex; flex-direction: column; gap: 12px;
}
.modal-head { display: flex; align-items: center; justify-content: space-between; }
.modal-head h3 { margin: 0; font-size: 14px; letter-spacing: .04em; }
.modal textarea {
  width: 100%; resize: vertical;
  background: var(--bg-tertiary); border: 1px solid var(--border-color);
  border-radius: 10px; padding: 10px 12px;
  color: var(--text-primary); font: inherit; font-size: 14px; outline: 0;
  transition: border-color .15s, box-shadow .2s;
}
.modal textarea:focus { border-color: rgba(0,240,255,.5); box-shadow: 0 0 0 3px rgba(0,240,255,.12); }

.quoted {
  margin: 0;
  padding: 10px 12px; border-radius: 10px;
  background: var(--bg-tertiary);
  border-left: 3px solid var(--border-color);
  border-top: 1px solid var(--border-color);
  border-right: 1px solid var(--border-color);
  border-bottom: 1px solid var(--border-color);
}
.quoted header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.quoted p { margin: 0; font-size: 13.5px; color: var(--text-secondary); line-height: 1.5; }

.modal-foot { display: flex; justify-content: flex-end; gap: 8px; flex-wrap: wrap; }

.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-from .modal, .modal-leave-to .modal { transform: translateY(8px) scale(.98); }
.modal-enter-active, .modal-leave-active { transition: opacity .2s ease; }
.modal-enter-active .modal, .modal-leave-active .modal { transition: transform .25s cubic-bezier(.2,.8,.2,1); }

/* skeletons */
.skeleton-card { display: flex; flex-direction: column; gap: 10px; }
.sk-row { display: flex; align-items: center; gap: 12px; }
.sk-stack { flex: 1; display: flex; flex-direction: column; gap: 6px; }
.sk-circle { width: 40px; height: 40px; border-radius: 50%; }
.sk-line { height: 12px; border-radius: 6px; }
.sk-actions { display: flex; gap: 6px; padding-top: 6px; }
.sk-pill { width: 60px; height: 24px; border-radius: 999px; }
.shimmer { position: relative; overflow: hidden; background: var(--bg-tertiary); }
.shimmer::after {
  content: ""; position: absolute; inset: 0;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,.05), transparent);
  transform: translateX(-100%); animation: shimmer 1.4s ease-in-out infinite;
}
@keyframes shimmer { to { transform: translateX(100%); } }

/* empty state */
.empty {
  text-align: center; padding: 56px 20px;
  background: linear-gradient(180deg, #14141e 0%, #10101a 100%);
  border: 1px dashed var(--border-color); border-radius: 14px;
  display: flex; flex-direction: column; align-items: center; gap: 10px;
}
.empty-art {
  position: relative; width: 120px; height: 120px;
  display: flex; align-items: center; justify-content: center; margin-bottom: 8px;
}
.empty-art .ring { position: absolute; inset: 0; border-radius: 50%; border: 1px solid var(--border-color); }
.empty-art .ring-1 { inset: 8px; border-color: rgba(0,240,255,.3); animation: spin 12s linear infinite; }
.empty-art .ring-2 { inset: 24px; border-style: dashed; border-color: rgba(255,142,196,.3); animation: spin 18s linear reverse infinite; }
.empty-llama { font-size: 44px; filter: drop-shadow(0 0 10px rgba(0,240,255,.35)); }
@keyframes spin { to { transform: rotate(360deg); } }
.empty h3 { margin: 0; font-size: 16px; }
.empty p { margin: 0; color: var(--text-secondary); font-size: 13px; }

/* error banner */
.error-banner {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  background: rgba(255,80,80,.12); color: #ff7070;
  border: 1px solid rgba(255,80,80,.3); border-radius: 10px;
  padding: 10px 14px; font-size: 13.5px; margin-bottom: 4px;
}
.error-dismiss {
  appearance: none; border: 0; background: transparent; cursor: pointer;
  color: #ff7070; font-size: 18px; line-height: 1; padding: 0 4px; flex-shrink: 0;
}

/* FAB — mobile only */
.fab {
  display: none;
  position: fixed; right: 18px; bottom: 18px; z-index: 70;
  width: 56px; height: 56px; border-radius: 50%;
  appearance: none; border: 0; cursor: pointer;
  background: linear-gradient(180deg, #00f0ff, #00b8c4);
  color: #061114;
  box-shadow: 0 0 0 1px rgba(0,240,255,.4), 0 14px 30px -10px rgba(0,240,255,.6);
}
.fab svg { width: 24px; height: 24px; fill: none; stroke: currentColor; stroke-width: 2.4; stroke-linecap: round; }

/* ── responsive ── */
@media (max-width: 1100px) {
  .feed-page { grid-template-columns: minmax(0, 1fr) 300px; }
  .col-left { display: none; }
}
@media (max-width: 768px) {
  .feed-page { grid-template-columns: minmax(0, 1fr); padding: 12px; gap: 14px; }
  .col-right { display: none; }
  .composer { display: none; }
  .fab { display: inline-flex; align-items: center; justify-content: center; }
  .post { padding: 12px; }
  .post-text { font-size: 14.5px; }
}
</style>
