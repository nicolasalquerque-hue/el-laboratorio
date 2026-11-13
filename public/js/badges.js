/* badges.js — insignias SVG y catálogo de logros */
import { modal, esc, fmtDate } from './ui.js';

const PALETTE = {
  iniciante: { a: '#a9b1a6', b: '#79837a', ring: '#e6e2d6', ink: '#3d453e' },
  explorador: { a: '#6f9dc4', b: '#2f5d8a', ring: '#dbe6ef', ink: '#1f415f' },
  constructor: { a: '#cf7a5c', b: '#b4442c', ring: '#f2ddd4', ink: '#7d2c1c' },
  god: { a: '#e6c46a', b: '#b8862a', ring: '#f7edd8', ink: '#7a5510' },
};

function ribbon(p) {
  return `<path d="M22 40 L16 60 L26 55 L32 62 L34 42 Z" fill="${p.b}" opacity=".85"/>
          <path d="M42 40 L48 60 L38 55 L32 62 L30 42 Z" fill="${p.a}" opacity=".9"/>`;
}

function symbol(tier, p) {
  switch (tier) {
    case 'iniciante':
      return `<circle cx="32" cy="26" r="5" fill="${p.ink}" opacity=".85"/>
              <path d="M32 14v6M32 32v6M20 26h6M38 26h6" stroke="${p.ink}" stroke-width="2.4" stroke-linecap="round" opacity=".55"/>`;
    case 'explorador':
      return `<path d="M32 12 L38 26 L32 40 L26 26 Z" fill="${p.ink}" opacity=".9"/>
              <circle cx="32" cy="26" r="3" fill="${p.ring}"/>`;
    case 'constructor':
      return `<rect x="22" y="26" width="10" height="10" rx="2" fill="${p.ink}" opacity=".9"/>
              <rect x="34" y="16" width="10" height="10" rx="2" fill="${p.ink}" opacity=".55"/>
              <rect x="34" y="30" width="10" height="10" rx="2" fill="${p.ink}" opacity=".7"/>`;
    case 'god':
    default:
      return `<path d="M21 30 L24 17 L30 25 L32 14 L34 25 L40 17 L43 30 Z" fill="${p.ink}" opacity=".92"/>
              <circle cx="32" cy="35" r="3" fill="${p.ink}" opacity=".8"/>`;
  }
}

/** Insignia SVG de una jerarquía o logro global. */
export function medalSVG(key, size = 56) {
  const p = PALETTE[key] || PALETTE.god;
  return `<svg class="medal-svg" width="${size}" height="${size}" viewBox="0 0 64 64" fill="none" role="img" aria-label="Insignia ${esc(key)}">
    <defs>
      <linearGradient id="g-${key}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${p.a}"/><stop offset="1" stop-color="${p.b}"/>
      </linearGradient>
    </defs>
    ${ribbon(p)}
    <circle cx="32" cy="27" r="21" fill="url(#g-${key})"/>
    <circle cx="32" cy="27" r="21" stroke="${p.ring}" stroke-width="2.5" opacity=".9"/>
    <circle cx="32" cy="27" r="16" stroke="${p.ring}" stroke-width="1" opacity=".55"/>
    ${symbol(key, p)}
  </svg>`;
}

export const LAB_BADGES = ['iniciante', 'explorador', 'constructor', 'god'];

export const BADGE_INFO = {
  iniciante: { name: 'Iniciante', how: 'Completa el laboratorio, con cualquier puntaje.' },
  explorador: { name: 'Explorador', how: 'Termina el laboratorio con al menos el 40 % del puntaje.' },
  constructor: { name: 'Constructor', how: 'Termina con al menos el 70 % del puntaje.' },
  god: { name: 'God', how: 'Alcanza el 90 % del puntaje. Solo en modo guiado.' },
  primeros_pasos: { name: 'Primeros pasos', how: 'Resuelve tus primeras 5 factorizaciones.' },
  racha_fuego: { name: 'Racha de fuego', how: '10 retos seguidos al primer intento, sin pistas.' },
  sin_ayudas: { name: 'Sin ayudas', how: 'Completa los 10 retos de Retar sin una sola pista.' },
  god_laboratorio: { name: 'God del laboratorio', how: 'Consigue God en los dos laboratorios.' },
};

export function badgeLabel(key) {
  return (BADGE_INFO[key] && BADGE_INFO[key].name) || key;
}

/** Sello animado al desbloquear una insignia. */
export function showBadgeSeal(key, detail = '') {
  modal({
    title: '',
    body: `<div class="medal-modal">
        <div class="medal-wrap seal-in">${medalSVG(key, 104)}</div>
        <h2 style="font-size:22px;margin-top:6px">Insignia desbloqueada</h2>
        <p class="lede" style="margin:0;text-align:center">${esc(detail || badgeLabel(key))}</p>
        <p class="small muted" style="margin:0;text-align:center">${esc((BADGE_INFO[key] || {}).how || '')}</p>
      </div>`,
    actions: [{ label: 'Seguir', kind: 'primary' }],
  });
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(523, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(784, ctx.currentTime + 0.18);
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
    o.connect(g).connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 0.45);
  } catch { /* silencio */ }
}

/** Tarjeta de logro (desbloqueado o bloqueado). */
export function achievementCard(key, { unlocked, earnedAt, how } = {}) {
  const info = BADGE_INFO[key] || { name: key, how: '' };
  return `<article class="achievement ${unlocked ? '' : 'achievement--locked'}">
    <div class="medal-wrap ${unlocked ? '' : 'medal-wrap--locked'}">${medalSVG(key, 46)}</div>
    <div>
      <div class="achievement__name">${esc(info.name)}</div>
      <div class="achievement__how">${esc(how || info.how)}</div>
      ${unlocked && earnedAt ? `<div class="achievement__date">Obtenida el ${fmtDate(earnedAt)}</div>` : '<div class="achievement__how" style="margin-top:4px">Sin desbloquear</div>'}
    </div>
  </article>`;
}
