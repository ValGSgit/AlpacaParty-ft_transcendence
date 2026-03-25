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

onMounted(async () => {
  const { accessToken, refreshToken } = route.query

  if (!accessToken) {
    error.value = 'OAuth login failed — no token received.'
    setTimeout(() => router.push('/login'), 2500)
    return
  }

  try {
    await authStore.handleOAuthTokens({ accessToken, refreshToken })
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
