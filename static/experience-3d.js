import * as THREE from './vendor/threejs/three.module.min.js';

// Local Three.js (MIT). One WebGL context for the whole page.
// The film: loose sheets of work tumble in a storm, then land as a mosaic in the shape of the
// Isola d'Elba. The outline is read at runtime from the verified ISTAT asset (elba-outline.svg,
// CC BY 4.0): nothing here redraws the geography.

const ISLAND_WIDTH = 11;
const ISLAND_Y = -1.4;
const SEA = [8 / 255, 26 / 255, 50 / 255]; // matches --sea in company-site.css

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;

async function loadOutline() {
  const response = await fetch('/static/elba-outline.svg', { credentials: 'omit' });
  if (!response.ok) throw new Error('outline unavailable');
  const d = (await response.text()).match(/<path[^>]*\sd="([^"]+)"/)?.[1];
  if (!d) throw new Error('outline path missing');
  const numbers = d.match(/-?\d+(?:\.\d+)?/g).map(Number);
  const raw = [];
  for (let i = 0; i + 1 < numbers.length; i += 2) raw.push([numbers[i], numbers[i + 1]]);
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  raw.forEach(([x, y]) => { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); });
  const scale = ISLAND_WIDTH / (maxX - minX);
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  // SVG y grows southwards; +z comes towards the viewer, so north stays "up" on screen.
  return raw.map(([x, y]) => [(x - cx) * scale, (y - cy) * scale]);
}

function inside(polygon, x, z) {
  let hit = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, zi] = polygon[i], [xj, zj] = polygon[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) hit = !hit;
  }
  return hit;
}

function tile(polygon, wanted) {
  let area = 0, minZ = Infinity, maxZ = -Infinity;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    area += polygon[j][0] * polygon[i][1] - polygon[i][0] * polygon[j][1];
    minZ = Math.min(minZ, polygon[i][1]); maxZ = Math.max(maxZ, polygon[i][1]);
  }
  area = Math.abs(area) / 2;
  const cell = area / wanted;
  const w = Math.sqrt(cell * 0.72), h = w / 0.72; // sheet proportions, A4-like
  const points = [];
  let row = 0;
  for (let z = minZ; z <= maxZ; z += h, row++) {
    const shift = (row % 2) * w * 0.5;
    for (let x = -ISLAND_WIDTH / 2 - w; x <= ISLAND_WIDTH / 2 + w; x += w) {
      if (inside(polygon, x + shift, z)) points.push([x + shift, z]);
    }
  }
  return { points, w, h };
}

const sheetVertex = /* glsl */`
attribute vec3 aChaos;
attribute vec3 aTarget;
attribute vec4 aRand;
uniform float uTime, uAssemble, uLights;
uniform vec2 uSheet;
uniform vec2 uFog;
varying vec2 vUv;
varying vec3 vNormal;
varying vec4 vRand;
varying float vFog, vT, vLit;
vec3 turn(vec3 p, vec3 axis, float a) {
  float c = cos(a), s = sin(a);
  return p * c + cross(axis, p) * s + axis * dot(axis, p) * (1.0 - c);
}
void main() {
  float delay = aRand.x * 0.33 + (aTarget.x / ${ISLAND_WIDTH.toFixed(1)} + 0.5) * 0.42;
  float t = clamp((uAssemble * 1.2 - delay) / 0.45, 0.0, 1.0);
  t = t * t * (3.0 - 2.0 * t);
  vec3 axis = normalize(aRand.yzw * 2.0 - 1.0);
  float tumble = (aRand.w * 6.2832 + uTime * (0.22 + aRand.x * 0.55)) * (1.0 - t) + t * (1.0 - t) * 4.0;
  float rest = (aRand.y - 0.5) * 0.07 * t;
  vec3 p = vec3(position.x * uSheet.x, 0.0, position.z * uSheet.y) * mix(1.6 + 4.2 * aRand.w * aRand.w, 1.0, t);
  p = turn(p, vec3(0.0, 1.0, 0.0), (aRand.z - 0.5) * 0.2);
  p = turn(p, axis, tumble + rest);
  vNormal = turn(vec3(0.0, 1.0, 0.0), axis, tumble + rest);
  vec3 drift = vec3(sin(uTime * 0.21 + aRand.z * 20.0) * 0.55, cos(uTime * 0.17 + aRand.w * 20.0) * 0.45, sin(uTime * 0.13 + aRand.x * 20.0) * 0.5);
  vec3 centre = mix(aChaos + drift, aTarget, t);
  centre.y += sin(t * 3.1416) * (0.7 + aRand.y * 2.4);
  vLit = step(0.875, aRand.z);
  centre.y += t * (aRand.w * aRand.w * 0.26 + sin(uTime * 0.55 + aTarget.x * 0.9 + aTarget.z * 0.7) * 0.025) + vLit * uLights * 0.2;
  vec4 mv = modelViewMatrix * vec4(centre + p, 1.0);
  gl_Position = projectionMatrix * mv;
  vFog = smoothstep(uFog.x, uFog.y, -mv.z);
  vUv = uv; vRand = aRand; vT = t;
}`;

const sheetFragment = /* glsl */`
precision highp float;
uniform float uReveal, uLights;
uniform vec3 uSea;
varying vec2 vUv;
varying vec3 vNormal;
varying vec4 vRand;
varying float vFog, vT, vLit;
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  float appear = clamp(uReveal * 1.6 - vRand.x * 0.6, 0.0, 1.0);
  if (hash(gl_FragCoord.xy) > appear) discard;
  vec3 n = normalize(vNormal) * (gl_FrontFacing ? 1.0 : -1.0);
  float key = max(dot(n, normalize(vec3(0.42, 0.86, 0.3))), 0.0);
  float fill = max(dot(n, normalize(vec3(-0.6, 0.25, -0.75))), 0.0);
  vec3 paper = mix(vec3(0.78, 0.85, 0.96), vec3(0.95, 0.97, 1.0), vRand.y);
  // lines of "text": the sheets are documents, not confetti
  float rows = 12.0;
  float row = floor(vUv.y * rows), fy = fract(vUv.y * rows);
  float len = 0.3 + 0.6 * hash(vec2(row, vRand.x * 31.0));
  float line = step(0.13, vUv.x) * step(vUv.x, 0.13 + len * 0.74) * step(0.34, fy) * step(fy, 0.6) * step(1.5, row) * step(row, rows - 2.5);
  vec3 col = paper * (0.16 + 0.9 * key) + vec3(0.12, 0.36, 0.7) * (0.22 + fill * 0.6);
  col = mix(col, col * 0.52, line * (gl_FrontFacing ? 0.85 : 0.0));
  vec3 lamp = vec3(0.36, 0.8, 1.0);
  col = mix(col, lamp * 1.25, vLit * uLights * 0.92);
  col = mix(col, uSea, vFog * 0.94);
  gl_FragColor = vec4(col, 1.0);
}`;

const seaVertex = /* glsl */`
varying vec2 vPos;
void main() { vPos = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const seaFragment = /* glsl */`
precision highp float;
uniform float uTime, uOpacity;
varying vec2 vPos;
void main() {
  float r = length(vPos * vec2(1.0, 1.45));
  float glow = exp(-r * r / 34.0);
  float rings = 0.5 + 0.5 * sin(r * 2.6 - uTime * 0.45);
  rings = smoothstep(0.93, 1.0, rings) * smoothstep(13.0, 6.0, r) * smoothstep(3.6, 5.6, r);
  vec3 col = vec3(0.14, 0.5, 0.95) * glow * 0.5 + vec3(0.36, 0.8, 1.0) * rings * 0.22;
  gl_FragColor = vec4(col * uOpacity, 1.0);
}`;

const ringVertex = /* glsl */`
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const ringFragment = /* glsl */`
precision highp float;
uniform float uDraw;
varying vec2 vUv;
void main() {
  if (vUv.x > uDraw) discard;
  float head = smoothstep(uDraw - 0.12, uDraw, vUv.x) * step(uDraw, 0.999);
  float tail = smoothstep(0.0, 0.25, vUv.x);
  gl_FragColor = vec4(vec3(0.36, 0.8, 1.0) * (0.55 * tail + 1.4 * head + 0.1), 1.0);
}`;

// auteur-allow: WEBGL_NO_REDUCED_MOTION -- company-site.js never loads this module under prefers-reduced-motion or save-data; the static outline is the alternative cut
export async function startExperience(canvas, state) {
  if (!canvas) throw new Error('no canvas');
  const polygon = await loadOutline();
  const small = Math.min(innerWidth, innerHeight) < 700;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !small, alpha: false, powerPreference: 'high-performance' });
  // A software rasteriser (no GPU) gets a lighter cut: fewer sheets, sub-native resolution.
  const gl = renderer.getContext();
  const info = gl.getExtension('WEBGL_debug_renderer_info');
  const gpu = String(info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
  const software = /swiftshader|llvmpipe|software|basic render/i.test(gpu);
  const dpr = software ? 0.75 : Math.min(devicePixelRatio || 1, small ? 1.5 : 2);
  renderer.setClearColor(new THREE.Color().setRGB(...SEA, THREE.SRGBColorSpace), 1);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 200);

  const { points, w, h } = tile(polygon, software ? 600 : small ? 900 : 1700);
  const count = points.length;
  const base = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.index = base.index;
  geometry.setAttribute('position', base.getAttribute('position'));
  geometry.setAttribute('uv', base.getAttribute('uv'));
  geometry.instanceCount = count;
  const chaos = new Float32Array(count * 3), target = new Float32Array(count * 3), rand = new Float32Array(count * 4);
  // deterministic scatter: the same storm on every visit
  let seed = 20261003;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  points.forEach(([x, z], i) => {
    target.set([x, ISLAND_Y, z], i * 3);
    chaos.set([(random() - 0.5) * 24, (random() - 0.5) * 13.5, random() * 20 - 13], i * 3);
    rand.set([random(), random(), random(), random()], i * 4);
  });
  geometry.setAttribute('aChaos', new THREE.InstancedBufferAttribute(chaos, 3));
  geometry.setAttribute('aTarget', new THREE.InstancedBufferAttribute(target, 3));
  geometry.setAttribute('aRand', new THREE.InstancedBufferAttribute(rand, 4));
  const sheetUniforms = {
    uTime: { value: 0 }, uAssemble: { value: 0 }, uLights: { value: 0 }, uReveal: { value: 0 },
    uSheet: { value: new THREE.Vector2(w * 1.02, h * 1.02) }, uFog: { value: new THREE.Vector2(6, 18) },
    uSea: { value: new THREE.Vector3(...SEA) },
  };
  const sheets = new THREE.Mesh(geometry, new THREE.ShaderMaterial({ vertexShader: sheetVertex, fragmentShader: sheetFragment, uniforms: sheetUniforms, side: THREE.DoubleSide }));
  sheets.frustumCulled = false;
  sheets.renderOrder = 2;
  scene.add(sheets);

  const seaUniforms = { uTime: { value: 0 }, uOpacity: { value: 0 } };
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(34, 34).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({ vertexShader: seaVertex, fragmentShader: seaFragment, uniforms: seaUniforms, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  sea.position.y = ISLAND_Y - 0.25;
  sea.renderOrder = 1;
  scene.add(sea);

  // The wordmark's orbit, drawn once around the finished island.
  const ringUniforms = { uDraw: { value: 0 } };
  const ring = new THREE.Mesh(new THREE.TorusGeometry(6.9, 0.022, 6, 220), new THREE.ShaderMaterial({ vertexShader: ringVertex, fragmentShader: ringFragment, uniforms: ringUniforms, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  ring.rotation.set(Math.PI / 2 - 0.2, 0.12, 0.6);
  ring.scale.set(1, 0.8, 1);
  ring.position.y = ISLAND_Y + 0.25;
  ring.renderOrder = 3;
  scene.add(ring);

  const position = new THREE.Vector3(), look = new THREE.Vector3();
  let width = 0, height = 0;
  const resize = () => {
    width = canvas.clientWidth || innerWidth; height = canvas.clientHeight || innerHeight;
    renderer.setPixelRatio(dpr);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  resize();

  const render = s => {
    const aspect = width / height;
    const wide = aspect >= 1.2 && !s.narrow;
    const k = wide ? Math.max(1, 1.5 / aspect) : 0.86 / aspect;
    const done = s.project || s.door > 0 ? 1 : 0;
    const assemble = done || smooth(0.04, 0.6, s.peak);
    const lights = done || smooth(0.62, 0.84, s.peak);
    const reveal = s.project ? 1 : smooth(0.02, 0.55, s.hero);
    if (reveal <= 0) return;
    sheetUniforms.uTime.value = seaUniforms.uTime.value = s.time;
    sheetUniforms.uAssemble.value = assemble;
    sheetUniforms.uLights.value = lights;
    sheetUniforms.uReveal.value = reveal;
    seaUniforms.uOpacity.value = smooth(0.25, 0.75, assemble);
    ringUniforms.uDraw.value = done || smooth(0.56, 0.9, s.peak);

    // A: inside the storm, drifting forward. B: rising over the island. C: the island at rest.
    const toIsland = s.project ? 1 : smooth(0.0, 0.55, s.peak);
    const yawB = mix(-0.62, 0.0, smooth(0.0, 0.9, s.peak));
    const rest = s.project ? 1 : smooth(0.0, 1.0, s.door);
    const yawC = 0.16 * Math.sin(s.time * 0.11);
    const yaw = mix(yawB, yawC, rest);
    const radius = mix(19.5, 23.5, rest) * k, lift = mix(11.2, 11.0, rest) * k;
    const ax = Math.sin(s.time * 0.07) * 0.35, ay = 0.3, az = 9.2 - 3.4 * s.chaos;
    position.set(mix(ax, Math.sin(yaw) * radius, toIsland), mix(ay, ISLAND_Y + lift, toIsland), mix(az, Math.cos(yaw) * radius, toIsland));
    look.set(0, mix(0, ISLAND_Y, toIsland), 0);
    camera.position.copy(position);
    camera.lookAt(look);
    const distance = position.distanceTo(look);
    sheetUniforms.uFog.value.set(distance * 0.72, distance * 1.95 + 2);
    // Keep the island clear of the copy: to the right on wide screens, above it on narrow ones.
    const offsetX = wide ? -mix(0.17, 0.235, rest) * toIsland * width : 0;
    const offsetY = wide ? mix(0.0, -0.04, rest) * toIsland * height : mix(0.24, 0.27, rest) * toIsland * height;
    camera.setViewOffset(width, height, offsetX, offsetY, width, height);
    renderer.render(scene, camera);
  };

  canvas.addEventListener('webglcontextlost', event => event.preventDefault());
  return { render, resize, tier: software ? 'software' : 'hardware', dpr };
}
