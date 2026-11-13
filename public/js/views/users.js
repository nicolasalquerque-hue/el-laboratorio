/* views/users.js — Usuarios: docentes ven a sus estudiantes, superadmin ve todo */
import { store } from '../store.js';
import { api } from '../api.js';
import { esc, icon, toast, confirmDialog, fmtDate, fmtRelative, debounce, setBusy } from '../ui.js';

const ROLE_CHIP = {
  estudiante: '<span class="chip">estudiante</span>',
  docente: '<span class="chip chip--sage">docente</span>',
  superadmin: '<span class="chip chip--gold">superadmin</span>',
};

export function viewUsers() {
  const el = document.createElement('div');
  const isAdmin = store.role === 'superadmin';

  el.innerHTML = `
    <div class="home-head">
      <p class="eyebrow">${isAdmin ? 'Superadmin' : 'Docente'}</p>
      <h1>Usuarios</h1>
      <p class="lede">${isAdmin
        ? 'Todas las cuentas registradas. Puedes promover a docente o devolver a estudiante.'
        : 'Las y los estudiantes de tus grupos. Esta lista es de solo lectura.'}</p>
    </div>
    <div class="row" style="margin-bottom:14px;gap:10px">
      <input class="input" id="q" placeholder="Buscar por nombre o correo…" style="max-width:340px">
      <span class="chip" id="count">—</span>
    </div>
    <div id="list"><div class="skeleton" style="height:140px"></div></div>`;

  const list = el.querySelector('#list');
  const q = el.querySelector('#q');
  const count = el.querySelector('#count');
  let users = [];

  async function reload() {
    const r = await api.get('/users');
    users = r.users || [];
    draw();
  }

  function draw() {
    const term = q.value.trim().toLowerCase();
    const rows = users.filter((u) => !term || (u.name || '').toLowerCase().includes(term) || (u.email || '').toLowerCase().includes(term));
    count.textContent = `${rows.length} ${rows.length === 1 ? 'cuenta' : 'cuentas'}`;
    if (!rows.length) {
      list.innerHTML = `<div class="card card--pad center" style="padding:30px">
        <p class="muted" style="margin:0">${users.length ? 'Ningún resultado.' : 'Todavía no hay usuarios registrados.'}</p></div>`;
      return;
    }
    list.innerHTML = `
      <div class="table-wrap"><table class="table">
        <thead><tr>
          <th>Nombre</th><th>Correo</th><th>Rol</th>
          ${isAdmin ? '<th>Registro</th><th>Último acceso</th><th>Puntos</th><th></th>' : '<th>Grupo</th><th>Puntos</th>'}
        </tr></thead>
        <tbody>${rows.map((u) => `
          <tr data-id="${u.id}">
            <td data-label="Nombre"><strong>${esc(u.name)}</strong></td>
            <td data-label="Correo"><span class="small">${esc(u.email)}</span></td>
            <td data-label="Rol">${ROLE_CHIP[u.role] || esc(u.role)}</td>
            ${isAdmin ? `
              <td data-label="Registro"><span class="small muted">${fmtDate(u.created_at)}</span></td>
              <td data-label="Último acceso"><span class="small muted">${fmtRelative(u.last_seen)}</span></td>
              <td data-label="Puntos"><span class="mono">${u.points || 0}</span></td>
              <td data-label="Acción">
                ${u.role === 'superadmin'
                  ? '<span class="small muted">—</span>'
                  : `<button class="btn btn--ghost btn--sm" data-role="${u.id}" data-to="${u.role === 'docente' ? 'estudiante' : 'docente'}">
                       ${u.role === 'docente' ? 'Quitar docente' : 'Hacer docente'}</button>`}
              </td>` : `
              <td data-label="Grupo"><span class="small">${esc(u.group || '—')}</span></td>
              <td data-label="Puntos"><span class="mono">${u.points || 0}</span></td>`}
          </tr>`).join('')}
        </tbody>
      </table></div>`;

    list.querySelectorAll('[data-role]').forEach((b) =>
      b.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = Number(b.dataset.role);
        const to = b.dataset.to;
        const target = users.find((x) => x.id === id);
        const yes = await confirmDialog({
          title: 'Cambiar rol',
          body: `¿Seguro que quieres cambiar el rol de ${esc(target.name)} a ${to}?`,
          confirmLabel: 'Sí, cambiar',
        });
        if (!yes) return;
        setBusy(b, true);
        try {
          await api.post(`/admin/users/${id}/role`, { role: to });
          toast(`Rol actualizado a ${to}`, 'ok');
          await reload();
        } catch (err) {
          toast(err.message, 'err');
          setBusy(b, false);
        }
      })
    );
  }

  q.addEventListener('input', debounce(draw, 140));
  reload().catch((e) => {
    list.innerHTML = `<div class="card card--pad"><p class="muted">${esc(e.message)}</p></div>`;
  });
  return el;
}
