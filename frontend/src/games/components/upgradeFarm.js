import * as THREE from 'three';
import { CONST } from '../config/constants.js';
import { createDecoration } from '../core/createObjects.js';
import { shopItems } from '../core/entities/Item.js';
import { gCollidables, gScene, gUser } from '../core/globals.js';
import { getModel } from '../core/modelCache.js';
import { attachCollider } from '../core/useCollider.js';
import { usePhysics } from '../core/usePhysics.js';
import { getRandomRot, getRandomScale } from '../utils/randomValues.js';

const UPGRADE_COST = [25, 50, 100, 250, 500];
const HERDSIZE_COST = [5, 15, 25, 50, 100];
const HERDSIZES = [3, 5, 7, 10, 15, 20];

export function upgradeFarm() {

  const increaseFarmSize = async (level) => {
    const cost = getUpgradeCost(level);

    if (cost === "Max" || level >= UPGRADE_COST.length) {
      alert("You reached max upgrades!");
      return;
    }
    if (!checkCoinsPrice(cost)) return;

    const floor = gScene.value.floor
    gUser.value.coins -= cost;
    gUser.value.upgrades++;
    floor.scale.x = CONST.FLOOR_RADIUS / CONST.BASE_RADIUS
    floor.scale.z = CONST.FLOOR_RADIUS / CONST.BASE_RADIUS

    const grass = shopItems.find(item => item.name === 'Grass');
    const newGrassGroup = await spawnGrassInRing(grass, 10);
    gScene.value.add(newGrassGroup);

    const stones = shopItems.find(item => item.name === 'Stones');
    const stonesGroup = await spawnGrassInRing(stones, 3);
    gScene.value.add(stonesGroup);

    const tree = shopItems.find(item => item.name === 'Tree');
    const treeGroup = await spawnGrassInRing(tree, 2);
    gScene.value.add(treeGroup);
  }
  return { increaseFarmSize }
}

export function getUpgradeCost(level) {
  if (level >= UPGRADE_COST.length) return "Max";
  return UPGRADE_COST[level];
}

export function checkCoinsPrice(cost) {
  if (gUser.value.coins < cost) {
    alert('Not enough coins!');
    return false;
  }
  return true;
}

async function spawnGrassInRing(object, amount) {
  const itemsGroup = new THREE.Group();
  const itemsData = await getRandomPointInRing(object.path, amount, CONST.FLOOR_RADIUS - 5, CONST.FLOOR_RADIUS);

  for (const data of itemsData) {
    const item = await createDecoration(data.path, data.position, data.rotation, data.scale);
    if (item && item.model) {
      item.model.userData.cost = object.cost;
    }
    itemsGroup.add(item.model);
  }
  return itemsGroup;
}

async function getRandomPointInRing(path, amount, oldRadius, newRadius) {
  const itemsData = [];
  const { checkCollisionWith } = usePhysics();
  const { model } = await getModel(path);
  const dummy = model.clone();
  attachCollider(dummy);

  for (let i = 0; i < amount; i++) {
    let isColliding = true;
    let attempts = 0;
    let pos = new THREE.Vector3();
    let scale = getRandomScale();
    let rot = getRandomRot();
    dummy.scale.copy(scale);
    dummy.rotation.y = rot;

    while (isColliding && attempts < 100) {
      const angle = Math.random() * Math.PI * 2;

      // 2. Calculate the evenly distributed radius using the area math
      const rInnerSq = oldRadius * oldRadius;
      const rOuterSq = newRadius * newRadius;
      const randomRadius = Math.sqrt(Math.random() * (rOuterSq - rInnerSq) + rInnerSq);

      // 3. Convert the angle and radius back into X and Z coordinates
      const x = Math.cos(angle) * randomRadius;
      const z = Math.sin(angle) * randomRadius;
      dummy.position.x = x;
      dummy.position.z = z;
      dummy.updateMatrixWorld(true);
      isColliding = checkCollisionWith(dummy, gCollidables);
      if (!isColliding) {
        pos.set(x, 0, z);
      }
      attempts++;
    }
    if (!isColliding) {
      itemsData.push({
        path: path,
        position: pos.toArray(),
        rotation: rot,
        scale: scale.toArray()
      })
    }
  }
  return itemsData;
}