import * as THREE from 'three';
import { CONST } from '../config/constants.js';
import { gEngine, gUI } from './globals.js';

const offset = new THREE.Vector3();
const lookAt = new THREE.Vector3();
const currentPosition = new THREE.Vector3();
const savedOrbitOffset = new THREE.Vector3(0, 10, 15);
let isTransitioningToOrbit = false;

export function useCamera(camera, controls) {

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
    offset.set(CONST.CAMERA_OFFSET.x, CONST.CAMERA_OFFSET.y, CONST.CAMERA_OFFSET.z)
    currentPosition.copy(player.position).add(offset)

    const t = 1.0 - Math.pow(CONST.CAMERA_LERP, CONST.CAMERA_LERP)
    controls.target.lerp(currentPosition, t)

    if (isTransitioningToOrbit) {
      controls.enabled = false;
      lookAt.copy(controls.target).add(savedOrbitOffset);
      camera.position.lerp(lookAt, t);
      if (camera.position.distanceTo(lookAt) < 0.5) {
        isTransitioningToOrbit = false;
        controls.enabled = true;
      }
    } else {
      controls.enabled = true;
      savedOrbitOffset.copy(camera.position).sub(controls.target);
    }

    controls.update()
  }

  const handleThirdPerson = (player) => {
    controls.enabled = true;

    offset.set(
      CONST.CAMERA_OFFSET.x - 5,
      CONST.CAMERA_OFFSET.y,
      CONST.CAMERA_OFFSET.z - 20
    )
    offset.applyQuaternion(player.quaternion)
    offset.add(player.position)

    lookAt.set(0, 5, 10)
    lookAt.applyQuaternion(player.quaternion)
    lookAt.add(player.position)

    const t = 1.0 - Math.pow(CONST.CAMERA_LERP, CONST.CAMERA_LERP)
    currentPosition.lerpVectors(camera.position, offset, t)
    lookAt.lerpVectors(controls.target, lookAt, t)

    camera.position.copy(currentPosition)
    controls.target.copy(lookAt)
    controls.update()
  }

  return { updateCamera }
}

export function changeCamera() {
  const engine = gEngine.value;
  if (!engine || !engine.camera || !engine.controls) return;

  if (gUI.cameraMode === 0) {
    gUI.cameraMode = 1;
    isTransitioningToOrbit = false;
  } else {
    gUI.cameraMode = 0;
    isTransitioningToOrbit = true;
  }
}