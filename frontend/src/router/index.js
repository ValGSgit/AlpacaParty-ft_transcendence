/**
 * Vue Router Configuration
 * @owner fankahou, LukasStefanek
 * @issue https://github.com/ValGSgit/AlpacaParty/issues/1
 *
 * Route guards and auth-gated routes will be added with Issue #8 (Authentication)
 */
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'

const Home     = () => import('../views/Home.vue')
const Login    = () => import('../views/Login.vue')
const Register = () => import('../views/Register.vue')
const Profile  = () => import('../views/Profile.vue')
const UserProfile = () => import('../views/UserProfile.vue')
const ApiTest  = () => import('../views/ApiTest.vue')
const Friends  = () => import('../views/Friends.vue')
const Messages = () => import('../views/Messages.vue')
const Game     = () => import('../games/Game.vue')
const Settings = () => import('../views/Settings.vue')
const Help     = () => import('../views/Help.vue')
const Feed     = () => import('../views/Feed.vue')
const Admin    = () => import('../views/Admin.vue')
const NotFound = () => import('../views/NotFound.vue')
const OAuthCallback = () => import('../views/OAuthCallback.vue')
const PrivacyPolicy  = () => import('../views/PrivacyPolicy.vue')
const TermsOfService = () => import('../views/TermsOfService.vue')
const PublicShowcase = () => import('../views/PublicShowcase.vue')

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
    path: '/api-test',
    name: 'ApiTest',
    component: ApiTest,
    meta: { requiresAuth: false },
  },
  {
    path: '/friends',
    name: 'Friends',
    component: Friends,
    meta: { requiresAuth: true },
  },
  {
    path: '/messages',
    name: 'Messages',
    component: Messages,
    meta: { requiresAuth: true },
  },
  {
    path: '/game',
    name: 'Game',
    component: Game,
    meta: { requiresAuth: true },
  },
  {
    path: '/settings',
    name: 'Settings',
    component: Settings,
    meta: { requiresAuth: true },
  },
  {
    path: '/help',
    name: 'Help',
    component: Help,
    meta: { requiresAuth: true },
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
    path: '/feed',
    name: 'Feed',
    component: Feed,
    meta: { requiresAuth: true },
  },
  {
    path: '/admin',
    name: 'Admin',
    component: Admin,
    meta: { requiresAuth: true },
  },
  {
    path: '/showcase',
    name: 'PublicShowcase',
    component: PublicShowcase,
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