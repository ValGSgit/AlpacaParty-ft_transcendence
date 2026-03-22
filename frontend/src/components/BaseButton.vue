<!--
  BaseButton — reusable button with variant support
  Usage: <BaseButton variant="primary" :loading="saving" @click="save">Save</BaseButton>
-->
<template>
  <button
    :class="['base-btn', `btn-${variant}`, { 'btn-sm': size === 'sm', 'btn-loading': loading }]"
    :disabled="disabled || loading"
    v-bind="$attrs"
  >
    <span v-if="loading" class="btn-spinner">⟳</span>
    <slot />
  </button>
</template>

<script setup>
defineProps({
  variant: { type: String, default: 'primary' }, // primary | secondary | danger | ghost
  size: { type: String, default: 'md' },          // md | sm
  loading: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
})
</script>

<style scoped>
.base-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9rem;
  padding: 0.5rem 1.1rem;
  transition: opacity 0.15s, background 0.15s;
}
.base-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.btn-primary   { background: var(--primary, #00f0ff); color: #0a0a0f; }
.btn-secondary { background: var(--bg-tertiary, #1a1a2a); color: var(--text-primary, #e8e8f0); border: 1px solid var(--border-color, #2a2a3a); }
.btn-danger    { background: transparent; color: var(--danger, #ff006e); border: 1px solid var(--danger, #ff006e); }
.btn-ghost     { background: transparent; color: var(--text-secondary, #a0a0b0); border: 1px solid var(--border-color, #2a2a3a); }
.btn-sm { padding: 0.3rem 0.65rem; font-size: 0.82rem; }

.btn-loading { pointer-events: none; }
.btn-spinner { animation: spin 0.8s linear infinite; display: inline-block; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
