<!--
  OAuthCallback View
  @owner ValGSgit
  @issue https://github.com/ValGSgit/AlpacaParty/issues/8

  Handles the redirect from the backend after Google / GitHub OAuth.
  The backend appends ?accessToken=…&refreshToken=… to this route's URL.
  We read those tokens, persist them, fetch the user, and redirect home.
-->
<template>
  <div class="oauth-callback">
    <p v-if="error" class="error-message">{{ error }}</p>
    <p v-else>Signing you in…</p>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'

const router  = useRouter()
const route   = useRoute()
const authStore = useAuthStore()
const error   = ref('')

/**
 * Extract tokens from whichever delivery mechanism the backend used:
 *   1. postMessage (popup flow)  — handled by the login page's message listener
 *   2. URL fragment (#)          — primary redirect flow (tokens never hit the server)
 *   3. URL query params (?)      — legacy fallback
 */
function extractTokens() {
  // Try URL fragment first (most secure — fragments aren't sent to servers)
  const hash = window.location.hash.substring(1)
  if (hash) {
    try {
      const data = JSON.parse(decodeURIComponent(hash))
      if (data.accessToken) return data
    } catch { /* not valid JSON, fall through */ }
  }
  return null
}

onMounted(async () => {
  const tokens = extractTokens()

  if (!tokens) {
    error.value = 'OAuth login failed — no token received.'
    setTimeout(() => router.push('/login'), 2500)
    return
  }

  // Clean the tokens from the URL so they aren't visible in browser history
  window.history.replaceState({}, '', window.location.pathname)

  try {
    await authStore.handleOAuthTokens(tokens)
    router.push('/')
  } catch {
    error.value = 'OAuth login failed — please try again.'
    setTimeout(() => router.push('/login'), 2500)
  }
})
</script>

<style scoped>
.oauth-callback {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 70vh;
  color: #ccc;
  font-size: 1.1rem;
}

.error-message {
  color: #ff6b6b;
}
</style>
