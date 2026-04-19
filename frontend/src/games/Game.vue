<template>
  <div v-if="showLoginWarning" class="modal-overlay">
    <div class="shop-title">Welcome to Alpaca Party!
      <button class="shop-btn" @click="warningOff" title="Close">Try</button>
      <router-link to="/login" class="shop-btn">Login</router-link>
      <div class="features">
      <div class="feature-card">
        <h3>🦙 Raise Alpacas</h3>
        <p>Buy, name and customise alpacas with unique colours and speeds.</p>
      </div>
      <div class="feature-card">
        <h3>🌳 Build Your Farm</h3>
        <p>Plant trees, expand land and decorate your world.</p>
      </div>
      <div class="feature-card">
        <h3>💰 Earn Coins</h3>
        <p>Collect coins to unlock upgrades and grow your herd.</p>
      </div>
        <div class="feature-card">
        <h3>🕹️ Mini Games</h3>
        <p>Play Mini games with your friends, online and offline.</p>
      </div>
    </div>
    </div>
  </div>

  <div ref="gameContainer" class="scene-container"></div>
  <div v-if="!gameIsReady" class="modal-overlay">Loading...</div>
  <div v-if="gameIsReady">

  <div v-if="gMinigame.mode && gMinigame.isGameOver" class="modal-overlay">
    <div class="shop-title">
      <div v-if="!gUser.hp">Game Over! Final Score:</div>
      <div v-if="gUser.hp">You Won! Final Score:</div>
      <button v-if="gMinigame.mode === 1 || gMinigame.mode === 2" class="shop-btn">You killed: {{ gUser.point }} 🦙</button>
      <template v-if="gMinigame.mode === 3">
        <button v-for="player in gMinigame.players" :key="'end-' + player.id" class="shop-btn">
          {{ player.name || `P${player.id}` }} Score: {{ player.point }} 🪵
        </button>
      </template>
      <div class="action-container">
        <button v-if="gMinigame.mode === 1 || gMinigame.mode === 3" class="shop-btn" @click="changeGame(gMinigame.mode, playerCount)">
          Play Again 🔄
        </button>
        <button class="shop-btn" @click="changeGame()" title="Return to Farm">
          Return to Farm 🚜
        </button>
      </div>
    </div>
  </div>

<div class="hud-container hud-left">
    <div 
      id="coin-hud" 
      v-if="gMinigame.mode === 0 || gMinigame.isGameOver" 
      class="stat":class="{ 'overlay': gMinigame.isGameOver }">
      <span>💰 {{ gUser.coins }}</span>
    </div>
      <template v-if="gMinigame.mode === 1 || gMinigame.mode === 2">
        <div v-for="player in gMinigame.players" :key="'ui-' + player.id" class="stat multiplayer-row">
          <span class="p-name">{{ player.name || `P${player.id}`}}:</span>
          <span class="p-hp">{{ getHearts(player.hp) }}</span>
          <span class="p-point">🦙 {{ player.point }}</span>
        </div>
      </template>
      <template v-if="gMinigame.mode > 2 &&!gMinigame.isGameOver">
        <div v-for="player in gMinigame.players" :key="'ui-' + player.id" class="stat multiplayer-row">
          <span class="p-name">{{ player.name || `P${player.id}`}}:</span>
          <span class="p-hp">{{ getHearts(player.hp) }}</span>
          <span class="p-point">🪵 {{ player.point }}</span>
        </div>
      </template>
  </div>

    <div class="floating-text-container">
      <div 
        v-for="popup in floatingTexts" 
        :key="popup.id" 
        :class="['floating-text', `floating-text-${popup.type}`]"
        :style="{ left: popup.x + 'px', top: popup.y + 'px' }"
      >
        {{ popup.text }}
      </div>
    </div>

    <div class="hud-container hud-right">
      <button class="hud-btn" @click="openGameMenu()" title="Mini Games">🕹️</button>
      <button v-if="!gMinigame.mode" class="hud-btn" @click="addDebugCoins()" title="DEBUG: Add Coins" style="background: #ffd700; color: #000;">🪙</button>
      <button v-if="!gMinigame.mode" class="hud-btn" @click="openShopMenu()" title="Shop">🛍️</button>
      <button v-if="!gMinigame.mode" class="hud-btn" @click="openEditMode()" title="Edit Scene">✏️</button>
      <button v-if="!gMinigame.mode" class="hud-btn" @click="openLightMenu()" title="Edit Light">☀️</button>
      <button v-if="!gMinigame.mode" class="hud-btn" @click="changeCamera()" title="Change Camera">🎥</button>    
    </div>
    
    <div v-if="gUI.shopMenu" class="modal-overlay">
      <div class="shop-title">Mini Shop
        <button class="shop-btn" @click="openFarmMenu()" title="Upgrade Farm">🚜 Upgrade Farm</button>
        <button class="shop-btn" @click="openAlpacaShop()" title="Buy Alpaca">🦙 Buy Alpaca</button>
        <button class="shop-btn" @click="openItemShop()" title="Buy Item">🌳 Buy Item</button>
        <button class="close-btn" @click="closeShopMenu()" title="Close">✖️</button>
      </div>
    </div>

    <div v-if="gUI.gameMenu" class="modal-overlay">
      <div class="shop-title">Select Game
        <div class="color-grid">
        <button class="shop-btn" @click="changeGame(1, playerCount)" title="Spit Royale with AI">Spit Royale</button>
        <button v-if="isAuthenticated" class="shop-btn" @click="openLobbyMenu(0)" title="Spit Royale Online">Online Lobby</button>
        <button class="shop-btn" @click="changeGame(3, playerCount)" title="Alpaca Road">Alpaca Road</button>
        <button v-if="isAuthenticated" class="shop-btn" @click="openLobbyMenu(1)" title="Alpaca Road Online">Online Lobby</button>
        <select v-model="playerCount" class="player-selector" title="Number of Players">
          <option :value="1">1 Player</option>
          <option :value="2">2 Players</option>
          <option :value="3">3 Players</option>
          <option :value="4">4 Players</option>
        </select>
      </div>
        <button class="close-btn" @click="closeGameMenu()" title="Close">✖️</button>
      </div>
    </div>

    <div v-if="gUI.lobbyMenu && !gUI.isRoadGame" class="modal-overlay">
      <div class="shop-title">Spit Royale Lobby
        <button class="shop-btn" @click="changeGame(2, 1, -1)" title="Spit Royale Online">Create New Room</button>
        <button v-if="gMinigame.lobby.length > 0" class="shop-btn" @click="changeGame(2, 1)" title="Spit Royale Online">Join Random Room</button>
        <div v-for="game in gMinigame.lobby">
          <button class="shop-btn" @click="changeGame(2, 1, game.matchid)" title="Spit Royale Online"><span>{{ game.roomName }}</span></button>
        </div>
        <button class="close-btn" @click="closeLobbyMenu()" title="Close">✖️</button>
      </div>
    </div>

    <div v-if="gMinigame.mode === 4 && (!gMinigame.isReady || !gMinigame.isActive) && !gMinigame.isGameOver" class="modal-overlay">
      <div class="shop-title">Get Ready!
        <button class="shop-btn" :class="{ 'is-ready': gMinigame.isReady }" @click="getReady()" title="Ready">Ready</button>
        <button class="close-btn" @click="changeGame()" title="Close">✖️</button>
      </div>
    </div>

    <div v-if="gUI.lobbyMenu && gUI.isRoadGame" class="modal-overlay">
      <div class="shop-title">Alpaca Road Lobby
        <button class="shop-btn" @click="changeGame(4, 1, -1)" title="Alpaca Road Online">Create New Room</button>
        <div v-for="game in gMinigame.lobby">
          <button class="shop-btn" @click="changeGame(4, 1, game.matchid)" title="Alpaca Road Online"><span>{{ game.roomName }}</span></button>
        </div>
        <button class="close-btn" @click="closeLobbyMenu()" title="Close">✖️</button>
      </div>
    </div>

    <div v-if="gUI.farmMenu" class="modal-overlay">
      <div class="shop-title">
        Upgrade Farm
        <div class="stats-content">
          <div class="stat-row">
            <strong>Current Farm Size:</strong> {{ gUser.upgrades }}/{{ CONST.MAX_UPGRADES }}
          </div>
        </div>

        <div class="itemshop-grid">
        <button class="itemshop-card" @click="increaseFarmSize(gUser.upgrades)">
          <span class="item-name">Increase Farm Size</span>
          <div class="icon-container">
            <span style="position: relative; bottom: 10px;">🚜</span>
            <span class="item-cost">🪙 {{ getUpgradeCost(gUser.upgrades)}}</span>
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
      <div class="shop-title"> 
        Buy Item 
        
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
import { storeToRefs } from 'pinia'
import * as THREE from 'three'
import { StereoEffect } from 'three/addons/effects/StereoEffect.js'
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
import { getUpgradeCost, upgradeFarm } from './components/upgradeFarm.js'
import { CONST } from './config/constants.js'
import { addDebugCoins } from './core/debug.js'
import { updateAlpacas } from './core/entities/Alpaca.js'
import { updateCollectables } from './core/entities/Collectable.js'
import { shopItems } from './core/entities/Item.js'
import { cleanupFPSstats, initFPSstats } from './core/FPSstats.js'
import { gEditState, gEngine, gMinigame, gPlayer, gScene, gUI, gUser } from './core/globals.js'
import { saveGame } from './core/saveLoadGame.js'
import { changeCamera, checkControlsEnabled, useCamera } from './core/useCamera.js'
import { useGameEngine } from './core/useGameEngine.js'
import { useInput } from './core/useInput.js'
import { init_redot, render_redot } from './core/useSpatialBridge.js'
import { useUIManager } from './core/useUIManager.js'
import { watchChanges } from './core/watchChanges.js'
import './game.css'
import { updateAlpacaRoad, getReady } from './mini_games/alpacaRoad.js'
import { changeGame } from './mini_games/init.js'
import { initUser } from './user/initUser.js'
import { getHearts } from './utils/uiHelpers.js'
import { initWorld } from './world/initWorld.js'

const gameContainer = ref(null)
const gameIsReady= shallowRef(false)
const clock = new THREE.Clock()

const { changeColor, changeName, changeSpeed, updateVue } = alpacaStats()
const { initInput, cleanupInput, updateInputState, resetInput} = useInput()
const { setTimeOfDay, updateLighting, toggleLightCycle} = editLight()
const { buyAlpaca } = alpacaShop()
const { openEditMode, closeEditMode, openShopMenu, closeShopMenu, openFarmMenu, openAlpacaShop, closeAlpacaShop, closeAlpacaStats, openItemShop, closeItemShop, openLightMenu, closeLightMenu, openGameMenu, closeGameMenu, openLobbyMenu, closeLobbyMenu } = useUIManager()
const { init, cleanup, onResize, setDoF } = useGameEngine(gameContainer)
const { increaseFarmSize } = upgradeFarm()
const { buyItem } = itemShop()
const authStore = useAuthStore()
const { isAuthenticated } = storeToRefs(authStore)
const { cancelPlacement, sellItem} =  useEditMode()
const showLoginWarning = ref(false);
const warningOff = () => {showLoginWarning.value = false;};
const { updateSpits } = alpacaHandling();
const { floatingTexts} = useFloatingText();

let animationFrameId
let cameraUpdate = null;
let stopMyWatcher
let stats;
let playerCount = 1
let effect

onMounted(async () => {
  document.body.classList.add('lock-screen');
  if (!authStore.isAuthenticated)
    showLoginWarning.value = true
  else
    showLoginWarning.value = false
  gEngine.value = init()
  if (CONST.AR_ENABLED)
    init_redot();
  if (CONST.SBS_ENABLED)
  {
    effect = new StereoEffect(gEngine.value.renderer);
    effect.setSize(window.innerWidth, window.innerHeight);
  }

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

    await initWorld(gScene.value, authStore.isAuthenticated)
    gameIsReady.value = true
    stopMyWatcher = watchChanges(setDoF)
    gameLoop()
  }
  window.addEventListener('resize', onResize)
})

const gameLoop = () => {
  if (stats) stats.begin();
  resetInput()
  animationFrameId = requestAnimationFrame(gameLoop)
  
  const delta = clock.getDelta()
  const player = gPlayer.value


  if (player) {
    if (cameraUpdate) {
      cameraUpdate(player)
    }
  }

  updateInputState()
  updateAlpacas(delta);
  updateCollectables(player, delta);
  updateCoins(delta);
  updateSpits(delta)
  updateLighting(delta);

  if (gMinigame.value.isActive && gMinigame.value.mode > 2)
    updateAlpacaRoad(delta)

  if (gEngine.value?.controls) {
    gEngine.value.controls.enabled = checkControlsEnabled();
    if (gEngine.value.controls.enabled) {
      gEngine.value.controls.update()
    }
  }
  if (CONST.SBS_ENABLED)
    effect.render(gEngine.value.scene, gEngine.value.camera);
  else if (gEngine.value.composer) {
    gEngine.value.composer.render();
  }

  if (stats) stats.end();
  if (gUI.cameraMode === 3) // render red dot for first person mode
    render_redot()
}

onUnmounted(() => {
  document.body.classList.remove('lock-screen');
  saveGame()
  if (stopMyWatcher) stopMyWatcher()
  cancelAnimationFrame(animationFrameId)
  window.removeEventListener('resize', onResize)
  cleanupFPSstats(stats, gameContainer.value);
  cleanupInput();
  cleanup()
})
</script>

<!---------------------- STYLE ------------------------->
<style src="./game.css"></style>
