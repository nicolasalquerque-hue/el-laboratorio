/* labs/factorizacion.js — Laboratorio de Factorización v1.1
   8 retos de construcción, 20 de retar, 6 de argumentar, modo libre y catálogo de bloques. */
import { store } from '../store.js';
import { esc, icon, tex, toast, sound, confirmDialog } from '../ui.js';
import { TileBoard, areaExpr, CATALOG, X_CHOICES } from './tiles.js';
import { toPoly, classifyAnswer } from './math.js';
import { showBadgeSeal, medalSVG } from '../badges.js';

const LAB = 'factorizacion';
const MAX_PTS = 235; // 20 retos ×10 + bonus 5 + 6 argumentos ×5

/* ------------------------------- contenido ------------------------------- */

const CONSTRUIR = [
  { x: 3.5, tex: '2x+4', target: { a: 0, b: 2, c: 4 }, factor: '2(x+2)',
    hints: ['Necesitas un rectángulo de alto 2 y ancho x, y un cuadrado que complete el ancho.',
            'Prueba con la ficha 2x y el cuadrado de 2×2: juntos forman 2(x + 2).'] },
  { x: 2.5, tex: '3x+9', target: { a: 0, b: 3, c: 9 }, factor: '3(x+3)',
    hints: ['Busca un rectángulo de alto 3.', 'La ficha 3x más el cuadrado de 3×3 dan 3(x + 3).'] },
  { x: 3.5, tex: 'x^2+2x+1', target: { a: 1, b: 2, c: 1 }, factor: '(x+1)(x+1)',
    hints: ['Un cuadrado perfecto se arma con un x², dos x y un 1.', 'El lado mide x + 1, así que el resultado es (x + 1)².'] },
  { x: 4.5, tex: 'x^2+4x+4', target: { a: 1, b: 4, c: 4 }, factor: '(x+2)(x+2)',
    hints: ['Coloca el x² arriba a la izquierda y rodea con las x.', 'Las esquinas se completan con el cuadrado de 2×2.'] },
  { x: 3.5, tex: 'x^2+5x+6', target: { a: 1, b: 5, c: 6 }, factor: '(x+2)(x+3)',
    hints: ['Los lados son x + 2 y x + 3.', 'Usa las fichas 2x y 3x para las franjas, y cuadrados para el resto.'] },
  { x: 2.5, tex: 'x^2+6x+9', target: { a: 1, b: 6, c: 9 }, factor: '(x+3)(x+3)',
    hints: ['El resultado es un cuadrado: los dos lados miden lo mismo.', 'Fíjate en el cuadrado de 3×3 para la esquina.'] },
  { x: 3.5, tex: '2x^2+6x', target: { a: 2, b: 6, c: 0 }, factor: '2x(x+3)',
    hints: ['Dos cuadrados x² y seis rectángulos x.', 'Agrúpalos en 2x de alto por (x + 3) de ancho.'] },
  { x: 4.5, tex: '4x^2+6x', target: { a: 4, b: 6, c: 0 }, factor: '(2x)(2x+3)',
    hints: ['Cuatro x² y seis x: el alto es 2x.', 'El ancho queda 2x + 3.'] },
];

const RETAR = [
  { id: '1', tex: '5x^{2}+10x', answer: '5x(x+2)', poly: [0, 10, 5], lvl: 1,
    hints: ['Saca lo que se repite en los dos términos.', 'El factor común es 5x: queda x + 2.'] },
  { id: '2', tex: '3x^{2}-6x', answer: '3x(x-2)', poly: [0, -6, 3], lvl: 1,
    hints: ['¿Qué número divide a 3 y a 6?', 'Queda 3x por (x − 2).'] },
  { id: '3', tex: '12x^{3}-8x^{2}', answer: '4x^2(3x-2)', poly: [0, 0, -8, 12], lvl: 1,
    hints: ['El mayor divisor de 12 y 8, y la menor potencia de x.', 'Factor común 4x²: queda 3x − 2.'] },
  { id: '4', tex: '2x^{2}+8x', answer: '2x(x+4)', poly: [0, 8, 2], lvl: 1,
    hints: ['Ambos términos son pares y tienen x.', 'El factor común es 2x.'] },
  { id: '5', tex: '9x^{2}-15x', answer: '3x(3x-5)', poly: [0, -15, 9], lvl: 1,
    hints: ['El 3 divide a 9 y a 15.', 'El factor común es 3x: queda 3x − 5.'] },

  { id: '6', tex: 'x^{2}+8x+16', answer: '(x+4)^2', poly: [16, 8, 1], lvl: 2,
    hints: ['¿El primero y el último son cuadrados?', 'El cuadrado de (x + 4) es x² + 8x + 16.'] },
  { id: '7', tex: 'x^{2}-10x+25', answer: '(x-5)^2', poly: [25, -10, 1], lvl: 2,
    hints: ['El término del medio es negativo.', 'Es el cuadrado de (x − 5).'] },
  { id: '8', tex: '9x^{2}+12x+4', answer: '(3x+2)^2', poly: [4, 12, 9], lvl: 2,
    hints: ['9x² es (3x)² y 4 es 2².', 'Dos veces 3x por 2 es 12x: es (3x + 2)².'] },
  { id: '9', tex: 'x^{2}+9x+20', answer: '(x+4)(x+5)', poly: [20, 9, 1], b: 9, c: 20, lvl: 2,
    hints: ['Dos números que sumen 9 y multipliquen 20.', 'Empieza por el producto: parejas de 20.'] },
  { id: '10', tex: 'x^{2}-3x-10', answer: '(x-5)(x+2)', poly: [-10, -3, 1], b: -3, c: -10, lvl: 2,
    hints: ['El producto es negativo: signos distintos.', 'Busca dos números que resten 3 y multipliquen −10.'] },
  { id: '11', tex: 'x^{2}-7x+12', answer: '(x-3)(x-4)', poly: [12, -7, 1], b: -7, c: 12, lvl: 2,
    hints: ['Producto positivo y suma negativa: los dos negativos.', 'Dos números que sumen −7 y multipliquen 12.'] },
  { id: '12', tex: 'x^{2}+2x-15', answer: '(x+5)(x-3)', poly: [-15, 2, 1], b: 2, c: -15, lvl: 2,
    hints: ['Producto negativo, suma positiva.', 'Los números son 5 y −3.'] },
  { id: '13', tex: 'x^{2}-x-6', answer: '(x-3)(x+2)', poly: [-6, -1, 1], b: -1, c: -6, lvl: 2,
    hints: ['Dos números que resten 1 y multipliquen −6.', 'Son −3 y 2.'] },
  { id: '14', tex: '2x^{2}+10x+12', answer: '2(x+2)(x+3)', poly: [12, 10, 2], lvl: 2,
    hints: ['Antes del trinomio, revisa si hay factor común.', 'El 2 sale: queda x² + 5x + 6.'] },
  { id: '15', tex: '3x^{2}+6x+3', answer: '3(x+1)^2', poly: [3, 6, 3], lvl: 2,
    hints: ['Los tres términos son múltiplos de 3.', 'Al sacar 3 queda x² + 2x + 1 = (x + 1)².'] },

  { id: '16', tex: '4x^{2}-9', answer: '(2x-3)(2x+3)', poly: [-9, 0, 4], lvl: 3,
    hints: ['Es una diferencia de cuadrados: a² − b².', 'Aquí a = 2x y b = 3.'] },
  { id: '17', tex: 'x^{2}-16', answer: '(x-4)(x+4)', poly: [-16, 0, 1], lvl: 3,
    hints: ['No hay término del medio: piensa en diferencia de cuadrados.', 'x² − 16 = (x − 4)(x + 4).'] },
  { id: '18', tex: '12x^{2}-27', answer: '3(2x-3)(2x+3)', poly: [-27, 0, 12], lvl: 3,
    hints: ['Saca primero el factor común numérico.', 'Queda 3(4x² − 9), y eso es diferencia de cuadrados.'] },
  { id: '19', tex: '5x^{3}-20x', answer: '5x(x-2)(x+2)', poly: [0, -20, 0, 5], lvl: 3,
    hints: ['Factor común 5x, y después mira lo que queda.', 'Dentro queda x² − 4.'] },
  { id: '20', tex: '2x^{2}-8', answer: '2(x-2)(x+2)', poly: [-8, 0, 2], lvl: 3,
    hints: ['Saca el 2 y observa el binomio.', 'x² − 4 es diferencia de cuadrados.'] },
];

const ARG = [
  {
    id: 'q1', type: 'mcq',
    q: '¿Por qué (x + 2)(x + 3) es igual a x² + 5x + 6?',
    options: [
      { k: 'A', t: 'Porque 2 + 3 = 5 y 2 × 3 = 6.', ok: true },
      { k: 'B', t: 'Porque x + 2 + x + 3 = 2x + 5.', ok: false },
      { k: 'C', t: 'Porque (x + 2) + (x + 3) = x² + 5x + 6.', ok: false },
      { k: 'D', t: 'Porque los paréntesis se pueden quitar y ya.', ok: false },
    ],
    okMsg: '¡Exacto! Los números que suman 5 y multiplican 6 son 2 y 3.',
    badMsg: 'Casi. Al multiplicar (x + 2)(x + 3), el término del medio sale de 3x + 2x = 5x.',
  },
  {
    id: 'q2', type: 'visual',
    q: '¿Cuál de estos rectángulos representa (x + 3)²?',
    dims: [[6, 6], [5, 7], [7, 5]], correct: 0,
    okMsg: '¡Bien! Un trinomio cuadrado perfecto siempre forma un cuadrado.',
    badMsg: 'Mira otra vez: ¿cuál tiene los cuatro lados iguales y está formado por x² + 3x + 3x + 9?',
  },
  {
    id: 'q3', type: 'open',
    q: 'Explica con tus palabras por qué x² + 5x + 6 se puede escribir como (x + 2)(x + 3).',
    min: 20,
    keywords: ['suma', 'producto', 'multiplic', 'área', 'area', 'rectángulo', 'rectangulo', '2 y 3', '5', '6'],
    okMsg: 'Buena explicación. Lo importante es ver que el 5 sale de sumar y el 6 de multiplicar.',
    softMsg: 'Va por buen camino. Intenta relacionar los números 5 y 6 con los de dentro de los paréntesis.',
  },
  {
    id: 'q4', type: 'mcq',
    q: 'En x² + bx + c, ¿qué representan b y c?',
    options: [
      { k: 'A', t: 'b es la suma de los dos números y c su producto.', ok: true },
      { k: 'B', t: 'b es el producto y c la suma.', ok: false },
      { k: 'C', t: 'b y c son las raíces de la expresión.', ok: false },
      { k: 'D', t: 'No significan nada, solo son coeficientes.', ok: false },
    ],
    okMsg: 'Correcto: suma y producto son las dos pistas que buscas.',
    badMsg: 'Revisa: si los números son p y q, el término del medio es (p + q)x.',
  },
  {
    id: 'q5', type: 'visual',
    q: '¿Cuál rectángulo representa (x + 2)(x + 4)?',
    dims: [[6, 8], [5, 7], [7, 5]], correct: 0,
    okMsg: 'Sí: un lado mide x + 2 y el otro x + 4.',
    badMsg: 'Fíjate en los lados: deben ser x + 2 y x + 4, no dos medidas cualesquiera.',
  },
  {
    id: 'q6', type: 'open',
    q: 'Inventa una factorización propia y explica cómo comprobarías que es correcta.',
    min: 25,
    keywords: ['multiplic', 'distribut', 'comprobar', 'expandi', 'suma', 'producto', 'x', 'paréntesis', 'parentesis'],
    okMsg: 'Muy bien: comprobar multiplicando de nuevo es exactamente el camino.',
    softMsg: 'Intenta mencionar qué operación harías para comprobar el resultado.',
  },
];

function badgeFor(score, free) {
  const pct = score / MAX_PTS;
  if (pct >= 0.9 && !free) return 'god';
  if (pct >= 0.7) return 'constructor';
  if (pct >= 0.4) return 'explorador';
  return 'iniciante';
}

function defaults() {
  return {
    version: 3, phase: 1, free: false,
    completed: [false, false, false, false, false],
    construir: { index: 0, solved: Array(CONSTRUIR.length).fill(false), hints: {} },
    retar: { index: 0, points: 0, streak: 0, bonusGiven: false, hints: {}, attempts: {}, answers: {}, help: {} },
    arg: { answers: {}, done: {}, points: 0 },
    closed: false, bestScore: 0, badge: null,
  };
}

function mergeState(raw) {
  const d = defaults();
  if (!raw || typeof raw !== 'object') return d;
  const c = { ...d.construir, ...(raw.construir || {}) };
  c.solved = CONSTRUIR.map((_, i) => !!(c.solved || [])[i]);
  return {
    ...d, ...raw,
    construir: c,
    retar: { ...d.retar, ...(raw.retar || {}) },
    arg: { ...d.arg, ...(raw.arg || {}) },
    completed: Array.isArray(raw.completed) && raw.completed.length === 5 ? raw.completed : d.completed,
  };
}

function pointsFor(attempts, hints, free) {
  let p = 0;
  if (attempts === 1) p = hints === 0 ? 10 : hints === 1 ? 7 : 5;
  else if (attempts === 2) p = hints === 0 ? 7 : 4;
  else if (attempts === 3) p = 2;
  return free ? Math.round(p / 2) : p;
}

function pctOf(s) {
  let p = 0;
  if (s.completed[0]) p += 10;
  p += (s.construir.solved.filter(Boolean).length / CONSTRUIR.length) * 30;
  p += (s.retar.index / RETAR.length) * 35;
  p += (Object.keys(s.arg.done).length / ARG.length) * 20;
  if (s.closed) p += 5;
  return Math.round(Math.min(100, p));
}

const isPreview = () => !!store.preview;

/* -------------------------------- vista -------------------------------- */
export function viewFactorizacion() {
  if (!store.user && !store.isGuest && !isPreview()) store.enterGuest();

  const el = document.createElement('div');
  const saved = store.getLab(LAB);
  let state = mergeState(saved && saved.data);
  if (store.freeRequest === LAB) { state.free = true; store.freeRequest = null; }

  const total = () => state.retar.points + state.arg.points;

  async function save() {
    if (isPreview()) return;
    state.bestScore = Math.max(state.bestScore || 0, total());
    if (state.closed) state.badge = badgeFor(state.bestScore, state.free);
    await store.saveLab(LAB, { data: state, bestScore: state.bestScore, badge: state.badge, pct: pctOf(state) });
  }

  function shell(inner) {
    const steps = ['Explorar', 'Construir', 'Retar', 'Argumentar', 'Cerrar'];
    return `
      <div class="lab-shell">
        <div class="lab-head">
          <div>
            <p class="eyebrow">Laboratorio</p>
            <h1>Factorización</h1>
            <p class="lede" style="margin-top:6px">Construye áreas, factoriza expresiones y descubre por qué funciona.</p>
          </div>
          <div class="row" style="gap:8px">
            <button class="btn btn--ghost btn--sm ${state.free ? 'btn--accent' : ''}" id="freeBtn">
              ${icon('sparkle', 15)} ${state.free ? 'Modo libre activo' : 'Modo libre'}
            </button>
            <a class="btn btn--quiet btn--sm" href="#/">${icon('home', 15)} Home</a>
          </div>
        </div>
        ${isPreview() ? '<div class="free-banner" style="margin-bottom:10px">Vista previa: puedes jugar, pero no se guarda nada ni cuenta para el ranking.</div>' : ''}
        ${state.free ? '<div class="free-banner" style="margin-bottom:10px">Modo libre: salta a cualquier fase y genera ejercicios al azar. Los puntos valen la mitad y no se otorga la insignia God.</div>' : ''}
        <div class="steps">
          ${steps.map((name, i) => {
            const n = i + 1;
            const done = state.completed[i];
            const on = state.phase === n;
            return `<div class="step ${on ? 'step--on' : ''} ${done && !on ? 'step--done' : ''} ${state.free ? 'step--link' : ''}" data-step="${n}">
              <span class="step__n">${done && !on ? '✓' : n}</span>${name}</div>`;
          }).join('')}
        </div>
        ${inner}
      </div>`;
  }

  function render() {
    el.innerHTML = shell('<div id="phase"></div>');
    const host = el.querySelector('#phase');
    if (state.phase === 1) phaseExplorar(host);
    else if (state.phase === 2) phaseConstruir(host);
    else if (state.phase === 3) phaseRetar(host);
    else if (state.phase === 4) phaseArgumentar(host);
    else phaseCerrar(host);

    el.querySelector('#freeBtn').addEventListener('click', async () => {
      state.free = !state.free;
      if (state.free) toast('Modo libre: puntos a la mitad, sin insignia God');
      await save();
      render();
    });
    if (state.free) {
      el.querySelectorAll('[data-step]').forEach((s) =>
        s.addEventListener('click', async () => {
          state.phase = Number(s.dataset.step);
          await save();
          render();
        })
      );
    }
  }

  function bankHTML() {
    return `<div class="bank bank--wide">
      <div class="bank__title">Fichas</div>
      <div class="catalog">
        ${CATALOG.map((g) => `
          <div class="catalog__group">
            <div class="catalog__title">${esc(g.group)}</div>
            <div class="catalog__row">
              ${g.kinds.map((k) => `<button class="chip-tile" data-kind="${k}">${tileIcon(k)}${tileLabel(k)}</button>`).join('')}
            </div>
          </div>`).join('')}
      </div>
    </div>`;
  }

  function tileIcon(kind) {
    const c = { x2: '#2f5d8a', x: '#3e6b5a', x2h: '#3e6b5a', x3h: '#3e6b5a', one: '#d8a84e', sq2: '#d8a84e', sq3: '#d8a84e', sq4: '#d8a84e' }[kind];
    const dims = { x2: [14, 14], x: [14, 5], x2h: [14, 10], x3h: [14, 14], one: [6, 6], sq2: [9, 9], sq3: [12, 12], sq4: [14, 14] }[kind];
    return `<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><rect x="1" y="${1 + (14 - dims[1]) / 2}" width="${dims[0]}" height="${dims[1]}" rx="2" fill="${c}"/></svg>`;
  }
  const tileLabel = (kind) => ({ x2: 'x²', x: 'x', x2h: '2x', x3h: '3x', one: '1', sq2: '4', sq3: '9', sq4: '16' }[kind] || kind);

  function wireBank(host, board) {
    host.querySelectorAll('.chip-tile').forEach((b) =>
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        board.spawnFromBank(b.dataset.kind, e);
      })
    );
  }

  /* ------------------------------- fase 1 -------------------------------- */
  function phaseExplorar(host) {
    host.innerHTML = `
      <div class="card card--pad">
        <div class="row row--between" style="margin-bottom:12px;gap:10px">
          <div>
            <h2>Explora sin miedo</h2>
            <p class="small muted" style="margin:0">Arrastra fichas. Si forman un rectángulo perfecto, verás sus lados.</p>
          </div>
          <div class="counter" id="areaRead">Área: 0</div>
        </div>
        <div class="board-wrap">
          ${bankHTML()}
          <div id="boardHost"></div>
        </div>
        <div class="row" style="margin-top:12px;justify-content:space-between;gap:8px">
          <div class="row" style="gap:8px">
            <button class="btn btn--ghost btn--sm" id="clearBtn">Limpiar</button>
            <button class="btn btn--ghost btn--sm" id="rotBtn">${icon('rotate', 14)} Girar</button>
            <button class="btn btn--ghost btn--sm" id="delBtn">${icon('trash', 14)} Eliminar</button>
          </div>
          <span class="small muted">Cada ficha tiene una × para borrarla. x mide 3.5 unidades: las áreas no cuadran por casualidad.</span>
        </div>
        <div id="hintMsg" class="feedback feedback--soft hidden" style="margin-top:12px"></div>
        <div class="row" style="margin-top:14px;justify-content:flex-end">
          <button class="btn btn--accent" id="doneBtn">Listo, entendí</button>
        </div>
      </div>`;

    const hostBoard = host.querySelector('#boardHost');
    const read = host.querySelector('#areaRead');
    const msg = host.querySelector('#hintMsg');
    let hint = document.createElement('div');
    hint.className = 'board-hint';
    hint.innerHTML = '<span>Arrastra una ficha del catálogo</span>';
    hostBoard.appendChild(hint);

    const board = new TileBoard(hostBoard, {
      x: X_CHOICES[1], unitsWide: 13, unitsTall: 8,
      onChange: ({ counts, rect }) => {
        if (counts.a + counts.b + counts.c > 0 && hint) { hint.remove(); hint = null; }
        read.textContent = `Área: ${areaExpr(counts)}`;
        if (rect && rect.filled && Math.max(rect.w, rect.h) > 1) {
          msg.classList.remove('hidden');
          msg.className = 'feedback feedback--ok';
          const L = board.labels();
          msg.innerHTML = `¡Rectángulo perfecto! Sus lados son (${esc(L.w)}) y (${esc(L.h)}). Área: ${esc(areaExpr(counts))}.`;
          sound.ok();
        } else if (rect && !rect.filled && counts.a + counts.b + counts.c > 2) {
          msg.classList.remove('hidden');
          msg.className = 'feedback feedback--soft';
          msg.innerHTML = 'Todavía no encaja: sobra o falta un pedazo. Mueve las fichas hasta que los bordes queden continuos.';
        } else msg.classList.add('hidden');
      },
    });

    if (new URLSearchParams(location.search).has('e2e')) window.__labBoard = board;
    wireBank(host, board);
    host.querySelector('#clearBtn').addEventListener('click', () => board.clear());
    host.querySelector('#rotBtn').addEventListener('click', () => { const t = board.last(); if (t) board.rotate(t); });
    host.querySelector('#delBtn').addEventListener('click', () => board.removeSelected());
    host.querySelector('#doneBtn').addEventListener('click', async () => {
      state.completed[0] = true;
      state.phase = 2;
      board.destroy();
      await save();
      render();
      toast('Fase desbloqueada: Construir');
    });
  }

  /* ------------------------------- fase 2 -------------------------------- */
  function phaseConstruir(host) {
    const idx = state.construir.index;
    const ch = CONSTRUIR[idx];
    const goal = ch.target.a * ch.x * ch.x + ch.target.b * ch.x + ch.target.c;
    const solved = state.construir.solved;

    host.innerHTML = `
      <div class="card card--pad">
        <div class="row row--between" style="gap:10px;margin-bottom:8px">
          <span class="chip">Reto ${idx + 1} de ${CONSTRUIR.length}</span>
          <span class="counter" id="areaRead">Área: 0 / ${goal.toFixed(2)}</span>
        </div>
        <div class="expr">${tex(ch.tex, { display: true })}</div>
        <p class="small muted center" style="margin:0 0 10px">Forma un rectángulo perfecto cuya área sea exactamente esa expresión.</p>
        <div class="board-wrap">
          ${bankHTML()}
          <div id="boardHost"></div>
        </div>
        <div class="row" style="margin-top:12px;justify-content:space-between;gap:8px">
          <div class="row" style="gap:8px">
            <button class="btn btn--ghost btn--sm" id="clearBtn">Limpiar</button>
            <button class="btn btn--ghost btn--sm" id="rotBtn">${icon('rotate', 14)} Girar</button>
            <button class="btn btn--quiet btn--sm" id="hintBtn">Pista (${state.construir.hints[idx] || 0}/2)</button>
          </div>
          <div class="row" style="gap:8px">
            ${idx > 0 ? '<button class="btn btn--ghost btn--sm" id="backBtn">Anterior</button>' : ''}
            ${state.free ? '<button class="btn btn--ghost btn--sm" id="randBtn">Otro al azar</button>' : ''}
          </div>
        </div>
        <div id="fb" class="feedback hidden" style="margin-top:12px"></div>
        <div id="hintBox" class="feedback feedback--soft hidden" style="margin-top:10px"></div>
        <div class="row" style="margin-top:14px;justify-content:flex-end">
          <button class="btn btn--accent ${solved[idx] ? '' : 'hidden'}" id="nextBtn">
            ${idx === CONSTRUIR.length - 1 ? 'Ir a Retar' : 'Siguiente reto'}
          </button>
        </div>
      </div>`;

    const hostBoard = host.querySelector('#boardHost');
    const read = host.querySelector('#areaRead');
    const fb = host.querySelector('#fb');
    const nextBtn = host.querySelector('#nextBtn');
    let done = solved[idx];

    let hint = document.createElement('div');
    hint.className = 'board-hint';
    hint.innerHTML = '<span>Arma el rectángulo con las fichas</span>';
    hostBoard.appendChild(hint);

    const board = new TileBoard(hostBoard, {
      x: ch.x, unitsWide: 13, unitsTall: 8,
      onChange: ({ counts, rect }) => {
        if (counts.a + counts.b + counts.c > 0 && hint) { hint.remove(); hint = null; }
        const used = counts.a * ch.x * ch.x + counts.b * ch.x + counts.c;
        read.textContent = `Área: ${used.toFixed(2)} / ${goal.toFixed(2)}`;
        const okArea = counts.a === ch.target.a && counts.b === ch.target.b && counts.c === ch.target.c;
        if (done || !rect) return;
        if (rect.filled && okArea) {
          done = true;
          solved[idx] = true;
          const L = board.labels();
          const w = L.w, h = L.h;
          fb.classList.remove('hidden');
          fb.className = 'feedback feedback--ok';
          fb.innerHTML = `¡Exacto! ${esc(areaExpr(counts))} = (${esc(w)})(${esc(h)}).`;
          nextBtn.classList.remove('hidden');
          sound.ok();
          save();
        } else if (rect.filled && !okArea) {
          fb.classList.remove('hidden');
          fb.className = 'feedback feedback--soft';
          fb.innerHTML = 'Rectángulo perfecto, pero el área no coincide con la expresión. Revisa cuántas fichas usaste.';
        } else if (okArea) {
          fb.classList.remove('hidden');
          fb.className = 'feedback feedback--soft';
          fb.innerHTML = 'Casi. El área coincide, pero aún hay huecos. Sigue moviendo fichas.';
        } else fb.classList.add('hidden');
      },
    });

    if (new URLSearchParams(location.search).has('e2e')) window.__labBoard = board;
    wireBank(host, board);
    host.querySelector('#clearBtn').addEventListener('click', () => { board.clear(); done = false; solved[idx] = false; nextBtn.classList.add('hidden'); fb.classList.add('hidden'); });
    host.querySelector('#rotBtn').addEventListener('click', () => { const t = board.last(); if (t) board.rotate(t); });
    host.querySelector('#hintBtn').addEventListener('click', async () => {
      const used = state.construir.hints[idx] || 0;
      if (used >= 2) return toast('Ya usaste las dos pistas de este reto.');
      state.construir.hints[idx] = used + 1;
      const box = host.querySelector('#hintBox');
      box.classList.remove('hidden');
      box.innerHTML = `<strong>Pista ${used + 1}:</strong> ${esc(ch.hints[used])}`;
      host.querySelector('#hintBtn').textContent = `Pista (${used + 1}/2)`;
      await save();
    });
    host.querySelector('#backBtn')?.addEventListener('click', async () => {
      state.construir.index = Math.max(0, idx - 1); board.destroy(); await save(); render();
    });
    host.querySelector('#randBtn')?.addEventListener('click', async () => {
      state.construir.index = Math.floor(Math.random() * CONSTRUIR.length); board.destroy(); await save(); render();
    });
    nextBtn.addEventListener('click', async () => {
      if (idx === CONSTRUIR.length - 1) {
        state.completed[1] = true; state.phase = 3; board.destroy(); await save(); render();
        toast('¡Ocho rectángulos! Ahora a retar.');
      } else {
        state.construir.index = idx + 1; board.destroy(); await save(); render();
      }
    });
  }

  /* ------------------------------- fase 3 -------------------------------- */
  function phaseRetar(host) {
    const idx = state.retar.index;
    if (idx >= RETAR.length) return finishRetar(host);
    const ch = RETAR[idx];
    const hintsUsed = state.retar.hints[ch.id] || 0;

    host.innerHTML = `
      <div class="card card--pad quiz-card">
        <div class="quiz-top">
          <span class="chip">Reto ${idx + 1} de ${RETAR.length} · ${ch.lvl === 1 ? 'fácil' : ch.lvl === 2 ? 'medio' : 'difícil'}</span>
          <span class="counter">${state.retar.points} pts</span>
        </div>
        <div class="progress"><div class="progress__fill" style="--v:${(idx / RETAR.length) * 100}%"></div></div>
        <div class="expr">${tex(ch.tex, { display: true })}</div>
        <p class="small muted center" style="margin:0">Escribe la factorización. Espacios y orden no importan.</p>
        <div class="answer-row">
          <input class="input" id="ans" placeholder="(x+2)(x+3)" autocomplete="off" spellcheck="false" aria-label="Tu respuesta">
          <button class="btn btn--accent" id="check">Comprobar</button>
          <button class="btn btn--quiet" id="hintBtn">Pista (${hintsUsed}/2)</button>
        </div>
        <div id="fb" class="feedback hidden"></div>
        <div id="hintBox" class="feedback feedback--soft ${hintsUsed ? '' : 'hidden'}">
          ${hintsUsed ? `<strong>Pista ${hintsUsed}:</strong> ${esc(ch.hints[hintsUsed - 1])}` : ''}
        </div>
        ${state.free ? '<div class="row" style="justify-content:flex-end"><button class="btn btn--ghost btn--sm" id="randBtn">Otro al azar</button></div>' : ''}
      </div>`;

    const input = host.querySelector('#ans');
    const fb = host.querySelector('#fb');
    const check = host.querySelector('#check');
    input.addEventListener('paste', (e) => { e.preventDefault(); toast('Mejor escríbelo tú.'); });
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') check.click(); });
    input.focus();

    host.querySelector('#hintBtn').addEventListener('click', async () => {
      const used = state.retar.hints[ch.id] || 0;
      if (used >= 2) return toast('Ya usaste las dos pistas.');
      state.retar.hints[ch.id] = used + 1;
      const box = host.querySelector('#hintBox');
      box.classList.remove('hidden');
      box.innerHTML = `<strong>Pista ${used + 1}:</strong> ${esc(ch.hints[used])}`;
      host.querySelector('#hintBtn').textContent = `Pista (${used + 1}/2)`;
      await save();
    });
    host.querySelector('#randBtn')?.addEventListener('click', async () => {
      state.retar.index = Math.floor(Math.random() * RETAR.length);
      await save(); render();
    });

    check.addEventListener('click', async () => {
      const val = input.value.trim();
      if (!val) return input.focus();
      const attemptNo = (state.retar.attempts[ch.id] || 0) + 1;
      state.retar.attempts[ch.id] = attemptNo;
      state.retar.answers[ch.id] = val;

      const target = { poly: toPoly(ch.answer).poly, b: ch.b, c: ch.c };
      const res = classifyAnswer(val, target);

      if (res.status === 'ok') {
        const pts = pointsFor(attemptNo, state.retar.hints[ch.id] || 0, state.free);
        state.retar.points += pts;
        state.retar.streak = attemptNo === 1 ? (state.retar.streak || 0) + 1 : 0;
        if (!state.retar.bonusGiven && state.retar.streak >= 5) {
          state.retar.points += state.free ? 3 : 5;
          state.retar.bonusGiven = true;
          toast(`Racha de 5: +${state.free ? 3 : 5} pts`, 'ok');
        }
        if (!state.free && state.retar.streak >= 10) {
          const isNew = await store.awardBadge('racha_fuego', LAB);
          if (isNew) toast('Insignia: Racha de fuego', 'ok');
        }
        if (!state.free && Object.keys(state.retar.answers).length >= 5) {
          await store.awardBadge('primeros_pasos', LAB);
        }
        fb.classList.remove('hidden');
        fb.className = 'feedback feedback--ok';
        fb.innerHTML = `${['¡Eso!', '¡Exacto!', '¡Bien hecho!'][Math.floor(Math.random() * 3)]} <strong>${esc(ch.answer)}</strong> · +${pts} pts`;
        sound.ok();
        await store.attempt({ lab: LAB, phase: 'retar', challengeId: ch.id, answer: val, isCorrect: true, attemptNo, hintsUsed: state.retar.hints[ch.id] || 0, points: pts });
        await save();
        setTimeout(() => { state.retar.index = idx + 1; save().then(render); }, 700);
        return;
      }

      sound.bad();
      fb.classList.remove('hidden');
      fb.className = 'feedback feedback--err';
      fb.innerHTML = esc(res.message || 'Todavía no es.');
      input.select();
      if (attemptNo >= 3) {
        state.retar.help[ch.id] = true;
        await store.attempt({ lab: LAB, phase: 'retar', challengeId: ch.id, answer: val, isCorrect: false, attemptNo, hintsUsed: state.retar.hints[ch.id] || 0, points: 0 });
        fb.className = 'feedback feedback--soft';
        fb.innerHTML = `La respuesta correcta es <strong>${esc(ch.answer)}</strong>. ${esc(ch.hints[0])} Este reto no suma puntos.`;
        await save();
        setTimeout(() => { state.retar.index = idx + 1; save().then(render); }, 1900);
      }
    });
  }

  function finishRetar(host) {
    const noHints = Object.keys(state.retar.hints || {}).length === 0;
    host.innerHTML = `
      <div class="card card--pad center" style="padding:clamp(26px,5vw,44px)">
        <p class="eyebrow">Fase completada</p>
        <h2>Terminaste los 20 retos</h2>
        <p class="lede" style="margin:8px auto 18px">Sumaste <strong>${state.retar.points} puntos</strong> en esta fase.</p>
        ${noHints ? '<p class="chip chip--sage" style="margin-bottom:18px">Sin pistas: ¡bien!</p>' : ''}
        <button class="btn btn--accent btn--lg" id="go">Ir a Argumentar</button>
      </div>`;
    if (noHints && state.retar.points > 0 && !state.free && !isPreview()) {
      store.awardBadge('sin_ayudas', LAB).then((isNew) => { if (isNew) toast('Insignia: Sin ayudas', 'ok'); });
    }
    host.querySelector('#go').addEventListener('click', async () => {
      state.completed[2] = true; state.phase = 4; await save(); render();
    });
  }

  /* ------------------------------- fase 4 -------------------------------- */
  function phaseArgumentar(host) {
    host.innerHTML = `
      <div class="card card--pad">
        <h2>Argumenta</h2>
        <p class="small muted">Seis preguntas. No hay una sola forma de explicarlo; lo importante es la idea.</p>
        <div class="stack" style="margin-top:16px" id="qs"></div>
        <div class="row" style="margin-top:18px;justify-content:flex-end">
          <button class="btn btn--accent ${Object.keys(state.arg.done).length === ARG.length ? '' : 'hidden'}" id="go">Ir al cierre</button>
        </div>
      </div>`;

    const qs = host.querySelector('#qs');
    ARG.forEach((item, i) => {
      const card = document.createElement('div');
      card.className = 'card card--flat card--pad';
      card.innerHTML = `<p style="font-weight:500;margin-bottom:10px">${i + 1}. ${esc(item.q)}</p><div id="body-${item.id}"></div>`;
      qs.appendChild(card);
      const body = card.querySelector(`#body-${item.id}`);

      if (item.type === 'mcq') {
        body.innerHTML = `<div class="options" id="o-${item.id}">
          ${item.options.map((o) => `<button class="option" data-k="${o.k}"><span class="option__key">${o.k}</span><span>${esc(o.t)}</span></button>`).join('')}
        </div><div class="feedback hidden" id="f-${item.id}" style="margin-top:10px"></div>`;
        body.querySelectorAll('.option').forEach((btn) =>
          btn.addEventListener('click', async () => {
            const opt = item.options.find((o) => o.k === btn.dataset.k);
            const fb = body.querySelector(`#f-${item.id}`);
            if (opt.ok) {
              btn.classList.add('option--ok');
              fb.className = 'feedback feedback--ok';
              fb.classList.remove('hidden');
              fb.textContent = item.okMsg;
              if (!state.arg.done[item.id]) { state.arg.done[item.id] = true; state.arg.points += 5; }
              state.arg.answers[item.id] = btn.dataset.k;
              sound.ok();
              await save(); checkDone();
            } else {
              btn.classList.add('option--bad');
              fb.className = 'feedback feedback--err';
              fb.classList.remove('hidden');
              fb.textContent = item.badMsg;
              sound.bad();
            }
          })
        );
      } else if (item.type === 'visual') {
        body.innerHTML = `<div class="grid-3" id="v-${item.id}">
          ${item.dims.map((d, k) => `<button class="option" data-k="${k}" style="flex-direction:column;align-items:stretch;gap:8px">
            ${areaSVG(d[0], d[1])}<span class="small muted center">Opción ${'ABC'[k]}</span></button>`).join('')}
        </div><div class="feedback hidden" id="f-${item.id}" style="margin-top:10px"></div>`;
        body.querySelectorAll('.option').forEach((btn) =>
          btn.addEventListener('click', async () => {
            const fb = body.querySelector(`#f-${item.id}`);
            if (Number(btn.dataset.k) === item.correct) {
              btn.classList.add('option--ok');
              fb.className = 'feedback feedback--ok';
              fb.classList.remove('hidden');
              fb.textContent = item.okMsg;
              if (!state.arg.done[item.id]) { state.arg.done[item.id] = true; state.arg.points += 5; }
              state.arg.answers[item.id] = 'ABC'[Number(btn.dataset.k)];
              sound.ok();
              await save(); checkDone();
            } else {
              btn.classList.add('option--bad');
              fb.className = 'feedback feedback--err';
              fb.classList.remove('hidden');
              fb.textContent = item.badMsg;
              sound.bad();
            }
          })
        );
      } else {
        body.innerHTML = `<textarea class="textarea" id="t-${item.id}" maxlength="400" placeholder="Escribe tu explicación…">${esc(state.arg.answers[item.id] || '')}</textarea>
          <div class="row row--between" style="margin-top:8px">
            <span class="tiny muted"><span id="c-${item.id}">${(state.arg.answers[item.id] || '').length}</span>/400</span>
            <button class="btn btn--ghost btn--sm" id="s-${item.id}">Enviar</button>
          </div>
          <div class="feedback hidden" id="f-${item.id}" style="margin-top:10px"></div>`;
        const ta = body.querySelector(`#t-${item.id}`);
        const counter = body.querySelector(`#c-${item.id}`);
        ta.addEventListener('input', () => { counter.textContent = ta.value.length; });
        body.querySelector(`#s-${item.id}`).addEventListener('click', async () => {
          const txt = ta.value.trim();
          const fb = body.querySelector(`#f-${item.id}`);
          if (txt.length < item.min) {
            fb.className = 'feedback feedback--err';
            fb.classList.remove('hidden');
            fb.textContent = `Escribe un poco más: al menos ${item.min} caracteres.`;
            return;
          }
          const low = txt.toLowerCase();
          const hits = item.keywords.filter((w) => low.includes(w)).length;
          state.arg.answers[item.id] = txt;
          if (hits >= 2) {
            fb.className = 'feedback feedback--ok';
            fb.textContent = item.okMsg;
            if (!state.arg.done[item.id]) { state.arg.done[item.id] = true; state.arg.points += 5; }
            sound.ok();
          } else {
            fb.className = 'feedback feedback--soft';
            fb.textContent = item.softMsg;
          }
          fb.classList.remove('hidden');
          await save(); checkDone();
        });
      }
    });

    function checkDone() {
      if (Object.keys(state.arg.done).length === ARG.length) host.querySelector('#go').classList.remove('hidden');
    }
    checkDone();

    host.querySelector('#go').addEventListener('click', async () => {
      state.completed[3] = true; state.phase = 5; await save(); render();
    });
  }

  function areaSVG(wCells, hCells) {
    const C = 11;
    const w = wCells * C, h = hCells * C;
    const grid = [];
    for (let x = 1; x < wCells; x++) grid.push(`<line x1="${x * C}" y1="0" x2="${x * C}" y2="${h}" stroke="rgba(0,0,0,.12)" stroke-width="1"/>`);
    for (let y = 1; y < hCells; y++) grid.push(`<line x1="0" y1="${y * C}" x2="${w}" y2="${y * C}" stroke="rgba(0,0,0,.12)" stroke-width="1"/>`);
    return `<svg viewBox="0 0 ${w} ${h}" width="100%" style="max-width:${w}px;border-radius:6px;display:block;margin:0 auto" role="img" aria-label="Rectángulo de ${wCells} por ${hCells}">
      <rect x="0" y="0" width="${3 * C}" height="${3 * C}" fill="#2f5d8a"/>
      <rect x="${3 * C}" y="0" width="${(wCells - 3) * C}" height="${3 * C}" fill="#3e6b5a"/>
      <rect x="0" y="${3 * C}" width="${3 * C}" height="${(hCells - 3) * C}" fill="#3e6b5a"/>
      <rect x="${3 * C}" y="${3 * C}" width="${(wCells - 3) * C}" height="${(hCells - 3) * C}" fill="#d8a84e"/>
      ${grid.join('')}</svg>`;
  }

  /* ------------------------------- fase 5 -------------------------------- */
  function phaseCerrar(host) {
    const sc = total();
    const best = Math.max(state.bestScore || 0, sc);
    const badge = badgeFor(best, state.free);

    host.innerHTML = `
      <div class="card card--pad" style="padding:clamp(24px,4.4vw,40px)">
        <p class="eyebrow">Cierre</p>
        <h2>Laboratorio completado: Factorización</h2>
        <div class="row" style="gap:22px;align-items:center;margin:18px 0;flex-wrap:wrap">
          <div class="medal-wrap seal-in">${medalSVG(badge, 92)}</div>
          <div>
            <div class="readout__k">Puntaje total</div>
            <div class="readout__v" style="font-size:30px">${best}</div>
            <div class="small muted">Insignia: <strong style="text-transform:capitalize">${badge}</strong>${state.free ? ' · modo libre (sin God)' : ''}</div>
          </div>
        </div>
        <div class="grid-3" style="margin-bottom:20px">
          ${[['target', 'Reconoces factor común'], ['grid', 'Reconoces trinomios cuadrados perfectos'], ['sparkle', 'Factorizas trinomios de la forma x² + bx + c']]
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
      const yes = await confirmDialog({ title: 'Repetir laboratorio', body: 'Empiezas desde la fase 1. Tu mejor puntaje se conserva.', confirmLabel: 'Sí, repetir' });
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
