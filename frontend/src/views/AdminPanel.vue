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

      <!-- Dashboard -->
      <section v-if="activeSection === 'dashboard'" class="section-content">
        <div class="stats-grid" v-if="stats">
          <div class="stat-card">
            <div class="stat-icon users"><svg viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" stroke-width="1.5"/><circle cx="9" cy="7" r="4" stroke="currentColor" stroke-width="1.5"/><path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.totalUsers.toLocaleString() }}</div>
              <div class="stat-label">Total Users</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon online"><svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="2" fill="currentColor"/><path d="M12 2a10 10 0 1 0 10 10" stroke="currentColor" stroke-width="1.5"/></svg></div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.onlineUsers.toLocaleString() }}</div>
              <div class="stat-label">Online Now</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon posts"><svg viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="1.5"/><polyline points="14 2 14 8 20 8" stroke="currentColor" stroke-width="1.5"/></svg></div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.totalPosts.toLocaleString() }}</div>
              <div class="stat-label">Total Posts</div>
            </div>
          </div>
          <div class="stat-card warning">
            <div class="stat-icon banned"><svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" stroke="currentColor" stroke-width="1.5"/></svg></div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.bannedUsers.toLocaleString() }}</div>
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
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAdminAuthStore } from '../stores/adminAuth.js';
import api from '../services/api.js';

const router = useRouter();
const adminAuth = useAdminAuthStore();

const activeSection = ref('dashboard');
const sidebarCollapsed = ref(false);

const stats = ref(null);
const users = ref([]);
const usersLoading = ref(false);
const userSearch = ref('');
const userPage = ref(1);
const userPages = ref(1);
const deleteTarget = ref(null);

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
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

async function loadDashboard() {
  try {
    const { data } = await api.get('/admin/dashboard');
    stats.value = data;
  } catch {
    stats.value = { totalUsers: 0, bannedUsers: 0, totalPosts: 0, onlineUsers: 0 };
  }
}

async function loadUsers() {
  usersLoading.value = true;
  try {
    const { data } = await api.get('/admin/users', {
      params: { page: userPage.value, limit: 20, search: userSearch.value },
    });
    users.value = data.users;
    userPages.value = data.pages;
  } finally {
    usersLoading.value = false;
  }
}

function debouncedSearch() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => { userPage.value = 1; loadUsers(); }, 350);
}

function changePage(p) {
  userPage.value = p;
  loadUsers();
}

async function banUser(id) {
  await api.patch(`/admin/users/${id}/ban`);
  loadUsers();
}

async function unbanUser(id) {
  await api.patch(`/admin/users/${id}/unban`);
  loadUsers();
}

function confirmDelete(u) { deleteTarget.value = u; }

async function deleteUser() {
  if (!deleteTarget.value) return;
  await api.delete(`/admin/users/${deleteTarget.value.id}`);
  deleteTarget.value = null;
  loadUsers();
}

async function handleLogout() {
  await adminAuth.logout();
  router.push({ name: 'AdminLogin' });
}

onMounted(async () => {
  loadDashboard();
  loadUsers();
});
</script>

<style scoped>
.admin-panel {
  display: flex;
  height: 100vh;
  background: #080b10;
  color: #c8d0e0;
  font-family: 'Inter', system-ui, sans-serif;
  overflow: hidden;
}

/* ── Sidebar ─────────────────────────────── */
.sidebar {
  width: 220px;
  flex-shrink: 0;
  background: rgba(10, 14, 22, 0.95);
  border-right: 1px solid rgba(255,255,255,0.06);
  display: flex;
  flex-direction: column;
  transition: width 0.25s cubic-bezier(0.22,1,0.36,1);
  overflow: hidden;
}
.sidebar.collapsed { width: 64px; }

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 16px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  overflow: hidden;
  white-space: nowrap;
}
.logo-icon { width: 28px; height: 28px; color: #00f0ff; flex-shrink: 0; }
.logo-text { font-size: 1rem; font-weight: 700; color: #e8eaf0; letter-spacing: -0.01em; }
.sidebar.collapsed .logo-text { display: none; }

.collapse-btn {
  background: none;
  border: none;
  color: rgba(100,120,160,0.6);
  cursor: pointer;
  padding: 4px;
  display: flex;
  border-radius: 6px;
  transition: color 0.2s, background 0.2s;
  flex-shrink: 0;
}
.collapse-btn:hover { color: #c8d0e0; background: rgba(255,255,255,0.05); }
.collapse-btn svg { width: 16px; height: 16px; transition: transform 0.25s; }
.sidebar.collapsed .collapse-btn svg { transform: rotate(180deg); }

.sidebar-nav {
  flex: 1;
  padding: 12px 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow-y: auto;
}
.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: none;
  background: none;
  border-radius: 8px;
  color: rgba(140,160,190,0.8);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  white-space: nowrap;
  width: 100%;
  text-align: left;
  font-size: 0.875rem;
}
.nav-item:hover { background: rgba(255,255,255,0.05); color: #c8d0e0; }
.nav-item.active { background: rgba(0,240,255,0.08); color: #00f0ff; }
.nav-icon { width: 18px; height: 18px; flex-shrink: 0; display: flex; }
.nav-icon :deep(svg) { width: 18px; height: 18px; }
.nav-label { font-weight: 500; }
.sidebar.collapsed .nav-label { display: none; }

.sidebar-footer {
  padding: 14px 12px;
  border-top: 1px solid rgba(255,255,255,0.05);
  display: flex;
  align-items: center;
  gap: 8px;
}
.admin-info { display: flex; align-items: center; gap: 10px; flex: 1; overflow: hidden; }
.admin-avatar {
  width: 32px; height: 32px; border-radius: 8px;
  background: linear-gradient(135deg, #0070ff, #00a8ff);
  display: flex; align-items: center; justify-content: center;
  font-size: 0.8rem; font-weight: 700; color: #fff; flex-shrink: 0;
}
.admin-meta { overflow: hidden; min-width: 0; }
.sidebar.collapsed .admin-meta { display: none; }
.admin-name { font-size: 0.8rem; font-weight: 600; color: #c8d0e0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.admin-role { font-size: 0.7rem; color: rgba(100,120,160,0.7); text-transform: capitalize; }

.logout-btn {
  background: none; border: none; cursor: pointer; color: rgba(100,120,160,0.6);
  padding: 6px; border-radius: 6px; display: flex; flex-shrink: 0;
  transition: color 0.2s, background 0.2s;
}
.logout-btn:hover { color: #ff6070; background: rgba(255,60,80,0.08); }
.logout-btn svg { width: 16px; height: 16px; }

/* ── Main content ────────────────────────── */
.main-content { flex: 1; display: flex; flex-direction: column; overflow: hidden; }

.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 28px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  background: rgba(10,14,22,0.6);
  backdrop-filter: blur(10px);
}
.page-title h2 { font-size: 1.2rem; font-weight: 700; color: #e8eaf0; margin: 0 0 2px; }
.breadcrumb { font-size: 0.72rem; color: rgba(100,120,160,0.6); }
.date-display { font-size: 0.8rem; color: rgba(100,120,160,0.6); }

.section-content { flex: 1; overflow-y: auto; padding: 24px 28px; }

/* Stats */
.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
.stat-card {
  background: rgba(14,18,28,0.8);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  transition: border-color 0.2s;
}
.stat-card:hover { border-color: rgba(0,240,255,0.15); }
.stat-card.warning:hover { border-color: rgba(255,160,0,0.2); }

.stat-icon {
  width: 44px; height: 44px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.stat-icon svg { width: 20px; height: 20px; }
.stat-icon.users { background: rgba(0,112,255,0.12); color: #0090ff; }
.stat-icon.online { background: rgba(0,232,122,0.12); color: #00e87a; }
.stat-icon.posts  { background: rgba(160,80,255,0.12); color: #a050ff; }
.stat-icon.banned { background: rgba(255,160,0,0.12); color: #ffa000; }

.stat-value { font-size: 1.6rem; font-weight: 700; color: #e8eaf0; line-height: 1; }
.stat-label { font-size: 0.75rem; color: rgba(100,120,160,0.8); margin-top: 4px; }

/* Table */
.table-toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.search-wrap { position: relative; }
.search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); width: 15px; height: 15px; color: rgba(100,120,160,0.5); pointer-events: none; }
.search-input {
  padding: 9px 14px 9px 38px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 8px;
  color: #c8d0e0;
  font-size: 0.85rem;
  outline: none;
  width: 260px;
  transition: border-color 0.2s;
}
.search-input:focus { border-color: rgba(0,240,255,0.3); }
.search-input::placeholder { color: rgba(100,120,160,0.4); }

.table-container { overflow-x: auto; border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; }
.data-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
.data-table th {
  padding: 11px 14px; text-align: left;
  background: rgba(14,18,28,0.9);
  color: rgba(100,120,160,0.8);
  font-size: 0.72rem; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.05em;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  white-space: nowrap;
}
.data-table td {
  padding: 11px 14px;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  color: #b0b8cc;
  background: rgba(12,16,24,0.6);
}
.data-table tr:last-child td { border-bottom: none; }
.data-table tr.banned td { opacity: 0.6; }
.data-table tbody tr:hover td { background: rgba(255,255,255,0.02); }

.id-cell { color: rgba(100,120,160,0.5); font-size: 0.78rem; }
.username-cell { display: flex; align-items: center; gap: 8px; font-weight: 500; color: #c8d0e0; }
.online-dot { width: 7px; height: 7px; border-radius: 50%; background: rgba(100,120,160,0.3); flex-shrink: 0; }
.online-dot.online { background: #00e87a; box-shadow: 0 0 6px rgba(0,232,122,0.5); }
.email-cell { color: rgba(140,160,190,0.7); font-size: 0.82rem; }
.date-cell { color: rgba(100,120,160,0.6); font-size: 0.8rem; }

.role-badge {
  display: inline-block; padding: 2px 8px; border-radius: 20px;
  font-size: 0.7rem; font-weight: 600; text-transform: capitalize;
}
.role-badge.user { background: rgba(100,120,160,0.12); color: rgba(140,160,190,0.8); }
.role-badge.admin { background: rgba(0,112,255,0.12); color: #4090ff; }
.role-badge.superadmin { background: rgba(160,80,255,0.12); color: #b070ff; }

.status-badge {
  display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 0.7rem; font-weight: 600;
}
.status-badge.active { background: rgba(0,232,122,0.1); color: #00e87a; }
.status-badge.banned { background: rgba(255,60,80,0.1); color: #ff6070; }

.table-loading, .table-empty {
  text-align: center; padding: 32px; color: rgba(100,120,160,0.5); font-size: 0.85rem;
}
.table-loading { display: flex; align-items: center; justify-content: center; gap: 10px; }

.actions-cell { display: flex; align-items: center; gap: 6px; }
.action-btn {
  padding: 4px 10px; border: none; border-radius: 6px;
  font-size: 0.75rem; font-weight: 600; cursor: pointer; transition: opacity 0.15s;
}
.action-btn:hover { opacity: 0.8; }
.action-btn.ban { background: rgba(255,160,0,0.12); color: #ffa000; }
.action-btn.unban { background: rgba(0,232,122,0.1); color: #00c870; }
.action-btn.delete { background: rgba(255,60,80,0.1); color: #ff6070; }

/* Pagination */
.pagination { display: flex; align-items: center; justify-content: center; gap: 12px; margin-top: 16px; font-size: 0.85rem; }
.pagination button {
  padding: 6px 14px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 6px; color: #c8d0e0; cursor: pointer; transition: background 0.15s;
}
.pagination button:hover:not(:disabled) { background: rgba(255,255,255,0.08); }
.pagination button:disabled { opacity: 0.3; cursor: not-allowed; }

/* Loading states */
.loading-state { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; height: 200px; color: rgba(100,120,160,0.6); }
.spinner-lg { width: 36px; height: 36px; border: 3px solid rgba(255,255,255,0.08); border-top-color: #00f0ff; border-radius: 50%; animation: spin 0.8s linear infinite; }
.spinner-sm { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.08); border-top-color: #00f0ff; border-radius: 50%; animation: spin 0.8s linear infinite; display: inline-block; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Modal */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center; z-index: 100;
}
.modal {
  background: #0e1218; border: 1px solid rgba(255,60,80,0.2); border-radius: 14px;
  padding: 28px; max-width: 380px; width: 90%;
  animation: card-in 0.2s cubic-bezier(0.22,1,0.36,1) both;
}
@keyframes card-in { from { opacity:0; transform: scale(0.96); } to { opacity:1; transform: scale(1); } }
.modal h3 { font-size: 1rem; font-weight: 700; color: #e8eaf0; margin: 0 0 10px; }
.modal p { font-size: 0.85rem; color: rgba(140,160,190,0.8); margin: 0 0 20px; }
.modal strong { color: #c8d0e0; }
.modal-actions { display: flex; gap: 10px; justify-content: flex-end; }
.btn-cancel { padding: 8px 16px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; color: #c8d0e0; cursor: pointer; font-size: 0.85rem; }
.btn-danger { padding: 8px 16px; background: rgba(255,60,80,0.15); border: 1px solid rgba(255,60,80,0.3); border-radius: 8px; color: #ff6070; cursor: pointer; font-size: 0.85rem; font-weight: 600; }
.btn-cancel:hover { background: rgba(255,255,255,0.08); }
.btn-danger:hover { background: rgba(255,60,80,0.25); }
</style>
