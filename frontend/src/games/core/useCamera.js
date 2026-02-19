import * as THREE from 'three'
import { CONST } from '../config/constants.js'

export function useCamera(camera, controls) {
  const offset = new THREE.Vector3(
    CONST.CAMERA_OFFSET.x,
    CONST.CAMERA_OFFSET.y,
    CONST.CAMERA_OFFSET.z
  )
  const updateCamera = (player) => {
    if (!controls || !player) return

    const newPosition = new THREE.Vector3()
    newPosition.copy(player.position).add(offset)

    controls.target.lerp(newPosition, CONST.CAMERA_LERP)
    controls.update()
  }
  return { updateCamera }
}