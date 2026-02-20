<!---------------------- HTML --------------------------->

<template>
  <div ref="gameContainer" class="scene-container"></div>
  <div v-if="!gameContainer" class="modal-overlay">Loading...</div>
  <!-- Components -->
  <div v-if="gameContainer">
    <!-- Game HUD -->
    <div class="hud-left">
      <div class="stat"><span>💰 {{ gUser.coins }}</span></div>
    </div>
    <!-- Side Buttons -->
    <div class="hud-right">
      <button class="hud-btn" @click="addDebugCoins" title="DEBUG: +1 Coin" style="background: #ffd700; color: #000;">🤑</button>
      <button class="hud-btn" @click="openShopMenu" title="Shop">💰</button>
    </div>
    <!-- Shop UI -->
    <div v-if="gUser.pause" class="modal-overlay" @click.self="gUser.pause = false">
      <button class="shop-btn" @click="buyAlpaca" title="Buy Alpaca">💰 Buy Alpaca</button>
    </div>
  </div>
</template>

<!---------------------- SCRIPT ------------------------->
<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import * as THREE from 'three'
import { useGameEngine } from './core/useGameEngine.js'
import { usePlayerControls } from './core/usePlayerControls.js'
import { initWorld } from './world/initWorld.js'
import { useCamera } from './core/useCamera.js'
import { gEngine, gScene, gPlayer, gUser } from './core/globals.js'
import { useShop } from './components/shop.js'
import './game.css'

const gameContainer = ref(null)
const clock = new THREE.Clock()

let player = null
let mixer = null
let animations = null

let animationFrameId
let cameraUpdate = null

const { init, cleanup, onResize } = useGameEngine(gameContainer)
const { openShopMenu, buyAlpaca, addDebugCoins } = useShop()

onMounted(async () => {
  gEngine.value = init()

  if (!gEngine.value) {
    console.error("Init failed: Scene not returned from globalEngine.")
  }
  else
  {
    const { updateCamera } = useCamera(gEngine.value.camera, gEngine.value.controls)
    cameraUpdate = updateCamera

    await initWorld(gScene.value)
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
    if (cameraUpdate)
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
