import * as THREE from 'three';
import { buildArena } from './Arena.js';
import { buildAlpaca } from './Alpaca.js';
import { ParticleSystem } from './Particles.js';

const POWERUP_COLORS = { speed: 0xffee58, shield: 0x4cc9f0, bigSpit: 0x26c6da, heal: 0x66bb6a };
const POWERUP_EMOJI  = { speed: '💨', shield: '🛡️', bigSpit: '💧', heal: '💚' };

export class Game {
  constructor(container, localPlayerId) {
    this.container = container;
    this.localPlayerId = localPlayerId;
    this.alpacaMeshes = {};   // id → { group, legMeshes, shield, shieldMat, label }
    this.spitMeshes   = {};   // id → mesh
    this.powerupMeshes = {};  // id → mesh
    this.lastState = null;
    this.clock = new THREE.Clock();
    this.mouse = new THREE.Vector2();
    this.aimAngle = 0;
    this.shakeIntensity = 0;
    this.cameraOffset = new THREE.Vector3(0, 22, 18);
    this.cameraTarget = new THREE.Vector3();

    // Enemy mesh pool (survival mode) — pre-built to avoid mid-game geometry allocation
    this._enemyPool   = [];   // { group, legMeshes, shield, shieldMat, inUse, walkPhase, prevX, prevZ, lastHealth }
    this._poolReady   = false;

    this._initRenderer(container);
    this._initScene();
    this._initInput();

    this.particles = new ParticleSystem(this.scene);
    this.animate();
  }

  _initRenderer(container) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    container.appendChild(this.renderer.domElement);

    window.addEventListener('resize', () => {
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    });
  }

  _initScene() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 400);
    this.camera.position.copy(this.cameraOffset);
    this.camera.lookAt(0, 0, 0);

    buildArena(this.scene);

    // Ground plane for raycasting (aim)
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  }

  _initInput() {
    this.keys = {};
    document.addEventListener('keydown', e => {
      this.keys[e.key.toLowerCase()] = true;
      if (e.code === 'Space') { e.preventDefault(); this._fireSpit(); }
    });
    document.addEventListener('keyup', e => { this.keys[e.key.toLowerCase()] = false; });

    document.addEventListener('mousemove', e => {
      this.mouse.x = (e.clientX / window.innerWidth)  * 2 - 1;
      this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    document.addEventListener('mousedown', e => {
      if (e.button === 0) this._fireSpit();
    });
  }

  _updateAim() {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(this.mouse, this.camera);
    const target = new THREE.Vector3();
    raycaster.ray.intersectPlane(this.groundPlane, target);

    const me = this.lastState?.players?.find(p => p.id === this.localPlayerId);
    if (me && target) {
      const dx = target.x - me.x;
      const dz = target.z - me.z;
      if (Math.abs(dx) > 0.01 || Math.abs(dz) > 0.01) {
        this.aimAngle = Math.atan2(dx, dz);
      }
    }
  }

  _getInput() {
    let vx = 0, vz = 0;
    if (this.keys['w'] || this.keys['arrowup'])    vz -= 1;
    if (this.keys['s'] || this.keys['arrowdown'])  vz += 1;
    if (this.keys['a'] || this.keys['arrowleft'])  vx -= 1;
    if (this.keys['d'] || this.keys['arrowright']) vx += 1;
    const len = Math.sqrt(vx * vx + vz * vz);
    if (len > 0) { vx /= len; vz /= len; }
    return { vx, vz };
  }

  _fireSpit() {
    this.onSpit?.(this.aimAngle);
  }

  // Called every frame to send input to server
  getInputPacket() {
    const { vx, vz } = this._getInput();
    return { type: 'input', vx, vz, angle: this.aimAngle };
  }

  // Apply server state
  applyState(state) {
    this.lastState = state;

    const playerIds   = new Set(state.players.map(p => p.id));
    const spitIds     = new Set(state.spits.map(s => s.id));
    const powerupIds  = new Set(state.powerups.map(p => p.id));

    // ── Players ──
    for (const pd of state.players) {
      if (!this.alpacaMeshes[pd.id]) {
        this._spawnAlpaca(pd);
      }
      this._updateAlpaca(pd);
    }
    // Remove dead meshes
    for (const id of Object.keys(this.alpacaMeshes)) {
      if (!playerIds.has(id)) this._removeAlpaca(id);
    }

    // ── Spits ──
    for (const sd of state.spits) {
      if (!this.spitMeshes[sd.id]) this._spawnSpit(sd);
      const mesh = this.spitMeshes[sd.id];
      if (mesh) mesh.position.set(sd.x, 0.55, sd.z);
    }
    for (const id of Object.keys(this.spitMeshes)) {
      if (!spitIds.has(id)) this._removeSpit(id);
    }

    // ── Powerups ──
    for (const pd of state.powerups) {
      if (!this.powerupMeshes[pd.id]) this._spawnPowerup(pd);
    }
    for (const id of Object.keys(this.powerupMeshes)) {
      if (!powerupIds.has(id)) this._removePowerup(id);
    }
  }

  _spawnAlpaca(pd) {
    // Bot alpacas come from the pre-built pool (no geometry allocation at runtime)
    if (pd.isBot && this._poolReady) {
      const poolEntry = this._acquireFromPool(pd);
      if (poolEntry) return; // pool handled it — done
    }

    const { group, legMeshes, shield, shieldMat } = buildAlpaca(pd.color);
    group.position.set(pd.x, 0, pd.z);
    group.castShadow = true;
    this.scene.add(group);

    const label = this._makeLabel(pd.name, pd.color, pd.id === this.localPlayerId);

    this.alpacaMeshes[pd.id] = { group, legMeshes, shield, shieldMat, label, prevX: pd.x, prevZ: pd.z, walkPhase: 0 };
  }

  _makeLabel(name, color, isLocal) {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 256, 64);
    ctx.fillStyle = isLocal ? '#f4a261' : '#ffffff';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 8;
    ctx.fillText(name, 128, 42);

    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(3, 0.75, 1);
    sprite.position.set(0, 2.7, 0);
    return sprite;
  }

  _updateAlpaca(pd) {
    const entry = this.alpacaMeshes[pd.id];
    if (!entry) return;
    const { group, legMeshes, shield, shieldMat, label } = entry;

    // Smooth position
    const tx = THREE.MathUtils.lerp(group.position.x, pd.x, 0.35);
    const tz = THREE.MathUtils.lerp(group.position.z, pd.z, 0.35);
    group.position.set(tx, 0, tz);

    // Rotation (face movement direction)
    const targetAngle = pd.angle ?? Math.atan2(pd.x - entry.prevX, pd.z - entry.prevZ);
    group.rotation.y = THREE.MathUtils.lerp(group.rotation.y, targetAngle, 0.2);

    entry.prevX = pd.x;
    entry.prevZ = pd.z;

    // Walk animation
    const speed = Math.sqrt((pd.x - tx) ** 2 + (pd.z - tz) ** 2);
    if (speed > 0.01) {
      entry.walkPhase = (entry.walkPhase + 0.2) % (Math.PI * 2);
      const ph = entry.walkPhase;
      legMeshes[0].rotation.x =  Math.sin(ph) * 0.5;
      legMeshes[1].rotation.x = -Math.sin(ph) * 0.5;
      legMeshes[2].rotation.x = -Math.sin(ph) * 0.5;
      legMeshes[3].rotation.x =  Math.sin(ph) * 0.5;
    }

    // Alive/dead visibility
    group.visible = pd.alive;

    // Shield
    const shieldOn = pd.shieldTimer > 0;
    shieldMat.opacity = THREE.MathUtils.lerp(shieldMat.opacity, shieldOn ? 0.35 : 0, 0.15);

    // Name label
    if (pd.alive && !group.children.includes(label)) group.add(label);
    if (!pd.alive && group.children.includes(label)) group.remove(label);

    // Hurt flash (health changed)
    if (pd.health < (entry.lastHealth ?? pd.health)) {
      this._flashRed(group);
      entry.lastHealth = pd.health;
    } else {
      entry.lastHealth = pd.health;
    }
  }

  _flashRed(group) {
    group.traverse(child => {
      if (child.isMesh && child.material) {
        const orig = child.material.color.clone();
        child.material.emissive = new THREE.Color(0xff2200);
        child.material.emissiveIntensity = 1;
        setTimeout(() => {
          if (child.material) {
            child.material.emissive = new THREE.Color(0x000000);
            child.material.emissiveIntensity = 0;
          }
        }, 120);
      }
    });
    this.shakeIntensity = 0.25;
  }

  _removeAlpaca(id) {
    const entry = this.alpacaMeshes[id];
    if (!entry) return;
    // Pool entries are hidden and returned; non-pool entries are disposed
    if (entry.inUse !== undefined) {
      this._releaseToPool(id);
    } else {
      this.scene.remove(entry.group);
      delete this.alpacaMeshes[id];
    }
  }

  _spawnSpit(sd) {
    const big = sd.big;
    const geo = new THREE.SphereGeometry(big ? 0.28 : 0.14, 8, 6);
    const mat = new THREE.MeshStandardMaterial({
      color: big ? 0x4cc9f0 : 0xa8e6cf,
      emissive: big ? 0x4cc9f0 : 0xa8e6cf,
      emissiveIntensity: big ? 1.2 : 0.8,
      roughness: 0.2, metalness: 0.1,
      transparent: true, opacity: 0.9,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(sd.x, 0.55, sd.z);
    mesh.castShadow = true;

    // Glow light
    if (big) {
      const pl = new THREE.PointLight(0x4cc9f0, 1.5, 3);
      mesh.add(pl);
    }

    this.scene.add(mesh);
    this.spitMeshes[sd.id] = mesh;
  }

  _removeSpit(id) {
    const mesh = this.spitMeshes[id];
    if (mesh) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
    }
    delete this.spitMeshes[id];
  }

  _spawnPowerup(pd) {
    const color = POWERUP_COLORS[pd.type] || 0xffffff;
    const group = new THREE.Group();

    // Base glow orb
    const orbGeo = new THREE.SphereGeometry(0.45, 12, 10);
    const orbMat = new THREE.MeshStandardMaterial({
      color, emissive: color, emissiveIntensity: 0.8,
      transparent: true, opacity: 0.85,
      roughness: 0.2, metalness: 0.3,
    });
    const orb = new THREE.Mesh(orbGeo, orbMat);
    group.add(orb);

    // Outer ring
    const ringGeo = new THREE.TorusGeometry(0.6, 0.06, 6, 24);
    const ringMat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.2 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    group.add(ring);

    // Point light
    const pl = new THREE.PointLight(color, 1.2, 5);
    group.add(pl);

    group.position.set(pd.x, 0.6, pd.z);
    group.userData = { baseY: 0.6, type: pd.type, orb, ring };
    this.scene.add(group);
    this.powerupMeshes[pd.id] = group;
  }

  _removePowerup(id) {
    const mesh = this.powerupMeshes[id];
    if (mesh) this.scene.remove(mesh);
    delete this.powerupMeshes[id];
  }

  // ── Enemy mesh pool (survival mode) ─────────────────────────────────────

  /**
   * Pre-build `size` enemy alpaca groups and park them off-screen.
   * Called once when survival mode begins (before wave 1), so no geometry
   * is allocated during gameplay — eliminating the GC spikes that cause lag.
   */
  initSurvivalPool(size = 12) {
    if (this._poolReady) return;
    this._poolReady = true;

    // All enemy bodies share the same dark-red colour → reuse one material
    // instance across the pool to halve GPU draw-call state changes.
    const ENEMY_COLOR = 0xc62828;

    for (let i = 0; i < size; i++) {
      const { group, legMeshes, shield, shieldMat } = buildAlpaca(ENEMY_COLOR);
      group.visible = false;
      group.position.set(999, 0, 999); // park far off-screen
      this.scene.add(group);
      this._enemyPool.push({
        group, legMeshes, shield, shieldMat,
        inUse: false, label: null,
        prevX: 0, prevZ: 0, walkPhase: 0, lastHealth: null,
      });
    }
  }

  /** Grab an idle pool entry and bind it to a player id. Returns entry or null. */
  _acquireFromPool(pd) {
    const entry = this._enemyPool.find(e => !e.inUse);
    if (!entry) return null;

    entry.inUse       = true;
    entry.prevX       = pd.x;
    entry.prevZ       = pd.z;
    entry.walkPhase   = 0;
    entry.lastHealth  = pd.health;
    entry.group.position.set(pd.x, 0, pd.z);
    entry.group.visible = true;

    const label = this._makeLabel(pd.name, pd.color, false);
    entry.label = label;
    // label added/removed by _updateAlpaca as normal

    this.alpacaMeshes[pd.id] = entry;
    return entry;
  }

  /** Return a pool entry back to the idle pool (hide but keep geometry). */
  _releaseToPool(id) {
    const entry = this.alpacaMeshes[id];
    if (!entry || !entry.inUse) return;

    entry.group.visible = false;
    entry.group.position.set(999, 0, 999);
    if (entry.label && entry.group.children.includes(entry.label)) {
      entry.group.remove(entry.label);
      entry.label = null;
    }
    // Reset shield opacity so next wave gets a clean alpaca
    entry.shieldMat.opacity = 0;
    entry.inUse = false;

    delete this.alpacaMeshes[id];
  }

  onSpitImpact(x, z, big) { this.particles.spitImpact(x, z, big); }
  onShieldBlock(x, z)      { this.particles.shieldBlock(x, z); }
  onPowerupPickup(x, z, type) { this.particles.powerupPickup(x, z, type); }
  onElimination(pid) {
    const mesh = this.alpacaMeshes[pid];
    if (mesh) {
      this.particles.elimination(mesh.group.position.x, mesh.group.position.z, 0xf4a261);
    }
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    const dt = this.clock.getDelta();
    const t  = this.clock.getElapsedTime();

    this._updateAim();
    this.particles.update(dt);
    this.onFrame?.(dt);

    // Animate powerup meshes
    for (const mesh of Object.values(this.powerupMeshes)) {
      mesh.position.y = mesh.userData.baseY + Math.sin(t * 2 + mesh.position.x) * 0.2;
      mesh.rotation.y += dt * 1.5;
      mesh.userData.ring.rotation.z += dt * 2;
    }

    // Animate spit meshes
    for (const mesh of Object.values(this.spitMeshes)) {
      mesh.rotation.y += dt * 8;
    }

    // Camera follow local player
    const me = this.lastState?.players?.find(p => p.id === this.localPlayerId);
    if (me) {
      const targetX = me.x * 0.15;
      const targetZ = me.z * 0.15;
      this.cameraTarget.set(targetX, 0, targetZ);
    }
    this.camera.position.x = THREE.MathUtils.lerp(
      this.camera.position.x, this.cameraOffset.x + this.cameraTarget.x, 0.05);
    this.camera.position.z = THREE.MathUtils.lerp(
      this.camera.position.z, this.cameraOffset.z + this.cameraTarget.z, 0.05);
    this.camera.position.y = this.cameraOffset.y;

    // Camera shake
    if (this.shakeIntensity > 0.01) {
      this.camera.position.x += (Math.random() - 0.5) * this.shakeIntensity;
      this.camera.position.y += (Math.random() - 0.5) * this.shakeIntensity;
      this.shakeIntensity *= 0.85;
    }

    this.camera.lookAt(this.cameraTarget);
    this.renderer.render(this.scene, this.camera);
  }
}
