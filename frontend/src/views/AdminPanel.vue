<template>
  <div class="admin-panel">
    <!-- Sidebar -->
    <aside class="sidebar" :class="{ collapsed: sidebarCollapsed }">
      <div class="sidebar-header">
        <div class="logo">
          <svg class="logo-icon" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7l-9-5z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
            <path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span class="logo-text">Admin</span>
        </div>
        <button class="collapse-btn" @click="sidebarCollapsed = !sidebarCollapsed">
          <svg viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
      </div>

      <nav class="sidebar-nav">
        <button
          v-for="item in navItems"
          :key="item.id"
          class="nav-item"
          :class="{ active: activeSection === item.id }"
          @click="activeSection = item.id"
        >
          <span class="nav-icon" v-html="item.icon"></span>
          <span class="nav-label">{{ item.label }}</span>
        </button>
      </nav>

      <div class="sidebar-footer">
        <div class="admin-info">
          <div class="admin-avatar">{{ adminInitial }}</div>
          <div class="admin-meta">
            <div class="admin-name">{{ adminAuth.admin?.username }}</div>
            <div class="admin-role">{{ adminAuth.admin?.role }}</div>
          </div>
        </div>
        <button class="logout-btn" @click="handleLogout" title="Logout">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <polyline points="16 17 21 12 16 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
    </aside>

    <!-- Main content -->
    <main class="main-content">
      <!-- Top bar -->
      <header class="top-bar">
        <div class="page-title">
          <h2>{{ currentSection?.label }}</h2>
          <span class="breadcrumb">AlpacaParty / Admin / {{ currentSection?.label }}</span>
        </div>
        <div class="top-bar-actions">
          <span class="date-display">{{ currentDate }}</span>
        </div>
      </header>

      <!-- Action error banner — shared across sections -->
      <div v-if="actionError" class="action-error" role="alert">
        {{ actionError }}
        <button class="action-error-dismiss" @click="actionError = ''" aria-label="Dismiss">×</button>
      </div>

      <!-- Dashboard -->
      <section v-if="activeSection === 'dashboard'" class="section-content">
        <div class="stats-grid" v-if="stats">
          <div class="stat-card">
            <div class="stat-icon users"><svg viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" stroke-width="1.5"/><circle cx="9" cy="7" r="4" stroke="currentColor" stroke-width="1.5"/><path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></div>
            <div class="stat-info">
              <div class="stat-value">{{ formatCount(stats.totalUsers) }}</div>
              <div class="stat-label">Total Users</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon online"><svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="2" fill="currentColor"/><path d="M12 2a10 10 0 1 0 10 10" stroke="currentColor" stroke-width="1.5"/></svg></div>
            <div class="stat-info">
              <div class="stat-value">{{ formatCount(stats.onlineUsers) }}</div>
              <div class="stat-label">Online Now</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon posts"><svg viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="1.5"/><polyline points="14 2 14 8 20 8" stroke="currentColor" stroke-width="1.5"/></svg></div>
            <div class="stat-info">
              <div class="stat-value">{{ formatCount(stats.totalPosts) }}</div>
              <div class="stat-label">Total Posts</div>
            </div>
          </div>
          <div class="stat-card warning">
            <div class="stat-icon banned"><svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" stroke="currentColor" stroke-width="1.5"/></svg></div>
            <div class="stat-info">
              <div class="stat-value">{{ formatCount(stats.bannedUsers) }}</div>
              <div class="stat-label">Banned Users</div>
            </div>
          </div>
        </div>
        <div v-else class="loading-state">
          <div class="spinner-lg"></div>
          <p>Loading dashboard…</p>
        </div>
      </section>

      <!-- User Management -->
      <section v-if="activeSection === 'users'" class="section-content">
        <div class="table-toolbar">
          <div class="search-wrap">
            <svg class="search-icon" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="1.5"/><line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
            <input v-model="userSearch" class="search-input" placeholder="Search users…" @input="debouncedSearch" />
          </div>
        </div>

        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="usersLoading">
                <td colspan="7" class="table-loading"><div class="spinner-sm"></div> Loading…</td>
              </tr>
              <tr v-else-if="!users.length">
                <td colspan="7" class="table-empty">No users found</td>
              </tr>
              <tr v-for="u in users" :key="u.id" :class="{ banned: u.isBanned }">
                <td class="id-cell">#{{ u.id }}</td>
                <td class="username-cell">
                  <span class="online-dot" :class="{ online: u.isOnline }"></span>
                  {{ u.username }}
                </td>
                <td class="email-cell">{{ u.email }}</td>
                <td>
                  <span class="role-badge" :class="u.role">{{ u.role }}</span>
                </td>
                <td>
                  <span class="status-badge" :class="u.isBanned ? 'banned' : 'active'">
                    {{ u.isBanned ? 'Banned' : 'Active' }}
                  </span>
                </td>
                <td class="date-cell">{{ formatDate(u.createdAt) }}</td>
                <td class="actions-cell">
                  <button
                    v-if="!u.isBanned"
                    class="action-btn ban"
                    title="Ban user"
                    @click="banUser(u.id)"
                  >Ban</button>
                  <button
                    v-else
                    class="action-btn unban"
                    title="Unban user"
                    @click="unbanUser(u.id)"
                  >Unban</button>
                  <button
                    v-if="adminAuth.isSuperAdmin && u.id !== adminAuth.admin?.id"
                    class="action-btn delete"
                    title="Delete user"
                    @click="confirmDelete(u)"
                  >Delete</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="pagination" v-if="userPages > 1">
          <button :disabled="userPage <= 1" @click="changePage(userPage - 1)">‹</button>
          <span>Page {{ userPage }} of {{ userPages }}</span>
          <button :disabled="userPage >= userPages" @click="changePage(userPage + 1)">›</button>
        </div>
      </section>
    </main>

    <!-- Delete confirm modal -->
    <div v-if="deleteTarget" class="modal-overlay" @click.self="deleteTarget = null">
      <div class="modal">
        <h3>Delete User</h3>
        <p>Permanently delete <strong>{{ deleteTarget.username }}</strong>? This cannot be undone.</p>
        <div class="modal-actions">
          <button class="btn-cancel" @click="deleteTarget = null">Cancel</button>
          <button class="btn-danger" @click="deleteUser">Delete</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAdminAuthStore } from '../stores/adminAuth.js';
import api from '../services/api.js';

const router = useRouter();
const adminAuth = useAdminAuthStore();

const activeSection = ref('dashboard');
const sidebarCollapsed = ref(false);

// Stats default — keys are guaranteed to exist so the template's
// `.toLocaleString()` calls never crash on a partial API response.
const DEFAULT_STATS = { totalUsers: 0, bannedUsers: 0, totalPosts: 0, onlineUsers: 0 };

const stats = ref(null);
const users = ref([]);
const usersLoading = ref(false);
const userSearch = ref('');
const userPage = ref(1);
const userPages = ref(1);
const deleteTarget = ref(null);
const actionError = ref('');

let searchTimeout = null;

const navItems = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: '<svg viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" stroke-width="1.5"/></svg>',
  },
  {
    id: 'users',
    label: 'Users',
    icon: '<svg viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" stroke-width="1.5"/><circle cx="9" cy="7" r="4" stroke="currentColor" stroke-width="1.5"/></svg>',
  },
];

const currentSection = computed(() => navItems.find(n => n.id === activeSection.value));
const adminInitial = computed(() => (adminAuth.admin?.username?.[0] ?? 'A').toUpperCase());
const currentDate = computed(() => new Date().toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }));

function formatDate(d) {
  if (!d) return '';
  const parsed = new Date(d);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// Replaces `value.toLocaleString()` in the template — handles undefined/null
// so a partial dashboard payload can't crash the render.
function formatCount(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0';
  return n.toLocaleString();
}

// Extract a human-readable message from an api.js HttpError, with a fallback.
function errorMessage(err, fallback) {
  if (err && err.data && err.data.error && err.data.error.message) {
    return err.data.error.message;
  }
  if (err && err.message) return err.message;
  return fallback;
}

// Coerce a possibly-partial stats payload into the full shape so the template
// can call `.toLocaleString()` on every field without optional-chaining.
function normalizeStats(payload) {
  const out = { ...DEFAULT_STATS };
  if (!payload || typeof payload !== 'object') return out;
  for (const key of Object.keys(DEFAULT_STATS)) {
    const v = Number(payload[key]);
    out[key] = Number.isFinite(v) ? v : 0;
  }
  return out;
}

async function loadDashboard() {
  try {
    const { data } = await api.get('/admin/dashboard');
    stats.value = normalizeStats(data);
  } catch {
    stats.value = normalizeStats(null);
  }
}

async function loadUsers() {
  usersLoading.value = true;
  try {
    const { data } = await api.get('/admin/users', {
      params: { page: userPage.value, limit: 20, search: userSearch.value },
    });
    users.value = Array.isArray(data?.users) ? data.users : [];
    const pages = Number(data?.pages);
    userPages.value = Number.isFinite(pages) && pages > 0 ? pages : 1;
  } catch (err) {
    users.value = [];
    userPages.value = 1;
    actionError.value = errorMessage(err, 'Failed to load users');
  } finally {
    usersLoading.value = false;
  }
}

function debouncedSearch() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => { userPage.value = 1; loadUsers(); }, 350);
}

function changePage(p) {
  // Clamp to the known range so a manual click can't desync from the API.
  const next = Number(p);
  if (!Number.isInteger(next)) return;
  if (next < 1 || next > userPages.value) return;
  userPage.value = next;
  loadUsers();
}

async function banUser(id) {
  try {
    await api.patch(`/admin/users/${id}/ban`);
    await loadUsers();
  } catch (err) {
    actionError.value = errorMessage(err, 'Ban failed');
  }
}

async function unbanUser(id) {
  try {
    await api.patch(`/admin/users/${id}/unban`);
    await loadUsers();
  } catch (err) {
    actionError.value = errorMessage(err, 'Unban failed');
  }
}

function confirmDelete(u) { deleteTarget.value = u; }

async function deleteUser() {
  if (!deleteTarget.value) return;
  const target = deleteTarget.value;
  try {
    await api.delete(`/admin/users/${target.id}`);
    deleteTarget.value = null;
    await loadUsers();
  } catch (err) {
    actionError.value = errorMessage(err, 'Delete failed');
  }
}

async function handleLogout() {
  try {
    await adminAuth.logout();
  } finally {
    router.push({ name: 'AdminLogin' });
  }
}

onMounted(() => {
  loadDashboard();
  loadUsers();
});

onUnmounted(() => {
  if (searchTimeout) clearTimeout(searchTimeout);
});
</script>

<style src="../styles/views/AdminPanel.css" scoped></style>
