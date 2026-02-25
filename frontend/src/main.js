/**
 * Vue Application Entry Point
 * @owner fankahou, LukasStefanek
 * @issue https://github.com/ValGSgit/Cleanscendence/issues/1
 */
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth.js'
import './style.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)

// Rehydrate auth state BEFORE installing the router so that the very first
// navigation (including the initial page load) sees the correct
// isAuthenticated value in every beforeEach guard.
const authStore = useAuthStore()
await authStore.fetchUser()

app.use(router)
app.mount('#app')
