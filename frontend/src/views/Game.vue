<!--
  Home View — Landing page with game entry point
-->
<template>
  <div class="home">
    <div class="hero">
      <h1 class="hero-title">Alpaca Party!</h1>
      <p class="hero-sub">Raise and customise your alpaca farm in a 3D world.</p>

      <div class="cta-group">
        <router-link v-if="authStore.isAuthenticated" to="/" class="btn-primary">
          🎮 Play Now
        </router-link>
        <template v-else>
          <router-link to="/register" class="btn-primary">Get Started</router-link>
          <router-link to="/login" class="btn-secondary">Login</router-link>
        </template>
      </div>
    </div>
<!--
    You must be wondering what this is
    <FakeAd /> 
--> 

    <div class="features">
      <div class="feature-card">
        <span class="feature-icon">🦙</span>
        <h3>Raise Alpacas</h3>
        <p>Buy, name and customise alpacas with unique colours and speeds.</p>
      </div>
      <div class="feature-card">
        <span class="feature-icon">🌳</span>
        <h3>Build Your Farm</h3>
        <p>Plant trees, expand land and decorate your world.</p>
      </div>
      <div class="feature-card">
        <span class="feature-icon">💰</span>
        <h3>Earn Coins</h3>
        <p>Collect coins to unlock upgrades and grow your herd.</p>
      </div>
      <div class="feature-card">
        <span class="feature-icon">☁️</span>
        <h3>Cloud Saves</h3>
        <p>Press <kbd>F</kbd> in-game to save your farm to the cloud.</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useAuthStore } from '../stores/auth.js'
import FakeAd from '@/components/FakeAd.vue'
const authStore = useAuthStore()

</script>

<style scoped>
.home { text-align: center; }

.hero { padding: 5rem 1rem 3rem; }

.hero-title {
  font-size: 3rem;
  font-weight: 800;
  color: var(--primary, #00f0ff);
  margin-bottom: 0.75rem;
}

.hero-sub {
  font-size: 1.2rem;
  color: #a0a0b0;
  margin-bottom: 2rem;
}

.cta-group {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

.btn-primary {
  display: inline-block;
  padding: 0.75rem 2rem;
  background: var(--primary, #00f0ff);
  color: #000;
  font-weight: 700;
  font-size: 1rem;
  border-radius: 30px;
  text-decoration: none;
  transition: opacity 0.2s, transform 0.15s;
}
.btn-primary:hover { opacity: 0.87; transform: translateY(-2px); }

.btn-secondary {
  display: inline-block;
  padding: 0.75rem 2rem;
  border: 1px solid var(--primary, #00f0ff);
  color: var(--primary, #00f0ff);
  font-weight: 600;
  font-size: 1rem;
  border-radius: 30px;
  text-decoration: none;
  transition: background 0.2s;
}
.btn-secondary:hover { background: rgba(0, 240, 255, 0.08); }

.features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  padding: 1rem 0 3rem;
}

.feature-card {
  background: var(--bg-secondary, #12121a);
  border: 1px solid var(--border-color, #2a2a3a);
  border-radius: 12px;
  padding: 1.75rem 1.25rem;
  transition: border-color 0.2s, transform 0.15s;
}
.feature-card:hover {
  border-color: var(--primary, #00f0ff);
  transform: translateY(-3px);
}

.feature-icon { font-size: 2.2rem; }

.feature-card h3 {
  margin: 0.75rem 0 0.5rem;
  font-size: 1.1rem;
  color: #eee;
}

.feature-card p {
  font-size: 0.9rem;
  color: #888;
  line-height: 1.5;
}

kbd {
  font-family: monospace;
  background: rgba(0, 240, 255, 0.1);
  border: 1px solid rgba(0, 240, 255, 0.3);
  border-radius: 4px;
  padding: 0.1rem 0.4rem;
  font-size: 0.85em;
}
</style>