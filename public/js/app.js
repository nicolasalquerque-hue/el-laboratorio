/* app.js — arranque, barra superior y registro de rutas */
import { store } from './store.js';
import { icon, esc, toast } from './ui.js';
import { register, setFallback, afterRender, resolve, render, currentPath, navigate } from './router.js';
import { openLogin } from './views/login.js';
import { viewHome } from './views/home.js';
import { viewGroup } from './views/group.js';
import { viewRanking } from './views/ranking.js';
import { viewMessages } from './views/messages.js';
import { viewTeacherGroups, viewGroupPanel } from './views/teacher.js';
import { viewAdminGroups, viewAdminUsers, viewAdminRanking } from './views/admin.js';
import { viewLogros } from './views/logros.js';
import { viewUsers } from './views/users.js';
import { viewShare } from './views/share.js';
import { viewFactorizacion } from './labs/factorizacion.js';
import { viewRazon } from './labs/razon.js';

/* ------------------------------- rutas ------------------------------- */
register('/', viewHome);
register('/grupo', viewGroup);
register('/ranking', viewRanking);
register('/mensajes', viewMessages);
register('/docente', viewTeacherGroups);
register('/docente/grupo/:id', viewGroupPanel);
register('/admin/grupos', viewAdminGroups);
register('/admin/cuentas', viewAdminUsers);
register('/admin/ranking', viewAdminRanking);
register('/admin/grupos/grupo/:id', viewGroupPanel);
register('/lab/factorizacion', viewFactorizacion);
register('/lab/razon', viewRazon);
register('/logros', viewLogros);
register('/usuarios', viewUsers);
register('/compartir', viewShare);
setFallback(() => {
  const d = document.createElement('div');
  d.innerHTML = `<div class="card card--pad center" style="max-width:520px;margin:40px auto">
    <h2>Esta página no existe</h2>
    <p class="muted">Puede que el enlace esté mal escrito.</p>
    <a class="btn btn--accent" href="#/">Volver al inicio</a></div>`;
  return d;
});

const MENU_ART = `
  <div class="menu__art" aria-hidden="true">
    <svg width="92" height="26" viewBox="0 0 92 26">
      <rect x="1" y="11" width="14" height="14" rx="2" fill="#2f5d8a" fill-opacity=".26"/>
      <rect x="18" y="18" width="14" height="7" rx="2" fill="#3e6b5a" fill-opacity=".3"/>
      <rect x="35" y="21" width="7" height="4" rx="1.5" fill="#d8a84e" fill-opacity=".55"/>
      <circle cx="58" cy="18" r="6" stroke="#b4442c" stroke-opacity=".32" stroke-width="1.8" fill="none"/>
      <path d="M70 24 L77 10 L84 24" stroke="#8a8378" stroke-opacity=".45" stroke-width="1.8" fill="none" stroke-linejoin="round"/>
    </svg>
  </div>`;

/* ------------------------------- barra ------------------------------- */
function brandMark() {
  return `<span class="topbar__mark"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M5 19V5h4l3 6 3-6h4v14h-3V10l-3 6h-2l-3-6v9H5Z" fill="#faf7f1"/></svg></span>`;
}

export function renderTopbar() {
  const bar = document.getElementById('topbar');
  const role = store.role;
  let right = '';

  if (role === 'estudiante') {
    right = `
      <span class="topbar__name">${esc(store.user.name)}</span>
      <span class="topbar__pts">${store.points} pts</span>
      <div class="menu-wrap">
        <button class="hamburger" id="menuBtn" aria-label="Abrir menú" aria-expanded="false">
          <span></span><span></span><span></span>
        </button>
        <div class="menu hidden" id="menu">${MENU_ART}
          
          <a href="#/" data-nav>${icon('home', 16)} Home</a>
          <a href="#/ranking" data-nav>${icon('trophy', 16)} Ranking</a>
          <a href="#/grupo" data-nav>${icon('users', 16)} Mi grupo</a>
          <a href="#/mensajes" data-nav>${icon('mail', 16)} Mensajes</a>
          <a href="#/logros" data-nav>${icon('sparkle', 16)} Logros</a>
          <div class="menu__sep"></div>
          <button id="logoutBtn">${icon('logout', 16)} Cerrar sesión</button>
        </div>
      </div>`;
  } else if (role === 'docente') {
    right = `
      <span class="topbar__name">${esc(store.user.name)} <span class="chip" style="margin-left:6px">Docente</span></span>
      <div class="menu-wrap">
        <button class="hamburger" id="menuBtn" aria-label="Abrir menú" aria-expanded="false">
          <span></span><span></span><span></span>
        </button>
        <div class="menu hidden" id="menu">${MENU_ART}
          <a href="#/docente" data-nav>${icon('grid', 16)} Mis grupos</a>
          <a href="#/usuarios" data-nav>${icon('users', 16)} Usuarios</a>
          <a href="#/compartir" data-nav>${icon('target', 16)} Compartir acceso</a>
          <a href="#/mensajes" data-nav>${icon('mail', 16)} Mensajes</a>
          <a href="#/logros" data-nav>${icon('sparkle', 16)} Logros</a>
          <div class="menu__sep"></div>
          <button id="logoutBtn">${icon('logout', 16)} Cerrar sesión</button>
        </div>
      </div>`;
  } else if (role === 'superadmin') {
    right = `
      <span class="topbar__name">${esc(store.user.name)} <span class="chip chip--gold" style="margin-left:6px">Superadmin</span></span>
      <div class="menu-wrap">
        <button class="hamburger" id="menuBtn" aria-label="Abrir menú" aria-expanded="false">
          <span></span><span></span><span></span>
        </button>
        <div class="menu hidden" id="menu">${MENU_ART}
          <a href="#/admin/grupos" data-nav>${icon('grid', 16)} Todos los grupos</a>
          <a href="#/usuarios" data-nav>${icon('users', 16)} Usuarios</a>
          <a href="#/admin/ranking" data-nav>${icon('trophy', 16)} Ranking global</a>
          <a href="#/compartir" data-nav>${icon('target', 16)} Compartir acceso</a>
          <a href="#/" data-nav>${icon('home', 16)} Home</a>
          <button id="previewBtn">${icon('play', 16)} Probar Laboratorio</button>
          <div class="menu__sep"></div>
          <button id="logoutBtn">${icon('logout', 16)} Cerrar sesión</button>
        </div>
      </div>`;
  } else {
    right = `
      ${role === 'invitado' ? '<span class="chip">Invitado</span>' : ''}
      <button class="btn btn--ghost btn--sm" id="loginBtn">Iniciar sesión</button>
      ${role === 'anon' ? '<button class="btn btn--accent btn--sm" id="guestBtn">Probar como invitado</button>' : ''}`;
  }

  bar.innerHTML = `
    <a class="topbar__brand" href="#/">${brandMark()}<span>El Laboratorio</span></a>
    <div class="topbar__right">
      ${store.preview ? `<span class="chip chip--gold">Vista previa</span><button class="btn btn--quiet btn--sm" id="previewExit">Salir</button>` : ''}
      ${right}
    </div>`;

  const menuBtn = bar.querySelector('#menuBtn');
  const menu = bar.querySelector('#menu');
  if (menuBtn && menu) {
    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = !menu.classList.toggle('hidden');
      menuBtn.setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('click', () => {
      menu.classList.add('hidden');
      menuBtn.setAttribute('aria-expanded', 'false');
    });
    menu.addEventListener('click', (e) => e.stopPropagation());
  }

  bar.querySelector('#previewBtn')?.addEventListener('click', () => {
    store.setPreview(true);
    navigate('/lab/factorizacion');
    rerender();
    toast('Vista previa: nada de lo que hagas se guarda');
  });
  bar.querySelector('#previewExit')?.addEventListener('click', () => {
    store.setPreview(false);
    rerender();
    toast('Saliste de la vista previa');
  });
  bar.querySelector('#loginBtn')?.addEventListener('click', () => openLogin());
  bar.querySelector('#guestBtn')?.addEventListener('click', () => {
    store.enterGuest();
    renderTopbar();
    navigate('/');
    rerender();
    toast('Modo invitado. Tu progreso no se guardará.');
  });
  bar.querySelector('#logoutBtn')?.addEventListener('click', async () => {
    const { confirmDialog } = await import('./ui.js');
    const yes = await confirmDialog({
      title: '¿Cerrar sesión?',
      body: 'Tu progreso ya está guardado.',
      confirmLabel: 'Sí, cerrar',
      cancelLabel: 'Cancelar',
    });
    if (!yes) return;
    await store.logout();
    renderTopbar();
    navigate('/');
    rerender();
    toast('Sesión cerrada');
  });
}

/* ------------------------------ render ------------------------------- */
export async function rerender() {
  const app = document.getElementById('app');
  await render(app);
}

afterRender(() => {
  renderTopbar();
});

async function boot() {
  const params = new URLSearchParams(location.search);
  if (params.get('token')) {
    const { setToken } = await import('./api.js');
    setToken(params.get('token'));
    history.replaceState(null, '', location.pathname + location.hash);
  }
  await store.boot();
  renderTopbar();
  if (!location.hash) location.hash = '#/';
  await rerender();
  if (store.user) store.startHeartbeat();
  window.addEventListener('hashchange', async () => {
    await rerender();
  });
  // refresco suave de puntos al volver a la pestaña
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible' && store.user) {
      try { await store.refresh(); renderTopbar(); } catch {}
    }
  });
}

boot().catch((e) => {
  console.error(e);
  document.getElementById('app').innerHTML =
    '<div class="card card--pad" style="max-width:520px;margin:40px auto"><h2>Algo salió mal</h2><p class="muted">Recarga la página para intentarlo de nuevo.</p></div>';
});

/* re-export para las vistas */
export { navigate, currentPath, resolve };
