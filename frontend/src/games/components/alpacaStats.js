import { gPlayer } from "../core/globals"


export function alpacaStats() {

  const changeSpeed = (speed) => {
    const newSpeed = gPlayer.value.speedOffset + speed * 0.1
    if (newSpeed < -0.1 || newSpeed > 0.1) // range check
      alert("speed out of range")
    else
      gPlayer.value.speedOffset = newSpeed
  }

}

