import { Game } from './game/Game.js';
import { UI }   from './game/UI.js';

let game  = null;
let ui    = null;
let ws    = null;
let localPlayerId = null;
let inputInterval = null;
let isSurvival    = false;

// ── Lobby ───────────────────────────────────────────────────────────────────
const lobby       = document.getElementById('lobby');
const playBtn     = document.getElementById('play-btn');
const survivalBtn = document.getElementById('survival-btn');
const nameInput   = document.getElementById('name-input');

nameInput.value = loadName();

playBtn.addEventListener('click',    () => joinGame('multiplayer'));
survivalBtn.addEventListener('click', () => joinGame('survival'));
nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') joinGame('multiplayer'); });

function loadName() { return localStorage.getItem('alpacaName') || ''; }
function saveName(n) { localStorage.setItem('alpacaName', n); }

// ── Network ─────────────────────────────────────────────────────────────────
function joinGame(mode = 'multiplayer') {
  isSurvival = mode === 'survival';

  const name = nameInput.value.trim() || `Alpaca_${Math.random().toString(36).slice(2, 6)}`;
  saveName(name);

  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const base      = import.meta.env.BASE_URL.replace(/\/$/, '');
  ws = new WebSocket(`${protocol}//${location.host}${base}/ws`);

  ws.addEventListener('open', () => {
    ws.send(JSON.stringify({ type: isSurvival ? 'join_survival' : 'join', name }));
  });

  ws.addEventListener('message', e => {
    let msg;
    try { msg = JSON.parse(e.data); } catch { return; }
    handleMessage(msg);
  });

  ws.addEventListener('close', () => {
    ui?.showStatus('⚠ Disconnected. Reload to rejoin.', 0);
    if (inputInterval) clearInterval(inputInterval);
  });
}

// ── Survival enemy counter (tracks live enemies from tick state) ─────────────
let _survivalEnemyCount = 0;

function updateSurvivalEnemyCount(players) {
  const alive = players.filter(p => p.isBot && p.alive).length;
  if (alive !== _survivalEnemyCount) {
    _survivalEnemyCount = alive;
    document.getElementById('enemy-count').textContent = alive;
  }
}

// ── Message Handler ──────────────────────────────────────────────────────────
function handleMessage(msg) {
  switch (msg.type) {

    case 'joined': {
      localPlayerId = msg.playerId;
      ui   = new UI();
      game = new Game(document.getElementById('canvas-container'), localPlayerId);
      ui.show();

      game.onSpit = (angle) => ws.send(JSON.stringify({ type: 'spit', angle }));

      // Input loop at ~30 Hz
      inputInterval = setInterval(() => {
        if (ws.readyState !== WebSocket.OPEN) return;
        ws.send(JSON.stringify(game.getInputPacket()));
      }, 33);

      // Pre-build enemy mesh pool now (before first wave arrives) to avoid
      // geometry allocation spikes during gameplay.
      if (msg.isSurvival) game.initSurvivalPool(12);

      game.applyState(msg.state);
      ui.updatePlayers(msg.state.players, localPlayerId);
      ui.showStatus(
        msg.isSurvival ? '⚔️ SURVIVAL — get ready…' : '🦙 Waiting for players…',
        0,
      );
      break;
    }

    case 'player_joined': {
      ui?.showStatus(`${msg.name} joined! 🦙`, 2500);
      game?.applyState(msg.state);
      ui?.updatePlayers(msg.state.players, localPlayerId);
      break;
    }

    case 'player_left': {
      game?.applyState(msg.state);
      ui?.updatePlayers(msg.state.players, localPlayerId);
      break;
    }

    case 'countdown': {
      ui?.showStatus(`🦙 Game starts in ${msg.seconds}s…`, 0);
      break;
    }

    case 'game_start': {
      game?.applyState(msg.state);
      ui?.updatePlayers(msg.state.players, localPlayerId);
      ui?.showStatus(isSurvival ? '⚔️ SURVIVE!' : '🦙 SPIT IT!', 2000);
      if (!isSurvival) {
        // Hide survival HUD elements in multiplayer
        ui?.hideSurvivalHud();
        const kc = document.getElementById('kill-counter');
        if (kc) kc.style.display = 'none';
      }
      break;
    }

    case 'tick': {
      game?.applyState(msg.state);
      ui?.updatePlayers(msg.state.players, localPlayerId);
      if (isSurvival) {
        updateSurvivalEnemyCount(msg.state.players);
        if (msg.state.totalKills !== undefined) ui?.setKills(msg.state.totalKills);
      }
      break;
    }

    case 'player_hit': {
      const state   = game?.lastState;
      const victim  = state?.players.find(p => p.id === msg.targetId);
      const attacker = state?.players.find(p => p.id === msg.ownerId);
      if (victim && attacker) {
        game?.onSpitImpact(msg.x, msg.z, false);
        if (msg.targetId === localPlayerId && game) game.shakeIntensity = 0.4;
      }
      break;
    }

    case 'shield_block': {
      const entry = game?.alpacaMeshes[msg.playerId];
      if (entry) game?.onShieldBlock(entry.group.position.x, entry.group.position.z);
      break;
    }

    case 'player_eliminated': {
      const state      = game?.lastState;
      const victim     = state?.players.find(p => p.id === msg.id);
      const killer     = state?.players.find(p => p.id === msg.killerId);
      const killerName = killer ? killer.name : 'someone';
      if (victim) {
        game?.onElimination(msg.id);
        if (victim.isBot) {
          ui?.addKillFeedEntry(`⚔️ You spat out ${victim.name}!`);
        } else {
          ui?.addKillFeedEntry(`💀 ${victim.name} spat out by ${killerName}`);
          if (msg.id === localPlayerId) ui?.showStatus('🦙 You got spat out! Watch the battle…', 0);
        }
      }
      break;
    }

    case 'powerup_collected': {
      const entry = game?.alpacaMeshes[msg.playerId];
      if (entry) game?.onPowerupPickup(entry.group.position.x, entry.group.position.z, msg.powerupType);
      if (msg.playerId === localPlayerId) {
        ui?.activatePowerupIcon(msg.powerupType);
        const label = { speed: '💨 Speed Boost!', shield: '🛡️ Shield!', bigSpit: '💧 Big Spit!', heal: '💚 Healed!' };
        ui?.showStatus(label[msg.powerupType] || 'Power UP!', 1800);
      }
      break;
    }

    // ── Survival-only messages ─────────────────────────────────────────────

    case 'wave_start': {
      game?.applyState(msg.state);
      ui?.updatePlayers(msg.state.players, localPlayerId);
      ui?.setWave(msg.wave, msg.botCount);
      _survivalEnemyCount = msg.botCount;
      ui?.showStatus(`🌊 Wave ${msg.wave} — ${msg.botCount} enemies incoming!`, 2500);
      // Show kill counter
      const kc = document.getElementById('kill-counter');
      if (kc) kc.style.display = 'block';
      break;
    }

    case 'wave_complete': {
      ui?.showStatus(`✅ Wave ${msg.wave} clear! ${msg.kills} kills — next wave in 3s…`, 2800);
      ui?.setKills(msg.kills);
      break;
    }

    case 'survival_over': {
      game?.applyState(msg.state);
      ui?.updatePlayers(msg.state.players, localPlayerId);
      ui?.showStatus(`💀 You fell on wave ${msg.wave}! Total kills: ${msg.kills}`, 0);
      ui?.addKillFeedEntry(`Game over — wave ${msg.wave} · ${msg.kills} kills`);
      setTimeout(() => ui?.showStatus('⚔️ New run in 5s…', 0), 3000);
      break;
    }

    // ── Multiplayer end ───────────────────────────────────────────────────
    case 'game_over': {
      if (isSurvival) break; // survival uses survival_over
      game?.applyState(msg.state);
      ui?.updatePlayers(msg.state.players, localPlayerId);
      const isWinner = msg.state.players.find(p => p.name === msg.winner && p.id === localPlayerId);
      if (isWinner) {
        ui?.showStatus(`🏆 YOU WIN, ${msg.winner}! 🦙`, 0);
      } else {
        ui?.showStatus(`🦙 ${msg.winner} wins! New round in 5s…`, 0);
      }
      break;
    }
  }
}
