import * as THREE from 'three';

const WOOLLY_COLOR = 0xfff8ee;

export function buildAlpaca(bodyColor = 0xf4a261) {
  const group = new THREE.Group();

  const mat = (color, rough = 0.85, metal = 0) =>
    new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });

  const woolMat = mat(WOOLLY_COLOR, 0.95);
  const bodyMat = mat(bodyColor, 0.9);
  const darkMat = mat(0x3a2010, 0.8);
  const eyeMat  = mat(0x111111, 0.3, 0.1);
  const noseMat = mat(0xc27b5e, 0.9);

  // Body (fluffy wool blob)
  const bodyGeo = new THREE.SphereGeometry(0.65, 10, 8);
  const body = new THREE.Mesh(bodyGeo, woolMat);
  body.scale.set(1, 0.85, 1.3);
  body.position.set(0, 0.72, 0);
  body.castShadow = true;
  group.add(body);

  // Under-body color patch
  const bellyGeo = new THREE.SphereGeometry(0.5, 8, 6);
  const belly = new THREE.Mesh(bellyGeo, bodyMat);
  belly.scale.set(0.9, 0.6, 1.1);
  belly.position.set(0, 0.48, 0);
  group.add(belly);

  // Neck
  const neckGeo = new THREE.CylinderGeometry(0.22, 0.28, 0.7, 8);
  const neck = new THREE.Mesh(neckGeo, bodyMat);
  neck.position.set(0, 1.25, 0.38);
  neck.rotation.x = -0.35;
  neck.castShadow = true;
  group.add(neck);

  // Neck wool tuft
  const neckWoolGeo = new THREE.SphereGeometry(0.26, 8, 6);
  const neckWool = new THREE.Mesh(neckWoolGeo, woolMat);
  neckWool.scale.set(1, 1.4, 1);
  neckWool.position.copy(neck.position);
  neckWool.position.y += 0.1;
  group.add(neckWool);

  // Head
  const headGeo = new THREE.SphereGeometry(0.3, 10, 8);
  const head = new THREE.Mesh(headGeo, bodyMat);
  head.scale.set(1, 0.9, 1.15);
  head.position.set(0, 1.72, 0.7);
  head.castShadow = true;
  group.add(head);

  // Snout
  const snoutGeo = new THREE.SphereGeometry(0.16, 8, 6);
  const snout = new THREE.Mesh(snoutGeo, noseMat);
  snout.scale.set(1, 0.7, 1.2);
  snout.position.set(0, 1.66, 0.88);
  group.add(snout);

  // Nostrils
  const nostrilGeo = new THREE.SphereGeometry(0.04, 6, 4);
  const nostrilMat = mat(0x5a2010, 0.9);
  [-0.07, 0.07].forEach(ox => {
    const n = new THREE.Mesh(nostrilGeo, nostrilMat);
    n.position.set(ox, 1.64, 0.96);
    group.add(n);
  });

  // Eyes
  const eyeGeo = new THREE.SphereGeometry(0.065, 8, 6);
  [-0.12, 0.12].forEach(ox => {
    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.position.set(ox, 1.76, 0.8);

    // Catchlight
    const cl = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 4), mat(0xffffff, 0.1));
    cl.position.set(ox + 0.02, 1.78, 0.84);
    group.add(eye, cl);
  });

  // Ears
  const earGeo = new THREE.ConeGeometry(0.08, 0.22, 6);
  [-0.19, 0.19].forEach((ox, i) => {
    const ear = new THREE.Mesh(earGeo, bodyMat);
    ear.position.set(ox, 1.98, 0.64);
    ear.rotation.z = i === 0 ? 0.3 : -0.3;
    group.add(ear);
  });

  // Top-knot wool puff
  const knotGeo = new THREE.SphereGeometry(0.22, 8, 6);
  const knot = new THREE.Mesh(knotGeo, woolMat);
  knot.scale.set(1, 0.7, 1);
  knot.position.set(0, 1.95, 0.62);
  group.add(knot);

  // Eyelashes (simple)
  const lashMat = mat(0x111111, 0.9);
  const lashGeo = new THREE.BoxGeometry(0.18, 0.012, 0.012);
  [-0.12, 0.12].forEach(ox => {
    const lash = new THREE.Mesh(lashGeo, lashMat);
    lash.position.set(ox, 1.8, 0.83);
    group.add(lash);
  });

  // Legs
  const legGeo = new THREE.CylinderGeometry(0.1, 0.09, 0.65, 7);
  const legPositions = [
    { x: -0.3, z: -0.45 }, { x: 0.3, z: -0.45 },
    { x: -0.3, z:  0.3  }, { x: 0.3, z:  0.3  },
  ];
  const legMeshes = legPositions.map(({ x, z }) => {
    const leg = new THREE.Mesh(legGeo, bodyMat);
    leg.position.set(x, 0.32, z);
    leg.castShadow = true;
    group.add(leg);
    return leg;
  });

  // Hooves
  const hoofGeo = new THREE.CylinderGeometry(0.1, 0.09, 0.12, 7);
  const hoofMat = mat(0x1a1a1a, 0.7);
  legPositions.forEach(({ x, z }) => {
    const hoof = new THREE.Mesh(hoofGeo, hoofMat);
    hoof.position.set(x, 0.01, z);
    group.add(hoof);
  });

  // Tail nub
  const tailGeo = new THREE.SphereGeometry(0.13, 6, 5);
  const tail = new THREE.Mesh(tailGeo, woolMat);
  tail.position.set(0, 0.85, -0.62);
  group.add(tail);

  // Shield sphere (hidden by default)
  const shieldGeo = new THREE.SphereGeometry(1.1, 16, 12);
  const shieldMat = new THREE.MeshStandardMaterial({
    color: 0x4cc9f0, transparent: true, opacity: 0,
    roughness: 0.1, metalness: 0.8, side: THREE.DoubleSide,
  });
  const shield = new THREE.Mesh(shieldGeo, shieldMat);
  shield.position.set(0, 0.9, 0);
  group.add(shield);

  return { group, legMeshes, shield, shieldMat };
}
