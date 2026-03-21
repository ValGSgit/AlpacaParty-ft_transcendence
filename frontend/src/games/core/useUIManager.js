import { useEditMode } from "../components/editMode";
import { gEngine, gUI } from "./globals";

export function useUIManager() {

  const { removeHighlight, cancelPlacement } = useEditMode()

  const closeMenus = () => {
    if (gUI.alpacaShop) closeAlpacaShop();
    if (gUI.itemShop) closeItemShop();
    if (gUI.lightMenu) closeLightMenu();
    if (gUI.editMode) closeEditMode();
    if (gUI.shopMenu) closeShopMenu();
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
  }

  const closeShopMenu = () => {
    gUI.shopMenu = false
  }

  const openAlpacaShop = () => {
    gUI.alpacaShop = true
    gUI.shopMenu = false
  }

  const closeAlpacaShop = () => {
    gUI.alpacaShop = false
    gUI.shopMenu = true
  }

  const openAlpacaStats = () => {
    gUI.alpacaStats = true
  }

  const closeAlpacaStats = () => {
    gUI.alpacaStats = false
  }

  const openItemShop = () => {
    gUI.itemShop = true
    gUI.shopMenu = false
  }

  const closeItemShop = () => {
    gUI.itemShop = false
    gUI.shopMenu = true
  }

  const openLightMenu = () => {
    closeEditMode()
    gUI.lightMenu = true
  }

  const closeLightMenu = () => {
    gUI.lightMenu = false
  }

  return {
    closeMenus,
    openEditMode,
    closeEditMode,
    openShopMenu,
    closeShopMenu,
    openAlpacaShop,
    closeAlpacaShop,
    openAlpacaStats,
    closeAlpacaStats,
    openItemShop,
    closeItemShop,
    openLightMenu,
    closeLightMenu
  }
}
