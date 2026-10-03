import * as THREE from './vendor/threejs/three.module.min.js';

// Original worktable and orbital ribbon choreography, built with local Three.js r180 (MIT).
export function startExperience(world) {
  const stage = world.querySelector('.experience-stage');
  const canvas = stage?.querySelector('canvas');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(max-width:760px)').matches;
  if (!canvas || reduced.matches) return;
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
  let pixelBudget = software ? 420000 : Infinity;
  let frameInterval = software ? 125 : (mobile ? 40 : 33);
  world.dataset.sceneTier = software ? 'software' : 'normal';
  renderer.setClearColor('#0c1523', 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  renderer.shadowMap.enabled = !software && !mobile;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(mobile ? 48 : 37, 1, 0.1, 110);
  const key = new THREE.DirectionalLight('#fff2da', 4.2); key.position.set(-7, 15, 8);
  key.castShadow = !software && !mobile; key.shadow.mapSize.set(512, 512);
  key.shadow.camera.left = -14; key.shadow.camera.right = 14; key.shadow.camera.top = 14; key.shadow.camera.bottom = -14;
  key.shadow.normalBias = 0.08; key.shadow.bias = -0.001;
  scene.add(key, new THREE.HemisphereLight('#a9ccff', '#16273d', 2.6));
  const edge = new THREE.DirectionalLight('#62c5ff', 3); edge.position.set(10, 3, -9); scene.add(edge);
  const room = new THREE.Scene(); room.background = new THREE.Color('#25374c');
  const lightbox = new THREE.Mesh(new THREE.PlaneGeometry(17, 19), new THREE.MeshBasicMaterial({ color: '#c9e7ff', side: THREE.DoubleSide }));
  lightbox.position.set(-6, 8, -9); lightbox.rotation.y = 0.4; room.add(lightbox);
  const environment = new THREE.PMREMGenerator(renderer);
  const reflectionMap = environment.fromScene(room, 0.08, 0.1, 100, { size: software ? 32 : 128 });
  scene.environment = reflectionMap.texture; environment.dispose(); lightbox.geometry.dispose(); lightbox.material.dispose();
  const desk = new THREE.Group(); scene.add(desk);
  const plane = new THREE.Mesh(new THREE.BoxGeometry(15, 0.16, 11), new THREE.MeshStandardMaterial({ color: '#132c46', roughness: 0.62, metalness: 0.3 }));
  plane.position.y = -0.28; plane.receiveShadow = true; desk.add(plane);
  const top = new THREE.Mesh(new THREE.PlaneGeometry(14.7, 10.7), new THREE.MeshStandardMaterial({ color: '#1f3c54', roughness: 0.8, metalness: 0.1 }));
  top.rotation.x = -Math.PI / 2; top.position.y = -0.187; top.receiveShadow = true; desk.add(top);
  const lineMaterial = new THREE.LineBasicMaterial({ color: '#5484ac', transparent: true, opacity: 0.28 });
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
    const spread = new THREE.Vector3(Math.sin(n * 2.17) * 5.4, 0.2 + (n % 6) * 0.2, Math.cos(n * 1.72) * 3.7);
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
  let paused = document.documentElement.dataset.scenePaused === 'true', visible = true, lost = false;
  let frame = 0, raf = 0, last = 0, clock = 0, progress = 0, destination = 0, load = 360;
  let gpuFence = null, measuredCost = 0, slowFrames = 0, adaptations = 0;
  let cpuDrawCost = 0, gpuWaitMs = 0, lastFencePoll = 0;
  const pendingMeasurements = [];
  const chapters = [...world.querySelectorAll('[data-scene]')];
  const updateScroll = () => {
    const r = world.getBoundingClientRect(); destination = THREE.MathUtils.clamp(-r.top / Math.max(1, r.height - innerHeight), 0, 1);
    const active = chapters.find(section => { const b = section.getBoundingClientRect(); return b.top <= innerHeight * 0.55 && b.bottom > innerHeight * 0.55; });
    if (active) world.dataset.activeScene = active.dataset.scene;
  };
  const updateSize = () => {
    const r = stage.getBoundingClientRect();
    const ratio = Math.min(devicePixelRatio || 1, dprLimit, Math.sqrt(pixelBudget / Math.max(1, r.width * r.height)));
    renderer.setPixelRatio(ratio); renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / Math.max(1, r.height);
    camera.setViewOffset(r.width, r.height, mobile ? 0 : -r.width * 0.24, mobile ? -r.height * 0.15 : 0, r.width, r.height);
    camera.updateProjectionMatrix(); world.dataset.sceneDpr = ratio.toFixed(2); updateScroll();
  };
  const adaptBudget = cost => {
    if (frame < 5 || adaptations >= 3) return;
    measuredCost = measuredCost ? measuredCost * 0.8 + cost * 0.2 : cost;
    slowFrames = measuredCost > 75 ? slowFrames + 1 : Math.max(0, slowFrames - 1);
    if (slowFrames < 5) return;
    adaptations++; slowFrames = 0; dprLimit = Math.max(0.35, dprLimit * 0.75);
    pixelBudget = Math.min(pixelBudget * 0.7, software ? 420000 : 1200000); frameInterval = 125;
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
  const draw = () => {
    const started = performance.now(), query = gpuTimer && pendingMeasurements.length < 4 ? gl.createQuery() : null;
    if (query) gl.beginQuery(gpuTimer.TIME_ELAPSED_EXT, query);
    progress += (destination - progress) * (1 - Math.exp(-frameInterval / 1000 * 2.8));
    const method = THREE.MathUtils.smoothstep(progress, 0.28, 0.65);
    const angle = progress * 0.72;
    camera.position.set(9 * Math.cos(angle), mobile ? 15.5 : 12.5, 14 + Math.sin(angle) * 4); camera.lookAt(0, 0.6, 0);
    papers.forEach((paper, n) => {
      paper.group.position.lerpVectors(paper.spread, paper.ordered, method);
      const waiting = 1 - method;
      paper.group.position.y += Math.sin(clock * 0.55 + paper.phase) * 0.09 * waiting;
      paper.group.rotation.y = paper.angle * waiting;
      paper.group.rotation.x = Math.sin(clock * 0.34 + paper.phase) * 0.025 * waiting;
      paper.group.visible = n < 9 + Math.round(Math.min(1, load / 600) * (papers.length - 9));
    });
    desk.rotation.y = -0.1 + progress * 0.26;
    ribbons.rotation.y = -0.4 + progress * 1.6 + Math.sin(clock * 0.2) * 0.028;
    ribbons.rotation.z = 0.12 + Math.sin(clock * 0.16) * 0.02;
    ribbons.position.y = 2.9 + Math.sin(clock * 0.28) * 0.09;
    ribbons.scale.setScalar(mobile ? 0.68 : 0.72);
    renderer.render(scene, camera); frame++; cpuDrawCost = performance.now() - started;
    if (query) { gl.endQuery(gpuTimer.TIME_ELAPSED_EXT); pendingMeasurements.push({ query, cpu: cpuDrawCost }); }
    if (typeof gl.fenceSync === 'function') { gpuFence = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0); gl.flush(); gpuWaitMs = 0; lastFencePoll = performance.now(); }
    world.dataset.sceneState = 'running'; world.dataset.cameraProgress = progress.toFixed(3); world.dataset.sceneFrames = String(frame);
    if (!stage.classList.contains('is-ready')) stage.classList.add('is-ready');
  };
  const canRun = () => !paused && visible && !document.hidden && !reduced.matches && !lost;
  const animate = stamp => {
    raf = 0; if (!canRun()) return;
    if (completedFrame() && stamp - last >= frameInterval) { clock += Math.min(0.2, (stamp - last) / 1000 || 0); last = stamp; draw(); }
    raf = requestAnimationFrame(animate);
  };
  const reconcile = () => {
    if (canRun()) { if (!raf) { last = performance.now(); lastFencePoll = last; measuredCost = 0; slowFrames = 0; raf = requestAnimationFrame(animate); } }
    else { cancelAnimationFrame(raf); raf = 0; world.dataset.sceneState = lost ? 'fallback' : (paused ? 'paused' : 'sleeping'); }
  };
  world.addEventListener('experience:pause', event => { paused = event.detail.paused; reconcile(); });
  world.addEventListener('experience:workload', event => { load = Math.max(0, Number(event.detail.minutes) || 0); });
  const view = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; reconcile(); }, { threshold: 0.001 }); view.observe(world);
  const resize = new ResizeObserver(updateSize); resize.observe(stage);
  window.addEventListener('scroll', updateScroll, { passive: true }); document.addEventListener('visibilitychange', reconcile); reduced.addEventListener('change', reconcile);
  canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); lost = true; stage.classList.remove('is-ready'); reconcile(); });
  window.addEventListener('pagehide', () => { cancelAnimationFrame(raf); raf = 0; }); window.addEventListener('pageshow', reconcile);
  updateSize(); draw(); reconcile();
}
