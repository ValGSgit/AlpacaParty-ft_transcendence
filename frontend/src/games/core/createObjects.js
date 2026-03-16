import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { markRaw } from 'vue';
import { Alpaca } from './entities/Alpaca.js';
import { Item } from './entities/Item.js';
import { getModel } from './modelCache.js';
import { registerEntity } from './registerEntity.js';
import { attachCollider } from './useCollider.js';

export async function createAlpaca(
  name = "Alpaca",
  color = null,
  position = [0, 0, 0],
  rotation = 0,
  scale = [1, 1, 1]
) {
  const path = '/models/alpaca.glb';
  const { model, animations } = await getModel(path);
  const clone = SkeletonUtils.clone(model);

  const alpaca = new Alpaca(clone, animations, {
    name, color, position, rotation, scale
  });

  attachCollider(alpaca.model);
  initFlags(alpaca.model);
  registerEntity(alpaca, 'alpaca');

  return markRaw(alpaca);
}

export async function createItem(
  path,
  position = [0, 0, 0],
  rotation = 0,
  scale = [1, 1, 1],
) {
  const { model, animations } = await getModel(path);
  const clone = SkeletonUtils.clone(model);
  const item = new Item(clone, animations, { position, rotation, scale });

  attachCollider(item.model);
  registerEntity(item, 'item');

  return markRaw(item);
}

// WIP: uses Item aswell (testing atm)
export async function createDecoration(
  path,
  position = [0, 0, 0],
  rotation = 0,
  scale = [1, 1, 1],
) {
  const { model, animations } = await getModel(path);
  const clone = SkeletonUtils.clone(model);
  const deco = new Item(clone, animations, { position, rotation, scale });

  attachCollider(deco.model);
  registerEntity(deco, 'decoration');
  return markRaw(deco);
}

const initFlags = (model) => {
  model.isMoving = false // this one is for doubleClick moving, not wasd
  model.isJumping = false
  model.isDead = 0 // 0 == normal, -1 == dying, 1 == dead
  model.isFalling = false
  model.currentAction = null
  model.target = null
  model.readyToMove = true
}
