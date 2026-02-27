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
app.use(router)

// Rehydrate auth state before the first navigation so route guards
// (requiresAuth / guestOnly) see the correct isAuthenticated value.
const authStore = useAuthStore()
await authStore.fetchUser()

app.mount('#app')
