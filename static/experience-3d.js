import * as THREE from './vendor/threejs/three.module.min.js';

// Local Three.js r180 (MIT): a workday, a shared workshop, and an ordered desk.
// One canvas paints only the dedicated visual windows; prose never sits under WebGL.
export function startExperience(world) {
  const stage = world.querySelector('.experience-stage');
  const canvas = stage?.querySelector('canvas');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const smallScreen = matchMedia('(max-width:760px)');
  const mobile = smallScreen.matches;
  const viewports = [...world.querySelectorAll('[data-scene-viewport]')];
  if (!canvas || reduced.matches || navigator.connection?.saveData || !viewports.length) {
    world.dataset.sceneState = 'static';
    return;
  }
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: !mobile, alpha: true, powerPreference: 'low-power' }); }
  catch { world.dataset.sceneState = 'fallback'; return; }
  const gl = renderer.getContext();
  let software = false;
  try {
    const extension = gl.getExtension('WEBGL_debug_renderer_info');
    software = /swiftshader|llvmpipe|softpipe|software|basic render/i.test(extension ? String(gl.getParameter(extension.UNMASKED_RENDERER_WEBGL)) : '');
  } catch { /* Optional information; measured GPU costs also cover an unnamed slow GPU. */ }
  const gpuTimer = gl.getExtension('EXT_disjoint_timer_query_webgl2');
  let dprLimit = software ? 0.75 : (mobile ? 1.25 : 1.5);
  let pixelBudget = software ? 600000 : Infinity;
  let frameInterval = software ? 125 : (mobile ? 40 : 33);
  world.dataset.sceneTier = software ? 'software' : 'normal';
  renderer.setClearColor('#0c1523', 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = !software && !mobile;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.autoClear = false;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 70);
  const key = new THREE.DirectionalLight('#fff2da', 2.8); key.position.set(-7, 15, 8);
  key.castShadow = !software && !mobile; key.shadow.mapSize.set(512, 512);
  key.shadow.camera.left = -14; key.shadow.camera.right = 14; key.shadow.camera.top = 14; key.shadow.camera.bottom = -14;
  key.shadow.normalBias = 0.08; key.shadow.bias = -0.001;
  scene.add(key, new THREE.HemisphereLight('#b7d3e8', '#111a25', 1.2));
  const edge = new THREE.DirectionalLight('#62c5ff', 2.0); edge.position.set(10, 3, -9); scene.add(edge);
  const room = new THREE.Scene(); room.background = new THREE.Color('#25374c');
  const lightbox = new THREE.Mesh(new THREE.PlaneGeometry(17, 19), new THREE.MeshBasicMaterial({ color: '#c9e7ff', side: THREE.DoubleSide }));
  lightbox.position.set(-6, 8, -9); lightbox.rotation.y = 0.4; room.add(lightbox);
  const environment = new THREE.PMREMGenerator(renderer);
  const reflectionMap = environment.fromScene(room, 0.08, 0.1, 100, { size: software ? 32 : 128 });
  scene.environment = reflectionMap.texture; environment.dispose(); lightbox.geometry.dispose(); lightbox.material.dispose();
  const desk = new THREE.Group(); scene.add(desk);
  const plane = new THREE.Mesh(new THREE.BoxGeometry(15, 0.16, 11), new THREE.MeshStandardMaterial({ color: '#101b27', roughness: 0.62, metalness: 0.25 }));
  plane.position.y = -0.28; plane.receiveShadow = true; desk.add(plane);
  const top = new THREE.Mesh(new THREE.PlaneGeometry(14.7, 10.7), new THREE.MeshStandardMaterial({ color: '#172a37', roughness: 0.76, metalness: 0.08 }));
  top.rotation.x = -Math.PI / 2; top.position.y = -0.187; top.receiveShadow = true; desk.add(top);
  const lineMaterial = new THREE.LineBasicMaterial({ color: '#5484ac', transparent: true, opacity: 0.08 });
  for (let i = 0; i < 7; i++) {
    const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-7.1, -0.183, i * 1.3 - 4), new THREE.Vector3(7.1, -0.183, i * 1.3 - 4)]);
    desk.add(new THREE.Line(g, lineMaterial));
  }
  const paperGeometry = new THREE.BoxGeometry(2.12, 0.025, 2.9);
  const white = new THREE.MeshStandardMaterial({ color: '#e3e7e7', roughness: 0.95 });
  const makeDocument = (title, category) => {
    const picture = document.createElement('canvas'); picture.width = 256; picture.height = 350;
    const c = picture.getContext('2d'); c.fillStyle = '#f0f2ee'; c.fillRect(0, 0, 256, 350);
    c.fillStyle = ['#2863e8', '#477fac', '#697d91'][category]; c.fillRect(26, 27, 25, 5);
    c.font = 'bold 14px Arial'; c.fillStyle = '#243b51'; c.fillText(title, 26, 59);
    c.font = '9px Arial'; c.fillStyle = '#6b7b89'; c.fillText('IL LAVORO, SUL TAVOLO', 26, 82);
    for (let n = 0; n < 9; n++) { c.fillStyle = n % 3 === 0 ? '#c4cfd6' : '#d8dfe2'; c.fillRect(26, 110 + n * 19, n % 4 === 0 ? 144 : 197, 3); }
    c.strokeStyle = '#bfced9'; c.strokeRect(26, 296, 90, 23); c.fillStyle = '#718498'; c.fillRect(137, 303, 66, 3);
    const texture = new THREE.CanvasTexture(picture); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = software ? 1 : 2;
    return new THREE.MeshStandardMaterial({ map: texture, roughness: 0.9, metalness: 0 });
  };
  const faces = ['RICHIESTE', 'DOCUMENTI', 'INFORMAZIONI'].map(makeDocument);
  const papers = [];
  for (let n = 0; n < (software ? 15 : 24); n++) {
    const category = n % 3, group = new THREE.Group();
    const sheet = new THREE.Mesh(paperGeometry, white); sheet.castShadow = !software; sheet.receiveShadow = true; group.add(sheet);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(2.12, 2.9), faces[category]); face.rotation.x = -Math.PI / 2; face.position.y = 0.014; group.add(face);
    const spread = new THREE.Vector3(Math.sin(n * 2.17) * 5.4, 0.035 + (n % 6) * 0.036, Math.cos(n * 1.72) * 3.7);
    const ordered = new THREE.Vector3((category - 1) * 3.15, 0.09 + Math.floor(n / 3) * 0.041, 0.3);
    group.position.copy(spread); desk.add(group); papers.push({ group, spread, ordered, angle: Math.sin(n * 1.7) * 0.8, phase: n * 0.63 });
  }
  const laptop = new THREE.Group();
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.1, 2.3), new THREE.MeshStandardMaterial({ color: '#8da1b2', roughness: 0.32, metalness: 0.72 }));
  laptop.add(chassis);
  const keyboard = new THREE.Mesh(new THREE.PlaneGeometry(3, 1.05), new THREE.MeshStandardMaterial({ color: '#152333', roughness: 0.7 }));
  keyboard.rotation.x = -Math.PI / 2; keyboard.position.set(0, 0.052, -0.35); laptop.add(keyboard);
  const keys = new THREE.InstancedMesh(new THREE.BoxGeometry(0.19, 0.018, 0.15), new THREE.MeshStandardMaterial({ color: '#2c3947', roughness: 0.72 }), 44);
  const keyMatrix = new THREE.Matrix4();
  for (let n = 0; n < 44; n++) { keyMatrix.makeTranslation((n % 11 - 5) * 0.24, 0.066, Math.floor(n / 11) * 0.22 - 0.69); keys.setMatrixAt(n, keyMatrix); }
  laptop.add(keys);
  const trackpad = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.42), new THREE.MeshStandardMaterial({ color: '#6a8194', metalness: 0.45, roughness: 0.5 }));
  trackpad.rotation.x = -Math.PI / 2; trackpad.position.set(0, 0.054, 0.63); laptop.add(trackpad);
  const lid = new THREE.Mesh(new THREE.BoxGeometry(3.6, 2.05, 0.09), chassis.material); lid.position.set(0, 1, -1); lid.rotation.x = -0.16; laptop.add(lid);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(3.33, 1.76), new THREE.MeshBasicMaterial({ color: '#4389c7' })); screen.position.set(0, 1.02, -0.84); screen.rotation.x = -0.16; laptop.add(screen);
  const screenLines = new THREE.Group();
  for (let i = 0; i < 5; i++) { const bar = new THREE.Mesh(new THREE.PlaneGeometry(i ? 1.8 : 2.6, 0.035), new THREE.MeshBasicMaterial({ color: i ? '#9ccaff' : '#e3f3ff' })); bar.position.set(i ? -0.4 : 0, 1.65 - i * 0.24, -0.66 - i * 0.04); bar.rotation.x = -0.16; screenLines.add(bar); }
  laptop.add(screenLines); laptop.position.set(-4.5, 0, -3); laptop.rotation.y = -0.15; desk.add(laptop);
  const notebook = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.18, 3.15), new THREE.MeshStandardMaterial({ color: '#1b60b0', roughness: 0.58, metalness: 0.12 }));
  notebook.position.set(5, 0, -2.7); notebook.rotation.y = 0.2; notebook.castShadow = true; desk.add(notebook);
  const pen = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 2.25, 8), new THREE.MeshStandardMaterial({ color: '#a7b7c2', metalness: 0.7, roughness: 0.25 }));
  pen.rotation.z = Math.PI / 2; pen.rotation.y = -0.2; pen.position.set(5, 0.19, -2.4); desk.add(pen);

  // The workshop is an architectural study, not a synthetic portrait: rounded,
  // faceless human forms face the same screen, with no comic facial or limb detail.
  const workshop = new THREE.Group(); scene.add(workshop); workshop.visible = false;
  const slate = new THREE.MeshStandardMaterial({ color: '#112234', roughness: 0.8, metalness: 0.12 });
  const silver = new THREE.MeshStandardMaterial({ color: '#9dabb5', roughness: 0.55, metalness: 0.45 });
  const chairMaterial = new THREE.MeshStandardMaterial({ color: '#0c2b40', roughness: 0.75, metalness: 0.1 });
  const peopleMaterial = new THREE.MeshStandardMaterial({ color: '#68818a', roughness: 0.88, metalness: 0.02 });
  const softBox = (w, h, d, material, x, y, z, target = workshop) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z); mesh.receiveShadow = true; target.add(mesh); return mesh;
  };
  const floor = softBox(13.5, 0.12, 11.7, slate, 0, -0.18, 0);
  floor.receiveShadow = true;
  softBox(13.5, 4.6, 0.16, slate, 0, 2.05, -5.6);
  softBox(7.1, 3.26, 0.13, silver, 0, 2.4, -5.43);
  const screenCanvas = document.createElement('canvas'); screenCanvas.width = 768; screenCanvas.height = 352;
  const ctx = screenCanvas.getContext('2d');
  ctx.fillStyle = '#102641'; ctx.fillRect(0, 0, 768, 352);
  ctx.fillStyle = '#91d8ff'; ctx.font = '500 38px Archivo, Arial, sans-serif';
  ctx.fillText('Il tuo lavoro. Una prova concreta.', 46, 76);
  ctx.fillStyle = '#cde2f1'; ctx.font = '24px Archivo, Arial, sans-serif';
  ctx.fillText('Osservare       Provare       Verificare', 46, 122);
  for (let n = 0; n < 3; n++) {
    const x = 112 + n * 258;
    ctx.strokeStyle = '#579bcc'; ctx.lineWidth = 2; ctx.strokeRect(x - 34, 179, 69, 97);
    ctx.fillStyle = '#a2d9f6';
    for (let j = 0; j < 4; j++) ctx.fillRect(x - 20, 198 + j * 15, j === 3 ? 20 : 40, 3);
    if (n < 2) { ctx.fillStyle = '#347fc0'; ctx.fillRect(x + 70, 223, 72, 2); }
  }
  const screenTexture = new THREE.CanvasTexture(screenCanvas); screenTexture.colorSpace = THREE.SRGBColorSpace;
  const trainingScreen = new THREE.Mesh(new THREE.PlaneGeometry(6.87, 3.07), new THREE.MeshBasicMaterial({ map: screenTexture }));
  trainingScreen.position.set(0, 2.4, -5.34); workshop.add(trainingScreen);
  const glow = new THREE.PointLight('#9ddcff', 2.2, 9, 2); glow.position.set(0, 3, -4.7); workshop.add(glow);
  const headGeometry = new THREE.SphereGeometry(0.24, 16, 12);
  const torsoGeometry = new THREE.CapsuleGeometry(0.27, 0.5, 4, 10);
  const legGeometry = new THREE.CylinderGeometry(0.025, 0.025, 0.65, 5);
  const chairBase = new THREE.BoxGeometry(0.9, 0.09, 0.94);
  const chairBack = new THREE.BoxGeometry(0.9, 0.88, 0.085);
  const classPeople = [];
  for (let row = 0; row < 3; row++) {
    for (const x of [-3.05, -1.55, 1.55, 3.05]) {
      const seat = new THREE.Group(); seat.position.set(x, 0, -1.4 + row * 2.25); workshop.add(seat);
      const base = new THREE.Mesh(chairBase, chairMaterial); base.position.y = 0.7; seat.add(base);
      const back = new THREE.Mesh(chairBack, chairMaterial); back.position.set(0, 1.14, 0.38); seat.add(back);
      for (const sx of [-0.34, 0.34]) for (const sz of [-0.32, 0.32]) {
        const leg = new THREE.Mesh(legGeometry, silver); leg.position.set(sx, 0.32, sz); seat.add(leg);
      }
      const person = new THREE.Group();
      const body = new THREE.Mesh(torsoGeometry, peopleMaterial); body.position.set(0, 1.13, -0.01); person.add(body);
      const head = new THREE.Mesh(headGeometry, peopleMaterial); head.position.set(0, 1.86, -0.08); person.add(head);
      person.rotation.x = -0.04; seat.add(person); classPeople.push(person);
    }
  }
  // Small baked contact shadows remain inexpensive and ground the seats even
  // when a software GPU disables the shadow map.
  const shadeCanvas = document.createElement('canvas'); shadeCanvas.width = shadeCanvas.height = 64;
  const shadeContext = shadeCanvas.getContext('2d');
  const gradient = shadeContext.createRadialGradient(32, 32, 3, 32, 32, 31);
  gradient.addColorStop(0, 'rgba(0,0,0,0.36)'); gradient.addColorStop(1, 'rgba(0,0,0,0)');
  shadeContext.fillStyle = gradient; shadeContext.fillRect(0, 0, 64, 64);
  const shadeTexture = new THREE.CanvasTexture(shadeCanvas);
  const seatShades = new THREE.InstancedMesh(new THREE.PlaneGeometry(1.75, 1.65), new THREE.MeshBasicMaterial({ map: shadeTexture, transparent: true, depthWrite: false }), 12);
  const shadeMatrix = new THREE.Matrix4(), shadeRotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
  for (let row = 0; row < 3; row++) for (let n = 0; n < 4; n++) {
    shadeMatrix.compose(new THREE.Vector3([-3.05, -1.55, 1.55, 3.05][n], -0.115, -1.4 + row * 2.25), shadeRotation, new THREE.Vector3(1, 1, 1));
    seatShades.setMatrixAt(row * 4 + n, shadeMatrix);
  }
  workshop.add(seatShades);

  // The facilitator stays grounded at the presentation desk, not floating in space.
  softBox(2.4, 0.12, 1.1, silver, -4.35, 1.0, -3.95);
  softBox(0.95, 0.96, 0.5, slate, -4.35, 0.47, -3.95);
  const facilitator = new THREE.Group(); facilitator.position.set(-4.35, 0, -4.5);
  const presenterBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.25, 0.92, 4, 10), peopleMaterial);
  presenterBody.position.y = 1.17; facilitator.add(presenterBody);
  const presenterHead = new THREE.Mesh(headGeometry, peopleMaterial); presenterHead.position.y = 2.03; facilitator.add(presenterHead);
  workshop.add(facilitator);
  for (const x of [-6.2, 6.2]) {
    const windowLight = softBox(0.045, 3.5, 3.2, new THREE.MeshBasicMaterial({ color: '#479cd1' }), x, 1.95, -2.7);
    windowLight.material.transparent = true; windowLight.material.opacity = 0.15;
  }

  workshop.traverse(mesh => {
    if (mesh.isMesh && mesh !== floor && mesh !== seatShades && !mesh.material.isMeshBasicMaterial) mesh.castShadow = !software && !mobile;
  });

  // A ribbon with a variable width and twisted surface, echoing the supplied mark's
  // materials. It is atmosphere, never a substitute or redesign of the actual logo.
  const createRibbon = offset => {
    const vertices = [], indices = [], segments = software ? 64 : 120, across = software ? 3 : 5;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments * Math.PI * 2, radius = 4.5 + Math.sin(t * 2 + offset) * 0.25;
      for (let j = 0; j <= across; j++) {
        const width = (j / across - 0.5) * (0.42 + Math.cos(t + offset) * 0.11);
        const twist = t * 1.5 + offset;
        vertices.push((radius + width * Math.cos(twist)) * Math.cos(t), Math.sin(t * 2 + offset) * 1.35 + width * Math.sin(twist), (radius + width * Math.cos(twist)) * Math.sin(t));
        if (i < segments && j < across) { const a = i * (across + 1) + j, b = a + across + 1; indices.push(a, b, a + 1, b, b + 1, a + 1); }
      }
    }
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); geometry.setIndex(indices); geometry.computeVertexNormals();
    return new THREE.Mesh(geometry, new THREE.MeshPhysicalMaterial({ color: offset ? '#369bdd' : '#144a9a', metalness: 0.78, roughness: 0.22, clearcoat: software ? 0 : 0.28, side: THREE.DoubleSide, envMapIntensity: 1.7 }));
  };
  const ribbons = new THREE.Group(); const one = createRibbon(0), two = createRibbon(1.2);
  one.rotation.x = 0.3; two.rotation.z = 0.78; two.rotation.x = 0.45; ribbons.add(one, two);
  ribbons.position.set(0.4, 3.6, -0.8); scene.add(ribbons);
  // Two hemispheres with branching paths read as organised knowledge rather than a
  // literal medical model; the surrounding ribbons recall the supplied orbital mark.
  const cognition = new THREE.Group(); scene.add(cognition);
  const networkMaterial = new THREE.LineBasicMaterial({ color: '#79d1fa', transparent: true, opacity: 0.55 });
  const nodePositions = [], networkSegments = [];
  for (const side of [-1, 1]) {
    for (let n = 0; n < 16; n++) {
      const angle = n * 2.39996, height = 1 - n / 15 * 2;
      const radius = Math.sqrt(Math.max(0, 1 - height * height));
      const node = new THREE.Vector3(side * (0.31 + Math.abs(Math.cos(angle)) * radius * 0.9), height * 1.28, Math.sin(angle) * radius * 0.75);
      nodePositions.push(node);
    }
  }
  for (let n = 0; n < nodePositions.length; n++) {
    const points = nodePositions.map((point, index) => ({ point, index, distance: point.distanceToSquared(nodePositions[n]) }))
      .filter(item => item.index !== n).sort((a, b) => a.distance - b.distance).slice(0, 3);
    points.forEach(item => { if (item.index > n) networkSegments.push(...nodePositions[n].toArray(), ...item.point.toArray()); });
  }
  const netGeometry = new THREE.BufferGeometry(); netGeometry.setAttribute('position', new THREE.Float32BufferAttribute(networkSegments, 3));
  cognition.add(new THREE.LineSegments(netGeometry, networkMaterial));
  const nodes = new THREE.InstancedMesh(new THREE.SphereGeometry(0.035, 8, 6), new THREE.MeshBasicMaterial({ color: '#8bddff' }), nodePositions.length);
  const nodeMatrix = new THREE.Matrix4(); nodePositions.forEach((point, index) => { nodeMatrix.makeTranslation(point.x, point.y, point.z); nodes.setMatrixAt(index, nodeMatrix); });
  cognition.add(nodes); cognition.position.set(0.15, 3.1, -0.4); cognition.visible = false;

  let paused = document.documentElement.dataset.scenePaused === 'true', visible = false, lost = false, disposed = false;
  let idlePaint = 0, viewportRects = [], stageRect = null;
  let frame = 0, raf = 0, last = 0, clock = 0, progress = 0, destination = 0, load = 360;
  let gpuFence = null, measuredCost = 0, slowFrames = 0, adaptations = 0;
  let cpuDrawCost = 0, gpuWaitMs = 0, lastFencePoll = 0;
  const pendingMeasurements = [];
  const chapters = [...world.querySelectorAll('[data-scene]')];
  const refreshWindows = () => {
    stageRect = stage.getBoundingClientRect();
    viewportRects = viewports.map(element => ({ element, rect: element.getBoundingClientRect() }))
      .filter(({ rect }) => rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < innerHeight);
    visible = viewportRects.length > 0;
  };
  const updateScroll = () => {
    const r = world.getBoundingClientRect(); destination = THREE.MathUtils.clamp(-r.top / Math.max(1, r.height - innerHeight), 0, 1);
    const active = chapters.find(section => { const b = section.getBoundingClientRect(); return b.top <= innerHeight * 0.55 && b.bottom > innerHeight * 0.55; });
    if (active) world.dataset.activeScene = active.dataset.scene;
    refreshWindows();
    // A paused canvas must follow its visual windows during scrolling, so its last
    // frame cannot drift behind a heading or a form. Geometry and time stay frozen.
    if (!canRun() && !document.hidden && !lost && !disposed && !idlePaint) {
      idlePaint = requestAnimationFrame(() => { idlePaint = 0; draw(false); });
    }
    reconcile();
  };
  const updateSize = () => {
    const r = stage.getBoundingClientRect();
    const ratio = Math.min(devicePixelRatio || 1, dprLimit, Math.sqrt(pixelBudget / Math.max(1, r.width * r.height)));
    renderer.setPixelRatio(ratio); renderer.setSize(r.width, r.height, false);
    world.dataset.sceneDpr = ratio.toFixed(2); updateScroll();
  };
  const adaptBudget = cost => {
    if (frame < 5 || adaptations >= 3) return;
    measuredCost = measuredCost ? measuredCost * 0.8 + cost * 0.2 : cost;
    slowFrames = measuredCost > 75 ? slowFrames + 1 : Math.max(0, slowFrames - 1);
    if (slowFrames < 5) return;
    adaptations++; slowFrames = 0; dprLimit = Math.max(0.35, dprLimit * 0.75);
    pixelBudget = Math.min(pixelBudget * 0.7, software ? 600000 : 1200000); frameInterval = 125;
    renderer.shadowMap.enabled = false; key.castShadow = false;
    [one, two].forEach(m => { m.material.clearcoat = 0; m.material.needsUpdate = true; });
    world.dataset.sceneTier = software ? 'software-adaptive' : 'adaptive'; updateSize();
  };
  const completedFrame = () => {
    if (gpuTimer) {
      const disjoint = gl.getParameter(gpuTimer.GPU_DISJOINT_EXT);
      for (let i = pendingMeasurements.length - 1; i >= 0; i--) {
        const sample = pendingMeasurements[i];
        if (!disjoint && !gl.getQueryParameter(sample.query, gl.QUERY_RESULT_AVAILABLE)) continue;
        if (!disjoint) { const cost = Math.max(sample.cpu, gl.getQueryParameter(sample.query, gl.QUERY_RESULT) / 1000000); world.dataset.sceneFrameCostMs = cost.toFixed(1); adaptBudget(cost); }
        gl.deleteQuery(sample.query); pendingMeasurements.splice(i, 1);
      }
    }
    if (!gpuFence) return true;
    const status = gl.clientWaitSync(gpuFence, 0, 0), now = performance.now();
    if (status === gl.TIMEOUT_EXPIRED) { gpuWaitMs += Math.min(50, now - lastFencePoll); lastFencePoll = now; return false; }
    gl.deleteSync(gpuFence); gpuFence = null;
    if (!gpuTimer && status !== gl.WAIT_FAILED) adaptBudget(Math.max(cpuDrawCost, gpuWaitMs));
    return true;
  };
  const renderWindow = ({ element, rect }) => {
    const sceneName = element.dataset.sceneViewport || element.closest('[data-scene]')?.dataset.scene || 'ordered';
    const training = sceneName === 'training';
    const ordered = ['ordered', 'method', 'coast', 'project'].includes(sceneName);
    desk.visible = !training; workshop.visible = training;
    ribbons.visible = ordered; cognition.visible = ordered;
    papers.forEach((paper, n) => {
      paper.group.position.copy(ordered ? paper.ordered : paper.spread);
      paper.group.position.y += ordered ? 0 : Math.sin(clock * 0.5 + paper.phase) * 0.007;
      paper.group.rotation.y = ordered ? 0 : paper.angle;
      paper.group.rotation.x = ordered ? 0 : Math.sin(clock * 0.32 + paper.phase) * 0.004;
      paper.group.visible = n < (ordered ? 15 : 9 + Math.round(Math.min(1, load / 600) * (papers.length - 9)));
    });
    desk.rotation.y = -0.08;
    const dolly = Math.sin(clock * 0.12) * 0.1;
    const aspect = rect.width / Math.max(1, rect.height);
    const tight = aspect < 1.2;
    camera.aspect = aspect; camera.fov = 40; camera.clearViewOffset(); camera.updateProjectionMatrix();
    if (training) {
      camera.position.set(tight ? 6.8 : 5.8, tight ? 7.6 : 6.8, tight ? 18.7 : 17.2);
      camera.position.x += dolly; camera.lookAt(0, 1.2, -0.6);
      classPeople.forEach((person, n) => { person.rotation.y = Math.sin(clock * 0.14 + n) * 0.018; });
      facilitator.rotation.y = Math.sin(clock * 0.13) * 0.02;
    } else {
      camera.position.set(tight ? 10.3 : 9.0, tight ? 15.2 : 13.3, tight ? 18.2 : 16.6);
      camera.position.x += dolly; camera.lookAt(0, ordered ? 0.8 : 0.2, -0.1);
    }
    ribbons.rotation.y = -0.38 + Math.sin(clock * 0.12) * 0.1;
    ribbons.rotation.z = 0.12;
    ribbons.position.y = 3.1 + Math.sin(clock * 0.22) * 0.04;
    ribbons.scale.setScalar(0.57); cognition.rotation.y = ribbons.rotation.y * 0.35;
    // Viewport uses the full window for stable composition. Scissor uses only its
    // visible intersection, with WebGL's lower-left origin, and cannot cover prose.
    const x = rect.left - stageRect.left, y = stageRect.height - (rect.bottom - stageRect.top);
    const left = Math.max(0, x), bottom = Math.max(0, y);
    const right = Math.min(stageRect.width, x + rect.width), top = Math.min(stageRect.height, y + rect.height);
    renderer.setViewport(x, y, rect.width, rect.height);
    renderer.setScissor(left, bottom, Math.max(0, right - left), Math.max(0, top - bottom));
    renderer.setScissorTest(true); renderer.render(scene, camera);
  };
  const draw = (advance = true) => {
    if (disposed || lost || !stageRect) return;
    const started = performance.now(), query = gpuTimer && pendingMeasurements.length < 4 ? gl.createQuery() : null;
    if (query) gl.beginQuery(gpuTimer.TIME_ELAPSED_EXT, query);
    if (advance) progress += (destination - progress) * (1 - Math.exp(-frameInterval / 1000 * 2.8));
    renderer.setScissorTest(false); renderer.setViewport(0, 0, stageRect.width, stageRect.height); renderer.clear();
    viewportRects.forEach(renderWindow); renderer.setScissorTest(false);
    frame++; cpuDrawCost = performance.now() - started;
    if (query) { gl.endQuery(gpuTimer.TIME_ELAPSED_EXT); pendingMeasurements.push({ query, cpu: cpuDrawCost }); }
    if (typeof gl.fenceSync === 'function' && !gpuFence) { gpuFence = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0); gl.flush(); gpuWaitMs = 0; lastFencePoll = performance.now(); }
    world.dataset.sceneState = paused ? 'paused' : (visible ? 'running' : 'sleeping');
    world.dataset.cameraProgress = progress.toFixed(3); world.dataset.sceneFrames = String(frame);
    world.dataset.visibleSceneWindows = String(viewportRects.length);
    if (!stage.classList.contains('is-ready')) stage.classList.add('is-ready');
  };
  const canRun = () => !paused && visible && !document.hidden && !reduced.matches && !navigator.connection?.saveData && !lost && !disposed;
  const animate = stamp => {
    raf = 0; if (!canRun()) return;
    if (completedFrame() && stamp - last >= frameInterval) { clock += Math.min(0.2, (stamp - last) / 1000 || 0); last = stamp; draw(); }
    raf = requestAnimationFrame(animate);
  };
  const reconcile = () => {
    if (canRun()) { if (!raf) { last = performance.now(); lastFencePoll = last; measuredCost = 0; slowFrames = 0; raf = requestAnimationFrame(animate); } }
    else { cancelAnimationFrame(raf); raf = 0; world.dataset.sceneState = lost ? 'fallback' : (paused ? 'paused' : 'sleeping'); }
  };
  const onPause = event => { paused = event.detail.paused; reconcile(); };
  const onWorkload = event => { load = Math.max(0, Number(event.detail.minutes) || 0); };
  const onReduced = () => { stage.classList.toggle('is-ready', !reduced.matches && !lost); reconcile(); };
  const onContextLost = event => { event.preventDefault(); lost = true; stage.classList.remove('is-ready'); reconcile(); };
  const onPageHide = event => {
    cancelAnimationFrame(raf); raf = 0;
    cancelAnimationFrame(idlePaint); idlePaint = 0;
    if (!event.persisted) dispose();
  };
  const onPageShow = () => { if (!disposed) { refreshWindows(); reconcile(); } };
  const view = new IntersectionObserver(() => { refreshWindows(); reconcile(); }, { threshold: 0.001 });
  viewports.forEach(element => view.observe(element));
  const resize = new ResizeObserver(updateSize); resize.observe(stage); viewports.forEach(element => resize.observe(element));
  const dispose = () => {
    if (disposed) return; disposed = true;
    cancelAnimationFrame(raf); cancelAnimationFrame(idlePaint); view.disconnect(); resize.disconnect();
    window.removeEventListener('scroll', updateScroll); document.removeEventListener('visibilitychange', reconcile);
    reduced.removeEventListener('change', onReduced);
    world.removeEventListener('experience:pause', onPause); world.removeEventListener('experience:workload', onWorkload);
    canvas.removeEventListener('webglcontextlost', onContextLost);
    window.removeEventListener('pagehide', onPageHide); window.removeEventListener('pageshow', onPageShow);
    if (gpuFence) { gl.deleteSync(gpuFence); gpuFence = null; }
    pendingMeasurements.forEach(sample => gl.deleteQuery(sample.query)); pendingMeasurements.length = 0;
    const geometries = new Set(), materials = new Set(), textures = new Set();
    scene.traverse(node => {
      if (node.geometry) geometries.add(node.geometry);
      for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
        if (!material) continue; materials.add(material);
        Object.values(material).forEach(value => { if (value?.isTexture) textures.add(value); });
      }
    });
    geometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose());
    textures.forEach(texture => texture.dispose()); reflectionMap.dispose(); renderer.dispose();
  };
  world.addEventListener('experience:pause', onPause); world.addEventListener('experience:workload', onWorkload);
  window.addEventListener('scroll', updateScroll, { passive: true }); document.addEventListener('visibilitychange', reconcile);
  reduced.addEventListener('change', onReduced); canvas.addEventListener('webglcontextlost', onContextLost);
  window.addEventListener('pagehide', onPageHide); window.addEventListener('pageshow', onPageShow);
  updateSize(); draw(false); reconcile();
  return dispose;
}
