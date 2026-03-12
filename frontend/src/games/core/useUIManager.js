import { useEditMode } from "../components/editMode";
import { gEngine, gUI } from "./globals";


export function useUIManager() {

  const { removeHighlight, cancelPlacement } = useEditMode()

  const closeMenus = () => {
    if (gUI.alpacaShop) closeAlpacaShop();
    if (gUI.itemShop) closeItemShop();
    if (gUI.lightMenu) closeLightMenu();
    if (gUI.editMode) closeEditMode();
  }

  const openEditMode = () => {
    gUI.editMode = true
    gEngine.value.controls.enabled = false
  }

  const closeEditMode = () => {
    removeHighlight()
    cancelPlacement()
    gUI.editMode = false
    gEngine.value.controls.enabled = true
  }

  const openShopMenu = () => {
    closeEditMode()
    gUI.shopMenu = true
    gUI.pause = true
  }

  const closeShopMenu = () => {
    //gUser.value.shop = false
    gUI.shopMenu = false
  }

  const openAlpacaShop = (newAlpaca) => {
    gUI.alpacaShop = true
    gUI.pause = false
    gUI.newAlpaca = newAlpaca // flag for creating new Alpaca
  }

  const closeAlpacaShop = () => {
    gUI.alpacaShop = false
    gUI.pause = true
    gUI.newAlpaca = false // flag for creating new Alpaca
  }

  const openItemShop = () => {
    gUI.itemShop = true
    gUI.pause = false
  }

  const closeItemShop = () => {
    gUI.itemShop = false
    gUI.pause = true
  }

  const openLightMenu = () => {
    closeEditMode()
    gUI.lightMenu = true
  }

  const closeLightMenu = () => {
    gUI.lightMenu = false
  }

  return { closeMenus, openEditMode, closeEditMode, openShopMenu, closeShopMenu, openAlpacaShop, closeAlpacaShop, openItemShop, closeItemShop, openLightMenu, closeLightMenu }
}
