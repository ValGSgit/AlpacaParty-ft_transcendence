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
    
    <div class="hud-container hud-left">
      <div v-if="!gUser.gameMode" class="stat"><span>🪙 {{ gUser.coins }}</span></div>
      <div v-if="gUser.gameMode" class="stat"><span>🦙 {{ gUser.point }} </span></div>
      <template v-if="gUser.gameMode">
        <div v-if="gUser.hp === 3"><span>❤️❤️❤️</span></div>
        <div v-if="gUser.hp === 2"><span>❤️❤️💔</span></div>
        <div v-if="gUser.hp === 1"><span>❤️💔💔</span></div>
        <div v-if="gUser.hp === 0"><span>💔💔💔</span></div>
      </template>
    </div>

    <div class="floating-text-container">
      <div 
        v-for="popup in floatingTexts" 
        :key="popup.id" 
        class="floating-text"
        :style="{ left: popup.x + 'px', top: popup.y + 'px' }"
      >
        {{ popup.text }}
      </div>
    </div>

    <div class="hud-container hud-right">
      <button class="hud-btn" @click="addDebugCoins()" title="DEBUG: Add Coins" style="background: #ffd700; color: #000;">🪙</button>
      <button class="hud-btn" @click="openShopMenu()" title="Shop">🛍️</button>
      <button class="hud-btn" @click="openEditMode()" title="Edit Scene">✏️</button>
      <button class="hud-btn" @click="openLightMenu()" title="Edit Light">☀️</button>
      <button class="hud-btn" @click="changeCamera()" title="Change Camera">🎥</button>
      <button class="hud-btn" @click="changeGame()" title="Mini Games">🕹️</button>
    </div>
    
    <div v-if="gUI.shopMenu" class="modal-overlay">
      <div class="shop-title">Mini Shop
        <button class="shop-btn" @click="openFarmMenu()" title="Upgrade Farm">🚜 Upgrade Farm</button>
        <button class="shop-btn" @click="openAlpacaShop()" title="Buy Alpaca">🦙 Buy Alpaca</button>
        <button class="shop-btn" @click="openItemShop()" title="Buy Item">🌳 Buy Item</button>
        <button class="close-btn" @click="closeShopMenu()" title="Close">✖️</button>
      </div>
    </div>

<div v-if="gUI.farmMenu" class="modal-overlay">
  <div class="shop-title">
    Upgrade Farm
    
    <div class="stats-content">
      <div class="stat-row">
        <strong>Current Farm Size:</strong> {{ gUser.upgrades }}/5
      </div>
    </div>

    <div class="itemshop-grid">
    <button class="itemshop-card"@click="increaseFarmSize()">
      <span class="item-name">Increase Farm Size</span>
      <div class="icon-container">
        <span style="position: relative; bottom: 10px;">🚜</span>
        <span class="item-cost">🪙 {{ CONST.UPGRADE_COST }}</span>
      </div>
    </button>

     <button class="itemshop-card"@click="increaseHerdSize()">
      <span class="item-name">Increase Herd Size</span>
      <div class="icon-container">
        <span style="position: relative; bottom: 10px;">🦙</span>
        <span class="item-cost">🪙 5</span>
      </div>
    </button>
  </div>

    <button class="close-btn" @click="gUI.farmMenu = false" title="Close">✖️</button>
  </div>
</div>

    <div v-if="gUI.itemShop" class="modal-overlay">
      <div class="shop-modal">
        <div class="shop-title"> Buy Item </div>
        <div class="itemshop-grid">
          <button v-for="item in shopItems" :key="item.name" class="itemshop-card" @click="buyItem(item)">
            <span class="item-name">{{ item.name }}</span>
            <div class="icon-container">
              <img :src="item.icon" :alt="item.name" class="item-icon" />
              <span class="item-cost">{{ item.cost }}🪙</span>
            </div>
          </button>
        </div>
        <button class="close-btn" @click="closeItemShop()" title="Close">✖️</button>
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
          <button class="shop-btn" @click="alpacaConfig.color = '#795740'; buyAlpaca()" title="Brown">Brown</button>
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
        <div class="stats-content" :key="updateVue">
          <div class="stat-row">
            <strong>Name:</strong> 
            <span v-if="!gUI.isEditingName" class="editable-text">
              {{ gPlayer.name }}
              <button class="icon-btn" @click="gUI.isEditingName = true" title="Edit Name">✏️</button>
            </span>
            <span v-else class="editing-mode">
              <input type="text" v-model="gPlayer.name" @keyup.enter="changeName(gPlayer.name); gUI.isEditingName = false" class="name-input" />
            </span>
          </div>
          <div class="stat-row"><strong>Age:</strong> {{ gPlayer.age }}</div>
          <div class="stat-row">
            <strong>Color:</strong> 
            <input type="color" v-model="gPlayer.color" @input="changeColor(gPlayer.color)" class="custom-picker" title="Change Alpaca Color" />
          </div>
          <div class="stat-row">
            <strong>Speed:</strong> 
            <span v-if="gPlayer.speedOffset === 0"> Normal</span>
            <span v-if="gPlayer.speedOffset > 0"> Fast</span>
            <span v-if="gPlayer.speedOffset < 0"> Slow</span>
            <div class="speed-controls">
              <button class="stat-btn" @click="changeSpeed(-1)" title="Decrease Speed">-</button>
              <button class="stat-btn" @click="changeSpeed(1)" title="Increase Speed">+</button>
            </div>
          </div>
        </div>
        <button class="close-btn" @click="closeAlpacaStats()" title="Close">✖️</button>
      </div>
    </div>
        
    <div v-if="gUI.editMode" class="edit-mode">
      <div class="shop-title"> Edit Mode
      <div class="info-text"> Click and Move Item </div>
          <div v-if="gEditState.selected" class="edit-actions">
            <button class="shop-btn" @click="sellItem()">💰Sell Item</button>
            <button class="shop-btn" @click="cancelPlacement()">Cancel ✖️</button>
          </div>
      <button class="close-btn" @click="closeEditMode()" title="Close">✖️</button>
      </div>
        <div class="controls-hint">
        <h4>🛠️ Edit Controls</h4>
        <div class="control-row">
          <span>🖱️ Click</span>
          <span>Select / Place</span>
        </div>
        <div class="control-row">
          <span>↕️ Scroll</span>
          <span>Rotate</span>
        </div>
        <div class="control-row">
          <span>⇧ Shift + Scroll</span>
          <span>Scale</span>
        </div>
      </div>
    </div>

    <div v-if="gUI.lightMenu" class="modal-overlay">
      <div class="shop-title">Edit Light
        <div class="toggle-row">
          <span>Day/Night Cycle</span>
          <label class="switch" title="Toggle Day/Night Cycle">
            <input type="checkbox" :checked="gUI.isLightCycling" @change="toggleLightCycle()">
            <span class="slider"></span>
          </label>
        </div>
        <button class="shop-btn" @click="setTimeOfDay('sunrise')">🌅 Sunrise</button>
        <button class="shop-btn" @click="setTimeOfDay('day')">☀️ Day</button>
        <button class="shop-btn" @click="setTimeOfDay('sunset')">🌄 Sunset</button>
        <button class="shop-btn" @click="setTimeOfDay('night')">🌙 Night</button>
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
import { updateCoins } from './components/coins.js'
import { editLight } from './components/editLight.js'
import { useEditMode } from './components/editMode.js'
import { useFloatingText } from './components/floatingText.js'
import { itemShop } from './components/itemShop.js'
import { useShop } from './components/shop.js'
import { CONST } from './config/constants.js'
import { addDebugCoins } from './core/debug.js'
import { updateAlpacas } from './core/entities/Alpaca.js'
import { updateCollectables } from './core/entities/Collectable.js'
import { shopItems } from './core/entities/Item.js'
import { cleanupFPSstats, initFPSstats } from './core/FPSstats.js'
import { gEditState, gEngine, gPlayer, gScene, gUI, gUser } from './core/globals.js'
import { saveGame } from './core/saveLoadGame.js'
import { changeCamera, useCamera } from './core/useCamera.js'
import { useGameEngine } from './core/useGameEngine.js'
import { useInput } from './core/useInput.js'
import { useUIManager } from './core/useUIManager.js'
import { watchChanges } from './core/watchChanges.js'
import './game.css'
import { changeGame } from './mini_games/init.js'
import { initUser } from './user/initUser.js'
import { initWorld } from './world/initWorld.js'

const gameContainer = ref(null)
const gameIsReady= shallowRef(false)
const clock = new THREE.Clock()

const { changeColor, changeName, changeSpeed, updateVue } = alpacaStats()
const { initInput, cleanupInput} = useInput()
const { setTimeOfDay, updateLighting, toggleLightCycle} = editLight()
const { buyAlpaca } = alpacaShop()
const { openEditMode, openFarmMenu, closeFarmMenu, closeEditMode, openShopMenu, closeShopMenu, openAlpacaShop, closeAlpacaShop, closeAlpacaStats, openItemShop, closeItemShop, openLightMenu, closeLightMenu } = useUIManager()
const { init, cleanup, onResize } = useGameEngine(gameContainer)
const { increaseFarmSize } = useShop()
const { buyItem } = itemShop()
const { isAuthenticated } = useAuthStore()
const { cancelPlacement, sellItem} =  useEditMode()
const showLoginWarning = ref(false);
const warningOff = () => {showLoginWarning.value = false;};
const { updateSpits } = alpacaHandling();
const { floatingTexts} = useFloatingText();

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

  //generateIcons();

  if (!gEngine.value) {
    console.error('Init failed: Scene not returned from globalEngine.')
  }
  else
  {
    stats = initFPSstats(gameContainer.value);
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

  updateAlpacas(delta);
  updateCollectables(player, delta);
  updateCoins(delta);
  updateSpits()
  updateLighting(delta);

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
  stopMyWatcher()
  cancelAnimationFrame(animationFrameId)
  window.removeEventListener('resize', onResize)
  cleanupFPSstats(stats, gameContainer.value);
  cleanupInput();
  cleanup()
})
</script>

<!---------------------- STYLE ------------------------->
<style src="./game.css"></style>
