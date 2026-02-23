import { reactive, onMounted, onUnmounted } from 'vue'
import * as THREE from 'three'
import { gEngine, gScene, gUser, gPlayer, gItems } from './globals.js'
import { alpacaHandling } from '../components/alpacaHandling.js'
import { CONST } from '../config/constants.js'
import { usePhysics } from './usePhysics.js'

export function useInput() {
  const { switchAlpaca, moveAlpaca } = alpacaHandling()
  const { checkCollision } = usePhysics()

  const keys = reactive({
    w: false, a: false, s: false, d: false, space: false
  })

  const print_debug_flags = () => {
    //console.log("", )
    console.log("gScene.value.selected", gScene.value.selected)
    console.log("gScene.value.selectedGhost", gScene.value.selectedGhost)
    console.log("gScene.value.pause", gScene.value.pause)
    console.log("gScene.value.edit", gScene.value.edit)
    console.log("gScene.value.itemMenu", gScene.value.itemMenu)
    console.log("gScene.value.alpacaMenu", gScene.value.alpacaMenu)
  }

  const onKeyDown = (e) => {
    switch (e.code) {
      case 'KeyW': keys.w = true; break
      case 'KeyA': keys.a = true; break
      case 'KeyS': keys.s = true; break
      case 'KeyD': keys.d = true; break
      case 'KeyP': print_debug_flags(); break
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
    if (intersects.length > 0 && !switchAlpaca(intersects[0].object, raycaster)) {
        moveAlpaca(raycaster) // move alpaca if it didnt hit another one
    }
  }

  const selectItem = (obj) => {
    while (obj) {
      for (let i = 0; i < gItems.value.length; ++i) {
        if (obj.id === gItems.value[i].id) {
          gEngine.value.controls.enabled = false
          gScene.value.selected = gItems.value[i]
          // clone model and make it red for area that is not possible to place
          const ghost = cloneGhost(gScene.value.selected)
          // add invisible ghost
          ghost.visible = false;
          gScene.value.add(ghost)
          return
        }
      }
      obj = obj.parent
    }
  }

  const handleMouseMove = (e) => {
    // item selected to move
    if (gUser.value && gScene.value.selected) {
      const rect = gEngine.value.renderer.domElement.getBoundingClientRect()
      const pointer = new THREE.Vector2()
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

      const raycaster = new THREE.Raycaster()
      raycaster.setFromCamera(pointer, gEngine.value.camera)

      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const worldPoint = new THREE.Vector3();
      const ghost = gScene.value.selectedGhost
      // move around
      if (raycaster.ray.intersectPlane(plane, worldPoint)) {
        const distance = Math.sqrt(worldPoint.x * worldPoint.x + worldPoint.z * worldPoint.z)
        const withinBounds = distance < CONST.MAX_MOVE_RADIUS
        if (withinBounds && !checkCollision(gScene.value.selected, worldPoint.x, worldPoint.z)) {
          gScene.value.selected.visible = true
          ghost.visible = false;
        }
        else
        {
          gScene.value.selected.visible = false
          ghost.visible = true;
          ghost.position.x = worldPoint.x
          ghost.position.z = worldPoint.z
        }
      }
    }
  }

  const onPointerDown = (e) => {
    // Select item in edit mode
    if (gScene.value.edit) {
      const rect = gEngine.value.renderer.domElement.getBoundingClientRect()
      const pointer = new THREE.Vector2()
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

      const raycaster = new THREE.Raycaster()
      raycaster.setFromCamera(pointer, gEngine.value.camera)

      const intersects = raycaster.intersectObjects(gScene.value.children, true)
      if (intersects.length > 0) {
        selectItem(intersects[0].object)
      }
    }
  }

  const onPointerUp = (e) => {
    if (gScene.value.selected) {
      if (gScene.value.selectedGhost)
        gScene.value.remove(gScene.value.selectedGhost)
      gScene.value.selected.visible = true
      gScene.value.selectedGhost = null
      gScene.value.selected = null
      gEngine.value.controls.enabled = true
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('mousemove', handleMouseMove);
    gEngine.value.renderer.domElement.addEventListener('dblclick', onDoubleClick)
    gEngine.value.renderer.domElement.addEventListener('pointerdown', onPointerDown)
    gEngine.value.renderer.domElement.addEventListener('pointerup', onPointerUp)

  })

  onUnmounted(() => {
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('keyup', onKeyUp)
    window.removeEventListener('mousemove', handleMouseMove);
    gEngine.value.renderer.domElement.removeEventListener('dblclick', onDoubleClick)
    gEngine.value.renderer.domElement.removeEventListener('pointerdown', onPointerDown)
    gEngine.value.renderer.domElement.removeEventListener('pointerup', onPointerUp)
  })

  return { keys }
}

export function cloneGhost(selected) {
    const ghost = selected.clone()
    // need to use gPlayer instead of gUser as it can't be in ref but shallowRef
    gScene.value.selectedGhost = ghost
    ghost.traverse((child) => {
    if (child.isMesh) {
      // clone the material so we don't turn the ORIGINAL model red too
      child.material = child.material.clone(); 
      child.material.color.set(0xff0000);
      // make it see-through for a "ghost" effect
      child.material.transparent = true;
      child.material.opacity = 0.5;
      }
    })
    return ghost
  }