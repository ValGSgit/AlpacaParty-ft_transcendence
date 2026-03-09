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
</style>
