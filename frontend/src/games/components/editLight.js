import { gScene } from "../core/globals"

export function editLight() {

  const setLight = (light) => {
    if (light === 0)
      return
    gScene.value.ambientLight.color.set(light)
    gScene.value.sunLight.color.set(light)
  }

  return { setLight }
}
