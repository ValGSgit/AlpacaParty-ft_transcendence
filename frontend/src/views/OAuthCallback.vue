<!--
  OAuthCallback View
  @owner ValGSgit
  @issue https://github.com/ValGSgit/AlpacaParty/issues/8

  Landing page after a Google / GitHub OAuth round-trip. The backend has
  already set the JWT cookies on the redirect, so the only work here is to
  scrub any query string from the URL (so it doesn't leak into history) and
  bounce the user to the home route.
-->
<template>
  <div class="oauth-callback">
    <p v-if="error" class="error-message">{{ error }}</p>
    <p v-else>Signing you in…</p>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router  = useRouter()
const error   = ref('')

onMounted(async () => {
  // Clean the tokens from the URL so they aren't visible in browser history
  window.history.replaceState({}, '', window.location.pathname)

  try {
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
