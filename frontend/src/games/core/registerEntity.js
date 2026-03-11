import { gAlpacas, gCoins, gCollidable, gEditables, gItems } from './globals.js';

export function registerEntity(entity, type) {

  const model = entity.model ? entity.model : entity;
  model.userData.entityType = type;

  switch (type) {
    case 'alpaca':
      model.userData.isEditable = true;
      gAlpacas.push(entity);
      gCollidable.push(model);
      gEditables.push(model);
      break;

    case 'item':
      model.userData.isEditable = true;
      model.userData.isCollider = true;
      gItems.push(model);
      gCollidable.push(model);
      gEditables.push(model);
      break;

    case 'decoration':
      model.userData.isEditable = true;
      model.userData.isCollider = false;
      gItems.push(model);
      gEditables.push(model);
      break;

    case 'coin':
      model.userData.isEditable = false;
      model.userData.isCollider = false;
      gCoins.push(model);
      break;

    default:
      console.warn(`Registry Warning: Unknown entity type '${type}'`);
  }
}