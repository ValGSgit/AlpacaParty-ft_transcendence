import { CONST } from '../config/constants.js';

export function initUser() {
  //for loading data from backend also ?
  let coins = 5
  let upgrades = 0
  let gameMode = 0
  let point = 0
  let hp = CONST.HP
  let name = "Alpaca 1"
  let point2p = -1
  let point3p = -1
  let point4p = -1
  let hp2p = -1
  let hp3p = -1
  let hp4p = -1
  let name2p = "Alpaca 2"
  let name3p = "Alpaca 3"
  let name4p = "Alpaca 4"
  return { coins, upgrades, gameMode, point, hp, point2p, point3p, point4p, hp2p, hp3p, hp4p, name, name2p, name3p, name4p }
}