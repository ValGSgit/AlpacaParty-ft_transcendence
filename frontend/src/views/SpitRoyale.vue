<template>
  <section class="spit-royale" ref="root">
    <!-- ── Lobby ─────────────────────────────────────────────────────────── -->
    <div id="lobby" class="lobby">
      <div class="emoji">🦙</div>
      <h1>Alpaca Spit Royale</h1>
      <p class="subtitle">Last alpaca standing wins</p>

      <div class="name-row">
        <input
          id="name-input"
          v-model="playerName"
          type="text"
          maxlength="16"
          placeholder="Your alpaca name..."
          :class="{ 'input-error': nameError }"
          @keydown.enter.prevent="start"
          @input="nameError = ''"
        />
        <span class="char-count" :class="{ 'char-count--max': playerName.length >= 16 }">
          {{ playerName.length }}/16
        </span>
      </div>
      <p v-if="nameError" class="name-error-msg">{{ nameError }}</p>

      <div class="btn-row">
        <button id="play-btn" @click="start" :disabled="isQueuing">
          {{ isQueuing ? '🔍 Searching…' : '🦙 Multiplayer' }}
        </button>
        <button id="survival-btn" @click="startSurvival" :disabled="isQueuing">⚔️ Survival</button>
      </div>

      <div class="live-matches">
        <div class="live-header">
          <h2>Live Matches</h2>
          <button type="button" @click="refreshMatches">↻ Refresh</button>
        </div>
        <div v-if="liveMatches.length === 0" class="live-empty">No active matches right now.</div>
        <div v-else class="live-list">
          <div v-for="match in liveMatches" :key="match.id" class="live-card">
            <div class="live-row">
              <span class="live-id">#{{ match.id }}</span>
              <span class="live-state" :class="`state-${match.state}`">{{ match.state }}</span>
            </div>
            <div class="live-players">
              <span v-for="p in match.players" :key="p.id">
                {{ p.name }}<em v-if="!p.connected"> (reconnecting)</em>
              </span>
            </div>
            <div class="live-meta">👁 {{ match.spectators }} watching</div>
            <button type="button" @click="spectate(match.id)">Spectate</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ── 3-D canvas ────────────────────────────────────────────────────── -->
    <div id="canvas-container"></div>

    <!-- ── HUD ──────────────────────────────────────────────────────────── -->
    <div id="hud">
      <div id="player-cards"></div>
      <div id="crosshair"></div>
      <div id="status-msg" class="hidden"></div>

      <div id="post-game-actions" class="hidden">
        <button id="btn-rematch" type="button">Rematch</button>
        <button id="btn-requeue" type="button">Quick Play</button>
      </div>

      <!-- Powerup icons — each has an inner .pu-bar for duration animation -->
      <div id="powerup-bar">
        <div id="pu-speed"      class="powerup-icon" title="Speed">💨<div class="pu-bar"></div></div>
        <div id="pu-shield"     class="powerup-icon" title="Shield">🛡️<div class="pu-bar"></div></div>
        <div id="pu-bigspit"    class="powerup-icon" title="Big Spit">💧<div class="pu-bar"></div></div>
        <div id="pu-heal"       class="powerup-icon" title="Heal">💚<div class="pu-bar"></div></div>
        <div id="pu-triplespit" class="powerup-icon" title="Triple Spit">💦<div class="pu-bar"></div></div>
      </div>

      <div id="wave-info" style="display:none">
        <span class="wave-badge">WAVE <span id="wave-num">1</span></span>
        <span class="sep">|</span>
        <span class="enemy-badge">👿 <span id="enemy-count">0</span> left</span>
      </div>

      <div id="kill-feed"></div>

      <div id="controls-hint">
        WASD · move<br>Mouse · aim<br>Click / Space · spit
      </div>

      <!-- Ping indicator — shown when in game -->
      <div id="ping-display" class="hidden"></div>
    </div>
  </section>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { useAuthStore } from '../stores/auth.js'
import { SpitRoyaleClient } from '../spitroyale/SpitRoyaleClient.js'

const root        = ref(null)
const playerName  = ref('')
const liveMatches = ref([])
const nameError   = ref('')
const isQueuing   = ref(false)
const authStore   = useAuthStore()
let client = null

const start = () => {
  nameError.value = ''
  if (!playerName.value.trim()) {
    nameError.value = 'Enter an alpaca name to play!'
    return
  }
  if (!client) return
  isQueuing.value = true
  localStorage.setItem('alpacaName', playerName.value.trim())
  client.connect(playerName.value.trim())
}

const startSurvival = () => {
  nameError.value = ''
  if (!playerName.value.trim()) {
    nameError.value = 'Enter an alpaca name to play!'
    return
  }
  if (!client) return
  isQueuing.value = true
  localStorage.setItem('alpacaName', playerName.value.trim())
  client.connectSurvival(playerName.value.trim())
}

const refreshMatches = () => {
  client?.requestLiveMatches()
}

const spectate = (matchId) => {
  if (!client) return
  client.connect(playerName.value.trim() || authStore.user?.username || '')
  client.spectateMatch(matchId)
}

onMounted(() => {
  const saved = localStorage.getItem('alpacaName')
  playerName.value = saved || authStore.user?.username || ''
  client = new SpitRoyaleClient(root.value)
  client.onLiveMatches = (matches) => {
    liveMatches.value = matches.filter((m) => m.state === 'playing' || m.state === 'lobby')
  }
  client.onGameJoined = () => {
    isQueuing.value = false
  }
  client.onDisconnected = () => {
    isQueuing.value = false
  }
})

onUnmounted(() => {
  client?.destroy()
})
</script>

<style scoped>
.spit-royale      { position: fixed; inset: 0; background: #0d0d0d; overflow: hidden; }
#canvas-container { position: fixed; inset: 0; }
#hud              { position: fixed; inset: 0; pointer-events: none; display: none; z-index: 50; }

/* ── Lobby ──────────────────────────────────────────────────────────────── */
.lobby {
  position: fixed; inset: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  background: linear-gradient(135deg, #1a0533 0%, #0d2137 50%, #0d330d 100%);
  z-index: 100;
}

.lobby h1 {
  font-size: clamp(2.5rem, 6vw, 5rem);
  font-weight: 900;
  letter-spacing: -2px;
  background: linear-gradient(90deg, #f4a261, #e9c46a, #2a9d8f);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 0.25rem;
}

.subtitle {
  color: #aaa; font-size: 1.1rem; margin-bottom: 2.5rem;
  letter-spacing: 2px; text-transform: uppercase;
}

.emoji { font-size: 5rem; margin-bottom: 1rem; animation: bounce 1.5s ease-in-out infinite; }

/* Name input row */
.name-row {
  position: relative;
  width: 280px;
  margin-bottom: 0.35rem;
}

#name-input {
  width: 100%;
  box-sizing: border-box;
  padding: 0.75rem 3rem 0.75rem 1.25rem;
  border: 2px solid #f4a261;
  border-radius: 999px;
  background: rgba(255,255,255,0.05);
  color: #fff;
  font-size: 1.1rem;
  text-align: center;
  outline: none;
  transition: border-color 0.15s;
}

#name-input.input-error { border-color: #f87171; }
#name-input:focus       { border-color: #e9c46a; }

.char-count {
  position: absolute;
  right: 14px; top: 50%;
  transform: translateY(-50%);
  font-size: 0.7rem;
  color: rgba(255,255,255,0.35);
  pointer-events: none;
}
.char-count--max { color: #f87171; }

.name-error-msg {
  color: #f87171;
  font-size: 0.82rem;
  margin: 0 0 0.6rem;
  animation: fadeIn 0.2s ease;
}

.btn-row { display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; margin-top: 0.65rem; }

#play-btn {
  padding: 0.85rem 3rem;
  border: none; border-radius: 999px;
  background: linear-gradient(90deg, #f4a261, #e76f51);
  color: #fff; font-size: 1.15rem; font-weight: 700;
  cursor: pointer; transition: transform 0.15s, box-shadow 0.15s, opacity 0.15s;
  box-shadow: 0 4px 24px rgba(244,162,97,0.4);
}
#play-btn:not(:disabled):hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(244,162,97,0.5); }
#play-btn:disabled              { opacity: 0.6; cursor: default; }

#survival-btn {
  padding: 0.85rem 3rem; border: none; border-radius: 999px;
  background: linear-gradient(90deg, #c62828, #880e4f);
  color: #fff; font-size: 1.15rem; font-weight: 700;
  cursor: pointer; transition: transform 0.15s, box-shadow 0.15s, opacity 0.15s;
  box-shadow: 0 4px 24px rgba(198,40,40,0.4);
}
#survival-btn:not(:disabled):hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(198,40,40,0.55); }
#survival-btn:disabled              { opacity: 0.6; cursor: default; }

/* Live matches */
.live-matches {
  margin-top: 1.25rem; width: min(680px, 92vw); max-height: 40vh;
  background: rgba(0,0,0,0.45);
  border: 1px solid rgba(255,255,255,0.12); border-radius: 16px;
  padding: 12px; overflow: auto;
}
.live-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.live-header h2 { margin: 0; font-size: 1rem; color: #f7e7c6; }
.live-header button {
  border: 1px solid rgba(255,255,255,0.28); background: rgba(255,255,255,0.08);
  color: #fff; border-radius: 999px; padding: 0.3rem 0.8rem; cursor: pointer;
}
.live-empty   { color: rgba(255,255,255,0.65); font-size: 0.9rem; }
.live-list    { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; }
.live-card    { background: rgba(8,8,8,0.62); border: 1px solid rgba(255,255,255,0.12); border-radius: 12px; padding: 10px; text-align: left; }
.live-row     { display: flex; justify-content: space-between; color: #f4a261; font-size: 0.8rem; }
.live-players { margin: 6px 0; display: flex; flex-direction: column; gap: 2px; color: #fff; font-size: 0.85rem; }
.live-players em { color: #e9c46a; font-style: normal; }
.live-meta    { color: rgba(255,255,255,0.66); font-size: 0.75rem; margin-bottom: 8px; }
.live-state   { font-weight: 700; }
.state-playing { color: #4ade80; }
.state-lobby   { color: #fbbf24; }
.live-card button {
  width: 100%; border: 1px solid rgba(244,162,97,0.5);
  background: rgba(244,162,97,0.12); color: #fff;
  border-radius: 8px; padding: 0.35rem 0.7rem; cursor: pointer;
}

/* ── HUD ────────────────────────────────────────────────────────────────── */
#player-cards {
  position: absolute; top: 16px; left: 50%; transform: translateX(-50%); display: flex; gap: 12px;
}
.player-card {
  background: rgba(0,0,0,0.6); border: 2px solid rgba(255,255,255,0.15);
  border-radius: 12px; padding: 8px 14px; min-width: 140px;
  backdrop-filter: blur(6px);
}
.player-card.local-card { border-color: rgba(244,162,97,0.6); }
.player-name  { font-size: 0.8rem; color: #ccc; margin-bottom: 4px; font-weight: 600; letter-spacing: 1px; }
.health-bar-bg { height: 10px; background: rgba(255,255,255,0.1); border-radius: 999px; overflow: hidden; }
.health-bar    { height: 100%; border-radius: 999px; transition: width 0.15s; }

#crosshair { position: absolute; top: 50%; left: 50%; width: 24px; height: 24px; transform: translate(-50%, -50%); }
#crosshair::before, #crosshair::after { content: ''; position: absolute; background: rgba(255,255,255,0.7); border-radius: 999px; }
#crosshair::before { width: 2px; height: 100%; left: 50%; transform: translateX(-50%); }
#crosshair::after  { height: 2px; width: 100%; top: 50%; transform: translateY(-50%); }

#status-msg {
  position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
  background: rgba(0,0,0,0.75); color: #fff;
  font-size: clamp(1.2rem, 3vw, 2rem); font-weight: 800;
  padding: 1rem 2.5rem; border-radius: 16px;
  border: 2px solid rgba(255,255,255,0.2);
  backdrop-filter: blur(8px); text-align: center; letter-spacing: 1px;
  pointer-events: none;
}
.hidden { opacity: 0; pointer-events: none !important; }

#post-game-actions {
  position: absolute; top: calc(50% + 72px); left: 50%; transform: translateX(-50%);
  display: flex; gap: 10px; pointer-events: auto; transition: opacity 0.2s ease;
}
#post-game-actions.hidden { opacity: 0; pointer-events: none; }
#post-game-actions button {
  padding: 0.7rem 1.1rem; border-radius: 999px;
  border: 1px solid rgba(255,255,255,0.35);
  background: rgba(10,10,10,0.72); color: #fff;
  font-size: 0.9rem; font-weight: 700; letter-spacing: 0.4px; cursor: pointer;
  transition: border-color 0.15s, opacity 0.15s;
}
#post-game-actions button:hover    { border-color: rgba(244,162,97,0.8); }
#post-game-actions button:disabled { opacity: 0.5; cursor: default; }

/* Powerup bar */
#powerup-bar {
  position: absolute; bottom: 24px; left: 50%; transform: translateX(-50%);
  display: flex; gap: 10px; align-items: center;
}
.powerup-icon {
  position: relative; overflow: hidden;
  width: 48px; height: 48px;
  background: rgba(0,0,0,0.6); border-radius: 12px;
  border: 2px solid rgba(255,255,255,0.2);
  display: flex; align-items: center; justify-content: center;
  font-size: 1.6rem;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.powerup-icon.active {
  border-color: #f4a261;
  box-shadow: 0 0 14px rgba(244,162,97,0.65);
}

/* Duration drain bar at the bottom of each icon */
.pu-bar {
  position: absolute; bottom: 0; left: 0; right: 0; height: 4px;
  background: #f4a261;
  transform-origin: left center;
  transform: scaleX(0);
  border-radius: 0 0 9px 9px;
}
.powerup-icon.active .pu-bar {
  animation: pu-drain var(--pu-duration, 5000ms) linear forwards;
}
@keyframes pu-drain {
  from { transform: scaleX(1); }
  to   { transform: scaleX(0); }
}

/* Wave info */
#wave-info {
  position: absolute; top: 16px; right: 16px;
  align-items: center; gap: 10px;
  background: rgba(0,0,0,0.6); border: 2px solid rgba(198,40,40,0.5);
  border-radius: 12px; padding: 8px 16px;
  backdrop-filter: blur(6px);
  font-size: 0.85rem; color: #ccc; font-weight: 600; pointer-events: none;
}
.wave-badge  { font-size: 1.1rem; font-weight: 800; color: #ef9a9a; letter-spacing: 1px; }
.sep         { color: rgba(255,255,255,0.25); }
.enemy-badge { color: #ff8a80; font-size: 0.95rem; }

/* Kill feed */
#kill-feed {
  position: absolute; bottom: 80px; right: 16px;
  display: flex; flex-direction: column-reverse; gap: 6px; max-width: 260px;
}
.kill-entry {
  background: rgba(0,0,0,0.6); border-radius: 8px; padding: 4px 10px;
  font-size: 0.78rem; color: #e9c46a; border-left: 3px solid #e76f51;
  animation: slideIn 0.2s ease;
}

/* Controls hint */
#controls-hint {
  position: absolute; bottom: 24px; left: 16px;
  color: rgba(255,255,255,0.35); font-size: 0.75rem; line-height: 1.7;
}

/* Ping display */
#ping-display {
  position: absolute; bottom: 8px; right: 16px;
  font-size: 0.7rem; font-weight: 700; letter-spacing: 0.5px;
  padding: 2px 8px; border-radius: 6px;
  backdrop-filter: blur(4px);
}
.ping-good { color: #4ade80; background: rgba(74,222,128,0.12); }
.ping-mid  { color: #fbbf24; background: rgba(251,191,36,0.12); }
.ping-bad  { color: #f87171; background: rgba(248,113,113,0.15); }

/* Floating damage numbers */
.damage-number {
  position: absolute;
  font-size: 1.1rem; font-weight: 900;
  color: #fbbf24;
  text-shadow: 0 2px 6px rgba(0,0,0,0.9);
  pointer-events: none; z-index: 200;
  transform: translateX(-50%);
  animation: dmg-float 0.85s ease-out forwards;
  font-variant-numeric: tabular-nums;
}
.damage-number--self {
  font-size: 1.45rem;
  color: #f87171;
}
@keyframes dmg-float {
  from { opacity: 1; transform: translateX(-50%) translateY(0); }
  to   { opacity: 0; transform: translateX(-50%) translateY(-68px); }
}

/* Misc animations */
@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50%       { transform: translateY(-12px); }
}
@keyframes fadeIn  {
  from { opacity: 0; transform: translateY(-4px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes slideIn {
  from { opacity: 0; transform: translateX(20px); }
  to   { opacity: 1; transform: translateX(0); }
}
</style>
