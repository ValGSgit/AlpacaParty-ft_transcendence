import { gScene } from '../core/globals.js';
import * as GRADIENT from "../utils/createGradient.js";

export function editLight() {

  const setLight = (light, color, intensity) => {
    if (light === 0) return;
    light.color.set(color);
    light.intensity = intensity;
  };



  const setTimeOfDay = (mode) => {
    if (!gScene.value) return;

    const ambient = gScene.value.ambientLight;
    const sun = gScene.value.sunLight;
    const scene = gScene.value;

    switch (mode) {
      case 'day':
        setLight(ambient, '#ffffff', 0.8);
        setLight(sun, '#ffffff', 1.2);
        scene.background = GRADIENT.Linear('#4abdff', '#142191')
        break;
      case 'sunset':
        setLight(ambient, '#ffd67e', 0.8);
        setLight(sun, '#ffb764', 1.2);
        scene.background = GRADIENT.Linear('#ffa6cb', '#ffa600')
        break;

      case 'night':
        setLight(ambient, '#333355', 0.8);
        setLight(sun, '#5555aa', 1.2);
        scene.background = GRADIENT.Linear('#1f316b', '#030614')
    }
  };

  return { setLight, setTimeOfDay };
}

