import * as THREE from 'three';

// Pool sizes — tune based on worst-case simultaneous effects
const POOL_BURST = 16; // max concurrent burst emitters
const POOL_RING  = 8;  // max concurrent ring emitters
const BURST_MAX  = 40; // max particles per burst slot

export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this._burstPool = [];
    this._ringPool  = [];
    // Shared ring geometry — all rings have the same shape, only position/scale differs
    this._sharedRingGeo = new THREE.RingGeometry(0.1, 0.2, 32);
    this.#initPools();
  }

  // ── Public effect API ──────────────────────────────────────────────────────

  spitImpact(x, z, big = false) {
    const count = big ? 24 : 14;
    const color = big ? 0x4cc9f0 : 0xa8e6cf;
    this.#burst(x, 0.5, z, count, color, 0.12, 4, 0.8);
  }

  shieldBlock(x, z) {
    this.#burst(x, 0.9, z, 20, 0x4cc9f0, 0.1, 3, 0.6);
    this.#ring(x, 0.9, z, 0x4cc9f0);
  }

  powerupPickup(x, z, type) {
    const colorMap = { speed: 0xffee58, shield: 0x4cc9f0, bigSpit: 0x26c6da, heal: 0x66bb6a };
    const color = colorMap[type] || 0xffffff;
    this.#burst(x, 0.5, z, 30, color, 0.15, 5, 1.2);
    this.#ring(x, 0.5, z, color);
  }

  elimination(x, z, color) {
    this.#burst(x, 1, z, 40, color, 0.2, 8, 1.5);
    this.#ring(x, 0.5, z, color);
    // Scattered secondary bursts — capped at available pool slots
    for (let i = 0; i < 8; i++) {
      this.#burst(
        x + (Math.random() - 0.5) * 2,
        0.5 + Math.random() * 2,
        z + (Math.random() - 0.5) * 2,
        4, 0xf4a261, 0.14, 3, 0.8,
      );
    }
  }

  // ── Per-frame update ───────────────────────────────────────────────────────

  update(dt) {
    for (const slot of this._burstPool) {
      if (!slot.inUse) continue;
      slot.life -= dt;
      if (slot.life <= 0) {
        this.scene.remove(slot.points);
        slot.inUse = false;
        continue;
      }

      const t   = slot.life / slot.maxLife;
      const cnt = slot.drawCount;
      const pos = slot.positions;
      const vel = slot.vels;

      for (let j = 0; j < cnt; j++) {
        vel[j * 3 + 1] -= 9.8 * dt;
        pos[j * 3]     += vel[j * 3]     * dt;
        pos[j * 3 + 1] += vel[j * 3 + 1] * dt;
        pos[j * 3 + 2] += vel[j * 3 + 2] * dt;
        // Simple ground bounce
        if (pos[j * 3 + 1] < 0) {
          pos[j * 3 + 1]     = 0;
          vel[j * 3 + 1] *= -0.25;
        }
      }
      slot.attr.needsUpdate = true;
      slot.mat.opacity = Math.min(1, t * 2);
    }

    for (const slot of this._ringPool) {
      if (!slot.inUse) continue;
      slot.life -= dt;
      if (slot.life <= 0) {
        this.scene.remove(slot.ring);
        slot.inUse = false;
        continue;
      }
      const t = slot.life / slot.maxLife;
      const s = (1 - t) * 6 + 0.1;
      slot.ring.scale.set(s, s, s);
      slot.mat.opacity = t * 0.8;
    }
  }

  // ── Cleanup ────────────────────────────────────────────────────────────────

  destroy() {
    for (const slot of this._burstPool) {
      if (slot.inUse) this.scene.remove(slot.points);
      slot.points.geometry.dispose();
      slot.mat.dispose();
    }
    for (const slot of this._ringPool) {
      if (slot.inUse) this.scene.remove(slot.ring);
      slot.mat.dispose(); // geometry is shared — disposed separately
    }
    this._sharedRingGeo.dispose();
    this._burstPool = [];
    this._ringPool  = [];
  }

  // ── Pool initialisation ────────────────────────────────────────────────────

  #initPools() {
    for (let i = 0; i < POOL_BURST; i++) {
      const positions = new Float32Array(BURST_MAX * 3);
      const geo  = new THREE.BufferGeometry();
      const attr = new THREE.BufferAttribute(positions, 3);
      attr.usage = THREE.DynamicDrawUsage;
      geo.setAttribute('position', attr);
      geo.setDrawRange(0, 0);

      const mat    = new THREE.PointsMaterial({ size: 0.12, sizeAttenuation: true, transparent: true, opacity: 0 });
      const points = new THREE.Points(geo, mat);

      this._burstPool.push({
        points, attr, mat,
        positions,
        vels:      new Float32Array(BURST_MAX * 3),
        drawCount: 0,
        inUse:     false,
        life:      0,
        maxLife:   0,
      });
    }

    for (let i = 0; i < POOL_RING; i++) {
      const mat  = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(this._sharedRingGeo, mat);
      ring.rotation.x = -Math.PI / 2;

      this._ringPool.push({ ring, mat, inUse: false, life: 0, maxLife: 0 });
    }
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  #burst(ox, oy, oz, count, color, size, speed, life) {
    count = Math.min(count, BURST_MAX);

    const slot = this._burstPool.find(s => !s.inUse);
    if (!slot) return; // pool exhausted — skip gracefully

    slot.inUse    = true;
    slot.life     = life;
    slot.maxLife  = life;
    slot.drawCount = count;

    slot.mat.color.setHex(color);
    slot.mat.size    = size;
    slot.mat.opacity = 1;

    const pos = slot.positions;
    const vel = slot.vels;
    for (let i = 0; i < count; i++) {
      pos[i * 3]     = ox;
      pos[i * 3 + 1] = oy;
      pos[i * 3 + 2] = oz;
      const angle     = Math.random() * Math.PI * 2;
      const elevation = (Math.random() - 0.4) * Math.PI;
      const s         = (Math.random() * 0.6 + 0.4) * speed;
      vel[i * 3]     = Math.cos(elevation) * Math.cos(angle) * s;
      vel[i * 3 + 1] = Math.sin(elevation) * s + 1.5;
      vel[i * 3 + 2] = Math.cos(elevation) * Math.sin(angle) * s;
    }

    slot.points.geometry.setDrawRange(0, count);
    slot.attr.needsUpdate = true;
    this.scene.add(slot.points);
  }

  #ring(ox, oy, oz, color) {
    const slot = this._ringPool.find(s => !s.inUse);
    if (!slot) return;

    slot.inUse   = true;
    slot.life    = 0.5;
    slot.maxLife = 0.5;
    slot.mat.color.setHex(color);
    slot.mat.opacity = 0.9;
    slot.ring.position.set(ox, oy, oz);
    slot.ring.scale.set(0.1, 0.1, 0.1);
    this.scene.add(slot.ring);
  }
}
