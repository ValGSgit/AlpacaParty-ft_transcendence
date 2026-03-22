<!--
  NotifBadge — small count badge for notifications/unread counts
  Usage: <NotifBadge :count="5" /> or <NotifBadge :count="0" /> (renders nothing when 0)
-->
<template>
  <span v-if="count > 0" class="notif-badge" :class="variant">
    {{ count > 99 ? '99+' : count }}
  </span>
</template>

<script setup>
defineProps({
  count: { type: Number, default: 0 },
  variant: { type: String, default: 'danger' }, // danger | primary | success
})
</script>

<style scoped>
.notif-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  font-size: 0.68rem;
  font-weight: 700;
  line-height: 1;
}
.danger  { background: var(--danger,   #ff006e); color: #fff; }
.primary { background: var(--primary,  #00f0ff); color: #0a0a0f; }
.success { background: var(--success,  #00ff88); color: #0a0a0f; }
</style>
