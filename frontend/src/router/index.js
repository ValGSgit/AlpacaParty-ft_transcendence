/**
 * Vue Router Configuration
 * @owner fankahou, LukasStefanek
 * @issue https://github.com/ValGSgit/Cleanscendence/issues/1
 *
 * Route guards and auth-gated routes will be added with Issue #8 (Authentication)
 */
import { createRouter, createWebHistory } from 'vue-router'

const Home = () => import('../views/Home.vue')
// TODO: Add views as issues are implemented
// const Login = () => import('../views/Login.vue')         // Issue #8
// const Register = () => import('../views/Register.vue')   // Issue #8
// const Profile = () => import('../views/Profile.vue')     // Profile System
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
  // TODO: Add routes as features are implemented
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// TODO: Navigation guards for auth (Issue #8)

export default router
