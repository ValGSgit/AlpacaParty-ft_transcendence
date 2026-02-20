import { reactive, onMounted, onUnmounted } from 'vue'
import * as THREE from 'three'
import { gEngine, gScene, gPlayer, gAlpacas } from './globals.js'
import { alpacaHandling } from '../components/alpacaHandling.js'

export function useInput() {
  const { switchAlpaca } = alpacaHandling()

  const keys = reactive({
    w: false, a: false, s: false, d: false, space: false
  })

  const onKeyDown = (e) => {
    switch (e.code) {
      case 'KeyW': keys.w = true; break
      case 'KeyA': keys.a = true; break
      case 'KeyS': keys.s = true; break
      case 'KeyD': keys.d = true; break
    }
  }

  const onKeyUp = (e) => {
    switch (e.code) {
      case 'KeyW': keys.w = false; break
      case 'KeyA': keys.a = false; break
      case 'KeyS': keys.s = false; break
      case 'KeyD': keys.d = false; break
    }
  }

  const onDoubleClick = (e) => {
    const rect = gEngine.value.renderer.domElement.getBoundingClientRect()
    const pointer = new THREE.Vector2()
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera(pointer, gEngine.value.camera)

    const intersects = raycaster.intersectObjects(gScene.value.children, true)
    if (intersects.length > 0) {
      switchAlpaca(intersects[0].object)
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

  return { keys }
}