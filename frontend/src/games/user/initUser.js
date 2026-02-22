
export function initUser() {
  //for loading data from backend also ?
  let coins = 5
  let pause = false
  let edit = false
  let selected = null
  let upgrades = 0
  let itemMenu = false
  return { coins, pause, edit, selected, upgrades, itemMenu }
}