/* views/admin.js — superadmin: grupos, cuentas y ranking global */
import { store } from '../store.js';
import { api } from '../api.js';
import { esc, icon, toast, confirmDialog, fmtDate, fmtRelative, badgePill, debounce, setBusy } from '../ui.js';
import { rankingBlock } from './ranking.js';
import { openCreateGroup } from './groupForm.js';

export function viewAdminGroups() {
  const el = document.createElement('div');
  el.innerHTML = `
    <div class="home-head">
      <p class="eyebrow">Superadmin</p>
      <h1>Todos los grupos</h1>
      <p class="lede">Grupos de todos los docentes. Entra a cualquiera para ver el tablero.</p>
    </div>
    <div class="row" style="margin-bottom:14px;gap:10px">
      <input class="input" id="q" placeholder="Buscar grupo o docente…" style="max-width:320px">
      <button class="btn btn--accent" id="newGroup">${icon('plus', 16)} Crear grupo</button>
    </div>
    <div id="list"><div class="skeleton" style="height:120px"></div></div>`;

  const list = el.querySelector('#list');
  const q = el.querySelector('#q');
  let groups = [];

  function draw() {
    const term = q.value.trim().toLowerCase();
    const rows = groups.filter(
      (g) => !term || g.name.toLowerCase().includes(term) || (g.teacher_name || '').toLowerCase().includes(term)
    );
    if (!rows.length) {
      list.innerHTML = `<div class="card card--pad center" style="padding:30px"><p class="muted" style="margin:0">No hay grupos que coincidan.</p></div>`;
      return;
    }
    list.innerHTML = `<div class="grid-3">${rows.map((g) => `
      <article class="card card--pad" style="display:flex;flex-direction:column;gap:6px">
        <h3 style="font-size:17px">${esc(g.name)}</h3>
        <div class="small muted">${esc(g.grade || 'Sin grado')} · ${g.students} estudiantes</div>
        <div class="small">${esc(g.teacher_name)} <span class="muted">· ${esc(g.teacher_email)}</span></div>
        <div class="row" style="gap:6px;margin-top:4px">
          <span class="mono small">${esc(g.code)}</span>
          <button class="btn btn--quiet btn--sm" data-copy="${esc(g.code)}">${icon('copy', 14)}</button>
        </div>
        <a class="btn btn--ghost btn--sm" href="#/admin/grupos/grupo/${g.id}" style="margin-top:auto">Ver panel</a>
      </article>`).join('')}</div>`;
    list.querySelectorAll('[data-copy]').forEach((b) =>
      b.addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(b.dataset.copy); toast('Código copiado', 'ok'); }
        catch { toast('No se pudo copiar.'); }
      })
    );
  }

  async function reload() {
    try {
      const r = await api.get('/teacher/groups');
      groups = r.groups;
      draw();
    } catch (e) {
      list.innerHTML = `<div class="card card--pad"><p class="muted">${esc(e.message)}</p></div>`;
    }
  }
  reload();
  el.querySelector('#newGroup').addEventListener('click', () => openCreateGroup(() => reload()));

  q.addEventListener('input', debounce(draw, 150));
  return el;
}

export function viewAdminUsers() {
  const el = document.createElement('div');
  el.innerHTML = `
    <div class="home-head">
      <p class="eyebrow">Superadmin</p>
      <h1>Cuentas</h1>
      <p class="lede">Promueve a docente o regresa a estudiante. Tu propia cuenta no se puede cambiar.</p>
    </div>
    <div class="row" style="margin-bottom:14px">
      <input class="input" id="q" placeholder="Buscar por correo o nombre…" style="max-width:340px">
    </div>
    <div id="list"><div class="skeleton" style="height:140px"></div></div>`;

  const list = el.querySelector('#list');
  const q = el.querySelector('#q');
  let users = [];

  async function reload() {
    const r = await api.get('/admin/users');
    users = r.users;
    draw();
  }

  function draw() {
    const term = q.value.trim().toLowerCase();
    const rows = users.filter(
      (u) => !term || u.email.toLowerCase().includes(term) || u.name.toLowerCase().includes(term)
    );
    if (!rows.length) {
      list.innerHTML = `<div class="card card--pad center" style="padding:30px"><p class="muted" style="margin:0">Sin resultados.</p></div>`;
      return;
    }
    list.innerHTML = `
      <div class="table-wrap"><table class="table">
        <thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Registro</th><th>Último acceso</th><th>Puntos</th><th></th></tr></thead>
        <tbody>${rows.map((u) => `
          <tr>
            <td data-label="Nombre"><strong>${esc(u.name)}</strong></td>
            <td data-label="Correo"><span class="small">${esc(u.email)}</span></td>
            <td data-label="Rol">
              ${u.role === 'superadmin' ? '<span class="chip chip--gold">superadmin</span>'
                : u.role === 'docente' ? '<span class="chip chip--sage">docente</span>'
                : '<span class="chip">estudiante</span>'}
            </td>
            <td data-label="Registro"><span class="small muted">${fmtDate(u.created_at)}</span></td>
            <td data-label="Último acceso"><span class="small muted">${fmtRelative(u.last_seen)}</span></td>
            <td data-label="Puntos"><span class="mono">${u.points}</span></td>
            <td data-label="Acción">
              ${u.role === 'superadmin'
                ? '<span class="small muted">—</span>'
                : `<button class="btn btn--ghost btn--sm" data-role="${u.id}" data-to="${u.role === 'docente' ? 'estudiante' : 'docente'}">
                     ${u.role === 'docente' ? 'Quitar docente' : 'Hacer docente'}</button>`}
            </td>
          </tr>`).join('')}
        </tbody>
      </table></div>`;

    list.querySelectorAll('[data-role]').forEach((b) =>
      b.addEventListener('click', async () => {
        const id = Number(b.dataset.role);
        const to = b.dataset.to;
        const u = users.find((x) => x.id === id);
        const yes = await confirmDialog({
          title: 'Cambiar rol',
          body: `¿Seguro que quieres cambiar el rol de ${esc(u.name)} a ${to === 'docente' ? 'docente' : 'estudiante'}?`,
          confirmLabel: 'Sí, cambiar',
        });
        if (!yes) return;
        setBusy(b, true);
        try {
          await api.post(`/admin/users/${id}/role`, { role: to });
          toast(`Rol actualizado a ${to}`, 'ok');
          await reload();
        } catch (e) {
          toast(e.message, 'err');
          setBusy(b, false);
        }
      })
    );
  }

  q.addEventListener('input', debounce(draw, 150));
  reload().catch((e) => {
    list.innerHTML = `<div class="card card--pad"><p class="muted">${esc(e.message)}</p></div>`;
  });
  return el;
}

export function viewAdminRanking() {
  const el = document.createElement('div');
  el.innerHTML = `
    <div class="home-head">
      <p class="eyebrow">Superadmin</p>
      <h1>Ranking global</h1>
      <p class="lede">Todos los estudiantes de todos los grupos.</p>
    </div>
    <div id="host"><div class="skeleton" style="height:130px"></div></div>`;
  const host = el.querySelector('#host');
  (async () => {
    const r = await api.get('/teacher/groups');
    host.innerHTML = '';
    host.appendChild(rankingBlock({ allowGroupFilter: true, groups: r.groups }));
  })().catch((e) => {
    host.innerHTML = `<div class="card card--pad"><p class="muted">${esc(e.message)}</p></div>`;
  });
  return el;
}
