'use strict';
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const world = document.querySelector('[data-experience]');
  const toggle = document.querySelector('.scene-toggle');
  const photos = [...document.querySelectorAll('.hero-photo,.meeting-photo,.contact-photo')];
  const video = document.querySelector('.hero-video');
  const saveData = Boolean(navigator.connection?.saveData);
  let stopped = false, ticking = false;
  const renderPhotos = () => {
    ticking = false;
    if (stopped || reduced.matches || document.hidden) return;
    photos.forEach(photo => {
      const r = photo.parentElement.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) return;
      const travel = Math.max(-1, Math.min(1, r.top / innerHeight));
      photo.style.transform = `scale(1.04) translate3d(0,${travel * 12}px,0)`;
    });
  };
  const scroll = () => {
    if (!ticking && !stopped && !reduced.matches) { ticking = true; requestAnimationFrame(renderPhotos); }
  };
  const reconcileVideo = () => {
    if (!video) return;
    const r = video.getBoundingClientRect();
    if (stopped || reduced.matches || saveData || document.hidden || r.bottom <= 0 || r.top >= innerHeight) video.pause();
    else {
      video.hidden = false;
      if (!video.getAttribute('src')) video.src = matchMedia('(max-width:760px)').matches ? video.dataset.sourceSmall : video.dataset.sourceWide;
      video.play().catch(() => { video.hidden = true; });
    }
  };
  window.addEventListener('scroll', () => { scroll(); reconcileVideo(); }, { passive: true });
  document.addEventListener('visibilitychange', reconcileVideo);
  reduced.addEventListener('change', () => {
    photos.forEach(p => p.style.removeProperty('transform'));
    if (toggle) toggle.hidden = reduced.matches || saveData;
    if (video && reduced.matches) video.hidden = true;
    reconcileVideo();
  });
  const pauseMedia = () => {
    stopped = !stopped;
    document.documentElement.dataset.scenePaused = String(stopped);
    if (toggle) {
      toggle.setAttribute('aria-pressed', String(stopped));
      toggle.setAttribute('aria-label', stopped ? 'Riprendi la scena' : 'Metti in pausa la scena');
      toggle.querySelector('span').textContent = stopped ? 'Riprendi la scena' : 'Ferma la scena';
    }
    world?.dispatchEvent(new CustomEvent('experience:pause', { detail: { paused: stopped } }));
    scroll(); reconcileVideo();
  };
  toggle?.addEventListener('click', pauseMedia);
  if (world && !reduced.matches && !saveData) {
    toggle.hidden = false;
    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      import('/static/experience-3d.js?v=elba14').then(module => module.startExperience(world)).catch(() => {
        world.dataset.sceneState = 'fallback';
      });
    };
    if ('IntersectionObserver' in window) {
      const loader = new IntersectionObserver(entries => {
        if (entries.some(e => e.isIntersecting)) { loader.disconnect(); start(); }
      }, { rootMargin: '160px' });
      loader.observe(world);
    } else start();
  } else if (world) {
    world.dataset.sceneState = 'static';
    if (video) { video.pause(); video.hidden = true; }
  }
  renderPhotos(); reconcileVideo();
  const tool = document.querySelector('[data-workload-tool]');
  if (!tool) return;
  const rows = [
    { id: 'messages', label: 'rispondere alle stesse domande' },
    { id: 'documents', label: 'ricopiare o riscrivere documenti' },
    { id: 'information', label: 'cercare informazioni sparse' }
  ];
  const hours = document.getElementById('workload-hours');
  const priority = document.getElementById('workload-priority');
  const feedback = document.getElementById('workload-feedback');
  const format = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 1 });
  let current = null;
  const calculate = (announce = false) => {
    const items = [];
    for (const row of rows) {
      const count = document.getElementById(`work-${row.id}-count`);
      const minutes = document.getElementById(`work-${row.id}-minutes`);
      for (const input of [count, minutes]) {
        if (input.value.trim() === '' || !Number.isFinite(input.valueAsNumber) || !input.checkValidity()) {
          feedback.textContent = 'Inserisci numeri interi entro i limiti: da 0 a 500 ripetizioni e da 0 a 240 minuti.';
          if (announce) { input.focus(); input.reportValidity(); }
          return false;
        }
      }
      items.push({ ...row, count: count.valueAsNumber, minutes: minutes.valueAsNumber, total: count.valueAsNumber * minutes.valueAsNumber });
    }
    const total = items.reduce((sum, row) => sum + row.total, 0);
    const first = items.reduce((best, row) => row.total > best.total ? row : best, items[0]);
    hours.value = format.format(total / 60);
    hours.dataset.minutes = String(total);
    priority.textContent = total ? `Da guardare per primo: ${first.label}.` : 'Hai indicato zero ore. Puoi aggiungere le attività che si ripetono nella tua settimana.';
    items.forEach(row => { document.querySelector(`[data-meter="${row.id}"]`).style.width = `${total ? row.total / total * 100 : 0}%`; });
    current = { items, total };
    world?.dispatchEvent(new CustomEvent('experience:workload', { detail: { minutes: total } }));
    if (announce) feedback.textContent = 'Scheda aggiornata. È il carico stimato che hai indicato, non un risparmio previsto.';
    return true;
  };
  document.getElementById('calculate-workload').addEventListener('click', () => calculate(true));
  tool.querySelectorAll('input').forEach(input => input.addEventListener('input', () => calculate(false)));
  document.getElementById('download-workload').addEventListener('click', () => {
    if (!calculate(true)) return;
    const content = 'INTELLIGENZA ARTIFICIALE ELBA\nScheda del lavoro ripetitivo — stime personali\n\n' + current.items.map(row => `${row.label}: ${row.count} volte/settimana × ${row.minutes} minuti = ${row.total} minuti/settimana`).join('\n') + `\n\nTotale indicato: ${format.format(current.total / 60)} ore/settimana.\n${priority.textContent}\n\nFormula: somma di ripetizioni × minuti, divisa per 60.\nStima personale, non una previsione di risparmio né una valutazione automatica dell’utilità dell’AI.\nPrimo passo: osservare il processo, provare con dati di esempio e definire i controlli.\n\nCalcolo nel browser: nessun dato è stato inviato a un modello AI o salvato da questo sito.\n`;
    const url = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'elba-scheda-del-tuo-lavoro.txt';
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    feedback.textContent = 'Scheda scaricata. Puoi portarla al primo incontro per ragionare su un processo concreto.';
  });
  calculate(false);
})();
