'use strict';
// Scroll direction for the page: one rAF loop owns every scroll-linked value and the 3D stage.
// No scroll listeners, no inline styles in markup (production CSP is style-src 'self').
(() => {
  const root = document.documentElement;
  const world = document.querySelector('[data-experience]');
  if (!world) return;
  root.classList.add('js');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const narrow = matchMedia('(max-width: 60rem)');
  const saveData = Boolean(navigator.connection?.saveData);
  const video = document.querySelector('.hero-video');
  const header = document.querySelector('[data-header]');
  const version = document.querySelector('.stage-canvas')?.dataset.assetVersion || '';
  const scenes = {};
  world.querySelectorAll('[data-scene]').forEach(el => { scenes[el.dataset.scene] = el; });
  const sheet = world.querySelector('.sheet');
  const heroFrame = world.querySelector('[data-hero-frame]');
  const heroCopy = world.querySelector('[data-hero-copy]');
  const fragments = [...world.querySelectorAll('[data-fragment]')];
  const steps = [...world.querySelectorAll('[data-step]')];
  const track = [...world.querySelectorAll('.steps-track i')];
  const peakEnd = world.querySelector('[data-peak-end]');

  // Shared with the 3D module. Values are smoothed scroll progress, 0..1.
  const state = { hero: 0, chaos: 0, peak: 0, door: 0, time: 0, covered: false, project: world.dataset.experience === 'project', narrow: narrow.matches };
  const target = { hero: 0, chaos: 0, peak: 0, door: 0 };
  let motion = !reduced.matches;
  let stage = null, raf = 0, last = 0, activeStep = -2;

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };

  // Headings: wrap words so they can rise out of a mask. The accessible name is kept on the heading.
  const split = el => {
    if (el.dataset.splitDone) return;
    el.dataset.splitDone = '1';
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    let index = 0;
    [...el.childNodes].forEach(node => {
      if (node.nodeType !== Node.TEXT_NODE) return;
      const fragment = document.createDocumentFragment();
      node.textContent.split(/(\s+)/).forEach(part => {
        if (!part) return;
        if (/^\s+$/.test(part)) { fragment.append(' '); return; }
        const outer = document.createElement('span'); outer.className = 'w'; outer.setAttribute('aria-hidden', 'true');
        const inner = document.createElement('span'); inner.textContent = part;
        inner.style.transitionDelay = `${Math.min(index++ * 45, 540)}ms`;
        outer.append(inner); fragment.append(outer);
      });
      node.replaceWith(fragment);
    });
  };

  const revealAll = () => world.querySelectorAll('[data-split],[data-reveal]').forEach(el => el.classList.add('in'));
  let revealer = null;
  const armReveals = () => {
    world.querySelectorAll('[data-split]').forEach(split);
    if (!('IntersectionObserver' in window)) { revealAll(); return; }
    revealer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in');
        revealer.unobserve(entry.target);
      });
    }, { threshold: 0.2, rootMargin: '0px 0px -6% 0px' });
    world.querySelectorAll('[data-split],[data-reveal]').forEach(el => revealer.observe(el));
  };

  const playVideo = () => {
    if (!video) return;
    const hero = scenes.hero?.getBoundingClientRect();
    const visible = hero && hero.bottom > 0 && hero.top < innerHeight;
    if (reduced.matches || saveData || document.hidden || !visible) { video.pause(); return; }
    if (!video.getAttribute('src')) video.src = narrow.matches ? video.dataset.sourceSmall : video.dataset.sourceWide;
    video.hidden = false;
    video.play().catch(() => { video.hidden = true; });
  };

  const measure = () => {
    const vh = innerHeight;
    const through = el => { const r = el.getBoundingClientRect(); return clamp(-r.top / Math.max(1, r.height - vh)); };
    if (scenes.hero) target.hero = through(scenes.hero);
    if (scenes.chaos) target.chaos = through(scenes.chaos);
    if (scenes.peak) target.peak = through(scenes.peak);
    if (scenes.door) target.door = clamp((vh - scenes.door.getBoundingClientRect().top) / vh);
    if (sheet) { const r = sheet.getBoundingClientRect(); state.covered = r.top <= 0 && r.bottom >= vh; }
    header?.classList.toggle('is-solid', scrollY > vh * 0.6);
  };

  const direct = () => {
    if (heroFrame) {
      const p = state.hero;
      const scale = 1 - 0.46 * smooth(0, 0.85, p);
      heroFrame.style.transform = `translate3d(0,${(-9 * p).toFixed(2)}vh,0) scale(${scale.toFixed(4)})`;
      heroFrame.style.borderRadius = `${(2.2 * smooth(0, 0.3, p)).toFixed(2)}rem`;
      heroFrame.style.opacity = (1 - smooth(0.62, 0.98, p)).toFixed(3);
      heroCopy.style.opacity = (1 - smooth(0.04, 0.3, p)).toFixed(3);
      heroCopy.style.transform = `translate3d(0,${(-7 * smooth(0, 0.4, p)).toFixed(2)}vh,0)`;
    }
    fragments.forEach((el, i) => {
      const start = 0.06 + i * 0.2;
      const a = smooth(start, start + 0.12, state.chaos) * (1 - smooth(start + 0.34, start + 0.5, state.chaos));
      el.style.opacity = a.toFixed(3);
      el.style.transform = `translate3d(0,${((1 - smooth(start, start + 0.5, state.chaos)) * 3 - 1.5).toFixed(2)}rem,0)`;
    });
    if (steps.length) {
      const p = state.peak;
      const step = p < 0.07 ? -1 : p < 0.36 ? 0 : p < 0.63 ? 1 : 2;
      if (step !== activeStep) {
        activeStep = step;
        steps.forEach((el, i) => { el.classList.toggle('is-active', i === step); el.classList.toggle('is-past', i < step); });
        track.forEach((el, i) => el.classList.toggle('is-done', i <= step));
      }
      peakEnd?.classList.toggle('is-active', p > 0.84);
      steps[0].parentElement.classList.toggle('is-over', p > 0.84);
    }
  };

  const frame = now => {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
    if (document.hidden) return;
    measure();
    const k = 1 - Math.exp(-dt * 7); // ≈0.4 s of scrub smoothing
    for (const key in target) {
      const delta = target[key] - state[key];
      if (Math.abs(delta) > 0.0002) state[key] += delta * k; else state[key] = target[key];
    }
    state.time += dt;
    direct();
    if (stage && !state.covered) stage.render(state);
  };

  const stopMotion = () => {
    cancelAnimationFrame(raf); raf = 0;
    root.classList.remove('motion');
    [heroFrame, heroCopy, ...fragments].forEach(el => el?.removeAttribute('style'));
    revealAll();
    world.dataset.sceneState = 'static';
    document.querySelector('.stage')?.classList.remove('is-ready');
    if (video) { video.pause(); video.hidden = true; }
  };

  const rollSectors = () => {
    const list = world.querySelector('.sectors-track');
    if (!list || list.classList.contains('is-rolling')) return;
    [...list.children].forEach(item => { const copy = item.cloneNode(true); copy.setAttribute('aria-hidden', 'true'); list.append(copy); });
    list.classList.add('is-rolling');
  };

  const startMotion = () => {
    root.classList.add('motion');
    rollSectors();
    armReveals();
    last = performance.now();
    raf = requestAnimationFrame(frame);
    playVideo();
    if (saveData) { world.dataset.sceneState = 'static'; return; }
    import(`/static/experience-3d.js?v=${version}`)
      .then(module => module.startExperience(world.ownerDocument.querySelector('.stage-canvas'), state))
      .then(instance => {
        stage = instance;
        world.dataset.sceneTier = instance.tier;
        world.dataset.sceneDpr = String(instance.dpr);
        world.dataset.sceneState = 'running';
        document.querySelector('.stage')?.classList.add('is-ready');
      })
      .catch(() => { world.dataset.sceneState = 'fallback'; });
  };

  // Urgent requests: build the message here and hand it to the visitor's own WhatsApp. Nothing is sent to the site.
  const whatsapp = document.getElementById('whatsapp-form');
  whatsapp?.addEventListener('submit', event => {
    event.preventDefault();
    if (!whatsapp.reportValidity()) return;
    const f = whatsapp.elements;
    const who = f.business.value.trim() ? `${f.name.value.trim()} (${f.business.value.trim()})` : f.name.value.trim();
    const text = `Ciao, sono ${who}. Scrivo dal sito Intelligenza Artificiale Elba.\n\n${f.message.value.trim()}`;
    window.open(`https://wa.me/${whatsapp.dataset.whatsapp}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  });

  document.addEventListener('visibilitychange', playVideo);
  if ('IntersectionObserver' in window && scenes.hero) new IntersectionObserver(playVideo).observe(scenes.hero);
  narrow.addEventListener('change', () => { state.narrow = narrow.matches; stage?.resize(); });
  addEventListener('resize', () => stage?.resize());
  reduced.addEventListener('change', () => {
    motion = !reduced.matches;
    if (motion && !raf) startMotion(); else if (!motion) stopMotion();
  });

  if (motion) startMotion(); else { world.dataset.sceneState = 'static'; if (video) video.hidden = true; }
})();
