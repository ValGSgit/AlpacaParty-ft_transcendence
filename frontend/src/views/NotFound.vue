<!--
  NotFound View — 404 catch-all
  @owner LukasStefanek
-->
<template>
  <div class="not-found">
    <h1 class="code">404</h1>
    <p class="message">Page not found.</p>
    <router-link to="/" class="btn-home">Go Home</router-link>
  </div>
</template>

<script setup>
// No logic needed — static page.
</script>

<style scoped>
.not-found {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  gap: 1rem;
  text-align: center;
}
.code {
  font-size: 6rem;
  font-weight: 900;
  color: var(--primary, #00f0ff);
  line-height: 1;
  margin: 0;
}
.message {
  font-size: 1.25rem;
  color: var(--text-secondary, #a0a0b0);
}
.btn-home {
  margin-top: 0.5rem;
  padding: 0.6rem 1.5rem;
  background: var(--primary, #00f0ff);
  color: #0a0a0f;
  text-decoration: none;
  border-radius: 8px;
  font-weight: 600;
}
.btn-home:hover {
  background: var(--primary-dark, #00c7d8);
}
</style>
