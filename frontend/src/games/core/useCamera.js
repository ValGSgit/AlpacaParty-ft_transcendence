import * as THREE from 'three'
import { CONST } from '../config/constants.js'
import { gScene } from './globals.js'

export function useCamera(camera, controls) {

  const offset = new THREE.Vector3(
    CONST.CAMERA_OFFSET.x,
    CONST.CAMERA_OFFSET.y,
    CONST.CAMERA_OFFSET.z
  )
  const lookAt = new THREE.Vector3()
  const currentPosition = new THREE.Vector3()
  

  const updateCamera = (player) => {
    if (!controls || !player) return

    let mode = gScene.value.cameraMode 

    if (!mode || mode === 0){
      // normal original orbit
    controls.enabled = true
    lookAt.copy(player.position).add(offset)
    currentPosition.set(player.position)
    controls.target.lerp(lookAt, CONST.CAMERA_LERP)
    controls.update()  
    }
    else if (mode === 1)
    {
      // First person
      controls.enabled = false
      // Position slightly forward and up from center
      offset.set(0, 4, 2) 
      offset.applyQuaternion(player.quaternion).add(player.position)
      
      lookAt.set(0, 4, 20)
      lookAt.applyQuaternion(player.quaternion).add(player.position)
  
      camera.position.copy(offset)
      camera.lookAt(lookAt)
    }
    else
    {
      // CS type
      if (mode === 2)
        {
        offset.set(
        CONST.CAMERA_OFFSET.x - 5,
        CONST.CAMERA_OFFSET.y,
        CONST.CAMERA_OFFSET.z - 20
        )
        }
        // completely centered
      else if (mode === 3){
        offset.set(
        CONST.CAMERA_OFFSET.x,
        CONST.CAMERA_OFFSET.y,
        CONST.CAMERA_OFFSET.z
      )
      }
      offset.applyQuaternion(player.quaternion)
      offset.add(player.position)
      lookAt.set(0, 5, 10) // Adjustment: look 5 units up and 10 units ahead
      lookAt.applyQuaternion(player.quaternion)
      lookAt.add(player.position)
      const t = 1.0 - Math.pow(CONST.CAMERA_LERP, CONST.CAMERA_LERP)
  
      currentPosition.lerpVectors(camera.position, offset, t)
      lookAt.lerpVectors(controls.target, lookAt, t)
      camera.position.copy(currentPosition)
      controls.target.copy(lookAt)
    
      controls.update()
    }

  }
  return { updateCamera }
}
/* 
export function useCamera(camera, controls) {
  // 1. Create persistent vectors to avoid "Garbage Collection" lag in the loop

  const updateCamera = (player, timeElapsed = 0.016) => {
    if (!controls || !player || !camera) return

    // 2. Calculate the "Ideal" position behind the player
    // We start with the base offset from your constants
    offset.set(
      CONST.CAMERA_OFFSET.x - 5,
      CONST.CAMERA_OFFSET.y,
      CONST.CAMERA_OFFSET.z - 20
    )

    // 3. Rotate the offset by the player's rotation
    offset.applyQuaternion(player.quaternion)
    
    // 4. Add the player's current position to get world coordinates
    offset.add(player.position)

    // 5. Calculate where the camera should look (slightly in front/above the player)
    lookAt.set(0, 5, 10) // Adjustment: look 5 units up and 10 units ahead
    lookAt.applyQuaternion(player.quaternion)
    lookAt.add(player.position)

    // 6. Smooth movement (Lerp)
    // t is the interpolation factor. We use timeElapsed for frame-rate independence.
    const t = 1.0 - Math.pow(CONST.CAMERA_LERP, timeElapsed)

    currentPosition.lerpVectors(camera.position, offset, t)
    currentLookAt.lerpVectors(controls.target, lookAt, t)

    // 7. Apply to Camera and Controls
    camera.position.copy(currentPosition)
    controls.target.copy(currentLookAt)
    
    // OrbitControls.update() is necessary to re-orient the camera after changing the target
    controls.update()
  }

  return { updateCamera }
} */