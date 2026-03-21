import { CONST } from '../config/constants.js'
import { useInput } from './useInput.js'
import { checkWithinBounds, usePhysics } from './usePhysics.js'
import { alpacaAI } from '../components/alpacaAI.js';

export function usePlayerControls() {
  const { keys } = useInput()
  const { checkCollision } = usePhysics()

  const handleJumping = (player) => {
    const { model } = player;
    let isVerticalMoving = false;

    // Jump up
    if (keys.space && model.position.y <= CONST.JUMPING_MAX_HEIGHT && !player.isFalling) {
      model.position.y += CONST.JUMPING_SPEED;
      player.isJumping = true;
      isVerticalMoving = true;
    }
    // Fall down
    if (model.position.y > 0 && (!keys.space || player.isFalling)) {
      model.position.y -= CONST.JUMPING_SPEED;
      player.isJumping = true;
    }
    // Hit the ground
    if (model.position.y <= 0) {
      model.position.y = 0;
      player.isJumping = false;
      if (!keys.space) player.isFalling = false;
    }
    // Hit the ceiling/max height of jump
    if (model.position.y >= CONST.JUMPING_MAX_HEIGHT) {
      player.isFalling = true;
    }

    return isVerticalMoving;
  }

  const handleWalking = (player) => {
    const { model } = player;

    const rotSpeed = player.rotationSpeed;
    let speed = player.speed;
    let dir = 0;
    let nextRotY = model.rotation.y;
    let isWalking = false;

    if (keys.w) { dir = 1; isWalking = true; }
    if (keys.s) { dir = -1; speed = CONST.PLAYER_BACKWARD_SPEED; isWalking = true; }
    if (keys.a) { nextRotY += rotSpeed; isWalking = true; }
    if (keys.d) { nextRotY -= rotSpeed; isWalking = true; }

    return { dir, speed, nextRotY, isWalking };
  }

  const checkMovement = (model, dir, speed, nextRotY) => {
    const dx = Math.sin(nextRotY) * speed * dir;
    const dz = Math.cos(nextRotY) * speed * dir;

    const nextX = model.position.x + dx;
    const nextZ = model.position.z + dz;

    if (checkWithinBounds(nextX, nextZ)) {
      checkCollision(model, nextX, nextZ, nextRotY);
    }
  }

  const updatePlayer = (player, delta) => {
    if (!player || !player.model || player.isDead) return;

    const { model } = player;
    const isJumping = handleJumping(player);
    const { dir, speed, nextRotY, isWalking } = handleWalking(player);
    const { handleMoving } = alpacaAI(); // for double click moving

    if (isWalking) {
      checkMovement(model, dir, speed, nextRotY);
    }
    else if (player.isAutoMoving)
      handleMoving(player, delta)
    player.isMoving = isWalking || isJumping || player.isAutoMoving;
    player.animDir = keys.s ? -1 : (player.isMoving ? 1 : 0);
  }

  return { updatePlayer }
}
