<!--
  Messages View — DM conversations and group chat rooms
  @owner ValGSgit
-->
<template>
  <div class="messages-page">
    <!-- Sidebar for DMs and Rooms -->
    <aside class="sidebar">
      <div class="sidebar-tabs">
        <button :class="['stab', { active: sideTab === 'dms' }]" @click="sideTab = 'dms'">DMs</button>
        <button :class="['stab', { active: sideTab === 'rooms' }]" @click="sideTab = 'rooms'">Rooms</button>
      </div>
      <div v-if="sideTab === 'dms'">
        <div class="new-dm">
          <input v-model="newDmId" type="number" placeholder="User ID" />
          <button class="btn-sm btn-primary" @click="openDm">Open</button>
        </div>
        <ul class="conv-list">
          <li v-for="c in conversations" :key="c.other_user_id" :class="['conv-item', { active: selected?.type === 'dm' && selected.id === c.other_user_id }]" @click="selectDm(c)">
            <img :src="c.avatar || '/avatars/default.svg'" class="mini-avatar" alt="" />
            <div class="conv-info">
              <span class="conv-name">{{ c.username }}</span>
              <span class="conv-preview">{{ c.last_message || '…' }}</span>
            </div>
            <span v-if="c.unread_count" class="unread-badge">{{ c.unread_count }}</span>
          </li>
        </ul>
        <p v-if="!conversations.length && !loading" class="empty">No conversations yet.</p>
      </div>
      <div v-if="sideTab === 'rooms'">
        <button class="btn-sm btn-primary create-room-btn" @click="showCreateRoom = !showCreateRoom">+ New Room</button>
        <div v-if="showCreateRoom" class="new-room-form">
          <input v-model="newRoomName" type="text" placeholder="Room name" />
          <button class="btn-sm btn-primary" @click="createRoom">Create</button>
        </div>
        <ul class="conv-list">
          <li v-for="r in rooms" :key="r.id" :class="['conv-item', { active: selected?.type === 'room' && selected.id === r.id }]" @click="selectRoom(r)">
            <div class="room-icon">#</div>
            <div class="conv-info">
              <span class="conv-name">{{ r.name }}</span>
            </div>
          </li>
        </ul>
        <p v-if="!rooms.length && !loading" class="empty">No rooms yet.</p>
      </div>
    </aside>
    <!-- Main chat area -->
    <main class="chat-area">
      <div v-if="!selected" class="no-selection">
        <p>Select a conversation or room to start chatting.</p>
        <p class="hint">Real-time messaging via WebSocket — connect and send via the socket service.</p>
      </div>
      <template v-else>
        <header class="chat-header">
          <span class="chat-title">
            {{ selected.type === 'dm' ? selected.username : `# ${selected.name}` }}
          </span>
          <div v-if="selected.type === 'room'" class="room-actions">
            <button class="btn-sm" @click="leaveRoom">Leave</button>
            <button class="btn-sm btn-danger" @click="deleteRoom" v-if="selected.owner_id === currentUserId">Delete</button>
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
const rooms = ref([])
const selected = ref(null)
const messages = ref([])
const loading = ref(false)
const loadingMessages = ref(false)
const msgError = ref(null)
const newMessage = ref('')
const newDmId = ref('')
const newRoomName = ref('')
const showCreateRoom = ref(false)
const msgBox = ref(null)

function formatTime(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

async function fetchConversations() {
  loading.value = true
  try {
    const { data } = await api.get('/chat/conversations')
    conversations.value = data.conversations
  } catch {
    // fail silently
  } finally {
    loading.value = false
  }
}

async function fetchRooms() {
  try {
    const { data } = await api.get('/chat/rooms')
    rooms.value = data.rooms
  } catch {}
}

async function selectDm(c) {
  selected.value = { type: 'dm', id: c.other_user_id, username: c.username }
  await loadDmMessages(c.other_user_id)
}

async function openDm() {
  if (!newDmId.value) return
  selected.value = { type: 'dm', id: Number(newDmId.value), username: `User #${newDmId.value}` }
  await loadDmMessages(Number(newDmId.value))
  newDmId.value = ''
}

async function loadDmMessages(userId) {
  loadingMessages.value = true
  msgError.value = null
  try {
    const { data } = await api.get(`/chat/dm/${userId}`)
    messages.value = data.messages
  } catch (e) {
    msgError.value = e.response?.data?.error?.message || 'Failed to load messages'
  } finally {
    loadingMessages.value = false
  }
}

async function selectRoom(r) {
  selected.value = { type: 'room', ...r }
  await loadRoomMessages(r.id)
}

async function loadRoomMessages(roomId) {
  loadingMessages.value = true
  msgError.value = null
  try {
    const { data } = await api.get(`/chat/rooms/${roomId}/messages`)
    messages.value = data.messages
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
    connectSocket(localStorage.getItem('accessToken'))
    return
  }

  newMessage.value = ''

  if (selected.value.type === 'dm') {
    socket.emit('dm:send', { receiverId: selected.value.id, content }, (ack) => {
      if (ack?.error) {
        msgError.value = ack.error
      } else if (ack?.message) {
        messages.value.push(ack.message)
        scrollToBottom()
      }
    })
  } else {
    socket.emit('room:send', { roomId: selected.value.id, content }, (ack) => {
      if (ack?.error) {
        msgError.value = ack.error
      } else if (ack?.message) {
        messages.value.push(ack.message)
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
  const token = localStorage.getItem('accessToken')
  if (!token) return

  connectSocket(token)

  socket.on('connect', () => {
    msgError.value = null
  })
  socket.on('disconnect', () => {})
  socket.on('connect_error', (err) => {
    msgError.value = `Socket error: ${err.message}`
  })
  socket.on('dm:message', (data) => {
    const message = data.id ? data : data.message
    if (
      selected.value?.type === 'dm' &&
      (message.sender_id === selected.value.id || message.receiver_id === selected.value.id)
    ) {
      // Avoid duplicates (sender echo)
      if (!messages.value.some(m => m.id === message.id)) {
        messages.value.push(message)
        scrollToBottom()
      }
    }
    fetchConversations()
  })
  socket.on('room:message', (data) => {
    const message = data.id ? data : data.message
    if (selected.value?.type === 'room' && message.room_id === selected.value.id) {
      if (!messages.value.some(m => m.id === message.id)) {
        messages.value.push(message)
        scrollToBottom()
      }
    }
  })
}

async function createRoom() {
  if (!newRoomName.value.trim()) return
  try {
    await api.post('/chat/rooms', { name: newRoomName.value.trim() })
    newRoomName.value = ''
    showCreateRoom.value = false
    await fetchRooms()
  } catch (e) {
    msgError.value = e.response?.data?.error?.message || 'Failed to create room'
  }
}

async function leaveRoom() {
  if (!selected.value) return
  try {
    await api.delete(`/chat/rooms/${selected.value.id}/members/${currentUserId.value}`)
    selected.value = null
    messages.value = []
    await fetchRooms()
  } catch (e) {
    msgError.value = e.response?.data?.error?.message || 'Failed to leave room'
  }
}

async function deleteRoom() {
  if (!selected.value) return
  try {
    await api.delete(`/chat/rooms/${selected.value.id}`)
    selected.value = null
    messages.value = []
    await fetchRooms()
  } catch (e) {
    msgError.value = e.response?.data?.error?.message || 'Failed to delete room'
  }
}

onMounted(() => {
  fetchConversations()
  fetchRooms()
  setupSocket()
})

onUnmounted(() => {
  if (socket) {
    socket.off('connect')
    socket.off('disconnect')
    socket.off('connect_error')
    socket.off('dm:message')
    socket.off('room:message')
  }
  disconnectSocket()
})
</script>

<style scoped>
/* ...existing styles... */

/* ── Sidebar ── */
.sidebar {
  background: var(--bg-secondary, #12121a);
  border-right: 1px solid var(--border-color, #2a2a3a);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.sidebar-tabs { display: flex; border-bottom: 1px solid var(--border-color, #2a2a3a); }
.stab {
  flex: 1; padding: 0.6rem; background: none; border: none; cursor: pointer;
  color: var(--text-secondary, #a0a0b0); font-size: 0.9rem;
}
.stab.active { color: var(--primary, #00f0ff); border-bottom: 2px solid var(--primary, #00f0ff); }

.new-dm {
  display: flex; gap: 0.4rem; padding: 0.6rem;
  border-bottom: 1px solid var(--border-color, #2a2a3a);
}
.new-dm input, .new-room-form input {
  flex: 1; padding: 0.35rem 0.5rem;
  background: var(--bg-tertiary, #1a1a2a);
  border: 1px solid var(--border-color, #2a2a3a);
  border-radius: 5px; color: inherit; font-size: 0.85rem;
}
.create-room-btn { margin: 0.6rem; }
.new-room-form { display: flex; gap: 0.4rem; padding: 0 0.6rem 0.6rem; }

.conv-list { list-style: none; overflow-y: auto; flex: 1; }
.conv-item {
  display: flex; align-items: center; gap: 0.6rem;
  padding: 0.55rem 0.75rem; cursor: pointer;
  border-bottom: 1px solid var(--border-color, #2a2a3a);
}
.conv-item:hover, .conv-item.active { background: var(--bg-tertiary, #1a1a2a); }
.mini-avatar { width: 34px; height: 34px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
.room-icon { width: 34px; height: 34px; border-radius: 8px; background: var(--bg-tertiary, #1a1a2a); display: grid; place-items: center; color: var(--primary, #00f0ff); font-weight: 700; flex-shrink: 0; }
.conv-info { flex: 1; overflow: hidden; }
.conv-name { display: block; font-weight: 500; font-size: 0.9rem; }
.conv-preview { display: block; font-size: 0.8rem; color: #666; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.unread-badge { background: var(--primary, #00f0ff); color: #0a0a0f; border-radius: 10px; font-size: 0.7rem; padding: 1px 6px; font-weight: 700; }

/* ── Chat area ── */
.chat-area { display: flex; flex-direction: column; background: var(--bg-primary, #0a0a0f); }
.no-selection { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #666; gap: 0.5rem; }
.hint { font-size: 0.85rem; }

.chat-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border-color, #2a2a3a);
  background: var(--bg-secondary, #12121a);
}
.chat-title { font-weight: 600; color: var(--primary, #00f0ff); }
.socket-badge { font-size: 0.7rem; padding: 0.15rem 0.5rem; border-radius: 10px; font-weight: 600; text-transform: uppercase; }
.socket-badge.connected    { background: rgba(0,255,136,0.15); color: var(--success, #00ff88); }
.socket-badge.connecting   { background: rgba(255,234,0,0.15);  color: var(--warning, #ffea00); }
.socket-badge.disconnected { background: rgba(160,160,176,0.15); color: #666; }
.socket-badge.error        { background: rgba(255,0,110,0.15);  color: var(--danger, #ff006e); }
.room-actions { display: flex; gap: 0.4rem; }

.messages-list { flex: 1; overflow-y: auto; padding: 1rem; display: flex; flex-direction: column; gap: 0.6rem; }
.msg { display: flex; align-items: baseline; gap: 0.5rem; }
.msg.mine { flex-direction: row-reverse; }
.msg-author { font-size: 0.78rem; color: var(--primary, #00f0ff); font-weight: 600; white-space: nowrap; }
.msg-content { background: var(--bg-tertiary, #1a1a2a); padding: 0.4rem 0.75rem; border-radius: 8px; font-size: 0.9rem; max-width: 70%; word-break: break-word; }
.msg.mine .msg-content { background: rgba(0,240,255,0.12); }
.msg-time { font-size: 0.72rem; color: #555; white-space: nowrap; }

.message-form {
  display: flex; gap: 0.6rem; padding: 0.75rem 1rem;
  border-top: 1px solid var(--border-color, #2a2a3a);
}
.message-form input {
  flex: 1; padding: 0.5rem 0.75rem;
  background: var(--bg-tertiary, #1a1a2a);
  border: 1px solid var(--border-color, #2a2a3a);
  border-radius: 6px; color: inherit;
}
.socket-note { font-size: 0.75rem; color: #555; padding: 0 1rem 0.5rem; }

.btn-primary {
  padding: 0.4rem 1rem; background: var(--primary, #00f0ff); color: #0a0a0f;
  border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 0.85rem;
}
.btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-sm { padding: 0.3rem 0.6rem; border-radius: 5px; border: 1px solid var(--border-color, #2a2a3a); background: transparent; color: inherit; cursor: pointer; font-size: 0.82rem; }
.btn-sm.btn-primary { background: var(--primary, #00f0ff); color: #0a0a0f; border: none; }
.btn-danger { border-color: var(--danger, #ff006e); color: var(--danger, #ff006e); }

.empty { color: #555; font-style: italic; text-align: center; padding: 1rem 0; }
.loading { color: #999; padding: 0.5rem 0; }
.error-banner {
  padding: 0.5rem 1rem; background: rgba(255,0,110,0.1);
  border-bottom: 1px solid var(--danger, #ff006e); color: var(--danger, #ff006e); font-size: 0.85rem;
}
</style>
