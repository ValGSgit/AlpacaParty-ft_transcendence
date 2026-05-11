import { ref } from 'vue';
import { useAuthStore } from '../../stores/auth.js';
import { clearCoins } from '../components/coins.js';
import { CONST } from '../config/constants.js';
import { gAlpacas, gMinigame, gPlayer, gScene, gUI, gUser } from '../core/globals.js';
import { saveGame } from '../core/saveLoadGame.js';
import { useGameEngine } from '../core/useGameEngine.js';
import { initWorld } from '../world/initWorld.js';
import { initAlpacaRoad, initAlpacaRoadOnline } from './alpacaRoad.js';
import { clearAnnouncements } from './annoucement.js';
import { activeClient } from './GameClient.js';
import { initSpitRoyalAI, initSpitRoyalOnline } from './spitRoyal.js';

const miniGameContainer = ref(null)
const { clearScene, resetGArrays } = useGameEngine(miniGameContainer)
const tempAlpacas = []

export async function changeGame(mode, playerCount = 1) {
  console.log("changeGame:", mode);
  if (!gPlayer.value || !gUser.value) return;
  if (gMinigame.value.mode === 0) saveGame();

  resetMinigame();
  gMinigame.value.mode = mode;
  gMinigame.value.isOnline = (gMinigame.value.mode === 2 || gMinigame.value.mode === 4);
  gUser.value.hp = CONST.HP
  gUser.value.point = 0
  resetAlpaca(gPlayer.value)
  tempAlpacas.length = 0
  for (let i = 1; i < gAlpacas.length; ++i) {
    if (gAlpacas[i] !== gPlayer.value) {
      tempAlpacas.push(gAlpacas[i])
      resetAlpaca(gAlpacas[i])
    }
  }
  clearScene(gScene.value)
  clearCoins()
  resetGArrays()
  initGameMode(mode, playerCount, tempAlpacas);
}

async function returnFarm() {
  const authStore = useAuthStore()

  if (gMinigame.value.isOnline) {
    activeClient.disconnect();
  }
  clearAnnouncements();
  resetMinigame();
  gMinigame.value.mode = 0;

  gUI.lobbyMenu = false;
  gUI.lockCamera = false;
  gUI.cameraMode = 0

  gPlayer.value = null
  await initWorld(gScene.value, authStore.isAuthenticated)
  saveGame()
}

function resetAlpaca(alpaca,) {
  alpaca.hp = CONST.HP
  alpaca.point = 0
  alpaca.isDead = 0
  alpaca.model.position.set(0, 0, 0)
  alpaca.model.rotation.y = 0
}

function resetMinigame() {
  gMinigame.value.isOnline = false;
  gMinigame.value.isReady = false;
  gMinigame.value.isActive = false;
  gMinigame.value.isGameOver = false;
  gMinigame.value.currentRoomName = null;
  gMinigame.value.players = [];
}

async function initGameMode(mode, playerCount, tempAlpacas) {
  console.log("initGameMode: ", mode);
  switch (mode) {
    case 1:
      initSpitRoyalAI(10, tempAlpacas);
      break;
    case 2:
      initSpitRoyalOnline();
      break;
    case 3:
      initAlpacaRoad(playerCount, tempAlpacas);
      break;
    case 4:
      initAlpacaRoadOnline(playerCount, tempAlpacas);
      break;
    default:
      await returnFarm();
  }
}