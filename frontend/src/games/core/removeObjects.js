import { gAlpacas, gCoins, gCollidable, gEditables, gItems, gScene } from "./globals";

export function removeObject(model) {
  const alpacaIndex = gAlpacas.findIndex(alpaca => alpaca.model === model);
  if (alpacaIndex > -1) gAlpacas.splice(alpacaIndex, 1);

  const itemIndex = gItems.indexOf(model);
  if (itemIndex > -1) gItems.splice(itemIndex, 1);

  const editIndex = gEditables.indexOf(model);
  if (editIndex > -1) gEditables.splice(editIndex, 1);

  const colliderIndex = gCollidable.indexOf(model);
  if (colliderIndex > -1) gCollidable.splice(colliderIndex, 1);

  const coinIndex = gCoins.indexOf(model)
  if (coinIndex > -1) gCoins.splice(coinIndex, 1);

  gScene.value.remove(model);
}