import * as THREE from 'three'
import { reactive, onMounted, onUnmounted } from 'vue'
import { gEngine, gScene, gUser } from './globals.js'
import { alpacaHandling } from '../components/alpacaHandling.js'
import { saveGame } from './saveLoadGame.js'
import { useShop } from '../components/shop.js'
import { printDebug } from './debug.js'
import { useEditMode } from '../components/editMode.js'

export function useInput() {
  const { switchAlpaca, moveAlpaca } = alpacaHandling()

  const { alpacaMenuOff, itemShopOff } = useShop()
  const { editModeOff, selectItem, removeHighlight, highlightItem, moveItem, placeItem, rotateItem } = useEditMode()

  const keys = reactive({
    w: false, a: false, s: false, d: false, space: false
  })

  const onKeyDown = (e) => {
    switch (e.code) {
      case 'KeyW': keys.w = true; break
      case 'KeyA': keys.a = true; break
      case 'KeyS': keys.s = true; break
      case 'KeyD': keys.d = true; break
      case 'Space': keys.space = true; break
      case 'KeyF': saveGame(); break
      case 'KeyP': printDebug(); break
      case 'Escape': handleEscapeKey(); break
    }
  }

  const onKeyUp = (e) => {
    switch (e.code) {
      case 'KeyW': keys.w = false; break
      case 'KeyA': keys.a = false; break
      case 'KeyS': keys.s = false; break
      case 'KeyD': keys.d = false; break
      case 'Space': keys.space = false; break
    }
  }

  const onWheel = (e) => {
    if (gScene.value.edit && gScene.value.selected) {
      rotateItem(e)
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
    if (intersects.length > 0 && !switchAlpaca(intersects[0].object, raycaster)) {
      moveAlpaca(raycaster) // move alpaca if it didnt hit another one
    }
  }

  const handleMouseMove = (e) => {
    // item selected to move
    if (gScene.value.edit) {
      if (gUser.value && gScene.value.selected) {
        moveItem(e)
      }
      else {
        highlightItem(e)
      }
    }
  }

  const onPointerDown = (e) => {
    // Select item in edit mode
    if (gScene.value.edit) {
      if (gScene.value.selected) {
        placeItem()
      } else {
        selectItem(e)
      }
    }
  }

  const onPointerUp = () => {
    //
  }

  //Close all UI Menus
  const handleEscapeKey = () => {
    gScene.value.pause = false
    gScene.value.lightMenu = false
    if (gScene.value.alpacaMenu) alpacaMenuOff()
    if (gScene.value.itemMenu) itemShopOff()
    if (gScene.value.edit) {
      removeHighlight()
      editModeOff()
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('wheel', onWheel)
    gEngine.value.renderer.domElement.addEventListener('dblclick', onDoubleClick)
    gEngine.value.renderer.domElement.addEventListener('pointerdown', onPointerDown)
    gEngine.value.renderer.domElement.addEventListener('pointerup', onPointerUp)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('keyup', onKeyUp)
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('wheel', onWheel);
    gEngine.value.renderer.domElement.removeEventListener('dblclick', onDoubleClick)
    gEngine.value.renderer.domElement.removeEventListener('pointerdown', onPointerDown)
    gEngine.value.renderer.domElement.removeEventListener('pointerup', onPointerUp)
  })

  return { keys }
}
