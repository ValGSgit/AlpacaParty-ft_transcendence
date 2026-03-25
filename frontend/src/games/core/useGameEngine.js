import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { shallowRef } from 'vue';
import { CONST } from '../config/constants.js';
import { gAlpacas, gCollectables, gCollidables, gEditables, gEditState, gItems, gScene, gUser } from './globals.js';

export function useGameEngine(containerRef) {
  // Use shallowRef for Three.js objects (prevents Vue from making them reactive and slow)
  const scene = shallowRef(null)
  const camera = shallowRef(null)
  const renderer = shallowRef(null)
  const controls = shallowRef(null)

  let animationId

  const init = () => {
    if (!containerRef.value) return null
    // memory cleanup
    if (gScene.value) { clearScene(gScene.value) }

    resetGArrays()

    gUser.value = null

    scene.value = new THREE.Scene()
    gScene.value = scene.value
    gScene.value.floor = null

    // lights
    gScene.value.ambientLight = null
    gScene.value.sunLight = null

    // for selection
    gEditState.selected = null
    gEditState.ghost = null

    // camera mode
    gScene.value.cameraMode = 0

    // CAMERA
    const w = containerRef.value.clientWidth
    const h = containerRef.value.clientHeight
    camera.value = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000)
    camera.value.position.set(30, 30, 50)
    camera.value.lookAt(0, 0, 0)

    // RENDERER
    renderer.value = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.value.setSize(w, h)
    renderer.value.setPixelRatio(window.devicePixelRatio)
    renderer.value.shadowMap.enabled = true;
    renderer.value.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.value.appendChild(renderer.value.domElement)

    // CONTROLS
    controls.value = new OrbitControls(camera.value, renderer.value.domElement);
    controls.value.enableDamping = true
    controls.value.dampingFactor = 0.05
    controls.value.minDistance = CONST.MIN_ZOOM
    controls.value.maxDistance = CONST.MAX_ZOOM
    //to limit the camera movement to hemisphere instead of full sphere
    controls.value.maxPolarAngle = Math.PI / 2 - 0.1

    return {
      scene: scene.value,
      camera: camera.value,
      renderer: renderer.value,
      controls: controls.value
    }
  }

  const clearScene = (scene) => {
    if (!scene) return;

    scene.traverse((object) => {
      if (object.geometry) object.geometry.dispose();
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach(cleanupMaterial);
        } else {
          cleanupMaterial(object.material);
        }
      }
    });
    while (scene.children.length > 0) {
      const child = scene.children[0];
      scene.remove(child);
    }
  };
  const cleanupMaterial = (material) => {
    for (const key in material) {
      const value = material[key];
      if (value && value.isTexture) {
        value.dispose();
      }
    }
    material.dispose();
  };

  const cleanup = () => {
    clearScene(scene.value)
    if (scene.value.sunLight) scene.value.sunLight.dispose() // the two leaks
    if (scene.value.background) scene.value.background.dispose()
    if (animationId) cancelAnimationFrame(animationId)
    resetGArrays()
    // check for leaks
    if (renderer.value) {
      renderer.value.dispose()
      renderer.value.forceContextLoss(); // forces WebGL to release the context
      renderer.value.domElement.remove(); // Remove the canvas from the HTML
    }
    //console.log(renderer.value.info.memory); // debug leaks, one geometry from the background and one from alpaca still hanging
  }

  const onResize = () => {
    if (!containerRef.value || !camera.value || !renderer.value) return
    const w = containerRef.value.clientWidth
    const h = containerRef.value.clientHeight
    camera.value.aspect = w / h
    camera.value.updateProjectionMatrix()
    renderer.value.setSize(w, h)
  }

  const resetGArrays = () => {
    gAlpacas.length = 0;
    gCollectables.length = 0;
    gCollidables.length = 0;
    gItems.length = 0;
    gEditables.length = 0;
  }

  return { init, cleanup, onResize, clearScene, resetGArrays }
}