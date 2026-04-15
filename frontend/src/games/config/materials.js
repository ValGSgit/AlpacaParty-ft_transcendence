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
    emissiveIntensity: 0.7,
    transparent: true,
    opacity: 0.5,
  }),

  ghost: new THREE.MeshBasicMaterial({
    color: 0xff0000,
    transparent: true,
    opacity: 0.5,
  }),

  spit: new THREE.MeshStandardMaterial({
    color: 0x00ffff,
    emissive: 0x00ffff,
    emissiveIntensity: 2,
    transparent: true,
    opacity: 0.8
  }),
}

export const ROAD_MATERIALS = {
  obstacle: new THREE.MeshStandardMaterial({
    color: '#550000',
    roughness: 0.8
  })
}