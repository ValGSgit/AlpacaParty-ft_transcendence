<!--
  Friends View — manage friends, requests, and blocks
  @owner fankahou
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
      <!-- Search & filter toolbar -->
      <div class="search-toolbar">
        <input
          v-model="friendSearch"
          type="text"
          placeholder="Search friends by name…"
          class="search-input"
        />
        <select v-model="friendSort" class="sort-select">
          <option value="name">Sort: Name</option>
          <option value="online">Sort: Online first</option>
          <option value="level">Sort: Level</option>
        </select>
      </div>

      <ul v-if="filteredFriends.length" class="user-list">
        <li v-for="f in filteredFriends" :key="f.id" class="user-row">
          <span class="online-dot" :class="{ online: f.is_online }"></span>
          <img :src="f.avatar || '/avatars/default.svg'" class="mini-avatar" alt="" />
          <div class="user-info">
            <span class="username">{{ f.username }}</span>
            <span class="user-meta">Lv {{ f.level || 1 }} · {{ f.is_online ? 'Online' : 'Offline' }}</span>
          </div>
          <div class="actions">
            <button class="btn-sm btn-danger" @click="removeFriend(f.id)">Remove</button>
            <button class="btn-sm" @click="blockUser(f.id)">Block</button>
          </div>
        </li>
      </ul>
      <p v-else-if="friendSearch" class="empty">No friends matching "{{ friendSearch }}"</p>
      <p v-else class="empty">No friends yet.</p>

      <!-- Discover users -->
      <div class="discover-section">
        <h3>Discover Users</h3>
        <div class="search-toolbar">
          <input
            v-model="userSearch"
            type="text"
            placeholder="Search all users…"
            @keyup.enter="searchUsers"
            class="search-input"
          />
          <button class="btn-primary btn-sm" @click="searchUsers" :disabled="searchingUsers">
            {{ searchingUsers ? 'Searching…' : 'Search' }}
          </button>
        </div>
        <ul v-if="searchResults.length" class="user-list">
          <li v-for="u in searchResults" :key="u.id" class="user-row">
            <img :src="u.avatar || '/avatars/default.svg'" class="mini-avatar" alt="" />
            <div class="user-info">
              <span class="username">{{ u.username }}</span>
              <span class="user-meta">Lv {{ u.level || 1 }}</span>
            </div>
            <div class="actions">
              <button class="btn-sm btn-primary" @click="sendRequestToUser(u.id)" :disabled="requestedIds.has(u.id)">
                {{ requestedIds.has(u.id) ? 'Sent' : 'Add Friend' }}
              </button>
            </div>
          </li>
        </ul>
        <!-- Pagination -->
        <div v-if="searchTotal > searchPageSize" class="pagination">
          <button class="btn-sm" :disabled="searchPage === 0" @click="searchPage--; searchUsers()">‹ Prev</button>
          <span class="page-info">{{ searchPage + 1 }} / {{ Math.ceil(searchTotal / searchPageSize) }}</span>
          <button class="btn-sm" :disabled="(searchPage + 1) * searchPageSize >= searchTotal" @click="searchPage++; searchUsers()">Next ›</button>
        </div>
        <p v-else-if="userSearch && !searchResults.length && !searchingUsers" class="empty">No users found.</p>
      </div>
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
import { useAuthStore } from '../stores/auth.js'
import ErrorBanner from '../components/ErrorBanner.vue'
import LoadingSpinner from '../components/LoadingSpinner.vue'
import EmptyState from '../components/EmptyState.vue'
import UserCard from '../components/UserCard.vue'
import BaseButton from '../components/BaseButton.vue'

const authStore = useAuthStore()

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

// Search & filter state
const friendSearch = ref('')
const friendSort = ref('name')
const userSearch = ref('')
const searchResults = ref([])
const searchTotal = ref(0)
const searchPage = ref(0)
const searchPageSize = 10
const searchingUsers = ref(false)
const requestedIds = ref(new Set())

const pendingCount = computed(() => received.value.length)

const filteredFriends = computed(() => {
  let list = [...friends.value]
  if (friendSearch.value) {
    const q = friendSearch.value.toLowerCase()
    list = list.filter(f => f.username?.toLowerCase().includes(q))
  }
  if (friendSort.value === 'online') {
    list.sort((a, b) => (b.is_online ? 1 : 0) - (a.is_online ? 1 : 0))
  } else if (friendSort.value === 'level') {
    list.sort((a, b) => (b.level || 1) - (a.level || 1))
  } else {
    list.sort((a, b) => (a.username || '').localeCompare(b.username || ''))
  }
  return list
})

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

async function searchUsers() {
  if (!userSearch.value.trim()) return
  searchingUsers.value = true
  try {
    const { data } = await api.get('/users', {
      params: { search: userSearch.value.trim(), limit: searchPageSize, offset: searchPage.value * searchPageSize },
    })
    searchResults.value = (data.users || []).filter((u) => Number(u.id) !== Number(authStore.user?.id))
    searchTotal.value = data.total || searchResults.value.length
  } catch (e) {
    error.value = e.response?.data?.error?.message || 'Search failed'
  } finally {
    searchingUsers.value = false
  }
}

async function sendRequestToUser(userId) {
  if (Number(userId) === Number(authStore.user?.id)) {
    error.value = 'Cannot friend yourself'
    return
  }
  try {
    await api.post('/friends/requests', { userId })
    requestedIds.value = new Set([...requestedIds.value, userId])
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

/* ── Search & filter ── */
.search-toolbar {
  display: flex;
  gap: 0.6rem;
  margin-bottom: 1rem;
  align-items: center;
}
.search-input {
  flex: 1;
  padding: 0.45rem 0.75rem;
  background: var(--bg-tertiary, #1a1a2a);
  border: 1px solid var(--border-color, #2a2a3a);
  border-radius: 6px;
  color: inherit;
  font-size: 0.9rem;
}
.search-input:focus { outline: none; border-color: var(--primary, #00f0ff); }
.sort-select {
  padding: 0.4rem 0.6rem;
  background: var(--bg-tertiary, #1a1a2a);
  border: 1px solid var(--border-color, #2a2a3a);
  border-radius: 6px;
  color: inherit;
  font-size: 0.85rem;
  cursor: pointer;
}

.user-info { display: flex; flex-direction: column; flex: 1; overflow: hidden; }
.user-meta { font-size: 0.75rem; color: var(--text-secondary, #a0a0b0); }

.discover-section { margin-top: 2rem; }
.discover-section h3 { color: var(--primary, #00f0ff); margin-bottom: 0.75rem; }

.pagination {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  justify-content: center;
  padding: 0.75rem 0;
}
.page-info { font-size: 0.85rem; color: var(--text-secondary, #a0a0b0); }
.loading { color: #999; padding: 1rem 0; }
.error-banner {
  padding: 0.6rem 1rem; margin-bottom: 1rem;
  background: rgba(255,0,110,0.1);
  border: 1px solid var(--danger, #ff006e);
  border-radius: 6px;
  color: var(--danger, #ff006e);
}
</style>
