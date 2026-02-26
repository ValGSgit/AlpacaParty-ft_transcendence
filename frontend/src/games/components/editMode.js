import * as THREE from 'three'
import { gEngine, gScene, gSelectable } from '../core/globals.js'
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js'
import { MATERIALS as MATS } from '../config/materials.js'
import { CONST } from '../config/constants.js'
import { usePhysics } from '../core/usePhysics.js'
import { saveGame } from '../core/saveLoadGame.js'

const pointer = new THREE.Vector2()
const raycaster = new THREE.Raycaster()
const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
const worldPoint = new THREE.Vector3()

export function useEditMode() {
  const { checkCollision, checkWithinBounds } = usePhysics()
  let hoveredItem = null

  const editModeOn = () => {
    gScene.value.edit = true
  }

  const editModeOff = () => {
    gScene.value.edit = false
    gScene.value.selected = null
  }

  const updateRaycaster = (e) => {
    const rect = gEngine.value.renderer.domElement.getBoundingClientRect()
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
    raycaster.setFromCamera(pointer, gEngine.value.camera)
  }

  const findItem = (obj) => {
    while (obj) {
      for (let i = 0; i < gSelectable.value.length; ++i) {
        if (obj.id === gSelectable.value[i].id) {
          return gSelectable.value[i]
        }
      }
      obj = obj.parent
    }
  }

  const selectItem = (e) => {
    updateRaycaster(e)
    const intersects = raycaster.intersectObjects(gSelectable.value, true)
    if (intersects.length > 0) {
      gScene.value.selected = findItem(intersects[0].object)
      if (hoveredItem) {
        removeHighlight(hoveredItem)
        hoveredItem = null
      }
      gEngine.value.controls.enabled = false
      const ghost = cloneGhost(gScene.value.selected)
      ghost.visible = false;
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
    item.traverse((child) => {
      if (child.isMesh && child.name !== "Collider" && child.userData.originalMaterial) {
        child.material = child.userData.originalMaterial
      }
    })
  }

  const highlightItem = (e) => {
    updateRaycaster(e)
    const intersects = raycaster.intersectObjects(gSelectable.value, true)
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
    const ghost = gScene.value.selectedGhost

    // move around
    if (raycaster.ray.intersectPlane(floorPlane, worldPoint)) {
      if (checkWithinBounds(worldPoint.x, worldPoint.z) && !checkCollision(gScene.value.selected, worldPoint.x, worldPoint.z)) {
        gScene.value.selected.visible = true
        ghost.visible = false;
      }
      else {
        gScene.value.selected.visible = false
        ghost.visible = true;
        ghost.position.x = worldPoint.x
        ghost.position.z = worldPoint.z
      }
    }
  }

  const placeItem = () => {
    if (gScene.value.selectedGhost)
      gScene.value.remove(gScene.value.selectedGhost)
    gScene.value.selected.visible = true
    gScene.value.selectedGhost = null
    gScene.value.selected = null
    gEngine.value.controls.enabled = true
    saveGame()
  }

  const rotateItem = (e) => {
    const direction = e.deltaY > 0 ? 1 : -1
    const steps = 36
    const rotationAmount = (Math.PI / steps) * direction
    gScene.value.selected.rotation.y += rotationAmount
    if (gScene.value.selectedGhost) {
      gScene.value.selectedGhost.rotation.y += rotationAmount
    }
    moveItem(e)
  }


  return { editModeOn, editModeOff, selectItem, removeHighlight, highlightItem, moveItem, placeItem, rotateItem }
}


export function cloneGhost(selected) {
  const ghost = SkeletonUtils.clone(selected)
  gScene.value.selectedGhost = ghost
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
