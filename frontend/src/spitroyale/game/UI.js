const MAX_HEALTH = 100;

const healthColor = (pct) => {
  if (pct > 0.6) return '#4ade80';
  if (pct > 0.3) return '#fbbf24';
  return '#f87171';
};

// Powerup active durations in ms (must match server constants)
const POWERUP_DURATIONS = {
  bigSpit:    8000,
  tripleSpit: 10000,
  shield:     4000,
  speed:      5000,
  heal:       800,  // instant heal — short flash
};

export class UI {
  constructor(root) {
    this.root       = root;
    this.hud        = root.querySelector('#hud');
    this.cards      = root.querySelector('#player-cards');
    this.statusMsg  = root.querySelector('#status-msg');
    this.killFeed   = root.querySelector('#kill-feed');
    this.actions    = root.querySelector('#post-game-actions');
    this.rematchBtn = root.querySelector('#btn-rematch');
    this.requeueBtn = root.querySelector('#btn-requeue');
    this.pingEl     = root.querySelector('#ping-display');
    this.cardEls    = {};
    this.statusTimer   = null;
    this.onRematch     = null;
    this.onRequeue     = null;
    this._rematchVoted = false;

    this.rematchHandler = () => {
      if (this._rematchVoted) return;
      this._rematchVoted = true;
      if (this.rematchBtn) {
        this.rematchBtn.disabled  = true;
        this.rematchBtn.textContent = '✓ Voted';
      }
      this.onRematch?.();
    };
    this.requeueHandler = () => this.onRequeue?.();
    this.rematchBtn?.addEventListener('click', this.rematchHandler);
    this.requeueBtn?.addEventListener('click', this.requeueHandler);

    this.waveInfo   = root.querySelector('#wave-info');
    this.waveNum    = root.querySelector('#wave-num');
    this.enemyCount = root.querySelector('#enemy-count');

    this.powerupIcons = {
      speed:      root.querySelector('#pu-speed'),
      shield:     root.querySelector('#pu-shield'),
      bigSpit:    root.querySelector('#pu-bigspit'),
      heal:       root.querySelector('#pu-heal'),
      tripleSpit: root.querySelector('#pu-triplespit'),
    };

    // Track individual powerup deactivation timers so overlapping pickups restart correctly
    this._powerupTimers = {};
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  show() {
    this.hud.style.display = 'block';
    this.root.querySelector('#lobby').style.display = 'none';
  }

  destroy() {
    if (this.statusTimer) clearTimeout(this.statusTimer);
    for (const t of Object.values(this._powerupTimers)) clearTimeout(t);
    this.rematchBtn?.removeEventListener('click', this.rematchHandler);
    this.requeueBtn?.removeEventListener('click', this.requeueHandler);
    for (const id of Object.keys(this.cardEls)) {
      this.cardEls[id].remove();
      delete this.cardEls[id];
    }
  }

  // ── Player cards ───────────────────────────────────────────────────────────

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

      const card      = this.cardEls[p.id];
      const bar       = card.querySelector('.health-bar');
      const pct       = p.health / MAX_HEALTH;
      bar.style.width      = `${pct * 100}%`;
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

  // ── Status message ─────────────────────────────────────────────────────────

  showStatus(msg, duration = 3000) {
    this.statusMsg.textContent = msg;
    this.statusMsg.classList.remove('hidden');
    if (this.statusTimer) clearTimeout(this.statusTimer);
    if (duration > 0) {
      this.statusTimer = setTimeout(() => this.statusMsg.classList.add('hidden'), duration);
    }
  }

  // ── Kill feed ──────────────────────────────────────────────────────────────

  addKillFeedEntry(text) {
    const el = document.createElement('div');
    el.className   = 'kill-entry';
    el.textContent = text;
    this.killFeed.appendChild(el);
    setTimeout(() => el.remove(), 4000);
    while (this.killFeed.children.length > 4) {
      this.killFeed.removeChild(this.killFeed.firstChild);
    }
  }

  // ── Post-game actions ──────────────────────────────────────────────────────

  showPostGameActions() {
    if (!this.actions) return;
    // Reset rematch vote state when a new post-game screen appears
    this._rematchVoted = false;
    if (this.rematchBtn) {
      this.rematchBtn.disabled    = false;
      this.rematchBtn.textContent = 'Rematch';
    }
    this.actions.classList.remove('hidden');
  }

  hidePostGameActions() {
    this.actions?.classList.add('hidden');
  }

  setRematchStatus(votes, needed) {
    if (!this.rematchBtn) return;
    if (!this._rematchVoted) {
      this.rematchBtn.textContent = votes > 0 && needed > 0
        ? `Rematch (${votes}/${needed})`
        : 'Rematch';
    }
  }

  // ── Powerup bar ────────────────────────────────────────────────────────────

  activatePowerupIcon(type) {
    const icon = this.powerupIcons[type];
    if (!icon) return;

    const ms = POWERUP_DURATIONS[type] ?? 5000;

    // Set CSS variable for the drain animation duration
    icon.style.setProperty('--pu-duration', `${ms}ms`);

    // Force reflow so the animation restarts if the same powerup is picked up again
    icon.classList.remove('active');
    // eslint-disable-next-line no-unused-expressions
    icon.offsetWidth; // intentional reflow trigger

    icon.classList.add('active');

    clearTimeout(this._powerupTimers[type]);
    this._powerupTimers[type] = setTimeout(() => icon.classList.remove('active'), ms);
  }

  // ── Floating damage numbers ────────────────────────────────────────────────

  /**
   * Spawn a floating damage number at a screen-space position.
   * @param {number} screenX  – pixels from left
   * @param {number} screenY  – pixels from top
   * @param {number} amount   – damage dealt
   * @param {boolean} isLocal – true when the local player was hit
   */
  spawnDamageNumber(screenX, screenY, amount, isLocal = false) {
    const el = document.createElement('div');
    el.className   = `damage-number${isLocal ? ' damage-number--self' : ''}`;
    el.textContent = `-${amount}`;
    el.style.left  = `${screenX}px`;
    el.style.top   = `${screenY}px`;
    this.hud.appendChild(el);
    el.addEventListener('animationend', () => el.remove(), { once: true });
  }

  // ── Ping display ───────────────────────────────────────────────────────────

  updatePing(ms) {
    if (!this.pingEl) return;
    this.pingEl.textContent = `${ms} ms`;
    this.pingEl.className   = ms < 80 ? 'ping-good' : ms < 160 ? 'ping-mid' : 'ping-bad';
  }

  // ── Rewards ────────────────────────────────────────────────────────────────

  showRewards(reward) {
    if (!reward) return;

    const totalXp  = reward.xp?.total || 0;
    const eloFrom  = reward.elo?.from;
    const eloTo    = reward.elo?.to;
    const eloDelta = (typeof eloFrom === 'number' && typeof eloTo === 'number') ? (eloTo - eloFrom) : null;

    const titleParts = [`+${totalXp} XP`];
    if (reward.level?.leveledUp) titleParts.push(`Level ${reward.level.to}`);
    if (eloDelta !== null) {
      const sign = eloDelta >= 0 ? '+' : '';
      titleParts.push(`ELO ${sign}${eloDelta}`);
    }
    this.showStatus(titleParts.join(' | '), 4200);

    for (const part of (reward.xp?.parts || [])) {
      this.addKillFeedEntry(`${part.key}: +${part.xp} XP`);
    }
    for (const achievement of (reward.unlockedAchievements || [])) {
      this.addKillFeedEntry(`Achievement unlocked: ${achievement.name}`);
    }
  }

  // ── Survival HUD ───────────────────────────────────────────────────────────

  setWave(wave, count) {
    if (!this.waveInfo) return;
    this.waveInfo.style.display = 'flex';
    if (this.waveNum)    this.waveNum.textContent    = wave;
    if (this.enemyCount) this.enemyCount.textContent = count;
  }

  hideSurvivalHud() {
    if (this.waveInfo) this.waveInfo.style.display = 'none';
  }
}
