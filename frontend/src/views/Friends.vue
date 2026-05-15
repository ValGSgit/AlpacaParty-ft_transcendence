<!--
  Friends View — manage friends, requests, and blocks
  @owner fankahou
-->
<template>
  <div class="friends-page">

    <!-- ── Page Header ── -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">Friends</h1>
        <p class="page-sub">Connect, play, and compete with your crew</p>
      </div>
      <div class="header-stats">
        <div class="stat-pill">
          <span class="stat-num">{{ friends.length }}</span>
          <span class="stat-label">Friends</span>
        </div>
        <div v-if="pendingCount" class="stat-pill pend">
          <span class="stat-num">{{ pendingCount }}</span>
          <span class="stat-label">Pending</span>
        </div>
      </div>
    </div>

    <!-- ── Tab bar ── -->
    <div class="tab-bar">
      <button
        v-for="(tab, i) in tabs"
        :key="tab.key"
        :class="['tab', { active: activeTab === tab.key }]"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
        <span v-if="tab.key === 'requests' && pendingCount" class="tab-badge">{{ pendingCount }}</span>
      </button>
      <div class="tab-underline" :style="{ transform: `translateX(${tabIndex * 100}%)` }"></div>
    </div>

    <!-- ── Error toast ── -->
    <transition name="err-fade">
      <div v-if="error" class="error-toast" role="alert">
        <svg viewBox="0 0 20 20" fill="currentColor" class="err-icon"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/></svg>
        <span>{{ error }}</span>
        <button class="err-close" @click="error = null">×</button>
      </div>
    </transition>

    <!-- ── Skeleton loading ── -->
    <div v-if="loading" class="skeleton-list">
      <div v-for="n in 4" :key="n" class="skeleton-card"></div>
    </div>

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
          <button
            class="btn-primary btn-sm"
            @click="searchUsers(true)"
            :disabled="usersFetcher.loading"
          >
            {{ usersFetcher.loading ? "Searching…" : "Search" }}
          </button>
        </div>

        <ul v-if="filteredFriends.length" class="card-list">
          <li
            v-for="(f, i) in filteredFriends"
            :key="f.id"
            class="friend-card"
            :style="{ animationDelay: `${i * 55}ms` }"
          >
            <div class="avatar-wrap">
              <img :src="f.avatar || '/avatars/default.svg'" class="avatar" alt="" />
              <span class="status-dot" :class="{ online: f.is_online }"></span>
            </div>
            <div class="user-info">
              <span class="username">{{ f.username }}</span>
              <div class="user-meta">
                <span class="level-badge">Lv {{ f.level || 1 }}</span>
                <span class="meta-dot"></span>
                <span :class="['status-text', { online: f.is_online }]">
                  {{ f.is_online ? 'Online' : 'Offline' }}
                </span>
              </div>
            </div>
            <div class="card-actions">
              <button class="btn-ghost btn-danger-ghost" @click="removeFriend(f.id)">Remove</button>
              <button class="btn-ghost" @click="blockUser(f.id)">Block</button>
            </div>
          </li>
        </ul>

        <div v-else class="empty-state">
          <span class="empty-icon">🦙</span>
          <p v-if="friendSearch">No friends matching "{{ friendSearch }}"</p>
          <p v-else>No friends yet — start by discovering users below!</p>
        </div>

        <!-- Discover section -->
        <div class="discover-section">
          <div class="section-header">
            <h3 class="section-title">Discover Users</h3>
          </div>

          <div class="toolbar">
            <div class="search-wrap">
              <svg class="search-icon" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"/></svg>
              <input v-model="userSearch" type="text" placeholder="Search all users…" @keyup.enter="searchUsers" class="search-input" />
            </div>
            <button class="btn-primary" @click="searchUsers" :disabled="searchingUsers">
              {{ searchingUsers ? '…' : 'Search' }}
            </button>
          </div>

          <ul v-if="searchResults.length" class="card-list">
            <li
              v-for="(u, i) in searchResults"
              :key="u.id"
              class="friend-card"
              :style="{ animationDelay: `${i * 45}ms` }"
            >
              <div class="avatar-wrap">
                <img :src="u.avatar || '/avatars/default.svg'" class="avatar" alt="" />
              </div>
              <div class="user-info">
                <span class="username">{{ u.username }}</span>
                <div class="user-meta">
                  <span class="level-badge">Lv {{ u.level || 1 }}</span>
                </div>
              </div>
              <div class="card-actions">
                <button
                  class="btn-primary btn-sm"
                  @click="sendRequestToUser(u.id)"
                  :disabled="requestedIds.has(Number(u.id))"
                >
                  {{ requestedIds.has(Number(u.id)) ? 'Sent ✓' : 'Add Friend' }}
                </button>
                <button class="btn-ghost" @click="blockUser(u.id)">Block</button>
              </div>
            </li>
          </ul>

          <div v-if="searchTotal > searchPageSize" class="pagination">
            <button class="btn-ghost pag-btn" :disabled="searchPage === 0" @click="searchPage--; searchUsers()">‹ Prev</button>
            <span class="page-info">{{ searchPage + 1 }} / {{ Math.ceil(searchTotal / searchPageSize) }}</span>
            <button class="btn-ghost pag-btn" :disabled="(searchPage + 1) * searchPageSize >= searchTotal" @click="searchPage++; searchUsers()">Next ›</button>
          </div>
          <p v-else-if="userSearch && !searchResults.length && !searchingUsers" class="empty-inline">No users found.</p>
        </div>
      </div>

      <!-- ══ Requests ══ -->
      <div v-else-if="activeTab === 'requests' && !loading" key="requests" class="tab-pane">

        <div class="sub-section">
          <h3 class="sub-title">
            <span class="sub-title-dot received"></span>
            Received
          </h3>
          <ul v-if="received.length" class="card-list">
            <li v-for="(r, i) in received" :key="r.id" class="friend-card" :style="{ animationDelay: `${i * 55}ms` }">
              <div class="avatar-wrap">
                <img :src="r.sender?.avatar || r.sender_avatar || r.senderAvatar || '/avatars/default.svg'" class="avatar" alt="" />
              </div>
              <div class="user-info">
                <span class="username">{{ r.sender?.username || r.sender_username || r.senderUsername }}</span>
                <span class="req-label incoming">Wants to be your friend</span>
              </div>
              <div class="card-actions">
                <button class="btn-primary btn-sm" @click="acceptRequest(r.id)">Accept</button>
                <button class="btn-ghost btn-danger-ghost btn-sm" @click="declineRequest(r.id)">Decline</button>
                <button class="btn-ghost btn-sm" @click="blockFromRequest(r.id, r.senderId)">Block</button>
              </div>
            </li>
          </ul>
          <div v-else class="empty-state compact">
            <span class="empty-icon">📭</span>
            <p>No incoming requests.</p>
          </div>
        </div>

        <div class="sub-section">
          <h3 class="sub-title">
            <span class="sub-title-dot sent"></span>
            Sent
          </h3>
          <ul v-if="sent.length" class="card-list">
            <li v-for="(r, i) in sent" :key="r.id" class="friend-card" :style="{ animationDelay: `${i * 55}ms` }">
              <div class="avatar-wrap">
                <img :src="r.receiver?.avatar || r.receiver_avatar || r.receiverAvatar || '/avatars/default.svg'" class="avatar" alt="" />
              </div>
              <div class="user-info">
                <span class="username">{{ r.receiver?.username || r.receiver_username || r.receiverUsername }}</span>
                <span class="req-label pending">Pending response</span>
              </div>
              <span class="status-tag">Pending</span>
            </li>
          </ul>
          <div v-else class="empty-state compact">
            <span class="empty-icon">📤</span>
            <p>No outgoing requests.</p>
          </div>
        </div>
      </div>

      <!-- ══ Blocked ══ -->
      <div v-else-if="activeTab === 'blocked' && !loading" key="blocked" class="tab-pane">
        <ul v-if="blocked.length" class="card-list">
          <li v-for="(b, i) in blocked" :key="b.id" class="friend-card blocked-card" :style="{ animationDelay: `${i * 55}ms` }">
            <div class="avatar-wrap">
              <img :src="b.avatar || '/avatars/default.svg'" class="avatar avatar-blocked" alt="" />
            </div>
            <div class="user-info">
              <span class="username">{{ b.username }}</span>
              <span class="req-label blocked">Blocked</span>
            </div>
            <button class="btn-ghost btn-sm" @click="unblockUser(b.id)">Unblock</button>
          </li>
        </ul>
        <div v-else class="empty-state">
          <span class="empty-icon">🚫</span>
          <p>No blocked users.</p>
        </div>
      </div>

    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import api from '../services/api.js'
import { useAuthStore } from '../stores/auth.js'

const authStore = useAuthStore();

const activeTab = ref("friends");
const tabs = [
  { key: 'friends',  label: 'Friends' },
  { key: 'requests', label: 'Requests' },
  { key: 'blocked',  label: 'Blocked' },
]
const tabIndex = computed(() => tabs.findIndex(t => t.key === activeTab.value))

const friends = ref([]);
const received = ref([]);
const sent = ref([]);
const blocked = ref([]);
const loading = ref(false);
const error = ref(null);
const newFriendId = ref("");

const friendSearch = ref('')
const friendSort = ref('name')
const userSearch = ref('')
const searchResults = ref([])
const searchTotal = ref(0)
const searchPage = ref(0)
const searchPageSize = 10
const searchingUsers = ref(false)
const requestedIds = ref(new Set())

const usersFetcher = ref(new ListFetcher());
const friendsFetcher = ref(new ListFetcher());

const pendingCount = computed(() => received.value.length);

async function fetchFriends(searchChanged = false) {
  loading.value = true;
  error.value = null;

  let sort = {};
  if (friendSort.value === "online") {
    sort.online = "desc";
  } else if (friendSort.value === "level") {
    sort.level = "desc";
  } else {
    sort.username = "desc";
  }

  if (searchChanged) {
    const searchValue = friendSearch.value.trim();
    if (!searchValue) {
      loading.value = false;
      return;
    }
    let filter = {};
    filter.username = searchValue;
    friendsFetcher.value.updateParams({
      filter,
    });
  }

  try {
    friendsFetcher.value.updateParams({
      pageSize: 5,
      sort,
    });
    const { data } = await friendsFetcher.value.fetch("/friends");
    friends.value = data.friends || [];
  } catch (e) {
    error.value = "Failed to fetch friends";
  }
  loading.value = false;
}

async function fetchRequests() {
  loading.value = true;
  error.value = null;
  try {
    const { data } = await api.get("/friends/requests");
    received.value = data.received;
    sent.value = data.sent;
    syncRequestedIds();
  } catch (e) {
    error.value = e.response?.data?.error?.message || "Failed to load requests";
  } finally {
    loading.value = false;
  }
}

async function fetchBlocked() {
  loading.value = true;
  error.value = null;
  try {
    const { data } = await api.get("/friends/blocked");
    blocked.value = data.blocked;
  } catch (e) {
    error.value =
      e.response?.data?.error?.message || "Failed to load blocked users";
  } finally {
    loading.value = false;
  }
}

function syncRequestedIds() {
  const nextIds = new Set();
  for (const friend of friends.value) nextIds.add(Number(friend.id));
  for (const request of sent.value) {
    const rid =
      request.receiverId || request.receiver?.id || request.receiverId;
    if (rid != null) nextIds.add(Number(rid));
  }
  requestedIds.value = nextIds;
}

async function sendRequest() {
  try {
    await api.post("/friends/requests", { userId: Number(newFriendId.value) });
    newFriendId.value = "";
    await fetchRequests();
    activeTab.value = "requests";
  } catch (e) {
    error.value = e.response?.data?.error?.message || "Failed to send request";
  }
}

async function searchUsers(searchChanged = false) {
  loading.value = true;

  let sort = {};
  sort.createdAt = "desc";

  if (searchChanged) {
    const searchValue = userSearch.value.trim();
    if (!searchValue) {
      loading.value = false;
      return;
    }
    let filter = {};
    filter.username = searchValue;
    usersFetcher.value.updateParams({
      filter,
    });
  }
  try {
    usersFetcher.value.updateParams({
      sort,
    });
    const { data } = await usersFetcher.value.fetch("/users");
    searchResults.value = data.users || [];
  } catch (e) {
    console.log(e);
    error.value = e.response?.data?.error?.message || "Search failed";
  } finally {
    loading.value = false;
  }
}

async function sendRequestToUser(userId) {
  if (Number(userId) === Number(authStore.user?.id)) {
    error.value = "Cannot friend yourself";
    return;
  }
  try {
    await api.post("/friends/requests", { userId });
    requestedIds.value = new Set([...requestedIds.value, Number(userId)]);
  } catch (e) {
    if (e.response?.status === 403) {
      error.value = e.response?.data?.error?.message || 'You cannot send a friend request to this user'
    } else {
      error.value = e.response?.data?.error?.message || 'Failed to send request'
    }
  }
}

async function acceptRequest(id) {
  try {
    await api.put(`/friends/requests/${id}/accept`);
    await Promise.all([fetchFriends(), fetchRequests()]);
    activeTab.value = "friends";
  } catch (e) {
    error.value =
      e.response?.data?.error?.message || "Failed to accept request";
  }
}

async function declineRequest(id) {
  try {
    await api.put(`/friends/requests/${id}/decline`);
    await fetchRequests();
  } catch (e) {
    error.value =
      e.response?.data?.error?.message || "Failed to decline request";
  }
}

async function blockFromRequest(requestId, senderId) {
  try {
    await api.put(`/friends/requests/${requestId}/decline`)
    await api.post('/friends/block', { userId: senderId })
    await Promise.all([fetchRequests(), fetchBlocked()])
    activeTab.value = 'blocked'
  } catch (e) {
    error.value = e.response?.data?.error?.message || 'Failed to block user'
  }
}

async function removeFriend(id) {
  try {
    await api.delete(`/friends/${id}`);
    await fetchFriends();
  } catch (e) {
    error.value = e.response?.data?.error?.message || "Failed to remove friend";
  }
}

async function blockUser(id) {
  try {
    await api.post("/friends/block", { userId: id });
    await Promise.all([fetchFriends(), fetchBlocked()]);
  } catch (e) {
    error.value = e.response?.data?.error?.message || "Failed to block user";
  }
}

async function unblockUser(id) {
  try {
    await api.delete(`/friends/block/${id}`);
    await fetchBlocked();
  } catch (e) {
    error.value = e.response?.data?.error?.message || "Failed to unblock user";
  }
}

function loadTab(tab) {
  if (tab === "friends") fetchFriends();
  if (tab === "requests") fetchRequests();
  if (tab === "blocked") fetchBlocked();
}

watch(activeTab, loadTab);
onMounted(() => {
  fetchFriends()
  fetchRequests()
  fetchBlocked()
})
</script>

<style scoped>
/* ── page shell ─────────────────────────────────────────── */
.friends-page {
  max-width: 780px;
  margin: 0 auto;
  padding: 2.5rem 1.5rem 4rem;
  font-family: Inter, system-ui, sans-serif;
  color: #e8e8f0;
}

/* ── header ─────────────────────────────────────────────── */
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
}

.page-title {
  font-size: 2rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  background: linear-gradient(135deg, #ffffff 30%, #00e87a);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0 0 0.3rem;
  line-height: 1.1;
}

.page-sub {
  font-size: 0.88rem;
  color: rgba(255, 255, 255, 0.38);
  margin: 0;
}

.header-stats {
  display: flex;
  gap: 0.6rem;
  flex-shrink: 0;
  padding-top: 0.2rem;
}

.stat-pill {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.85rem;
  background: rgba(0, 232, 122, 0.08);
  border: 1px solid rgba(0, 232, 122, 0.2);
  border-radius: 20px;
}

.stat-pill.pend {
  background: rgba(255, 79, 79, 0.08);
  border-color: rgba(255, 79, 79, 0.25);
}
.stat-pill.pend .stat-num { color: #ff8585; }

.stat-num {
  font-size: 1rem;
  font-weight: 700;
  color: #00e87a;
  line-height: 1;
}

.stat-label {
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.45);
  text-transform: uppercase;
  letter-spacing: 0.07em;
}

/* ── tab bar ─────────────────────────────────────────────── */
.tab-bar {
  display: flex;
  position: relative;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  margin-bottom: 1.75rem;
}

.tab {
  flex: 1;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.35);
  font-size: 0.88rem;
  font-weight: 600;
  padding: 0.55rem 0;
  cursor: pointer;
  transition: color 0.2s;
  letter-spacing: 0.01em;
  position: relative;
}
.tab.active { color: #fff; }

.tab-badge {
  position: absolute;
  top: 2px;
  right: calc(50% - 24px);
  background: linear-gradient(135deg, #ff4f4f, #ff7a3d);
  color: #fff;
  font-size: 0.58rem;
  font-weight: 800;
  padding: 1px 4px;
  border-radius: 8px;
  min-width: 14px;
  text-align: center;
  line-height: 1.3;
  box-shadow: 0 0 6px rgba(255, 79, 79, 0.4);
}

.tab-underline {
  position: absolute;
  bottom: -1px;
  left: 0;
  width: calc(100% / 3);
  height: 2px;
  background: linear-gradient(90deg, #00e87a, #00f0ff);
  border-radius: 2px 2px 0 0;
  box-shadow: 0 0 10px rgba(0, 232, 122, 0.4);
  transition: transform 0.28s cubic-bezier(0.34, 1.4, 0.64, 1);
}

/* ── error toast ─────────────────────────────────────────── */
.error-toast {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  background: rgba(255, 60, 60, 0.08);
  border: 1px solid rgba(255, 60, 60, 0.25);
  border-radius: 10px;
  padding: 0.65rem 0.9rem;
  margin-bottom: 1.25rem;
  color: #ff8888;
  font-size: 0.84rem;
}
.err-icon { width: 15px; height: 15px; flex-shrink: 0; }
.error-toast span { flex: 1; }
.err-close {
  background: none;
  border: none;
  color: rgba(255, 136, 136, 0.6);
  cursor: pointer;
  font-size: 1.1rem;
  padding: 0 0.2rem;
  line-height: 1;
  transition: color 0.15s;
}
.err-close:hover { color: #ff8888; }

.err-fade-enter-active, .err-fade-leave-active { transition: all 0.22s ease; }
.err-fade-enter-from, .err-fade-leave-to { opacity: 0; transform: translateY(-6px); }

/* ── skeleton ────────────────────────────────────────────── */
.skeleton-list { display: flex; flex-direction: column; gap: 0.65rem; }
.skeleton-card {
  height: 74px;
  border-radius: 14px;
  background: linear-gradient(90deg,
    rgba(255,255,255,0.04) 25%,
    rgba(255,255,255,0.09) 50%,
    rgba(255,255,255,0.04) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
@keyframes shimmer {
  from { background-position: 200% 0; }
  to   { background-position: -200% 0; }
}

/* ── tab slide transition ─────────────────────────────────── */
.tab-slide-enter-active, .tab-slide-leave-active { transition: all 0.22s cubic-bezier(0.4, 0, 0.2, 1); }
.tab-slide-enter-from { opacity: 0; transform: translateY(10px); }
.tab-slide-leave-to  { opacity: 0; transform: translateY(-6px); }

/* ── card list ───────────────────────────────────────────── */
.card-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.6rem; }

/* ── friend card ─────────────────────────────────────────── */
.friend-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.85rem 1.1rem;
  background: rgba(12, 14, 20, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 14px;
  backdrop-filter: blur(12px);
  transition: border-color 0.2s, background 0.2s, transform 0.2s, box-shadow 0.2s;
  animation: card-in 0.38s cubic-bezier(0.22, 1, 0.36, 1) both;
  cursor: default;
}
.friend-card:hover {
  border-color: rgba(0, 232, 122, 0.22);
  background: rgba(12, 14, 22, 0.96);
  transform: translateX(4px);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.35), inset 0 0 0 1px rgba(0, 232, 122, 0.05);
}

.blocked-card:hover {
  border-color: rgba(255, 92, 92, 0.22);
  box-shadow: none;
}

@keyframes card-in {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ── avatar ──────────────────────────────────────────────── */
.avatar-wrap {
  position: relative;
  flex-shrink: 0;
}
.avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid rgba(255, 255, 255, 0.08);
  transition: border-color 0.2s;
}
.friend-card:hover .avatar { border-color: rgba(0, 232, 122, 0.35); }
.avatar-blocked { filter: grayscale(0.7); opacity: 0.6; }

.status-dot {
  position: absolute;
  bottom: 1px;
  right: 1px;
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
  border: 2px solid rgba(12, 14, 20, 0.9);
}
.status-dot.online {
  background: #00e87a;
  animation: online-pulse 2.4s ease-in-out infinite;
}
@keyframes online-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(0, 232, 122, 0.55); }
  60%       { box-shadow: 0 0 0 5px rgba(0, 232, 122, 0); }
}

/* ── user info ───────────────────────────────────────────── */
.user-info { flex: 1; display: flex; flex-direction: column; gap: 0.28rem; overflow: hidden; }

.username {
  font-size: 0.92rem;
  font-weight: 600;
  color: #e8e8f0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-meta { display: flex; align-items: center; gap: 0.45rem; }

.level-badge {
  display: inline-flex;
  align-items: center;
  background: rgba(0, 240, 255, 0.1);
  border: 1px solid rgba(0, 240, 255, 0.18);
  border-radius: 10px;
  padding: 1px 7px;
  font-size: 0.68rem;
  font-weight: 700;
  color: #00f0ff;
  letter-spacing: 0.03em;
}

.meta-dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  flex-shrink: 0;
}

.status-text { font-size: 0.75rem; color: rgba(255, 255, 255, 0.35); }
.status-text.online { color: #00e87a; }

.req-label {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.35);
}
.req-label.incoming { color: #00f0ff; }
.req-label.pending  { color: rgba(255, 200, 80, 0.8); }
.req-label.blocked  { color: rgba(255, 92, 92, 0.7); }

.status-tag {
  font-size: 0.72rem;
  padding: 2px 9px;
  border-radius: 20px;
  background: rgba(255, 200, 80, 0.1);
  border: 1px solid rgba(255, 200, 80, 0.22);
  color: rgba(255, 200, 80, 0.85);
  flex-shrink: 0;
}

/* ── card actions ────────────────────────────────────────── */
.card-actions { display: flex; gap: 0.4rem; flex-shrink: 0; }

/* ── buttons ─────────────────────────────────────────────── */
.btn-ghost {
  background: none;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.55);
  font-size: 0.8rem;
  font-weight: 500;
  padding: 0.32rem 0.75rem;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.18s, border-color 0.18s, color 0.18s;
}
.btn-ghost:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.2);
  color: #e8e8f0;
}
.btn-ghost:disabled { opacity: 0.4; cursor: not-allowed; }

.btn-danger-ghost {
  border-color: rgba(255, 92, 92, 0.25);
  color: rgba(255, 92, 92, 0.7);
}
.btn-danger-ghost:hover {
  background: rgba(255, 92, 92, 0.08);
  border-color: rgba(255, 92, 92, 0.5);
  color: #ff8585;
}

.btn-primary {
  background: linear-gradient(135deg, #00c96a, #00e87a 50%, #00f0b0);
  border: none;
  border-radius: 8px;
  color: #041a0e;
  font-size: 0.82rem;
  font-weight: 700;
  padding: 0.4rem 1rem;
  cursor: pointer;
  white-space: nowrap;
  box-shadow: 0 2px 12px rgba(0, 232, 122, 0.25);
  transition: transform 0.14s, box-shadow 0.18s, opacity 0.18s;
}
.btn-primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 18px rgba(0, 232, 122, 0.4); }
.btn-primary:active:not(:disabled) { transform: translateY(0); }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-sm { padding: 0.28rem 0.65rem; font-size: 0.78rem; }

/* ── toolbar ─────────────────────────────────────────────── */
.toolbar {
  display: flex;
  gap: 0.6rem;
  margin-bottom: 1rem;
  align-items: center;
}

.search-wrap {
  flex: 1;
  position: relative;
}
.search-icon {
  position: absolute;
  left: 0.7rem;
  top: 50%;
  transform: translateY(-50%);
  width: 14px;
  height: 14px;
  color: rgba(255, 255, 255, 0.22);
  pointer-events: none;
}
.search-input {
  width: 100%;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 10px;
  color: #e8e8f0;
  font-size: 0.88rem;
  padding: 0.62rem 0.9rem 0.62rem 2.1rem;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
}
.search-input::placeholder { color: rgba(255, 255, 255, 0.22); }
.search-input:focus {
  border-color: rgba(0, 232, 122, 0.4);
  background: rgba(0, 232, 122, 0.03);
  box-shadow: 0 0 0 3px rgba(0, 232, 122, 0.07);
}

.sort-select {
  padding: 0.58rem 0.75rem;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 10px;
  color: rgba(255, 255, 255, 0.65);
  font-size: 0.82rem;
  cursor: pointer;
  outline: none;
  flex-shrink: 0;
  transition: border-color 0.2s;
}
.sort-select:focus { border-color: rgba(0, 232, 122, 0.35); }

/* ── discover section ────────────────────────────────────── */
.discover-section { margin-top: 2.5rem; }

.section-header { margin-bottom: 1rem; }

.section-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.55);
  text-transform: uppercase;
  letter-spacing: 0.07em;
  padding-bottom: 0.6rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  margin: 0;
}

/* ── sub-sections (requests) ─────────────────────────────── */
.sub-section { margin-bottom: 2rem; }

.sub-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.55);
  text-transform: uppercase;
  letter-spacing: 0.07em;
  padding-bottom: 0.6rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  margin: 0 0 1rem;
}

.sub-title-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}
.sub-title-dot.received { background: #00f0ff; box-shadow: 0 0 6px rgba(0, 240, 255, 0.4); }
.sub-title-dot.sent     { background: rgba(255, 200, 80, 0.85); box-shadow: 0 0 6px rgba(255, 200, 80, 0.3); }

/* ── empty states ────────────────────────────────────────── */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3.5rem 1rem;
  gap: 0.75rem;
  text-align: center;
}
.empty-state.compact { padding: 1.5rem 1rem; }

.empty-icon { font-size: 2.5rem; line-height: 1; opacity: 0.5; }

.empty-state p {
  font-size: 0.88rem;
  color: rgba(255, 255, 255, 0.28);
  margin: 0;
}

.empty-inline {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.28);
  font-style: italic;
  padding: 0.75rem 0;
}

/* ── pagination ──────────────────────────────────────────── */
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 1rem 0 0;
}
.pag-btn { min-width: 72px; justify-content: center; }
.page-info {
  font-size: 0.82rem;
  color: rgba(255, 255, 255, 0.35);
  min-width: 60px;
  text-align: center;
}

/* ── responsive ──────────────────────────────────────────── */
@media (max-width: 600px) {
  .friends-page { padding: 1.5rem 1rem 3rem; }
  .page-title { font-size: 1.6rem; }
  .friend-card { padding: 0.75rem 0.85rem; gap: 0.75rem; }
  .card-actions { flex-wrap: wrap; }
  .btn-ghost, .btn-primary { font-size: 0.75rem; padding: 0.28rem 0.55rem; }
}
</style>
