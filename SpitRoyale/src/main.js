import { Game } from './game/Game.js';
import { UI } from './game/UI.js';

let game = null;
let ui   = null;
let ws   = null;
let localPlayerId = null;
let inputInterval  = null;

// ── Lobby ──────────────────────────────────────────────────────────────────
const lobby    = document.getElementById('lobby');
const playBtn  = document.getElementById('play-btn');
const nameInput = document.getElementById('name-input');

nameInput.value = loadName();
playBtn.addEventListener('click', joinGame);
nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') joinGame(); });

function loadName() {
  return localStorage.getItem('alpacaName') || '';
}
function saveName(n) {
  localStorage.setItem('alpacaName', n);
}

// ── Network ────────────────────────────────────────────────────────────────
function joinGame() {
  const name = nameInput.value.trim() || `Alpaca_${Math.random().toString(36).slice(2, 6)}`;
  saveName(name);

  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  ws = new WebSocket(`${protocol}//${location.host}${base}/ws`);

  ws.addEventListener('open', () => {
    ws.send(JSON.stringify({ type: 'join', name }));
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

// ── Message Handler ────────────────────────────────────────────────────────
function handleMessage(msg) {
  switch (msg.type) {
    case 'joined': {
      localPlayerId = msg.playerId;
      ui   = new UI();
      game = new Game(document.getElementById('canvas-container'), localPlayerId);
      ui.show();

      game.onFrame = (dt) => {
        // Send input continuously
      };
      game.onSpit = (angle) => {
        ws.send(JSON.stringify({ type: 'spit', angle }));
      };

      // Input loop at ~30Hz
      inputInterval = setInterval(() => {
        if (ws.readyState !== WebSocket.OPEN) return;
        ws.send(JSON.stringify(game.getInputPacket()));
      }, 33);

      game.applyState(msg.state);
      ui.updatePlayers(msg.state.players, localPlayerId);
      ui.showStatus('🦙 Waiting for players…', 0);
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
      ui?.showStatus('🦙 SPIT IT!', 2000);
      break;
    }

    case 'tick': {
      game?.applyState(msg.state);
      ui?.updatePlayers(msg.state.players, localPlayerId);
      break;
    }

    case 'player_hit': {
      const state = game?.lastState;
      const victim = state?.players.find(p => p.id === msg.targetId);
      const attacker = state?.players.find(p => p.id === msg.ownerId);
      if (victim && attacker) {
        game?.onSpitImpact(msg.x, msg.z, false);
        // Screen shake for local player being hit
        if (msg.targetId === localPlayerId && game) {
          game.shakeIntensity = 0.4;
        }
      }
      break;
    }

    case 'shield_block': {
      const entry = game?.alpacaMeshes[msg.playerId];
      if (entry) {
        game?.onShieldBlock(entry.group.position.x, entry.group.position.z);
      }
      break;
    }

    case 'player_eliminated': {
      const state = game?.lastState;
      const victim  = state?.players.find(p => p.id === msg.id);
      const killer  = state?.players.find(p => p.id === msg.killerId);
      if (victim) {
        game?.onElimination(msg.id);
        const killerName = killer ? killer.name : 'someone';
        ui?.addKillFeedEntry(`💀 ${victim.name} spat out by ${killerName}`);
        if (msg.id === localPlayerId) {
          ui?.showStatus('🦙 You got spat out! Watch the battle…', 0);
        }
      }
      break;
    }

    case 'powerup_collected': {
      const entry = game?.alpacaMeshes[msg.playerId];
      if (entry) {
        game?.onPowerupPickup(entry.group.position.x, entry.group.position.z, msg.powerupType);
      }
      if (msg.playerId === localPlayerId) {
        ui?.activatePowerupIcon(msg.powerupType);
        const label = { speed: '💨 Speed Boost!', shield: '🛡️ Shield!', bigSpit: '💧 Big Spit!', heal: '💚 Healed!' };
        ui?.showStatus(label[msg.powerupType] || 'Power UP!', 1800);
      }
      break;
    }

    case 'game_over': {
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
