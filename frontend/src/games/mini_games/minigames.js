import { gMinigame } from "../core/globals";
import { updateAlpacaRoad } from "./alpacaRoad";
import { updateSpitRoyal } from "./spitRoyal";

export function updateMinigame(delta) {
  const mode = gMinigame.value.mode;
  switch (mode) {
    case 1:
      break;
    case 2:
      updateSpitRoyal(delta);
      break;
    case 3:
      updateAlpacaRoad(delta);
      break;
    case 4:
      updateAlpacaRoad(delta);
      break;
    default:
      return;
  }
}