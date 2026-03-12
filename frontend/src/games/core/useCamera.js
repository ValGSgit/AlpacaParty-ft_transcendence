import * as THREE from 'three';
import { CONST } from '../config/constants.js';
import { gEngine, gUI } from './globals.js'; // Note: imported gEngine!
import { useInput } from './useInput.js';

const offset = new THREE.Vector3();
const lookAt = new THREE.Vector3();
const currentPosition = new THREE.Vector3();

export function useCamera(camera, controls) {
  const { keys } = useInput()

  const updateCamera = (player) => {
    if (!controls || !player) return
    const playerMesh = player.model ? player.model : player
    const mode = gUI.cameraMode
    switch (mode) {
      case 0:
        handleOrbit(playerMesh)
        break
      case 1:
        handleThirdPerson(playerMesh)
        break
    }
  }

  const handleOrbit = (player) => {
    controls.enabled = true
    currentPosition.copy(gUI.cameraPos)
    controls.target.lerp(currentPosition, CONST.CAMERA_LERP)
  }

  const handleThirdPerson = (player) => {
    controls.enabled = true
    offset.set(CONST.CAMERA_OFFSET.x - 5, CONST.CAMERA_OFFSET.y, CONST.CAMERA_OFFSET.z - 20)
    offset.applyQuaternion(player.quaternion).add(player.position)
    lookAt.set(0, 5, 10)
    lookAt.applyQuaternion(player.quaternion).add(player.position)
    const t = 1.0 - Math.pow(CONST.CAMERA_LERP, CONST.CAMERA_LERP)
    currentPosition.lerpVectors(camera.position, offset, t)
    if (!keys.pointer) {
      camera.position.copy(currentPosition)
    }
    controls.target.lerp(lookAt, t)
  }

  return { updateCamera }
}

export function changeCamera() {
  const engine = gEngine.value;
  if (!engine || !engine.camera || !engine.controls) return;

  if (gUI.cameraMode === 0) {
    gUI.cameraMode = 1;
  } else {
    gUI.cameraMode = 0;
  }
}