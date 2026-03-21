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
  }

  connect(name) {
    if (this.socket) return;

    const token = localStorage.getItem('accessToken');
    this.socket = io('/spit-royale', {
      transports: ['websocket'],
      auth: { token },
    });

    this.socket.on('connect', () => {
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
    });
  }

  #handleMessage(msg) {
    switch (msg.type) {
      case 'joined': {
        this.localPlayerId = msg.playerId;
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

        this.inputInterval = setInterval(() => {
          if (!this.socket || !this.game || !this.socket.connected) return;
          this.socket.emit('input', this.game.getInputPacket());
        }, 33);

        this.game.applyState(msg.state);
        this.ui.updatePlayers(msg.state.players, this.localPlayerId);
        break;
      }

      case 'queue_waiting':
        this.ui?.showStatus('Searching for a match...', 0);
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
        this.game?.applyState(msg.state);
        this.ui?.updatePlayers(msg.state.players, this.localPlayerId);
        if (msg.type === 'game_start') this.ui?.showStatus('SPIT IT!', 1200);
        if (msg.type === 'game_over') {
          this.ui?.showStatus(`${msg.winner} wins!`, 2500);
          const reward = msg.rewards?.[this.localPlayerId] || null;
          if (reward) this.ui?.showRewards(reward);
        }
        break;

      case 'countdown':
        this.ui?.showStatus(`Game starts in ${msg.seconds}s...`, 0);
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

      default:
        break;
    }
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
