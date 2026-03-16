import { ref } from 'vue';
import { gPlayer } from "../core/globals";

const updateVue = ref(0);

export function alpacaStats() {

  const changeSpeed = (amount) => {
    if (gPlayer.value) {
      gPlayer.value.changeSpeed(amount * 0.1);
    }
    updateVue.value++;
  }

  return { changeSpeed, updateVue };
}

