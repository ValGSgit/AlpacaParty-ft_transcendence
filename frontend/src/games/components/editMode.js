import * as THREE from 'three'
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js'
import { markRaw } from 'vue'
import { CONST } from '../config/constants.js'
import { MATERIALS as MATS } from '../config/materials.js'
import { gAlpacas, gEditables, gEditState, gEngine, gScene, gUI } from '../core/globals.js'
import { removeObject } from '../core/removeObjects.js'
import { saveGame } from '../core/saveLoadGame.js'
import { checkWithinBounds, usePhysics, usePos } from '../core/usePhysics.js'
import { spendCoins } from './coins.js'

const pointer = new THREE.Vector2()
const raycaster = new THREE.Raycaster()
const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
const worldPoint = new THREE.Vector3()

export function useEditMode() {
  const { checkCollision, } = usePhysics()
  const { storePos, restorePos } = usePos()
  let hoveredItem = null

  const updateRaycaster = (e) => {
    const rect = gEngine.value.renderer.domElement.getBoundingClientRect()
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
    raycaster.setFromCamera(pointer, gEngine.value.camera)
  }

  const findItem = (obj) => {
    while (obj) {
      for (let i = 0; i < gEditables.length; ++i) {
        if (obj.id === gEditables[i].id) {
          return gEditables[i]
        }
      }
      obj = obj.parent
    }
  }

  const selectItem = (e) => {
    updateRaycaster(e)
    const intersects = raycaster.intersectObjects(gEditables, true)
    if (intersects.length > 0) {
      gEditState.selected = findItem(intersects[0].object)
      if (gEditState.selected) {
        gEngine.value.controls.enabled = false
        gEditState.selected.visible = true
      }
      storePos(gEditState.selected)
      if (hoveredItem) {
        removeHighlight(hoveredItem)
        hoveredItem = null
      }
      const ghost = cloneGhost(gEditState.selected)
      ghost.visible = false
      gScene.value.add(ghost)
    }
  }

  const applyHighlight = (item) => {
    item.traverse((child) => {
      if (child.isMesh && child.name !== "Collider") {
        if (!child.userData.originalMaterial) {
          child.userData.originalMaterial = child.material
        }
        child.material = MATS.highlight
      }
    })
  }

  const removeHighlight = (item) => {
    if (item === undefined) item = hoveredItem
    if (!item) return
    item.traverse((child) => {
      if (child.isMesh && child.name !== "Collider" && child.userData.originalMaterial) {
        child.material = child.userData.originalMaterial
      }
    })
    hoveredItem = null
  }

  const highlightItem = (e) => {
    updateRaycaster(e)
    const intersects = raycaster.intersectObjects(gEditables, true)
    if (intersects.length > 0) {
      const item = findItem(intersects[0].object)
      if (hoveredItem !== item) {
        if (hoveredItem) removeHighlight(hoveredItem)
        hoveredItem = item
        applyHighlight(hoveredItem)
      }
    }
    else {
      if (hoveredItem) {
        removeHighlight(hoveredItem)
        hoveredItem = null
      }
    }
  }

  const moveItem = (e) => {
    updateRaycaster(e)
    const ghost = gEditState.ghost
    const selected = gEditState.selected
    if (!selected) return

    if (raycaster.ray.intersectPlane(floorPlane, worldPoint)) {
      const validMove = checkWithinBounds(worldPoint.x, worldPoint.z) && !checkCollision(selected, worldPoint.x, worldPoint.z)

      if (validMove) {
        selected.visible = true
        if (ghost) ghost.visible = false

        selected.position.x = worldPoint.x
        selected.position.z = worldPoint.z
        selected.updateMatrixWorld(true)
      }
      else {
        selected.visible = false
        if (ghost) {
          ghost.visible = true
          ghost.position.x = worldPoint.x
          ghost.position.z = worldPoint.z
        }
      }
    }
  }

  const rotateItem = (e) => {
    const direction = e.deltaY > 0 ? 1 : -1
    const steps = 18
    const rotationAmount = (Math.PI / steps) * direction
    gEditState.selected.rotation.y += rotationAmount
    if (gEditState.ghost) {
      gEditState.ghost.rotation.y += rotationAmount
    }
    moveItem(e)
  }

  const placeItem = () => {
    let selected = gEditState.selected
    let ghost = gEditState.ghost

    if (ghost)
      gScene.value.remove(ghost)
    selected.visible = true
    if (selected.userData.isNew) {
      spendCoins(selected.userData.cost)
      selected.userData.isNew = false
    }
    resetSelected()
    saveGame()
  }

  const cancelPlacement = () => {
    if (!gEditState.selected) return;

    let selected = gEditState.selected;
    let ghost = gEditState.ghost;

    if (ghost) {
      gScene.value.remove(ghost);
    }

    if (selected.userData.isNew) {
      removeObject(selected);
    } else {
      restorePos(selected)
      selected.visible = true;
    }
    resetSelected()
  }

  const deleteItem = () => {
    if (!gEditState.selected) return;

    const isAlpaca = gAlpacas.some(alpaca => alpaca.model === gEditState.selected)

    if (isAlpaca && gAlpacas.length === 1) {
      alert("Can't delete last alpaca!");
      cancelPlacement();
      return;
    }

    const selected = gEditState.selected
    if (gEditState.ghost) {
      gScene.value.remove(gEditState.ghost);
    }
    resetSelected();
    removeObject(selected);
  }

  return { deleteItem, selectItem, removeHighlight, highlightItem, moveItem, placeItem, rotateItem, cancelPlacement }
}

function resetSelected() {
  gEditState.selected = null;
  gEditState.ghost = null;
  gEngine.value.controls.enabled = true;

}

export function setupPlacement(model) {
  gEditState.selected = model
  gEngine.value.controls.enabled = false
  gUI.editMode = true

  const ghost = cloneGhost(model)
  ghost.visible = false

  model.userData.isNew = true

  gScene.value.add(model)
  gScene.value.add(ghost)
}

export function cloneGhost(selected) {
  const ghost = SkeletonUtils.clone(selected)
  markRaw(ghost);
  gEditState.ghost = ghost
  ghost.traverse((child) => {
    if (child.isMesh) {
      if (child.name !== "Collider")
        child.material = MATS.ghost
      else {
        if (CONST.DEBUG)
          child.material = MATS.collider_hit
      }
    }
  })
  return ghost
}
