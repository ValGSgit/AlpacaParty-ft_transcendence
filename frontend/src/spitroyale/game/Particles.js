import * as THREE from 'three';

export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.emitters = [];
  }

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
    for (let i = 0; i < 15; i += 1) {
      this.#burst(
        x + (Math.random() - 0.5) * 2,
        0.5 + Math.random() * 2,
        z + (Math.random() - 0.5) * 2,
        4,
        0xf4a261,
        0.14,
        3,
        0.8,
      );
    }
  }

  update(dt) {
    for (let i = this.emitters.length - 1; i >= 0; i -= 1) {
      const em = this.emitters[i];
      em.life -= dt;

      if (em.life <= 0) {
        if (em.type === 'ring') {
          this.scene.remove(em.ring);
          em.ring.geometry.dispose();
          em.mat.dispose();
        } else {
          this.scene.remove(em.points);
          em.points.geometry.dispose();
          em.mat.dispose();
        }
        this.emitters.splice(i, 1);
        continue;
      }

      const t = em.life / em.maxLife;
      if (em.type === 'ring') {
        const s = (1 - t) * 6 + 0.1;
        em.ring.scale.set(s, s, s);
        em.mat.opacity = t * 0.8;
        continue;
      }

      const pos = em.positions;
      for (let j = 0; j < pos.count; j += 1) {
        em.vels[j * 3 + 1] -= 9.8 * dt;
        pos.array[j * 3] += em.vels[j * 3] * dt;
        pos.array[j * 3 + 1] += em.vels[j * 3 + 1] * dt;
        pos.array[j * 3 + 2] += em.vels[j * 3 + 2] * dt;
        if (pos.array[j * 3 + 1] < 0) {
          pos.array[j * 3 + 1] = 0;
          em.vels[j * 3 + 1] *= -0.25;
        }
      }
      pos.needsUpdate = true;
      em.mat.opacity = Math.min(1, t * 2);
    }
  }

  destroy() {
    for (const em of this.emitters) {
      if (em.type === 'ring') {
        this.scene.remove(em.ring);
        em.ring.geometry.dispose();
        em.mat.dispose();
      } else {
        this.scene.remove(em.points);
        em.points.geometry.dispose();
        em.mat.dispose();
      }
    }
    this.emitters = [];
  }

  #burst(ox, oy, oz, count, color, size, speed, life) {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const vels = [];

    for (let i = 0; i < count; i += 1) {
      positions[i * 3] = ox;
      positions[i * 3 + 1] = oy;
      positions[i * 3 + 2] = oz;
      const angle = Math.random() * Math.PI * 2;
      const elevation = (Math.random() - 0.4) * Math.PI;
      const s = (Math.random() * 0.6 + 0.4) * speed;
      vels.push(
        Math.cos(elevation) * Math.cos(angle) * s,
        Math.sin(elevation) * s + 1.5,
        Math.cos(elevation) * Math.sin(angle) * s,
      );
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({ color, size, sizeAttenuation: true, transparent: true, opacity: 1 });
    const points = new THREE.Points(geo, mat);
    this.scene.add(points);

    this.emitters.push({ points, positions: geo.attributes.position, vels, life, maxLife: life, mat });
  }

  #ring(ox, oy, oz, color) {
    const geo = new THREE.RingGeometry(0.1, 0.2, 32);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(geo, mat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(ox, oy, oz);
    this.scene.add(ring);
    this.emitters.push({ type: 'ring', ring, mat, life: 0.5, maxLife: 0.5 });
  }
}
