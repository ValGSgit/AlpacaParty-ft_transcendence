import { CONST } from '../config/constants.js';

export function initUser() {
  //for loading data from backend also ?
  let coins = 5
  let upgrades = 0
  let gameMode = 0
  let point = 0
  let hp = CONST.HP
  return { coins, upgrades, gameMode, point, hp }
}