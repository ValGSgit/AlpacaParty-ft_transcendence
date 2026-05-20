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

import router from './router/index.js'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)

;(async () => {
  const authStore = useAuthStore()
  if (localStorage.getItem('cookie_consent') === 'accepted') {
    await authStore.fetchUser()
  }
  app.use(router)
  app.mount('#app')
})()
