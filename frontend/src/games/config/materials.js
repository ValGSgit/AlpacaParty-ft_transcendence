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

  collider_hit: new THREE.MeshBasicMaterial({
    color: 0xff0000,
    wireframe: true,
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
