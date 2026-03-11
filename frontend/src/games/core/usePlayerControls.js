import { CONST } from '../config/constants.js'
import { handleAnimation } from './useAnimation.js'
import { useInput } from './useInput.js'
import { checkWithinBounds, usePhysics } from './usePhysics.js'


export function usePlayerControls() {
  const { keys } = useInput()
  const { checkCollision } = usePhysics()

  const updatePlayer = (player) => {
    if (!player || !player.model) return

    const { model, speedOffset, rotationOffset } = player
    let speed = CONST.PLAYER_FORWARD_SPEED + speedOffset
    const rotSpeed = CONST.PLAYER_ROTATION + rotationOffset
    let dir = 0
    let isMoving = false
    let nextRotY = model.rotation.y

    //
    if (keys.w && !model.isMoving) { dir = 1; isMoving = true }
    if (keys.s && !model.isMoving) { dir = -1; speed = CONST.PLAYER_BACKWARD_SPEED; isMoving = true }
    if (keys.a && !model.isMoving) { nextRotY += rotSpeed; isMoving = true }
    if (keys.d && !model.isMoving) { nextRotY -= rotSpeed; isMoving = true }

    //
    if (keys.space && model.position.y <= CONST.JUMPING_MAX_HEIGHT && !player.isFalling) {
      model.position.y += CONST.JUMPING_SPEED; isMoving = true; player.isJumping = true
    }
    if (model.position.y > 0 && (!keys.space || player.isFalling)) {
      model.position.y -= CONST.JUMPING_SPEED; player.isJumping = true
    }
    if (model.position.y <= 0) {
      model.position.y = 0; player.isJumping = false; if (!keys.space) player.isFalling = false
    }
    if (model.position.y >= CONST.JUMPING_MAX_HEIGHT) player.isFalling = true

    //
    if (isMoving) {
      const dx = Math.sin(nextRotY) * speed * dir
      const dz = Math.cos(nextRotY) * speed * dir

      const nextX = model.position.x + dx
      const nextZ = model.position.z + dz

      if (checkWithinBounds(nextX, nextZ)) {
        checkCollision(model, nextX, nextZ, nextRotY)
      }
    }
    handleAnimation(player, getAnimDir(isMoving, model, keys), speed)
  }

  return { updatePlayer }
}

function getAnimDir(isMoving, model, keys) {
  let animDir = 0
  if (isMoving) {
    animDir = keys.s ? -1 : 1
  } else if (model.isMoving) {
    animDir = 1
  }
  return animDir
}