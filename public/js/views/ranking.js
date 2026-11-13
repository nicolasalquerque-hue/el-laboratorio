/* views/ranking.js — ranking por grupo, con filtros */
import { store } from '../store.js';
import { api } from '../api.js';
import { esc, icon, badgePill, toast } from '../ui.js';
import { openLogin } from './login.js';

const LAB_LABEL = { '': 'Total', factorizacion: 'Factorización', razon: 'Razón y proporción' };
const RANGE_LABEL = { todo: 'Todo el tiempo', mes: 'Este mes', semana: 'Esta semana' };

export function rankingBlock({ groupId = null, allowLab = true, allowRange = true, allowGroupFilter = false, groups = [] } = {}) {
  const el = document.createElement('div');
  let state = { lab: '', range: 'todo', groupId };

  el.innerHTML = `
    <div class="rank-head">
      ${allowLab ? `<div class="segmented" data-f="lab">
        <button data-v="" class="on">Total</button>
        <button data-v="factorizacion">Factorización</button>
        <button data-v="razon">Razón y proporción</button>
      </div>` : ''}
      ${allowRange ? `<div class="segmented" data-f="range">
        <button data-v="todo" class="on">Todo el tiempo</button>
        <button data-v="mes">Este mes</button>
        <button data-v="semana">Esta semana</button>
      </div>` : ''}
      ${allowGroupFilter ? `<select class="select" data-f="groupId" style="max-width:260px">
        <option value="">Todos los grupos</option>
        ${groups.map((g) => `<option value="${g.id}">${esc(g.name)}</option>`).join('')}
      </select>` : ''}
    </div>
    <div id="rankBody"><div class="skeleton" style="height:120px"></div></div>`;

  const body = el.querySelector('#rankBody');

  el.querySelectorAll('.segmented').forEach((seg) => {
    seg.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      seg.querySelectorAll('button').forEach((x) => x.classList.remove('on'));
      b.classList.add('on');
      state[seg.dataset.f] = b.dataset.v;
      load();
    });
  });
  const sel = el.querySelector('select[data-f="groupId"]');
  sel?.addEventListener('change', () => {
    state.groupId = sel.value ? Number(sel.value) : null;
    load();
  });

  async function load() {
    body.innerHTML = `<div class="skeleton" style="height:120px"></div>`;
    try {
      const q = new URLSearchParams();
      if (state.lab) q.set('lab', state.lab);
      if (state.range) q.set('range', state.range);
      if (state.groupId) q.set('groupId', state.groupId);
      const r = await api.get('/ranking?' + q.toString());
      if (!r.rows.length) {
        body.innerHTML = `<div class="card card--pad center" style="padding:34px">
          <p class="muted" style="margin:0">Todavía no hay puntos en este grupo. ¡Sé el primero!</p>
        </div>`;
        return;
      }
      body.innerHTML = `<div class="rank-list">${r.rows
        .map(
          (row) => `
        <div class="rank-row ${row.pos <= 3 ? 'rank-row--' + row.pos : ''}">
          <div class="rank-pos">${row.pos <= 3 ? `<span class="medal">${row.pos}</span>` : '#' + row.pos}</div>
          <div class="rank-name">${esc(row.name)}${row.id === (store.user && store.user.id) ? ' <span class="chip" style="padding:1px 7px;font-size:10px">tú</span>' : ''}</div>
          <div class="rank-badges">${[...new Set((row.badges || []).map((b) => b.key))].slice(0, 4).map((k) => `<span class="badge-dot" style="background:var(--gold)" title="${esc(k)}"></span>`).join('')}</div>
          <div class="rank-pts">${row.points} pts</div>
        </div>`
        )
        .join('')}</div>
        <p class="small muted" style="margin-top:12px">${state.range !== 'todo' ? 'Puntos ganados en el periodo.' : 'Puntos totales.'} ${r.scope && r.scope !== 'global' ? 'Grupo: ' + esc(r.scope) : ''}</p>`;
    } catch (e) {
      body.innerHTML = `<div class="card card--pad"><p class="muted" style="margin:0">${esc(e.message)}</p>
        <button class="btn btn--ghost btn--sm" id="retry" style="margin-top:10px">Reintentar</button></div>`;
      body.querySelector('#retry')?.addEventListener('click', load);
    }
  }

  load();
  el.load = load;
  return el;
}

export function viewRanking() {
  const el = document.createElement('div');

  if (!store.user) {
    el.innerHTML = `
      <div class="home-head">
        <p class="eyebrow">Ranking</p>
        <h1>Necesitas una cuenta</h1>
        <p class="lede">El ranking es de tu grupo. Inicia sesión y únete con el código de tu profe para verlo.</p>
      </div>
      <div class="row">
        <button class="btn btn--accent" id="login">${icon('user', 16)} Iniciar sesión</button>
        <a class="btn btn--ghost" href="#/">Volver al inicio</a>
      </div>`;
    el.querySelector('#login').addEventListener('click', () => openLogin());
    return el;
  }

  if (!store.group) {
    el.innerHTML = `
      <div class="home-head">
        <p class="eyebrow">Ranking</p>
        <h1>Primero, tu grupo</h1>
        <p class="lede">El ranking se juega dentro del grupo. Pídele el código a tu profe y únete.</p>
      </div>
      <a class="btn btn--accent" href="#/grupo">${icon('users', 16)} Ir a Mi grupo</a>`;
    return el;
  }

  el.innerHTML = `
    <div class="home-head">
      <p class="eyebrow">Ranking del grupo</p>
      <h1>${esc(store.group.name)}</h1>
      <p class="lede">Puntos por laboratorio y por periodo. Los empates se resuelven por insignias y antigüedad.</p>
    </div>
    <div id="rankHost"></div>`;

  el.querySelector('#rankHost').appendChild(rankingBlock({}));
  return el;
}
