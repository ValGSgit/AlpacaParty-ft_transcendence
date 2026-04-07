import * as THREE from 'three';
import { createAlpaca, createCollectable, createDecoration, createItem } from "../core/createObjects";
import { gCollidables } from '../core/globals';
import { getModel } from '../core/modelCache';
import { attachCollider } from '../core/useCollider';
import { usePhysics } from "../core/usePhysics";
import { getRandomPos, getRandomRot, getRandomScale } from "./randomValues";


export async function spawnObjectRandomly(path, amount, type) {
  const itemsGroup = new THREE.Group();
  const itemsData = await getValidRandomPos(path, amount);

  for (const data of itemsData) {
    let item;
    switch (type) {
      case 'alpaca':
        item = await createAlpaca(null, null, data.position, data.rotation, data.scale);
        break;
      case 'item':
        item = await createItem(data.path, data.position, data.rotation, data.scale);
        break;
      case 'decoration':
        item = await createDecoration(data.path, data.position, data.rotation, data.scale);
        break;
      case 'collectable':
        data.scale = [0, 0, 0];
        item = await createCollectable(data.path, data.position, data.rotation, data.scale);
        break;
      default:
        console.warn(`Spawn Object Warning: Unknown entity type '${type}'`);
    }
    if (item && item.model) {
      itemsGroup.add(item.model)
    }
  }
  return itemsGroup;
}

export async function getValidRandomPos(path, amount) {
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
      pos.copy(getRandomPos());
      dummy.position.copy(pos);
      dummy.updateMatrixWorld(true);
      isColliding = checkCollisionWith(dummy, gCollidables);
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