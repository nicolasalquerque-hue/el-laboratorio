/* views/messages.js — mensajes del docente al grupo (solo lectura para el estudiante) */
import { store } from '../store.js';
import { api } from '../api.js';
import { esc, icon, fmtRelative, toast } from '../ui.js';
import { openLogin } from './login.js';

export function viewMessages() {
  const el = document.createElement('div');

  if (!store.user) {
    el.innerHTML = `
      <div class="home-head">
        <p class="eyebrow">Mensajes</p>
        <h1>Necesitas una cuenta</h1>
        <p class="lede">Los mensajes son de tu grupo. Inicia sesión para verlos.</p>
      </div>
      <button class="btn btn--accent" id="login">${icon('user', 16)} Iniciar sesión</button>`;
    el.querySelector('#login').addEventListener('click', () => openLogin());
    return el;
  }

  if (store.role !== 'estudiante') {
    el.innerHTML = `
      <div class="home-head">
        <p class="eyebrow">Mensajes</p>
        <h1>Mensajes a tus grupos</h1>
        <p class="lede">Envía y revisa los mensajes desde el panel de cada grupo.</p>
      </div>
      <a class="btn btn--accent" href="#/${store.role === 'superadmin' ? 'admin/grupos' : 'docente'}">${icon('grid', 16)} Ir a mis grupos</a>`;
    return el;
  }

  if (!store.group) {
    el.innerHTML = `
      <div class="home-head">
        <p class="eyebrow">Mensajes</p>
        <h1>Sin grupo, sin mensajes</h1>
        <p class="lede">Cuando te unas al grupo de tu profe, aquí aparecerán sus mensajes.</p>
      </div>
      <a class="btn btn--accent" href="#/grupo">${icon('users', 16)} Unirme a un grupo</a>`;
    return el;
  }

  el.innerHTML = `
    <div class="home-head">
      <p class="eyebrow">Mensajes</p>
      <h1>${esc(store.group.name)}</h1>
      <p class="lede">Mensajes de ${esc(store.group.teacher_name)}. Puedes leerlos, no responderlos.</p>
    </div>
    <div id="list"><div class="skeleton" style="height:110px"></div></div>`;

  const list = el.querySelector('#list');

  (async () => {
    try {
      const r = await api.get('/messages');
      if (!r.messages || !r.messages.length) {
        list.innerHTML = `<div class="card card--pad center" style="padding:34px">
          <p class="muted" style="margin:0">Tu profe aún no ha enviado mensajes.</p></div>`;
        return;
      }
      list.innerHTML = `<div class="stack">${r.messages
        .map(
          (m) => `
        <article class="card card--pad">
          <div class="row row--between" style="gap:8px;margin-bottom:6px">
            <h3 style="font-size:17px">${esc(m.title || 'Mensaje')}</h3>
            <span class="small muted">${fmtRelative(m.created_at)}</span>
          </div>
          <p style="margin:0 0 8px;white-space:pre-wrap">${esc(m.body)}</p>
          <span class="small muted">${esc(m.author_name)}</span>
        </article>`
        )
        .join('')}</div>`;
    } catch (e) {
      list.innerHTML = `<div class="card card--pad"><p class="muted">${esc(e.message)}</p></div>`;
    }
  })();

  return el;
}
