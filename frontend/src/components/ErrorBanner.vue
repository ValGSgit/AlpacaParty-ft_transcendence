<!--
  ErrorBanner — dismissable error/success/warning banner
  Usage: <ErrorBanner :message="error" @dismiss="error = null" />
         <ErrorBanner :message="success" variant="success" />
-->
<template>
  <div v-if="message" :class="['error-banner', variant]" role="alert">
    <span class="banner-msg">{{ message }}</span>
    <button v-if="dismissable" class="banner-close" @click="$emit('dismiss')" aria-label="Dismiss">✕</button>
  </div>
</template>

<script setup>
defineProps({
  message: { type: String, default: '' },
  variant: { type: String, default: 'error' },   // error | success | warning | info
  dismissable: { type: Boolean, default: true },
})
defineEmits(['dismiss'])
</script>

<style scoped>
.error-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.6rem 1rem;
  border-radius: 6px;
  font-size: 0.875rem;
  border-left: 3px solid currentColor;
  margin-bottom: 0.75rem;
}
.error   { background: rgba(255, 0, 110, 0.1); color: var(--danger,   #ff006e); }
.success { background: rgba(  0,255, 136, 0.1); color: var(--success,  #00ff88); }
.warning { background: rgba(255,234,   0, 0.1); color: var(--warning,  #ffea00); }
.info    { background: rgba(  0,240, 255, 0.1); color: var(--primary,  #00f0ff); }

.banner-msg { flex: 1; }
.banner-close {
  background: none;
  border: none;
  cursor: pointer;
  color: currentColor;
  opacity: 0.7;
  font-size: 0.9rem;
  padding: 0 0.2rem;
  flex-shrink: 0;
}
.banner-close:hover { opacity: 1; }
</style>
