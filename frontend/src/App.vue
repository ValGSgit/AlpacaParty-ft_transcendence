<template>
  <div id="app">
    <!-- Top navbar — hidden on full-screen auth pages -->
    <nav v-if="!isAuthRoute" :class="['navbar', { scrolled }]">
      <div class="nav-bar-glow"></div>
      <div class="nav-container">
        <router-link to="/" class="nav-logo">
          <AppIcon name="alpaca" :size="24" class="logo-icon" />
          <span class="logo-text">AlpacaParty</span>
        </router-link>

        <button :class="['hamburger', { open: mobileOpen }]" @click="mobileOpen = !mobileOpen" aria-label="Toggle menu">
          <span class="bar"></span>
          <span class="bar"></span>
          <span class="bar"></span>
        </button>

        <div :class="['nav-links', { open: mobileOpen }]">
          <router-link to="/game" class="nav-link nav-game" @click="mobileOpen = false">AlpacaFarm</router-link>

          <template v-if="authStore.isAuthenticated">
            <span class="nav-divider"></span>
            <router-link to="/feed" class="nav-link" @click="mobileOpen = false">Feed</router-link>
            <router-link to="/friends" class="nav-link" @click="mobileOpen = false">Friends</router-link>
            <span class="nav-divider"></span>

            <router-link to="/profile" class="nav-link" title="Profile" @click="mobileOpen = false">
              <AppIcon name="user" :size="18" />
            </router-link>

            <div class="notif-wrapper">
              <button class="nav-link nav-btn notification-btn" @click="toggleNotifications" title="Notifications">
                <AppIcon name="bell-full" :size="20" />
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

            <button class="nav-link nav-btn logout-btn" @click="handleLogout" title="Logout">
              <AppIcon name="logout" :size="18" />
              <span class="logout-label">Logout</span>
            </button>
          </template>
          <template v-else>
            <span class="nav-divider"></span>
            <router-link to="/docs" class="nav-link" @click="mobileOpen = false">Docs</router-link>
            <span class="nav-divider"></span>
            <router-link to="/login" class="nav-link nav-login" @click="mobileOpen = false">Login</router-link>
            <router-link to="/register" class="nav-link nav-register" @click="mobileOpen = false">Sign Up</router-link>
          </template>
        </div>
      </div>
    </nav>

    <!-- Page content -->
    <main :class="['main-content', { 'game-content': isGameRoute }]">
      <router-view />
    </main>

    <!-- Footer -->
    <footer v-if="hasFooter" class="app-footer">
      <div class="footer-container">
        <span class="footer-copy">&copy; 2026 AlpacaParty</span>
        <div class="footer-links">
          <router-link to="/help">Help</router-link>
          <a href="/api/docs/public">API Docs</a>
          <router-link to="/privacy">Privacy Policy</router-link>
          <router-link to="/terms">Terms of Service</router-link>
        </div>
      </div>
    </footer>

    <!-- Floating message button (positioned fixed via global CSS in style.css) -->
    <div v-if="authStore.isAuthenticated && !isAuthRoute" :class="['bottom-left-nav', { 'with-footer': hasFooter }]">
      <button class="message-btn" @click="showMessagesModal = true" title="Messages">
        <AppIcon name="message" :size="44" />
        <span v-if="unreadMessages" class="msg-badge">{{ unreadMessages }}</span>
      </button>
    </div>

    <!-- Messages modal -->
    <div v-if="showMessagesModal" class="modal-overlay" @click.self="showMessagesModal = false">
      <div class="messages-modal-content">
        <button class="modal-close-top" @click="showMessagesModal = false">&times;</button>
        <Messages />
      </div>
    </div>

    <!-- AI help desk widget -->
    <HelpDeskChat v-if="authStore.isAuthenticated && !isAuthRoute" :with-footer="hasFooter" />

  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from './stores/auth.js'
import api from './services/api.js'
import { devError } from './services/logger.js'
import { connectSocket, disconnectSocket } from './services/socket.js'
import AppIcon from './components/AppIcon.vue'
import HelpDeskChat from './components/HelpDeskChat.vue'
import Messages from './views/Messages.vue'

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()

const mobileOpen = ref(false)
const scrolled = ref(false)
const showNotifPanel = ref(false)
const showMessagesModal = ref(false)
const notifications = ref([])
const unreadCount = ref(0)
const unreadMessages = ref(0)

watch(showMessagesModal, (open) => {
  if (open) unreadMessages.value = 0
})

const PAGES_WITHOUT_FOOTER = ['Game', 'Home']
const hasFooter = computed(() => !PAGES_WITHOUT_FOOTER.includes(route.name))
const isGameRoute = computed(() => ['Game', 'SpitRoyale'].includes(route.name))
const isAuthRoute = computed(() => ['AdminLogin', 'AdminPanel'].includes(route.name))

router.afterEach(() => { mobileOpen.value = false })

async function handleLogout() {
  disconnectSocket()
  await authStore.logout()
  router.push('/login')
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
  } catch (e) { devError(e) }
}

async function fetchUnreadMessages() {
  try {
    const { data } = await api.get('/chat/unread')
    unreadMessages.value = data.count || 0
  } catch { /* ignore */ }
}

async function markNotifRead(n) {
  if (!n.is_read) {
    try {
      await api.put(`/notifications/${n.id}/read`)
      n.is_read = true
      unreadCount.value = Math.max(0, unreadCount.value - 1)
    } catch (e) { devError(e) }
  }
  showNotifPanel.value = false
  const targetByType = {
    friend_request: '/friends',
    game_invite:    '/game',
    game_finish:    '/game',
    post_like:      '/feed',
    achievement:    '/profile',
  }
  router.push(targetByType[n.type] || '/')
}

function formatNotifTime(ts) {
  if (!ts) return ''
  const diff = Date.now() - new Date(ts)
  if (diff < 60_000)    return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return new Date(ts).toLocaleDateString()
}

function handleOutsideClick(e) {
  const wrapper = document.querySelector('.notif-wrapper')
  if (wrapper && !wrapper.contains(e.target)) showNotifPanel.value = false
}

function handleScroll() { scrolled.value = window.scrollY > 12 }

// Socket listener lifecycle.
//
// The auth-state watcher previously called `sock.on(...)` five times every
// time `isAuthenticated` flipped true. If the watcher re-fired without
// going through `false` first (rapid auth refresh, dev-server HMR keeping
// the singleton alive, etc.) the same handlers got registered N times and
// every notification / presence event fired N times.
//
// Capture the handlers once, track the socket they're attached to, and
// always unbind before binding.
const socketHandlers = {
  notification: () => { unreadCount.value++ },
  connect:      () => { if (authStore.user) authStore.user.isOnline = true },
  disconnect:   () => { if (authStore.user) authStore.user.isOnline = false },
  presence:     ({ userId, isOnline }) => {
    if (authStore.user && Number(userId) === Number(authStore.user.id)) {
      authStore.user.isOnline = isOnline
    }
  },
  'dm:message': () => {
    if (!showMessagesModal.value) unreadMessages.value++
  },
}
let boundSocket = null

function bindSocketHandlers(sock) {
  if (!sock) return
  // If we're being asked to bind to the same socket twice (which would
  // double-register every handler), unbind first.
  if (boundSocket === sock) unbindSocketHandlers()
  for (const [event, handler] of Object.entries(socketHandlers)) {
    sock.on(event, handler)
  }
  boundSocket = sock
}

function unbindSocketHandlers() {
  if (!boundSocket) return
  for (const [event, handler] of Object.entries(socketHandlers)) {
    boundSocket.off(event, handler)
  }
  boundSocket = null
}

watch(() => authStore.isAuthenticated, (isAuth) => {
  if (isAuth) {
    // Auth is cookie-based (httpOnly + sameSite=strict + secure). Socket.IO
    // is configured with `withCredentials: true` so the JWT cookie is sent on
    // the handshake and validated by socketAuthMiddleware. No client-side token.
    const sock = connectSocket()
    bindSocketHandlers(sock)
    // If already connected when the watcher runs, mark online immediately
    if (sock.connected && authStore.user) authStore.user.isOnline = true

    fetchNotifications()
    fetchUnreadMessages()
  } else {
    unbindSocketHandlers()
    disconnectSocket()
    unreadCount.value = 0
    unreadMessages.value = 0
    notifications.value = []
  }
}, { immediate: true })

onMounted(() => {
  document.addEventListener('click', handleOutsideClick)
  window.addEventListener('scroll', handleScroll, { passive: true })
})
onUnmounted(() => {
  document.removeEventListener('click', handleOutsideClick)
  window.removeEventListener('scroll', handleScroll)
  unbindSocketHandlers()
})
</script>

<style scoped>
/* ── reset / root ───────────────────────────────────────── */
#app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
}

/* ══ NAVBAR ═════════════════════════════════════════════════ */
.navbar {
  position: sticky;
  top: 0;
  z-index: 900;
  flex-shrink: 0;
  padding: 0 1.5rem;
  background: rgba(6, 9, 13, 0.7);
  backdrop-filter: blur(20px) saturate(1.5);
  -webkit-backdrop-filter: blur(20px) saturate(1.5);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  box-shadow: 0 1px 0 rgba(0, 240, 255, 0.04), 0 4px 24px rgba(0, 0, 0, 0.35);
  transition: background 0.3s, box-shadow 0.3s;
  animation: nav-drop 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.navbar.scrolled {
  background: rgba(6, 9, 13, 0.92);
  box-shadow: 0 1px 0 rgba(0, 240, 255, 0.09), 0 8px 36px rgba(0, 0, 0, 0.55);
}

@keyframes nav-drop {
  from { transform: translateY(-100%); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}

/* subtle moving gradient line at the top edge */
.nav-bar-glow {
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 1px;
  background: linear-gradient(90deg,
    transparent 0%,
    rgba(0, 232, 122, 0.6) 30%,
    rgba(0, 240, 255, 0.8) 50%,
    rgba(0, 232, 122, 0.6) 70%,
    transparent 100%
  );
  background-size: 200% 100%;
  animation: glow-sweep 4s linear infinite;
}

@keyframes glow-sweep {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.nav-container {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 58px;
}

/* ── Logo ───────────────────────────────────────────────── */
.nav-logo {
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
  font-size: 1.15rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  background: linear-gradient(90deg, #00f0ff 0%, #00e87a 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  transition: filter 0.2s;
}

.nav-logo:hover { filter: brightness(1.15) drop-shadow(0 0 8px rgba(0, 240, 255, 0.35)); }

.logo-icon {
  flex-shrink: 0;
  filter: drop-shadow(0 0 7px rgba(0, 232, 122, 0.5));
  animation: logo-pulse 3.5s ease-in-out infinite;
}

@keyframes logo-pulse {
  0%, 100% { filter: drop-shadow(0 0 6px rgba(0, 240, 255, 0.45)); }
  50%       { filter: drop-shadow(0 0 14px rgba(0, 232, 122, 0.7)); }
}

/* ── Nav links row ──────────────────────────────────────── */
.nav-links {
  display: flex;
  align-items: center;
  gap: 0.15rem;
}

/* ── Generic link ───────────────────────────────────────── */
.nav-link {
  position: relative;
  text-decoration: none;
  color: rgba(255, 255, 255, 0.48);
  font-size: 0.875rem;
  font-weight: 500;
  padding: 0.42rem 0.75rem;
  border-radius: 8px;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  letter-spacing: 0.005em;
  transition: color 0.2s, background 0.2s;
}

/* animated underline */
.nav-link::after {
  content: '';
  position: absolute;
  bottom: 4px;
  left: 50%;
  width: 0;
  height: 2px;
  background: linear-gradient(90deg, #00e87a, #00f0ff);
  border-radius: 1px;
  transform: translateX(-50%);
  transition: width 0.25s cubic-bezier(0.34, 1.4, 0.64, 1);
}

.nav-link:hover {
  color: rgba(255, 255, 255, 0.88);
  background: rgba(255, 255, 255, 0.05);
}

.nav-link:hover::after { width: calc(100% - 1.5rem); }

.nav-link.router-link-active {
  color: #00f0ff;
  background: rgba(0, 240, 255, 0.07);
}
.nav-link.router-link-active::after { width: calc(100% - 1.5rem); }

/* ── AlpacaFarm highlight ───────────────────────────────── */
.nav-game {
  color: #00e87a;
  font-weight: 600;
}
.nav-game:hover { color: #00e87a; }
.nav-game.router-link-active { color: #00e87a; background: rgba(0, 232, 122, 0.08); }
.nav-game::after { background: linear-gradient(90deg, #00e87a, #00f0b0); }

/* ── Login (outlined pill) ──────────────────────────────── */
.nav-login {
  color: #00f0ff;
  font-weight: 600;
  border: 1px solid rgba(0, 240, 255, 0.28);
  border-radius: 20px;
  padding: 0.38rem 1.05rem;
  transition: color 0.2s, border-color 0.2s, background 0.2s, box-shadow 0.2s;
}
.nav-login::after { display: none; }
.nav-login:hover {
  color: #00f0ff;
  background: rgba(0, 240, 255, 0.09);
  border-color: rgba(0, 240, 255, 0.55);
  box-shadow: 0 0 14px rgba(0, 240, 255, 0.12);
}
.nav-login.router-link-active {
  background: rgba(0, 240, 255, 0.09);
  border-color: rgba(0, 240, 255, 0.55);
}

/* ── Register (gradient pill with shine) ────────────────── */
.nav-register {
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, #00c96a, #00e87a 50%, #00f0b0);
  color: #041a0e;
  font-weight: 700;
  border-radius: 20px;
  padding: 0.42rem 1.1rem;
  box-shadow: 0 2px 14px rgba(0, 232, 122, 0.28);
  transition: transform 0.15s, box-shadow 0.2s, filter 0.2s;
}
.nav-register::after { display: none; }
.nav-register::before {
  content: '';
  position: absolute;
  top: 0; left: -100%;
  width: 55%; height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.28), transparent);
  animation: reg-shine 2.8s ease-in-out infinite;
}

@keyframes reg-shine {
  0%       { left: -100%; }
  40%, 100% { left: 160%; }
}

.nav-register:hover {
  color: #041a0e;
  background: linear-gradient(135deg, #00c96a, #00e87a 50%, #00f0b0);
  transform: translateY(-1px);
  box-shadow: 0 5px 22px rgba(0, 232, 122, 0.45);
}
.nav-register:active { transform: translateY(0); }

/* ── Divider ────────────────────────────────────────────── */
.nav-divider {
  width: 1px;
  height: 18px;
  background: rgba(255, 255, 255, 0.08);
  margin: 0 0.25rem;
  flex-shrink: 0;
}

/* ── Icon buttons (profile, notif, logout) ──────────────── */
.nav-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: inherit;
  padding: 0.42rem 0.65rem;
}

.logout-btn { color: rgba(255, 255, 255, 0.45); font-size: 0.875rem; }
.logout-btn:hover { color: #ff6b6b; background: rgba(255, 107, 107, 0.07); }
.logout-label { display: none; }

/* ── Notifications ──────────────────────────────────────── */
.notification-btn { position: relative; display: flex; align-items: center; }

.notif-badge {
  position: absolute;
  top: 2px; right: 2px;
  background: linear-gradient(135deg, #ff4f4f, #ff7a3d);
  color: #fff;
  font-size: 0.58rem;
  font-weight: 800;
  padding: 1px 4px;
  border-radius: 8px;
  min-width: 14px;
  text-align: center;
  line-height: 1.3;
  box-shadow: 0 0 6px rgba(255, 79, 79, 0.5);
}

.notif-wrapper { position: relative; }

.notif-panel {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  width: 330px;
  max-height: 440px;
  overflow-y: auto;
  background: rgba(12, 14, 22, 0.96);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(0, 240, 255, 0.04);
  z-index: 1000;
  animation: panel-in 0.2s cubic-bezier(0.22, 1, 0.36, 1) both;
}

@keyframes panel-in {
  from { opacity: 0; transform: translateY(-6px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0)   scale(1); }
}

.notif-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.8rem 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  font-weight: 700;
  font-size: 0.88rem;
  color: #e8e8f0;
  position: sticky;
  top: 0;
  background: rgba(12, 14, 22, 0.98);
  border-radius: 14px 14px 0 0;
}

.notif-close {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.35);
  cursor: pointer;
  font-size: 1.15rem;
  padding: 0.15rem 0.4rem;
  border-radius: 6px;
  transition: color 0.15s, background 0.15s;
}
.notif-close:hover { color: #00f0ff; background: rgba(0, 240, 255, 0.08); }

.notif-empty {
  padding: 2rem 1rem;
  text-align: center;
  color: rgba(255, 255, 255, 0.25);
  font-size: 0.85rem;
}

.notif-item {
  padding: 0.7rem 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  cursor: pointer;
  transition: background 0.15s;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.notif-item:last-child { border-bottom: none; }
.notif-item:hover { background: rgba(255, 255, 255, 0.04); }
.notif-item.unread {
  background: rgba(0, 240, 255, 0.04);
  border-left: 2px solid #00f0ff;
  padding-left: calc(1rem - 2px);
}

.notif-msg  { font-size: 0.84rem; color: #e8e8f0; line-height: 1.4; }
.notif-time { font-size: 0.74rem; color: rgba(255, 255, 255, 0.3); }

/* ── Hamburger (mobile) ─────────────────────────────────── */
.hamburger {
  display: none;
  flex-direction: column;
  gap: 5px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  cursor: pointer;
  padding: 7px 8px;
  transition: background 0.2s, border-color 0.2s;
}
.hamburger:hover {
  background: rgba(255, 255, 255, 0.09);
  border-color: rgba(0, 240, 255, 0.25);
}

.bar {
  width: 20px;
  height: 2px;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 2px;
  transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s;
}

.hamburger.open .bar:nth-child(1) { transform: translateY(7px) rotate(45deg); background: #00f0ff; }
.hamburger.open .bar:nth-child(2) { opacity: 0; }
.hamburger.open .bar:nth-child(3) { transform: translateY(-7px) rotate(-45deg); background: #00f0ff; }

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

.footer-links { display: flex; gap: 1.25rem; }

.footer-links a {
  color: var(--text-secondary, #a0a0b0);
  text-decoration: none;
  transition: color 0.2s;
  font-size: 0.82rem;
}
.footer-links a:hover { color: var(--primary, #00f0ff); }

/* ── Responsive ─────────────────────────────────────────── */
@media (max-width: 900px) {
  .hamburger { display: flex; }

  .nav-links {
    display: none;
    position: absolute;
    top: 58px;
    left: 0;
    right: 0;
    background: rgba(6, 9, 13, 0.97);
    backdrop-filter: blur(20px);
    border-bottom: 1px solid rgba(0, 240, 255, 0.08);
    flex-direction: column;
    padding: 0.6rem 1rem 1rem;
    gap: 0.1rem;
    z-index: 899;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6);
  }

  .nav-links.open {
    display: flex;
    animation: mobile-menu-in 0.22s cubic-bezier(0.22, 1, 0.36, 1) both;
  }

  @keyframes mobile-menu-in {
    from { opacity: 0; transform: translateY(-10px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .nav-divider { width: 100%; height: 1px; margin: 0.35rem 0; }

  .nav-link {
    padding: 0.6rem 0.85rem;
    font-size: 0.9rem;
    width: 100%;
    border-radius: 10px;
  }
  .nav-link::after { display: none; }

  .nav-login, .nav-register {
    width: 100%;
    justify-content: center;
    border-radius: 10px;
    margin-top: 0.2rem;
  }

  .logout-label { display: inline; }
}
</style>
