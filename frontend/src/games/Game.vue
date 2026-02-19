<!---------------------- HTML --------------------------->

<template>
  <div ref="gameContainer" class="scene-container"></div>
</template>

<!---------------------- SCRIPT ------------------------->
<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import * as THREE from 'three'
import { useGameEngine } from './core/useGameEngine.js'
import { usePlayerControls } from './core/usePlayerControls.js'
import { initWorld } from './world/initWorld.js'
import { useCamera } from './core/useCamera.js'
import { gEngine, gScene, gPlayer } from './core/globals.js'

const gameContainer = ref(null)

const clock = new THREE.Clock()

let player = null
let mixer = null
let animations = null

let animationFrameId
let cameraUpdate = null

const { init, cleanup, onResize } = useGameEngine(gameContainer)

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
<style scoped>
.scene-container {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  display: block;

  /* Background Gradient - alpha has to be turned on in renderer for this to work,
  would render faster, but can't be reflected in reflective materials */
  /* background: linear-gradient(to bottom, #1E90FF 0%, #87CEEB 100%); */
}
</style>
