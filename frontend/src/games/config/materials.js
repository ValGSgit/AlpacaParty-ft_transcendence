import * as THREE from 'three'

export const MATERIALS = {
  debug: new THREE.MeshBasicMaterial({
    color: 0x00ff00,
    wireframe: true,
    visible: true,
  }),

  collider: new THREE.MeshBasicMaterial({
    visible: false
  }),

  highlight: new THREE.MeshStandardMaterial({
    color: 0x33ffff,
    emissive: 0x33ffff,
    emissiveIntensity: 1,
    transparent: true,
    opacity: 0.5,
    // 🛡️ ANTI Z-FIGHTING MAGIC
    polygonOffset: true,
    polygonOffsetFactor: -1, // Pulls the polygons slightly toward the camera
    polygonOffsetUnits: -1,
  })
}