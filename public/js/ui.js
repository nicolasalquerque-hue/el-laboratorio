/* ui.js — utilidades de interfaz, sin dependencias */

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const el = (tag, attrs = {}, ...kids) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') n.className = v;
    else if (k === 'html') n.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v);
    else if (v !== null && v !== undefined && v !== false) n.setAttribute(k, v);
  }
  for (const kid of kids.flat()) {
    if (kid == null) continue;
    n.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return n;
};

const ICONS = {
  home: 'M3 10.5 12 3l9 7.5M5.5 9.5V20h13V9.5',
  trophy: 'M7 4h10v4a5 5 0 0 1-10 0V4Zm0 2H4v2a3 3 0 0 0 3 3m10-5h3v2a3 3 0 0 1-3 3M12 13v5m-4 2h8',
  users: 'M16 19v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V19M9.5 4a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Zm7 .5a3.5 3.5 0 0 1 0 7M21 19v-1.5a4 4 0 0 0-3-3.87',
  mail: 'M3 6.5h18v11H3v-11Zm0 .5 9 6 9-6',
  logout: 'M15 4h3.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H15M10 8l-4 4 4 4M6 12h9',
  plus: 'M12 5v14M5 12h14',
  play: 'M8 5.5v13l10-6.5-10-6.5Z',
  check: 'M4 12.5 9 17.5 20 6.5',
  lock: 'M7 11V8a5 5 0 0 1 10 0v3M5.5 11h13v9h-13v-9Z',
  copy: 'M9 9h9.5v11H9V9Zm-3.5 6H4V4h11v1.5',
  arrow: 'M5 12h13m-5-5 5 5-5 5',
  sparkle: 'M12 3.5 13.8 9l5.7 1.8-5.7 1.8L12 18.2l-1.8-5.6L4.5 10.8 10.2 9 12 3.5Z',
  user: 'M12 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8Zm-8 16v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1',
  x: 'M6 6l12 12M18 6 6 18',
  edit: 'M4 20h4L19 9l-4-4L4 16v4Zm10-14 4 4',
  shield: 'M12 3.5 19 6v6c0 4.2-3 7.2-7 8.5-4-1.3-7-4.3-7-8.5V6l7-2.5Z',
  clock: 'M12 4a8 8 0 1 1 0 16 8 8 0 0 1 0-16Zm0 4v4.5l3 2',
  target: 'M12 4a8 8 0 1 1 0 16 8 8 0 0 1 0-16Zm0 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z',
  rotate: 'M4 9a8 8 0 0 1 13.5-3M4 4v5h5M20 15a8 8 0 0 1-13.5 3M20 20v-5h-5',
  trash: 'M4 7h16M9 7V4h6v3m-9 0 1 13h10l1-13',
  chevron: 'M9 6l6 6-6 6',
  book: 'M4 5.5A2.5 2.5 0 0 1 6.5 3H19v15H6.5A2.5 2.5 0 0 0 4 20.5v-15Z',
  grid: 'M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z',
  flame: 'M12 3.5c3 3.5 5 5.5 5 8.5a5 5 0 0 1-10 0c0-1.5.6-2.7 1.8-4.2.6.9 1.2 1.4 2 1.7-.3-2.2.2-4 .2-6Z',
};

export function icon(name, size = 18, cls = '') {
  const d = ICONS[name] || ICONS.sparkle;
  return `<svg class="${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"
    aria-hidden="true" focusable="false"><path d="${d}"/></svg>`;
}

/* --------------------------------- toasts -------------------------------- */
export function toast(message, kind = '') {
  const box = document.getElementById('toasts');
  if (!box) return;
  while (box.children.length >= 3) box.firstElementChild.remove();
  const t = document.createElement('div');
  t.className = 'toast' + (kind ? ' toast--' + kind : '');
  t.textContent = message;
  box.appendChild(t);
  setTimeout(() => {
    t.classList.add('out');
    setTimeout(() => t.remove(), 240);
  }, 3000);
}

/* --------------------------------- modal -------------------------------- */
export function modal({ title, body, actions = [], onMount, wide = false }) {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  const card = document.createElement('div');
  card.className = 'modal';
  if (wide) card.style.width = 'min(760px, 100%)';
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-modal', 'true');
  card.innerHTML = `
    <button class="btn btn--quiet btn--sm modal__close" aria-label="Cerrar">${icon('x', 16)}</button>
    ${title ? `<h2>${esc(title)}</h2>` : ''}
    <div class="modal__body">${body || ''}</div>
    <div class="modal-actions"></div>`;
  const actionsBox = card.querySelector('.modal-actions');
  const close = () => {
    backdrop.remove();
    document.removeEventListener('keydown', onKey);
  };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  for (const a of actions) {
    const b = document.createElement('button');
    b.className = 'btn ' + (a.kind === 'primary' ? 'btn--accent' : a.kind === 'danger' ? 'btn--accent' : 'btn--ghost');
    b.textContent = a.label;
    b.addEventListener('click', async () => {
      if (a.onClick) {
        const keep = await a.onClick({ card, close });
        if (keep === false) return;
      }
      close();
    });
    actionsBox.appendChild(b);
  }
  card.querySelector('.modal__close').addEventListener('click', close);
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
  document.addEventListener('keydown', onKey);
  backdrop.appendChild(card);
  document.body.appendChild(backdrop);
  if (onMount) onMount(card, close);
  const first = card.querySelector('input, textarea, button.btn--accent');
  if (first) setTimeout(() => first.focus(), 60);
  return { close, card };
}

export function confirmDialog({ title, body, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', danger = false }) {
  return new Promise((resolve) => {
    modal({
      title,
      body: `<p class="muted" style="margin:0">${body}</p>`,
      actions: [
        { label: cancelLabel, onClick: () => resolve(false) },
        { label: confirmLabel, kind: danger ? 'danger' : 'primary', onClick: () => resolve(true) },
      ],
    });
    const back = document.querySelector('.modal-backdrop');
    if (back) back.addEventListener('click', (e) => { if (e.target === back) resolve(false); }, { once: true });
  });
}

/* --------------------------------- sonido -------------------------------- */
let audioCtx = null;
const soundOn = () => localStorage.getItem('lab.sound') !== 'off';
export const sound = {
  toggle() {
    const off = !soundOn();
    localStorage.setItem('lab.sound', off ? 'on' : 'off');
    return off;
  },
  get enabled() { return soundOn(); },
  ok() { if (!soundOn()) return; tone(660, 0.09, 0.05); setTimeout(() => tone(880, 0.1, 0.045), 90); },
  bad() { if (!soundOn()) return; tone(200, 0.14, 0.04, 'triangle'); },
  win() { if (!soundOn()) return; [523, 659, 784].forEach((f, i) => setTimeout(() => tone(f, 0.16, 0.05), i * 110)); },
};

function tone(freq, dur, gain, type = 'sine') {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, audioCtx.currentTime);
    g.gain.linearRampToValueAtTime(gain, audioCtx.currentTime + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
    o.connect(g).connect(audioCtx.destination);
    o.start();
    o.stop(audioCtx.currentTime + dur + 0.02);
  } catch { /* silencio */ }
}

/* ------------------------------- formato -------------------------------- */
export function fmtSeconds(sec) {
  sec = Math.max(0, Math.round(sec || 0));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m`;
  return `${sec}s`;
}

export function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function fmtRelative(iso) {
  if (!iso) return '—';
  const d = new Date(iso).getTime();
  if (Number.isNaN(d)) return '—';
  const diff = Date.now() - d;
  const min = Math.round(diff / 60000);
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const days = Math.round(h / 24);
  if (days < 30) return `hace ${days} d`;
  return fmtDate(iso);
}

/* ------------------------------- insignias ------------------------------- */
export const BADGE_LABEL = {
  iniciante: 'Iniciante',
  explorador: 'Explorador',
  constructor: 'Constructor',
  god: 'God',
  primeros_pasos: 'Primeros pasos',
  racha_fuego: 'Racha de fuego',
  sin_ayudas: 'Sin ayudas',
  god_laboratorio: 'God del laboratorio',
};

export function badgePill(key) {
  if (!key) return '';
  return `<span class="badge-pill badge-pill--${esc(key)}"><span class="badge-dot"></span>${esc(BADGE_LABEL[key] || key)}</span>`;
}

/* ------------------------------- matemática ------------------------------ */
export function tex(expr, { display = false, size = null } = {}) {
  if (!window.katex) return esc(expr);
  try {
    return window.katex.renderToString(expr, { displayMode: display, throwOnError: false, output: 'html' });
  } catch {
    return esc(expr);
  }
}

/* ------------------------------- varios --------------------------------- */
export function debounce(fn, ms = 220) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

export function setBusy(btn, busy) {
  if (!btn) return;
  if (busy) {
    btn.dataset.label = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Un momento…';
  } else {
    btn.disabled = false;
    if (btn.dataset.label) btn.textContent = btn.dataset.label;
  }
}

export function qs(sel, root = document) { return root.querySelector(sel); }
export function qsa(sel, root = document) { return [...root.querySelectorAll(sel)]; }
