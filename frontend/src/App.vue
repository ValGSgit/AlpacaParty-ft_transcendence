<!--
  Root Application Component
  @owner fankahou, LukasStefanek
  @issue https://github.com/ValGSgit/Cleanscendence/issues/1
-->
<template>
  <div id="app">
    <nav class="navbar">
      <div class="nav-container">
        <router-link to="/" class="nav-logo">
          <span class="logo-text">Cleanscendence</span>
        </router-link>
        <div class="nav-links">
          <router-link to="/" class="nav-link">Home</router-link>
          <!-- TODO: Add auth-gated navigation links -->
        </div>
      </div>
    </nav>
    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<script setup>
// TODO: Import auth store, socket service, etc.
</script>

<style scoped>
.navbar {
  background: var(--bg-secondary, #12121a);
  border-bottom: 1px solid var(--border-color, #2a2a3a);
  padding: 0.75rem 1.5rem;
}

.nav-container {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.nav-logo {
  text-decoration: none;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--primary, #00f0ff);
}

.nav-links {
  display: flex;
  gap: 1rem;
}

.nav-link {
  text-decoration: none;
  color: var(--text-secondary, #a0a0b0);
  transition: color 0.2s;
}

.nav-link:hover,
.nav-link.router-link-active {
  color: var(--primary, #00f0ff);
}

.main-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1.5rem;
}
</style>
