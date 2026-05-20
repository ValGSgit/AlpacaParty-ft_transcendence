<template>
  <Transition name="cookie-banner">
    <div v-if="showBanner" class="cookie-banner" role="dialog" aria-label="Cookie consent">
      <div class="cookie-inner">
        <div class="cookie-body">
          <AppIcon name="alpaca" :size="28" class="cookie-icon" />
          <div class="cookie-text">
            <strong class="cookie-title">We use cookies</strong>
            <span class="cookie-desc">
              We use session cookies for authentication. Denying will keep you as a guest.
              <router-link to="/privacy" class="cookie-link">Privacy Policy</router-link>
            </span>
          </div>
        </div>
        <div class="cookie-actions">
          <button class="btn-deny" @click="handleDeny">Deny</button>
          <button class="btn-accept" @click="handleAccept">Accept</button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { computed } from 'vue'
import AppIcon from './AppIcon.vue'
import { useCookieConsent } from '../composables/useCookieConsent.js'

const emit = defineEmits(['accepted'])

const { consent, accept, deny } = useCookieConsent()

const showBanner = computed(() => consent.value === null)

function handleAccept() {
  accept()
  emit('accepted')
}

function handleDeny() {
  deny()
}
</script>

<style scoped>
.cookie-banner {
  position: fixed;
  bottom: 1.5rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9000;
  width: min(680px, calc(100vw - 2rem));
}

.cookie-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.25rem;
  padding: 1rem 1.25rem;
  background: rgba(10, 13, 22, 0.92);
  backdrop-filter: blur(20px) saturate(1.4);
  -webkit-backdrop-filter: blur(20px) saturate(1.4);
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 16px;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(0, 240, 255, 0.05);
}

.cookie-body {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  min-width: 0;
}

.cookie-icon {
  flex-shrink: 0;
  filter: drop-shadow(0 0 8px rgba(0, 232, 122, 0.5));
}

.cookie-text {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
}

.cookie-title {
  font-size: 0.88rem;
  font-weight: 700;
  color: #e8e8f0;
}

.cookie-desc {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.45);
  line-height: 1.4;
}

.cookie-link {
  color: #00f0ff;
  text-decoration: none;
  margin-left: 0.25rem;
}
.cookie-link:hover { text-decoration: underline; }

.cookie-actions {
  display: flex;
  gap: 0.6rem;
  flex-shrink: 0;
}

.btn-deny,
.btn-accept {
  padding: 0.45rem 1.1rem;
  border-radius: 20px;
  font-size: 0.83rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.2s, border-color 0.2s, color 0.2s, box-shadow 0.2s;
}

.btn-deny {
  background: none;
  border: 1px solid rgba(255, 255, 255, 0.14);
  color: rgba(255, 255, 255, 0.5);
}
.btn-deny:hover {
  border-color: rgba(255, 107, 107, 0.45);
  color: #ff6b6b;
  background: rgba(255, 107, 107, 0.07);
}

.btn-accept {
  background: linear-gradient(135deg, #00c96a, #00e87a 50%, #00f0b0);
  border: none;
  color: #041a0e;
  box-shadow: 0 2px 14px rgba(0, 232, 122, 0.28);
}
.btn-accept:hover {
  box-shadow: 0 4px 20px rgba(0, 232, 122, 0.45);
  filter: brightness(1.08);
}

/* Transition */
.cookie-banner-enter-active { transition: opacity 0.3s ease, transform 0.35s cubic-bezier(0.22, 1, 0.36, 1); }
.cookie-banner-leave-active { transition: opacity 0.25s ease, transform 0.25s ease; }
.cookie-banner-enter-from  { opacity: 0; transform: translateX(-50%) translateY(1rem); }
.cookie-banner-leave-to    { opacity: 0; transform: translateX(-50%) translateY(0.5rem); }

@media (max-width: 600px) {
  .cookie-inner {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.9rem;
  }
  .cookie-actions { width: 100%; justify-content: flex-end; }
}
</style>
