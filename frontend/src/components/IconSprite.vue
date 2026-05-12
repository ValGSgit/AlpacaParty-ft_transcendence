<!--
  Global SVG icon sprite. Mounted once at the app root; every <AppIcon name="…">
  resolves to one of the <symbol id="icon-…"> elements defined here via <use>.
-->
<template>
  <svg aria-hidden="true" class="icon-sprite" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <symbol id="icon-heart" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12.62 20.81c-.34.12-.9.12-1.24 0C8.48 19.82 2 15.69 2 8.69 2 5.6 4.49 3.1 7.56 3.1c1.82 0 3.43.88 4.44 2.24 1.01-1.36 2.63-2.24 4.44-2.24C19.51 3.1 22 5.6 22 8.69c0 7-6.48 11.13-9.38 12.12Z"/>
      </symbol>
      <symbol id="icon-heart-fill" viewBox="0 0 24 24" fill="currentColor" stroke="none">
        <path d="M16.13 3.71c-1.71 0-3.23.86-4.13 2.18-.9-1.32-2.42-2.18-4.13-2.18-2.77 0-5.01 2.25-5.01 5.01 0 6.11 9.14 11.6 9.14 11.6s9.14-5.49 9.14-11.6c0-2.76-2.25-5.01-5.01-5.01Z"/>
      </symbol>
      <symbol id="icon-comment" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
        <path d="M44 6H4v30h9v5l10-5h21V6Z"/>
        <path d="M14 19.5v3M24 19.5v3M34 19.5v3"/>
      </symbol>
      <symbol id="icon-repost" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4.5 4.5H12a2 2 0 0 1 2 2V8"/>
        <path d="M11.5 11.5H4a2 2 0 0 1-2-2V8"/>
        <polyline points="2.5 2.5 0.5 4.5 2.5 6.5"/>
        <polyline points="13.5 9.5 15.5 11.5 13.5 13.5"/>
      </symbol>
      <symbol id="icon-trash" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="3 5 4.5 14 11.5 14 13 5"/>
        <line x1="1.5" y1="5" x2="14.5" y2="5"/>
        <path d="M6 5V3.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 .5.5V5"/>
      </symbol>
      <symbol id="icon-camera" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="1" y="4.5" width="14" height="10" rx="2"/>
        <circle cx="8" cy="10" r="2.5"/>
        <path d="M5.5 4.5V3.5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v1"/>
      </symbol>
      <symbol id="icon-close" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
        <line x1="2" y1="2" x2="14" y2="14"/>
        <line x1="14" y1="2" x2="2" y2="14"/>
      </symbol>
      <symbol id="icon-bell" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M8 1a5 5 0 0 1 5 5v3l1.5 2.5h-13L3 9V6a5 5 0 0 1 5-5z"/>
        <path d="M6.5 13.5a1.5 1.5 0 0 0 3 0"/>
      </symbol>
      <symbol id="icon-message" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14 10.5A1.5 1.5 0 0 1 12.5 12H5l-2.5 2.5V3.5A1.5 1.5 0 0 1 4 2h8.5A1.5 1.5 0 0 1 14 3.5z"/>
      </symbol>
      <symbol id="icon-user" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M13 14v-1.5a2.5 2.5 0 0 0-2.5-2.5h-5A2.5 2.5 0 0 0 3 12.5V14"/>
        <circle cx="8" cy="5" r="2.5"/>
      </symbol>
      <symbol id="icon-logout" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M9.5 2.5H3a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h6.5"/>
        <polyline points="11 5 14 8 11 11"/>
        <line x1="14" y1="8" x2="6" y2="8"/>
      </symbol>
    </defs>
  </svg>
</template>

<style scoped>
.icon-sprite {
  position: absolute;
  width: 0;
  height: 0;
  display: none;
}
</style>
