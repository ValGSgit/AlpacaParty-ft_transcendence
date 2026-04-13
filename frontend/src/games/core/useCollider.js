import * as THREE from 'three';
import { OBB } from 'three/addons/math/OBB.js';
import { CONST } from '../config/constants.js';
import { MATERIALS as MATS } from '../config/materials.js';

export function attachCollider(model) {
  let collider = null;

  model.traverse((child) => {
    if (child.isMesh) {
      if (child.name.startsWith('UCX_')) {
        collider = child;
        collider.name = "UCX_Collider";
        child.visible = false;
      }
      else {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    }
  });

  if (!collider) {
    collider = generateCollider(model);
  } else {
    collider = generateCollider(model, collider);
    collider.name = "UCX_Collider";
    collider.visible = CONST.DEBUG || false;
    collider.material = CONST.DEBUG ? MATS.debug : MATS.collider;
  }

  model.userData.collider = collider;
  setupOBB(collider);
}

function setupOBB(colliderMesh) {
  colliderMesh.geometry.computeBoundingBox();
  const boundingBox = colliderMesh.geometry.boundingBox;

  const baseOBB = new OBB()
  boundingBox.getCenter(baseOBB.center)
  boundingBox.getSize(baseOBB.halfSize).multiplyScalar(0.5)

  colliderMesh.userData.baseOBB = baseOBB
}


function generateCollider(model, ucx) {
  const compute = ucx ? ucx : model;
  if (ucx){
    console.log("UCX:", ucx);
  }
  let size = new THREE.Vector3()
  const center = new THREE.Vector3()
  const boundingBox = new THREE.Box3().setFromObject(compute)

  boundingBox.getSize(size)
  boundingBox.getCenter(center)
  if (!ucx)
    size.multiplyScalar(CONST.COLLIDER_SIZE)

  const geo = new THREE.BoxGeometry(size.x, size.y, size.z)
  //const mat = CONST.DEBUG ? MATS.debug : MATS.collider
  const mat = MATS.collider
  const collider = new THREE.Mesh(geo, mat)

  model.add(collider)
  model.worldToLocal(center)
  collider.position.copy(center)
  collider.name = "Collider"

  return collider;
} 


 /*  import * as THREE from 'three';
import { OBB } from 'three/addons/math/OBB.js';
import { CONST } from '../config/constants.js';
import { MATERIALS as MATS } from '../config/materials.js';

export function attachCollider(model) {
  let collider = null;

  // 1. Find the UCX mesh
  model.traverse((child) => {
    if (child.isMesh && child.name.startsWith('UCX_')) {
      collider = child;
    }
  });

  // 2. If no UCX, generate a simple box collider
  if (!collider) {
    collider = generateBoxCollider(model);
  } else {
    // Standardize the UCX mesh
    collider.name = "Collider";
    collider.visible = CONST.DEBUG || false;
    collider.material = CONST.DEBUG ? MATS.debug : MATS.collider;
  }

  // 3. Flag it for your point/collision logic
  collider.userData.isCollider = true;
  model.userData.collider = collider;

  // 4. Setup the mathematical OBB
  setupOBB(collider);
}

function setupOBB(colliderMesh) {
  // computeBoundingBox gives us LOCAL coordinates
  colliderMesh.geometry.computeBoundingBox();
  const box = colliderMesh.geometry.boundingBox;

  const baseOBB = new OBB();
  
  // Calculate the center point relative to the mesh's own pivot
  box.getCenter(baseOBB.center);
  
  // Calculate half-size
  const size = new THREE.Vector3();
  box.getSize(size);
  baseOBB.halfSize.copy(size).multiplyScalar(0.5);

  // Store it for the physics engine
  colliderMesh.userData.baseOBB = baseOBB;
}

function generateBoxCollider(model) {
  // Use Box3 on the object to find its dimensions
  const bbox = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  bbox.getSize(size);
  bbox.getCenter(center);

  // Adjust size by your global config
  size.multiplyScalar(CONST.COLLIDER_SIZE);

  const geo = new THREE.BoxGeometry(size.x, size.y, size.z);
  const mat = MATS.collider;
  const collider = new THREE.Mesh(geo, mat);

  // Name it so we can find it
  collider.name = "Collider";
  collider.visible = CONST.DEBUG || false;

  // IMPORTANT: We add it to the model
  model.add(collider);

  // Convert the world center of the model into local space for the collider position
  const localCenter = model.worldToLocal(center.clone());
  collider.position.copy(localCenter);

  return collider;
} */

/*   import * as THREE from 'three';
import { OBB } from 'three/addons/math/OBB.js';
import { CONST } from '../config/constants.js';
import { MATERIALS as MATS } from '../config/materials.js';

export function attachCollider(model) {
  let collider = null;

  // 1. Find the UCX mesh from Maya
  model.traverse((child) => {
    if (child.isMesh && child.name.startsWith('UCX_')) {
      collider = child;
    }
  });

  if (collider) {
    // ✅ FIX 1: Use the Maya mesh ITSELF as the collider.
    // Do NOT call generateCollider() which creates that big red box.
    collider.name = "Collider";
    collider.visible = CONST.DEBUG;
    collider.material = CONST.DEBUG ? MATS.debug : MATS.collider;
  } else {
    // If no Maya collider, then we generate a basic one
    collider = generateBoxCollider(model);
  }

  model.userData.collider = collider;
  collider.userData.isCollider = true;

  // 2. Initialize the OBB math
  setupOBB(collider);
}

function setupOBB(colliderMesh) {
  // ✅ FIX 2: Compute bounding box from GEOMETRY (Local Space), not Object (World Space).
  // This gets the "tight" dimensions before any rotation or scaling is applied.
  colliderMesh.geometry.computeBoundingBox();
  const localBox = colliderMesh.geometry.boundingBox;

  const baseOBB = new OBB();
  
  // Calculate the tight local center and half-size
  localBox.getCenter(baseOBB.center);
  
  const size = new THREE.Vector3();
  localBox.getSize(size);
  baseOBB.halfSize.copy(size).multiplyScalar(0.5);

  // Store the "Blueprint" OBB in userData
  colliderMesh.userData.baseOBB = baseOBB;
}

function generateBoxCollider(model) {
  // Standard fallback for models without UCX_
  const bbox = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  bbox.getSize(size);
  bbox.getCenter(center);

  const geo = new THREE.BoxGeometry(size.x * CONST.COLLIDER_SIZE, size.y * CONST.COLLIDER_SIZE, size.z * CONST.COLLIDER_SIZE);
  const collider = new THREE.Mesh(geo, MATS.collider);
  
  model.add(collider);
  const localPos = model.worldToLocal(center.clone());
  collider.position.copy(localPos);
  
  return collider;
} */

/*   import * as THREE from 'three';
import { OBB } from 'three/addons/math/OBB.js';
import { CONST } from '../config/constants.js';
import { MATERIALS as MATS } from '../config/materials.js';

export function attachCollider(model) {
  let collider = null;

  // 1. Find the Maya UCX mesh
  model.traverse((child) => {
    if (child.isMesh && child.name.startsWith('UCX_')) {
      collider = child;
    }
  });

  if (collider) {
    collider.name = "Collider";
    collider.visible = CONST.DEBUG;
    collider.material = CONST.DEBUG ? MATS.debug : MATS.collider;
  } else {
    collider = generateBoxCollider(model);
  }

  model.userData.collider = collider;
  collider.userData.isCollider = true;

  setupOBB(collider);
}

function setupOBB(colliderMesh) {
  // ✅ FIX 2: Compute bounding box from GEOMETRY.
  // This gets the "thin" pole dimensions before rotation is applied.
  colliderMesh.geometry.computeBoundingBox();
  const localBox = colliderMesh.geometry.boundingBox;

  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  localBox.getSize(size);
  localBox.getCenter(center);

  const baseOBB = new OBB();
  baseOBB.center.copy(center);
  baseOBB.halfSize.copy(size).multiplyScalar(0.5);

  colliderMesh.userData.baseOBB = baseOBB;

  // 3. ✅ THE VISUALIZER (The "Red Box")
  // We create a visualizer that exactly matches the OBB math
  if (CONST.DEBUG) {
    // Remove old visualizers if they exist
    const old = colliderMesh.getObjectByName("OBB_Visualizer");
    if (old) colliderMesh.remove(old);

    const geo = new THREE.BoxGeometry(size.x, size.y, size.z);
    const mat = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true, depthTest: false });
    const visualizer = new THREE.Mesh(geo, mat);
    
    visualizer.name = "OBB_Visualizer";
    visualizer.position.copy(center);
    
    // Add as a child of the colliderMesh so it inherits rotation/scale automatically
    colliderMesh.add(visualizer);
  }
}

function generateBoxCollider(model) {
  // AABB fallback for simple objects
  const bbox = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  bbox.getSize(size);
  bbox.getCenter(center);

  const geo = new THREE.BoxGeometry(size.x, size.y, size.z);
  const collider = new THREE.Mesh(geo, MATS.collider);
  
  model.add(collider);
  const localPos = model.worldToLocal(center.clone());
  collider.position.copy(localPos);
  
  return collider;
} */