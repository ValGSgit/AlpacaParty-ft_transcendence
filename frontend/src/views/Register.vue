<!--
  Register View
  @owner fankahou, LukasStefanek
  @issue https://github.com/ValGSgit/AlpacaParty/issues/8
-->
<template>
  <div class="auth-page">
    <div class="auth-card">
      <h2>Create Account</h2>

      <div v-if="authStore.error" class="error-message">
        {{ authStore.error }}
      </div>

      <form @submit.prevent="handleRegister">
        <div class="form-group">
          <label for="username">Username</label>
          <input
            id="username"
            v-model="form.username"
            type="text"
            placeholder="3-32 characters"
            required
            autocomplete="username"
          />
        </div>

        <div class="form-group">
          <label for="email">Email</label>
          <input
            id="email"
            v-model="form.email"
            type="email"
            placeholder="you@example.com"
            required
            autocomplete="email"
          />
        </div>

        <div class="form-group">
          <label for="password">Password</label>
          <input
            id="password"
            v-model="form.password"
            type="password"
            placeholder="Min 8 chars, upper + lower + number"
            required
            autocomplete="new-password"
          />
        </div>

        <div class="form-group">
          <label for="confirm">Confirm Password</label>
          <input
            id="confirm"
            v-model="form.confirm"
            type="password"
            placeholder="Re-enter password"
            required
            autocomplete="new-password"
          />
        </div>

        <div v-if="localError" class="error-message">
          {{ localError }}
        </div>

        <button type="submit" class="btn-primary" :disabled="authStore.loading">
          {{ authStore.loading ? 'Creating account...' : 'Register' }}
        </button>
      </form>

      <div class="oauth-divider"><span>or sign up with</span></div>

      <div class="oauth-buttons">
        <a href="/api/auth/github" class="oauth-btn github-btn">
          <svg class="oauth-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
          </svg>
          GitHub
        </a>
        <a href="/api/auth/google" class="oauth-btn google-btn">
          <svg class="oauth-icon" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Google
        </a>
      </div>

      <p class="auth-switch">
        Already have an account?
        <router-link to="/login">Login</router-link>
      </p>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'
import ErrorBanner from '../components/ErrorBanner.vue'
import BaseButton from '../components/BaseButton.vue'

const authStore = useAuthStore()
const router = useRouter()

const form = reactive({
  username: '',
  email: '',
  password: '',
  confirm: '',
})

const localError = ref('')

async function handleRegister() {
  localError.value = ''

  // Client-side validation
  if (!form.username || form.username.length < 3 || form.username.length > 32) {
    localError.value = 'Username must be between 3 and 32 characters'
    return
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(form.username)) {
    localError.value = 'Username can only contain letters, numbers, hyphens, and underscores'
    return
  }
  if (!form.email || !/\S+@\S+\.\S+/.test(form.email)) {
    localError.value = 'Please enter a valid email address'
    return
  }
  if (form.password.length < 8) {
    localError.value = 'Password must be at least 8 characters'
    return
  }
  if (!/[A-Z]/.test(form.password) || !/[a-z]/.test(form.password) || !/[0-9]/.test(form.password)) {
    localError.value = 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    return
  }
  if (form.password !== form.confirm) {
    localError.value = 'Passwords do not match'
    return
  }

  try {
    await authStore.register({
      username: form.username,
      email: form.email,
      password: form.password,
    })
    router.push('/')
  } catch {
    // Error is already stored in authStore.error
  }
}
</script>

<style scoped>
.auth-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 70vh;
  padding: 1rem;
}

.auth-card {
  background: var(--bg-secondary, #12121a);
  border: 1px solid var(--border-color, #2a2a3a);
  border-radius: 12px;
  padding: 2rem;
  width: 100%;
  max-width: 420px;
}

.auth-card h2 {
  text-align: center;
  margin-bottom: 1.5rem;
  color: var(--primary, #00f0ff);
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.4rem;
  font-size: 0.9rem;
  color: #ccc;
}

.form-group input {
  width: 100%;
  padding: 0.6rem 0.8rem;
  border: 1px solid var(--border-color, #2a2a3a);
  border-radius: 6px;
  background: var(--bg-primary, #0a0a12);
  color: #fff;
  font-size: 1rem;
  box-sizing: border-box;
}

.form-group input:focus {
  outline: none;
  border-color: var(--primary, #00f0ff);
}

.btn-primary {
  width: 100%;
  padding: 0.7rem;
  margin-top: 0.5rem;
  border: none;
  border-radius: 6px;
  background: var(--primary, #00f0ff);
  color: #000;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: opacity 0.2s;
}

.btn-primary:hover {
  opacity: 0.85;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error-message {
  background: rgba(255, 60, 60, 0.15);
  border: 1px solid rgba(255, 60, 60, 0.4);
  border-radius: 6px;
  padding: 0.6rem 0.8rem;
  margin-bottom: 1rem;
  color: #ff6b6b;
  font-size: 0.9rem;
}

.auth-switch {
  text-align: center;
  margin-top: 1.25rem;
  font-size: 0.9rem;
  color: #999;
}

.auth-switch a {
  color: var(--primary, #00f0ff);
  text-decoration: none;
}

.oauth-divider {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 1.25rem 0 1rem;
  color: #555;
  font-size: 0.82rem;
}

.oauth-divider::before,
.oauth-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--border-color, #2a2a3a);
}

.oauth-buttons {
  display: flex;
  gap: 0.75rem;
}

.oauth-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.6rem 1rem;
  border-radius: 6px;
  border: 1px solid var(--border-color, #2a2a3a);
  background: var(--bg-primary, #0a0a12);
  color: #e0e0e0;
  font-size: 0.9rem;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
}

.oauth-btn:hover {
  border-color: #666;
  background: var(--bg-tertiary, #1a1a2a);
}

.oauth-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}
</style>
