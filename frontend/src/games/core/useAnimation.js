import { CONST } from '../config/constants.js'
import * as THREE from 'three'

export function handleAnimation(player, mixer, animations, animDir, speed){
    const idleAction = mixer.clipAction(animations[1])
    const walkAction = mixer.clipAction(animations[5])
    const jumpAction = mixer.clipAction(animations[2])
    const deadAction = mixer.clipAction(animations[0])

    let newAction

    if (!player.currentAction) {
      player.currentAction = idleAction
      player.currentAction.play()
    }

    if (player.isDead === -1 || player.isDead === 1)
    {
        newAction = deadAction
        newAction.setLoop(THREE.LoopOnce)
        player.isDead = 0 // not die yet
        //player.isDead = 1 // dead
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