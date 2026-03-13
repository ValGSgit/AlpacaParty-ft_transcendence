import * as THREE from 'three';
import { CONST } from '../config/constants.js';
import { checkWithinBounds, usePhysics } from '../core/usePhysics.js';
import { getRandomPos } from '../utils/randomValues.js';

const dummy = new THREE.Object3D();

export function alpacaAI() {
  const { checkCollision } = usePhysics();

  const updateAI = (alpaca, delta) => {
    const brain = alpaca.ai;
    const model = alpaca.model;

    if (brain.state === 'idle') {
      brain.timer -= delta;
      if (brain.timer <= 0) {
        brain.target.copy(getRandomPos());
        brain.state = 'moving';
      }
      alpaca.isMoving = false;
    }
    else if (brain.state === 'moving') {
      const distance = model.position.distanceTo(brain.target);

      if (distance < 0.5) {
        brain.state = 'idle';
        brain.timer = 2 + Math.random() * 5;
      } else {
        const direction = new THREE.Vector3().subVectors(brain.target, model.position).normalize();

        dummy.position.copy(model.position);
        dummy.lookAt(brain.target);
        model.quaternion.slerp(dummy.quaternion, 5 * delta);

        const speed = CONST.PLAYER_FORWARD_SPEED + alpaca.speedOffset;

        const nextX = model.position.x + (direction.x * speed);
        const nextZ = model.position.z + (direction.z * speed);

        const isWithinBounds = checkWithinBounds(nextX, nextZ);
        const isColliding = checkCollision(model, nextX, nextZ);

        if (!isWithinBounds || isColliding) {
          brain.state = 'idle';
          brain.timer = 1;
          alpaca.isMoving = false;
        } else {
          model.position.x = nextX;
          model.position.z = nextZ;
          alpaca.isMoving = true;
        }
      }
    }
  }

  return { updateAI }
}
