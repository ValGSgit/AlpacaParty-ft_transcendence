<!---------------------- HTML --------------------------->

<template>
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
      <button class="hud-btn" @click="editLight" title="Edit Light">🌟</button>
    </div>
    <!-- Shop UI -->
    <div v-if="gUser.pause" class="modal-overlay">
      <div class="shop-title">Mini Shop
        <button class="shop-btn" @click="buyAlpaca" title="Buy Alpaca">💰 Buy Alpaca</button>
        <button class="shop-btn" @click="increaseFarmSize" title="Increase Farm Size">💰 Increase Farm Size</button>
        <button class="close-btn" @click="gUser.pause = false" title="Close">✖️</button>
      </div>
    </div>
    <!-- Edit Mode -->
     <div v-if="gUser.edit" class="edit-mode">
        Click and Drag Item <button class="close-btn" @click="editModeOff" title="Close">✖️</button>
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
import { useShop } from './components/shop.js'
import './game.css'

const gameContainer = ref(null)
const gameIsReady= shallowRef(false)
const clock = new THREE.Clock()

let player = null
let mixer = null
let animations = null

let animationFrameId
let cameraUpdate = null

const { init, cleanup, onResize } = useGameEngine(gameContainer)
const { openShopMenu, buyAlpaca, addDebugCoins, editModeOn, editModeOff, increaseFarmSize, editLight } = useShop()

onMounted(async () => {
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
    if (cameraUpdate && !gUser.value.selected)
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
  cancelAnimationFrame(animationFrameId)
  cleanup()
  window.removeEventListener('resize', onResize)
})
</script>

<!---------------------- STYLE ------------------------->
<style src="./game.css"></style>
