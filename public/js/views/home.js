/* views/home.js */
import { store } from '../store.js';
import { esc, icon, badgePill, toast } from '../ui.js';
import { openLogin } from './login.js';
import { renderTopbar, rerender } from '../app.js';

const LEVELS = [
  { min: 0, name: 'Aprendiz' },
  { min: 50, name: 'Explorador' },
  { min: 130, name: 'Constructor' },
  { min: 220, name: 'Maestro' },
];

function levelOf(points) {
  let cur = LEVELS[0];
  for (const l of LEVELS) if (points >= l.min) cur = l;
  const next = LEVELS.find((l) => l.min > points);
  const from = cur.min;
  const to = next ? next.min : cur.min;
  const pct = next ? Math.round(((points - from) / (to - from)) * 100) : 100;
  return { name: cur.name, next: next ? next.name : null, pct, to };
}

function labCard({ lab, title, desc, cls, art, p }) {
  const pct = p ? Math.max(0, Math.min(100, p.pct || 0)) : 0;
  const done = pct >= 100;
  const badge = p ? p.badge : null;
  const guest = store.isGuest || !store.user;
  return `
  <article class="lab-card lab-card--${cls}">
    <div class="lab-card__art">${art}</div>
    <div>
      <h2>${esc(title)}</h2>
      <p style="margin-top:6px">${esc(desc)}</p>
    </div>
    <div class="lab-card__foot">
      ${guest ? '' : `
        <div style="flex:1 1 150px;min-width:140px">
          <div class="progress"><div class="progress__fill" style="--v:${pct}%"></div></div>
          <div class="progress-meta"><span>${pct}% de avance</span>${badge ? badgePill(badge) : ''}</div>
        </div>`}
      <a class="btn ${done ? 'btn--ghost' : 'btn--accent'}" href="#/lab/${lab}">
        ${done ? 'Repetir' : 'Entrar'}${icon('arrow', 16)}
      </a>
      <button class="btn btn--quiet btn--sm" data-free="${lab}">Modo libre</button>
    </div>
  </article>`;
}

export function viewHome() {
  const role = store.role;
  const user = store.user;
  const firstName = user ? user.name.split(' ')[0] : 'invitado';

  if (role === 'docente' || role === 'superadmin') {
    const el = document.createElement('div');
    el.innerHTML = `
      <div class="home-head" style="position:relative">
        <p class="eyebrow">Panel de ${role === 'superadmin' ? 'superadmin' : 'docente'}</p>
        <h1>Hola, ${esc(firstName)}</h1>
        <p class="lede">Gestiona tus grupos, revisa el avance de tus estudiantes y envíales mensajes.</p>
        <svg class="doodle doodle--head" viewBox="0 0 120 60" aria-hidden="true">
          <path d="M8 50 Q32 12 60 38 T112 22" stroke="rgba(62,107,90,.24)" stroke-width="2" fill="none" stroke-linecap="round"/>
          <circle cx="60" cy="38" r="3.2" fill="#3e6b5a" fill-opacity=".3"/>
          <rect x="24" y="14" width="12" height="12" rx="2" fill="#2f5d8a" fill-opacity=".14"/>
        </svg>
        <svg class="doodle doodle--head2" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 2v20M2 12h20M5 5l14 14M19 5 5 19" stroke="rgba(180,68,44,.2)" stroke-width="1.6" stroke-linecap="round"/>
        </svg>
      </div>
      <div class="row" style="margin-bottom:14px;gap:8px;flex-wrap:wrap">
        <button class="btn btn--accent" id="heroNewGroup">${icon('plus', 16)} Crear grupo</button>
        <a class="btn btn--ghost" href="#/compartir">${icon('target', 16)} Compartir acceso</a>
      </div>
      <div class="grid-3">
        <a class="card card--pad" href="#/${role === 'superadmin' ? 'admin/grupos' : 'docente'}" style="text-decoration:none;color:inherit">
          <div class="chip">${icon('grid', 14)} Grupos</div>
          <h3 style="margin-top:10px">${role === 'superadmin' ? 'Todos los grupos' : 'Mis grupos'}</h3>
          <p class="small muted" style="margin:0">Crea grupos, comparte el código y mira el tablero.</p>
        </a>
        ${role === 'superadmin' ? `
        <a class="card card--pad" href="#/admin/cuentas" style="text-decoration:none;color:inherit">
          <div class="chip">${icon('shield', 14)} Cuentas</div>
          <h3 style="margin-top:10px">Roles</h3>
          <p class="small muted" style="margin:0">Promueve estudiantes a docentes.</p>
        </a>
        <a class="card card--pad" href="#/admin/ranking" style="text-decoration:none;color:inherit">
          <div class="chip">${icon('trophy', 14)} Ranking</div>
          <h3 style="margin-top:10px">Global</h3>
          <p class="small muted" style="margin:0">Todos los estudiantes de todos los grupos.</p>
        </a>` : `
        <a class="card card--pad" href="#/mensajes" style="text-decoration:none;color:inherit">
          <div class="chip">${icon('mail', 14)} Mensajes</div>
          <h3 style="margin-top:10px">Mensajes</h3>
          <p class="small muted" style="margin:0">Lo que has enviado a tus grupos.</p>
        </a>`}
      </div>`;
    el.querySelector('#heroNewGroup')?.addEventListener('click', async () => {
      const { openCreateGroup } = await import('./groupForm.js');
      openCreateGroup(() => { location.hash = role === 'superadmin' ? '#/admin/grupos' : '#/docente'; });
    });
    return el;
  }

  const lvl = levelOf(store.points);
  const guest = store.isGuest;
  const anon = role === 'anon';

  const el = document.createElement('div');

  const doodleHero = `
    <svg class="doodle doodle--1" viewBox="0 0 90 90" aria-hidden="true">
      <circle cx="26" cy="30" r="16" stroke="#b4442c" stroke-opacity=".28" stroke-width="2" fill="none"/>
      <path d="M10 74 L34 44 L52 66 L66 48 L82 74 Z" fill="#3e6b5a" fill-opacity=".16"/>
      <path d="M8 80 H82" stroke="#191714" stroke-opacity=".18" stroke-width="1.6" stroke-linecap="round"/>
    </svg>
    <svg class="doodle doodle--2" viewBox="0 0 70 70" aria-hidden="true">
      <rect x="6" y="28" width="22" height="22" rx="3" fill="#2f5d8a" fill-opacity=".2"/>
      <rect x="30" y="14" width="10" height="10" rx="2" fill="#d8a84e" fill-opacity=".5"/>
      <rect x="42" y="36" width="18" height="6" rx="2" fill="#3e6b5a" fill-opacity=".35"/>
      <circle cx="34" cy="52" r="5" stroke="#b4442c" stroke-opacity=".35" stroke-width="2" fill="none"/>
    </svg>`;

  const hero = anon
    ? `<div class="card card--pad home-hero" style="margin-bottom:22px;text-align:center;padding:clamp(24px,3.2vw,32px) 20px">
         ${doodleHero}
         <p class="eyebrow">Un espacio para experimentar con las matemáticas</p>
         <h1 style="max-width:18ch;margin:0 auto 8px;font-size:clamp(27px,3.6vw,38px)">Las matemáticas se aprenden tocándolas.</h1>
         <p class="lede" style="margin:0 auto 16px;max-width:56ch;font-size:15px">Arma rectángulos, factoriza expresiones y descubre por qué funciona. Sin registro para probar.</p>
         <div class="row" style="justify-content:center;gap:10px">
           <button class="btn btn--accent" id="heroLogin">Iniciar sesión</button>
           <button class="btn btn--ghost" id="heroGuest">Probar como invitado</button>
         </div>
       </div>`
    : '';

  const notice = guest
    ? `<div class="notice notice--warn" style="margin-bottom:14px">
         ${icon('lock', 16)}
         <div><strong>Estás como invitado.</strong> Tu progreso no se guardará. Inicia sesión para guardarlo.</div>
       </div>`
    : '';

  const header = anon
    ? `<div style="margin-bottom:12px"><p class="eyebrow" style="margin-bottom:2px">Laboratorios</p></div>`
    : `<div class="home-head" style="margin-bottom:12px;position:relative;overflow:visible">
         <p class="eyebrow">Tu laboratorio</p>
         <h1 style="font-size:clamp(24px,3.2vw,32px)">Hola, ${esc(firstName)}</h1>
         <svg class="doodle doodle--head" viewBox="0 0 120 60" aria-hidden="true">
           <path d="M6 52 Q30 8 58 40 T114 26" stroke="rgba(180,68,44,.22)" stroke-width="2" fill="none" stroke-linecap="round"/>
           <circle cx="58" cy="40" r="3.4" fill="#b4442c" fill-opacity=".26"/>
           <circle cx="96" cy="30" r="2.6" fill="#3e6b5a" fill-opacity=".3"/>
           <rect x="20" y="14" width="12" height="12" rx="2" fill="#2f5d8a" fill-opacity=".14"/>
         </svg>
         <svg class="doodle doodle--head2" viewBox="0 0 24 24" aria-hidden="true">
           <path d="M12 2v20M2 12h20M5 5l14 14M19 5 5 19" stroke="rgba(62,107,90,.22)" stroke-width="1.6" stroke-linecap="round"/>
         </svg>
       </div>`;

  const groupLine = store.group
    ? `<span class="chip chip--sage">${icon('users', 13)} ${esc(store.group.name)}</span>
       <span class="small muted">${esc(store.group.teacher_name)}</span>
       <a class="small" href="#/grupo">ver</a>`
    : store.user
      ? `<span class="chip chip--accent">${icon('users', 13)} Sin grupo</span>
         <span class="small muted">Pídele el código a tu profe.</span>
         <a class="small" href="#/grupo">Unirme a un grupo</a>`
      : '';

  const quick = store.user
    ? `<div class="row" style="gap:4px;flex-wrap:wrap">
         <a class="btn btn--quiet btn--sm" href="#/ranking">${icon('trophy', 14)} Ranking</a>
         <a class="btn btn--quiet btn--sm" href="#/grupo">${icon('users', 14)} Mi grupo</a>
         <a class="btn btn--quiet btn--sm" href="#/mensajes">${icon('mail', 14)} Mensajes</a>
       </div>`
    : '';

  const levelCard = store.user
    ? `<div class="card" style="margin-bottom:16px;padding:14px 16px;display:flex;gap:16px;align-items:center;flex-wrap:wrap">
        <div style="flex:1 1 240px;min-width:200px">
          <div class="row" style="gap:8px;margin-bottom:6px">
            <span class="small muted">Nivel</span>
            <strong style="font-size:15px">${lvl.name}</strong>
            <span class="topbar__pts">${store.points} pts</span>
            ${lvl.next ? `<span class="small muted">· faltan ${lvl.to - store.points} para ${lvl.next}</span>` : ''}
          </div>
          <div class="progress"><div class="progress__fill" style="--v:${lvl.pct}%"></div></div>
        </div>
        <div class="row" style="gap:5px;flex-wrap:wrap;flex:0 1 auto">
          ${store.badges.length
            ? store.badges.slice(0, 5).map((b) => badgePill(b.key)).join('')
            : '<span class="small muted">Aún sin insignias</span>'}
        </div>
      </div>`
    : '';

  el.innerHTML = `
    ${hero}
    ${notice}
    ${header}
    ${groupLine || quick ? `<div class="row" style="gap:10px;margin-bottom:12px;flex-wrap:wrap">${groupLine}${quick}</div>` : ''}
    ${levelCard}
    <div class="row" style="margin:4px 0 16px;gap:10px;align-items:center">
      <svg width="54" height="10" viewBox="0 0 54 10" aria-hidden="true">
        <path d="M1 6 Q14 1 27 5 T53 4" stroke="rgba(25,23,20,.18)" stroke-width="1.6" fill="none" stroke-linecap="round"/>
      </svg>
      <span class="tiny muted">dos laboratorios, cinco fases cada uno</span>
      <svg width="54" height="10" viewBox="0 0 54 10" aria-hidden="true" style="transform:scaleX(-1)">
        <path d="M1 6 Q14 1 27 5 T53 4" stroke="rgba(25,23,20,.18)" stroke-width="1.6" fill="none" stroke-linecap="round"/>
      </svg>
    </div>
    <div class="lab-grid">
      ${labCard({
        lab: 'factorizacion',
        title: 'Factorización',
        desc: 'Construye áreas, factoriza expresiones y descubre por qué funciona.',
        cls: 'f',
        art: `<div class="mini-tiles">
                <div class="mini-tile mini-tile--x2"></div>
                <div class="mini-tile mini-tile--x"></div>
                <div class="mini-tile mini-tile--one"></div>
              </div>`,
        p: store.getLab('factorizacion'),
      })}
      ${labCard({
        lab: 'razon',
        title: 'Razón y proporción',
        desc: 'Recetas, obras, mapas y velocidad: descubre cómo cambian las cantidades.',
        cls: 'r',
        art: `<div class="bars-art"><span></span><span></span><span></span><span></span><span></span></div>`,
        p: store.getLab('razon'),
      })}
    </div>`;

  el.querySelectorAll('[data-free]').forEach((b) =>
    b.addEventListener('click', () => {
      store.freeRequest = b.dataset.free;
      location.hash = '#/lab/' + b.dataset.free;
    })
  );
  el.querySelector('#heroLogin')?.addEventListener('click', () => openLogin());
  el.querySelector('#heroGuest')?.addEventListener('click', async () => {
    store.enterGuest();
    toast('Modo invitado. Tu progreso no se guardará.');
    await rerender();
    renderTopbar();
  });

  return el;
}
