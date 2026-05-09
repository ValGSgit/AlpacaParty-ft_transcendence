<template>
  <!-- File-based icons (multi-color, can't use currentColor) -->
  <img
    v-if="fileSrc"
    :src="fileSrc"
    :width="size"
    :height="size"
    class="app-icon app-icon--img"
    aria-hidden="true"
    alt=""
  />
  <!-- Sprite-based icons (single-color, themed via currentColor) -->
  <svg
    v-else
    :width="size"
    :height="size"
    class="app-icon"
    aria-hidden="true"
    focusable="false"
  >
    <use :href="`#icon-${name}`" />
  </svg>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  name: { type: String, required: true },
  size: { type: [Number, String], default: 16 },
})

// Multi-color SVGs that live in /icons/ui/ and can't use currentColor
const FILE_ICONS = {
  'google':      '/icons/ui/google-color-svgrepo-com.svg',
  'camera-full': '/icons/ui/camera-comment-section.svg',
  'trash-full':  '/icons/ui/trash.svg',
  'refresh-box': '/icons/ui/refresh.svg',
}

const fileSrc = computed(() => FILE_ICONS[props.name] ?? null)
</script>

<style scoped>
.app-icon {
  display: inline-block;
  vertical-align: middle;
  flex-shrink: 0;
  overflow: visible;
}
.app-icon--img {
  object-fit: contain;
  overflow: hidden;
}
</style>
