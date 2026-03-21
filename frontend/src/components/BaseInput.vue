<!--
  BaseInput — reusable labelled input/textarea
  Usage: <BaseInput v-model="email" label="Email" type="email" :error="errors.email" />
-->
<template>
  <div class="input-wrapper">
    <label v-if="label" :for="inputId" class="input-label">{{ label }}</label>
    <textarea
      v-if="type === 'textarea'"
      :id="inputId"
      :class="['base-input', { 'has-error': error }]"
      :value="modelValue"
      :placeholder="placeholder"
      :rows="rows"
      :maxlength="maxlength"
      :disabled="disabled"
      @input="$emit('update:modelValue', $event.target.value)"
    />
    <input
      v-else
      :id="inputId"
      :class="['base-input', { 'has-error': error }]"
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :maxlength="maxlength"
      :disabled="disabled"
      @input="$emit('update:modelValue', $event.target.value)"
    />
    <span v-if="error" class="input-error">{{ error }}</span>
    <span v-if="hint && !error" class="input-hint">{{ hint }}</span>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  label: { type: String, default: '' },
  type: { type: String, default: 'text' },
  placeholder: { type: String, default: '' },
  error: { type: String, default: '' },
  hint: { type: String, default: '' },
  rows: { type: Number, default: 3 },
  maxlength: { type: Number, default: undefined },
  disabled: { type: Boolean, default: false },
})
defineEmits(['update:modelValue'])

const inputId = computed(() => `input-${Math.random().toString(36).slice(2, 8)}`)
</script>

<style scoped>
.input-wrapper { display: flex; flex-direction: column; gap: 0.3rem; }
.input-label { font-size: 0.85rem; font-weight: 500; color: var(--text-secondary, #a0a0b0); }
.base-input {
  padding: 0.5rem 0.75rem;
  background: var(--bg-tertiary, #1a1a2a);
  border: 1px solid var(--border-color, #2a2a3a);
  border-radius: 6px;
  color: var(--text-primary, #e8e8f0);
  font-size: 0.9rem;
  font-family: inherit;
  transition: border-color 0.15s;
  resize: vertical;
}
.base-input:focus { outline: none; border-color: var(--primary, #00f0ff); }
.base-input.has-error { border-color: var(--danger, #ff006e); }
.base-input:disabled { opacity: 0.5; cursor: not-allowed; }
.input-error { font-size: 0.78rem; color: var(--danger, #ff006e); }
.input-hint { font-size: 0.78rem; color: var(--text-secondary, #a0a0b0); }
</style>
