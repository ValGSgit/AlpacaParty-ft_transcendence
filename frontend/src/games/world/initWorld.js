import { loadGameData } from './dataLoader.js'
import { setupEnvironment } from './sceneBuilder.js'
import { initializeAlpacas, spawnTrees } from './spawnAssets.js'

export async function initWorld(scene, isAuthenticated = false) {
  setupEnvironment(scene)

  let user = null
  if (isAuthenticated) {
    user = await loadGameData()
  } else {
    console.log('User not logged in, starting fresh.')
  }
  await initializeAlpacas(scene, user)
  await spawnTrees(user?.items)
}