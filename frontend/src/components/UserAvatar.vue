<!--
  UserAvatar — displays a user's avatar with optional online indicator and size control
  Usage: <UserAvatar :src="user.avatar" :online="user.is_online" size="md" />
-->
<template>
  <div :class="['avatar-container', `size-${size}`]">
    <img
      :src="src || '/avatars/default.svg'"
      :alt="alt"
      class="avatar-img"
      @error="onError"
    />
    <span v-if="showOnline" :class="['online-indicator', { online: online }]" />
  </div>
</template>

<script setup>
const props = defineProps({
  src: { type: String, default: '' },
  alt: { type: String, default: 'avatar' },
  size: { type: String, default: 'md' },  // xs | sm | md | lg | xl
  online: { type: Boolean, default: false },
  showOnline: { type: Boolean, default: false },
})

function onError(e) {
  e.target.src = '/avatars/default.svg'
}
</script>

<style scoped>
.avatar-container { position: relative; display: inline-block; flex-shrink: 0; }
.avatar-img { border-radius: 50%; object-fit: cover; display: block; }

.size-xs  .avatar-img, .size-xs  { width: 24px; height: 24px; }
.size-sm  .avatar-img, .size-sm  { width: 34px; height: 34px; }
.size-md  .avatar-img, .size-md  { width: 48px; height: 48px; }
.size-lg  .avatar-img, .size-lg  { width: 72px; height: 72px; }
.size-xl  .avatar-img, .size-xl  { width: 96px; height: 96px; }

.online-indicator {
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #555;
  border: 2px solid var(--bg-secondary, #12121a);
}
.online-indicator.online { background: var(--success, #00ff88); }

.size-xs .online-indicator { width: 7px; height: 7px; }
.size-sm .online-indicator { width: 9px; height: 9px; }
.size-lg .online-indicator { width: 13px; height: 13px; }
.size-xl .online-indicator { width: 15px; height: 15px; }
</style>
