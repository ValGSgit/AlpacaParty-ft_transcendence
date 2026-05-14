import * as THREE from 'three';
import { gPlayer, gEngine } from '../core/globals.js'
import { CONST } from '../config/constants.js'
import RAPIER from '@dimforge/rapier3d-compat'

export async function initRapier(){
    if(!gEngine.value.world)
    {
        await initGravity()
        initPhysicsFloor()
    }
}

async function initGravity(){
  await RAPIER.init();

  const gravity = { x: 0.0, y: -9.81, z: 0.0 };
  const world = new RAPIER.World(gravity);

  gEngine.value.world = world
}

function initPhysicsFloor() {
  const radius = CONST.FLOOR_RADIUS;
  const halfHeight = 0.5;

  // Create the Body
  const floorBodyDesc = RAPIER.RigidBodyDesc.fixed()
    .setTranslation( 0, -halfHeight, 0 );
  const floorBody =  gEngine.value.world.createRigidBody(floorBodyDesc);

  // Create the Cylinder Collider
  const floorColliderDesc = RAPIER.ColliderDesc.cylinder(halfHeight, radius)
    .setRestitution(0.4) // Bouncy!
    .setFriction(5);

   gEngine.value.world.createCollider(floorColliderDesc, floorBody);
}

export function initPhysicalBoday(alpaca) {
    if (alpaca.physicsBody) {
    // Reset Position (The "Brain")
    // Use an object {x, y, z}. Start at y: 1 so it drops onto the floor.
    alpaca.physicsBody.setTranslation({ x: 0, y: 1, z: 0 }, true);

    // Reset Rotation
    // Rapier uses Quaternions. This resets rotation to look forward.
    alpaca.physicsBody.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);

    // KILL MOMENTUM
    // This is the most important part! 
    // Otherwise, the alpaca will spawn and immediately "fly away" 
    // with the speed it had when it died.
    alpaca.physicsBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
    alpaca.physicsBody.setAngvel({ x: 0, y: 0, z: 0 }, true);
  } else {
    // Fallback for non-physics alpacas
    alpaca.model.position.set(0, 0, 0);
    alpaca.model.rotation.y = 0;
  }
}

export function initRigidBody(alpaca, position){
    if (!gEngine.value.world)
        return
    const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(
        position?.x || 0, 
        5, // Start slightly in air to test gravity
        position?.z || 0
      )
    bodyDesc.setCanSleep(false) // Keep it active for character movement

    const body = gEngine.value.world.createRigidBody(bodyDesc);
    body.setEnabledRotations(false, true, false); // Lock X and Z so alpaca doesn't fall over

    createColliderFromMesh(alpaca.model, gEngine.value.world, body)

    alpaca.physicsBody = body;
}

function createColliderFromMesh(model, world, rigidBody) {
  const vertices = [];

  // Traverse the model to get all vertices from all meshes
  model.traverse((child) => {
    if (child.isMesh) {
      const positionAttribute = child.geometry.attributes.position;
      for (let i = 0; i < positionAttribute.count; i++) {
        // We need to account for the child's position/scale relative to the parent
        const vertex = new THREE.Vector3(
          positionAttribute.getX(i),
          positionAttribute.getY(i),
          positionAttribute.getZ(i)
        );
        child.localToWorld(vertex); // Convert to world positions
        model.worldToLocal(vertex); // Convert back to model's local space
        vertices.push(vertex.x, vertex.y, vertex.z);
      }
    }
  });

  // Create the Convex Hull
  // Float32Array is required by Rapier
  const vertexArray = new Float32Array(vertices);
  const colliderDesc = RAPIER.ColliderDesc.convexHull(vertexArray)
  
  world.createCollider(colliderDesc, rigidBody);
}
