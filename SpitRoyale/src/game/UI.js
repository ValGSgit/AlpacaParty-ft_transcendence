const MAX_HEALTH = 100;

const healthColors = (pct) => {
  if (pct > 0.6) return '#4ade80';
  if (pct > 0.3) return '#fbbf24';
  return '#f87171';
};

export class UI {
  constructor() {
    this.hud       = document.getElementById('hud');
    this.cards     = document.getElementById('player-cards');
    this.statusMsg = document.getElementById('status-msg');
    this.killFeed  = document.getElementById('kill-feed');
    this.cardEls   = {};
    this.statusTimer = null;
    this.activePowerups = new Set();

    this.puIcons = {
      speed:   document.getElementById('pu-speed'),
      shield:  document.getElementById('pu-shield'),
      bigSpit: document.getElementById('pu-bigspit'),
      heal:    document.getElementById('pu-heal'),
    };
  }

  show() {
    this.hud.style.display = 'block';
    document.getElementById('lobby').style.display = 'none';
  }

  updatePlayers(players, localId) {
    const seen = new Set();

    for (const p of players) {
      seen.add(p.id);
      if (!this.cardEls[p.id]) {
        const card = document.createElement('div');
        card.className = 'player-card' + (p.id === localId ? ' local-card' : '');
        card.innerHTML = `
          <div class="player-name" style="color:#${p.color?.toString(16).padStart(6,'0')}">${p.name}${p.id === localId ? ' (you)' : ''}</div>
          <div class="health-bar-bg"><div class="health-bar" style="width:100%"></div></div>
        `;
        this.cards.appendChild(card);
        this.cardEls[p.id] = card;
      }

      const card = this.cardEls[p.id];
      const bar  = card.querySelector('.health-bar');
      const pct  = p.health / MAX_HEALTH;
      bar.style.width = (pct * 100) + '%';
      bar.style.background = healthColors(pct);
      card.style.opacity = p.alive ? '1' : '0.35';
    }

    // Remove old cards
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

  hideStatus() {
    this.statusMsg.classList.add('hidden');
  }

  addKillFeedEntry(text) {
    const el = document.createElement('div');
    el.className = 'kill-entry';
    el.textContent = text;
    this.killFeed.appendChild(el);
    setTimeout(() => el.remove(), 4000);
    // Max 4 entries
    while (this.killFeed.children.length > 4) {
      this.killFeed.removeChild(this.killFeed.firstChild);
    }
  }

  activatePowerupIcon(type) {
    const icon = this.puIcons[type];
    if (!icon) return;
    icon.classList.add('active');
    setTimeout(() => icon.classList.remove('active'), type === 'bigSpit' ? 8000 : 5000);
  }

  // ── Survival mode HUD ──────────────────────────────────────────────────────

  /** Show / update the wave counter and remaining enemy count. */
  setWave(wave, enemyCount) {
    const el = document.getElementById('wave-info');
    if (!el) return;
    el.style.display = 'flex';
    document.getElementById('wave-num').textContent   = wave;
    document.getElementById('enemy-count').textContent = enemyCount;
  }

  /** Update the kill-score counter. */
  setKills(kills) {
    const el = document.getElementById('kill-count');
    if (el) el.textContent = kills;
  }

  /** Hide survival HUD elements (call when returning to lobby). */
  hideSurvivalHud() {
    const el = document.getElementById('wave-info');
    if (el) el.style.display = 'none';
  }
}
