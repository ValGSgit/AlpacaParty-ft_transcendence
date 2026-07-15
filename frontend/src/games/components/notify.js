import { gPlayer } from '../core/globals.js'
import { useFloatingText } from './floatingText.js'

const { spawnFloatingText } = useFloatingText()

/**
 * Show a transient in-game message anchored above the player.
 *
 * Replaces the old native `alert()` popups used for farm/shop feedback — those
 * froze the render loop and broke immersion. Falls back to no-op if there is no
 * player anchor (e.g. before the world is loaded).
 *
 * @param {string} message
 * @param {string} [type='warning'] floating-text style variant
 */
export function gameNotify(message, type = 'warning') {
  const anchor = gPlayer.value?.model
  if (!anchor) return
  spawnFloatingText(anchor, message, type)
}
