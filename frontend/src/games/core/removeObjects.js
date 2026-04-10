import { gAlpacas, gCollectables, gCollidables, gEditables, gItems } from "./globals";

export function removeObject(entity) {
  const model = entity.model ? entity.model : entity;

  removeFromArray(entity, gAlpacas);
  removeFromArray(entity, gItems);
  removeFromArray(entity, gCollectables);

  removeFromArray(model, gCollidables);
  removeFromArray(model, gEditables);

  if (model && model.parent) {
    model.removeFromParent()
    removeMatsAndGeo(model);
  }
}

export function removeFromArray(item, array) {
  const index = array.indexOf(item);
  if (index > -1) {
    array.splice(index, 1);
  }
}

function removeMatsAndGeo(model) {
  model.traverse((child) => {
    if (child.isMesh) {
      child.geometry.dispose();
      if (child.material.isMaterial) {
        child.material.dispose();
      } else if (Array.isArray(child.material)) {
        child.material.forEach(mat => mat.dispose());
      }
    }
  });
}