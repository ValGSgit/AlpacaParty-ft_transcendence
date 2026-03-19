<!--
  Root Application Component
  @owner fankahou, LukasStefanek
  @issue https://github.com/ValGSgit/AlpacaParty/issues/1
-->
<template>
  <div id="app">
    <nav class="navbar">
      <div class="nav-container">
        <router-link to="/" class="nav-logo">
          <span class="logo-text">Alpaca Party!</span>
        </router-link>
        <div class="nav-links">
          <router-link to="/" class="nav-link">Home</router-link>
          <router-link to="/api-test" class="nav-link" style="color:#ffd93d">API Test</router-link>
          <template v-if="authStore.isAuthenticated">
            <router-link to="/friends"  class="nav-link">Friends</router-link>
            <router-link to="/messages" class="nav-link">Messages</router-link>
            <router-link to="/feed"     class="nav-link">Feed</router-link>
            <router-link to="/game"     class="nav-link">Game</router-link>
            <router-link to="/profile"  class="nav-link">Profile</router-link>
            <router-link to="/settings" class="nav-link">Settings</router-link>
            <router-link to="/help" class="nav-link" style="color:#4ecdc4">Help</router-link>
            <router-link v-if="authStore.user?.is_admin" to="/admin" class="nav-link" style="color:#ff6b6b">Admin</router-link>
            <div class="notif-wrapper">
              <button class="nav-link nav-btn notification-btn" @click="toggleNotifications" title="Notifications">
                🔔<span v-if="unreadCount" class="notif-badge">{{ unreadCount }}</span>
              </button>
              <div v-if="showNotifPanel" class="notif-panel">
                <div class="notif-panel-header">
                  <span>Notifications</span>
                  <button class="notif-close" @click="showNotifPanel = false">✕</button>
                </div>
                <div v-if="!notifications.length" class="notif-empty">No notifications yet</div>
                <div
                  v-for="n in notifications"
                  :key="n.id"
                  :class="['notif-item', { unread: !n.is_read }]"
                  @click="markNotifRead(n)"
                >
                  <span class="notif-msg">{{ n.message }}</span>
                  <span class="notif-time">{{ formatNotifTime(n.created_at) }}</span>
                </div>
              </div>
            </div>
            <button class="nav-link nav-btn" @click="handleLogout">Logout</button>
          </template>
          <template v-else>
            <router-link to="/login" class="nav-link">Login</router-link>
          </template>
        </div>
      </div>
    </nav>
    <main :class="['main-content', { 'game-content': $route.name === 'Game' }]">
      <router-view />
    </main>
    <footer v-if="$route.name !== 'Game'" class="app-footer">
      <div class="footer-container">
        <span class="footer-copy">&copy; 2026 AlpacaParty</span>
        <div class="footer-links">
          <router-link to="/privacy">Privacy Policy</router-link>
          <router-link to="/terms">Terms of Service</router-link>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from './stores/auth.js'
import api from './services/api.js'
import { connectSocket, disconnectSocket, getSocket } from './services/socket.js'

const authStore = useAuthStore()
const router = useRouter()
const unreadCount = ref(0)
const showNotifPanel = ref(false)
const notifications = ref([])

async function handleLogout() {
  disconnectSocket()
  await authStore.logout()
  router.push('/')
}

function toggleNotifications() {
  showNotifPanel.value = !showNotifPanel.value
  if (showNotifPanel.value) fetchNotifications()
}

async function fetchNotifications() {
  try {
    const { data } = await api.get('/notifications')
    notifications.value = data.notifications || []
    unreadCount.value = notifications.value.filter(n => !n.is_read).length
  } catch {}
}

async function fetchUnreadCount() {
  try {
    const { data } = await api.get('/notifications')
    const notifs = data.notifications || []
    unreadCount.value = notifs.filter(n => !n.is_read).length
  } catch {}
}

async function markNotifRead(n) {
  if (n.is_read) return
  try {
    await api.put(`/notifications/${n.id}`, { is_read: true })
    n.is_read = true
    unreadCount.value = Math.max(0, unreadCount.value - 1)
  } catch {}
}

function formatNotifTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  const diff = Date.now() - d
  if (diff < 60000) return 'just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return d.toLocaleDateString()
}

function handleOutsideClick(e) {
  const wrapper = document.querySelector('.notif-wrapper')
  if (wrapper && !wrapper.contains(e.target)) {
    showNotifPanel.value = false
  }
}

// Connect socket when authenticated
watch(() => authStore.isAuthenticated, (isAuth) => {
  if (isAuth) {
    const token = localStorage.getItem('accessToken')
    if (token) {
      const sock = connectSocket(token)
      sock.on('notification', () => {
        unreadCount.value++
      })
    }
    fetchUnreadCount()
  } else {
    disconnectSocket()
    unreadCount.value = 0
  }
}, { immediate: true })

onMounted(() => {
  document.addEventListener('click', handleOutsideClick)
})

onUnmounted(() => {
  document.removeEventListener('click', handleOutsideClick)
})
</script>

<style scoped>
#app {
  display: flex;
  flex-direction: column;
  height: 100vh; /* Force the app to be exactly the screen height */
  width: 100vw;
}

.navbar {
  flex-shrink: 0; /* Prevents the navbar from squishing */
  background: var(--bg-secondary, #12121a);
  border-bottom: 1px solid var(--border-color, #2a2a3a);
  padding: 0.75rem 1.5rem;
}

.nav-container {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.nav-logo {
  text-decoration: none;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--primary, #00f0ff);
}

.nav-links {
  display: flex;
  gap: 1rem;
}

.nav-link {
  text-decoration: none;
  color: var(--text-secondary, #a0a0b0);
  transition: color 0.2s;
}

.nav-link:hover,
.nav-link.router-link-active {
  color: var(--primary, #00f0ff);
}

.nav-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: inherit;
  padding: 0;
}

.notification-btn {
  position: relative;
}

.notif-badge {
  position: absolute;
  top: -6px;
  right: -8px;
  background: #ff5050;
  color: #fff;
  font-size: 0.65rem;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 8px;
  min-width: 14px;
  text-align: center;
}

.main-content {
  flex-grow: 1; /* Tells the main content to take up all remaining space */
  position: relative;
}

.game-content {
  width: 100%;
  height: 100%; /* Now 100% of the remaining space, NOT the whole screen */
  margin: 0;
  padding: 0;
  background: black;
  
  /* CRITICAL: Stops the browser from "panning" when you drag the mouse/finger */
  touch-action: none; 
  overscroll-behavior: none;
}

.app-footer {
  flex-shrink: 0;
  background: var(--bg-secondary, #12121a);
  border-top: 1px solid var(--border-color, #2a2a3a);
  padding: 0.75rem 1.5rem;
  font-size: 0.85rem;
}

.footer-container {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.footer-copy {
  color: var(--text-secondary, #a0a0b0);
}

.footer-links {
  display: flex;
  gap: 1.25rem;
}

.footer-links a {
  color: var(--text-secondary, #a0a0b0);
  text-decoration: none;
  transition: color 0.2s;
}

.footer-links a:hover {
  color: var(--primary, #00f0ff);
}

/* ── Notification panel ─────────────────────────────── */
.notif-wrapper {
  position: relative;
}

.notif-panel {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 320px;
  max-height: 420px;
  overflow-y: auto;
  background: var(--bg-secondary, #12121a);
  border: 1px solid var(--border-color, #2a2a3a);
  border-radius: 10px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.5);
  z-index: 1000;
}

.notif-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border-color, #2a2a3a);
  font-weight: 600;
  font-size: 0.9rem;
  position: sticky;
  top: 0;
  background: var(--bg-secondary, #12121a);
}

.notif-close {
  background: none;
  border: none;
  color: var(--text-secondary, #a0a0b0);
  cursor: pointer;
  font-size: 0.9rem;
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
  transition: color 0.2s;
}
.notif-close:hover { color: var(--primary, #00f0ff); }

.notif-empty {
  padding: 1.5rem 1rem;
  text-align: center;
  color: var(--text-secondary, #a0a0b0);
  font-size: 0.85rem;
}

.notif-item {
  padding: 0.65rem 1rem;
  border-bottom: 1px solid var(--border-color, #2a2a3a);
  cursor: pointer;
  transition: background 0.15s;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}
.notif-item:last-child { border-bottom: none; }
.notif-item:hover { background: var(--bg-tertiary, #1a1a2a); }
.notif-item.unread {
  background: rgba(0, 240, 255, 0.05);
  border-left: 3px solid var(--primary, #00f0ff);
}

.notif-msg {
  font-size: 0.85rem;
  color: var(--text-primary, #e8e8f0);
}

.notif-time {
  font-size: 0.75rem;
  color: var(--text-secondary, #a0a0b0);
}
</style>
