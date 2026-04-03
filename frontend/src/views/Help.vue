<!--
  Help Desk — AI-powered assistance chat + AI image generator
  Uses Groq (Llama 3) via the backend /api/help endpoint.
  Streams responses token-by-token for a snappy UX.
  Tabbed UI: switch between full Chat and full Image Generator.
-->
<template>
  <div class="help-page">

    <!-- ── Tab bar ── -->
    <div class="tab-bar">
      <button class="tab-btn" :class="{ active: activeTab === 'chat' }" @click="activeTab = 'chat'">
        💬 Help Chat
      </button>
      <button class="tab-btn" :class="{ active: activeTab === 'images' }" @click="activeTab = 'images'">
        🎨 Image Generator
      </button>
    </div>

    <!-- ══════════ CHAT TAB ══════════ -->
    <div v-show="activeTab === 'chat'" class="tab-content">
      <div class="help-container">

        <div class="help-header">
          <h1>🦙 Help Desk</h1>
          <p class="help-subtitle">Ask anything about Alpaca Party — I'm here to help!</p>
        </div>

        <div class="chat-window" ref="chatWindow">
          <div v-if="messages.length === 0" class="empty-state">
            <div class="empty-icon">💬</div>
            <p>No messages yet. Ask me anything about the app!</p>
            <div class="suggestions">
              <button v-for="s in suggestions" :key="s" class="suggestion-btn" @click="sendSuggestion(s)">
                {{ s }}
              </button>
            </div>
          </div>

          <div
            v-for="(msg, i) in messages"
            :key="i"
            class="message"
            :class="msg.role"
          >
            <div class="message-avatar">{{ msg.role === 'user' ? '👤' : '🦙' }}</div>
            <div class="message-body">
              <div class="message-content" v-html="renderMarkdown(msg.content)" />
              <span class="message-time">{{ msg.time }}</span>
            </div>
          </div>

          <div v-if="loading" class="message assistant">
            <div class="message-avatar">🦙</div>
            <div class="message-body">
              <div class="message-content typing">
                <span v-if="streamedText">{{ streamedText }}<span class="cursor">▌</span></span>
                <span v-else class="dots"><span>.</span><span>.</span><span>.</span></span>
              </div>
            </div>
          </div>
        </div>

        <form class="chat-input-bar" @submit.prevent="sendMessage">
          <input
            v-model="input"
            type="text"
            placeholder="Type your question…"
            :disabled="loading"
            ref="inputEl"
            maxlength="1000"
          />
          <button type="submit" :disabled="!input.trim() || loading" class="send-btn">
            <span v-if="loading" class="spinner">⟳</span>
            <span v-else>➤</span>
          </button>
        </form>

      </div>
    </div>

    <!-- ══════════ IMAGE GENERATOR TAB ══════════ -->
    <div v-show="activeTab === 'images'" class="tab-content">
      <div class="image-gen-container">

        <div class="image-gen-header">
          <h1>🎨 AI Image Generator</h1>
          <p class="image-gen-subtitle">Generate images with AI — download them or share as posts</p>
        </div>

        <div class="image-gen-body">

          <!-- Controls column -->
          <div class="image-controls">
            <label class="gen-label">Describe what you want to generate</label>
            <textarea
              v-model="imagePrompt"
              rows="4"
              placeholder="e.g. an alpaca astronaut floating in space, watercolour painting of mountains, cyberpunk cityscape…"
              class="gen-textarea"
              maxlength="200"
            ></textarea>

            <div class="gen-mode-row">
              <label class="gen-mode-item">
                <input type="radio" v-model="genMode" value="image" />
                <span>Full Image</span>
              </label>
              <label class="gen-mode-item">
                <input type="radio" v-model="genMode" value="avatar" />
                <span>Avatar (set as profile pic)</span>
              </label>
            </div>

            <button
              class="gen-btn"
              @click="generateImage"
              :disabled="generatingImage || !authStore.isAuthenticated"
            >
              {{ generatingImage ? '⏳ Generating…' : '✨ Generate' }}
            </button>
            <p v-if="!authStore.isAuthenticated" class="gen-hint warn">Log in to generate images.</p>
            <p v-if="genError" class="gen-error">{{ genError }}</p>
            <p v-if="genSuccess" class="gen-success">{{ genSuccess }}</p>

            <!-- Action buttons when image is ready -->
            <div v-if="generatedImageUrl" class="image-actions">
              <button class="action-btn download-btn" @click="downloadImage">⬇ Download</button>
              <button class="action-btn post-btn" @click="postImage" :disabled="postingImage">
                {{ postingImage ? 'Posting…' : '📤 Share as Post' }}
              </button>
              <button v-if="genMode === 'image'" class="action-btn avatar-btn" @click="setAsAvatar">
                👤 Set as Avatar
              </button>
            </div>
          </div>

          <!-- Image display area -->
          <div class="image-display">
            <div v-if="!generatedImageUrl && !generatingImage" class="image-placeholder">
              <div class="placeholder-icon">🖼️</div>
              <p>Your generated image will appear here</p>
            </div>
            <div v-if="generatingImage" class="image-placeholder loading">
              <div class="placeholder-icon spinner">⟳</div>
              <p>Generating your image… this may take a moment</p>
            </div>
            <img
              v-if="generatedImageUrl && !generatingImage"
              :src="generatedImageUrl"
              class="generated-image"
              alt="Generated image"
            />
          </div>

        </div>

        <!-- Gallery of previous generations -->
        <div v-if="imageHistory.length > 0" class="image-history">
          <h3>Previous Generations</h3>
          <div class="history-grid">
            <div v-for="(img, i) in imageHistory" :key="i" class="history-item" @click="selectHistoryImage(img)">
              <img :src="img.url" alt="Generated" />
            </div>
          </div>
        </div>

      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted } from 'vue'
import api from '../services/api.js'
import { useAuthStore } from '../stores/auth.js'

const authStore = useAuthStore()

// ── Tab state ──────────────────────────────────────────────
const activeTab = ref('chat')

// ── Chat state ─────────────────────────────────────────────
const messages = ref([])
const input = ref('')
const loading = ref(false)
const streamedText = ref('')
const chatWindow = ref(null)
const inputEl = ref(null)

// ── Image generator state ──────────────────────────────────
const imagePrompt      = ref('')
const generatingImage  = ref(false)
const genError         = ref(null)
const genSuccess       = ref(null)
const generatedImageUrl = ref(null)
const genMode          = ref('image')
const postingImage     = ref(false)
const imageHistory     = ref([])

const suggestions = [
  'How do I add friends?',
  'How does the Alpaca game work?',
  'What are achievements?',
  'How do I manage my alpaca farm?',
]

onMounted(() => inputEl.value?.focus())

function timeNow() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function renderMarkdown(text) {
  // Lightweight markdown: bold, italic, inline code, code blocks, lists
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^[-*] (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
    .replace(/\n/g, '<br>')
}

async function scrollToBottom() {
  await nextTick()
  if (chatWindow.value) {
    chatWindow.value.scrollTop = chatWindow.value.scrollHeight
  }
}

function sendSuggestion(text) {
  input.value = text
  sendMessage()
}

async function generateImage() {
  genError.value = null
  genSuccess.value = null
  generatingImage.value = true
  generatedImageUrl.value = null
  try {
    const endpoint = genMode.value === 'avatar'
      ? '/users/me/generate-avatar'
      : '/users/me/generate-image'
    const res = await api.post(endpoint, { prompt: imagePrompt.value })

    if (genMode.value === 'avatar') {
      authStore.user = { ...authStore.user, ...res.data.user }
      generatedImageUrl.value = res.data.avatarUrl
      genSuccess.value = 'Avatar generated and saved as your profile picture! 🎉'
    } else {
      generatedImageUrl.value = res.data.imageUrl
      genSuccess.value = 'Image generated! Download it or share it as a post.'
    }
    imageHistory.value.unshift({ url: generatedImageUrl.value, prompt: imagePrompt.value })
    if (imageHistory.value.length > 12) imageHistory.value.pop()
    imagePrompt.value = ''
  } catch (e) {
    genError.value = e.response?.data?.error?.message || 'Failed to generate image. Try again.'
  } finally {
    generatingImage.value = false
  }
}

async function postImage() {
  if (!generatedImageUrl.value) return
  postingImage.value = true
  try {
    await api.post('/posts', {
      content: `🎨 AI-generated image`,
      imageUrl: generatedImageUrl.value,
      isPublic: true,
    })
    genSuccess.value = 'Image shared as a post! 🎉'
  } catch (e) {
    genError.value = e.response?.data?.error?.message || 'Failed to create post.'
  } finally {
    postingImage.value = false
  }
}

async function setAsAvatar() {
  if (!generatedImageUrl.value) return
  try {
    await api.put('/users/me', { avatar: generatedImageUrl.value })
    authStore.user = { ...authStore.user, avatar: generatedImageUrl.value }
    genSuccess.value = 'Set as your profile avatar! 🎉'
  } catch (e) {
    genError.value = e.response?.data?.error?.message || 'Failed to set avatar.'
  }
}

async function downloadImage() {
  if (!generatedImageUrl.value) return
  try {
    const response = await fetch(generatedImageUrl.value)
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = generatedImageUrl.value.split('/').pop() || 'generated-image.png'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch {
    genError.value = 'Failed to download image.'
  }
}

function selectHistoryImage(img) {
  generatedImageUrl.value = img.url
  genSuccess.value = null
  genError.value = null
}

async function sendMessage() {
  const text = input.value.trim()
  if (!text || loading.value) return

  messages.value.push({ role: 'user', content: text, time: timeNow() })
  input.value = ''
  loading.value = true
  streamedText.value = ''
  await scrollToBottom()

  // Build request: current message + prior history
  const history = messages.value.slice(0, -1).map(({ role, content }) => ({ role, content }))

  try {
    // Try streaming first
    const token = localStorage.getItem('accessToken')
    const res = await fetch('/api/help/chat/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ message: text, history }),
    })

    if (!res.ok) {
      // Fall back to non-streaming
      const fallback = await api.post('/help/chat', { message: text, history })
      messages.value.push({ role: 'assistant', content: fallback.data.reply, time: timeNow() })
      await scrollToBottom()
      return
    }

    // Stream the response
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let fullText = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop()

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data: ')) continue
        const payload = trimmed.slice(6)
        if (payload === '[DONE]') continue
        try {
          const parsed = JSON.parse(payload)
          if (parsed.token) {
            fullText += parsed.token
            streamedText.value = fullText
            await scrollToBottom()
          }
        } catch { /* skip */ }
      }
    }

    if (fullText) {
      messages.value.push({ role: 'assistant', content: fullText, time: timeNow() })
    } else {
      messages.value.push({ role: 'assistant', content: 'Sorry, I couldn\'t generate a response. Please try again.', time: timeNow() })
    }
  } catch {
    messages.value.push({ role: 'assistant', content: 'Something went wrong. Please check your connection and try again.', time: timeNow() })
  } finally {
    loading.value = false
    streamedText.value = ''
    await scrollToBottom()
    inputEl.value?.focus()
  }
}
</script>

<style scoped>
/* ── Page layout ─────────────────────────────────────────── */
.help-page {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 60px);
  max-width: 1200px;
  margin: 0 auto;
  padding: 0.75rem 1rem;
  box-sizing: border-box;
}

/* ── Tab bar ─────────────────────────────────────────────── */
.tab-bar {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
  margin-bottom: 0.75rem;
}

.tab-btn {
  padding: 0.6rem 1.5rem;
  background: var(--bg-secondary, #12121a);
  border: 1px solid var(--border-color, #2a2a3a);
  color: var(--text-secondary, #a0a0b0);
  border-radius: 10px 10px 0 0;
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 600;
  transition: all 0.2s;
}

.tab-btn.active {
  background: var(--bg-tertiary, #1a1a2a);
  border-bottom-color: transparent;
  color: var(--primary, #00f0ff);
}

.tab-btn:hover:not(.active) {
  color: #ccc;
}

/* ── Tab content ─────────────────────────────────────────── */
.tab-content {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

/* ── Chat column ─────────────────────────────────────────── */
.help-container {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.help-header {
  text-align: center;
  padding: 0.5rem 0;
  flex-shrink: 0;
}

.help-header h1 {
  margin: 0;
  font-size: 1.5rem;
  color: var(--primary, #00f0ff);
}

.help-subtitle {
  margin: 0.25rem 0 0;
  color: var(--text-secondary, #a0a0b0);
  font-size: 0.85rem;
}

.chat-window {
  flex: 1;
  overflow-y: auto;
  padding: 1rem 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-height: 0;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  color: var(--text-secondary, #a0a0b0);
  gap: 0.75rem;
}

.empty-icon { font-size: 3rem; opacity: 0.5; }

.suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: center;
  margin-top: 0.5rem;
}

.suggestion-btn {
  background: var(--bg-secondary, #12121a);
  border: 1px solid var(--border-color, #2a2a3a);
  color: var(--text-secondary, #a0a0b0);
  padding: 0.5rem 0.75rem;
  border-radius: 20px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;
}

.suggestion-btn:hover {
  border-color: var(--primary, #00f0ff);
  color: var(--primary, #00f0ff);
}

/* ── Messages ────────────────────────────────────────────── */
.message {
  display: flex;
  gap: 0.6rem;
  max-width: 85%;
  animation: fadeIn 0.2s ease-in;
}

.message.user { align-self: flex-end; flex-direction: row-reverse; }
.message.assistant { align-self: flex-start; }

.message-avatar { font-size: 1.4rem; flex-shrink: 0; width: 2rem; text-align: center; }

.message-body { display: flex; flex-direction: column; gap: 0.2rem; }

.message-content {
  padding: 0.65rem 0.9rem;
  border-radius: 12px;
  font-size: 0.9rem;
  line-height: 1.5;
  word-break: break-word;
}

.message.user .message-content {
  background: #1a2a4e;
  color: #e0e0e0;
  border-bottom-right-radius: 4px;
}

.message.assistant .message-content {
  background: var(--bg-secondary, #12121a);
  border: 1px solid var(--border-color, #2a2a3a);
  color: #e0e0e0;
  border-bottom-left-radius: 4px;
}

.message-content :deep(code) { background: #0a0a14; padding: 0.15rem 0.35rem; border-radius: 3px; font-size: 0.83rem; }
.message-content :deep(pre) { background: #0a0a14; padding: 0.6rem; border-radius: 6px; overflow-x: auto; margin: 0.4rem 0; }
.message-content :deep(pre code) { background: none; padding: 0; }
.message-content :deep(ul) { margin: 0.3rem 0; padding-left: 1.2rem; }
.message-content :deep(strong) { color: var(--primary, #00f0ff); }

.message-time { font-size: 0.65rem; color: #555; padding: 0 0.4rem; }
.message.user .message-time { text-align: right; }

.typing { white-space: pre-wrap; }
.cursor { animation: blink 0.8s step-end infinite; color: var(--primary, #00f0ff); }

.dots span { animation: dot-pulse 1.4s infinite ease-in-out; font-size: 1.2rem; color: var(--text-secondary, #a0a0b0); }
.dots span:nth-child(2) { animation-delay: 0.2s; }
.dots span:nth-child(3) { animation-delay: 0.4s; }

/* ── Input bar ───────────────────────────────────────────── */
.chat-input-bar { display: flex; gap: 0.5rem; padding: 0.75rem 0; flex-shrink: 0; }

.chat-input-bar input {
  flex: 1;
  background: var(--bg-secondary, #12121a);
  border: 1px solid var(--border-color, #2a2a3a);
  color: #e0e0e0;
  padding: 0.7rem 1rem;
  border-radius: 24px;
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.2s;
}

.chat-input-bar input:focus { border-color: var(--primary, #00f0ff); }
.chat-input-bar input:disabled { opacity: 0.5; }

.send-btn {
  width: 42px; height: 42px; border-radius: 50%; border: none;
  background: var(--primary, #00f0ff); color: #0a0a14; font-size: 1.1rem;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: opacity 0.2s;
}

.send-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.send-btn:hover:not(:disabled) { opacity: 0.85; }

/* ══════════ IMAGE GENERATOR TAB ══════════════════════════ */
.image-gen-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.image-gen-header {
  text-align: center;
  padding: 0.5rem 0;
  flex-shrink: 0;
}

.image-gen-header h1 {
  margin: 0;
  font-size: 1.5rem;
  color: var(--primary, #00f0ff);
}

.image-gen-subtitle {
  margin: 0.25rem 0 0;
  color: var(--text-secondary, #a0a0b0);
  font-size: 0.85rem;
}

.image-gen-body {
  flex: 1;
  display: flex;
  gap: 1.5rem;
  min-height: 0;
  overflow: hidden;
}

/* ── Controls column ── */
.image-controls {
  width: 320px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  overflow-y: auto;
}

.gen-label { font-size: 0.85rem; color: #999; font-weight: 600; }

.gen-textarea {
  padding: 0.6rem 0.85rem;
  background: var(--bg-tertiary, #1a1a2a);
  border: 1px solid var(--border-color, #2a2a3a);
  border-radius: 8px;
  color: inherit;
  font-family: inherit;
  font-size: 0.88rem;
  resize: vertical;
  outline: none;
}

.gen-textarea:focus { border-color: var(--primary, #00f0ff); }

.gen-mode-row {
  display: flex;
  gap: 1rem;
}

.gen-mode-item {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.85rem;
  color: #bbb;
  cursor: pointer;
}

.gen-mode-item input[type="radio"] { accent-color: var(--primary, #00f0ff); }

.gen-btn {
  padding: 0.65rem 1.2rem;
  background: var(--primary, #00f0ff);
  color: #0a0a0f;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.95rem;
  transition: opacity 0.2s;
}

.gen-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.gen-btn:hover:not(:disabled) { opacity: 0.85; }

.gen-hint { font-size: 0.76rem; color: #666; line-height: 1.4; }
.gen-hint.warn { color: var(--warning, #ffaa00); }
.gen-error { font-size: 0.82rem; color: var(--danger, #ff006e); }
.gen-success { font-size: 0.82rem; color: var(--success, #00ff88); }

/* ── Action buttons ── */
.image-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.action-btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.85rem;
  text-decoration: none;
  text-align: center;
  transition: opacity 0.2s;
}

.action-btn:hover { opacity: 0.85; }
.action-btn:disabled { opacity: 0.45; cursor: not-allowed; }

.download-btn { background: var(--success, #00ff88); color: #0a0a0f; }
.post-btn { background: var(--primary, #00f0ff); color: #0a0a0f; }
.avatar-btn { background: #9b59b6; color: #fff; }

/* ── Image display area ── */
.image-display {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-secondary, #12121a);
  border: 1px solid var(--border-color, #2a2a3a);
  border-radius: 12px;
  overflow: hidden;
}

.image-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  color: var(--text-secondary, #a0a0b0);
}

.placeholder-icon { font-size: 4rem; opacity: 0.4; }

.generated-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: 8px;
}

/* ── History gallery ── */
.image-history {
  flex-shrink: 0;
  padding-top: 1rem;
}

.image-history h3 {
  margin: 0 0 0.5rem;
  font-size: 0.9rem;
  color: var(--text-secondary, #a0a0b0);
}

.history-grid {
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
  padding-bottom: 0.5rem;
}

.history-item {
  width: 80px;
  height: 80px;
  flex-shrink: 0;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid transparent;
  transition: border-color 0.2s;
}

.history-item:hover { border-color: var(--primary, #00f0ff); }
.history-item img { width: 100%; height: 100%; object-fit: cover; }

/* ── Responsive ──────────────────────────────────────────── */
@media (max-width: 768px) {
  .image-gen-body {
    flex-direction: column;
  }
  .image-controls {
    width: auto;
  }
  .image-display {
    min-height: 300px;
  }
}

/* ── Animations ──────────────────────────────────────────── */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes blink { 50% { opacity: 0; } }

@keyframes dot-pulse {
  0%, 80%, 100% { opacity: 0.2; }
  40% { opacity: 1; }
}

@keyframes spin { to { transform: rotate(360deg); } }

.spinner { display: inline-block; animation: spin 0.7s linear infinite; }
</style>
