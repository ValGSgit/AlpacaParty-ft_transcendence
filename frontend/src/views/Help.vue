<!--
  Help & FAQ — AlpacaParty
  Static support page; the live LLM assistant ("Paca") is mounted globally
  via HelpDeskChat.vue for authenticated users.
-->
<template>
  <div class="legal-page">
    <h1>Help &amp; FAQ</h1>
    <p class="updated">Last updated: May 11, 2026</p>

    <section v-if="!authStore.isAuthenticated" class="help-cta">
      <p>
        Need a quick answer?
        <router-link to="/login">Sign in</router-link> or
        <router-link to="/register">create an account</router-link>
        to chat live with <strong>Paca</strong>, our AlpacaParty assistant.
      </p>
    </section>
    <section v-else class="help-cta">
      <p>
        Want a quick answer? Click the <strong>alpaca button</strong> in the
        bottom-right corner of any page to chat with
        <strong>Paca</strong> — our AI guide. Paca can explain features,
        share alpaca facts, and walk you through the game.
      </p>
    </section>

    <section>
      <h2>Getting started</h2>
      <h3>Creating an account</h3>
      <p>
        Head to <router-link to="/register">Register</router-link> with an
        email and password, or sign in with Google or GitHub via the buttons
        on the <router-link to="/login">Login</router-link> page. OAuth
        accounts are linked automatically — you can also link them later from
        your profile.
      </p>
      <h3>Editing your profile</h3>
      <p>
        Open <router-link to="/profile">Profile</router-link> to update your
        username, bio, status, and avatar. Avatars accept common image
        formats up to 10 MB.
      </p>
      <h3>Friends and online status</h3>
      <p>
        Use <router-link to="/friends">Friends</router-link> to send,
        accept, or decline friend requests. Friends' online status updates in
        real time, and you can start a direct message or game invite from
        their profile.
      </p>
    </section>

    <section>
      <h2>Playing the games</h2>
      <h3>The farm</h3>
      <p>
        The home page is your 3D farm. Buy alpacas, raise a herd, decorate
        with trees and barns, and toggle through different times of day. Use
        the HUD on the right to open the shop, edit mode, or change the
        camera angle.
      </p>
      <h3>Spit Royale</h3>
      <p>
        A real-time multiplayer arena. Open the joystick icon on the farm
        HUD, pick <em>Spit Royale</em>, then either play solo against AI
        bots or jump into the online lobby for ranked 1v1 matches with ELO
        tracking.
      </p>
      <h3>Alpaca Road</h3>
      <p>
        A separate racing game with its own matchmaking and history. Open
        the game menu, choose <em>Alpaca Road</em>, and create or join a
        public room. Supports up to four players per race.
      </p>
    </section>

    <section>
      <h2>Privacy, data, and GDPR</h2>
      <h3>Requesting your data</h3>
      <p>
        From <router-link to="/profile">Profile → Settings</router-link> you
        can export everything we store about you as JSON, CSV, or XML. The
        export is generated on demand and downloaded directly.
      </p>
      <h3>Deleting your account</h3>
      <p>
        The same settings panel includes a deletion request. Account
        deletion is subject to a short grace period during which the request
        can be cancelled. See the
        <router-link to="/privacy">Privacy Policy</router-link> for the full
        retention details and your rights under GDPR.
      </p>
      <h3>Withdrawing consent or filing a complaint</h3>
      <p>
        Email the team at
        <a :href="`mailto:${supportEmail}`">{{ supportEmail }}</a>
        with the subject line "GDPR request" and we will respond within 30
        days, as required by the regulation.
      </p>
    </section>

    <section>
      <h2>Public API</h2>
      <p>
        Developers can interact with AlpacaParty data programmatically.
        Visit <router-link to="/docs">API Docs</router-link> for the full
        endpoint reference, authentication details (X-API-Key header), and
        the 30 requests/minute rate limit. The interactive Swagger UI for
        the internal API is available at
        <a href="/api/docs" target="_blank" rel="noopener">/api/docs</a>.
      </p>
    </section>

    <section>
      <h2>Still stuck?</h2>
      <p>
        Reach out by email at
        <a :href="`mailto:${supportEmail}`">{{ supportEmail }}</a>, or open
        an issue on
        <a href="https://github.com/ValGSgit/AlpacaParty/issues" target="_blank" rel="noopener">
          our GitHub tracker
        </a>. For account-specific or sensitive matters, prefer email.
      </p>
    </section>
  </div>
</template>

<script setup>
import { useAuthStore } from '../stores/auth.js'

const authStore = useAuthStore()
const supportEmail = 'support@alpacaparty.local'
</script>

<style scoped>
.legal-page {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem 1.5rem 4rem;
  color: var(--text-primary, #e8e8f0);
  line-height: 1.75;
}

.legal-page h1 {
  font-size: 2rem;
  color: var(--primary, #00f0ff);
  margin-bottom: 0.25rem;
}

.updated {
  color: var(--text-secondary, #a0a0b0);
  font-size: 0.9rem;
  margin-bottom: 2rem;
}

.legal-page h2 {
  font-size: 1.25rem;
  margin-top: 2rem;
  margin-bottom: 0.5rem;
  color: #eee;
}

.legal-page h3 {
  font-size: 1.05rem;
  margin-top: 1rem;
  margin-bottom: 0.25rem;
  color: #ddd;
}

.legal-page p {
  margin-bottom: 0.75rem;
  color: var(--text-secondary, #a0a0b0);
}

.legal-page a {
  color: var(--primary, #00f0ff);
  text-decoration: underline;
}

section {
  border-bottom: 1px solid var(--border-color, #2a2a3a);
  padding-bottom: 1rem;
}

section:last-child {
  border-bottom: none;
}

.help-cta {
  background: rgba(0, 240, 255, 0.06);
  border: 1px solid rgba(0, 240, 255, 0.2);
  border-radius: 10px;
  padding: 1rem 1.25rem;
  margin-bottom: 2rem;
}
.help-cta p {
  margin-bottom: 0;
  color: var(--text-primary, #e8e8f0);
}
</style>
