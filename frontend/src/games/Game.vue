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
  
  <div v-if="gameIsReady">
    <div v-if="!gUser.gameMode" class="title">Farm</div>
    <div v-if="gUser.gameMode && gUser.hp" class="title">Battle Royale</div>
    <div v-if="gUser.gameMode && !gUser.hp" class="title">Game Over!</div>
    <div class="hud-left">
      <div v-if="!gUser.gameMode" class="stat"><span>💰 {{ gUser.coins }}</span></div>
      <div v-if="gUser.gameMode" class="stat"><span>🦙 {{ gUser.point }} </span></div>
      <div v-if="gUser.hp === 3"><span>❤️❤️❤️</span></div>
      <div v-if="gUser.hp === 2"><span>❤️❤️💔</span></div>
      <div v-if="gUser.hp === 1"><span>❤️💔💔</span></div>
      <div v-if="gUser.hp === 0"><span>💔💔💔</span></div>
    </div>

    <div class="hud-right">
      <button class="hud-btn" @click="changeGame()" title="Mini Games">🕹️</button>
        <button v-if="!gUser.gameMode" class="hud-btn" @click="openShopMenu()" title="Shop">💰</button>
        <button v-if="!gUser.gameMode" class="hud-btn" @click="openEditMode()" title="Edit Scene">✏️</button>
        <button v-if="!gUser.gameMode" class="hud-btn" @click="openLightMenu()" title="Edit Light">🌟</button>
        <button v-if="!gUser.gameMode" class="hud-btn" @click="changeCamera()" title="Change Camera">🎥</button>
        <button class="hud-btn" @click="addDebugCoins()" title="DEBUG: Add Coins" style="background: #ffd700; color: #000;">🤑</button>
    </div>
    
    <div v-if="gUI.shopMenu" class="modal-overlay">
      <div class="shop-title">Mini Shop
        <button class="shop-btn" @click="increaseFarmSize()" title="Increase Farm Size">💰 Increase Farm Size</button>
        <button class="shop-btn" @click="openAlpacaShop()" title="Buy Alpaca">💰 Buy Alpaca</button>
        <button class="shop-btn" @click="openItemShop()" title="Buy Item">💰 Buy Item</button>
        <button class="close-btn" @click="closeShopMenu()" title="Close">✖️</button>
      </div>
    </div>
    
    <div v-if="gUI.alpacaShop" class="modal-overlay">
      <div class="shop-title">Buy Alpaca
        <div class="input-group">
          <label>Name</label>
          <input type="text" v-model="alpacaConfig.name" placeholder="Name your alpaca..." />
        </div>
        <div class="input-group">
          <label>Size </label>
          <input type="range" v-model.number="alpacaConfig.scale" min="0.75" max="1.25" step="0.05" />
        </div>
          <div class="color-grid">
          <button class="shop-btn" @click="alpacaConfig.color = '#634632'; buyAlpaca()" title="Brown">Brown</button>
          <button class="shop-btn" @click="alpacaConfig.color = '#111111'; buyAlpaca()" title="Black">Black</button>
          <button class="shop-btn" @click="alpacaConfig.color = '#555555'; buyAlpaca()" title="Grey">Grey</button>
          <button class="shop-btn" @click="alpacaConfig.color = '#ffffff'; buyAlpaca()" title="White">White</button>
        </div>

        <div class="custom-color-row">
          <input type="color" v-model="alpacaConfig.color" class="custom-picker" />
          <button class="shop-btn" @click="buyAlpaca()" title="Custom">Custom</button>
        </div>

        <button class="close-btn" @click="closeAlpacaShop()" title="Close">✖️</button>
      </div>
    </div>
    
  <div v-if="gUI.alpacaStats" class="modal-overlay">
        <div class="shop-title">Alpaca Stats
          
          <div class="alpaca-stat" :key="updateVue">
            
            <div v-if="gPlayer.speedOffset === 0">Speed: Normal</div>
            <div v-if="gPlayer.speedOffset > 0">Speed: Fast</div>
            <div v-if="gPlayer.speedOffset < 0">Speed: Slow</div>
            
            <button class="stat-btn" @click="changeSpeed(-1)" title="Speed--">-</button>
            <button class="stat-btn" @click="changeSpeed(1)" title="Speed++">+</button>
          </div>
          
          <button class="close-btn" @click="closeAlpacaStats()" title="Close">✖️</button>
        </div>
      </div>
    
    <div v-if="gUI.itemShop" class="modal-overlay">
        <div class="shop-title">Select Item
          <button class="shop-btn" @click="buyItem('/models/tree.glb')" title="Tree">Tree</button>
          <button class="shop-btn" @click="buyItem('/models/fence.glb')" title="Fence">Fence</button>
          <button class="shop-btn" @click="buyItem('/models/hay.glb')" title="Water">Hay</button>
          <button class="close-btn" @click="closeItemShop()" title="Close">✖️</button>
        </div>
    </div>
    
    <div v-if="gUI.editMode" class="edit-mode">
        Click and Move Item <button class="close-btn" @click="closeEditMode()" title="Close">✖️</button>
    </div>

    <div v-if="gUI.editMode && gEditState.selected" class="edit-actions" style="position: absolute; bottom: 40px; left: 50%; transform: translateX(-50%); display: flex; gap: 10px; z-index: 10;">
        <button class="shop-btn" @click="cancelPlacement()">✖️ Cancel</button>
        <button class="shop-btn" @click="deleteItem()" style="background: #ff4444; color: white; border: 2px solid #cc0000;">🗑️ Delete Item</button>
    </div>

    <div v-if="gUI.lightMenu" class="edit-mode-light">
        <div class="shop-title">Edit Light
          <div class="alpaca-stat">
           <button class="stat-btn" @click="setLight(0x555555)" title="--">1</button>
           <button class="stat-btn" @click="setLight(0x888888)" title="-">2</button>
           <button class="stat-btn" @click="setLight(0xaaaaaa)" title="normal">3</button>
           <button class="stat-btn" @click="setLight(0xcccccc)" title="+">4</button>
           <button class="stat-btn" @click="setLight(0xffffff)" title="++">5</button>
          </div>
          <button class="close-btn" @click="closeLightMenu()" title="Close">✖️</button>
        </div>
    </div>
  </div>
</template>

<!---------------------- SCRIPT ------------------------->
<script setup>
import * as THREE from 'three'
import { onMounted, onUnmounted, ref, shallowRef } from 'vue'
import { useAuthStore } from '../stores/auth.js'
import { alpacaHandling } from './components/alpacaHandling.js'
import { alpacaConfig, alpacaShop } from './components/alpacaShop.js'
import { alpacaStats } from './components/alpacaStats.js'
import { spawnCoins } from './components/coins.js'
import { editLight } from './components/editLight.js'
import { useEditMode } from './components/editMode.js'
import { itemShop } from './components/itemShop.js'
import { useShop } from './components/shop.js'
import { addDebugCoins } from './core/debug.js'
import { gAlpacas, gCollectables, gEditState, gEngine, gPlayer, gScene, gUI, gUser } from './core/globals.js'
import { saveGame } from './core/saveLoadGame.js'
import { cleanupStats, initStats } from './core/stats.js'
import { changeCamera, useCamera } from './core/useCamera.js'
import { useGameEngine } from './core/useGameEngine.js'
import { useInput } from './core/useInput.js'
import { useUIManager } from './core/useUIManager.js'
import { watchChanges } from './core/watchChanges.js'
import './game.css'
import { initUser } from './user/initUser.js'
import { initWorld } from './world/initWorld.js'
import { changeGame } from './mini_games/init.js'

const gameContainer = ref(null)
const gameIsReady= shallowRef(false)
const clock = new THREE.Clock()

const { changeSpeed, updateVue } = alpacaStats()
const { initInput, cleanupInput} = useInput()
const { setLight } = editLight()
const { buyAlpaca } = alpacaShop()
const { openEditMode, closeEditMode, openShopMenu, closeShopMenu, openAlpacaShop, closeAlpacaShop, closeAlpacaStats, openItemShop, closeItemShop, openLightMenu, closeLightMenu } = useUIManager()
const { init, cleanup, onResize } = useGameEngine(gameContainer)
const { increaseFarmSize } = useShop()
const { buyItem } = itemShop()
const { isAuthenticated } = useAuthStore()
const { cancelPlacement, deleteItem} =  useEditMode()
const showLoginWarning = ref(false);
const warningOff = () => {showLoginWarning.value = false;};
const { updateSpits } = alpacaHandling()

let animationFrameId
let cameraUpdate = null;
let stopMyWatcher
let stats;

onMounted(async () => {
  if (!isAuthenticated)
    showLoginWarning.value = true
  else
    showLoginWarning.value = false
  gEngine.value = init()

  if (!gEngine.value) {
    console.error('Init failed: Scene not returned from globalEngine.')
  }
  else
  {
    //stats = initStats(gameContainer.value);
    initInput()
    const { updateCamera } = useCamera(gEngine.value.camera, gEngine.value.controls)
    cameraUpdate = updateCamera
    gUser.value = initUser()

    await initWorld(gScene.value, isAuthenticated)
    gameIsReady.value = true
    stopMyWatcher = watchChanges()
    gameLoop()
  }
  window.addEventListener('resize', onResize)
})

const gameLoop = () => {
  if (stats) stats.begin();
  animationFrameId = requestAnimationFrame(gameLoop)
  
  const delta = clock.getDelta()
  const player = gPlayer.value

  if (player) {
    if (cameraUpdate && !gUI.editMode) {
      cameraUpdate(player)
    }
  }

  for (let i = 0; i < gAlpacas.length; i++) {
    const alpaca = gAlpacas[i]
    alpaca.update(delta);
  }

    if (player && player.model) {
      for (let i = gCollectables.length - 1; i >= 0; i--) {
        const coin = gCollectables[i];
        if (coin.update) coin.update(delta);
      }
    }

  spawnCoins(delta);
  updateSpits()

  if (gEngine.value?.controls) {
    gEngine.value.controls.update()
  }

  gEngine.value.renderer.render(
    gEngine.value.scene,
    gEngine.value.camera
  )
  if (stats) stats.end();
}

onUnmounted(() => {
  saveGame()
  if (stopMyWatcher) stopMyWatcher()
  cancelAnimationFrame(animationFrameId)
  window.removeEventListener('resize', onResize)
  cleanupStats(stats, gameContainer.value);
  cleanupInput();
  cleanup()
})
</script>

<!---------------------- STYLE ------------------------->
<style src="./game.css"></style>
