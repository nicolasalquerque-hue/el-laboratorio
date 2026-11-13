/* math.js — parser y comparación algebraica (sin dependencias)
   Convierte expresiones escritas por el estudiante en polinomios y las compara
   con la respuesta correcta, aceptando reordenamientos y factores equivalentes. */

function tokenize(src) {
  const s = String(src).replace(/\s+/g, '');
  const out = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/[0-9]/.test(c)) {
      let j = i;
      while (j < s.length && /[0-9.]/.test(s[j])) j++;
      out.push({ t: 'num', v: Number(s.slice(i, j)) });
      i = j;
      continue;
    }
    if (c === 'x' || c === 'X') { out.push({ t: 'x' }); i++; continue; }
    if (c === '·' || c === '×') { out.push({ t: 'op', v: '*' }); i++; continue; }
    if ('+-*/^()'.includes(c)) { out.push({ t: 'op', v: c }); i++; continue; }
    throw new Error('Carácter no válido: ' + c);
  }
  return out;
}

class Parser {
  constructor(tokens) { this.t = tokens; this.i = 0; }
  peek() { return this.t[this.i]; }
  next() { return this.t[this.i++]; }
  expectOp(v) {
    const tk = this.next();
    if (!tk || tk.t !== 'op' || tk.v !== v) throw new Error('Se esperaba ' + v);
  }
  parseExpr() {
    let node = this.parseTerm();
    for (;;) {
      const tk = this.peek();
      if (tk && tk.t === 'op' && (tk.v === '+' || tk.v === '-')) {
        this.next();
        const rhs = this.parseTerm();
        node = { t: tk.v === '+' ? 'add' : 'sub', a: node, b: rhs };
      } else break;
    }
    return node;
  }
  startsFactor(tk) {
    return tk && (tk.t === 'num' || tk.t === 'x' || (tk.t === 'op' && tk.v === '('));
  }
  parseTerm() {
    let node = this.parsePower();
    for (;;) {
      const tk = this.peek();
      if (tk && tk.t === 'op' && (tk.v === '*' || tk.v === '/')) {
        this.next();
        const rhs = this.parsePower();
        if (tk.v === '/') throw new Error('División no soportada');
        node = { t: 'mul', a: node, b: rhs };
      } else if (this.startsFactor(tk)) {
        const rhs = this.parsePower();
        node = { t: 'mul', a: node, b: rhs };
      } else break;
    }
    return node;
  }
  parsePower() {
    const base = this.parseUnary();
    const tk = this.peek();
    if (tk && tk.t === 'op' && tk.v === '^') {
      this.next();
      const e = this.parseUnary();
      return { t: 'pow', a: base, b: e };
    }
    return base;
  }
  parseUnary() {
    const tk = this.peek();
    if (tk && tk.t === 'op' && tk.v === '-') { this.next(); return { t: 'neg', a: this.parseUnary() }; }
    if (tk && tk.t === 'op' && tk.v === '+') { this.next(); return this.parseUnary(); }
    return this.parsePrimary();
  }
  parsePrimary() {
    const tk = this.next();
    if (!tk) throw new Error('Expresión incompleta');
    if (tk.t === 'num') return { t: 'num', v: tk.v };
    if (tk.t === 'x') return { t: 'x' };
    if (tk.t === 'op' && tk.v === '(') {
      const inner = this.parseExpr();
      this.expectOp(')');
      return inner;
    }
    throw new Error('No entendí esa parte');
  }
}

export function parse(src) {
  try {
    const p = new Parser(tokenize(src));
    const ast = p.parseExpr();
    if (p.i < p.t.length) throw new Error('Sobra algo al final');
    return { ok: true, ast };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/* ------------------------------- polinomios ------------------------------- */
const trim = (p) => {
  const q = [...p];
  while (q.length > 1 && Math.abs(q[q.length - 1]) < 1e-12) q.pop();
  return q.length ? q : [0];
};

function add(a, b) {
  const n = Math.max(a.length, b.length);
  const out = new Array(n).fill(0);
  for (let i = 0; i < n; i++) out[i] = (a[i] || 0) + (b[i] || 0);
  return trim(out);
}
function neg(a) { return a.map((x) => -x); }
function sub(a, b) { return add(a, neg(b)); }
function mul(a, b) {
  const out = new Array(a.length + b.length - 1).fill(0);
  for (let i = 0; i < a.length; i++)
    for (let j = 0; j < b.length; j++) out[i + j] += a[i] * b[j];
  return trim(out);
}
function pow(a, n) {
  if (!Number.isInteger(n) || n < 0) throw new Error('Exponente no válido');
  let r = [1];
  for (let i = 0; i < n; i++) r = mul(r, a);
  return r;
}

function astToPoly(node) {
  switch (node.t) {
    case 'num': return [node.v];
    case 'x': return [0, 1];
    case 'add': return add(astToPoly(node.a), astToPoly(node.b));
    case 'sub': return sub(astToPoly(node.a), astToPoly(node.b));
    case 'mul': return mul(astToPoly(node.a), astToPoly(node.b));
    case 'neg': return neg(astToPoly(node.a));
    case 'pow': {
      const base = astToPoly(node.a);
      const e = astToPoly(node.b);
      if (e.length !== 1 || !Number.isInteger(e[0])) throw new Error('Exponente no válido');
      return pow(base, e[0]);
    }
    default: throw new Error('Nodo desconocido');
  }
}

export function toPoly(src) {
  const r = parse(src);
  if (!r.ok) return r;
  try {
    return { ok: true, poly: astToPoly(r.ast) };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

export const evalPoly = (poly, x) => poly.reduce((s, c, i) => s + c * Math.pow(x, i), 0);

export function eqPoly(a, b, eps = 1e-7) {
  const A = trim(a), B = trim(b);
  if (A.length !== B.length) {
    const n = Math.max(A.length, B.length);
    for (let i = 0; i < n; i++) {
      const d = Math.abs((A[i] || 0) - (B[i] || 0));
      const m = Math.max(1, Math.abs(A[i] || 0), Math.abs(B[i] || 0));
      if (d / m > eps) return false;
    }
    return true;
  }
  for (let i = 0; i < A.length; i++) {
    const d = Math.abs(A[i] - B[i]);
    const m = Math.max(1, Math.abs(A[i]), Math.abs(B[i]));
    if (d / m > eps) return false;
  }
  return true;
}

export function sameAbsPoly(a, b, eps = 1e-7) {
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const d = Math.abs(Math.abs(a[i] || 0) - Math.abs(b[i] || 0));
    const m = Math.max(1, Math.abs(a[i] || 0), Math.abs(b[i] || 0));
    if (d / m > eps) return false;
  }
  return true;
}

/* ------------------------- clasificación de errores ------------------------ */
/**
 * @param {string} userSrc respuesta escrita por el estudiante
 * @param {object} target  { poly:number[], b?:number, c?:number, common?:number }
 * @returns {{status:string, message?:string}}
 */
export function classifyAnswer(userSrc, target) {
  const u = toPoly(userSrc);
  if (!u.ok) {
    return {
      status: 'sintaxis',
      message: 'Revisa cómo escribiste la respuesta. Por ejemplo: (x+2)(x+3).',
    };
  }
  const T = target.poly;
  if (eqPoly(u.poly, T)) return { status: 'ok' };

  if (sameAbsPoly(u.poly, T)) {
    return {
      status: 'signos',
      message: 'Revisa los signos: los números son correctos, pero sus signos no coinciden.',
    };
  }

  // ¿olvidó un factor común? el término líder en valor absoluto es menor
  const leadU = Math.abs(u.poly[u.poly.length - 1] || 0);
  const leadT = Math.abs(T[T.length - 1] || 0);
  if (leadT > 1 && leadU > 0 && Math.abs(leadU - 1) < 1e-9) {
    return {
      status: 'factor_comun',
      message: 'Antes de factorizar el trinomio, ¿hay algo en común en todos los términos?',
    };
  }

  if (typeof target.b === 'number' && typeof target.c === 'number') {
    return {
      status: 'suma_producto',
      message: `Esos números no suman ${target.b} y multiplican ${target.c}. Vuelve a intentarlo.`,
    };
  }
  return { status: 'otro', message: 'Todavía no es equivalente a la expresión. Revísalo e intenta de nuevo.' };
}

/* ------------------------------ autocomprobación --------------------------- */
export function selfTest() {
  const cases = [
    ['(x+2)(x+3)', 'x^2+5x+6', true],
    ['(x+3)(x+2)', 'x^2+5x+6', true],
    ['2(x+2)(x+3)', '2x^2+10x+12', true],
    ['3(x+1)^2', '3x^2+6x+3', true],
    ['4x^2(3x-2)', '12x^3-8x^2', true],
    ['(x-5)(x+2)', 'x^2-3x-10', true],
    ['(x+5)(x-2)', 'x^2-3x-10', false],
    ['2x(x+5)', '2x^2+10x', true],
  ];
  const out = [];
  for (const [u, t, want] of cases) {
    const up = toPoly(u), tp = toPoly(t);
    const got = up.ok && tp.ok && eqPoly(up.poly, tp.poly);
    out.push({ u, t, ok: got === want, got });
  }
  return out;
}
