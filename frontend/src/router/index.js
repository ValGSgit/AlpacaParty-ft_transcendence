/**
 * Vue Router Configuration
 * @owner fankahou, LukasStefanek
 * @issue https://github.com/ValGSgit/AlpacaParty/issues/1
 */
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'

const Login    = () => import('../views/Login.vue')
const Register = () => import('../views/Register.vue')
const Profile  = () => import('../views/Profile.vue')
const UserProfile = () => import('../views/UserProfile.vue')
const Friends  = () => import('../views/Friends.vue')
const Game     = () => import('../games/Game.vue')
const Feed     = () => import('../views/Feed.vue')
const NotFound = () => import('../views/NotFound.vue')
const OAuthCallback = () => import('../views/OAuthCallback.vue')
const PrivacyPolicy  = () => import('../views/PrivacyPolicy.vue')
const TermsOfService = () => import('../views/TermsOfService.vue')
const ApiDocs  = () => import('../views/ApiDocs.vue')

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Game,
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
    path: '/friends',
    name: 'Friends',
    component: Friends,
    meta: { requiresAuth: true },
  },
  {
    path: '/game',
    name: 'Game',
    component: Game,
    meta: { requiresAuth: false },
  },
  {
    path: '/feed',
    name: 'Feed',
    component: Feed,
    meta: { requiresAuth: true },
  },
  {
    path: '/docs',
    name: 'ApiDocs',
    component: ApiDocs,
    meta: { requiresAuth: false },
  },
  {
    path: '/oauth-callback',
    name: 'OAuthCallback',
    component: OAuthCallback,
    meta: { requiresAuth: false },
  },
  {
    path: '/privacy',
    name: 'PrivacyPolicy',
    component: PrivacyPolicy,
    meta: { requiresAuth: false },
  },
  {
    path: '/terms',
    name: 'TermsOfService',
    component: TermsOfService,
    meta: { requiresAuth: false },
  },
  {
    path: '/user/:id',
    name: 'UserProfile',
    component: UserProfile,
    meta: { requiresAuth: false },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: NotFound,
    meta: { requiresAuth: false },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// Navigation guard — redirect to login if route requires auth
router.beforeEach(async (to) => {
  const authStore = useAuthStore()

  // Fetch profile if authenticated and not already loaded
  if (authStore.isAuthenticated && !authStore.user) {
    await authStore.fetchUser()
  }

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return { name: 'Login', query: { redirect: to.fullPath } }
  }

  if (to.meta.guestOnly && authStore.isAuthenticated) {
    return { name: 'Home' }
  }
})

export default router
