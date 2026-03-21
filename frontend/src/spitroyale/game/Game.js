import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { buildArena } from './Arena.js';
import { buildAlpaca } from './Alpaca.js';
import { ParticleSystem } from './Particles.js';

const POWERUP_COLORS = { speed: 0xffee58, shield: 0x4cc9f0, bigSpit: 0x26c6da, heal: 0x66bb6a };

export class Game {
  constructor(container, localPlayerId) {
    this.container = container;
    this.localPlayerId = localPlayerId;
    this.alpacaMeshes = {};
    this.pendingAlpacaSpawns = new Set();
    this.spitMeshes = {};
    this.powerupMeshes = {};
    this.gltfLoader = new GLTFLoader();
    this.llamaTemplatePromise = null;
    this.lastState = null;
    this.clock = new THREE.Clock();
    this.mouse = new THREE.Vector2();
    this.aimAngle = 0;
    this.shakeIntensity = 0;
    this.cameraOffset = new THREE.Vector3(0, 22, 18);
    this.cameraTarget = new THREE.Vector3();

    this.isDestroyed = false;
    this.onFrame = null;
    this.onSpit = null;

    this.keyDownHandler = (e) => {
      this.keys[e.key.toLowerCase()] = true;
      if (e.code === 'Space') {
        e.preventDefault();
        this.#fireSpit();
      }
    };
    this.keyUpHandler = (e) => { this.keys[e.key.toLowerCase()] = false; };
    this.mouseMoveHandler = (e) => {
      this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    this.mouseDownHandler = (e) => {
      if (e.button === 0) this.#fireSpit();
    };
    this.resizeHandler = () => {
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    };

    this.#initRenderer();
    this.#initScene();
    this.#initInput();

    this.particles = new ParticleSystem(this.scene);
    this.animate();
  }

  #initRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.container.appendChild(this.renderer.domElement);
    window.addEventListener('resize', this.resizeHandler);
  }

  #initScene() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 400);
    this.camera.position.copy(this.cameraOffset);
    this.camera.lookAt(0, 0, 0);
    buildArena(this.scene);
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  }

  #initInput() {
    this.keys = {};
    document.addEventListener('keydown', this.keyDownHandler);
    document.addEventListener('keyup', this.keyUpHandler);
    document.addEventListener('mousemove', this.mouseMoveHandler);
    document.addEventListener('mousedown', this.mouseDownHandler);
  }

  async #getLlamaTemplate() {
    if (!this.llamaTemplatePromise) {
      this.llamaTemplatePromise = this.gltfLoader.loadAsync('/models/Llama.glb')
        .then((gltf) => gltf.scene)
        .catch(() => null);
    }
    return this.llamaTemplatePromise;
  }

  #normalizeModelHeight(model, targetHeight = 2.2) {
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    if (size.y <= 0.001) return;
    const scale = targetHeight / size.y;
    model.scale.multiplyScalar(scale);

    const corrected = new THREE.Box3().setFromObject(model);
    model.position.y -= corrected.min.y;
  }

  #tintModel(model, colorHex) {
    const tint = new THREE.Color(colorHex);
    model.traverse((child) => {
      if (!child.isMesh || !child.material) return;

      child.castShadow = true;
      child.receiveShadow = true;

      const materials = Array.isArray(child.material) ? child.material : [child.material];
      const tinted = materials.map((mat) => {
        const copy = mat.clone();
        if (copy.color) copy.color.lerp(tint, 0.35);
        return copy;
      });
      child.material = Array.isArray(child.material) ? tinted : tinted[0];
    });
  }

  async #buildAlpacaModel(colorHex) {
    const template = await this.#getLlamaTemplate();
    if (!template) return buildAlpaca(colorHex);

    const group = new THREE.Group();
    const model = clone(template);
    this.#tintModel(model, colorHex);
    this.#normalizeModelHeight(model);
    group.add(model);

    const shieldGeo = new THREE.SphereGeometry(1.35, 18, 14);
    const shieldMat = new THREE.MeshPhysicalMaterial({
      color: 0x4cc9f0,
      transmission: 0.8,
      roughness: 0.1,
      metalness: 0,
      transparent: true,
      opacity: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.2,
    });
    const shield = new THREE.Mesh(shieldGeo, shieldMat);
    shield.position.y = 1.1;
    group.add(shield);

    return { group, legMeshes: [], shieldMat };
  }

  #updateAim() {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(this.mouse, this.camera);
    const target = new THREE.Vector3();
    raycaster.ray.intersectPlane(this.groundPlane, target);

    const me = this.lastState?.players?.find((p) => p.id === this.localPlayerId);
    if (!me || !target) return;

    const dx = target.x - me.x;
    const dz = target.z - me.z;
    if (Math.abs(dx) > 0.01 || Math.abs(dz) > 0.01) {
      this.aimAngle = Math.atan2(dx, dz);
    }
  }

  #getInput() {
    let vx = 0;
    let vz = 0;
    if (this.keys.w || this.keys.arrowup) vz -= 1;
    if (this.keys.s || this.keys.arrowdown) vz += 1;
    if (this.keys.a || this.keys.arrowleft) vx -= 1;
    if (this.keys.d || this.keys.arrowright) vx += 1;
    const len = Math.sqrt(vx * vx + vz * vz);
    if (len > 0) {
      vx /= len;
      vz /= len;
    }
    return { vx, vz };
  }

  #fireSpit() {
    this.onSpit?.(this.aimAngle);
  }

  getInputPacket() {
    const { vx, vz } = this.#getInput();
    return { vx, vz, angle: this.aimAngle };
  }

  applyState(state) {
    this.lastState = state;

    const playerIds = new Set(state.players.map((p) => p.id));
    const spitIds = new Set(state.spits.map((s) => s.id));
    const powerupIds = new Set(state.powerups.map((p) => p.id));

    for (const pd of state.players) {
      if (!this.alpacaMeshes[pd.id] && !this.pendingAlpacaSpawns.has(pd.id)) {
        this.pendingAlpacaSpawns.add(pd.id);
        this.#spawnAlpaca(pd).finally(() => this.pendingAlpacaSpawns.delete(pd.id));
      }
      this.#updateAlpaca(pd);
    }
    for (const id of Object.keys(this.alpacaMeshes)) {
      if (!playerIds.has(id)) this.#removeAlpaca(id);
    }

    for (const sd of state.spits) {
      if (!this.spitMeshes[sd.id]) this.#spawnSpit(sd);
      const mesh = this.spitMeshes[sd.id];
      if (mesh) mesh.position.set(sd.x, 0.55, sd.z);
    }
    for (const id of Object.keys(this.spitMeshes)) {
      if (!spitIds.has(id)) this.#removeSpit(id);
    }

    for (const pd of state.powerups) {
      if (!this.powerupMeshes[pd.id]) this.#spawnPowerup(pd);
    }
    for (const id of Object.keys(this.powerupMeshes)) {
      if (!powerupIds.has(id)) this.#removePowerup(id);
    }
  }

  async #spawnAlpaca(pd) {
    const { group, legMeshes, shieldMat } = await this.#buildAlpacaModel(pd.color);
    if (this.isDestroyed) return;
    group.position.set(pd.x, 0, pd.z);
    group.castShadow = true;
    this.scene.add(group);

    const label = this.#makeLabel(pd.name, pd.id === this.localPlayerId);

    this.alpacaMeshes[pd.id] = {
      group,
      legMeshes,
      shieldMat,
      label,
      prevX: pd.x,
      prevZ: pd.z,
      bobPhase: Math.random() * Math.PI * 2,
    };
  }

  #makeLabel(name, isLocal) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
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

  #updateAlpaca(pd) {
    const entry = this.alpacaMeshes[pd.id];
    if (!entry) return;
    const { group, legMeshes, shieldMat, label } = entry;

    const tx = THREE.MathUtils.lerp(group.position.x, pd.x, 0.35);
    const tz = THREE.MathUtils.lerp(group.position.z, pd.z, 0.35);
    group.position.set(tx, 0, tz);

    const targetAngle = pd.angle ?? Math.atan2(pd.x - entry.prevX, pd.z - entry.prevZ);
    group.rotation.y = THREE.MathUtils.lerp(group.rotation.y, targetAngle, 0.2);

    entry.prevX = pd.x;
    entry.prevZ = pd.z;

    const speed = Math.sqrt((pd.x - tx) ** 2 + (pd.z - tz) ** 2);
    if (speed > 0.01 && legMeshes.length === 4) {
      entry.bobPhase = (entry.bobPhase + 0.2) % (Math.PI * 2);
      const ph = entry.bobPhase;
      legMeshes[0].rotation.x = Math.sin(ph) * 0.5;
      legMeshes[1].rotation.x = -Math.sin(ph) * 0.5;
      legMeshes[2].rotation.x = -Math.sin(ph) * 0.5;
      legMeshes[3].rotation.x = Math.sin(ph) * 0.5;
    } else {
      entry.bobPhase = (entry.bobPhase + 0.08) % (Math.PI * 2);
      group.position.y = Math.sin(entry.bobPhase) * 0.03;
    }

    group.visible = pd.alive;

    const shieldOn = pd.shieldTimer > 0;
    shieldMat.opacity = THREE.MathUtils.lerp(shieldMat.opacity, shieldOn ? 0.35 : 0, 0.15);

    if (pd.alive && !group.children.includes(label)) group.add(label);
    if (!pd.alive && group.children.includes(label)) group.remove(label);

    if (pd.health < (entry.lastHealth ?? pd.health)) {
      this.#flashRed(group);
      entry.lastHealth = pd.health;
    } else {
      entry.lastHealth = pd.health;
    }
  }

  #flashRed(group) {
    group.traverse((child) => {
      if (child.isMesh && child.material) {
        if (!child.material.emissive) return;
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

  #removeAlpaca(id) {
    const entry = this.alpacaMeshes[id];
    if (!entry) return;
    this.scene.remove(entry.group);
    delete this.alpacaMeshes[id];
  }

  #spawnSpit(sd) {
    const big = sd.big;
    const geo = new THREE.SphereGeometry(big ? 0.28 : 0.14, 8, 6);
    const mat = new THREE.MeshStandardMaterial({
      color: big ? 0x4cc9f0 : 0xa8e6cf,
      emissive: big ? 0x4cc9f0 : 0xa8e6cf,
      emissiveIntensity: big ? 1.2 : 0.8,
      roughness: 0.2,
      metalness: 0.1,
      transparent: true,
      opacity: 0.9,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(sd.x, 0.55, sd.z);
    mesh.castShadow = true;

    if (big) {
      const light = new THREE.PointLight(0x4cc9f0, 1.5, 3);
      mesh.add(light);
    }

    this.scene.add(mesh);
    this.spitMeshes[sd.id] = mesh;
  }

  #removeSpit(id) {
    const mesh = this.spitMeshes[id];
    if (!mesh) return;
    this.scene.remove(mesh);
    mesh.geometry.dispose();
    mesh.material.dispose();
    delete this.spitMeshes[id];
  }

  #spawnPowerup(pd) {
    const color = POWERUP_COLORS[pd.type] || 0xffffff;
    const group = new THREE.Group();

    const orb = new THREE.Mesh(
      new THREE.SphereGeometry(0.45, 12, 10),
      new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.8,
        transparent: true,
        opacity: 0.85,
        roughness: 0.2,
        metalness: 0.3,
      }),
    );
    group.add(orb);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.6, 0.06, 6, 24),
      new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.2 }),
    );
    ring.rotation.x = Math.PI / 2;
    group.add(ring);

    const light = new THREE.PointLight(color, 1.2, 5);
    group.add(light);

    group.position.set(pd.x, 0.6, pd.z);
    group.userData = { baseY: 0.6, ring };
    this.scene.add(group);
    this.powerupMeshes[pd.id] = group;
  }

  #removePowerup(id) {
    const mesh = this.powerupMeshes[id];
    if (!mesh) return;
    this.scene.remove(mesh);
    delete this.powerupMeshes[id];
  }

  onSpitImpact(x, z, big) {
    this.particles.spitImpact(x, z, big);
  }

  onShieldBlock(x, z) {
    this.particles.shieldBlock(x, z);
  }

  onPowerupPickup(x, z, type) {
    this.particles.powerupPickup(x, z, type);
  }

  onElimination(pid) {
    const mesh = this.alpacaMeshes[pid];
    if (mesh) {
      this.particles.elimination(mesh.group.position.x, mesh.group.position.z, 0xf4a261);
    }
  }

  animate() {
    if (this.isDestroyed) return;
    this.frameId = requestAnimationFrame(() => this.animate());

    const dt = this.clock.getDelta();
    const t = this.clock.getElapsedTime();

    this.#updateAim();
    this.particles.update(dt);
    this.onFrame?.(dt);

    for (const mesh of Object.values(this.powerupMeshes)) {
      mesh.position.y = mesh.userData.baseY + Math.sin(t * 2 + mesh.position.x) * 0.2;
      mesh.rotation.y += dt * 1.5;
      mesh.userData.ring.rotation.z += dt * 2;
    }

    for (const mesh of Object.values(this.spitMeshes)) {
      mesh.rotation.y += dt * 8;
    }

    const me = this.lastState?.players?.find((p) => p.id === this.localPlayerId);
    if (me) {
      this.cameraTarget.set(me.x * 0.15, 0, me.z * 0.15);
    }

    this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, this.cameraOffset.x + this.cameraTarget.x, 0.05);
    this.camera.position.z = THREE.MathUtils.lerp(this.camera.position.z, this.cameraOffset.z + this.cameraTarget.z, 0.05);
    this.camera.position.y = this.cameraOffset.y;

    if (this.shakeIntensity > 0.01) {
      this.camera.position.x += (Math.random() - 0.5) * this.shakeIntensity;
      this.camera.position.y += (Math.random() - 0.5) * this.shakeIntensity;
      this.shakeIntensity *= 0.85;
    }

    this.camera.lookAt(this.cameraTarget);
    this.renderer.render(this.scene, this.camera);
  }

  destroy() {
    this.isDestroyed = true;
    if (this.frameId) cancelAnimationFrame(this.frameId);
    window.removeEventListener('resize', this.resizeHandler);
    document.removeEventListener('keydown', this.keyDownHandler);
    document.removeEventListener('keyup', this.keyUpHandler);
    document.removeEventListener('mousemove', this.mouseMoveHandler);
    document.removeEventListener('mousedown', this.mouseDownHandler);
    this.particles.destroy();
    this.renderer.dispose();
    if (this.renderer.domElement && this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}
