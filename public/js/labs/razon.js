/* labs/razon.js — Razón y proporción v1.1
   Escenas animadas + variables libres en Explorar/Modo libre. */
import { store } from '../store.js';
import { esc, icon, toast, sound, confirmDialog } from '../ui.js';
import { showBadgeSeal, medalSVG } from '../badges.js';

const LAB = 'razon';
const MAX_PTS = 100;

/* ------------------------------ escenarios ------------------------------ */
const SCENARIOS = [
  { id: 'receta', titulo: 'La receta que crece', tipo: 'directa',
    desc: 'Proporcionalidad directa: si hay más comensales, hace falta más de todo.',
    hints: ['Si duplicas las personas, duplicas los ingredientes.', 'Puedes usar regla de tres: 200/4 = x/10.'],
    retos: [
      { id: 'receta-1', q: 'Si la receta base pide 200 g de harina para 4 personas, ¿cuánta harina necesitas para 10?', unit: 'g', answer: 500 },
      { id: 'receta-2', q: 'Para 6 personas, ¿cuántos huevos si la base pide 2?', unit: 'huevos', answer: 3 },
    ] },
  { id: 'obra', titulo: 'La obra', tipo: 'inversa',
    desc: 'Proporcionalidad inversa: más obreros, menos días.',
    hints: ['Al duplicar los obreros, el tiempo se reduce a la mitad.', 'El producto obreros × días se mantiene constante.'],
    retos: [
      { id: 'obra-1', q: 'Si 4 obreros tardan 12 días, ¿cuánto tardan 8 obreros?', unit: 'días', answer: 6 },
      { id: 'obra-2', q: 'Si 3 obreros tardan 20 días, ¿cuántos obreros necesitas para tardar 5 días?', unit: 'obreros', answer: 12 },
    ] },
  { id: 'mapa', titulo: 'El mapa', tipo: 'directa',
    desc: 'Escala: los centímetros del mapa se convierten en kilómetros reales.',
    hints: ['Multiplica los centímetros del mapa por lo que vale 1 cm en la realidad.', 'Puedes usar regla de tres.'],
    retos: [
      { id: 'mapa-1', q: 'Si en el mapa hay 6 cm entre dos ciudades y la escala es 1 cm = 5 km, ¿cuál es la distancia real?', unit: 'km', answer: 30 },
      { id: 'mapa-2', q: 'Si la distancia real entre dos puntos es 40 km, ¿cuántos cm hay en el mapa?', unit: 'cm', answer: 8 },
    ] },
  { id: 'viaje', titulo: 'Velocidad y tiempo', tipo: 'inversa',
    desc: 'A distancia fija, más velocidad significa menos tiempo.',
    hints: ['Tiempo = distancia ÷ velocidad.', 'Si vas al doble de velocidad, tardas la mitad.'],
    retos: [
      { id: 'viaje-1', q: 'Si viajas a 60 km/h, ¿cuánto tardas en recorrer 120 km?', unit: 'horas', answer: 2 },
      { id: 'viaje-2', q: 'Si tardas 3 horas en recorrer 120 km, ¿a qué velocidad viajaste?', unit: 'km/h', answer: 40 },
    ] },
];

const RETAR = [
  { id: 'mx1', q: 'Si una receta para 6 personas pide 3 huevos, ¿cuántos huevos pide para 10 personas?',
    opts: ['4', '5', '6', '8'], ok: 1, hint: 'Si 6 personas usan 3 huevos, 2 personas usan 1.' },
  { id: 'mx2', q: 'Cuatro pintores tardan 6 días en pintar una casa. ¿Cuánto tardan ocho pintores?',
    opts: ['12 días', '3 días', '6 días', '2 días'], ok: 1, hint: 'Al doble de pintores, la mitad del tiempo.' },
  { id: 'mx3', q: 'En un mapa, 2 cm representan 10 km. ¿Cuántos km representan 7 cm?',
    opts: ['14 km', '20 km', '35 km', '70 km'], ok: 2, hint: 'Cada centímetro vale 5 km.' },
  { id: 'mx4', q: 'Un carro recorre 180 km en 3 horas. ¿Cuál es su velocidad promedio?',
    opts: ['45 km/h', '60 km/h', '90 km/h', '120 km/h'], ok: 1, hint: 'Velocidad = distancia ÷ tiempo.' },
  { id: 'mx5', q: 'Si 5 máquinas producen 200 piezas en una hora, ¿cuántas producen 8 máquinas?',
    opts: ['250', '320', '400', '280'], ok: 1, hint: 'Cada máquina produce 40 piezas por hora.' },
];

const ARG = [
  { id: 'a1', q: '¿Qué diferencia hay entre proporcionalidad directa e inversa?',
    opts: [
      'En la directa, al aumentar uno aumenta el otro; en la inversa, al aumentar uno disminuye el otro.',
      'En la directa los números son positivos y en la inversa negativos.',
      'No hay diferencia, es lo mismo escrito de otra forma.',
      'La directa se usa en recetas y la inversa solo en física.',
    ], ok: 0, okMsg: 'Exacto: en la directa crecen juntas; en la inversa una baja cuando la otra sube.' },
  { id: 'a2', q: 'Da un ejemplo de tu vida diaria donde uses proporciones.',
    open: true, min: 15,
    keywords: ['receta', 'compra', 'precio', 'velocidad', 'distancia', 'mapa', 'tiempo', 'proporci', 'escala'],
    okMsg: 'Buen ejemplo: eso es usar proporciones en la vida real.',
    softMsg: 'Va por buen camino. Menciona una situación concreta: receta, compra, mapa o viaje.' },
];

const badgeFor = (s) => (s >= 0.9 * MAX_PTS ? 'god' : s >= 0.7 * MAX_PTS ? 'constructor' : s >= 0.4 * MAX_PTS ? 'explorador' : 'iniciante');

function defaults() {
  return {
    version: 2, phase: 1, scenario: null, free: false,
    scenarios: Object.fromEntries(SCENARIOS.map((s) => [s.id, { explored: false, solved: [false, false], points: 0, hints: 0, attempts: {}, vars: null }])),
    retar: { index: 0, points: 0, attempts: {}, hintsUsed: {} },
    arg: { q1: null, texto: '', done: false, points: 0 },
    closed: false, bestScore: 0, badge: null,
  };
}

function mergeState(raw) {
  const d = defaults();
  if (!raw || typeof raw !== 'object') return d;
  return {
    ...d, ...raw,
    scenarios: { ...d.scenarios, ...(raw.scenarios || {}) },
    retar: { ...d.retar, ...(raw.retar || {}) },
    arg: { ...d.arg, ...(raw.arg || {}) },
  };
}

const construirPts = (n, hints) => (n === 1 ? (hints ? 3 : 5) : n === 2 ? 2 : n === 3 ? 1 : 0);

function pctOf(s) {
  let done = 0;
  for (const k of Object.keys(s.scenarios)) done += s.scenarios[k].solved.filter(Boolean).length;
  let p = (done / 8) * 55;
  p += (s.retar.index / RETAR.length) * 25;
  if (s.arg.done) p += 15;
  if (s.closed) p += 5;
  return Math.round(Math.min(100, p));
}

const isPreview = () => !!store.preview;

/* ------------------------------- escenas -------------------------------- */
function sceneReceta(vars) {
  const { comensales = 4, racion = 1 } = vars;
  const f = (comensales / 4) * racion;
  const plates = Math.min(10, Math.round(comensales / 2));
  return {
    html: `<div class="scene" id="scene">
      <svg viewBox="0 0 420 220" role="img" aria-label="Mesa con ingredientes para ${comensales} comensales">
        <rect x="0" y="150" width="420" height="70" fill="#e7dfd0"/>
        <rect x="30" y="128" width="360" height="14" rx="7" fill="#cbbfa9"/>
        <g id="plates">
          ${Array.from({ length: 10 }).map((_, i) => `
            <g class="plate-item" data-i="${i}" style="--dx:${i % 2 ? 40 : -40}px; opacity:${i < plates ? 1 : 0}">
              <ellipse cx="${70 + (i % 5) * 70}" cy="${118 - Math.floor(i / 5) * 46}" rx="24" ry="9" fill="#fffdf9" stroke="#d9d1c2"/>
              <ellipse cx="${70 + (i % 5) * 70}" cy="${116 - Math.floor(i / 5) * 46}" rx="14" ry="5" fill="#efe6d2"/>
            </g>`).join('')}
        </g>
        <g id="ingredients">
          <g transform="translate(24,60)">
            <rect x="0" y="0" width="34" height="26" rx="3" fill="#d9b98a"/>
            <text x="17" y="18" text-anchor="middle" font-size="9" fill="#6b4f2a" font-family="DM Sans">${Math.round(200 * f)}g</text>
          </g>
          <g transform="translate(180,58)">
            <ellipse cx="14" cy="14" rx="11" ry="14" fill="#f3e3c8" stroke="#dcc9a6"/>
            <text x="14" y="34" text-anchor="middle" font-size="9" fill="#6b4f2a" font-family="DM Sans">${Math.max(1, Math.round(2 * f))} huevos</text>
          </g>
          <g transform="translate(300,56)">
            <rect x="0" y="0" width="22" height="30" rx="4" fill="#e8eef2" stroke="#c9d6de"/>
            <rect x="4" y="4" width="14" height="14" rx="2" fill="#fffdf9"/>
            <text x="11" y="44" text-anchor="middle" font-size="9" fill="#3f5566" font-family="DM Sans">${Math.round(400 * f)}ml</text>
          </g>
        </g>
      </svg>
      <div class="scene__caption">${comensales} comensales · ${Math.round(200 * f)} g de harina</div>
    </div>`,
    update(scene, v) {
      const ff = (v.comensales / 4) * v.racion;
      const n = Math.min(10, Math.round(v.comensales / 2));
      scene.querySelectorAll('#plates .plate-item').forEach((g, i) => { g.style.opacity = i < n ? '1' : '0'; });
      scene.querySelector('.scene__caption').textContent = `${v.comensales} comensales · ${Math.round(200 * ff)} g de harina`;
      const t = scene.querySelectorAll('#ingredients text');
      if (t[0]) t[0].textContent = `${Math.round(200 * ff)}g`;
      if (t[1]) t[1].textContent = `${Math.max(1, Math.round(2 * ff))} huevos`;
      if (t[2]) t[2].textContent = `${Math.round(400 * ff)}ml`;
    },
  };
}

function sceneObra(vars) {
  const { obreros = 4, muro = 1 } = vars;
  const dias = Math.round(((48 * muro) / obreros) * 10) / 10;
  const paved = Math.min(1, 4 / Math.max(1, dias));
  const bricks = Math.round(paved * 24);
  return {
    html: `<div class="scene" id="scene">
      <svg viewBox="0 0 420 210" role="img" aria-label="Obra con ${obreros} obreros">
        <defs>
          <linearGradient id="skyObra" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#eaf1f4"/><stop offset="1" stop-color="#f7f1e4"/>
          </linearGradient>
        </defs>
        <rect width="420" height="210" fill="url(#skyObra)"/>
        <circle cx="356" cy="42" r="17" fill="#f2d69a" opacity=".85"/>
        <path d="M0 128 Q60 96 120 124 T250 118 T420 126 V210 H0 Z" fill="#e6e0d1"/>
        <path d="M0 150 Q80 126 150 148 T300 142 T420 150 V210 H0 Z" fill="#dcd4c2"/>

        <g id="scaffold" stroke="#a89b84" stroke-width="2.4" opacity=".85">
          <line x1="252" y1="60" x2="252" y2="176"/>
          <line x1="404" y1="60" x2="404" y2="176"/>
          <line x1="252" y1="72" x2="404" y2="72"/>
          <line x1="252" y1="112" x2="404" y2="112"/>
          <line x1="252" y1="152" x2="404" y2="152"/>
        </g>

        <g id="wall">
          ${Array.from({ length: 24 }).map((_, i) => {
            const row = Math.floor(i / 8), col = i % 8;
            return `<rect class="brick ${i < bricks ? '' : 'hidden'}" x="${260 + col * 18}" y="${160 - row * 13}" width="16" height="11" rx="1.5" fill="#b4644a" opacity=".95"/>`;
          }).join('')}
        </g>
        <rect x="0" y="176" width="420" height="34" fill="#cfc6b2"/>
        <g id="workers">
          ${Array.from({ length: 12 }).map((_, i) => `
            <g transform="translate(${24 + i * 17}, ${182 + (i % 2) * 2})">
              <g class="worker worker--${(i % 4) + 1}" data-i="${i}" style="opacity:${i < obreros ? 1 : 0}">
                <ellipse cx="0" cy="10" rx="5.5" ry="9" fill="#3e6b5a"/>
                <circle cx="0" cy="-3" r="4.6" fill="#e8c9a8"/>
                <path d="M-5.4 -4.6 Q0 -10.6 5.4 -4.6 Z" fill="#d8a84e"/>
              </g>
            </g>`).join('')}
        </g>
      </svg>
      <div class="scene__caption">${obreros} obreros · ${dias} días</div>
    </div>`,
    update(scene, v) {
      const d = Math.round(((48 * v.muro) / v.obreros) * 10) / 10;
      const n = Math.round(Math.min(1, 4 / Math.max(1, d)) * 24);
      scene.querySelectorAll('#workers .worker').forEach((g, i) => { g.style.opacity = i < v.obreros ? '1' : '0'; });
      scene.querySelectorAll('#wall .brick').forEach((b, i) => {
        const on = i < n;
        if (on && b.classList.contains('hidden')) b.classList.add('brick--new');
        b.classList.toggle('hidden', !on);
      });
      scene.querySelector('.scene__caption').textContent = `${v.obreros} obreros · ${d} días`;
    },
  };
}

function sceneMapa(vars) {
  const { cm = 3, escala = 5 } = vars;
  const km = cm * escala;
  const len = 40 + cm * 18;
  return {
    html: `<div class="scene" id="scene">
      <svg viewBox="0 0 420 220" role="img" aria-label="Mapa con escala ${escala} km por centímetro">
        <rect width="420" height="220" fill="#eef1ea"/>
        <path d="M-10 60 Q120 30 210 80 T430 70" stroke="#cfd8c7" stroke-width="26" fill="none"/>
        <path d="M-10 160 Q140 190 240 150 T430 170" stroke="#d8e0d0" stroke-width="18" fill="none"/>
        <g id="route">
          <line class="map-line" x1="90" y1="120" x2="${90 + len}" y2="120" stroke="#b4442c" stroke-width="3"/>
          <g class="map-pin" transform="translate(90,120)">
            <circle r="7" fill="#b4442c"/><circle r="3" fill="#fffdf9"/>
          </g>
          <g class="map-pin" id="pin2" transform="translate(${90 + len},120)">
            <circle r="7" fill="#3e6b5a"/><circle r="3" fill="#fffdf9"/>
          </g>
        </g>
        <text x="14" y="208" font-size="11" fill="#5c6657" font-family="DM Sans">1 cm = ${escala} km</text>
      </svg>
      <div class="scene__caption">${cm} cm en el mapa · ${km} km reales</div>
    </div>`,
    update(scene, v) {
      const l = 40 + v.cm * 18;
      const line = scene.querySelector('#route line');
      line.setAttribute('x2', String(90 + l));
      scene.querySelector('#pin2').setAttribute('transform', `translate(${90 + l},120)`);
      scene.querySelector('.scene__caption').textContent = `${v.cm} cm en el mapa · ${v.cm * v.escala} km reales`;
      scene.querySelector('text').textContent = `1 cm = ${v.escala} km`;
    },
  };
}

function sceneViaje(vars) {
  const { km = 120, v = 60 } = vars;
  const h = Math.round((km / v) * 100) / 100;
  const scale = Math.max(0.55, Math.min(1.15, 150 / km));
  const fast = v >= 90, slow = v <= 40;
  return {
    html: `<div class="scene" id="scene">
      <svg viewBox="0 0 420 210" role="img" aria-label="Coche a ${v} km/h">
        <defs>
          <linearGradient id="skyViaje" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#e8eef2"/><stop offset="1" stop-color="#f8f2e6"/>
          </linearGradient>
        </defs>
        <rect width="420" height="210" fill="url(#skyViaje)"/>
        <circle cx="330" cy="44" r="15" fill="#f2d69a" opacity=".8"/>
        <path d="M0 150 L70 96 L128 150 Z" fill="#cfd6cd"/>
        <path d="M96 150 L176 84 L262 150 Z" fill="#c3ccc4"/>
        <path d="M232 150 L300 104 L372 150 Z" fill="#d3d9d1"/>
        <rect y="150" width="420" height="12" fill="#c9c1b0"/>
        <rect y="162" width="420" height="48" fill="#b9b0a0"/>
        <g stroke="#f4efe4" stroke-width="3" stroke-dasharray="16 14" opacity=".8">
          <line x1="0" y1="188" x2="420" y2="188"/>
        </g>

        <g class="wind ${fast ? 'wind--fast' : slow ? 'wind--slow' : ''}" id="wind" stroke="#9fb0a6" stroke-width="2.4" stroke-linecap="round" opacity=".9">
          <line x1="22" y1="120" x2="74" y2="120"/>
          <line x1="6" y1="136" x2="66" y2="136"/>
          <line x1="30" y1="152" x2="78" y2="152"/>
        </g>

        <g class="car-body" id="car" style="transform:scale(${scale}); transform-origin:center bottom">
          <path d="M96 168 L104 138 Q108 127 122 127 L168 127 Q182 127 189 138 L197 168 Z" fill="#b4442c"/>
          <path d="M112 136 L122 118 Q126 112 134 112 L156 112 Q164 112 168 118 L178 136 Z" fill="#b4442c"/>
          <path d="M124 133 L131 120 L143 120 L143 133 Z" fill="#dfe9ef"/>
          <path d="M148 133 L148 120 L160 120 L167 133 Z" fill="#dfe9ef"/>
          <circle cx="113" cy="170" r="10" fill="#2b2a26"/><circle cx="113" cy="170" r="3.8" fill="#8d8a83"/>
          <circle cx="180" cy="170" r="10" fill="#2b2a26"/><circle cx="180" cy="170" r="3.8" fill="#8d8a83"/>
        </g>
        <text x="330" y="176" font-size="11" fill="#5c6b7a" font-family="DM Sans" id="speedTag">${v} km/h</text>
      </svg>
      <div class="scene__caption">${km} km a ${v} km/h · ${h} h</div>
    </div>`,
    update(scene, v2) {
      const sc = Math.max(0.55, Math.min(1.15, 150 / v2.km));
      scene.querySelector('#car').style.transform = `scale(${sc})`;
      const wind = scene.querySelector('#wind');
      wind.classList.toggle('wind--fast', v2.v >= 90);
      wind.classList.toggle('wind--slow', v2.v <= 40);
      scene.querySelector('#speedTag').textContent = `${v2.v} km/h`;
      scene.querySelector('.scene__caption').textContent = `${v2.km} km a ${v2.v} km/h · ${Math.round((v2.km / v2.v) * 100) / 100} h`;
    },
  };
}

const SCENE = { receta: sceneReceta, obra: sceneObra, mapa: sceneMapa, viaje: sceneViaje };

const SLIDERS = {
  receta: [
    { key: 'comensales', label: 'Comensales', min: 1, max: 20, step: 1, val: 4 },
    { key: 'racion', label: 'Tamaño de la ración', min: 0.5, max: 2, step: 0.5, val: 1, unit: '×' },
  ],
  obra: [
    { key: 'obreros', label: 'Obreros', min: 1, max: 12, step: 1, val: 4 },
    { key: 'muro', label: 'Tamaño del muro', min: 1, max: 3, step: 1, val: 1, unit: '×' },
  ],
  mapa: [
    { key: 'cm', label: 'Centímetros en el mapa', min: 1, max: 10, step: 1, val: 3, unit: 'cm' },
    { key: 'escala', label: 'Escala (km por cm)', min: 1, max: 10, step: 1, val: 5, unit: 'km/cm' },
  ],
  viaje: [
    { key: 'km', label: 'Distancia del viaje', min: 60, max: 300, step: 10, val: 120, unit: 'km' },
    { key: 'v', label: 'Velocidad', min: 20, max: 120, step: 10, val: 60, unit: 'km/h' },
  ],
};

/* -------------------------------- vista -------------------------------- */
export function viewRazon() {
  if (!store.user && !store.isGuest && !isPreview()) store.enterGuest();

  const el = document.createElement('div');
  const saved = store.getLab(LAB);
  let state = mergeState(saved && saved.data);
  if (store.freeRequest === LAB) { state.free = true; store.freeRequest = null; }

  const totalPoints = () =>
    Object.values(state.scenarios).reduce((a, s) => a + (s.points || 0), 0) +
    state.retar.points + state.arg.points;

  async function save() {
    if (isPreview()) return;
    state.bestScore = Math.max(state.bestScore || 0, totalPoints());
    if (state.closed) state.badge = badgeFor(state.bestScore);
    await store.saveLab(LAB, { data: state, bestScore: state.bestScore, badge: state.badge, pct: pctOf(state) });
  }

  function shell(inner) {
    const steps = ['Explorar', 'Construir', 'Retar', 'Argumentar', 'Cerrar'];
    return `
      <div class="lab-shell">
        <div class="lab-head">
          <div>
            <p class="eyebrow">Laboratorio</p>
            <h1>Razón y proporción</h1>
            <p class="lede" style="margin-top:6px">Recetas, obras, mapas y velocidad: descubre cómo cambian las cantidades.</p>
          </div>
          <div class="row" style="gap:8px">
            <button class="btn btn--ghost btn--sm ${state.free ? 'btn--accent' : ''}" id="freeBtn">
              ${icon('sparkle', 15)} ${state.free ? 'Modo libre' : 'Modo libre'}
            </button>
            <a class="btn btn--quiet btn--sm" href="#/">${icon('home', 15)} Home</a>
          </div>
        </div>
        ${isPreview() ? '<div class="free-banner" style="margin-bottom:10px">Vista previa: puedes jugar, pero no se guarda nada.</div>' : ''}
        ${state.free ? '<div class="free-banner" style="margin-bottom:10px">Modo libre: salta entre escenarios y mueve todas las variables. Los puntos valen la mitad.</div>' : ''}
        <div class="steps">
          ${steps.map((n, i) => {
            const num = i + 1;
            const on = state.phase === num;
            const done = state.phase > num || (num === 1 && state.scenario !== null);
            return `<div class="step ${on ? 'step--on' : ''} ${done && !on ? 'step--done' : ''} ${state.free ? 'step--link' : ''}" data-step="${num}">
              <span class="step__n">${done && !on ? '✓' : num}</span>${n}</div>`;
          }).join('')}
        </div>
        ${inner}
      </div>`;
  }

  function render() {
    el.innerHTML = shell('<div id="phase"></div>');
    const host = el.querySelector('#phase');
    if (state.scenario) renderScenario(host, state.scenario);
    else if (state.phase === 1 || state.phase === 2) renderHub(host);
    else if (state.phase === 3) renderRetar(host);
    else if (state.phase === 4) renderArgumentar(host);
    else renderCerrar(host);

    el.querySelector('#freeBtn').addEventListener('click', async () => {
      state.free = !state.free;
      await save(); render();
    });
    if (state.free) {
      el.querySelectorAll('[data-step]').forEach((s) =>
        s.addEventListener('click', async () => {
          state.phase = Number(s.dataset.step);
          state.scenario = null;
          await save(); render();
        })
      );
    }
  }

  /* -------------------------------- hub --------------------------------- */
  function renderHub(host) {
    const allDone = Object.values(state.scenarios).every((s) => s.solved.every(Boolean));
    host.innerHTML = `
      <div class="card card--pad">
        <h2>Cuatro escenarios</h2>
        <p class="small muted">Puedes hacerlos en el orden que quieras. Cada uno tiene su exploración y dos retos.</p>
        <div class="scenario-grid" style="margin-top:16px">
          ${SCENARIOS.map((s, i) => {
            const st = state.scenarios[s.id];
            const doneCount = st.solved.filter(Boolean).length;
            const complete = doneCount === 2;
            return `<button class="scenario ${complete ? 'scenario--done' : ''}" data-id="${s.id}">
              <span class="scenario__n">ESCENARIO ${i + 1}</span>
              <h3>${esc(s.titulo)}</h3>
              <p>${esc(s.desc)}</p>
              <div class="row" style="gap:6px;margin-top:8px">
                <span class="chip small">${complete ? '✓ Completado' : doneCount ? `${doneCount}/2 retos` : 'Sin empezar'}</span>
                ${st.points ? `<span class="chip small">${st.points} pts</span>` : ''}
              </div>
            </button>`;
          }).join('')}
        </div>
        <div class="row" style="margin-top:18px;justify-content:flex-end">
          <button class="btn btn--accent ${allDone ? '' : 'hidden'}" id="toRetar">Ir a Retar</button>
        </div>
        ${allDone ? '' : '<p class="small muted center" style="margin-top:10px">Completa los cuatro escenarios para desbloquear Retar.</p>'}
      </div>`;

    host.querySelectorAll('.scenario').forEach((b) =>
      b.addEventListener('click', () => { state.scenario = b.dataset.id; render(); })
    );
    host.querySelector('#toRetar')?.addEventListener('click', async () => {
      state.phase = 3; await save(); render();
    });
  }

  /* ------------------------------ escenario ----------------------------- */
  function renderScenario(host, id) {
    const sc = SCENARIOS.find((s) => s.id === id);
    const st = state.scenarios[id];
    const sliders = SLIDERS[id];
    const vars = st.vars || Object.fromEntries(sliders.map((s) => [s.key, s.val]));
    const idx = st.solved.findIndex((x) => !x);
    const reto = idx >= 0 ? sc.retos[idx] : null;
    const scene = SCENE[id](vars);

    host.innerHTML = `
      <div class="card card--pad">
        <div class="row row--between" style="margin-bottom:8px">
          <button class="btn btn--quiet btn--sm" id="back">${icon('chevron', 14)} Escenarios</button>
          <span class="chip">${st.explored ? 'Explorado' : 'Explorando'}</span>
        </div>
        <h2>${esc(sc.titulo)}</h2>
        <p class="small muted">${esc(sc.desc)}</p>

        <div class="grid-2" style="margin:14px 0;align-items:start">
          <div id="sceneHost">${scene.html}</div>
          <div class="card card--flat card--pad">
            ${sliders.map((s) => `
              <div style="margin-bottom:14px">
                <div class="row row--between" style="margin-bottom:4px">
                  <label class="label" for="sl-${s.key}">${esc(s.label)}</label>
                  <span class="mono small" id="v-${s.key}">${vars[s.key]}${s.unit || ''}</span>
                </div>
                <input type="range" id="sl-${s.key}" data-key="${s.key}" min="${s.min}" max="${s.max}" step="${s.step}" value="${vars[s.key]}">
              </div>`).join('')}
            <div class="readout" id="ro"></div>
          </div>
        </div>

        ${st.explored ? '' : '<button class="btn btn--ghost" id="explored">Entendido, vamos a resolver</button>'}

        <div id="retoBox" class="${st.explored ? '' : 'hidden'}" style="margin-top:18px">
          ${reto ? `
            <div class="card card--flat card--pad">
              <div class="row row--between" style="margin-bottom:10px">
                <span class="chip">Reto ${idx + 1} de 2</span>
                <span class="counter">${st.points} pts</span>
              </div>
              <p style="margin:0 0 12px">${esc(reto.q)}</p>
              <div class="answer-row">
                <input class="input" id="num" inputmode="decimal" placeholder="Tu respuesta" aria-label="Tu respuesta">
                <span class="chip" style="align-self:center">${esc(reto.unit)}</span>
                <button class="btn btn--accent" id="chk">Comprobar</button>
                <button class="btn btn--quiet" id="hint">Pista</button>
              </div>
              <div id="fb" class="feedback hidden" style="margin-top:10px"></div>
            </div>` : `
            <div class="feedback feedback--ok" style="margin-bottom:10px">Escenario completado con ${st.points} puntos.</div>
            <button class="btn btn--accent" id="back2">Volver a los escenarios</button>`}
        </div>
      </div>`;

    const sceneEl = host.querySelector('#scene');
    const ro = host.querySelector('#ro');

    function readout() {
      if (id === 'receta') {
        const f = (vars.comensales / 4) * vars.racion;
        ro.innerHTML = `
          <div class="readout__cell"><div class="readout__k">Harina</div><div class="readout__v">${Math.round(200 * f)} g</div></div>
          <div class="readout__cell"><div class="readout__k">Huevos</div><div class="readout__v">${Math.max(1, Math.round(2 * f))}</div></div>
          <div class="readout__cell"><div class="readout__k">Leche</div><div class="readout__v">${Math.round(400 * f)} ml</div></div>`;
      } else if (id === 'obra') {
        const d = Math.round(((48 * vars.muro) / vars.obreros) * 10) / 10;
        ro.innerHTML = `
          <div class="readout__cell"><div class="readout__k">Obreros</div><div class="readout__v">${vars.obreros}</div></div>
          <div class="readout__cell"><div class="readout__k">Días</div><div class="readout__v">${d}</div></div>
          <div class="readout__cell"><div class="readout__k">Obreros × días</div><div class="readout__v">${48 * vars.muro}</div></div>`;
      } else if (id === 'mapa') {
        ro.innerHTML = `
          <div class="readout__cell"><div class="readout__k">Mapa</div><div class="readout__v">${vars.cm} cm</div></div>
          <div class="readout__cell"><div class="readout__k">Real</div><div class="readout__v">${vars.cm * vars.escala} km</div></div>
          <div class="readout__cell"><div class="readout__k">Escala</div><div class="readout__v" style="font-size:14px">1 cm = ${vars.escala} km</div></div>`;
      } else {
        ro.innerHTML = `
          <div class="readout__cell"><div class="readout__k">Velocidad</div><div class="readout__v">${vars.v} km/h</div></div>
          <div class="readout__cell"><div class="readout__k">Distancia</div><div class="readout__v">${vars.km} km</div></div>
          <div class="readout__cell"><div class="readout__k">Tiempo</div><div class="readout__v">${Math.round((vars.km / vars.v) * 100) / 100} h</div></div>`;
      }
    }
    readout();
    scene.update(sceneEl, vars);

    host.querySelectorAll('input[type="range"]').forEach((sl) => {
      sl.addEventListener('input', () => {
        vars[sl.dataset.key] = Number(sl.value);
        const s = sliders.find((x) => x.key === sl.dataset.key);
        host.querySelector(`#v-${sl.dataset.key}`).textContent = `${sl.value}${s.unit || ''}`;
        scene.update(sceneEl, vars);
        readout();
        st.vars = { ...vars };
        save();
      });
    });

    host.querySelector('#back').addEventListener('click', async () => { state.scenario = null; await save(); render(); });
    host.querySelector('#back2')?.addEventListener('click', async () => { state.scenario = null; await save(); render(); });
    host.querySelector('#explored')?.addEventListener('click', async () => { st.explored = true; await save(); render(); });

    const chk = host.querySelector('#chk');
    if (!chk) return;
    const num = host.querySelector('#num');
    const fb = host.querySelector('#fb');
    num.addEventListener('keydown', (e) => { if (e.key === 'Enter') chk.click(); });
    num.focus();

    chk.addEventListener('click', async () => {
      const raw = num.value.trim().replace(',', '.');
      const val = Number(raw);
      if (!raw || Number.isNaN(val)) {
        fb.classList.remove('hidden');
        fb.className = 'feedback feedback--err';
        fb.textContent = 'Escribe un número.';
        return;
      }
      const attemptNo = (st.attempts[reto.id] || 0) + 1;
      st.attempts[reto.id] = attemptNo;
      if (Math.abs(val - reto.answer) < 1e-9) {
        const pts = state.free ? Math.round(construirPts(attemptNo, st.hints > 0) / 2) : construirPts(attemptNo, st.hints > 0);
        st.points += pts;
        st.solved[idx] = true;
        sound.ok();
        fb.classList.remove('hidden');
        fb.className = 'feedback feedback--ok';
        fb.textContent = `¡Correcto! ${reto.answer} ${reto.unit}. +${pts} pts`;
        await store.attempt({ lab: LAB, phase: 'construir', challengeId: reto.id, answer: raw, isCorrect: true, attemptNo, hintsUsed: st.hints, points: pts });
        await save();
        setTimeout(() => render(), 750);
      } else if (attemptNo >= 3) {
        st.solved[idx] = true;
        sound.bad();
        fb.classList.remove('hidden');
        fb.className = 'feedback feedback--soft';
        fb.textContent = `La respuesta es ${reto.answer} ${reto.unit}. Este reto no suma puntos.`;
        await save();
        setTimeout(() => render(), 1600);
      } else {
        sound.bad();
        fb.classList.remove('hidden');
        fb.className = 'feedback feedback--err';
        fb.textContent = sc.hints[Math.min(attemptNo - 1, sc.hints.length - 1)];
      }
    });

    host.querySelector('#hint').addEventListener('click', async () => {
      st.hints++;
      fb.classList.remove('hidden');
      fb.className = 'feedback feedback--soft';
      fb.textContent = `Pista: ${sc.hints[Math.min(st.hints - 1, sc.hints.length - 1)]}`;
      await save();
    });
  }

  /* ------------------------------- retar --------------------------------- */
  function renderRetar(host) {
    const i = state.retar.index;
    if (i >= RETAR.length) {
      host.innerHTML = `<div class="card card--pad center" style="padding:34px">
        <p class="eyebrow">Fase completada</p><h2>Terminaste los 5 retos</h2>
        <p class="lede" style="margin:8px auto 18px">Sumaste <strong>${state.retar.points} puntos</strong>.</p>
        <button class="btn btn--accent btn--lg" id="go">Ir a Argumentar</button></div>`;
      host.querySelector('#go').addEventListener('click', async () => { state.phase = 4; await save(); render(); });
      return;
    }
    const ch = RETAR[i];
    host.innerHTML = `
      <div class="card card--pad quiz-card">
        <div class="quiz-top">
          <span class="chip">Reto ${i + 1} de ${RETAR.length}</span>
          <span class="counter">${state.retar.points} pts</span>
        </div>
        <div class="progress"><div class="progress__fill" style="--v:${(i / RETAR.length) * 100}%"></div></div>
        <p style="font-size:16.5px;margin:6px 0 14px">${esc(ch.q)}</p>
        <div class="options" id="opts">
          ${ch.opts.map((o, k) => `<button class="option" data-k="${k}"><span class="option__key">${'ABCD'[k]}</span><span>${esc(o)}</span></button>`).join('')}
        </div>
        <div id="fb" class="feedback hidden"></div>
        <div class="row" style="justify-content:flex-end;margin-top:6px">
          <button class="btn btn--quiet btn--sm" id="hint">Pista</button>
        </div>
      </div>`;

    const fb = host.querySelector('#fb');
    let answered = false;
    host.querySelector('#hint').addEventListener('click', async () => {
      state.retar.hintsUsed[ch.id] = true;
      fb.classList.remove('hidden');
      fb.className = 'feedback feedback--soft';
      fb.textContent = `Pista: ${ch.hint}`;
      await save();
    });

    host.querySelectorAll('.option').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (answered) return;
        const k = Number(btn.dataset.k);
        const attemptNo = (state.retar.attempts[ch.id] || 0) + 1;
        state.retar.attempts[ch.id] = attemptNo;
        if (k === ch.ok) {
          answered = true;
          btn.classList.add('option--ok');
          const usedHint = !!state.retar.hintsUsed[ch.id];
          let pts = attemptNo === 1 ? (usedHint ? 5 : 10) : attemptNo === 2 ? 5 : 0;
          if (state.free) pts = Math.round(pts / 2);
          state.retar.points += pts;
          sound.ok();
          fb.classList.remove('hidden');
          fb.className = 'feedback feedback--ok';
          fb.textContent = pts ? `¡Correcto! +${pts} pts` : 'Correcto, pero sin puntos en este intento.';
          await save();
          setTimeout(async () => { state.retar.index = i + 1; await save(); render(); }, 700);
        } else if (attemptNo >= 3) {
          answered = true;
          btn.classList.add('option--bad');
          host.querySelectorAll('.option')[ch.ok].classList.add('option--ok');
          fb.classList.remove('hidden');
          fb.className = 'feedback feedback--soft';
          fb.textContent = `La respuesta correcta es "${ch.opts[ch.ok]}".`;
          sound.bad();
          await save();
          setTimeout(async () => { state.retar.index = i + 1; await save(); render(); }, 1500);
        } else {
          btn.classList.add('option--bad');
          fb.classList.remove('hidden');
          fb.className = 'feedback feedback--err';
          fb.textContent = `No es. Quedan ${3 - attemptNo} intentos.`;
          sound.bad();
        }
      });
    });
  }

  /* ----------------------------- argumentar ----------------------------- */
  function renderArgumentar(host) {
    const st = state.arg;
    host.innerHTML = `
      <div class="card card--pad">
        <h2>Argumenta</h2>
        <p class="small muted">Dos preguntas cortas para cerrar.</p>

        <div class="card card--flat card--pad" style="margin-top:14px">
          <p style="font-weight:500;margin-bottom:10px">1. ${esc(ARG[0].q)}</p>
          <div class="options" id="opts">
            ${ARG[0].opts.map((o, k) => `<button class="option" data-k="${k}"><span class="option__key">${'ABCD'[k]}</span><span>${esc(o)}</span></button>`).join('')}
          </div>
          <div id="fb1" class="feedback hidden" style="margin-top:10px"></div>
        </div>

        <div class="card card--flat card--pad" style="margin-top:12px">
          <p style="font-weight:500;margin-bottom:10px">2. ${esc(ARG[1].q)}</p>
          <textarea class="textarea" id="t" maxlength="400" placeholder="Por ejemplo, cuando ajusto una receta…">${esc(st.texto || '')}</textarea>
          <div class="row row--between" style="margin-top:8px">
            <span class="tiny muted"><span id="c">${(st.texto || '').length}</span>/400</span>
            <button class="btn btn--ghost btn--sm" id="send">Enviar</button>
          </div>
          <div id="fb2" class="feedback hidden" style="margin-top:10px"></div>
        </div>

        <div class="row" style="margin-top:16px;justify-content:flex-end">
          <button class="btn btn--accent ${st.done ? '' : 'hidden'}" id="go">Ir al cierre</button>
        </div>
      </div>`;

    const fb1 = host.querySelector('#fb1');
    host.querySelectorAll('#opts .option').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (Number(btn.dataset.k) === ARG[0].ok) {
          btn.classList.add('option--ok');
          fb1.classList.remove('hidden');
          fb1.className = 'feedback feedback--ok';
          fb1.textContent = ARG[0].okMsg;
          if (st.q1 === null) st.points += 5;
          st.q1 = Number(btn.dataset.k);
          sound.ok();
          await save(); check();
        } else {
          btn.classList.add('option--bad');
          fb1.classList.remove('hidden');
          fb1.className = 'feedback feedback--err';
          fb1.textContent = 'No exactamente. Piensa en qué pasa con la otra cantidad.';
        }
      });
    });

    const ta = host.querySelector('#t');
    ta.addEventListener('input', () => { host.querySelector('#c').textContent = ta.value.length; });
    host.querySelector('#send').addEventListener('click', async () => {
      const txt = ta.value.trim();
      const fb2 = host.querySelector('#fb2');
      if (txt.length < ARG[1].min) {
        fb2.classList.remove('hidden');
        fb2.className = 'feedback feedback--err';
        fb2.textContent = `Escribe al menos ${ARG[1].min} caracteres.`;
        return;
      }
      const hits = ARG[1].keywords.filter((k) => txt.toLowerCase().includes(k)).length;
      fb2.classList.remove('hidden');
      if (hits >= 1) {
        fb2.className = 'feedback feedback--ok';
        fb2.textContent = ARG[1].okMsg;
        if (!st.texto) st.points += 5;
        st.texto = txt;
        sound.ok();
      } else {
        fb2.className = 'feedback feedback--soft';
        fb2.textContent = ARG[1].softMsg;
        st.texto = txt;
      }
      await save(); check();
    });

    function check() {
      if (st.q1 !== null && st.texto) {
        st.done = true;
        host.querySelector('#go').classList.remove('hidden');
      }
    }
    check();

    host.querySelector('#go').addEventListener('click', async () => { state.phase = 5; await save(); render(); });
  }

  /* ------------------------------- cierre -------------------------------- */
  function renderCerrar(host) {
    const tot = totalPoints();
    const best = Math.max(state.bestScore || 0, tot);
    const badge = badgeFor(best);
    host.innerHTML = `
      <div class="card card--pad" style="padding:clamp(24px,4.4vw,40px)">
        <p class="eyebrow">Cierre</p>
        <h2>Laboratorio completado: Razón y proporción</h2>
        <div class="row" style="gap:22px;align-items:center;margin:18px 0;flex-wrap:wrap">
          <div class="medal-wrap seal-in">${medalSVG(badge, 92)}</div>
          <div>
            <div class="readout__k">Puntaje total</div>
            <div class="readout__v" style="font-size:30px">${best}</div>
            <div class="small muted">Insignia: <strong style="text-transform:capitalize">${badge}</strong></div>
          </div>
        </div>
        <div class="grid-3" style="margin-bottom:20px">
          ${[['target', 'Reconoces la proporcionalidad directa'], ['grid', 'Reconoces la proporcionalidad inversa'], ['sparkle', 'Aplicas proporciones en situaciones reales']]
            .map(([ic, t]) => `<div class="card card--flat card--pad" style="display:flex;gap:10px;align-items:center">
              <span class="chip">${icon(ic, 16)}</span><span class="small">${t}</span></div>`).join('')}
        </div>
        <div class="row" style="gap:10px">
          <a class="btn btn--accent" href="#/">Volver al Home</a>
          <button class="btn btn--ghost" id="again">Repetir laboratorio</button>
          <a class="btn btn--ghost" href="#/logros">Ver mis logros</a>
        </div>
      </div>`;

    host.querySelector('#again').addEventListener('click', async () => {
      const yes = await confirmDialog({ title: 'Repetir laboratorio', body: 'Empiezas de cero. Tu mejor puntaje se conserva.', confirmLabel: 'Sí, repetir' });
      if (!yes) return;
      const b = state.bestScore, bd = state.badge, free = state.free;
      state = defaults();
      state.bestScore = b; state.badge = bd; state.free = free;
      await save(); render();
    });

    if (!state.closed) {
      (async () => {
        state.closed = true;
        state.badge = badge;
        await save();
        if (!isPreview() && !state.free) {
          const isNew = await store.awardBadge(badge, LAB);
          if (isNew) showBadgeSeal(badge);
          const list = store.isGuest ? store._guestBadges : store.badges;
          if (list.some((b) => b.key === 'god' && b.lab === 'factorizacion') && list.some((b) => b.key === 'god' && b.lab === 'razon')) {
            const g = await store.awardBadge('god_laboratorio', null);
            if (g) showBadgeSeal('god_laboratorio');
          }
        }
        sound.win();
        render();
      })();
    }
  }

  render();
  return el;
}
