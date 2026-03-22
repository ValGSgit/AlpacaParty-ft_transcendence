import * as THREE from 'three'
import { CONST } from '../config/constants.js'

export function handleAnimation(player, animDir, speed) {
  const { mixer, animations } = player

  const idleAction = mixer.clipAction(animations[1])
  const walkAction = mixer.clipAction(animations[5])
  const jumpAction = mixer.clipAction(animations[2])
  const deadAction = mixer.clipAction(animations[0])

  let newAction = idleAction;

  if (!player.currentAction) {
    player.currentAction = idleAction
  }

  if (player.isDead === -1 || player.isDead === 1) {
    newAction = deadAction
    newAction.setLoop(THREE.LoopOnce)
    if (player.isDead === -1)
      player.isDead = 0 // not dead yet
    if (player.isDead)
      newAction.clampWhenFinished = true
  }
  else if (animDir !== 0) { // moving
    if (player.isJumping)
      newAction = jumpAction
    else
      newAction = walkAction
    walkAction.timeScale = (speed * CONST.CALIBRATION) * animDir
  } else {
    newAction = idleAction
  }

  if (player.currentAction !== newAction) {
    player.currentAction.fadeOut(0.4)
    newAction.reset()
    if (newAction === jumpAction) {
      newAction.time = 0.15;
    }
    newAction.fadeIn(0.4).play()
    player.currentAction = newAction
  }
}