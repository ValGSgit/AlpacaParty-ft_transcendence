import * as THREE from 'three'
import { ref, shallowRef } from 'vue'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { gScene, gUser } from './globals.js'
import { CONST } from '../config/constants.js'

export function useGameEngine(containerRef) {
  // Use shallowRef for Three.js objects (prevents Vue from making them reactive and slow)
  const scene = shallowRef(null)
  const camera = shallowRef(null)
  const renderer = shallowRef(null)
  const controls = shallowRef(null)

  let animationId

  const init = () => {
    if (!containerRef.value) return null

    scene.value = new THREE.Scene()
    gScene.value = scene.value
    gScene.value.floor = null
    // lights
    gScene.value.ambientLight = null
    gScene.value.sunLight = null
    // for selection
    gScene.value.selected = null
    gScene.value.selectedGhost = null
    // flags for UI
    gScene.value.pause = false
    gScene.value.edit = false
    gScene.value.itemMenu = false
    gScene.value.alpacaMenu = false
    gScene.value.newAlpaca = false
    gScene.value.lightMenu = false

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
    renderer.value.shadowMap.enabled = true
    containerRef.value.appendChild(renderer.value.domElement)

    // CONTROLS
    controls.value = new OrbitControls(camera.value, renderer.value.domElement);
    controls.value.enableDamping = true
    controls.value.dampingFactor = 0.05
    controls.value.minDistance = CONST.MIN_ZOOM
    controls.value.maxDistance = CONST.MAX_ZOOM
    //to limit the camera movement to hemisphere instead of full sphere
    controls.value.maxPolarAngle = Math.PI / 2 - 0.1

    animate()

    return {
      scene: scene.value,
      camera: camera.value,
      renderer: renderer.value,
      controls: controls.value
    }
  }

  const animate = () => {
    if (!renderer.value || !scene.value || !camera.value) return
    animationId = requestAnimationFrame(animate)
    if (controls.value) controls.value.update()
    renderer.value.render(scene.value, camera.value)
  }

  const cleanup = () => {
    if (animationId) cancelAnimationFrame(animationId)
    if (renderer.value) renderer.value.dispose()
  }

  const onResize = () => {
    if (!containerRef.value || !camera.value || !renderer.value) return
    const w = containerRef.value.clientWidth
    const h = containerRef.value.clientHeight
    camera.value.aspect = w / h
    camera.value.updateProjectionMatrix()
    renderer.value.setSize(w, h)
  }

  return { init, cleanup, onResize }
}