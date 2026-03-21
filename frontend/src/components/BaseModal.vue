<!--
  BaseModal — reusable modal dialog with backdrop
  Usage: <BaseModal v-if="showModal" title="Confirm" @close="showModal = false">...</BaseModal>
-->
<template>
  <teleport to="body">
    <div class="modal-backdrop" @click.self="$emit('close')">
      <div class="modal-box" role="dialog" :aria-label="title">
        <div class="modal-header">
          <span class="modal-title">{{ title }}</span>
          <button class="modal-close" @click="$emit('close')" aria-label="Close">✕</button>
        </div>
        <div class="modal-body">
          <slot />
        </div>
        <div v-if="$slots.footer" class="modal-footer">
          <slot name="footer" />
        </div>
      </div>
    </div>
  </teleport>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'

defineProps({ title: { type: String, default: '' } })
const emit = defineEmits(['close'])

function onKeydown(e) {
  if (e.key === 'Escape') emit('close')
}
onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 1rem;
}
.modal-box {
  background: var(--bg-secondary, #12121a);
  border: 1px solid var(--border-color, #2a2a3a);
  border-radius: 12px;
  width: 100%;
  max-width: 480px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 16px 48px rgba(0,0,0,0.6);
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border-color, #2a2a3a);
}
.modal-title { font-weight: 700; font-size: 1rem; }
.modal-close {
  background: none;
  border: none;
  color: var(--text-secondary, #a0a0b0);
  cursor: pointer;
  font-size: 1rem;
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
  transition: color 0.15s;
}
.modal-close:hover { color: var(--primary, #00f0ff); }
.modal-body { padding: 1.25rem; overflow-y: auto; flex: 1; }
.modal-footer {
  padding: 0.75rem 1.25rem;
  border-top: 1px solid var(--border-color, #2a2a3a);
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}
</style>
