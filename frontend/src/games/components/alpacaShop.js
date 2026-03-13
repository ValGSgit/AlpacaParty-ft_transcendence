import { reactive } from 'vue';
import { CONST } from '../config/constants';
import { createAlpaca } from '../core/createObjects';
import { gUser } from "../core/globals";
import { useUIManager } from "../core/useUIManager";
import { setupPlacement } from './editMode';

export function alpacaShop() {
  const { closeMenus } = useUIManager()

  async function buyAlpaca() {
    if (gUser.value.coins >= CONST.ALPACA_COST) {
      console.log("buy alpaca!");
      const pos = [0, 0, 0];
      const s = alpacaConfig.scale;
      const scale = [s, s, s];
      const alpaca = await createAlpaca(
        alpacaConfig.name,
        alpacaConfig.color,
        pos,
        0,
        scale);
      alpaca.model.userData.cost = 1;
      resetAlpacaConfig();
      closeMenus();
      setupPlacement(alpaca.model);

      // const model = await createItem('/models/tree.glb');
      // model.userData.cost = 1;
      // closeMenus();
      // setupPlacement(model);

    }
    else
      alert('Not enough coins!')
    //closeMenus();
  }

  return { buyAlpaca }
}

const defaultAlpaca = {
  name: 'New Alpaca',
  color: '#634632',
  scale: 1.0
}

export const alpacaConfig = reactive({ ...defaultAlpaca });
export const resetAlpacaConfig = () => {
  Object.assign(alpacaConfig, defaultAlpaca);
}