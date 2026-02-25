<!--
  Login View
  @owner fankahou, LukasStefanek
  @issue https://github.com/ValGSgit/Cleanscendence/issues/8
-->
<template>
  <div class="auth-page">
    <div class="auth-card">
      <h2>Login</h2>

      <div v-if="authStore.error" class="error-message">
        {{ authStore.error }}
      </div>

      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label for="username">Username or Email</label>
          <input
            id="username"
            v-model="form.username"
            type="text"
            placeholder="Enter username or email"
            required
            autocomplete="username"
          />
        </div>

        <div class="form-group">
          <label for="password">Password</label>
          <input
            id="password"
            v-model="form.password"
            type="password"
            placeholder="Enter password"
            required
            autocomplete="current-password"
          />
        </div>

        <button type="submit" class="btn-primary" :disabled="authStore.loading">
          {{ authStore.loading ? 'Logging in...' : 'Login' }}
        </button>
      </form>

      <p class="auth-switch">
        Don't have an account?
        <router-link to="/register">Register</router-link>
      </p>
    </div>
  </div>
</template>

<script setup>
import { reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'

const authStore = useAuthStore()
const router = useRouter()

const form = reactive({
  username: '',
  password: '',
})

async function handleLogin() {
  try {
    await authStore.login(form)
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
</style>
