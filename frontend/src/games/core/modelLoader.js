
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as THREE from 'three'
import { MATERIALS as MATS } from '../config/materials.js'
import { CONST } from '../config/constants.js';
import { OBB } from 'three/addons/math/OBB.js'

export async function loadGLTF(path) {
  const loader = new GLTFLoader();
  try {
    const gltf = await loader.loadAsync(path);
    const model = gltf.scene
    model.userData.cost = 1 //get this from Database

    let collider = null

    model.traverse((child) => {
      if (child.isMesh) {
        if (child.name.startsWith('UCX_')) {
          collider = child
          collider.name = "Collider"
          child.visible = false
        }
        child.castShadow = true
        child.receiveShadow = true
      }
    })

    if (!collider) {
      collider = generateCollider(model)
    }
    model.userData.collider = collider
    model.add(collider)
    setupOBB(collider)

    // Setup Animations (if any)
    let mixer = null
    let animations = gltf.animations
    if (animations.length > 0) {
      mixer = new THREE.AnimationMixer(model)
    }
    return { model, mixer, animations }

  } catch (error) {
    console.error('Error loading model: ', error)
    return null
  }
}

function setupOBB(colliderMesh) {
  colliderMesh.geometry.computeBoundingBox()
  const boundingBox = colliderMesh.geometry.boundingBox

  const baseOBB = new OBB()
  boundingBox.getCenter(baseOBB.center)
  boundingBox.getSize(baseOBB.halfSize).multiplyScalar(0.5)

  colliderMesh.userData.baseOBB = baseOBB
}

function generateCollider(model) {
  // measure the entire model (finds the highest, lowest, widest points)
  const boundingBox = new THREE.Box3().setFromObject(model)

  let size = new THREE.Vector3()
  const center = new THREE.Vector3()
  boundingBox.getSize(size)
  boundingBox.getCenter(center)
  size.multiplyScalar(CONST.COLLIDER_SIZE)
  const geo = new THREE.BoxGeometry(size.x, size.y, size.z)
  const mat = CONST.DEBUG ? MATS.debug : MATS.collider
  const collider = new THREE.Mesh(geo, mat)
  collider.position.copy(center)
  collider.name = "Collider"

  return collider
}
