const MAX_HEALTH = 100;

const healthColor = (pct) => {
  if (pct > 0.6) return '#4ade80';
  if (pct > 0.3) return '#fbbf24';
  return '#f87171';
};

export class UI {
  constructor(root) {
    this.root = root;
    this.hud = root.querySelector('#hud');
    this.cards = root.querySelector('#player-cards');
    this.statusMsg = root.querySelector('#status-msg');
    this.killFeed = root.querySelector('#kill-feed');
    this.actions = root.querySelector('#post-game-actions');
    this.rematchBtn = root.querySelector('#btn-rematch');
    this.requeueBtn = root.querySelector('#btn-requeue');
    this.cardEls = {};
    this.statusTimer = null;
    this.onRematch = null;
    this.onRequeue = null;

    this.rematchHandler = () => this.onRematch?.();
    this.requeueHandler = () => this.onRequeue?.();
    this.rematchBtn?.addEventListener('click', this.rematchHandler);
    this.requeueBtn?.addEventListener('click', this.requeueHandler);

    this.waveInfo   = root.querySelector('#wave-info');
    this.waveNum    = root.querySelector('#wave-num');
    this.enemyCount = root.querySelector('#enemy-count');

    this.powerupIcons = {
      speed: root.querySelector('#pu-speed'),
      shield: root.querySelector('#pu-shield'),
      bigSpit: root.querySelector('#pu-bigspit'),
      heal: root.querySelector('#pu-heal'),
    };
  }

  show() {
    this.hud.style.display = 'block';
    this.root.querySelector('#lobby').style.display = 'none';
  }

  updatePlayers(players, localId) {
    const seen = new Set();

    for (const p of players) {
      seen.add(p.id);
      if (!this.cardEls[p.id]) {
        const card = document.createElement('div');
        card.className = `player-card${p.id === localId ? ' local-card' : ''}`;
        card.innerHTML = `
          <div class="player-name" style="color:#${p.color?.toString(16).padStart(6, '0')}">${p.name}${p.id === localId ? ' (you)' : ''}</div>
          <div class="health-bar-bg"><div class="health-bar" style="width:100%"></div></div>
        `;
        this.cards.appendChild(card);
        this.cardEls[p.id] = card;
      }

      const card = this.cardEls[p.id];
      const bar = card.querySelector('.health-bar');
      const pct = p.health / MAX_HEALTH;
      bar.style.width = `${pct * 100}%`;
      bar.style.background = healthColor(pct);
      const connected = p.connected !== false;
      card.style.opacity = p.alive ? (connected ? '1' : '0.6') : '0.35';

      const nameEl = card.querySelector('.player-name');
      const suffix = p.id === localId ? ' (you)' : '';
      nameEl.textContent = connected ? `${p.name}${suffix}` : `${p.name}${suffix} [reconnecting]`;
    }

    for (const id of Object.keys(this.cardEls)) {
      if (!seen.has(id)) {
        this.cardEls[id].remove();
        delete this.cardEls[id];
      }
    }
  }

  showStatus(msg, duration = 3000) {
    this.statusMsg.textContent = msg;
    this.statusMsg.classList.remove('hidden');
    if (this.statusTimer) clearTimeout(this.statusTimer);
    if (duration > 0) {
      this.statusTimer = setTimeout(() => this.statusMsg.classList.add('hidden'), duration);
    }
  }

  addKillFeedEntry(text) {
    const el = document.createElement('div');
    el.className = 'kill-entry';
    el.textContent = text;
    this.killFeed.appendChild(el);
    setTimeout(() => el.remove(), 4000);
    while (this.killFeed.children.length > 4) {
      this.killFeed.removeChild(this.killFeed.firstChild);
    }
  }

  showPostGameActions() {
    if (!this.actions) return;
    this.actions.classList.remove('hidden');
  }

  hidePostGameActions() {
    if (!this.actions) return;
    this.actions.classList.add('hidden');
  }

  setRematchStatus(votes, needed) {
    if (!this.rematchBtn) return;
    if (votes > 0 && needed > 0) {
      this.rematchBtn.textContent = `Rematch (${votes}/${needed})`;
    } else {
      this.rematchBtn.textContent = 'Rematch';
    }
  }

  activatePowerupIcon(type) {
    const icon = this.powerupIcons[type];
    if (!icon) return;
    icon.classList.add('active');
    setTimeout(() => icon.classList.remove('active'), type === 'bigSpit' ? 8000 : 5000);
  }

  showRewards(reward) {
    if (!reward) return;

    const totalXp = reward.xp?.total || 0;
    const eloFrom = reward.elo?.from;
    const eloTo = reward.elo?.to;
    const eloDelta = (typeof eloFrom === 'number' && typeof eloTo === 'number') ? (eloTo - eloFrom) : null;

    const titleParts = [`+${totalXp} XP`];
    if (reward.level?.leveledUp) {
      titleParts.push(`Level ${reward.level.to}`);
    }
    if (eloDelta !== null) {
      const sign = eloDelta >= 0 ? '+' : '';
      titleParts.push(`ELO ${sign}${eloDelta}`);
    }
    this.showStatus(titleParts.join(' | '), 4200);

    const breakdown = reward.xp?.parts || [];
    for (const part of breakdown) {
      this.addKillFeedEntry(`${part.key}: +${part.xp} XP`);
    }

    const unlocked = reward.unlockedAchievements || [];
    for (const achievement of unlocked) {
      this.addKillFeedEntry(`Achievement unlocked: ${achievement.name}`);
    }
  }

  setWave(wave, count) {
    if (!this.waveInfo) return;
    this.waveInfo.style.display = 'flex';
    if (this.waveNum)    this.waveNum.textContent    = wave;
    if (this.enemyCount) this.enemyCount.textContent = count;
  }

  hideSurvivalHud() {
    if (this.waveInfo) this.waveInfo.style.display = 'none';
  }

  destroy() {
    if (this.statusTimer) clearTimeout(this.statusTimer);
    this.rematchBtn?.removeEventListener('click', this.rematchHandler);
    this.requeueBtn?.removeEventListener('click', this.requeueHandler);
    for (const id of Object.keys(this.cardEls)) {
      this.cardEls[id].remove();
      delete this.cardEls[id];
    }
  }
}
