<!--
  EmptyState — empty list / no-results placeholder
  Usage: <EmptyState icon="👥" title="No friends yet" description="Add friends to get started." />
-->
<template>
  <div class="empty-state">
    <span v-if="icon" class="empty-icon" aria-hidden="true">{{ icon }}</span>
    <h3 class="empty-title">{{ title }}</h3>
    <p v-if="description" class="empty-desc">{{ description }}</p>
    <slot />
  </div>
</template>

<script setup>
defineProps({
  icon: { type: String, default: '' },
  title: { type: String, default: 'Nothing here yet' },
  description: { type: String, default: '' },
})
</script>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  gap: 0.5rem;
  text-align: center;
  color: var(--text-secondary, #a0a0b0);
}
.empty-icon { font-size: 2.5rem; opacity: 0.5; }
.empty-title { font-size: 1rem; font-weight: 600; color: var(--text-primary, #e8e8f0); margin: 0; }
.empty-desc { font-size: 0.875rem; max-width: 320px; }
</style>
