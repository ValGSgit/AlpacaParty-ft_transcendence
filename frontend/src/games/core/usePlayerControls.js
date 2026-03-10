import { CONST } from '../config/constants.js'
import { useInput } from './useInput.js'
import { usePhysics } from './usePhysics.js'
import { gPlayer } from './globals.js'
import { handleAnimation } from './useAnimation.js'

export function usePlayerControls() {
  const { keys } = useInput()
  const { checkCollision, checkWithinBounds } = usePhysics()

  const handleMovement = (player) => {
    let speed = CONST.PLAYER_FORWARD_SPEED + gPlayer.value.speedOffset
    const rotation = CONST.PLAYER_ROTATION + gPlayer.value.rotationOffset
    let dir = 0, dx = 0, dz = 0
    let isMoving = false // needed to be locally, not in gPlayer; the one in gPlayer is for doubleClick moving
    let nextRotY = player.rotation.y

    if (keys.w && !gPlayer.value.model.isMoving) { dir = 1; isMoving = true } // !gPlayer.value.model.isMoving => disable the wasd when doubleClick moving
    if (keys.s && !gPlayer.value.model.isMoving) { dir = -1; speed = CONST.PLAYER_BACKWARD_SPEED; isMoving = true }
    if (keys.a && !gPlayer.value.model.isMoving) { nextRotY += rotation; isMoving = true }
    if (keys.d && !gPlayer.value.model.isMoving) { nextRotY -= rotation; isMoving = true }
    if (keys.space && player.position.y <= CONST.JUMPING_MAX_HEIGHT && !player.isFalling) { player.position.y += CONST.JUMPING_SPEED; isMoving = true; player.isJumping = true }
    if (player.position.y > 0 && (!keys.space || player.isFalling)) { player.position.y -= CONST.JUMPING_SPEED; player.isJumping = true }
    if (player.position.y < 0) player.position.y = 0 // reset y if it goes below the ground
    if (player.position.y === 0) { player.isJumping = false; if (!keys.space) player.isFalling = false }
    if (player.position.y >= CONST.JUMPING_MAX_HEIGHT) player.isFalling = true

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

  const updatePlayer = (player, mixer, animations) => {
    if (!player) return
    let { isMoving, speed } = handleMovement(player)
    let animDir = 0 // not moving
    if (isMoving) // wasd
      animDir = keys.w ? 1 : -1
    else if (player.isMoving) // doubleClickMoving
      animDir = 1
    handleAnimation(player, mixer, animations, animDir, speed)
  }

  return { updatePlayer }
}
