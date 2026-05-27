<template>
  <div class="admin-login-page">
    <div class="login-card">
      <div class="card-header">
        <div class="shield-icon">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7l-9-5z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
            <path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <h1>Admin Portal</h1>
        <p class="subtitle">AlpacaParty Management Console</p>
      </div>

      <form class="login-form" @submit.prevent="handleLogin">
        <div class="field-group">
          <label for="username">Username or Email</label>
          <div class="input-wrapper">
            <svg class="input-icon" viewBox="0 0 24 24" fill="none">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              <circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="1.5"/>
            </svg>
            <input
              id="username"
              v-model="form.username"
              type="text"
              placeholder="admin@alpacaparty.com"
              autocomplete="username"
              required
            />
          </div>
        </div>

        <div class="field-group">
          <label for="password">Password</label>
          <div class="input-wrapper">
            <svg class="input-icon" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" stroke-width="1.5"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            <input
              id="password"
              v-model="form.password"
              :type="showPassword ? 'text' : 'password'"
              placeholder="••••••••••••"
              autocomplete="current-password"
              required
            />
            <button type="button" class="toggle-password" @click="showPassword = !showPassword">
              <svg v-if="!showPassword" viewBox="0 0 24 24" fill="none">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" stroke-width="1.5"/>
                <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.5"/>
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="none">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
        </div>

        <div v-if="error" class="error-banner">
          <svg viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5"/>
            <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          {{ error }}
        </div>

        <button type="submit" class="submit-btn" :disabled="loading">
          <span v-if="loading" class="spinner"></span>
          <span v-else>Access Console</span>
        </button>
      </form>

      <div class="card-footer">
        <span>Unauthorized access is strictly prohibited</span>
      </div>
    </div>

    <!-- Background grid decoration -->
    <div class="bg-grid"></div>
    <div class="bg-glow top-left"></div>
    <div class="bg-glow bottom-right"></div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAdminAuthStore } from '../stores/adminAuth.js';

const router = useRouter();
const adminAuth = useAdminAuthStore();

const form = ref({ username: '', password: '' });
const showPassword = ref(false);
const loading = ref(false);
const error = ref('');

async function handleLogin() {
  error.value = '';
  loading.value = true;
  try {
    await adminAuth.login({ username: form.value.username, password: form.value.password });
    router.push({ name: 'AdminPanel' });
  } catch (err) {
    error.value = err.response?.data?.error?.message || adminAuth.error || 'Login failed';
  } finally {
    loading.value = false;
  }
}
</script>

<style src="../styles/views/AdminLogin.css" scoped></style>
