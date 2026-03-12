
export function changeCamera() {
  if (gScene.value.cameraMode < 3)
    gScene.value.cameraMode++;
  else // reset
  {
    gScene.value.cameraMode = 0
    gEngine.value.camera.position.set(30, 30, 50)
  }
}