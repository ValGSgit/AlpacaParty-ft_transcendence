import * as THREE from 'three';
import { gMinigame, gPlayer , gEngine} from '../core/globals.js';
import { checkWithinBounds, usePhysics } from '../core/usePhysics.js';
import { getRandomPos, getRandomTimer } from '../utils/randomValues.js';

const HUNT_RANGE = 35;   // distance at which AI switches to hunting the player
const SPIT_RANGE = 20;   // distance at which AI starts spitting during hunt
const SPIT_COOLDOWN = 1.8; // seconds between aimed spits

const dummy = new THREE.Object3D();

export function alpacaAI() {
  const { checkCollision } = usePhysics();

  const handleIdle = (alpaca, delta) => {
    const ai = alpaca.ai;
    const target = alpaca.target;
    const player = gPlayer.value;

    ai.timer -= delta;
    if (ai.timer <= 0) {
      // 50% chance to hunt the player if they're in range
      if (player && !player.isDead && gMinigame.value.mode !== 1) { // mode !== 1 to disable hunting for AI in spit roayle
        const distToPlayer = alpaca.model.position.distanceTo(player.model.position);
        if (distToPlayer < HUNT_RANGE && Math.random() < 0.5) {
          ai.state = 'hunting';
          ai.spitTimer = SPIT_COOLDOWN * Math.random(); // stagger initial spits
          return;
        }
      }
      target.copy(getRandomPos());
      ai.state = 'moving';
      alpaca.spit();
    }
  };

  const handleMoving = (alpaca, delta) => {
    if (alpaca.isDead)
      return
    if (gEngine.value.world)
    {
      handleMovingRapier(alpaca, delta)
      return
    }
    const ai = alpaca.ai;
    const model = alpaca.model;
    const target = alpaca.target;

    const distance = model.position.distanceTo(target);

    if (distance < 0.5) {
      ai.state = 'idle';
      ai.timer = getRandomTimer();
      alpaca.isAutoMoving = false
    } else {
      const direction = new THREE.Vector3().subVectors(target, model.position).normalize();

      dummy.position.copy(model.position);
      dummy.lookAt(target);

      const speed = alpaca.speed * delta;
      const nextX = model.position.x + (direction.x * speed);
      const nextZ = model.position.z + (direction.z * speed);
      const isWithinBounds = checkWithinBounds(nextX, nextZ);
      const isColliding = checkCollision(model, nextX, nextZ);
      const bounceDistance = 0.5;

      if (!isWithinBounds || isColliding) {
        const backwardVector = new THREE.Vector3(0, 0, -1);
        backwardVector.applyQuaternion(model.quaternion);
        if (isWithinBounds)
          model.position.addScaledVector(backwardVector, bounceDistance);
        ai.state = 'idle';
        ai.timer = 1;
        alpaca.isAutoMoving = false
      } else {
        model.position.x = nextX;
        model.position.z = nextZ;
        model.quaternion.slerp(dummy.quaternion, 5 * delta);
      }
    }
  };

  const handleHunting = (alpaca, delta) => {
    const player = gPlayer.value;

    // Abandon hunt if player is gone, dead, or out of range
    if (!player || player.isDead) {
      alpaca.ai.state = 'idle';
      alpaca.ai.timer = getRandomTimer();
      alpaca.isAutoMoving = false;
      return;
    }

    const ai = alpaca.ai;
    const model = alpaca.model;
    const distance = model.position.distanceTo(player.model.position);

    if (distance > HUNT_RANGE * 1.5) {
      ai.state = 'idle';
      ai.timer = getRandomTimer();
      alpaca.isAutoMoving = false;
      return;
    }

    // Move towards player unless already close
    if (distance > 5) {
      const direction = new THREE.Vector3().subVectors(player.model.position, model.position).normalize();
      dummy.position.copy(model.position);
      dummy.lookAt(player.model.position);

      const speed = alpaca.speed * delta;
      const nextX = model.position.x + direction.x * speed;
      const nextZ = model.position.z + direction.z * speed;

      const isWithinBounds = checkWithinBounds(nextX, nextZ);
      const isColliding = checkCollision(model, nextX, nextZ);

      if (!isWithinBounds || isColliding) {
        ai.state = 'idle';
        ai.timer = 1;
        alpaca.isAutoMoving = false;
      } else {
        model.position.x = nextX;
        model.position.z = nextZ;
        model.quaternion.slerp(dummy.quaternion, 6 * delta);
        alpaca.isAutoMoving = true;
      }
    } else {
      // Close enough — face the player directly
      dummy.position.copy(model.position);
      dummy.lookAt(player.model.position);
      model.quaternion.slerp(dummy.quaternion, 8 * delta);
      alpaca.isAutoMoving = false;
    }

    // Spit at the player on cooldown when in range
    ai.spitTimer = (ai.spitTimer || 0) - delta;
    if (ai.spitTimer <= 0 && distance < SPIT_RANGE) {
      dummy.position.copy(model.position);
      dummy.lookAt(player.model.position);
      model.quaternion.copy(dummy.quaternion);
      alpaca.spit();
      ai.spitTimer = SPIT_COOLDOWN;
    }
  };

  const updateAI = (alpaca, delta) => {
    if (gMinigame.value.mode > 1 && gMinigame.value.mode < 5) // no AI update in multiplayer and alpacaRoad
      return

    switch (alpaca.ai.state) {
      case 'idle':
        handleIdle(alpaca, delta);
        break;
      case 'moving':
        handleMoving(alpaca, delta);
        break;
      case 'hunting':
        handleHunting(alpaca, delta);
        break;
      default:
        console.warn(`Unknown AI state: ${alpaca.ai.state}`);
        alpaca.ai.state = 'idle';
        break;
    }
    alpaca.isMoving = (alpaca.ai.state === 'moving' || alpaca.ai.state === 'hunting');
  };

  return { updateAI, handleMoving };
}

const handleMovingRapier = (alpaca, delta) => {
    if (!alpaca.physicsBody)
      return
    const ai = alpaca.ai;
    const body = alpaca.physicsBody;
    const currentVel = body.linvel();
    
    // Calculate how fast the Alpaca is ACTUALLY moving (horizontal only)
    const actualSpeed = Math.sqrt(currentVel.x ** 2 + currentVel.z ** 2);
  
    // STUCK DETECTION:
    // If we are in 'moving' state but speed is nearly 0, we hit something.
    // We use a small threshold (0.2) because physics bodies jitter slightly.
    if (actualSpeed < 0.2 && ai.state === 'moving') {
      // Increment a "stuck timer" or check directly
      ai.stuckFrames = (ai.stuckFrames || 0) + 1;
  
      if (ai.stuckFrames > 10) { // If stuck for ~10 frames
        
        // Apply a small "Ouch" bounce-back impulse
        body.applyImpulse({ 
          x: -currentVel.x * 2, 
          y: 1.5, // Small hop
          z: -currentVel.z * 2 
        }, true);
  
        // Force to Idle so it picks a new target
        ai.state = 'idle';
        ai.timer = 1.0; 
        ai.stuckFrames = 0;
        alpaca.isAutoMoving = false;
        return; // Exit early
      }
    } else {
      ai.stuckFrames = 0; // Reset if we are moving fine
    }
    
    const model = alpaca.model;
    const target = alpaca.target;

     // Get current physics position
    const currentPos = body.translation();
    const currentPosVec = new THREE.Vector3(currentPos.x, currentPos.y, currentPos.z);
    
    const distance = currentPosVec.distanceTo(target);
  
    if (distance < 0.8) { // Slightly larger threshold for physics
      ai.state = 'idle';
      ai.timer = getRandomTimer();
      alpaca.isAutoMoving = false;
      
      // Stop the body when reaching target
      const vel = body.linvel();
      body.setLinvel({ x: 0, y: vel.y, z: 0 }, true);
    } else {
      // Calculate Direction
      const direction = new THREE.Vector3().subVectors(target, currentPosVec).normalize();
  
      // Update Rotation (Visuals)
      dummy.position.copy(currentPosVec);
      dummy.lookAt(target.x, currentPosVec.y, target.z); // Keep it level
      model.quaternion.slerp(dummy.quaternion, 5 * delta);
      
      // Sync physics rotation to match visual rotation
      body.setRotation(model.quaternion, true);
  
      // Movement via Velocity
      const speed = alpaca.speed; // No delta here! Linvel is "units per second"
      const currentVel = body.linvel();
      
      body.setLinvel({
        x: direction.x * speed,
        y: currentVel.y, // Maintain gravity
        z: direction.z * speed
      }, true);
  
      // Handling "Stuck" logic
      // We no longer need checkWithinBounds or checkCollision!
      // Rapier will naturally stop the alpaca if it hits a tree or wall.
      
      // If the alpaca is trying to move but speed is near zero, it's stuck.
      const actualVel = Math.sqrt(currentVel.x**2 + currentVel.z**2);
      if (actualVel < 0.1 && distance > 1) {
         // Optional: Add logic to pick a new target if stuck for too long
      }
    }
  };