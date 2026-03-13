<!--
  Friends View — manage friends, requests, and blocks
  @owner TODO
-->
<template>
  <div class="friends-page">
    <h1>Friends</h1>

    <!-- Tab bar -->
    <div class="tabs">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        :class="['tab', { active: activeTab === tab.key }]"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
        <span v-if="tab.key === 'requests' && pendingCount" class="badge">{{ pendingCount }}</span>
      </button>
    </div>

    <div v-if="error" class="error-banner">{{ error }}</div>
    <div v-if="loading" class="loading">Loading…</div>

    <!-- ── Friends ── -->
    <div v-if="activeTab === 'friends' && !loading">
      <div class="send-request">
        <input v-model="newFriendId" type="number" placeholder="User ID to add" />
        <button class="btn-primary" @click="sendRequest" :disabled="!newFriendId">
          Send Request
        </button>
      </div>

      <ul v-if="friends.length" class="user-list">
        <li v-for="f in friends" :key="f.id" class="user-row">
          <span class="online-dot" :class="{ online: f.is_online }"></span>
          <img :src="f.avatar || '/avatars/default.svg'" class="mini-avatar" alt="" />
          <span class="username">{{ f.username }}</span>
          <div class="actions">
            <button class="btn-sm btn-danger" @click="removeFriend(f.id)">Remove</button>
            <button class="btn-sm" @click="blockUser(f.id)">Block</button>
          </div>
        </li>
      </ul>
      <p v-else class="empty">No friends yet. Send a request above!</p>
    </div>

    <!-- ── Requests ── -->
    <div v-if="activeTab === 'requests' && !loading">
      <h3>Received</h3>
      <ul v-if="received.length" class="user-list">
        <li v-for="r in received" :key="r.id" class="user-row">
          <img :src="r.sender_avatar || '/avatars/default.svg'" class="mini-avatar" alt="" />
          <span class="username">{{ r.sender_username }}</span>
          <div class="actions">
            <button class="btn-sm btn-primary" @click="acceptRequest(r.id)">Accept</button>
            <button class="btn-sm btn-danger" @click="declineRequest(r.id)">Decline</button>
          </div>
        </li>
      </ul>
      <p v-else class="empty">No incoming requests.</p>

      <h3 style="margin-top:1.5rem">Sent</h3>
      <ul v-if="sent.length" class="user-list">
        <li v-for="r in sent" :key="r.id" class="user-row">
          <img :src="r.receiver_avatar || '/avatars/default.svg'" class="mini-avatar" alt="" />
          <span class="username">{{ r.receiver_username }}</span>
          <span class="status-tag">Pending</span>
        </li>
      </ul>
      <p v-else class="empty">No outgoing requests.</p>
    </div>

    <!-- ── Blocked ── -->
    <div v-if="activeTab === 'blocked' && !loading">
      <ul v-if="blocked.length" class="user-list">
        <li v-for="b in blocked" :key="b.id" class="user-row">
          <img :src="b.avatar || '/avatars/default.svg'" class="mini-avatar" alt="" />
          <span class="username">{{ b.username }}</span>
          <button class="btn-sm" @click="unblockUser(b.id)">Unblock</button>
        </li>
      </ul>
      <p v-else class="empty">No blocked users.</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import api from '../services/api.js'

const activeTab = ref('friends')
const tabs = [
  { key: 'friends',  label: 'Friends' },
  { key: 'requests', label: 'Requests' },
  { key: 'blocked',  label: 'Blocked' },
]

const friends  = ref([])
const received = ref([])
const sent     = ref([])
const blocked  = ref([])
const loading  = ref(false)
const error    = ref(null)
const newFriendId = ref('')

const pendingCount = computed(() => received.value.length)

async function fetchFriends() {
  loading.value = true
  error.value = null
  try {
    const { data } = await api.get('/friends')
    friends.value = data.friends
  } catch (e) {
    error.value = e.response?.data?.error?.message || 'Failed to load friends'
  } finally {
    loading.value = false
  }
}

async function fetchRequests() {
  loading.value = true
  error.value = null
  try {
    const { data } = await api.get('/friends/requests')
    received.value = data.received
    sent.value = data.sent
  } catch (e) {
    error.value = e.response?.data?.error?.message || 'Failed to load requests'
  } finally {
    loading.value = false
  }
}

async function fetchBlocked() {
  loading.value = true
  error.value = null
  try {
    const { data } = await api.get('/friends/blocked')
    blocked.value = data.blocked
  } catch (e) {
    error.value = e.response?.data?.error?.message || 'Failed to load blocked users'
  } finally {
    loading.value = false
  }
}

async function sendRequest() {
  try {
    await api.post('/friends/requests', { userId: Number(newFriendId.value) })
    newFriendId.value = ''
    await fetchRequests()
    activeTab.value = 'requests'
  } catch (e) {
    error.value = e.response?.data?.error?.message || 'Failed to send request'
  }
}

async function acceptRequest(id) {
  try {
    await api.put(`/friends/requests/${id}/accept`)
    await Promise.all([fetchFriends(), fetchRequests()])
    activeTab.value = 'friends'
  } catch (e) {
    error.value = e.response?.data?.error?.message || 'Failed to accept request'
  }
}

async function declineRequest(id) {
  try {
    await api.put(`/friends/requests/${id}/decline`)
    await fetchRequests()
  } catch (e) {
    error.value = e.response?.data?.error?.message || 'Failed to decline request'
  }
}

async function removeFriend(id) {
  try {
    await api.delete(`/friends/${id}`)
    await fetchFriends()
  } catch (e) {
    error.value = e.response?.data?.error?.message || 'Failed to remove friend'
  }
}

async function blockUser(id) {
  try {
    await api.post('/friends/block', { userId: id })
    await Promise.all([fetchFriends(), fetchBlocked()])
  } catch (e) {
    error.value = e.response?.data?.error?.message || 'Failed to block user'
  }
}

async function unblockUser(id) {
  try {
    await api.delete(`/friends/block/${id}`)
    await fetchBlocked()
  } catch (e) {
    error.value = e.response?.data?.error?.message || 'Failed to unblock user'
  }
}

function loadTab(tab) {
  if (tab === 'friends')  fetchFriends()
  if (tab === 'requests') fetchRequests()
  if (tab === 'blocked')  fetchBlocked()
}

watch(activeTab, loadTab)
onMounted(() => {
  fetchFriends()
  fetchRequests() // load pending count in background
})
</script>

<style scoped>
.friends-page { max-width: 700px; margin: 0 auto; }
h1 { margin-bottom: 1.25rem; color: var(--primary, #00f0ff); }
h3 { color: var(--primary, #00f0ff); margin-bottom: 0.5rem; }

.tabs { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; }
.tab {
  padding: 0.4rem 1rem;
  border: 1px solid var(--border-color, #2a2a3a);
  border-radius: 6px;
  background: transparent;
  color: var(--text-secondary, #a0a0b0);
  cursor: pointer;
  font-size: 0.9rem;
  position: relative;
}
.tab.active { background: var(--primary, #00f0ff); color: #0a0a0f; font-weight: 600; border-color: transparent; }
.badge {
  position: absolute;
  top: -6px; right: -6px;
  background: var(--danger, #ff006e);
  color: #fff;
  border-radius: 10px;
  font-size: 0.7rem;
  padding: 1px 5px;
}

.send-request { display: flex; gap: 0.75rem; margin-bottom: 1.25rem; }
.send-request input {
  flex: 1; padding: 0.5rem 0.75rem;
  background: var(--bg-tertiary, #1a1a2a);
  border: 1px solid var(--border-color, #2a2a3a);
  border-radius: 6px;
  color: inherit;
}

.user-list { list-style: none; display: flex; flex-direction: column; gap: 0.5rem; }
.user-row {
  display: flex; align-items: center; gap: 0.75rem;
  padding: 0.6rem 0.75rem;
  background: var(--bg-secondary, #12121a);
  border: 1px solid var(--border-color, #2a2a3a);
  border-radius: 8px;
}
.mini-avatar { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; }
.username { flex: 1; font-weight: 500; }
.online-dot { width: 10px; height: 10px; border-radius: 50%; background: #555; flex-shrink: 0; }
.online-dot.online { background: var(--success, #00ff88); }
.status-tag { font-size: 0.8rem; color: #999; }
.actions { display: flex; gap: 0.4rem; }

.btn-primary {
  padding: 0.45rem 1rem;
  background: var(--primary, #00f0ff);
  color: #0a0a0f;
  border: none; border-radius: 6px; cursor: pointer; font-weight: 600;
}
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-sm { padding: 0.3rem 0.7rem; border-radius: 5px; border: 1px solid var(--border-color, #2a2a3a); background: transparent; color: inherit; cursor: pointer; font-size: 0.85rem; }
.btn-sm:hover { background: var(--bg-tertiary, #1a1a2a); }
.btn-danger { border-color: var(--danger, #ff006e); color: var(--danger, #ff006e); }
.btn-danger:hover { background: rgba(255,0,110,0.1); }
.btn-sm.btn-primary { background: var(--primary, #00f0ff); color: #0a0a0f; border: none; }

.empty { color: #666; font-style: italic; padding: 1rem 0; }
.loading { color: #999; padding: 1rem 0; }
.error-banner {
  padding: 0.6rem 1rem; margin-bottom: 1rem;
  background: rgba(255,0,110,0.1);
  border: 1px solid var(--danger, #ff006e);
  border-radius: 6px;
  color: var(--danger, #ff006e);
}
</style>
