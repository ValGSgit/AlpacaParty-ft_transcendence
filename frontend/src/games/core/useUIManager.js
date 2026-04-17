import { useEditMode } from "../components/editMode";
import { changeGame } from '../mini_games/init.js';
import { gEngine, gUI, gMinigame } from "./globals";
import { SpitRoyaleClient } from '../mini_games/client.js';

export function useUIManager() {

  const { removeHighlight, cancelPlacement } = useEditMode()

  const closeMenus = () => {
    if (gUI.alpacaShop) closeAlpacaShop();
    if (gUI.itemShop) closeItemShop();
    if (gUI.lightMenu) closeLightMenu();
    if (gUI.editMode) closeEditMode();
    if (gUI.shopMenu) closeShopMenu();
    if (gUI.gameMenu) closeGameMenu();
    if (gUI.farmMenu) closeFarmMenu();
    if (gUI.farmMenu) closeLobbyMenu();
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

  const openGameMenu = () => {
    if (gMinigame.value.mode)
      changeGame()
    else
      gUI.gameMenu = true
  }

  const closeGameMenu = () => {
    gUI.gameMenu = false
  }

  const openFarmMenu = () => {
    gUI.farmMenu = true
    gUI.shopMenu = false
  }

  const closeFarmMenu = () => {
    gUI.farmMenu = false
  }

  let onlineClient = null;

  const openLobbyMenu = () => {
    gUI.lobbyMenu = true
    gUI.gameMenu = false
    onlineClient = new SpitRoyaleClient();
    onlineClient.check();
  }

  const closeLobbyMenu = () => {
    gUI.lobbyMenu = false
    gUI.gameMenu = true
    if (onlineClient)
      onlineClient.destroy();
  }


  return {
    closeMenus,
    openEditMode,
    closeFarmMenu,
    openFarmMenu,
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
    closeLightMenu,
    openGameMenu,
    closeGameMenu,
    openLobbyMenu,
    closeLobbyMenu
  }
}
