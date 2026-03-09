/**
 * Vue Application Entry Point
 * @owner fankahou, LukasStefanek
 * @issue https://github.com/ValGSgit/AlpacaParty/issues/1
 */
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { useAuthStore } from './stores/auth.js'
import './style.css'

import router from './router'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)

;(async () => {
  const authStore = useAuthStore()
  await authStore.fetchUser()
  app.use(router)
  app.mount('#app')
})()
