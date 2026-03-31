import { ref } from 'vue';
import { useAuthStore } from '../../stores/auth.js';
import { CONST } from '../config/constants.js';
import { alpaca } from '../core/entities/Alpaca.js';
import { gAlpacas, gPlayer, gScene, gUI, gUser } from '../core/globals.js';
import { saveGame } from '../core/saveLoadGame.js';
import { useGameEngine } from '../core/useGameEngine.js';
import { spawnObjectRandomly } from '../utils/spawnRandomly.js';
import { initWorld } from '../world/initWorld.js';
import { setupEnvironment } from '../world/sceneBuilder.js';

const miniGameContainer = ref(null)

const { isAuthenticated } = useAuthStore()
const { clearScene, resetGArrays } = useGameEngine(miniGameContainer)

export async function changeGame() {

  gPlayer.value.hp = CONST.HP
  gUser.value.hp = CONST.HP
  gPlayer.value.point = 0
  gUser.value.point = 0
  clearScene(gScene.value)
  resetGArrays()
  if (gUser.value.gameMode === 0)
    initGame1()
  else {
    gUser.value.gameMode = 0
    gPlayer.value = null
    gUI.cameraMode = 0
    await initWorld(gScene.value, isAuthenticated)
    saveGame()
  }
}

async function initGame1() {

  gUser.value.gameMode = 1
  setupEnvironment(gScene.value)
  gScene.value.add(gPlayer.value.model)
  gAlpacas.push(gPlayer.value)
  gUI.cameraMode = 1

  console.log("What am I trying to load?", alpaca);
  console.log("What is the path?", alpaca.path);
  gScene.value.add(await spawnObjectRandomly(alpaca, 10))
}