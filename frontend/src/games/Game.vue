<!---------------------- HTML --------------------------->

<template>
  <div v-if="showLoginWarning" class="modal-overlay">
    <div class="shop-title">Welcome to Alpaca Party!
      <button class="shop-btn" @click="warningOff" title="Close">Try</button>
      <router-link to="/login" class="shop-btn">Login</router-link>
    </div>
  </div>
  <div ref="gameContainer" class="scene-container"></div>
  <div v-if="!gameIsReady" class="modal-overlay">Loading...</div>
  <!-- Components -->
  <div v-if="gameIsReady">
    <!-- Game HUD -->
    <div class="hud-left">
      <div class="stat"><span>💰 {{ gUser.coins }}</span></div>
    </div>
    <!-- Side Buttons -->
    <div class="hud-right">
      <button class="hud-btn" @click="addDebugCoins" title="DEBUG: +1 Coin" style="background: #ffd700; color: #000;">🤑</button>
      <button class="hud-btn" @click="openShopMenu" title="Shop">💰</button>
      <button class="hud-btn" @click="editModeOn" title="Edit Scene">✏️</button>
      <button class="hud-btn" @click="editLight(0)" title="Edit Light">🌟</button>
      <button class="hud-btn" @click="changeCamera" title="Change Camera">🎥</button>
    </div>
    <!-- Shop UI -->
    <div v-if="gScene.pause" class="modal-overlay">
      <div class="shop-title">Mini Shop
        <button class="shop-btn" @click="increaseFarmSize" title="Increase Farm Size">💰 Increase Farm Size</button>
        <button class="shop-btn" @click="alpacaMenuOn" title="Buy Alpaca">💰 Buy Alpaca</button>
        <button class="shop-btn" @click="itemShopOn(true)" title="Buy Item">💰 Buy Item</button>
        <button class="close-btn" @click="gScene.pause = false" title="Close">✖️</button>
      </div>
    </div>
    <!-- Alpaca Menu -->
    <div v-if="gScene.alpacaMenu && gScene.newAlpaca" class="modal-overlay">
      <div class="shop-title">New Alpaca
        <div class="input-group">
          <label>Name</label>
          <input type="text" v-model="alpacaConfig.name" placeholder="Name your alpaca..." />
        </div>
        <div class="input-group">
          <label>Size </label>
          <input type="range" v-model.number="alpacaConfig.scale" min="0.75" max="1.25" step="0.05" />
        </div>

        <div class="color-grid">
          <button class="shop-btn" @click="buyAlpaca()" title="Original">Original</button>
          <button class="shop-btn" @click="buyAlpaca(0x111111)" title="Black">Black</button>
          <button class="shop-btn" @click="buyAlpaca(0x555555)" title="Grey">Grey</button>
          <button class="shop-btn" @click="buyAlpaca(0xeeeeee)" title="White">White</button>
        </div>

        <div class="custom-color-row">
          <input type="color" v-model="alpacaConfig.color" class="custom-picker" />
          <button class="shop-btn" @click="buyAlpaca(alpacaConfig.color)" title="Custom">Buy Custom</button>
        </div>

        <button class="close-btn" @click="alpacaMenuOff" title="Close">✖️</button>
      </div>
    </div>
    <!-- Alpaca Stat -->
    <div v-if="gScene.alpacaMenu && !gScene.newAlpaca" class="modal-overlay">
      <div class="shop-title">Alpaca Stats
        <div class="alpaca-stat">
          <div v-if="!gPlayer.speedOffset">Speed: Normal</div>
           <div v-if="gPlayer.speedOffset > 0">Speed: Fast</div>
           <div v-if="gPlayer.speedOffset < 0">Speed: Slow</div>
           <button class="stat-btn" @click="changeSpeed(-1)" title="Speed--">-</button>
           <button class="stat-btn" @click="changeSpeed(1)" title="Speed++">+</button>
        </div>
        <button class="close-btn" @click="gScene.alpacaMenu = false" title="Close">✖️</button>
      </div>
    </div>
    <!-- Item Menu -->
    <div v-if="gScene.itemMenu" class="modal-overlay">
        <div class="shop-title">Select Item
          <button class="shop-btn" @click="spawnShopItem()" title="Tree">🌳</button>
          <button class="close-btn" @click="itemShopOff" title="Close">✖️</button>
        </div>
    </div>
    <!-- Edit Mode -->
     <div v-if="gScene.edit" class="edit-mode">
        Click and Drag Item <button class="close-btn" @click="editModeOff" title="Close">✖️</button>
    </div>
    <!-- Light Menu -->
    <div v-if="gScene.lightMenu && !gScene.edit" class="edit-mode-light">
        <div class="shop-title">Edit Light
          <div class="alpaca-stat">
           <button class="stat-btn" @click="editLight(0x555555)" title="--">1</button>
           <button class="stat-btn" @click="editLight(0x888888)" title="-">2</button>
           <button class="stat-btn" @click="editLight(0xaaaaaa)" title="normal">3</button>
           <button class="stat-btn" @click="editLight(0xcccccc)" title="+">4</button>
           <button class="stat-btn" @click="editLight(0xffffff)" title="++">5</button>
          </div>
          <button class="close-btn" @click="gScene.lightMenu = false" title="Close">✖️</button>
        </div>
    </div>
  </div>
</template>

<!---------------------- SCRIPT ------------------------->
<script setup>
import { shallowRef, ref, onMounted, onUnmounted } from 'vue'
import * as THREE from 'three'
import { useGameEngine } from './core/useGameEngine.js'
import { usePlayerControls } from './core/usePlayerControls.js'
import { initWorld } from './world/initWorld.js'
import { initUser } from './user/initUser.js'
import { useCamera } from './core/useCamera.js'
import { gEngine, gScene, gPlayer, gUser } from './core/globals.js'
import { alpacaConfig, useShop } from './components/shop.js'
import { spawnItems } from "./components/spawnItems.js"
import { saveGame } from './core/saveLoadGame.js'
import { useAuthStore } from '../stores/auth.js'
import { watchChanges } from './core/watchChanges.js'
import './game.css'

const gameContainer = ref(null)
const gameIsReady= shallowRef(false)
const clock = new THREE.Clock()

let player = null
let mixer = null
let animations = null

let animationFrameId
let cameraUpdate = null

let stopMyWatcher

const { init, cleanup, onResize } = useGameEngine(gameContainer)
const { openShopMenu, buyAlpaca, addDebugCoins, editModeOn, editModeOff, increaseFarmSize, editLight, alpacaMenuOn, alpacaMenuOff, itemShopOn, itemShopOff, changeSpeed, changeCamera } = useShop()
const { spawnShopItem } = spawnItems()
const { isAuthenticated } = useAuthStore()

const showLoginWarning = ref(false);
const warningOff = () => {showLoginWarning.value = false;};



onMounted(async () => {
  if (!isAuthenticated)
    showLoginWarning.value = true
  else
    showLoginWarning.value = false
  gEngine.value = init()

  if (!gEngine.value) {
    console.error("Init failed: Scene not returned from globalEngine.")
  }
  else
  {
    const { updateCamera } = useCamera(gEngine.value.camera, gEngine.value.controls)
    cameraUpdate = updateCamera
    gUser.value = initUser()

    await initWorld(gScene.value)
    gameIsReady.value = true
    stopMyWatcher = watchChanges()
    gameLoop()
  }
  window.addEventListener('resize', onResize)
})

// put it down here so the gEngine exists already in onMounted function in usePlayerControls
const { updatePlayer } = usePlayerControls()

const gameLoop = () => {
  animationFrameId = requestAnimationFrame(gameLoop)
  player = gPlayer.value.model
  mixer = gPlayer.value.mixer
  animations = gPlayer.value.animations

  const delta = clock.getDelta()

  if (player) {
    updatePlayer(player, mixer, animations)
    if (cameraUpdate && !gScene.value.selected)
    {
      cameraUpdate(player)
    }
  }

  if (mixer) {
    mixer.update(delta)
  }

  gEngine.value.renderer.render(
    gEngine.value.scene,
    gEngine.value.camera
  )
}

onUnmounted(() => {
  saveGame()
  stopMyWatcher()
  cancelAnimationFrame(animationFrameId)
  window.removeEventListener('resize', onResize)
  cleanup()
})
</script>

<!---------------------- STYLE ------------------------->
<style src="./game.css"></style>
