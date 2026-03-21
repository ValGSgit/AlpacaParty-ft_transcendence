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
    this.cardEls = {};
    this.statusTimer = null;

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
      card.style.opacity = p.alive ? '1' : '0.35';
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

  activatePowerupIcon(type) {
    const icon = this.powerupIcons[type];
    if (!icon) return;
    icon.classList.add('active');
    setTimeout(() => icon.classList.remove('active'), type === 'bigSpit' ? 8000 : 5000);
  }

  destroy() {
    if (this.statusTimer) clearTimeout(this.statusTimer);
    for (const id of Object.keys(this.cardEls)) {
      this.cardEls[id].remove();
      delete this.cardEls[id];
    }
  }
}
