import { CONST } from '../config/constants.js'
import { useInput } from './useInput.js'
import { usePhysics } from './usePhysics.js'

export function usePlayerControls() {
  const { keys } = useInput()
  const { checkCollision } = usePhysics()

  let currentAction = null

  const handleMovement = (player) => {
    let speed = CONST.PLAYER_FORWARD_SPEED
    const rotation = CONST.PLAYER_ROTATION
    let dir = 0, dx = 0, dz = 0
    let isMoving = false

    if (keys.w) { dir = 1; isMoving = true }
    if (keys.s) { dir = -1; speed = CONST.PLAYER_BACKWARD_SPEED; isMoving = true }
    if (keys.a) { player.rotation.y += rotation; isMoving = true }
    if (keys.d) { player.rotation.y -= rotation; isMoving = true }

    if (dir !== 0) {
      dx = Math.sin(player.rotation.y) * speed * dir
      dz = Math.cos(player.rotation.y) * speed * dir

      let nextX = player.position.x + dx
      let nextZ = player.position.z + dz

      const distance = Math.sqrt(nextX * nextX + nextZ * nextZ)
      const withinBounds = distance < CONST.MAX_MOVE_RADIUS
      const hitSomething = checkCollision(player, nextX, nextZ)

      if (withinBounds && !hitSomething) {
        player.position.x += dx
        player.position.z += dz
      }
    }
    return { isMoving, speed }
  }

  const handleAnimation = (mixer, animations, isMoving, speed) => {
    const idleAction = mixer.clipAction(animations[1])
    const walkAction = mixer.clipAction(animations[5])

    let newAction

    if (!currentAction) {
      currentAction = idleAction
      currentAction.play()
    }

    if (isMoving) {
      const animDir = keys.w ? 1 : -1
      newAction = walkAction
      walkAction.timeScale = (speed * CONST.CALIBRATION) * animDir
    } else {
      newAction = idleAction
    }

    if (currentAction !== newAction) {
      currentAction.fadeOut(0.4)
      newAction.reset().fadeIn(0.4).play()
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
