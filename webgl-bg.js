// 0xCMS landing — WebGL background (three.js)
// A drifting "node network" particle field with proximity links and a slow
// wireframe icosahedron, rendered behind the page content.
// Classic script (not a module) so it also works when the page is opened
// directly from disk via file://, where local module imports are blocked.
(function () {
const canvas = document.getElementById('bg-canvas');
if (!canvas || typeof THREE === 'undefined') {
  console.warn('0xCMS bg: three.js not loaded, skipping WebGL background');
  return;
}
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
} catch (err) {
  console.warn('0xCMS bg: WebGL unavailable, skipping background', err);
  return;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x05010f, 0.028);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.z = 16;

// ── Node field ───────────────────────────────────────────────────────────────
const NODE_COUNT = 170;
const FIELD = { x: 30, y: 18, z: 12 };
const LINK_DIST = 4.2;

const positions = new Float32Array(NODE_COUNT * 3);
const velocities = new Float32Array(NODE_COUNT * 3);
const nodeColors = new Float32Array(NODE_COUNT * 3);

const palette = [new THREE.Color(0x22d3ee), new THREE.Color(0xa855f7), new THREE.Color(0x34d399)];

for (let i = 0; i < NODE_COUNT; i++) {
  positions[i * 3] = (Math.random() - 0.5) * FIELD.x;
  positions[i * 3 + 1] = (Math.random() - 0.5) * FIELD.y;
  positions[i * 3 + 2] = (Math.random() - 0.5) * FIELD.z;
  velocities[i * 3] = (Math.random() - 0.5) * 0.012;
  velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.012;
  velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.012;
  const c = palette[Math.floor(Math.random() * palette.length)];
  nodeColors[i * 3] = c.r;
  nodeColors[i * 3 + 1] = c.g;
  nodeColors[i * 3 + 2] = c.b;
}

const nodeGeo = new THREE.BufferGeometry();
nodeGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
nodeGeo.setAttribute('color', new THREE.BufferAttribute(nodeColors, 3));

const nodeMat = new THREE.PointsMaterial({
  size: 0.14,
  vertexColors: true,
  transparent: true,
  opacity: 0.9,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  sizeAttenuation: true,
});
scene.add(new THREE.Points(nodeGeo, nodeMat));

// ── Proximity links ──────────────────────────────────────────────────────────
const MAX_LINKS = NODE_COUNT * 8;
const linkPositions = new Float32Array(MAX_LINKS * 6);
const linkColors = new Float32Array(MAX_LINKS * 6);
const linkGeo = new THREE.BufferGeometry();
linkGeo.setAttribute('position', new THREE.BufferAttribute(linkPositions, 3));
linkGeo.setAttribute('color', new THREE.BufferAttribute(linkColors, 3));

const linkMat = new THREE.LineBasicMaterial({
  vertexColors: true,
  transparent: true,
  opacity: 0.5,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});
scene.add(new THREE.LineSegments(linkGeo, linkMat));

function updateLinks() {
  let link = 0;
  for (let i = 0; i < NODE_COUNT && link < MAX_LINKS; i++) {
    const ix = positions[i * 3];
    const iy = positions[i * 3 + 1];
    const iz = positions[i * 3 + 2];
    for (let j = i + 1; j < NODE_COUNT && link < MAX_LINKS; j++) {
      const dx = ix - positions[j * 3];
      const dy = iy - positions[j * 3 + 1];
      const dz = iz - positions[j * 3 + 2];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist > LINK_DIST) continue;

      const fade = 1 - dist / LINK_DIST;
      const o = link * 6;
      linkPositions[o] = ix;
      linkPositions[o + 1] = iy;
      linkPositions[o + 2] = iz;
      linkPositions[o + 3] = positions[j * 3];
      linkPositions[o + 4] = positions[j * 3 + 1];
      linkPositions[o + 5] = positions[j * 3 + 2];
      for (let k = 0; k < 2; k++) {
        const n = (k === 0 ? i : j) * 3;
        linkColors[o + k * 3] = nodeColors[n] * fade;
        linkColors[o + k * 3 + 1] = nodeColors[n + 1] * fade;
        linkColors[o + k * 3 + 2] = nodeColors[n + 2] * fade;
      }
      link++;
    }
  }
  linkGeo.setDrawRange(0, link * 2);
  linkGeo.attributes.position.needsUpdate = true;
  linkGeo.attributes.color.needsUpdate = true;
}

// ── Wireframe icosahedron ────────────────────────────────────────────────────
const ico = new THREE.LineSegments(
  new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(3.4, 1)),
  new THREE.LineBasicMaterial({
    color: 0xa855f7,
    transparent: true,
    opacity: 0.16,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }),
);
ico.position.set(7.5, 1.5, -4);
scene.add(ico);

const icoInner = new THREE.LineSegments(
  new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1.7, 0)),
  new THREE.LineBasicMaterial({
    color: 0x22d3ee,
    transparent: true,
    opacity: 0.22,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }),
);
icoInner.position.copy(ico.position);
scene.add(icoInner);

// ── Mouse parallax + scroll drift ────────────────────────────────────────────
const mouse = { x: 0, y: 0 };
window.addEventListener('pointermove', (e) => {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
}, { passive: true });

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ── Animation loop ───────────────────────────────────────────────────────────
const HALF = { x: FIELD.x / 2, y: FIELD.y / 2, z: FIELD.z / 2 };
const clock = new THREE.Clock();

function tick() {
  const t = clock.getElapsedTime();

  for (let i = 0; i < NODE_COUNT; i++) {
    for (let a = 0; a < 3; a++) {
      const idx = i * 3 + a;
      positions[idx] += velocities[idx];
      const limit = a === 0 ? HALF.x : a === 1 ? HALF.y : HALF.z;
      if (positions[idx] > limit || positions[idx] < -limit) velocities[idx] *= -1;
    }
  }
  nodeGeo.attributes.position.needsUpdate = true;
  updateLinks();

  ico.rotation.x = t * 0.06;
  ico.rotation.y = t * 0.09;
  icoInner.rotation.x = -t * 0.12;
  icoInner.rotation.y = -t * 0.15;

  // Ease camera toward the pointer, plus a slow ambient sway.
  camera.position.x += (mouse.x * 1.6 - camera.position.x) * 0.03;
  camera.position.y += (-mouse.y * 1.0 + Math.sin(t * 0.18) * 0.4 - camera.position.y) * 0.03;
  camera.lookAt(0, 0, 0);

  renderer.render(scene, camera);
  if (!reducedMotion) requestAnimationFrame(tick);
}

if (reducedMotion) {
  updateLinks();
  renderer.render(scene, camera);
} else {
  tick();
}
})();
