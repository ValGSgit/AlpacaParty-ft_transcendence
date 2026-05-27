<template>
  <div class="oauth-callback">
    <p v-if="error" class="error-message">{{ error }}</p>
    <p v-else>Signing you in…</p>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'

const router = useRouter()
const authStore = useAuthStore()
const error = ref('')

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

onMounted(async () => {
  // Clean the tokens from the URL so they aren't visible in browser history
  window.history.replaceState({}, '', window.location.pathname)

  try {
    // Allow a short retry window for reverse-proxy/cookie timing races.
    const delays = [0, 150, 300, 600]
    for (const delay of delays) {
      if (delay)
        await wait(delay)
      await authStore.fetchUser()
      if (authStore.isAuthenticated)
        break
    }
    if (!authStore.isAuthenticated) {
      throw new Error('No user found after OAuth callback retries')
    }
    // Redirect to home only after auth is confirmed
    router.push('/')
  } catch (err) {
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
