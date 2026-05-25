import { gScene } from '../core/globals.js';
import * as GRADIENT from "../utils/createGradient.js"
import api from '../../services/api.js';
import { devError } from '../../services/logger.js';

export function changeFloorColor(top, bottom){
  const floorMat = gScene.value?.floor?.material?.[1];
  if (!floorMat) return;
  const newTexture = GRADIENT.Radial(top, bottom);
  if (floorMat.map) floorMat.map.dispose();
  floorMat.map = newTexture;
  floorMat.needsUpdate = true;
}

/**
 * Save offline/AI game result to backend leaderboard.
 * Per-run counters (kills / obstacles) are accepted alongside the result
 * so the offline games can contribute to the kills + obstacles boards.
 * The backend caps and clamps them; only loss/draw is accepted for `result`
 * (offline wins are not authoritative).
 *
 * @param {string} gameType                — "spit_royale" | "alpaca_road"
 * @param {'loss'|'draw'} result           — outcome
 * @param {{kills?:number,obstacles?:number}} [counters]
 */
export async function saveGameResult(gameType, result, counters = {}) {
  try {
    const payload = { gameType, result };
    if (typeof counters.kills === 'number' && counters.kills > 0) {
      payload.kills = Math.floor(counters.kills);
    }
    if (typeof counters.obstacles === 'number' && counters.obstacles > 0) {
      payload.obstacles = Math.floor(counters.obstacles);
    }
    await api.post('/game/result', payload);
  } catch (err) {
    devError('Failed to save game result:', err);
  }
}
