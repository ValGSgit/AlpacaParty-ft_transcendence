import { io } from 'socket.io-client';
import { Game } from './game/Game.js';
import { UI } from './game/UI.js';

export class SpitRoyaleClient {
  constructor(rootElement, options = {}) {
    this.root = rootElement;
    this.options = options;
    this.game = null;
    this.ui = null;
    this.socket = null;
    this.localPlayerId = null;
    this.inputInterval = null;
    this.playerName = '';
    this.mode = 'queue';
    this.currentMatchId = null;
    this.onLiveMatches  = null;
    this.onGameJoined   = null; // fired when the lobby hides and the game begins
    this.onDisconnected = null; // fired on socket disconnect
    this.isSurvival     = false;
    this._lastInputSentAt = 0; // for ping estimation
    this._pingSmoothed    = 0; // EWMA smoothed ping (ms)
  }

  connect(name) {
    this.playerName = name;
    if (this.socket) {
      this.socket.emit('queue:join', { name: this.playerName });
      return;
    }

    const token = localStorage.getItem('accessToken');
    this.socket = io('/spit-royale', {
      transports: ['websocket'],
      auth: { token },
    });

    this.socket.on('connect', () => {
      this.requestLiveMatches();
      this.socket.emit('join', { name });
    });

    this.socket.on('spit:message', (msg) => {
      this.#handleMessage(msg);
    });

    this.socket.on('connect_error', () => {
      this.ui?.showStatus('Connection failed. Please login again.', 0);
    });

    this.socket.on('disconnect', () => {
      this.ui?.showStatus('Disconnected. Rejoin to continue.', 0);
      if (this.inputInterval) clearInterval(this.inputInterval);
      this.onDisconnected?.();
    });
  }

  connectSurvival(name) {
    this.isSurvival = true;
    this.playerName = name;

    if (this.socket) {
      this.socket.emit('join:survival', { name });
      return;
    }

    const token = localStorage.getItem('accessToken');
    this.socket = io('/spit-royale', { transports: ['websocket'], auth: { token } });

    this.socket.on('connect', () => {
      this.socket.emit('join:survival', { name });
    });
    this.socket.on('spit:message', (msg) => { this.#handleMessage(msg); });
    this.socket.on('connect_error', () => {
      this.ui?.showStatus('Connection failed. Please login again.', 0);
    });
    this.socket.on('disconnect', () => {
      this.ui?.showStatus('Disconnected.', 0);
      if (this.inputInterval) clearInterval(this.inputInterval);
      this.onDisconnected?.();
    });
  }

  #handleMessage(msg) {
    switch (msg.type) {
      case 'joined': {
        this.localPlayerId = msg.playerId;
        this.currentMatchId = msg.roomId;
        this.isSurvival = msg.isSurvival ?? false;
        // Stay in 'countdown' mode until game_start so inputs are suppressed during countdown
        this.mode = msg.roomId === 'queue' ? 'queue' : (msg.resumed ? 'player' : 'countdown');
        if (!this.ui) {
          this.ui = new UI(this.root);
          this.ui.show();
        }
        if (!this.game) {
          this.game = new Game(this.root.querySelector('#canvas-container'), this.localPlayerId);
        }

        this.game.onSpit = (angle) => {
          this.socket.emit('spit', { angle });
        };

        // Floating damage numbers — project 3-D hit position to screen space
        this.game.onDamage = (screenX, screenY, amount, isLocal) => {
          this.ui?.spawnDamageNumber(screenX, screenY, amount, isLocal);
        };

        this.ui.onRematch = () => {
          this.socket?.emit('rematch:request');
        };
        this.ui.onRequeue = () => {
          this.socket?.emit('queue:join', { name: this.playerName });
          this.ui?.hidePostGameActions();
          this.ui?.setRematchStatus(0, 0);
        };

        this.onGameJoined?.();

        this.inputInterval = setInterval(() => {
          if (!this.socket || !this.game || !this.socket.connected || this.mode !== 'player') return;
          this._lastInputSentAt = Date.now();
          this.socket.emit('input', this.game.getInputPacket());
        }, 33);

        this.game.applyState(msg.state);
        this.ui.updatePlayers(msg.state.players, this.localPlayerId);
        break;
      }

      case 'queue_waiting':
        this.ui?.showStatus(`Searching for a match... (${msg.queueSize || 1} in queue)`, 0);
        this.ui?.hidePostGameActions();
        this.ui?.setRematchStatus(0, 0);
        break;

      case 'queue_left':
        this.mode = 'queue';
        this.ui?.showStatus('Left queue. Press Spit and Play to queue again.', 3000);
        break;

      case 'player_joined':
        this.ui?.showStatus(`${msg.name} joined!`, 1800);
        this.game?.applyState(msg.state);
        this.ui?.updatePlayers(msg.state.players, this.localPlayerId);
        break;

      case 'player_left':
      case 'tick':
      case 'game_start':
      case 'game_over':
        // Ping estimation: EWMA of (now - last input sent).
        // Subtracting half the server tick (25 ms) reduces overestimation.
        if (msg.type === 'tick' && this._lastInputSentAt > 0) {
          const raw = Math.max(0, Date.now() - this._lastInputSentAt - 25);
          this._pingSmoothed = this._pingSmoothed
            ? Math.round(this._pingSmoothed * 0.8 + raw * 0.2)
            : raw;
          this.ui?.updatePing(this._pingSmoothed);
        }
        this.game?.applyState(msg.state);
        this.ui?.updatePlayers(msg.state.players, this.localPlayerId);
        if (msg.type === 'game_start') {
          this.mode = 'player';
          this.ui?.showStatus('GO! 🦙', 2500);
          this.ui?.hidePostGameActions();
          this.ui?.setRematchStatus(0, 0);
        }
        if (msg.type === 'game_over') {
          this.ui?.showStatus(`${msg.winner} wins!`, 2500);
          const reward = msg.rewards?.[this.localPlayerId] || null;
          if (reward) this.ui?.showRewards(reward);
          this.ui?.showPostGameActions();
        }
        break;

      case 'spectator_joined':
        this.mode = 'spectator';
        this.currentMatchId = msg.matchId;
        this.localPlayerId = null;
        if (!this.ui) {
          this.ui = new UI(this.root);
          this.ui.show();
        }
        if (!this.game) {
          this.game = new Game(this.root.querySelector('#canvas-container'), null);
        }
        this.game.applyState(msg.state);
        this.ui.updatePlayers(msg.state.players, null);
        this.ui.hidePostGameActions();
        this.ui.showStatus('Spectating live match', 2200);
        break;

      case 'spectator_left':
        if (this.mode === 'spectator') {
          this.mode = 'queue';
          this.currentMatchId = null;
        }
        break;

      case 'live_matches':
        this.onLiveMatches?.(msg.matches || []);
        break;

      case 'player_disconnected':
        this.ui?.addKillFeedEntry(`Player disconnected (${Math.round((msg.graceMs || 0) / 1000)}s reconnect window)`);
        this.game?.applyState(msg.state);
        this.ui?.updatePlayers(msg.state.players, this.localPlayerId);
        break;

      case 'player_reconnected':
        this.ui?.addKillFeedEntry('Player reconnected');
        this.game?.applyState(msg.state);
        this.ui?.updatePlayers(msg.state.players, this.localPlayerId);
        break;

      case 'spectators_update':
        this.ui?.addKillFeedEntry(`Spectators: ${msg.count}`);
        break;

      case 'countdown':
        this.ui?.showStatus(`Game starts in ${msg.seconds}s...`, 0);
        break;

      case 'rematch_update':
        this.ui?.setRematchStatus(msg.votes || 0, msg.needed || 0);
        break;

      case 'player_hit': {
        const state = this.game?.lastState;
        const victim = state?.players.find((p) => p.id === msg.targetId);
        const attacker = state?.players.find((p) => p.id === msg.ownerId);
        if (victim && attacker) {
          this.game?.onSpitImpact(msg.x, msg.z, false);
          if (msg.targetId === this.localPlayerId && this.game) {
            this.game.shakeIntensity = 0.4;
          }
        }
        break;
      }

      case 'shield_block': {
        const entry = this.game?.alpacaMeshes[msg.playerId];
        if (entry) this.game?.onShieldBlock(entry.group.position.x, entry.group.position.z);
        break;
      }

      case 'player_eliminated': {
        const state = this.game?.lastState;
        const victim = state?.players.find((p) => p.id === msg.id);
        const killer = state?.players.find((p) => p.id === msg.killerId);
        if (victim) {
          this.game?.onElimination(msg.id);
          this.ui?.addKillFeedEntry(`${victim.name} got spat by ${killer?.name || 'someone'}`);
          if (msg.id === this.localPlayerId) this.ui?.showStatus('You are out. Keep watching!', 0);
        }
        break;
      }

      case 'powerup_collected': {
        const entry = this.game?.alpacaMeshes[msg.playerId];
        if (entry) {
          this.game?.onPowerupPickup(entry.group.position.x, entry.group.position.z, msg.powerupType);
        }
        if (msg.playerId === this.localPlayerId) {
          this.ui?.activatePowerupIcon(msg.powerupType);
        }
        break;
      }

      // ── Survival-only messages ──────────────────────────────────────────────
      case 'wave_start': {
        this.game?.applyState(msg.state);
        this.ui?.updatePlayers(msg.state.players, this.localPlayerId);
        this.ui?.setWave(msg.wave, msg.botCount);
        this.ui?.showStatus(`🌊 Wave ${msg.wave} — ${msg.botCount} enemies incoming!`, 2500);
        break;
      }

      case 'wave_complete':
        this.ui?.showStatus(`✅ Wave ${msg.wave} clear! ${msg.kills} kills — next wave in 3s…`, 2800);
        break;

      case 'survival_over': {
        this.game?.applyState(msg.state);
        this.ui?.updatePlayers(msg.state.players, this.localPlayerId);
        this.ui?.showStatus(`💀 Fell on wave ${msg.wave}! Total kills: ${msg.kills}`, 0);
        this.ui?.hideSurvivalHud();
        setTimeout(() => this.ui?.showStatus('⚔️ New run in 5s…', 0), 3000);
        break;
      }

      case 'sudden_death': {
        if (msg.state) {
          this.game?.applyState(msg.state);
          this.ui?.updatePlayers(msg.state.players, this.localPlayerId);
        }
        this.ui?.showStatus('☠️ SUDDEN DEATH — damage doubled!', 4000);
        this.ui?.addKillFeedEntry('☠️ Sudden death! All damage ×2');
        break;
      }

      default:
        break;
    }
  }

  requestLiveMatches() {
    if (!this.socket) return;
    this.socket.emit('matches:list', (payload) => {
      this.onLiveMatches?.(payload?.matches || []);
    });
  }

  spectateMatch(matchId) {
    if (!this.socket || !matchId) return;
    this.socket.emit('spectate:join', { matchId });
  }

  leaveSpectate() {
    if (!this.socket) return;
    this.socket.emit('spectate:leave');
  }

  destroy() {
    if (this.inputInterval) clearInterval(this.inputInterval);
    if (this.socket) {
      this.socket.off('spit:message');
      this.socket.disconnect();
      this.socket = null;
    }
    this.game?.destroy();
    this.ui?.destroy();
    this.game = null;
    this.ui = null;
  }
}
