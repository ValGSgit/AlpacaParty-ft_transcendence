import * as THREE from 'three';

export function buildArena(scene) {
  const RADIUS = 18;

  // Sky color
  scene.background = new THREE.Color(0x0d1a2e);
  scene.fog = new THREE.FogExp2(0x0d1a2e, 0.028);

  // Ground
  const groundGeo = new THREE.CircleGeometry(RADIUS, 64);
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x2d5a27,
    roughness: 0.95,
    metalness: 0,
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Ground pattern (rings)
  const ringGeo = new THREE.RingGeometry(RADIUS * 0.4, RADIUS * 0.42, 64);
  const ringMat = new THREE.MeshStandardMaterial({ color: 0x3d7a35, roughness: 1, side: THREE.DoubleSide });
  const ring1 = new THREE.Mesh(ringGeo, ringMat);
  ring1.rotation.x = -Math.PI / 2;
  ring1.position.y = 0.01;
  scene.add(ring1);

  const ring2 = new THREE.Mesh(new THREE.RingGeometry(RADIUS * 0.7, RADIUS * 0.72, 64), ringMat.clone());
  ring2.rotation.x = -Math.PI / 2; ring2.position.y = 0.01;
  scene.add(ring2);

  // Arena wall (cylinder boundary)
  const wallGeo = new THREE.CylinderGeometry(RADIUS, RADIUS, 1.2, 64, 1, true);
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x8b5cf6, roughness: 0.6, metalness: 0.3,
    side: THREE.BackSide, transparent: true, opacity: 0.8,
  });
  const wall = new THREE.Mesh(wallGeo, wallMat);
  wall.position.y = 0.6;
  scene.add(wall);

  // Wall glow outer ring
  const glowRingGeo = new THREE.TorusGeometry(RADIUS, 0.15, 8, 80);
  const glowRingMat = new THREE.MeshStandardMaterial({
    color: 0x8b5cf6, emissive: 0x8b5cf6, emissiveIntensity: 1.5,
    roughness: 0.2, metalness: 0.5,
  });
  const glowRing = new THREE.Mesh(glowRingGeo, glowRingMat);
  glowRing.rotation.x = Math.PI / 2;
  glowRing.position.y = 0.08;
  scene.add(glowRing);

  // Decorative pillars around edge
  const pillarCount = 12;
  for (let i = 0; i < pillarCount; i++) {
    const angle = (i / pillarCount) * Math.PI * 2;
    const px = Math.cos(angle) * (RADIUS - 0.6);
    const pz = Math.sin(angle) * (RADIUS - 0.6);

    const pillarGeo = new THREE.CylinderGeometry(0.3, 0.35, 2.5, 8);
    const pillarMat = new THREE.MeshStandardMaterial({
      color: 0x4a3080, roughness: 0.5, metalness: 0.6,
    });
    const pillar = new THREE.Mesh(pillarGeo, pillarMat);
    pillar.position.set(px, 1.25, pz);
    pillar.castShadow = true;
    scene.add(pillar);

    // Pillar cap
    const capGeo = new THREE.SphereGeometry(0.35, 8, 6);
    const capMat = new THREE.MeshStandardMaterial({
      color: 0xb388ff, emissive: 0x6a1de0, emissiveIntensity: 0.8,
      roughness: 0.2, metalness: 0.7,
    });
    const cap = new THREE.Mesh(capGeo, capMat);
    cap.position.set(px, 2.7, pz);
    scene.add(cap);
  }

  // Center decorative star
  const starGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.02, 8);
  const starMat = new THREE.MeshStandardMaterial({ color: 0xe9c46a, emissive: 0xe9c46a, emissiveIntensity: 0.5 });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const arm = new THREE.Mesh(
      new THREE.BoxGeometry(4, 0.05, 0.18),
      starMat
    );
    arm.rotation.y = a;
    arm.position.y = 0.02;
    scene.add(arm);
  }

  // Ambient ground patches (darker spots for texture)
  for (let i = 0; i < 20; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = Math.random() * (RADIUS - 2) + 0.5;
    const patchGeo = new THREE.CircleGeometry(Math.random() * 0.8 + 0.3, 8);
    const patchMat = new THREE.MeshStandardMaterial({
      color: Math.random() > 0.5 ? 0x245a20 : 0x3a7a32,
      roughness: 1,
    });
    const patch = new THREE.Mesh(patchGeo, patchMat);
    patch.rotation.x = -Math.PI / 2;
    patch.position.set(Math.cos(angle) * r, 0.005, Math.sin(angle) * r);
    scene.add(patch);
  }

  // Some rocks/boulders as obstacles
  const rockPositions = [
    { x: -5, z: -5 }, { x: 5, z: 5 }, { x: -5, z: 7 }, { x: 7, z: -4 },
  ];
  rockPositions.forEach(({ x, z }) => {
    const rg = new THREE.DodecahedronGeometry(0.7, 0);
    const rm = new THREE.MeshStandardMaterial({ color: 0x667788, roughness: 0.9 });
    const rock = new THREE.Mesh(rg, rm);
    rock.position.set(x, 0.5, z);
    rock.rotation.set(Math.random(), Math.random(), Math.random());
    rock.castShadow = true; rock.receiveShadow = true;
    scene.add(rock);
  });

  // Star field (background particles)
  const starCount = 600;
  const starGeoPoints = new THREE.BufferGeometry();
  const positions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    positions[i * 3]     = (Math.random() - 0.5) * 300;
    positions[i * 3 + 1] = Math.random() * 80 + 10;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 300;
  }
  starGeoPoints.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const starPoints = new THREE.Points(
    starGeoPoints,
    new THREE.PointsMaterial({ color: 0xffffff, size: 0.2, sizeAttenuation: true })
  );
  scene.add(starPoints);

  // Lighting
  const ambient = new THREE.AmbientLight(0x446688, 0.6);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xfff5e0, 1.8);
  sun.position.set(10, 20, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.far = 80;
  sun.shadow.camera.left = -25; sun.shadow.camera.right = 25;
  sun.shadow.camera.top = 25; sun.shadow.camera.bottom = -25;
  scene.add(sun);

  // Rim lights for atmosphere
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
