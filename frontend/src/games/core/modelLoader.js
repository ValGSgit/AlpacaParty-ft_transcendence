
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as THREE from 'three'

export async function loadGLTF(path) {
  const loader = new GLTFLoader();
  try {
    const gltf = await loader.loadAsync(path);
    const model = gltf.scene

    // Precalculate Shadows
    model.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true
      }
    })

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
