import { onMounted, onUnmounted } from 'vue'
import { CONST } from '../config/constants.js'
import { loadGLTF } from './modelLoader.js'
import { gEngine, gScene, gPlayer, gAlpacas } from './globals.js'
import * as THREE from 'three'
import { spawnItems } from '../components/spawnItems.js'

const { spawnAlpaca } = spawnItems()

export function usePlayerControls() {
  const keys = {
    w: false, a: false, s: false, d: false,
  }

  let mesh
  let isMoving = false
  let currentAction

  const checkMovement = () => {
    isMoving = keys.w || keys.a || keys.s || keys.d
  }

  //Spawn new alpaca
  const onSpacePress = async () => {
    spawnAlpaca()
  }

  //Switching Alpacas
  let currentIndex = 0
  const onKeyFPress = () => {
    if (currentIndex + 1 < gAlpacas.value.length)
      ++currentIndex
    else
      currentIndex = 0
    gPlayer.value = gAlpacas.value[currentIndex]
  }

  const onKeyDown = (e) => {
    switch (e.code) {
      case 'KeyW': keys.w = true; break
      case 'KeyA': keys.a = true; break
      case 'KeyS': keys.s = true; break
      case 'KeyD': keys.d = true; break

      case 'Space':
        onSpacePress()
        break
      case 'KeyF':
        onKeyFPress()
        break
    }
    checkMovement()
  }

  const onKeyUp = (e) => {
    switch (e.code) {
      case 'KeyW': keys.w = false; break
      case 'KeyA': keys.a = false; break
      case 'KeyS': keys.s = false; break
      case 'KeyD': keys.d = false; break
    }
    checkMovement()
  }

  const raycasting = (e) => {
    // get mouse position
    const rect = gEngine.value.renderer.domElement.getBoundingClientRect()
    const pointer = new THREE.Vector2()
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

    // send ray
    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera(pointer, gEngine.value.camera)
    return raycaster
  }

  const onDoubleClick = (e) => {
    const raycaster = raycasting(e)
    const intersects = raycaster.intersectObjects(gScene.value.children, true)
    if (intersects.length > 0) {
      let obj = intersects[0].object
      switchAlpaca(obj)
      //do other things also
    }
  }

  const switchAlpaca = (obj) => {

    while (obj) {
      for (let i = 0; i < gAlpacas.value.length; ++i) {
        if (obj.id === gAlpacas.value[i].model.id) {
          gPlayer.value = gAlpacas.value[i]
          return
        }
      }
      obj = obj.parent
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    gEngine.value.renderer.domElement.addEventListener('dblclick', onDoubleClick)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('keyup', onKeyUp)
    gEngine.value.renderer.domElement.removeEventListener('dblclick', onDoubleClick)
  })


  const updatePlayer = (player, mixer, animations, camera) => {
    if (!player) return

    const speed = CONST.PLAYER_SPEED
    const rotation = CONST.PLAYER_ROTATION
    let dir = 0, dx = 0, dz = 0

    mesh = player.mesh

    if (keys.w) dir = 1
    if (keys.s) dir = -1
    if (keys.a) player.rotation.y += rotation;
    if (keys.d) player.rotation.y -= rotation;
    if (dir !== 0) {
      dx = Math.sin(player.rotation.y) * speed * dir
      dz = Math.cos(player.rotation.y) * speed * dir

      let nextX = player.position.x + dx
      let nextZ = player.position.z + dz

      const distance = Math.sqrt(nextX * nextX + nextZ * nextZ)
      if (distance < CONST.MAX_MOVE_RADIUS) {
        player.position.x += dx
        player.position.z += dz
      }
    }

    const idleAction = mixer.clipAction(animations[1])
    const walkAction = mixer.clipAction(animations[5])
    let newAction

    if (!currentAction) {
      currentAction = idleAction
      currentAction.play()
    }

    if (isMoving) {
      newAction = walkAction
      walkAction.timeScale = speed * CONST.CALIBRATION
    }
    else {
      newAction = idleAction
    }

    if (currentAction !== newAction) {
      currentAction.fadeOut(0.2)
      newAction.reset().fadeIn(0.2).play()
      currentAction = newAction
    }
  }

  return { updatePlayer }
}