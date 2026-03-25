import * as THREE from 'three';

export function buildArena(scene) {
  const radius = 18;

  scene.fog = new THREE.FogExp2(0x050d1a, 0.022);

  // Gradient sky dome (replaces flat background colour)
  const skyCanvas = document.createElement('canvas');
  skyCanvas.width = 4;
  skyCanvas.height = 512;
  const skyCtx = skyCanvas.getContext('2d');
  const skyGrad = skyCtx.createLinearGradient(0, 0, 0, 512);
  skyGrad.addColorStop(0, '#020d1c');
  skyGrad.addColorStop(0.45, '#0d1a2e');
  skyGrad.addColorStop(0.8, '#1a0533');
  skyGrad.addColorStop(1, '#0d0520');
  skyCtx.fillStyle = skyGrad;
  skyCtx.fillRect(0, 0, 4, 512);
  const skyTex = new THREE.CanvasTexture(skyCanvas);
  const skyDome = new THREE.Mesh(
    new THREE.SphereGeometry(180, 32, 16),
    new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false }),
  );
  scene.add(skyDome);

  // Radial gradient ground texture (brighter centre → darker edge)
  const gCanvas = document.createElement('canvas');
  gCanvas.width = 256;
  gCanvas.height = 256;
  const gCtx = gCanvas.getContext('2d');
  const gGrad = gCtx.createRadialGradient(128, 128, 0, 128, 128, 128);
  gGrad.addColorStop(0, '#3d7a32');
  gGrad.addColorStop(0.55, '#2d5a27');
  gGrad.addColorStop(1, '#1a3a18');
  gCtx.fillStyle = gGrad;
  gCtx.fillRect(0, 0, 256, 256);
  const groundTex = new THREE.CanvasTexture(gCanvas);

  const groundGeo = new THREE.CircleGeometry(radius, 48);
  const groundMat = new THREE.MeshStandardMaterial({
    map: groundTex,
    roughness: 0.95,
    metalness: 0,
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const ringGeo = new THREE.RingGeometry(radius * 0.4, radius * 0.42, 48);
  const ringMat = new THREE.MeshStandardMaterial({ color: 0x3d7a35, roughness: 1, side: THREE.DoubleSide });
  const ring1 = new THREE.Mesh(ringGeo, ringMat);
  ring1.rotation.x = -Math.PI / 2;
  ring1.position.y = 0.01;
  scene.add(ring1);

  const ring2 = new THREE.Mesh(new THREE.RingGeometry(radius * 0.7, radius * 0.72, 48), ringMat);
  ring2.rotation.x = -Math.PI / 2;
  ring2.position.y = 0.01;
  scene.add(ring2);

  const wallGeo = new THREE.CylinderGeometry(radius, radius, 1.2, 48, 1, true);
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x8b5cf6,
    roughness: 0.6,
    metalness: 0.3,
    side: THREE.BackSide,
    transparent: true,
    opacity: 0.8,
  });
  const wall = new THREE.Mesh(wallGeo, wallMat);
  wall.position.y = 0.6;
  scene.add(wall);

  const glowRingGeo = new THREE.TorusGeometry(radius, 0.15, 6, 48);
  const glowRingMat = new THREE.MeshStandardMaterial({
    color: 0x8b5cf6,
    emissive: 0x8b5cf6,
    emissiveIntensity: 1.5,
    roughness: 0.2,
    metalness: 0.5,
  });
  const glowRing = new THREE.Mesh(glowRingGeo, glowRingMat);
  glowRing.rotation.x = Math.PI / 2;
  glowRing.position.y = 0.08;
  scene.add(glowRing);

  // Pillars — InstancedMesh for a single draw call instead of 12
  const pillarCount = 12;
  const pillarGeo = new THREE.CylinderGeometry(0.3, 0.35, 2.5, 6);
  const pillarMat = new THREE.MeshStandardMaterial({ color: 0x4a3080, roughness: 0.5, metalness: 0.6 });
  const pillars = new THREE.InstancedMesh(pillarGeo, pillarMat, pillarCount);
  pillars.castShadow = true;

  const capGeo = new THREE.SphereGeometry(0.35, 6, 4);
  const capMat = new THREE.MeshStandardMaterial({
    color: 0xb388ff,
    emissive: 0x6a1de0,
    emissiveIntensity: 0.8,
    roughness: 0.2,
    metalness: 0.7,
  });
  const caps = new THREE.InstancedMesh(capGeo, capMat, pillarCount);

  const _m = new THREE.Matrix4();
  for (let i = 0; i < pillarCount; i += 1) {
    const angle = (i / pillarCount) * Math.PI * 2;
    const px = Math.cos(angle) * (radius - 0.6);
    const pz = Math.sin(angle) * (radius - 0.6);

    _m.makeTranslation(px, 1.25, pz);
    pillars.setMatrixAt(i, _m);

    _m.makeTranslation(px, 2.7, pz);
    caps.setMatrixAt(i, _m);
  }
  scene.add(pillars);
  scene.add(caps);

  const starMat = new THREE.MeshStandardMaterial({ color: 0xe9c46a, emissive: 0xe9c46a, emissiveIntensity: 0.5 });
  for (let i = 0; i < 8; i += 1) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(4, 0.05, 0.18), starMat);
    arm.rotation.y = (i / 8) * Math.PI * 2;
    arm.position.y = 0.02;
    scene.add(arm);
  }

  const patchGeo = new THREE.CircleGeometry(0.6, 6);
  const patchMatA = new THREE.MeshStandardMaterial({ color: 0x245a20, roughness: 1 });
  const patchMatB = new THREE.MeshStandardMaterial({ color: 0x3a7a32, roughness: 1 });
  for (let i = 0; i < 12; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const r = Math.random() * (radius - 2) + 0.5;
    const patch = new THREE.Mesh(patchGeo, i % 2 === 0 ? patchMatA : patchMatB);
    patch.rotation.x = -Math.PI / 2;
    const s = Math.random() * 0.6 + 0.5;
    patch.scale.set(s, s, 1);
    patch.position.set(Math.cos(angle) * r, 0.005, Math.sin(angle) * r);
    scene.add(patch);
  }

  const rockPositions = [
    { x: -5, z: -5 },
    { x: 5, z: 5 },
    { x: -5, z: 7 },
    { x: 7, z: -4 },
  ];
  const rockGeo = new THREE.DodecahedronGeometry(0.7, 0);
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x667788, roughness: 0.9 });
  rockPositions.forEach(({ x, z }) => {
    const rock = new THREE.Mesh(rockGeo, rockMat);
    rock.position.set(x, 0.5, z);
    rock.rotation.set(Math.random(), Math.random(), Math.random());
    rock.castShadow = true;
    rock.receiveShadow = true;
    scene.add(rock);
  });

  const starCount = 300;
  const starGeo = new THREE.BufferGeometry();
  const positions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i += 1) {
    positions[i * 3] = (Math.random() - 0.5) * 300;
    positions[i * 3 + 1] = Math.random() * 80 + 10;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 300;
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.2, sizeAttenuation: true, fog: false }));
  scene.add(stars);

  scene.add(new THREE.AmbientLight(0x446688, 0.6));

  const sun = new THREE.DirectionalLight(0xfff5e0, 1.8);
  sun.position.set(10, 20, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.far = 80;
  sun.shadow.camera.left = -25;
  sun.shadow.camera.right = 25;
  sun.shadow.camera.top = 25;
  sun.shadow.camera.bottom = -25;
  scene.add(sun);

  const rimBlue = new THREE.PointLight(0x4cc9f0, 1.2, 40);
  rimBlue.position.set(-15, 8, -15);
  scene.add(rimBlue);

  const rimPurple = new THREE.PointLight(0x8b5cf6, 1.0, 40);
  rimPurple.position.set(15, 8, 15);
  scene.add(rimPurple);

  const rimAmber = new THREE.PointLight(0xf4a261, 0.8, 35);
  rimAmber.position.set(0, 6, -18);
  scene.add(rimAmber);

  return { ground, glowRing };
}
