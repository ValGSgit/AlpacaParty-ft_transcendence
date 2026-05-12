import { CONST } from '../config/constants.js';
import { createAlpaca } from '../core/createObjects.js';
import { gMinigame, gPlayer, gScene, gUI } from '../core/globals.js';
import { registerEntity } from '../core/registerEntity.js';
import { getValidRandomPos } from '../utils/spawnRandomly.js';
import { setupEnvironment } from '../world/sceneBuilder.js';
import { changeFloorColor } from './utils.js';

export async function initSpitRoyalAI(playerCount, tempAlpacas) {
  gMinigame.value.mode = 1;
  setupEnvironment(gScene.value)
  changeFloorColor('#ff0000', '#550000')
  registerEntity(gPlayer.value, 'alpaca') // register the player back, important for collider!
  gScene.value.add(gPlayer.value.model)
  gMinigame.value.players.push({ id: 1, name: gPlayer.value.name, hp: CONST.HP, point: 0 });
  for (let i = 0; i < playerCount - 1; i++) {
    let alpaca;
    const data = await getValidRandomPos('/models/alpaca.glb', 1);
    if (tempAlpacas[i]) {
      alpaca = tempAlpacas[i]
      registerEntity(alpaca, 'alpaca')
      alpaca.model.position.set(data[0].position[0], data[0].position[1], data[0].position[2])
    }
    else
      alpaca = await createAlpaca(null, null, data[0].position, data[0].rotation, data[0].scale);
    gScene.value.add(alpaca.model)
  }

  gUI.cameraMode = 1
  gMinigame.value.isActive = true;
}

export async function initSpitRoyalOnline() {
  gMinigame.value.mode = 2;
  setupEnvironment(gScene.value);
  changeFloorColor('#ff0000', '#550000');
  registerEntity(gPlayer.value, 'alpaca');
  gScene.value.add(gPlayer.value.model);
  gUI.cameraMode = 1;

  gMinigame.value.isActive = true;
}
