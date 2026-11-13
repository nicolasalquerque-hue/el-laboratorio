/* router.js — enrutado por hash, sin dependencias */
const routes = [];
let fallback = () => document.createTextNode('');
let onAfter = null;

export function register(pattern, handler) {
  const keys = [];
  const rx = new RegExp(
    '^' +
      pattern
        .replace(/\/:([a-z]+)/g, (_, k) => {
          keys.push(k);
          return '/([^/]+)';
        })
        .replace(/\//g, '\\/') +
      '$'
  );
  routes.push({ rx, keys, handler });
}

export function setFallback(fn) { fallback = fn; }
export function afterRender(fn) { onAfter = fn; }

export function currentPath() {
  const h = location.hash.replace(/^#/, '');
  return h || '/';
}

export async function resolve(path = currentPath()) {
  for (const r of routes) {
    const m = path.match(r.rx);
    if (m) {
      const params = {};
      r.keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1])));
      return r.handler({ params, path });
    }
  }
  return fallback({ params: {}, path });
}

export function navigate(path, { replace = false } = {}) {
  const target = '#' + (path.startsWith('/') ? path : '/' + path);
  if (replace) location.replace(target);
  else location.hash = target;
}

export async function render(container) {
  const view = await resolve();
  container.innerHTML = '';
  const node = typeof view === 'string' ? null : view;
  if (typeof view === 'string') container.innerHTML = view;
  else if (node) container.appendChild(node);
  container.classList.remove('page-enter');
  void container.offsetWidth;
  container.classList.add('page-enter');
  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  if (onAfter) onAfter();
}
