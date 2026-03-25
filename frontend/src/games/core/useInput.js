import * as THREE from 'three'
import { reactive } from 'vue'
import { alpacaHandling } from '../components/alpacaHandling.js'
import { useEditMode } from '../components/editMode.js'
import { printDebug } from './debug.js'
import { gEditState, gEngine, gScene, gPlayer, gUI, gUser } from './globals.js'
import { useUIManager } from './useUIManager.js'

// move it to outside of the function so it can be used in useEngine and other functions
const keys = reactive({
  w: false, a: false, s: false, d: false, space: false, pointer: false
})

export function useInput() {
  const { switchAlpaca } = alpacaHandling()
  const { selectItem, highlightItem, moveItem, placeItem, rotateItem, cancelPlacement } = useEditMode()
  const { closeMenus, openAlpacaShop } = useUIManager()

  const onKeyDown = (e) => {
    switch (e.code) {
      case 'KeyW': keys.w = true; break
      case 'KeyA': keys.a = true; break
      case 'KeyS': keys.s = true; break
      case 'KeyD': keys.d = true; break
      case 'Space': keys.space = true; break
      case 'KeyF': if (gPlayer.value) gPlayer.value.spit(); break
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
    if (gUI.editMode && gEditState.selected) {
      rotateItem(e)
    }
  }

  const onDoubleClick = (e) => {
    // disable double click in mini games
    if (gUser.value.gameMode)
      return
    console.log("double Click!");
    const rect = gEngine.value.renderer.domElement.getBoundingClientRect()
    const pointer = new THREE.Vector2()
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera(pointer, gEngine.value.camera)

    const intersects = raycaster.intersectObjects(gScene.value.children, true)
    if (intersects.length > 0) {
      switchAlpaca(intersects[0].object, raycaster)
    }
  }

  const handleMouseMove = (e) => {
    // item selected to move
    if (!gEngine.value) return;
    if (gUI.editMode || gEditState.selected) {
      if (gEditState.selected) {
        moveItem(e)
      }
      else {
        highlightItem(e)
      }
    }
  }

  const onPointerDown = (e) => {
    keys.pointer = true
    // Select item in edit mode
    if (gUI.editMode || gEditState.selected) {
      if (gEditState.selected) {
        placeItem()
      } else {
        selectItem(e)
      }
    }
  }

  const handleEscapeKey = () => {
    if (gEditState.selected) {
      if (gEditState.selected.userData.isNew)
        closeMenus();
      cancelPlacement();
    } else {
      closeMenus()
    }
  }

  const initInput = () => {
    const canvas = gEngine.value.renderer.domElement;

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('wheel', onWheel, { passive: true })
    canvas.addEventListener('dblclick', onDoubleClick)
    canvas.addEventListener('pointerdown', onPointerDown)
  }

  const cleanupInput = () => {
    const canvas = gEngine.value.renderer.domElement;

    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('keyup', onKeyUp)
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('wheel', onWheel);
    canvas.removeEventListener('dblclick', onDoubleClick)
    canvas.removeEventListener('pointerdown', onPointerDown)
  }

  return { keys, initInput, cleanupInput }
}
