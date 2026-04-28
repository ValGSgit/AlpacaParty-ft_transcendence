<!--
  Messages View — DM conversations
  @owner ValGSgit
-->
<template>
  <div class="messages-page">
    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="sidebar-tabs">
        <button :class="['stab', { active: sideTab === 'dms' }]" @click="sideTab = 'dms'">
          DMs
          <span v-if="totalUnread" class="tab-badge">{{ totalUnread }}</span>
        </button>
      </div>

      <!-- DMs panel -->
      <div v-if="sideTab === 'dms'" class="sidebar-panel">
        <!-- Search friends -->
        <div class="search-bar">
          <input v-model="friendSearch" type="text" placeholder="Search friends…" class="sidebar-input" />
        </div>

        <!-- Existing conversations -->
        <div v-if="filteredConversations.length" class="section-label">Recent</div>
        <ul class="conv-list">
          <li
            v-for="c in filteredConversations"
            :key="c.other_user_id"
            :class="['conv-item', { active: selected?.type === 'dm' && selected.id === c.other_user_id }]"
            @click="selectConv(c)"
          >
            <img :src="c.avatar || '/avatars/default.svg'" class="mini-avatar" alt="" />
            <div class="conv-info">
              <span class="conv-name">{{ c.username }}</span>
              <span class="conv-preview">{{ c.last_message || '…' }}</span>
            </div>
            <span v-if="c.unread_count" class="unread-badge">{{ c.unread_count }}</span>
          </li>
        </ul>

        <!-- Friends list -->
        <div class="section-label">Friends</div>
        <p v-if="loadingFriends" class="loading small">Loading…</p>
        <p v-else-if="!filteredFriends.length && friendSearch" class="empty small">No matches</p>
        <ul v-else class="conv-list">
          <li
            v-for="f in filteredFriends"
            :key="f.id"
            :class="['conv-item', { active: selected?.type === 'dm' && selected.id === f.id }]"
            @click="openDmWithFriend(f)"
          >
            <div class="avatar-wrap">
              <img :src="f.avatar || '/avatars/default.svg'" class="mini-avatar" alt="" />
              <span :class="['online-dot', { online: f.is_online }]"></span>
            </div>
            <div class="conv-info">
              <span class="conv-name">{{ f.username }}</span>
              <span class="conv-preview">{{ f.is_online ? 'Online' : 'Offline' }}</span>
            </div>
          </li>
          <li v-if="!filteredFriends.length && !friendSearch" class="conv-item empty-friend">
            <span class="empty small">Add some friend!</span>
          </li>
        </ul>

        <!-- Recommended users (non-friends) -->
        <template v-if="recommendedUsers.length && !friendSearch">
          <div class="section-label">People you may know</div>
          <ul class="conv-list">
            <li
              v-for="u in recommendedUsers"
              :key="u.id"
              class="conv-item"
              @click="openDmWithUser(u)"
            >
              <img :src="u.avatar || '/avatars/default.svg'" class="mini-avatar" alt="" />
              <div class="conv-info">
                <span class="conv-name">{{ u.username }}</span>
                <span class="conv-preview">Start a conversation</span>
              </div>
            </li>
          </ul>
        </template>
      </div>
    </aside>

    <!-- Chat area -->
    <main class="chat-area">
      <div v-if="!selected" class="no-selection">
        <p>Select a conversation to start chatting.</p>
        <p class="hint">Click a friend on the left to start a DM.</p>
      </div>
      <template v-else>
        <header class="chat-header">
          <div class="chat-title-wrap">
            <img
              v-if="selected.type === 'dm'"
              :src="selected.avatar || '/avatars/default.svg'"
              class="chat-avatar"
              alt=""
            />
            <span class="chat-title">
              {{ selected.type === 'dm' ? selected.username : `# ${selected.name}` }}
            </span>
          </div>
        </header>

        <div v-if="msgError" class="error-banner">{{ msgError }}</div>

        <div class="messages-list" ref="msgBox">
          <p v-if="loadingMessages" class="loading">Loading messages…</p>
          <div v-for="m in messages" :key="m.id" :class="['msg', { mine: m.sender_id === currentUserId }]">
            <span class="msg-author">{{ m.sender_username || m.username }}</span>
            <span class="msg-content">{{ m.content }}</span>
            <span class="msg-time">{{ formatTime(m.created_at) }}</span>
          </div>
          <p v-if="!messages.length && !loadingMessages" class="empty">No messages yet.</p>
        </div>

        <form class="message-form" @submit.prevent="sendMessage">
          <input v-model="newMessage" type="text" placeholder="Type a message…" autocomplete="off" />
          <button type="submit" class="btn-primary" :disabled="!newMessage.trim()">Send</button>
        </form>
      </template>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useAuthStore } from '../stores/auth.js'
import api from '../services/api.js'
import { socket, connectSocket, disconnectSocket } from '../services/socket.js'

const authStore = useAuthStore()
const currentUserId = computed(() => authStore.user?.id)

const sideTab = ref('dms')
const conversations = ref([])
const friends = ref([])
const recommendedUsers = ref([])
const selected = ref(null)
const messages = ref([])
const loading = ref(false)
const loadingFriends = ref(false)
const loadingMessages = ref(false)
const msgError = ref(null)
const newMessage = ref('')
const newRoomName = ref('')
const showCreateRoom = ref(false)
const showAddMember = ref(false)
const selectedMembers = ref([])
const friendSearch = ref('')
const msgBox = ref(null)

const totalUnread = computed(() =>
  conversations.value.reduce((sum, c) => sum + (c.unread_count || 0), 0)
)

const filteredConversations = computed(() => {
  if (!friendSearch.value) return conversations.value
  const q = friendSearch.value.toLowerCase()
  return conversations.value.filter(c => c.username?.toLowerCase().includes(q))
})

const filteredFriends = computed(() => {
  const convIds = new Set(conversations.value.map(c => c.other_user_id))
  const base = friends.value.filter(f => !convIds.has(f.id))
  if (!friendSearch.value) return base
  const q = friendSearch.value.toLowerCase()
  return base.filter(f => f.username?.toLowerCase().includes(q))
})

function formatTime(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

async function fetchConversations() {
  loading.value = true
  try {
    const { data } = await api.get('/chat/conversations')
    conversations.value = data.conversations || []
  } catch {
    // fail silently
  } finally {
    loading.value = false
  }
}

async function fetchFriends() {
  loadingFriends.value = true
  try {
    const { data } = await api.get('/friends')
    friends.value = data.friends || []
  } catch {} finally {
    loadingFriends.value = false
  }
}

async function fetchRecommended() {
  try {
    const { data } = await api.get('/users?limit=10')
    const friendIds = new Set(friends.value.map(f => f.id))
    friendIds.add(currentUserId.value)
    recommendedUsers.value = (data.users || []).filter(u => !friendIds.has(u.id)).slice(0, 5)
  } catch {}
}

function selectConv(c) {
  selected.value = { type: 'dm', id: c.other_user_id, username: c.username, avatar: c.avatar }
  loadDmMessages(c.other_user_id)
}

function openDmWithFriend(f) {
  selected.value = { type: 'dm', id: f.id, username: f.username, avatar: f.avatar }
  loadDmMessages(f.id)
}

function openDmWithUser(u) {
  selected.value = { type: 'dm', id: u.id, username: u.username, avatar: u.avatar }
  loadDmMessages(u.id)
}

async function loadDmMessages(userId) {
  if (userId === currentUserId.value) {
    msgError.value = 'Cannot message yourself'
    messages.value = []
    return
  }
  loadingMessages.value = true
  msgError.value = null
  try {
    const { data } = await api.get(`/chat/dm/${userId}`)
    messages.value = data.messages || []
    await nextTick()
    scrollToBottom()
  } catch (e) {
    msgError.value = e.response?.data?.error?.message || 'Failed to load messages'
  } finally {
    loadingMessages.value = false
  }
}

function sendMessage() {
  const content = newMessage.value.trim()
  if (!content || !selected.value) return

  if (!socket.connected) {
    msgError.value = 'Not connected. Reconnecting…'
    connectSocket()
    return
  }

  newMessage.value = ''

  if (selected.value.type === 'dm') {
    socket.emit('dm:send', { receiverId: selected.value.id, content }, (ack) => {
      if (ack?.error) {
        msgError.value = ack.error
      } else if (ack?.message) {
        scrollToBottom()
      }
    })
  }
}

function scrollToBottom() {
  nextTick(() => {
    if (msgBox.value) msgBox.value.scrollTop = msgBox.value.scrollHeight
  })
}

function setupSocket() {
  connectSocket()

  socket.on('connect', () => { msgError.value = null })
  socket.on('disconnect', () => {})
  socket.on('connect_error', (err) => { msgError.value = `Socket error: ${err.message}` })

  socket.on('dm:message', (data) => {
    const message = data.id ? data : data.message
    if (
      selected.value?.type === 'dm' &&
      (message.sender_id === selected.value.id || message.receiver_id === selected.value.id)
    ) {
      if (!messages.value.some(m => m.id === message.id)) {
        messages.value.push(message)
        scrollToBottom()
      }
    }
    fetchConversations()
  })
}

onMounted(async () => {
  await Promise.all([fetchConversations(), fetchFriends()])
  await fetchRecommended()
  setupSocket()
})

onUnmounted(() => {
  if (socket) {
    socket.off('connect')
    socket.off('disconnect')
    socket.off('connect_error')
    socket.off('dm:message')
  }
  disconnectSocket()
})
</script>

<style scoped>
.messages-page {
  display: grid;
  grid-template-columns: 280px 1fr;
  overflow: hidden;
  height: 100%;
  min-height: 0;
}

/* ── Sidebar ── */
.sidebar {
  background: var(--bg-secondary, #12121a);
  border-right: 1px solid var(--border-color, #2a2a3a);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar-tabs {
  display: flex;
  border-bottom: 1px solid var(--border-color, #2a2a3a);
  flex-shrink: 0;
}

.stab {
  flex: 1;
  padding: 0.6rem;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-secondary, #a0a0b0);
  font-size: 0.9rem;
  position: relative;
}
.stab.active {
  color: var(--primary, #00f0ff);
  border-bottom: 2px solid var(--primary, #00f0ff);
}
.tab-badge {
  background: var(--danger, #ff006e);
  color: #fff;
  font-size: 0.65rem;
  padding: 1px 5px;
  border-radius: 8px;
  margin-left: 4px;
}

.sidebar-panel {
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  flex: 1;
}

.search-bar {
  padding: 0.5rem 0.6rem;
  border-bottom: 1px solid var(--border-color, #2a2a3a);
}

.sidebar-input {
  width: 100%;
  padding: 0.35rem 0.5rem;
  background: var(--bg-tertiary, #1a1a2a);
  border: 1px solid var(--border-color, #2a2a3a);
  border-radius: 5px;
  color: inherit;
  font-size: 0.85rem;
  box-sizing: border-box;
}

.section-label {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-secondary, #a0a0b0);
  padding: 0.5rem 0.75rem 0.25rem;
}

.conv-list { list-style: none; }

.conv-item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  border-bottom: 1px solid var(--border-color, #2a2a3a);
  transition: background 0.15s;
}
.conv-item:hover, .conv-item.active { background: var(--bg-tertiary, #1a1a2a); }
.conv-item.empty-friend { cursor: default; }

.avatar-wrap { position: relative; flex-shrink: 0; }
.mini-avatar { width: 34px; height: 34px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
.mini-avatar-sm { width: 22px; height: 22px; border-radius: 50%; object-fit: cover; vertical-align: middle; margin-right: 4px; }

.online-dot {
  position: absolute;
  bottom: 1px;
  right: 1px;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #555;
  border: 2px solid var(--bg-secondary, #12121a);
}
.online-dot.online { background: var(--success, #00ff88); }

.conv-info { flex: 1; overflow: hidden; }
.conv-name { display: block; font-weight: 500; font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.conv-preview { display: block; font-size: 0.78rem; color: #666; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.unread-badge { background: var(--primary, #00f0ff); color: #0a0a0f; border-radius: 10px; font-size: 0.7rem; padding: 1px 6px; font-weight: 700; white-space: nowrap; }

.member-select-list {
  list-style: none;
  max-height: 120px;
  overflow-y: auto;
}
.member-select-item {
  padding: 0.25rem 0;
  font-size: 0.85rem;
}
.member-select-item label {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  cursor: pointer;
}

/* ── Chat area ── */
.chat-area {
  display: flex;
  flex-direction: column;
  background: var(--bg-primary, #0a0a0f);
  overflow: hidden;
  height: 100%;
}

.no-selection {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #666;
  gap: 0.5rem;
}
.hint { font-size: 0.85rem; }

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.65rem 1rem;
  border-bottom: 1px solid var(--border-color, #2a2a3a);
  background: var(--bg-secondary, #12121a);
  flex-shrink: 0;
}

.chat-title-wrap { display: flex; align-items: center; gap: 0.5rem; }
.chat-avatar { width: 30px; height: 30px; border-radius: 50%; object-fit: cover; }
.chat-title { font-weight: 600; color: var(--primary, #00f0ff); }


.messages-list {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  min-height: 0;
}
.msg { display: flex; align-items: baseline; gap: 0.5rem; }
.msg.mine { flex-direction: row-reverse; }
.msg-author { font-size: 0.78rem; color: var(--primary, #00f0ff); font-weight: 600; white-space: nowrap; }
.msg-content { background: var(--bg-tertiary, #1a1a2a); padding: 0.4rem 0.75rem; border-radius: 8px; font-size: 0.9rem; max-width: 70%; word-break: break-word; }
.msg.mine .msg-content { background: rgba(0,240,255,0.12); }
.msg-time { font-size: 0.72rem; color: #555; white-space: nowrap; }

.message-form {
  display: flex;
  gap: 0.6rem;
  padding: 0.75rem 1rem;
  border-top: 1px solid var(--border-color, #2a2a3a);
  flex-shrink: 0;
}
.message-form input {
  flex: 1;
  padding: 0.5rem 0.75rem;
  background: var(--bg-tertiary, #1a1a2a);
  border: 1px solid var(--border-color, #2a2a3a);
  border-radius: 6px;
  color: inherit;
}

/* Buttons */
.btn-primary { padding: 0.4rem 1rem; background: var(--primary, #00f0ff); color: #0a0a0f; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 0.85rem; }
.btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-secondary { background: var(--bg-tertiary, #1a1a2a); border: 1px solid var(--border-color, #2a2a3a); color: inherit; }
.btn-sm { padding: 0.3rem 0.6rem; border-radius: 5px; border: 1px solid var(--border-color, #2a2a3a); background: transparent; color: inherit; cursor: pointer; font-size: 0.82rem; display: inline-flex; align-items: center; gap: 0.3rem; }
.btn-sm.btn-primary { background: var(--primary, #00f0ff); color: #0a0a0f; border: none; }
.btn-sm.btn-secondary { background: var(--bg-tertiary, #1a1a2a); }
.btn-danger { border-color: var(--danger, #ff006e); color: var(--danger, #ff006e); }

/* Misc */
.empty { color: #555; font-style: italic; text-align: center; padding: 1rem 0; }
.empty.small { font-size: 0.82rem; padding: 0.4rem 0.75rem; }
.loading { color: #999; padding: 0.5rem 0; }
.loading.small { font-size: 0.82rem; padding: 0.4rem 0.75rem; }
.error-banner {
  padding: 0.5rem 1rem;
  background: rgba(255,0,110,0.1);
  border-bottom: 1px solid var(--danger, #ff006e);
  color: var(--danger, #ff006e);
  font-size: 0.85rem;
  flex-shrink: 0;
}
</style>
