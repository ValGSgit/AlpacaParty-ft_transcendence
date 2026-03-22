<!--
  LoadingSpinner — full-area or inline loading state
  Usage: <LoadingSpinner /> or <LoadingSpinner message="Saving…" :inline="true" />
-->
<template>
  <div :class="['spinner-wrap', { inline }]">
    <span class="spinner" aria-hidden="true">⟳</span>
    <span v-if="message" class="spinner-msg">{{ message }}</span>
  </div>
</template>

<script setup>
defineProps({
  message: { type: String, default: 'Loading…' },
  inline: { type: Boolean, default: false },
})
</script>

<style scoped>
.spinner-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  gap: 0.5rem;
  color: var(--text-secondary, #a0a0b0);
}
.spinner-wrap.inline {
  flex-direction: row;
  padding: 0.25rem 0;
  gap: 0.4rem;
}
.spinner {
  font-size: 1.5rem;
  animation: spin 0.8s linear infinite;
  display: inline-block;
}
.spinner-wrap.inline .spinner { font-size: 1rem; }
.spinner-msg { font-size: 0.9rem; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
