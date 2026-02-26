import * as THREE from 'three'
import { CONST } from '../config/constants.js'
import { gScene } from './globals.js'
import { useInput } from './useInput.js'

export function useCamera(camera, controls) {

  const { keys } = useInput()

  const updateCamera = (player) => {
    if (!controls || !player) return

    const offset = new THREE.Vector3(
      CONST.CAMERA_OFFSET.x,
      CONST.CAMERA_OFFSET.y,
      CONST.CAMERA_OFFSET.z
    )
    const lookAt = new THREE.Vector3()
    const currentPosition = new THREE.Vector3()
    const mode = gScene.value.cameraMode 

    if (mode === 0){
      // normal original orbit
    controls.enabled = true
    currentPosition.copy(player.position).add(offset)
    controls.target.lerp(currentPosition, CONST.CAMERA_LERP)
    controls.update()
    }
    else if (mode === 1)
    {
      // First person
      controls.enabled = false
      // Position slightly forward and up from center
      offset.set(0, 5, 3) 
      offset.applyQuaternion(player.quaternion).add(player.position)
      
      lookAt.set(0, 5, 5)
      lookAt.applyQuaternion(player.quaternion).add(player.position)
  
      camera.position.copy(offset)
      camera.lookAt(lookAt)
    }
    else
    {
      controls.enabled = true
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
      if (!keys.pointer)
        camera.position.copy(currentPosition)
      controls.target.copy(lookAt)
    
      controls.update()
    }

  }
  return { updateCamera }
}