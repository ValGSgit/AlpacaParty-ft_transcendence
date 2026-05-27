<template>
  <div class="auth-root">

    <!-- ── full-page background ── -->
    <div class="bg-scene">
      <div class="bg-grad"></div>
      <img class="farm-deco fd-1" src="/icons/Barn.png"    alt="" aria-hidden="true" />
      <img class="farm-deco fd-2" src="/icons/Hay.png"     alt="" aria-hidden="true" />
      <img class="farm-deco fd-3" src="/icons/Tree.png"    alt="" aria-hidden="true" />
      <img class="farm-deco fd-4" src="/icons/Fence.png"   alt="" aria-hidden="true" />
      <img class="farm-deco fd-5" src="/icons/Stones.png"  alt="" aria-hidden="true" />
      <img class="farm-deco fd-6" src="/icons/Wheat.png"   alt="" aria-hidden="true" />
    </div>

    <div class="split">

      <!-- ══ LEFT — project showcase ══ -->
      <aside class="showcase">
        <div class="showcase-inner">
          <div class="brand">
            <AppIcon name="alpaca" :size="18" />
            <div class="brand-text">
              <span class="brand-name">AlpacaParty</span>
              <span class="brand-tag">A 42 school project</span>
            </div>
          </div>

          <h2 class="headline">
            Raise your herd.<br />
            <span class="grad">Rule the arena.</span>
          </h2>
          <p class="sub">
            3D alpaca farm meets real-time arena combat — build, battle, and socialise in one place.
          </p>

          <div class="feature-grid">
            <div class="feat">
              <span class="feat-icon"><img src="/icons/Barn.png" alt="" /></span>
              <div>
                <strong>3D Alpaca Farm</strong>
                <span>Three.js world — build, customise &amp; cloud-save your farm</span>
              </div>
            </div>
            <div class="feat">
              <span class="feat-icon spit-icon">🎯</span>
              <div>
                <strong>Spit Royale</strong>
                <span>Real-time 1v1 arena with level-based matchmaking &amp; bot survival</span>
              </div>
            </div>
            <div class="feat">
              <span class="feat-icon"><img src="/icons/Water Trough.png" alt="" /></span>
              <div>
                <strong>Social Hub</strong>
                <span>Feed, direct messages, group chat &amp; organisations</span>
              </div>
            </div>
            <div class="feat">
              <span class="feat-icon"><img src="/icons/Hay.png" alt="" /></span>
              <div>
                <strong>Gamification</strong>
                <span>XP &amp; levels, achievements, daily challenges, leaderboard</span>
              </div>
            </div>
          </div>
        </div>

        <div class="alpaca-orb" aria-hidden="true">
          <div class="orb-ring"></div>
          <div class="orb-ring r2"></div>
          <AppIcon name="alpaca" :size="64" />
        </div>
      </aside>

      <!-- ══ RIGHT — auth form ══ -->
      <main class="form-side">
        <div class="form-card">

          <!-- underline tab switcher -->
          <div class="tabs">
            <button class="tab" :class="{ active: mode === 'login' }"    @click="switchMode('login')">Sign In</button>
            <button class="tab" :class="{ active: mode === 'register' }" @click="switchMode('register')">Register</button>
            <div class="tab-line" :class="{ right: mode === 'register' }"></div>
          </div>

          <!-- error toast -->
          <transition name="err">
            <div v-if="errorMsg" class="err-box" role="alert">
              <svg viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
              </svg>
              {{ errorMsg }}
            </div>
          </transition>

          <!-- ══ form swap: login ↔ register ══ -->
          <transition :name="slideDir" mode="out-in">

            <!-- ── LOGIN ── -->
            <form v-if="mode === 'login'" key="login" class="form" @submit.prevent="handleLogin" novalidate>
              <div class="field" :class="fieldState('lu')">
                <label for="lu">Username or Email</label>
                <input id="lu" v-model="loginForm.username" type="text" autocomplete="username" required
                  @focus="focused = 'lu'" @blur="touched.lu = true; focused = ''" />
              </div>

              <div class="field" :class="fieldState('lp')">
                <label for="lp">Password</label>
                <input id="lp" v-model="loginForm.password" :type="showPwd ? 'text' : 'password'"
                  autocomplete="current-password" required
                  @focus="focused = 'lp'" @blur="touched.lp = true; focused = ''" />
                <button type="button" class="eye" @click="showPwd = !showPwd" tabindex="-1" aria-label="Toggle password visibility">
                  <svg v-if="!showPwd" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                </button>
              </div>

              <button type="submit" class="cta" :disabled="isLoading">
                <span v-if="!isLoading">Sign In</span>
                <span v-else class="spin"></span>
              </button>
            </form>

            <!-- ── REGISTER ── -->
            <div v-else key="register" class="register-wrap">

              <!-- step progress -->
              <div class="step-progress">
                <div class="step-node" :class="{ done: regStep >= 1, active: regStep === 1 }">
                  <span class="step-num">
                    <svg v-if="regStep > 1" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2"><polyline points="2,6 5,9 10,3"/></svg>
                    <span v-else>1</span>
                  </span>
                  <span class="step-label">Account</span>
                </div>
                <div class="step-track">
                  <div class="step-fill" :class="{ full: regStep === 2 }"></div>
                </div>
                <div class="step-node" :class="{ active: regStep === 2 }">
                  <span class="step-num">2</span>
                  <span class="step-label">Password</span>
                </div>
              </div>

              <!-- step 1: account info -->
              <transition :name="stepDir" mode="out-in">
                <form v-if="regStep === 1" key="s1" class="form" @submit.prevent="goStep2" novalidate>

                  <div class="field" :class="[fieldState('ru'), usernameValidity]">
                    <label for="ru">Username</label>
                    <input id="ru" v-model="regForm.username" type="text" autocomplete="username" required
                      @focus="focused = 'ru'" @blur="touched.ru = true; focused = ''" />
                    <span class="val-icon" v-if="touched.ru && regForm.username">
                      <svg v-if="usernameValidity === 'ok'" viewBox="0 0 12 12" fill="none" stroke="#00e87a" stroke-width="2"><polyline points="1,6 4.5,9.5 11,2.5"/></svg>
                      <svg v-else viewBox="0 0 12 12" fill="none" stroke="#ff5c5c" stroke-width="2"><line x1="1" y1="1" x2="11" y2="11"/><line x1="11" y1="1" x2="1" y2="11"/></svg>
                    </span>
                  </div>
                  <!-- username rules chips -->
                  <div class="rules">
                    <span class="rule" :class="{ pass: regForm.username.length >= 3 && regForm.username.length <= 32 }">3–32 chars</span>
                    <span class="rule" :class="{ pass: /^[a-zA-Z0-9_-]*$/.test(regForm.username) && regForm.username.length > 0 }">letters, numbers, - _</span>
                  </div>

                  <div class="field" :class="[fieldState('re'), emailValidity]">
                    <label for="re">Email</label>
                    <input id="re" v-model="regForm.email" type="email" autocomplete="email" required
                      @focus="focused = 're'" @blur="touched.re = true; focused = ''" />
                    <span class="val-icon" v-if="touched.re && regForm.email">
                      <svg v-if="emailValidity === 'ok'" viewBox="0 0 12 12" fill="none" stroke="#00e87a" stroke-width="2"><polyline points="1,6 4.5,9.5 11,2.5"/></svg>
                      <svg v-else viewBox="0 0 12 12" fill="none" stroke="#ff5c5c" stroke-width="2"><line x1="1" y1="1" x2="11" y2="11"/><line x1="11" y1="1" x2="1" y2="11"/></svg>
                    </span>
                  </div>

                  <button type="submit" class="cta">
                    Continue
                    <svg class="btn-arrow" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><line x1="1" y1="8" x2="13" y2="8"/><polyline points="9,4 13,8 9,12"/></svg>
                  </button>

                </form>

                <!-- step 2: password -->
                <form v-else key="s2" class="form" @submit.prevent="handleRegister" novalidate>

                  <button type="button" class="back-btn" @click="stepDir = 'step-bwd'; regStep = 1">
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><line x1="15" y1="8" x2="3" y2="8"/><polyline points="7,4 3,8 7,12"/></svg>
                    Back
                  </button>

                  <div class="field" :class="fieldState('rp')">
                    <label for="rp">Password</label>
                    <input id="rp" v-model="regForm.password" :type="showPwd ? 'text' : 'password'"
                      autocomplete="new-password" required
                      @focus="focused = 'rp'" @blur="touched.rp = true; focused = ''" />
                    <button type="button" class="eye" @click="showPwd = !showPwd" tabindex="-1" aria-label="Toggle password visibility">
                      <svg v-if="!showPwd" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    </button>
                  </div>

                  <!-- strength meter -->
                  <div v-if="regForm.password" class="strength">
                    <div class="str-track"><div class="str-fill" :class="strClass" :style="{ width: strPct + '%' }"></div></div>
                    <span class="str-label" :class="strClass">{{ strLabel }}</span>
                  </div>

                  <!-- password requirement chips -->
                  <div class="rules" v-if="regForm.password">
                    <span class="rule" :class="{ pass: regForm.password.length >= 8 }">8+ chars</span>
                    <span class="rule" :class="{ pass: /[A-Z]/.test(regForm.password) }">Uppercase</span>
                    <span class="rule" :class="{ pass: /[a-z]/.test(regForm.password) }">Lowercase</span>
                    <span class="rule" :class="{ pass: /[0-9]/.test(regForm.password) }">Number</span>
                  </div>

                  <div class="field" :class="[fieldState('rc'), confirmValidity]">
                    <label for="rc">Confirm Password</label>
                    <input id="rc" v-model="regForm.confirm" :type="showPwd ? 'text' : 'password'"
                      autocomplete="new-password" required
                      @focus="focused = 'rc'" @blur="touched.rc = true; focused = ''" />
                    <span class="val-icon" v-if="touched.rc && regForm.confirm">
                      <svg v-if="confirmValidity === 'ok'" viewBox="0 0 12 12" fill="none" stroke="#00e87a" stroke-width="2"><polyline points="1,6 4.5,9.5 11,2.5"/></svg>
                      <svg v-else viewBox="0 0 12 12" fill="none" stroke="#ff5c5c" stroke-width="2"><line x1="1" y1="1" x2="11" y2="11"/><line x1="11" y1="1" x2="1" y2="11"/></svg>
                    </span>
                  </div>

                  <button type="submit" class="cta" :disabled="isLoading">
                    <span v-if="!isLoading">Create Account</span>
                    <span v-else class="spin"></span>
                  </button>

                </form>
              </transition>

              <!-- OAuth (register) -->
              <div class="oauth">
                <div class="oauth-sep"><span>or sign up with</span></div>
                <div class="oauth-row">
                  <a href="/api/auth/github" class="oauth-btn gh">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
                    GitHub
                  </a>
                  <a href="/api/auth/google" class="oauth-btn gg">
                    <svg viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                    Google
                  </a>
                </div>
              </div>

            </div><!-- /register-wrap -->

          </transition>

          <!-- OAuth (login only — register has its own below) -->
          <template v-if="mode === 'login'">
            <div class="oauth">
              <div class="oauth-sep"><span>or</span></div>
              <div class="oauth-row">
                <a href="/api/auth/github" class="oauth-btn gh">
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
                  GitHub
                </a>
                <a href="/api/auth/google" class="oauth-btn gg">
                  <svg viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                  Google
                </a>
              </div>
            </div>
          </template>

        </div>
      </main>

    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'

const authStore = useAuthStore()
const router    = useRouter()
const route     = useRoute()

// ── mode & shared state ────────────────────────────────────────
const mode      = ref(route.path.includes('register') ? 'register' : 'login')
const slideDir  = ref('sl-left')
const focused   = ref('')
const showPwd   = ref(false)
const isLoading = ref(false)
const errorMsg  = ref('')

// track which fields have been blurred at least once
const touched = reactive({
  lu: false, lp: false,
  ru: false, re: false, rp: false, rc: false,
})

function fieldState(id) {
  return { up: focused.value === id || !!currentValue(id) }
}
function currentValue(id) {
  const m = { lu: loginForm.username, lp: loginForm.password, ru: regForm.username, re: regForm.email, rp: regForm.password, rc: regForm.confirm }
  return m[id] ?? ''
}

function switchMode(m) {
  if (m === mode.value) return
  slideDir.value  = m === 'register' ? 'sl-left' : 'sl-right'
  mode.value      = m
  errorMsg.value  = ''
  showPwd.value   = false
  regStep.value   = 1
  authStore.error = null
  router.replace({ path: m === 'register' ? '/register' : '/login' })
}

watch(() => authStore.error, v => { errorMsg.value = v || '' })

// ── login ──────────────────────────────────────────────────────
const loginForm = reactive({ username: '', password: '' })

async function handleLogin() {
  errorMsg.value = ''
  if (!loginForm.username.trim() || !loginForm.password.trim()) return
  isLoading.value = true
  try { await authStore.login(loginForm); router.push('/') }
  catch { /* error via watcher */ }
  finally { isLoading.value = false }
}

// ── register — multi-step ──────────────────────────────────────
const regStep = ref(1)
const stepDir = ref('step-fwd')
const regForm = reactive({ username: '', email: '', password: '', confirm: '' })

// inline validation
const usernameValidity = computed(() => {
  if (!regForm.username) return ''
  if (regForm.username.length >= 3 && regForm.username.length <= 32 && /^[a-zA-Z0-9_-]+$/.test(regForm.username)) return 'ok'
  return 'bad'
})
const emailValidity = computed(() => {
  if (!regForm.email) return ''
  return /\S+@\S+\.\S+/.test(regForm.email) ? 'ok' : 'bad'
})
const confirmValidity = computed(() => {
  if (!regForm.confirm) return ''
  return regForm.confirm === regForm.password ? 'ok' : 'bad'
})

function goStep2() {
  touched.ru = true; touched.re = true
  if (usernameValidity.value !== 'ok') { errorMsg.value = 'Fix the username before continuing'; return }
  if (emailValidity.value !== 'ok')    { errorMsg.value = 'Enter a valid email address'; return }
  errorMsg.value = ''
  stepDir.value  = 'step-fwd'
  regStep.value  = 2
}

// password strength
const strPct = computed(() => {
  const p = regForm.password; if (!p) return 0
  let s = 0
  if (p.length >= 8)           s += 25
  if (p.length >= 12)          s += 10
  if (/[A-Z]/.test(p))         s += 20
  if (/[a-z]/.test(p))         s += 20
  if (/[0-9]/.test(p))         s += 15
  if (/[^a-zA-Z0-9]/.test(p)) s += 10
  return Math.min(s, 100)
})
const strClass = computed(() => strPct.value < 40 ? 'weak' : strPct.value < 70 ? 'fair' : 'strong')
const strLabel = computed(() => strPct.value < 40 ? 'Weak'  : strPct.value < 70 ? 'Fair' : 'Strong')

async function handleRegister() {
  errorMsg.value = ''
  const { username, email, password, confirm } = regForm
  if (password.length < 8)                                                      { errorMsg.value = 'Password must be at least 8 characters'; return }
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) { errorMsg.value = 'Password needs uppercase, lowercase and a number'; return }
  if (password !== confirm)                                                      { errorMsg.value = 'Passwords do not match'; return }
  isLoading.value = true
  try { await authStore.register({ username, email, password }); router.push('/') }
  catch { /* error via watcher */ }
  finally { isLoading.value = false }
}
</script>

<style scoped>
/* ─── reset ──────────────────────────────────────────────────── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

/* ─── root ───────────────────────────────────────────────────── */
.auth-root {
  position: absolute; inset: 0;
  font-family: Inter, system-ui, sans-serif;
  color: #e8e8f0; overflow: hidden;
}

/* ─── background scene ───────────────────────────────────────── */
.bg-scene { position: absolute; inset: 0; z-index: 0; overflow: hidden; }
.bg-grad {
  position: absolute; inset: 0;
  background:
    radial-gradient(ellipse 70% 60% at 20% 50%, rgba(0,80,40,0.28) 0%, transparent 65%),
    radial-gradient(ellipse 50% 55% at 75% 20%, rgba(183,68,255,0.12) 0%, transparent 60%),
    radial-gradient(ellipse 60% 60% at 80% 80%, rgba(0,240,255,0.08) 0%, transparent 60%),
    #06090d;
}
.farm-deco {
  position: absolute; image-rendering: pixelated;
  opacity: 0.07; pointer-events: none; user-select: none; filter: grayscale(0.3);
}
.fd-1 { width:160px; top:8%;  left:3%;  opacity:0.06; animation:fdrift 14s ease-in-out infinite alternate; }
.fd-2 { width:80px;  top:70%; left:8%;  opacity:0.09; animation:fdrift 11s ease-in-out infinite alternate; animation-delay:-3s; }
.fd-3 { width:110px; top:15%; left:38%; opacity:0.05; animation:fdrift 18s ease-in-out infinite alternate; animation-delay:-7s; }
.fd-4 { width:140px; top:80%; left:30%; opacity:0.06; animation:fdrift 13s ease-in-out infinite alternate; animation-delay:-2s; }
.fd-5 { width:70px;  top:45%; left:5%;  opacity:0.08; animation:fdrift 16s ease-in-out infinite alternate; animation-delay:-5s; }
.fd-6 { width:90px;  top:5%;  left:55%; opacity:0.05; animation:fdrift 12s ease-in-out infinite alternate; animation-delay:-9s; }
@keyframes fdrift { from { transform:translateY(0) rotate(-2deg); } to { transform:translateY(-14px) rotate(2deg); } }

/* ─── split ──────────────────────────────────────────────────── */
.split { position:relative; z-index:1; display:flex; width:100%; height:100%; }

/* ─── left showcase ──────────────────────────────────────────── */
.showcase { display:none; position:relative; overflow:hidden; }
@media (min-width:900px) {
  .showcase { display:flex; flex-direction:column; justify-content:center; width:48%; flex-shrink:0; border-right:1px solid rgba(255,255,255,0.05); }
}
.showcase-inner { position:relative; z-index:2; padding:3rem 3rem 3rem 3.5rem; }
.brand { display:flex; align-items:center; gap:0.9rem; margin-bottom:2rem; }
.brand-alpaca {
  width:48px; height:48px; object-fit:contain;
  filter:drop-shadow(0 0 10px rgba(0,200,120,0.5));
  animation:alpaca-bob 3.5s ease-in-out infinite;
}
@keyframes alpaca-bob { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-5px); } }
.brand-text { display:flex; flex-direction:column; line-height:1; }
.brand-name { font-size:1.35rem; font-weight:800; color:#fff; letter-spacing:-0.02em; }
.brand-tag  { font-size:0.68rem; color:rgba(255,255,255,0.35); text-transform:uppercase; letter-spacing:0.1em; margin-top:3px; }
.headline { font-size:clamp(1.7rem,2.6vw,2.4rem); font-weight:800; line-height:1.2; color:#fff; letter-spacing:-0.03em; margin-bottom:0.9rem; }
.grad { background:linear-gradient(90deg,#00e87a,#00f0ff); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
.sub { font-size:0.9rem; color:rgba(255,255,255,0.4); line-height:1.65; max-width:360px; margin-bottom:2rem; }
.feature-grid { display:flex; flex-direction:column; gap:0.85rem; }
.feat { display:flex; align-items:flex-start; gap:0.85rem; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:12px; padding:0.8rem 1rem; transition:border-color 0.2s,background 0.2s; }
.feat:hover { border-color:rgba(0,232,122,0.2); background:rgba(0,232,122,0.04); }
.feat-icon { flex-shrink:0; width:34px; height:34px; display:flex; align-items:center; justify-content:center; background:rgba(0,200,100,0.1); border-radius:8px; font-size:1.1rem; }
.feat-icon img { width:22px; height:22px; object-fit:contain; image-rendering:pixelated; }
.feat div { display:flex; flex-direction:column; }
.feat strong { font-size:0.88rem; font-weight:600; color:#e8e8f0; }
.feat span   { font-size:0.76rem; color:rgba(255,255,255,0.4); margin-top:2px; line-height:1.4; }
.alpaca-orb { position:absolute; bottom:-60px; right:-40px; width:260px; height:260px; pointer-events:none; display:flex; align-items:center; justify-content:center; }
.orb-ring { position:absolute; inset:0; border-radius:50%; border:1px solid rgba(0,232,122,0.12); animation:ring-spin 20s linear infinite; }
.orb-ring.r2 { inset:20px; border-color:rgba(0,240,255,0.08); animation-direction:reverse; animation-duration:28s; }
@keyframes ring-spin { to { transform:rotate(360deg); } }
.orb-alpaca { width:160px; height:160px; object-fit:contain; opacity:0.12; filter:blur(1px) saturate(0.5); }

/* ─── right form side ────────────────────────────────────────── */
.form-side { flex:1; display:flex; align-items:center; justify-content:center; overflow-y:auto; padding:2rem 1.25rem; }
.form-card {
  width:100%; max-width:420px;
  background:rgba(12,14,20,0.92);
  border:1px solid rgba(255,255,255,0.07);
  border-radius:20px; padding:2.25rem 2rem 2rem;
  backdrop-filter:blur(20px);
  box-shadow:0 0 0 1px rgba(0,240,255,0.03), 0 30px 80px rgba(0,0,0,0.6);
  animation:card-in 0.45s cubic-bezier(0.22,1,0.36,1) both;
}
@keyframes card-in { from { opacity:0; transform:translateY(22px); } to { opacity:1; transform:translateY(0); } }

/* ─── tabs ───────────────────────────────────────────────────── */
.tabs { display:flex; position:relative; margin-bottom:1.75rem; border-bottom:1px solid rgba(255,255,255,0.07); }
.tab { flex:1; background:none; border:none; color:rgba(255,255,255,0.35); font-size:0.9rem; font-weight:600; padding:0.5rem 0; cursor:pointer; transition:color 0.2s; letter-spacing:0.01em; }
.tab.active { color:#fff; }
.tab-line { position:absolute; bottom:-1px; left:0; width:50%; height:2px; background:linear-gradient(90deg,#00e87a,#00f0ff); border-radius:2px 2px 0 0; transition:transform 0.28s cubic-bezier(0.34,1.4,0.64,1); box-shadow:0 0 10px rgba(0,232,122,0.4); }
.tab-line.right { transform:translateX(100%); }

/* ─── error toast ────────────────────────────────────────────── */
.err-box { display:flex; align-items:center; gap:0.55rem; background:rgba(255,60,60,0.08); border:1px solid rgba(255,60,60,0.25); border-radius:10px; padding:0.6rem 0.85rem; margin-bottom:1.1rem; color:#ff8888; font-size:0.83rem; line-height:1.45; }
.err-box svg { width:15px; height:15px; flex-shrink:0; }
.err-enter-active,.err-leave-active { transition:all 0.22s ease; }
.err-enter-from,.err-leave-to { opacity:0; transform:translateY(-5px); }

/* ─── step progress indicator ────────────────────────────────── */
.step-progress { display:flex; align-items:center; gap:0; margin-bottom:1.6rem; }
.step-node { display:flex; flex-direction:column; align-items:center; gap:4px; }
.step-num {
  width:28px; height:28px; border-radius:50%;
  display:flex; align-items:center; justify-content:center;
  font-size:0.75rem; font-weight:700;
  border:1.5px solid rgba(255,255,255,0.15);
  color:rgba(255,255,255,0.35);
  transition:all 0.3s ease;
}
.step-num svg { width:11px; height:11px; }
.step-node.active .step-num  { border-color:#00e87a; color:#00e87a; box-shadow:0 0 10px rgba(0,232,122,0.25); }
.step-node.done   .step-num  { border-color:#00e87a; background:#00e87a; color:#041a0e; }
.step-label { font-size:0.65rem; color:rgba(255,255,255,0.3); text-transform:uppercase; letter-spacing:0.07em; transition:color 0.3s; }
.step-node.active .step-label { color:#00e87a; }
.step-node.done   .step-label { color:rgba(0,232,122,0.7); }
.step-track { flex:1; height:1.5px; background:rgba(255,255,255,0.08); margin:0 8px 14px; position:relative; overflow:hidden; border-radius:1px; }
.step-fill  { position:absolute; inset-block:0; left:0; width:0; background:linear-gradient(90deg,#00e87a,#00f0ff); border-radius:1px; transition:width 0.4s ease; }
.step-fill.full { width:100%; }

/* ─── floating-label fields ──────────────────────────────────── */
.form { display:flex; flex-direction:column; }
.register-wrap { display:flex; flex-direction:column; }

.field { position:relative; margin-bottom:1.1rem; }
.field label {
  position:absolute; left:0.9rem; top:50%; transform:translateY(-50%);
  font-size:0.88rem; color:rgba(255,255,255,0.3); pointer-events:none;
  transition:all 0.2s cubic-bezier(0.4,0,0.2,1); background:transparent;
}
.field.up label {
  top:0; transform:translateY(-50%); font-size:0.7rem; color:#00e87a;
  background:rgba(12,14,20,0.95); padding:0 4px; border-radius:3px;
}
.field input {
  width:100%; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1);
  border-radius:10px; color:#fff; font-size:0.93rem;
  padding:0.78rem 2.4rem 0.78rem 0.9rem;
  outline:none; transition:border-color 0.2s, box-shadow 0.2s, background 0.2s;
}
.field input:focus {
  border-color:rgba(0,232,122,0.45); background:rgba(0,232,122,0.03);
  box-shadow:0 0 0 3px rgba(0,232,122,0.07);
}
/* field validity border tints */
.field.ok  input { border-color:rgba(0,232,122,0.3); }
.field.bad input { border-color:rgba(255,92,92,0.35); }

/* inline validation icon */
.val-icon { position:absolute; right:0.75rem; top:50%; transform:translateY(-50%); width:14px; height:14px; display:flex; align-items:center; justify-content:center; pointer-events:none; }
.val-icon svg { width:12px; height:12px; }

/* eye toggle */
.eye { position:absolute; right:0.75rem; top:50%; transform:translateY(-50%); background:none; border:none; color:rgba(255,255,255,0.25); cursor:pointer; display:flex; align-items:center; padding:2px; transition:color 0.18s; }
.eye:hover { color:rgba(255,255,255,0.65); }
.eye svg   { width:15px; height:15px; }

/* ─── rules chips ────────────────────────────────────────────── */
.rules { display:flex; flex-wrap:wrap; gap:0.4rem; margin:-0.5rem 0 0.85rem; }
.rule {
  font-size:0.68rem; padding:2px 7px; border-radius:20px;
  background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.08);
  color:rgba(255,255,255,0.3); transition:all 0.2s;
}
.rule.pass { background:rgba(0,232,122,0.1); border-color:rgba(0,232,122,0.25); color:#00e87a; }

/* ─── password strength ──────────────────────────────────────── */
.strength { display:flex; align-items:center; gap:0.65rem; margin:-0.5rem 0 0.5rem; }
.str-track { flex:1; height:3px; background:rgba(255,255,255,0.07); border-radius:2px; overflow:hidden; }
.str-fill  { height:100%; border-radius:2px; transition:width 0.35s ease, background 0.35s ease; }
.str-fill.weak   { background:#ff5c5c; }
.str-fill.fair   { background:#ffcc00; }
.str-fill.strong { background:#00e87a; }
.str-label { font-size:0.7rem; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; width:42px; }
.str-label.weak   { color:#ff5c5c; }
.str-label.fair   { color:#ffcc00; }
.str-label.strong { color:#00e87a; }

/* ─── back button ────────────────────────────────────────────── */
.back-btn {
  display:inline-flex; align-items:center; gap:0.35rem;
  background:none; border:none; color:rgba(255,255,255,0.35);
  font-size:0.8rem; font-weight:600; cursor:pointer; padding:0;
  margin-bottom:1rem; transition:color 0.18s; letter-spacing:0.01em;
}
.back-btn:hover { color:rgba(255,255,255,0.8); }
.back-btn svg { width:13px; height:13px; }

/* ─── CTA button ─────────────────────────────────────────────── */
.cta {
  position:relative; overflow:hidden; width:100%; margin-top:0.3rem; padding:0.82rem;
  border:none; border-radius:10px;
  background:linear-gradient(135deg,#00c96a,#00e87a 50%,#00f0b0);
  color:#041a0e; font-size:0.94rem; font-weight:700; cursor:pointer;
  letter-spacing:0.01em; transition:opacity 0.18s, transform 0.14s, box-shadow 0.2s;
  box-shadow:0 4px 20px rgba(0,232,122,0.28);
  display:flex; align-items:center; justify-content:center; gap:0.45rem;
}
.cta::after {
  content:''; position:absolute; top:0; left:-100%; width:55%; height:100%;
  background:linear-gradient(90deg,transparent,rgba(255,255,255,0.22),transparent);
  animation:cta-shine 2.8s ease-in-out infinite;
}
@keyframes cta-shine { 0% { left:-100%; } 45%,100% { left:160%; } }
.cta:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 6px 28px rgba(0,232,122,0.4); }
.cta:active:not(:disabled) { transform:translateY(0); }
.cta:disabled { opacity:0.5; cursor:not-allowed; }
.btn-arrow { width:14px; height:14px; }

.spin { display:inline-block; width:17px; height:17px; border:2px solid rgba(4,26,14,0.3); border-top-color:#041a0e; border-radius:50%; animation:spinning 0.65s linear infinite; vertical-align:middle; }
@keyframes spinning { to { transform:rotate(360deg); } }

/* ─── OAuth ──────────────────────────────────────────────────── */
.oauth { margin-top:1.4rem; }
.oauth-sep { display:flex; align-items:center; gap:0.7rem; color:rgba(255,255,255,0.18); font-size:0.75rem; margin-bottom:0.9rem; }
.oauth-sep::before,.oauth-sep::after { content:''; flex:1; height:1px; background:rgba(255,255,255,0.07); }
.oauth-row { display:flex; gap:0.6rem; }
.oauth-btn { flex:1; display:flex; align-items:center; justify-content:center; gap:0.5rem; padding:0.62rem 0.7rem; border-radius:10px; border:1px solid rgba(255,255,255,0.08); background:rgba(255,255,255,0.03); color:rgba(255,255,255,0.65); font-size:0.84rem; font-weight:600; text-decoration:none; transition:border-color 0.18s, background 0.18s, color 0.18s; }
.oauth-btn svg { width:16px; height:16px; flex-shrink:0; }
.oauth-btn:hover { border-color:rgba(255,255,255,0.2); background:rgba(255,255,255,0.07); color:#fff; }

/* ─── mode slide transitions ─────────────────────────────────── */
.sl-left-enter-active,  .sl-left-leave-active,
.sl-right-enter-active, .sl-right-leave-active  { transition:all 0.25s cubic-bezier(0.4,0,0.2,1); }
.sl-left-enter-from  { opacity:0; transform:translateX(24px); }
.sl-left-leave-to    { opacity:0; transform:translateX(-24px); }
.sl-right-enter-from { opacity:0; transform:translateX(-24px); }
.sl-right-leave-to   { opacity:0; transform:translateX(24px); }

/* ─── step transitions ───────────────────────────────────────── */
.step-fwd-enter-active, .step-fwd-leave-active,
.step-bwd-enter-active, .step-bwd-leave-active { transition:all 0.22s cubic-bezier(0.4,0,0.2,1); }
/* forward: new slides in from right, old leaves to left */
.step-fwd-enter-from { opacity:0; transform:translateX(22px); }
.step-fwd-leave-to   { opacity:0; transform:translateX(-22px); }
/* backward: new slides in from left, old leaves to right */
.step-bwd-enter-from { opacity:0; transform:translateX(-22px); }
.step-bwd-leave-to   { opacity:0; transform:translateX(22px); }

/* ─── responsive ─────────────────────────────────────────────── */
@media (max-width:899px) {
  .auth-root { overflow-y: auto; }
  .split { flex-direction:column; height:auto; }
  .form-side { padding:2rem 1rem; }
  .form-card { padding:1.75rem 1.4rem; }
}
</style>
