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

<style src="../styles/views/AuthV3.css" scoped></style>
