import * as THREE from 'three';
import { CONST } from '../config/constants.js';
import { checkWithinBounds, usePhysics } from '../core/usePhysics.js';
import { getRandomPos, getRandomTimer } from '../utils/randomValues.js';
import { getAlpacaSpeed } from './alpacaStats.js';

const dummy = new THREE.Object3D();

export function alpacaAI() {
  const { checkCollision } = usePhysics();

  const handleIdle = (alpaca, delta) => {
    const ai = alpaca.ai;

    ai.timer -= delta;
    if (ai.timer <= 0) {
      ai.target.copy(getRandomPos());
      ai.state = 'moving';
    }
  };

  const handleMoving = (alpaca, delta) => {
    const ai = alpaca.ai;
    const model = alpaca.model;

    const distance = model.position.distanceTo(ai.target);

    if (distance < 0.5) {
      ai.state = 'idle';
      ai.timer = getRandomTimer();
    } else {
      const direction = new THREE.Vector3().subVectors(ai.target, model.position).normalize();

      dummy.position.copy(model.position);
      dummy.lookAt(ai.target);
      model.quaternion.slerp(dummy.quaternion, 5 * delta);

      const speed = getAlpacaSpeed();

      const nextX = model.position.x + (direction.x * speed);
      const nextZ = model.position.z + (direction.z * speed);

      const isWithinBounds = checkWithinBounds(nextX, nextZ);
      const isColliding = checkCollision(model, nextX, nextZ);

      if (!isWithinBounds || isColliding) {
        ai.state = 'idle';
        ai.timer = 1;
      } else {
        model.position.x = nextX;
        model.position.z = nextZ;
      }
    }
  };

  const updateAI = (alpaca, delta) => {
    switch (alpaca.ai.state) {
      case 'idle':
        handleIdle(alpaca, delta);
        break;
      case 'moving':
        handleMoving(alpaca, delta);
        break;
      default:
        console.warn(`Unknown AI state: ${alpaca.ai.state}`);
        alpaca.ai.state = 'idle';
        break;
    }
    alpaca.isMoving = (alpaca.ai.state === 'moving');
  };

  return { updateAI };
}