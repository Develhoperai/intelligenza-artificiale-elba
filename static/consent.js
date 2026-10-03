'use strict';
// Statistics consent. Nothing from Google is requested until the visitor accepts;
// a refusal is remembered in this browser only and no cookie is written for it.
(() => {
  const banner = document.querySelector('[data-consent]');
  if (!banner) return;
  const id = banner.dataset.analytics;
  const KEY = 'elba-analytics-consent';
  const SIX_MONTHS = 182 * 24 * 60 * 60 * 1000;
  const openers = document.querySelectorAll('[data-consent-open]');
  let loaded = false;

  const read = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
      return saved && Date.now() - saved.at < SIX_MONTHS ? saved.choice : null;
    } catch { return null; }
  };
  const write = choice => { try { localStorage.setItem(KEY, JSON.stringify({ choice, at: Date.now() })); } catch { /* private mode: ask again next visit */ } };

  const load = () => {
    if (loaded) return;
    loaded = true;
    window[`ga-disable-${id}`] = false;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', id);
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
    document.head.append(script);
  };
  const forget = () => {
    window[`ga-disable-${id}`] = true;
    document.cookie.split(';').map(c => c.split('=')[0].trim()).filter(name => name === '_ga' || name.startsWith('_ga_')).forEach(name => {
      [location.hostname, `.${location.hostname.replace(/^www\./, '')}`].forEach(domain => {
        document.cookie = `${name}=; Max-Age=0; path=/; domain=${domain}`;
      });
      document.cookie = `${name}=; Max-Age=0; path=/`;
    });
  };

  banner.querySelectorAll('[data-consent-choice]').forEach(button => button.addEventListener('click', () => {
    const choice = button.dataset.consentChoice;
    write(choice);
    banner.hidden = true;
    if (choice === 'granted') load(); else forget();
  }));
  openers.forEach(opener => { opener.hidden = false; opener.addEventListener('click', () => { banner.hidden = false; banner.querySelector('button')?.focus(); }); });

  const choice = read();
  if (choice === 'granted') load(); else if (choice !== 'denied') banner.hidden = false;
})();
