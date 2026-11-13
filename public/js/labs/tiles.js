/* tiles.js — modelo de áreas con geometría real.
 *
 * Regla clave: "x" NUNCA mide un número entero de unidades de cuadrícula
 * (2.5, 3.5, 4.5…). Así un cuadrado x² jamás se puede rellenar con rectángulos
 * de alto 1, y el estudiante se ve obligado a razonar con las áreas.
 */

export const SNAP = 0.25;      // paso mínimo de la cuadrícula
const EPS = 1e-6;

export const X_CHOICES = [2.5, 3.5, 4.5];

const KINDS = {
  x2: { w: 'x', h: 'x', cls: 'tile--x2', label: 'x²', a: 1, b: 0, c: 0, rot: false, cat: 'algebra' },
  x: { w: 'x', h: 1, cls: 'tile--x', label: 'x', a: 0, b: 1, c: 0, rot: true, cat: 'algebra' },
  x2h: { w: 'x', h: 2, cls: 'tile--x', label: '2x', a: 0, b: 2, c: 0, rot: false, cat: 'algebra' },
  x3h: { w: 'x', h: 3, cls: 'tile--x', label: '3x', a: 0, b: 3, c: 0, rot: false, cat: 'algebra' },
  one: { w: 1, h: 1, cls: 'tile--one', label: '1', a: 0, b: 0, c: 1, rot: false, cat: 'square' },
  sq2: { w: 2, h: 2, cls: 'tile--one', label: '4', a: 0, b: 0, c: 4, rot: false, cat: 'square' },
  sq3: { w: 3, h: 3, cls: 'tile--one', label: '9', a: 0, b: 0, c: 9, rot: false, cat: 'square' },
  sq4: { w: 4, h: 4, cls: 'tile--one', label: '16', a: 0, b: 0, c: 16, rot: false, cat: 'square' },
};

export const CATALOG = [
  { group: 'Con x', kinds: ['x2', 'x', 'x2h', 'x3h'] },
  { group: 'Cuadrados de 1', kinds: ['one', 'sq2', 'sq3', 'sq4'] },
];

const fmt = (n) => {
  const r = Math.round(n * 100) / 100;
  return Number.isInteger(r) ? String(r) : String(r);
};

/** Expresa una longitud en unidades como combinación de x y constantes. */
export function describeSide(len, x) {
  const k = Math.floor(len / x + 1e-9);
  const rest = len - k * x;
  const r = Math.abs(rest) < 1e-6 ? 0 : rest;
  if (k === 0) return fmt(len);
  const kx = k === 1 ? 'x' : `${k}x`;
  return r === 0 ? kx : `${kx} + ${fmt(r)}`;
}

export function areaExpr({ a, b, c }) {
  const parts = [];
  if (a) parts.push(a === 1 ? 'x²' : `${a}x²`);
  if (b) parts.push(`${b === 1 ? '' : b}x`);
  if (c) parts.push(String(c));
  if (!parts.length) return '0';
  return parts.join(' + ').replace(/\+ -/g, '− ');
}

const overlap = (a, b) =>
  a.x < b.x + b.w - EPS && b.x < a.x + a.w - EPS && a.y < b.y + b.h - EPS && b.y < a.y + a.h - EPS;

export class TileBoard {
  constructor(host, { x = 3.5, unitsWide = 13, unitsTall = 8, onChange = null } = {}) {
    this.host = host;
    this.x = x;
    this.unitsWide = unitsWide;
    this.unitsTall = unitsTall;
    this.onChange = onChange;
    this.tiles = [];
    this._seq = 1;
    this._sel = null;

    this.board = document.createElement('div');
    this.board.className = 'board';
    this.board.setAttribute('role', 'application');
    this.board.setAttribute('aria-label', 'Lienzo de fichas');
    host.innerHTML = '';
    host.appendChild(this.board);

    this._onResize = () => this.layout();
    window.addEventListener('resize', this._onResize);
    if (window.ResizeObserver) {
      this._ro = new ResizeObserver(() => this.layout());
      this._ro.observe(this.board);
    }
    this.layout();
    requestAnimationFrame(() => this.layout());
  }

  /* ------------------------------ medidas ----------------------------- */
  get unit() { return this._unit || 36; }

  sizeOf(kind) {
    const k = KINDS[kind];
    return { w: k.w === 'x' ? this.x : k.w, h: k.h === 'x' ? this.x : k.h };
  }

  layout() {
    const w = this.board.clientWidth || this.host.clientWidth || 420;
    this._unit = Math.max(24, Math.min(46, w / this.unitsWide));
    this.board.style.setProperty('--unit', this._unit + 'px');
    this.board.style.height = this.unitsTall * this._unit + 'px';
    this.board.style.setProperty('--grid', SNAP * this._unit + 'px');
    this.tiles.forEach((t) => this._paint(t));
    this._labels();
  }

  /* ------------------------------- estado ----------------------------- */
  counts() {
    let a = 0, b = 0, c = 0;
    for (const t of this.tiles) {
      const k = KINDS[t.kind];
      a += k.a; b += k.b; c += k.c;
    }
    return { a, b, c };
  }

  collides(tile, x, y) {
    if (x < -EPS || y < -EPS) return true;
    if (x + tile.w > this.unitsWide + EPS || y + tile.h > this.unitsTall + EPS) return true;
    const probe = { x, y, w: tile.w, h: tile.h };
    return this.tiles.some((t) => t.id !== tile.id && overlap(probe, t));
  }

  rect() {
    if (!this.tiles.length) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity, area = 0;
    for (const t of this.tiles) {
      minX = Math.min(minX, t.x); minY = Math.min(minY, t.y);
      maxX = Math.max(maxX, t.x + t.w); maxY = Math.max(maxY, t.y + t.h);
      area += t.w * t.h;
    }
    const w = maxX - minX, h = maxY - minY;
    // sin solapes, área igual al rectángulo envolvente ⇒ encaje perfecto
    const filled = Math.abs(area - w * h) < 1e-5 && w > 1e-6 && h > 1e-6;
    return { filled, w, h, minX, minY, maxX, maxY, area };
  }

  freeSpot(kind) {
    const { w, h } = this.sizeOf(kind);
    for (let y = 0; y + h <= this.unitsTall + EPS; y += SNAP)
      for (let xx = 0; xx + w <= this.unitsWide + EPS; xx += SNAP) {
        const probe = { x: xx, y, w, h };
        if (!this.tiles.some((t) => overlap(probe, t))) return { x: xx, y };
      }
    return { x: 0, y: 0 };
  }

  /* ------------------------------- acciones --------------------------- */
  add(kind, pos = null) {
    if (!KINDS[kind]) return null;
    const { w, h } = this.sizeOf(kind);
    const spot = pos && !this.collides({ w, h }, pos.x, pos.y) ? pos : this.freeSpot(kind);
    const tile = { id: this._seq++, kind, x: spot.x, y: spot.y, w, h };
    this.tiles.push(tile);
    this._create(tile);
    this._changed();
    this.select(tile);
    return tile;
  }

  remove(tile) {
    this.tiles = this.tiles.filter((t) => t.id !== tile.id);
    tile.el?.remove();
    if (this._sel === tile) this._sel = null;
    this._changed();
  }

  removeSelected() {
    if (this._sel) this.remove(this._sel);
  }

  clear() {
    this.tiles = [];
    this._sel = null;
    this.board.innerHTML = '';
    this._changed();
  }

  rotate(tile) {
    if (!KINDS[tile.kind].rot) return;
    const w = tile.w, h = tile.h;
    if (this.collides({ id: tile.id, w: h, h: w }, tile.x, tile.y)) {
      const spot = this.freeSpot(tile.kind);
      tile.x = spot.x; tile.y = spot.y;
    }
    tile.w = h; tile.h = w;
    this._paint(tile);
    this._changed();
  }

  select(tile) {
    this.tiles.forEach((t) => t.el && t.el.classList.toggle('tile--sel', t === tile));
    this._sel = tile;
  }

  last() { return this._sel || this.tiles[this.tiles.length - 1] || null; }

  /* ------------------------------- encaje ----------------------------- */
  /** Ajusta la posición a la cuadrícula fina y a los bordes de las demás fichas. */
  snap(x, y, w, h, skipId) {
    const align = (v, axis) => {
      let best = Math.round(v / SNAP) * SNAP;
      let bestD = Math.abs(v - best);
      const others = this.tiles.filter((t) => t.id !== skipId);
      for (const t of others) {
        const edges = axis === 'x'
          ? [t.x, t.x + t.w, t.x - w, t.x + t.w - w]
          : [t.y, t.y + t.h, t.y - h, t.y + t.h - h];
        for (const e of edges) {
          const d = Math.abs(v - e);
          if (d < bestD && d < 0.34) { best = e; bestD = d; }
        }
      }
      return Math.round(best * 1000) / 1000;
    };
    const nx = Math.max(0, Math.min(this.unitsWide - w, align(x, 'x')));
    const ny = Math.max(0, Math.min(this.unitsTall - h, align(y, 'y')));
    return { x: nx, y: ny };
  }

  /* ------------------------------- dibujo ----------------------------- */
  _create(tile) {
    const k = KINDS[tile.kind];
    const el = document.createElement('div');
    el.className = `tile ${k.cls}`;
    el.dataset.id = String(tile.id);
    el.innerHTML = `<span class="tile__label">${k.label}</span>
      <button class="tile__del" title="Eliminar ficha" aria-label="Eliminar ficha">×</button>`;
    el.querySelector('.tile__del').addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      e.preventDefault();
      this.remove(tile);
    });
    el.addEventListener('pointerdown', (e) => this._drag(e, tile));
    if (k.rot) {
      el.addEventListener('dblclick', (e) => { e.preventDefault(); this.rotate(tile); });
      el.addEventListener('contextmenu', (e) => { e.preventDefault(); this.rotate(tile); });
    }
    tile.el = el;
    this.board.appendChild(el);
    this._paint(tile);
  }

  _paint(tile, animate = false) {
    const u = this.unit, el = tile.el;
    if (!el) return;
    el.style.width = Math.max(8, tile.w * u - 2) + 'px';
    el.style.height = Math.max(8, tile.h * u - 2) + 'px';
    el.style.transform = `translate3d(${tile.x * u + 1}px, ${tile.y * u + 1}px, 0)`;
    el.style.fontSize = Math.min(14, Math.max(9, Math.min(tile.w, tile.h) * u * 0.26)) + 'px';
    el.style.transition = animate ? 'transform 140ms cubic-bezier(.22,.9,.24,1)' : 'none';
  }

  _changed() {
    const rect = this.rect();
    this._labels();
    if (this.onChange) this.onChange({ counts: this.counts(), rect, tiles: this.tiles.length });
  }

  /**
   * Términos algebraicos de un lado, leídos de las fichas que tocan ese borde.
   * Nunca usa la medida en píxeles: por eso jamás puede aparecer un decimal.
   * axis 'w' → borde superior (anchos); axis 'h' → borde izquierdo (altos).
   */
  sideTerms(axis, rect) {
    const eps = 1e-6;
    const list = axis === 'w'
      ? this.tiles.filter((t) => Math.abs(t.y - rect.minY) < eps)
      : this.tiles.filter((t) => Math.abs(t.x - rect.minX) < eps);
    let xCount = 0, constSum = 0;
    for (const t of list) {
      const dim = axis === 'w' ? t.w : t.h;
      if (Math.abs(dim - this.x) < eps) xCount += 1;
      else constSum += Math.round(dim);
    }
    return { xCount, constSum };
  }

  static formatTerms({ xCount, constSum }) {
    if (!xCount) return String(constSum);
    const kx = xCount === 1 ? 'x' : `${xCount}x`;
    return constSum === 0 ? kx : `${kx} + ${constSum}`;
  }

  /** Etiquetas listas para pintar: { w, h } o null si todavía no es rectángulo. */
  labels() {
    const rect = this.rect();
    if (!rect || !rect.filled) return null;
    return {
      w: TileBoard.formatTerms(this.sideTerms('w', rect)),
      h: TileBoard.formatTerms(this.sideTerms('h', rect)),
    };
  }

  _labels() {
    this.board.querySelectorAll('.side-label').forEach((n) => n.remove());
    const rect = this.rect();
    if (!rect || !rect.filled) return;
    const u = this.unit;
    const L = this.labels();
    const wl = L.w;
    const hl = L.h;
    const top = document.createElement('div');
    top.className = 'side-label';
    top.style.left = (rect.minX * u + (rect.w * u) / 2 - 30) + 'px';
    top.style.top = Math.max(0, rect.minY * u - 22) + 'px';
    top.textContent = `(${wl})`;
    const left = document.createElement('div');
    left.className = 'side-label side-label--v';
    left.style.left = Math.max(0, rect.minX * u - 46) + 'px';
    left.style.top = (rect.minY * u + (rect.h * u) / 2 - 12) + 'px';
    left.textContent = `(${hl})`;
    if (rect.minX * u < 52) left.style.left = (rect.maxX * u + 6) + 'px';
    this.board.appendChild(top);
    this.board.appendChild(left);
    this.board.classList.remove('board--ok');
    void this.board.offsetWidth;
    this.board.classList.add('board--ok');
  }

  /* ------------------------------ arrastre ---------------------------- */
  _drag(e, tile) {
    if (e.button !== undefined && e.button !== 0) return;
    e.preventDefault();
    this.select(tile);
    const u = this.unit;
    const startX = e.clientX, startY = e.clientY;
    const from = { x: tile.x, y: tile.y };
    const el = tile.el;
    el.classList.add('tile--drag');
    el.style.transition = 'none';
    try { el.setPointerCapture(e.pointerId); } catch {}

    const move = (ev2) => {
      const dx = (ev2.clientX - startX) / u;
      const dy = (ev2.clientY - startY) / u;
      el.style.transform = `translate3d(${(from.x + dx) * u + 1}px, ${(from.y + dy) * u + 1}px, 0)`;
      tile._preview = { x: from.x + dx, y: from.y + dy };
    };
    const up = () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      el.classList.remove('tile--drag');
      const p = tile._preview;
      tile._preview = null;
      if (p) {
        const snapped = this.snap(p.x, p.y, tile.w, tile.h, tile.id);
        if (!this.collides(tile, snapped.x, snapped.y)) {
          tile.x = snapped.x; tile.y = snapped.y;
        }
      }
      this._paint(tile, true);
      this._changed();
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  }

  /** Arrastrar desde el catálogo. */
  spawnFromBank(kind, ev) {
    const tile = this.add(kind);
    if (!tile) return;
    const el = tile.el, u = this.unit;
    const rect = this.board.getBoundingClientRect();
    const grabX = Math.max(0, Math.min(tile.w * u, ev.clientX - rect.left - tile.x * u));
    const grabY = Math.max(0, Math.min(tile.h * u, ev.clientY - rect.top - tile.y * u));
    el.classList.add('tile--drag');
    el.style.transition = 'none';

    const move = (e2) => {
      const x = (e2.clientX - rect.left - grabX) / u;
      const y = (e2.clientY - rect.top - grabY) / u;
      el.style.transform = `translate3d(${x * u + 1}px, ${y * u + 1}px, 0)`;
      tile._preview = { x, y };
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      el.classList.remove('tile--drag');
      const p = tile._preview;
      tile._preview = null;
      if (p) {
        const snapped = this.snap(p.x, p.y, tile.w, tile.h, tile.id);
        if (!this.collides(tile, snapped.x, snapped.y)) { tile.x = snapped.x; tile.y = snapped.y; }
        else {
          const spot = this.freeSpot(kind);
          tile.x = spot.x; tile.y = spot.y;
        }
      }
      this._paint(tile, true);
      this._changed();
    };
    tile._preview = { x: tile.x, y: tile.y };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    move(ev);
  }

  destroy() {
    window.removeEventListener('resize', this._onResize);
    this._ro?.disconnect();
    this.host.innerHTML = '';
  }
}
