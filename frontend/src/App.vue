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
          <span class="logo-text">Alpaca Party!</span>
        </router-link>
        <div class="nav-links">
          <router-link to="/" class="nav-link">Home</router-link>
          <router-link to="/api-test" class="nav-link" style="color:#ffd93d">API Test</router-link>
          <template v-if="authStore.isAuthenticated">
            <router-link to="/friends"  class="nav-link">Friends</router-link>
            <router-link to="/messages" class="nav-link">Messages</router-link>
            <router-link to="/game"     class="nav-link">Game</router-link>
            <router-link to="/profile"  class="nav-link">Profile</router-link>
            <router-link to="/settings" class="nav-link">Settings</router-link>
            <button class="nav-link nav-btn" @click="handleLogout">Logout</button>
          </template>
          <template v-else>
            <router-link to="/login" class="nav-link">Login</router-link>
          </template>
        </div>
      </div>
    </nav>
    <main :class="['main-content', { 'game-content': $route.name === 'Game' }]">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useAuthStore } from './stores/auth.js'

const authStore = useAuthStore()
const router = useRouter()

async function handleLogout() {
  await authStore.logout()
  router.push('/')
}
</script>

<style scoped>
#app {
  display: flex;
  flex-direction: column;
  height: 100vh; /* Force the app to be exactly the screen height */
  width: 100vw;
  overflow: hidden; /* Prevents the whole page from scrolling */
}

.navbar {
  flex-shrink: 0; /* Prevents the navbar from squishing */
  background: var(--bg-secondary, #12121a);
  border-bottom: 1px solid var(--border-color, #2a2a3a);
  padding: 0.75rem 1.5rem;overflow: hidden;
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

.nav-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: inherit;
  padding: 0;
}

.main-content {
  flex-grow: 1; /* Tells the main content to take up all remaining space */
  overflow: hidden; /* Prevents internal scrolling */
  position: relative;
}

.game-content {
  width: 100%;
  height: 100%; /* Now 100% of the remaining space, NOT the whole screen */
  margin: 0;
  padding: 0;
  background: black;
  
  /* CRITICAL: Stops the browser from "panning" when you drag the mouse/finger */
  touch-action: none; 
  overscroll-behavior: none;
}
</style>
