/**
 * Vue Application Entry Point
 * @owner fankahou, LukasStefanek
 * @issue https://github.com/ValGSgit/Cleanscendence/issues/1
 */
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { useAuthStore } from './stores/auth.js'
import './style.css'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)

const authStore = useAuthStore()
await authStore.fetchUser()

import router from './router'
app.use(router)

app.mount('#app')
