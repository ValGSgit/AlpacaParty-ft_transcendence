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

        <!-- Mobile hamburger -->
        <button class="hamburger" @click="mobileOpen = !mobileOpen" aria-label="Toggle menu">
          <span :class="['bar', { open: mobileOpen }]"></span>
          <span :class="['bar', { open: mobileOpen }]"></span>
          <span :class="['bar', { open: mobileOpen }]"></span>
        </button>

        <div :class="['nav-links', { open: mobileOpen }]">
          <!-- Public links -->
          <router-link to="/docs" class="nav-link" @click="mobileOpen = false">Docs</router-link>
          <router-link to="/showcase" class="nav-link" @click="mobileOpen = false">Showcase</router-link>
          <router-link to="/game" class="nav-link nav-game" @click="mobileOpen = false">AlpacaFarm</router-link>

          <template v-if="authStore.isAuthenticated">
            <!-- Divider -->
            <span class="nav-divider"></span>

            <!-- Core social -->
            <router-link to="/feed" class="nav-link" @click="mobileOpen = false">Feed</router-link>
            <router-link to="/friends" class="nav-link" @click="mobileOpen = false">Friends</router-link>
            <router-link to="/messages" class="nav-link" @click="mobileOpen = false">Messages</router-link>

            <!-- Game -->
            <router-link to="/spit-royale" class="nav-link nav-game" @click="mobileOpen = false">SpitRoyale</router-link>

            <!-- Divider -->
            <span class="nav-divider"></span>

            <!-- User area -->
            <router-link to="/profile" class="nav-link" @click="mobileOpen = false">Profile</router-link>
            <router-link to="/settings" class="nav-link" @click="mobileOpen = false">Settings</router-link>
            <router-link to="/help" class="nav-link nav-help" @click="mobileOpen = false">Help</router-link>

            <!-- Admin links -->
            <template v-if="authStore.user?.is_admin">
              <span class="nav-divider"></span>
              <router-link to="/admin" class="nav-link nav-admin" @click="mobileOpen = false">Admin</router-link>
              <router-link to="/security" class="nav-link nav-admin" @click="mobileOpen = false">Security</router-link>
            </template>

            <!-- Notifications -->
            <div class="notif-wrapper">
              <button class="nav-link nav-btn notification-btn" @click="toggleNotifications" title="Notifications">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                <span v-if="unreadCount" class="notif-badge">{{ unreadCount }}</span>
              </button>
              <div v-if="showNotifPanel" class="notif-panel">
                <div class="notif-panel-header">
                  <span>Notifications</span>
                  <button class="notif-close" @click="showNotifPanel = false">&times;</button>
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

            <button class="nav-link nav-btn logout-btn" @click="handleLogout">Logout</button>
          </template>
          <template v-else>
            <span class="nav-divider"></span>
            <router-link to="/login" class="nav-link nav-login" @click="mobileOpen = false">Login</router-link>
            <router-link to="/register" class="nav-link nav-register" @click="mobileOpen = false">Sign Up</router-link>
          </template>
        </div>
      </div>
    </nav>
    <main :class="['main-content', { 'game-content': ['Game', 'SpitRoyale'].includes($route.name) }]">
      <router-view />
    </main>
    <footer v-if="!['Game', 'SpitRoyale'].includes($route.name)" class="app-footer">
      <div class="footer-container">
        <span class="footer-copy">&copy; 2026 AlpacaParty</span>
        <div class="footer-links">
          <router-link to="/docs">API Docs</router-link>
          <router-link to="/showcase">Showcase</router-link>
          <router-link to="/privacy">Privacy Policy</router-link>
          <router-link to="/terms">Terms of Service</router-link>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from './stores/auth.js'
import api from './services/api.js'
import { connectSocket, disconnectSocket } from './services/socket.js'

const authStore = useAuthStore()
const router = useRouter()
const unreadCount = ref(0)
const showNotifPanel = ref(false)
const notifications = ref([])
const mobileOpen = ref(false)

// Close mobile menu on route change
router.afterEach(() => { mobileOpen.value = false })

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
  if (!n.is_read) {
    try {
      await api.put(`/notifications/${n.id}/read`)
      n.is_read = true
      unreadCount.value = Math.max(0, unreadCount.value - 1)
    } catch {}
  }
  // Navigate based on notification type
  showNotifPanel.value = false
  if (n.type === 'friend_request') router.push('/friends')
  else if (n.type === 'game_invite' || n.type === 'game_finish') router.push('/game')
  else if (n.type === 'post_like') router.push('/feed')
  else if (n.type === 'achievement') router.push('/profile')
  else if (n.type === 'dm' || n.type === 'message') router.push('/messages')
  else router.push('/profile')
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
  height: 100vh;
  width: 100vw;
}

/* ── Navbar ─────────────────────────────────────────────── */
.navbar {
  flex-shrink: 0;
  background: var(--bg-secondary, #12121a);
  border-bottom: 1px solid var(--border-color, #2a2a3a);
  padding: 0 1.5rem;
  position: sticky;
  top: 0;
  z-index: 900;
}

.nav-container {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px;
}

.nav-logo {
  text-decoration: none;
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--primary, #00f0ff);
  flex-shrink: 0;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 0.2rem;
}

.nav-link {
  text-decoration: none;
  color: var(--text-secondary, #a0a0b0);
  font-size: 0.85rem;
  padding: 0.4rem 0.65rem;
  border-radius: 6px;
  transition: color 0.15s, background 0.15s;
  white-space: nowrap;
}

.nav-link:hover {
  color: #e0e0f0;
  background: rgba(255, 255, 255, 0.04);
}

.nav-link.router-link-active {
  color: var(--primary, #00f0ff);
  background: rgba(0, 240, 255, 0.06);
}

.nav-game { font-weight: 600; }
.nav-help { color: #4ecdc4; }
.nav-help:hover { color: #6eeee4; }
.nav-admin { color: #ff6b6b; }
.nav-admin:hover { color: #ff9090; }

.nav-login {
  color: var(--primary, #00f0ff);
  font-weight: 600;
}

.nav-register {
  background: var(--primary, #00f0ff);
  color: #000;
  font-weight: 600;
  border-radius: 20px;
  padding: 0.4rem 1rem;
}
.nav-register:hover {
  opacity: 0.85;
  background: var(--primary, #00f0ff);
  color: #000;
}

.nav-divider {
  width: 1px;
  height: 20px;
  background: var(--border-color, #2a2a3a);
  margin: 0 0.3rem;
  flex-shrink: 0;
}

.nav-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: inherit;
  padding: 0.4rem 0.65rem;
}

.logout-btn {
  color: #a0a0b0;
  font-size: 0.85rem;
}
.logout-btn:hover { color: #ff6b6b; }

/* ── Notification ───────────────────────────────────────── */
.notification-btn {
  position: relative;
  display: flex;
  align-items: center;
}

.notif-badge {
  position: absolute;
  top: 0;
  right: 0;
  background: #ff5050;
  color: #fff;
  font-size: 0.6rem;
  font-weight: 700;
  padding: 1px 4px;
  border-radius: 8px;
  min-width: 14px;
  text-align: center;
  line-height: 1.3;
}

.notif-wrapper { position: relative; }

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
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
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
  font-size: 1.1rem;
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
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

.notif-msg { font-size: 0.85rem; color: var(--text-primary, #e8e8f0); }
.notif-time { font-size: 0.75rem; color: var(--text-secondary, #a0a0b0); }

/* ── Main ───────────────────────────────────────────────── */
.main-content {
  flex-grow: 1;
  position: relative;
}

.game-content {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  background: black;
  touch-action: none;
  overscroll-behavior: none;
}

/* ── Footer ─────────────────────────────────────────────── */
.app-footer {
  flex-shrink: 0;
  background: var(--bg-secondary, #12121a);
  border-top: 1px solid var(--border-color, #2a2a3a);
  padding: 0.75rem 1.5rem;
  font-size: 0.85rem;
}

.footer-container {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.footer-copy { color: var(--text-secondary, #a0a0b0); }

.footer-links {
  display: flex;
  gap: 1.25rem;
}

.footer-links a {
  color: var(--text-secondary, #a0a0b0);
  text-decoration: none;
  transition: color 0.2s;
  font-size: 0.82rem;
}

.footer-links a:hover { color: var(--primary, #00f0ff); }

/* ── Hamburger (mobile) ─────────────────────────────────── */
.hamburger {
  display: none;
  flex-direction: column;
  gap: 5px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
}

.bar {
  width: 22px;
  height: 2px;
  background: var(--text-secondary, #a0a0b0);
  border-radius: 2px;
  transition: transform 0.25s, opacity 0.25s;
}

.bar.open:nth-child(1) { transform: translateY(7px) rotate(45deg); }
.bar.open:nth-child(2) { opacity: 0; }
.bar.open:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }

/* ── Responsive ─────────────────────────────────────────── */
@media (max-width: 900px) {
  .hamburger { display: flex; }

  .nav-links {
    display: none;
    position: absolute;
    top: 56px;
    left: 0;
    right: 0;
    background: var(--bg-secondary, #12121a);
    border-bottom: 1px solid var(--border-color, #2a2a3a);
    flex-direction: column;
    padding: 0.75rem 1rem;
    gap: 0.15rem;
    z-index: 899;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  }

  .nav-links.open { display: flex; }

  .nav-divider {
    width: 100%;
    height: 1px;
    margin: 0.4rem 0;
  }

  .nav-link {
    padding: 0.55rem 0.75rem;
    font-size: 0.9rem;
    width: 100%;
  }

  .nav-register {
    text-align: center;
    border-radius: 8px;
  }
}
</style>
