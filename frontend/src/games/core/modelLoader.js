
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as THREE from 'three'
import { MATERIALS as MATS } from '../config/materials.js'
import { CONST } from '../config/constants.js';

export async function loadGLTF(path) {
  const loader = new GLTFLoader();
  try {
    const gltf = await loader.loadAsync(path);
    const model = gltf.scene

    let collider = null

    model.traverse((child) => {
      if (child.isMesh) {
        if (child.name.startsWith('UCX_')) {
          collider = child
          child.visible = false
          // FOR DEBUGGING
          // child.visible = true
          // child.material.wireframe = true
        }
        child.castShadow = true
        child.receiveShadow = true
      }
    })

    // generate Collision if none was included
    if (!collider) {
      console.warn(`NO UCX collider found in ${model.name}, generating collider...`)
      collider = generateCollider(model)
    }
    model.userData.collider = collider
    model.add(collider)

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

function generateCollider(model) {
  // measure the entire model (finds the highest, lowest, widest points)
  const boundingBox = new THREE.Box3().setFromObject(model)

  const size = new THREE.Vector3()
  const center = new THREE.Vector3()
  boundingBox.getSize(size)
  boundingBox.getCenter(center)
  const geo = new THREE.BoxGeometry(size.x, size.y, size.z)
  const mat = CONST.DEBUG ? MATS.debug : MATS.collider
  const collider = new THREE.Mesh(geo, mat)
  collider.position.copy(center)
  collider.name = "Collider"

  return collider
}

// clone geo and apply highlight material
// let geo = new THREE.Group()
// model.traverse((child) => {
//   if (child.isMesh) {
//     const overlayMesh = child.clone()
//     overlayMesh.material = MATS.highlight
//     geo.add(overlayMesh)
//   }
// })
// model.add(geo)