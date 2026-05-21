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
 * @param {string} gameType - e.g. "spit_royale", "alpaca_road"
 * @param {'win'|'loss'|'draw'} result - Game outcome
 */
export async function saveGameResult(gameType, result) {
  try {
    await api.post('/game/result', { gameType, result });
  } catch (err) {
    devError('Failed to save game result:', err);
  }
}
