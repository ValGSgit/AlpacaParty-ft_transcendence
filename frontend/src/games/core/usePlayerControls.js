import { CONST } from '../config/constants.js'
import { useInput } from './useInput.js'
import { usePhysics } from './usePhysics.js'
import { gPlayer } from './globals.js'

export function usePlayerControls() {
  const { keys } = useInput()
  const { checkCollision, checkWithinBounds } = usePhysics()

  let currentAction = null
  let isJumping = false
  let isFalling = false

  const handleMovement = (player) => {
    let speed = CONST.PLAYER_FORWARD_SPEED + gPlayer.value.speedOffset
    const rotation = CONST.PLAYER_ROTATION + gPlayer.value.rotationOffset
    let dir = 0, dx = 0, dz = 0
    let isMoving = false
    let nextRotY = player.rotation.y

    if (keys.w) { dir = 1; isMoving = true }
    if (keys.s) { dir = -1; speed = CONST.PLAYER_BACKWARD_SPEED; isMoving = true }
    if (keys.a) { nextRotY += rotation; isMoving = true }
    if (keys.d) { nextRotY -= rotation; isMoving = true }
    if (keys.space && player.position.y <= CONST.JUMPING_MAX_HEIGHT && !isFalling) { player.position.y += CONST.JUMPING_SPEED; isMoving = true; isJumping = true }
    if (player.position.y > 0 && (!keys.space || isFalling)) { player.position.y -= CONST.JUMPING_SPEED; isJumping = true }
    if (player.position.y < 0) player.position.y = 0 // reset y if it goes below the ground
    if (player.position.y === 0) { isJumping = false; if (!keys.space) isFalling = false }
    if (player.position.y >= CONST.JUMPING_MAX_HEIGHT) isFalling = true

    if (isMoving) {
      dx = Math.sin(nextRotY) * speed * dir
      dz = Math.cos(nextRotY) * speed * dir

      let nextX = player.position.x + dx
      let nextZ = player.position.z + dz

      if (checkWithinBounds(nextX, nextZ)) {
        checkCollision(player, nextX, nextZ, nextRotY)
      }
    }
    return { isMoving, speed }
  }

  const handleAnimation = (mixer, animations, isMoving, speed) => {
    const idleAction = mixer.clipAction(animations[1])
    const walkAction = mixer.clipAction(animations[5])
    const jumpAction = mixer.clipAction(animations[2])

    let newAction

    if (!currentAction) {
      currentAction = idleAction
      currentAction.play()
    }

    if (isMoving) {
      const animDir = keys.w ? 1 : -1
      if (isJumping)
        newAction = jumpAction
      else
        newAction = walkAction
      walkAction.timeScale = (speed * CONST.CALIBRATION) * animDir
    } else {
      newAction = idleAction
    }

    if (currentAction !== newAction) {
      currentAction.fadeOut(0.4)
      newAction.reset()
      if (newAction === jumpAction) {
        newAction.time = 0.15;
      }
      newAction.fadeIn(0.4).play()
      currentAction = newAction
    }
  }

  const updatePlayer = (player, mixer, animations) => {
    if (!player) return

    const { isMoving, speed } = handleMovement(player)
    handleAnimation(mixer, animations, isMoving, speed)
  }

  return { updatePlayer }
}
