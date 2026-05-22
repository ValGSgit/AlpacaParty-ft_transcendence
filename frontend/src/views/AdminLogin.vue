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

<style scoped>
.admin-login-page {
  position: fixed;
  inset: 0;
  background: #080b10;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  font-family: 'Inter', system-ui, sans-serif;
}

/* Background effects */
.bg-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(0,240,255,0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0,240,255,0.03) 1px, transparent 1px);
  background-size: 40px 40px;
  pointer-events: none;
}
.bg-glow {
  position: absolute;
  width: 600px;
  height: 600px;
  border-radius: 50%;
  filter: blur(120px);
  pointer-events: none;
}
.bg-glow.top-left {
  top: -200px;
  left: -200px;
  background: radial-gradient(circle, rgba(0,232,122,0.06) 0%, transparent 70%);
}
.bg-glow.bottom-right {
  bottom: -200px;
  right: -200px;
  background: radial-gradient(circle, rgba(0,112,255,0.08) 0%, transparent 70%);
}

/* Card */
.login-card {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 420px;
  background: rgba(12, 16, 24, 0.9);
  border: 1px solid rgba(0, 240, 255, 0.12);
  border-radius: 16px;
  padding: 40px;
  box-shadow:
    0 0 0 1px rgba(0,240,255,0.05),
    0 24px 64px rgba(0,0,0,0.6),
    0 0 80px rgba(0,112,255,0.05);
  animation: card-in 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
}

@keyframes card-in {
  from { opacity: 0; transform: translateY(20px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

/* Header */
.card-header {
  text-align: center;
  margin-bottom: 36px;
}
.shield-icon {
  width: 52px;
  height: 52px;
  margin: 0 auto 16px;
  background: linear-gradient(135deg, rgba(0,240,255,0.1), rgba(0,112,255,0.15));
  border: 1px solid rgba(0,240,255,0.2);
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #00f0ff;
}
.shield-icon svg { width: 26px; height: 26px; }
h1 {
  font-size: 1.6rem;
  font-weight: 700;
  color: #e8eaf0;
  letter-spacing: -0.02em;
  margin: 0 0 6px;
}
.subtitle {
  font-size: 0.8rem;
  color: rgba(160,170,190,0.7);
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

/* Form */
.login-form { display: flex; flex-direction: column; gap: 20px; }

.field-group { display: flex; flex-direction: column; gap: 8px; }
label {
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(160,170,190,0.9);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}
.input-icon {
  position: absolute;
  left: 14px;
  width: 16px;
  height: 16px;
  color: rgba(100,120,160,0.7);
  pointer-events: none;
  flex-shrink: 0;
}
.input-wrapper input {
  width: 100%;
  padding: 12px 14px 12px 42px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px;
  color: #e8eaf0;
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
}
.input-wrapper input::placeholder { color: rgba(100,120,160,0.5); }
.input-wrapper input:focus {
  border-color: rgba(0,240,255,0.35);
  background: rgba(0,240,255,0.04);
  box-shadow: 0 0 0 3px rgba(0,240,255,0.07);
}

.toggle-password {
  position: absolute;
  right: 12px;
  background: none;
  border: none;
  cursor: pointer;
  color: rgba(100,120,160,0.6);
  padding: 4px;
  display: flex;
  transition: color 0.2s;
}
.toggle-password:hover { color: rgba(0,240,255,0.7); }
.toggle-password svg { width: 16px; height: 16px; }

/* Error */
.error-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: rgba(255,60,80,0.08);
  border: 1px solid rgba(255,60,80,0.2);
  border-radius: 8px;
  color: #ff6070;
  font-size: 0.85rem;
}
.error-banner svg { width: 16px; height: 16px; flex-shrink: 0; }

/* Submit */
.submit-btn {
  margin-top: 4px;
  padding: 13px;
  background: linear-gradient(135deg, #0070ff, #00a8ff);
  border: none;
  border-radius: 10px;
  color: #fff;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  letter-spacing: 0.02em;
  transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
  position: relative;
  overflow: hidden;
}
.submit-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255,255,255,0.1), transparent);
  opacity: 0;
  transition: opacity 0.2s;
}
.submit-btn:hover:not(:disabled)::before { opacity: 1; }
.submit-btn:hover:not(:disabled) {
  box-shadow: 0 4px 24px rgba(0,112,255,0.35);
  transform: translateY(-1px);
}
.submit-btn:active:not(:disabled) { transform: translateY(0); }
.submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  vertical-align: middle;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* Footer */
.card-footer {
  margin-top: 28px;
  text-align: center;
  font-size: 0.72rem;
  color: rgba(100,120,160,0.5);
  border-top: 1px solid rgba(255,255,255,0.05);
  padding-top: 20px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
</style>
