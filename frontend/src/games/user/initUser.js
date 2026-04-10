import { CONST } from '../config/constants.js';
import { gMinigame } from '../core/globals.js';

export function initUser() {
  //TODO: for testing
  gMinigame.value.mode = 3;
  //for loading data from backend also ?
  let coins = 999
  let upgrades = 0
  let gameMode = 0
  let point = 0
  let hp = CONST.HP
  let name = "Alpaca 1"
  return { coins, upgrades, gameMode, point, hp, name }
}