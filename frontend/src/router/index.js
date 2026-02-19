/**
 * Vue Router Configuration
 * @owner fankahou, LukasStefanek
 * @issue https://github.com/ValGSgit/Cleanscendence/issues/1
 *
 * Route guards and auth-gated routes will be added with Issue #8 (Authentication)
 */
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'

const Home = () => import('../views/Home.vue')
const Login = () => import('../views/Login.vue')
const Register = () => import('../views/Register.vue')
const Profile = () => import('../views/Profile.vue')
const Game = () => import('../games/Game.vue')
// TODO: Add views as issues are implemented
// const Friends = () => import('../views/Friends.vue')     // Friends System
// const Messages = () => import('../views/Messages.vue')   // Chat / WebSockets
// const Game = () => import('../views/Game.vue')           // Game Core
// const Settings = () => import('../views/Settings.vue')   // User Management
// const NotFound = () => import('../views/NotFound.vue')

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home,
    meta: { requiresAuth: false },
  },
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { requiresAuth: false, guestOnly: true },
  },
  {
    path: '/register',
    name: 'Register',
    component: Register,
    meta: { requiresAuth: false, guestOnly: true },
  },
  {
    path: '/profile',
    name: 'Profile',
    component: Profile,
    meta: { requiresAuth: true },
  },
  {
    path: '/game',
    name: 'Game',
    component: Game,
    meta: { requiresAuth: false }, // just play for now
  },
  // TODO: Add routes as features are implemented
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// Navigation guard — redirect to login if route requires auth
router.beforeEach((to) => {
  const authStore = useAuthStore()

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return { name: 'Login', query: { redirect: to.fullPath } }
  }

  // Redirect logged-in users away from guest-only pages (login/register)
  if (to.meta.guestOnly && authStore.isAuthenticated) {
    return { name: 'Home' }
  }
})

export default router
