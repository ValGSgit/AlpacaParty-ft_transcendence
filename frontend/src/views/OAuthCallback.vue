<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'

const router = useRouter()
const authStore = useAuthStore()

const error = ref(null)
const reduceMotion = ref(false)

let redirectTimer = null

const REDIRECT_MS = 2500

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function clearRedirect() {
  if (redirectTimer) { clearTimeout(redirectTimer); redirectTimer = null }
}
function scheduleRedirect() {
  clearRedirect()
  redirectTimer = setTimeout(() => router.push('/login'), REDIRECT_MS)
}
function deferRedirectOnInteraction() {
  clearRedirect()
}
function retry() {
  clearRedirect()
  router.push('/login')
}

onMounted(async () => {
  reduceMotion.value =
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (window.location.hash || window.location.search) {
    window.history.replaceState({}, document.title, window.location.pathname)
  }

  try {
    // Allow a short retry window for reverse-proxy/cookie timing races.
    const delays = [0, 150, 300, 600]
    for (const delay of delays) {
      if (delay) await wait(delay)
      await authStore.fetchUser()
      if (authStore.isAuthenticated) break
    }
    if (!authStore.isAuthenticated) {
      throw new Error('No user found after OAuth callback retries')
    }
    setTimeout(() => router.push('/'), reduceMotion.value ? 0 : 250)
  } catch (e) {
    let msg = (e && (e.message || e.error)) || ''
    if (!msg || msg === 'No user found after OAuth callback retries') {
      msg = 'OAuth login failed — please try again.'
    }
    error.value = msg
    scheduleRedirect()
  }
})

onBeforeUnmount(() => {
  clearRedirect()
})
</script>

<template>
  <main class="oauth" :class="{ 'is-error': !!error, 'reduce-motion': reduceMotion }">
    <div class="oauth__bg" aria-hidden="true">
      <span class="oauth__bg-orb oauth__bg-orb--a"></span>
      <span class="oauth__bg-orb oauth__bg-orb--b"></span>
    </div>

    <header class="oauth__brand" aria-label="AlpacaParty">
      <svg class="oauth__mark" viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <path
          d="M16 40V28c0-2.2-1-3.5-2.5-5C11.5 21 11 19 11.5 17c.6-2.4 3-3 4.5-1.5 0-3 1.5-6 5-6 2 0 3.5 1 4.5 3 .5-2 2-3 4-3 3 0 5 2 5 5v1c1.6-.6 3.4.3 3.7 2 .4 2-.7 3.6-2.7 4-.5 2 0 4 .5 6 .8 3.2 0 6-2.5 8-1.6 1.3-2 2.5-2 4.5v0"
          stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="28.5" cy="18.5" r="1.1" fill="currentColor"/>
      </svg>
      <span class="oauth__brand-text">AlpacaParty</span>
    </header>

    <section class="oauth__card" role="status" aria-live="polite">
      <div v-if="!error" class="oauth__focal" aria-hidden="true">
        <span class="oauth__ring"></span>
        <span class="oauth__ring oauth__ring--2"></span>
        <span class="oauth__core"></span>
      </div>

      <div v-else class="oauth__focal oauth__focal--error" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.75"/>
          <path d="M12 7v6M12 16.5v.5" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>
        </svg>
      </div>

      <template v-if="!error">
        <h1 class="oauth__title">Signing you in</h1>
        <p class="oauth__sub">Hang tight — we're handing off from your identity provider.</p>
      </template>

      <template v-else>
        <h1 class="oauth__title">Sign-in didn't go through</h1>
        <p class="oauth__sub oauth__sub--error">{{ error }}</p>

        <div
          class="oauth__actions"
          @pointerdown="deferRedirectOnInteraction"
          @keydown="deferRedirectOnInteraction"
        >
          <button type="button" class="oauth__btn oauth__btn--primary" @click="retry">
            Try again
          </button>
          <router-link to="/help" class="oauth__btn oauth__btn--ghost">
            Get help
          </router-link>
        </div>

        <p class="oauth__hint">
          We'll send you back to <strong>/login</strong> in a moment. Click anything above to stay here.
        </p>
      </template>
    </section>

    <footer class="oauth__foot">
      <router-link to="/login">← Back to sign in</router-link>
    </footer>
  </main>
</template>

<style scoped>
.oauth {
  position: relative;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 20px;
  color: var(--text-color, #e8e8f0);
  background: #0b0b12;
  overflow: hidden;
  isolation: isolate;
}

.oauth__bg {
  position: absolute; inset: 0; z-index: -1;
  background:
    radial-gradient(900px 500px at 20% 10%, rgba(0,240,255,0.10), transparent 60%),
    radial-gradient(800px 600px at 90% 90%, rgba(120,80,255,0.10), transparent 60%),
    #0b0b12;
}
.oauth__bg-orb {
  position: absolute;
  width: 420px; height: 420px;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.35;
  animation: drift 18s ease-in-out infinite alternate;
}
.oauth__bg-orb--a {
  top: -120px; left: -80px;
  background: radial-gradient(circle, var(--primary, #00f0ff), transparent 70%);
}
.oauth__bg-orb--b {
  bottom: -140px; right: -100px;
  background: radial-gradient(circle, #7a5cff, transparent 70%);
  animation-duration: 22s;
}

@keyframes drift {
  0%   { transform: translate3d(0,0,0) scale(1); }
  100% { transform: translate3d(40px,-30px,0) scale(1.08); }
}

.oauth__brand {
  position: absolute;
  top: 28px; left: 50%;
  transform: translateX(-50%);
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: var(--text-color, #e8e8f0);
}
.oauth__mark {
  width: 32px; height: 32px;
  color: var(--primary, #00f0ff);
}
.oauth__brand-text {
  font-weight: 700;
  letter-spacing: 0.04em;
  font-size: 0.95rem;
}

.oauth__card {
  width: 100%;
  max-width: 420px;
  padding: 36px 28px 32px;
  border-radius: 16px;
  background: linear-gradient(180deg, #14141d, #101019);
  border: 1px solid var(--border-color, #2a2a3a);
  box-shadow:
    0 1px 0 rgba(255,255,255,0.04) inset,
    0 20px 50px rgba(0,0,0,0.45);
  text-align: center;
}

.oauth__title {
  margin: 18px 0 6px;
  font-size: 1.375rem;
  font-weight: 700;
  letter-spacing: -0.01em;
}
.oauth__sub {
  margin: 0 0 22px;
  font-size: 0.9375rem;
  color: var(--text-muted, #a0a0b0);
  line-height: 1.55;
}
.oauth__sub--error { color: #ffb0b0; }

.oauth__focal {
  position: relative;
  width: 64px; height: 64px;
  margin: 0 auto;
  display: grid; place-items: center;
}
.oauth__ring {
  position: absolute; inset: 0;
  border-radius: 50%;
  border: 2px solid rgba(0,240,255,0.18);
  border-top-color: var(--primary, #00f0ff);
  animation: spin 1.05s linear infinite;
}
.oauth__ring--2 {
  inset: 8px;
  border-color: rgba(0,240,255,0.10);
  border-top-color: rgba(0,240,255,0.55);
  animation-duration: 1.6s;
  animation-direction: reverse;
}
.oauth__core {
  width: 10px; height: 10px;
  border-radius: 50%;
  background: var(--primary, #00f0ff);
  box-shadow: 0 0 18px rgba(0,240,255,0.7);
  animation: pulse 1.4s ease-in-out infinite;
}

.oauth__focal--error {
  color: #ff8b8b;
}
.oauth__focal--error svg { width: 48px; height: 48px; }

@keyframes spin { to { transform: rotate(360deg); } }
@keyframes pulse {
  0%, 100% { transform: scale(0.85); opacity: 0.7; }
  50%      { transform: scale(1.1);  opacity: 1; }
}

.oauth__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  margin-top: 4px;
}
.oauth__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 11px 18px;
  border-radius: 10px;
  font: inherit;
  font-size: 0.9375rem;
  font-weight: 600;
  text-decoration: none;
  border: 1px solid transparent;
  cursor: pointer;
  transition: background 120ms ease, border-color 120ms ease, color 120ms ease;
}
.oauth__btn--primary {
  background: var(--primary, #00f0ff);
  color: #06121a;
}
.oauth__btn--primary:hover { background: color-mix(in oklab, var(--primary, #00f0ff) 88%, white); }
.oauth__btn--ghost {
  background: transparent;
  color: var(--text-color, #e8e8f0);
  border-color: var(--border-color, #2a2a3a);
}
.oauth__btn--ghost:hover {
  border-color: var(--primary, #00f0ff);
  color: var(--primary, #00f0ff);
}
.oauth__btn:focus-visible {
  outline: 2px solid var(--primary, #00f0ff);
  outline-offset: 2px;
}

.oauth__hint {
  margin: 18px 0 0;
  font-size: 0.8125rem;
  color: #6b6b7d;
}
.oauth__hint strong { color: var(--text-muted, #a0a0b0); font-weight: 600; }

.oauth__foot {
  position: absolute;
  bottom: 24px; left: 50%;
  transform: translateX(-50%);
  font-size: 0.8125rem;
}
.oauth__foot a {
  color: var(--text-muted, #a0a0b0);
  text-decoration: none;
}
.oauth__foot a:hover { color: var(--primary, #00f0ff); }
.oauth__foot a:focus-visible {
  outline: 2px solid var(--primary, #00f0ff);
  outline-offset: 3px;
  border-radius: 4px;
}

@media (max-width: 420px) {
  .oauth__card { padding: 28px 20px 24px; }
  .oauth__brand { top: 20px; }
  .oauth__foot { bottom: 16px; }
}

@media (prefers-reduced-motion: reduce) {
  .oauth__bg-orb,
  .oauth__ring,
  .oauth__ring--2,
  .oauth__core {
    animation: none !important;
  }
  .oauth__btn { transition: none; }
}
.oauth.reduce-motion .oauth__bg-orb,
.oauth.reduce-motion .oauth__ring,
.oauth.reduce-motion .oauth__ring--2,
.oauth.reduce-motion .oauth__core {
  animation: none !important;
}
</style>
