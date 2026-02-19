import * as THREE from 'three'
import { gAlpacas } from './globals.js'

const playerMathBox = new THREE.Box3()
const otherMathBox = new THREE.Box3()

export function usePhysics() {

  const checkCollision = (player, nextX, nextZ) => {
    const oldX = player.position.x
    const oldZ = player.position.z

    player.position.x = nextX
    player.position.z = nextZ
    player.updateMatrixWorld()

    let hasCollision = false
    const playerColliderMesh = player.userData.collider

    if (!playerColliderMesh) return false

    playerMathBox.setFromObject(playerColliderMesh)

    for (const other of gAlpacas.value) {
      if (other.model.uuid === player.uuid) continue

      const otherColliderMesh = other.model.userData.collider
      if (!otherColliderMesh || !otherColliderMesh.isMesh) continue

      other.model.updateMatrixWorld(true)
      otherMathBox.setFromObject(otherColliderMesh)

      if (playerMathBox.intersectsBox(otherMathBox)) {
        hasCollision = true
        break
      }
    }

    player.position.x = oldX
    player.position.z = oldZ
    player.updateMatrixWorld(true)

    return hasCollision
  }

  return { checkCollision }
}