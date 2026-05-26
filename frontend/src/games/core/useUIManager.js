import api from '../../services/api.js';
import { useEditMode } from "../components/editMode";
import { changeGame } from '../mini_games/init.js';
import { gEditState, gMinigame, gUI } from "./globals";
import { changeEditModeCamera } from "./useCamera.js";

export function useUIManager() {

  const { removeHighlight, cancelPlacement } = useEditMode()

  const closeMenus = () => {
    if (gUI.editMode) closeEditMode();
    if (gUI.lightMenu) closeLightMenu();
    if (gUI.alpacaStats) closeAlpacaStats();

    if (gUI.shopMenu) closeShopMenu();
    if (gUI.alpacaShop) closeAlpacaShop();
    if (gUI.itemShop) closeItemShop();
    if (gUI.farmMenu) closeFarmMenu();

    if (gUI.gameMenu) closeGameMenu();
    if (gUI.lobbyMenu) closeLobbyMenu();

    if (gMinigame.value.mode === 5)
      changeGame(0)
  }

  const openEditMode = () => {
    gUI.editMode = true;
    gEditState.cameraMode = gUI.cameraMode;
    changeEditModeCamera();
  }

  const closeEditMode = () => {
    removeHighlight()
    cancelPlacement()
    gUI.editMode = false
    changeEditModeCamera();
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

  const closeMenuForPlacement = () => {
    gUI.itemShop = false
    gUI.alpacaShop = false
  }

  const openLightMenu = () => {
    closeEditMode()
    gUI.lightMenu = true
  }

  const closeLightMenu = () => {
    gUI.lightMenu = false
  }

  const openGameMenu = () => {
    closeEditMode()
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
    gUI.shopMenu = true
  }

  async function openLobbyMenu(game) {
    gUI.lobbyMenu = true
    gUI.gameMenu = false
    gMinigame.value.mode = game;
    gMinigame.value.lobby = []
    if (game === 5)
      await fetchFriends();
  }

  const closeLobbyMenu = () => {
    gUI.lobbyMenu = false
    if (gMinigame.value.mode !== 5) {
      gUI.gameMenu = true
    }
  }

  async function fetchFriends() {
    try {
      const { data } = await api.get('/friends')
      gMinigame.value.lobby = data.friends || []
    } catch { }
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
    closeLobbyMenu,
    closeMenuForPlacement
  }
}
