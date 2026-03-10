<!--
  Admin Dashboard — user management, site stats, data requests
  @owner ValGSgit
-->
<template>
  <div class="admin-page">
    <h1>Admin Dashboard</h1>

    <div v-if="!authStore.user?.is_admin" class="error-banner">
      Access denied. You must be an admin.
    </div>

    <template v-else>
      <!-- Stats Overview -->
      <section class="admin-section">
        <h2>Site Statistics</h2>
        <div v-if="statsLoading" class="loading">Loading…</div>
        <div v-else class="stats-grid">
          <div class="stat-card">
            <span class="stat-value">{{ stats.totalUsers || 0 }}</span>
            <span class="stat-label">Users</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">{{ stats.onlineUsers || 0 }}</span>
            <span class="stat-label">Online</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">{{ stats.totalGames || 0 }}</span>
            <span class="stat-label">Games</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">{{ stats.totalPosts || 0 }}</span>
            <span class="stat-label">Posts</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">{{ stats.totalOrgs || 0 }}</span>
            <span class="stat-label">Orgs</span>
          </div>
        </div>
      </section>

      <!-- User Management -->
      <section class="admin-section">
        <h2>User Management</h2>
        <div class="search-bar">
          <input v-model="userSearch" type="text" placeholder="Search users…" @input="searchUsers" />
        </div>
        <div class="table-wrapper">
          <table class="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Username</th>
                <th>Email</th>
                <th>Level</th>
                <th>Admin</th>
                <th>Online</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="u in users" :key="u.id">
                <td>{{ u.id }}</td>
                <td>
                  <router-link :to="`/user/${u.id}`" class="user-link">{{ u.username }}</router-link>
                </td>
                <td>{{ u.email }}</td>
                <td>{{ u.level || 1 }}</td>
                <td>{{ u.is_admin ? '✅' : '—' }}</td>
                <td><span class="dot" :class="{ online: u.is_online }"></span></td>
                <td class="actions">
                  <button class="btn-sm" @click="toggleAdmin(u)" :title="u.is_admin ? 'Remove admin' : 'Make admin'">
                    {{ u.is_admin ? '👤' : '👑' }}
                  </button>
                  <button class="btn-sm btn-danger" @click="deleteUser(u)" title="Delete user">🗑️</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Data Requests -->
      <section class="admin-section">
        <h2>GDPR Data Requests</h2>
        <div v-if="!dataRequests.length" class="empty">No pending data requests.</div>
        <div v-for="dr in dataRequests" :key="dr.id" class="data-request-card">
          <div>
            <strong>{{ dr.type }}</strong> — User #{{ dr.user_id }}
            <span class="status-tag" :class="dr.status">{{ dr.status }}</span>
          </div>
          <div class="data-actions" v-if="dr.status === 'pending'">
            <button class="btn-sm btn-primary" @click="processRequest(dr.id)">Process</button>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth.js'
import api from '../services/api.js'

const authStore = useAuthStore()
const stats = ref({})
const statsLoading = ref(true)
const users = ref([])
const userSearch = ref('')
const dataRequests = ref([])

onMounted(async () => {
  if (!authStore.user?.is_admin) return

  // Fetch stats
  try {
    const { data } = await api.get('/admin/stats')
    stats.value = data.stats || data
  } catch {} finally {
    statsLoading.value = false
  }

  // Fetch users
  await fetchUsers()

  // Fetch data requests
  try {
    const { data } = await api.get('/admin/data-requests')
    dataRequests.value = data.requests || []
  } catch {}
})

async function fetchUsers() {
  try {
    const params = userSearch.value ? { search: userSearch.value } : {}
    const { data } = await api.get('/admin/users', { params })
    users.value = data.users || []
  } catch {}
}

let searchTimeout = null
function searchUsers() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(fetchUsers, 300)
}

async function toggleAdmin(user) {
  try {
    await api.put(`/admin/users/${user.id}/toggle-admin`)
    user.is_admin = !user.is_admin
  } catch (e) {
    alert(e.response?.data?.error?.message || 'Failed')
  }
}

async function deleteUser(user) {
  if (!confirm(`Delete user "${user.username}"? This cannot be undone.`)) return
  try {
    await api.delete(`/admin/users/${user.id}`)
    users.value = users.value.filter(u => u.id !== user.id)
  } catch (e) {
    alert(e.response?.data?.error?.message || 'Failed')
  }
}

async function processRequest(id) {
  try {
    await api.post(`/admin/data-requests/${id}/process`)
    const req = dataRequests.value.find(r => r.id === id)
    if (req) req.status = 'processing'
  } catch (e) {
    alert(e.response?.data?.error?.message || 'Failed')
  }
}
</script>

<style scoped>
.admin-page {
  max-width: 960px;
  margin: 0 auto;
  padding: 1.5rem 1rem;
}

.admin-section {
  background: var(--bg-secondary, #12121a);
  border: 1px solid var(--border-color, #2a2a3a);
  border-radius: 12px;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
}

.admin-section h2 {
  margin: 0 0 1rem;
  color: var(--primary, #00f0ff);
  font-size: 1.1rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.75rem;
}

.stat-card {
  background: var(--bg-tertiary, #1a1a2a);
  border-radius: 8px;
  padding: 1rem;
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--primary, #00f0ff);
}

.stat-label {
  font-size: 0.8rem;
  color: #999;
}

.search-bar {
  margin-bottom: 0.75rem;
}

.search-bar input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  background: var(--bg-tertiary, #1a1a2a);
  border: 1px solid var(--border-color, #2a2a3a);
  border-radius: 8px;
  color: inherit;
}

.table-wrapper {
  overflow-x: auto;
}

.admin-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.admin-table th, .admin-table td {
  padding: 0.5rem 0.6rem;
  text-align: left;
  border-bottom: 1px solid var(--border-color, #2a2a3a);
}

.admin-table th {
  color: #999;
  font-weight: 500;
  font-size: 0.8rem;
  text-transform: uppercase;
}

.user-link {
  color: var(--primary, #00f0ff);
  text-decoration: none;
}

.dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #666;
}

.dot.online { background: #00ff88; }

.actions {
  display: flex;
  gap: 0.4rem;
}

.btn-sm {
  padding: 0.25rem 0.5rem;
  border-radius: 5px;
  border: 1px solid var(--border-color, #2a2a3a);
  background: var(--bg-tertiary, #1a1a2a);
  color: inherit;
  cursor: pointer;
  font-size: 0.85rem;
}

.btn-sm.btn-danger { border-color: #ff5050; }
.btn-sm.btn-primary { background: var(--primary, #00f0ff); color: #000; border: none; }

.error-banner {
  background: rgba(255, 80, 80, 0.15);
  color: #ff5050;
  padding: 1rem;
  border-radius: 8px;
  text-align: center;
}

.loading, .empty {
  padding: 1rem;
  text-align: center;
  color: #999;
}

.data-request-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.6rem 0;
  border-bottom: 1px solid var(--border-color, #2a2a3a);
}

.status-tag {
  font-size: 0.75rem;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  margin-left: 0.5rem;
}

.status-tag.pending { background: #ffd93d33; color: #ffd93d; }
.status-tag.processing { background: #00f0ff33; color: #00f0ff; }
.status-tag.completed { background: #00ff8833; color: #00ff88; }
</style>
