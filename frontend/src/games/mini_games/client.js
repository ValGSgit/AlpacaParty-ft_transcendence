import { GameClient } from './GameClient.js';
import { gPlayer, gScene, gUser } from '../core/globals.js';
import { setupCallbacks } from './spitRoyal.js';
import { removeObject } from '../core/removeObjects.js';

export let onlineClient = null;
export const remotePlayers = {};
export let originalSpitFn = null;

export class SpitRoyaleClient extends GameClient {
  constructor() {
    super('/spit-royale');
  }

  fireSpit() {
    this.emit('spit');
  }
}

export class AlpacaRoadClient extends GameClient {
  constructor() {
    super('/alpaca-road');
  }
}

export function cleanupClient() {
  // --- MULTIPLAYER CLEANUP ---
  if (onlineClient) {
    onlineClient.destroy();
    onlineClient = null;
  }
  // Restore original spit function if we overwrote it
  if (originalSpitFn) {
    gPlayer.value.spit = originalSpitFn;
    originalSpitFn = null;
  }
  for (const id in remotePlayers) {
    if (remotePlayers[id] !== "loading" && remotePlayers[id]) {
      gScene.value.remove(remotePlayers[id].model);
      removeObject(remotePlayers[id]);
    }
    delete remotePlayers[id];
  }
}

export function initClient(game, matchId){
  if (game === 0)
  {
    onlineClient = new SpitRoyaleClient();
    originalSpitFn = gPlayer.value.spit;
      gPlayer.value.spit = () => {
        originalSpitFn.call(gPlayer.value);
        if (onlineClient) onlineClient.fireSpit();
      };
  }
  else if (game === 1)
    onlineClient = new AlpacaRoadClient();
  const playerName = gUser.value?.name || 'Vue_Alpaca';
  onlineClient.connect(playerName, matchId);
  setupCallbacks(onlineClient);
}