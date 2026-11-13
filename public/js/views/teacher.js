/* views/teacher.js — panel de docente: grupos, tablero, detalle, ranking y mensajes */
import { store } from '../store.js';
import { api } from '../api.js';
import {
  esc, icon, toast, modal, confirmDialog, fmtSeconds, fmtDate, fmtRelative,
  badgePill, BADGE_LABEL, setBusy,
} from '../ui.js';
import { rankingBlock } from './ranking.js';
import { openCreateGroup } from './groupForm.js';

/* ----------------------------- lista de grupos ---------------------------- */
export function viewTeacherGroups() {
  const el = document.createElement('div');
  const isAdmin = store.role === 'superadmin';

  el.innerHTML = `
    <div class="home-head">
      <p class="eyebrow">${isAdmin ? 'Superadmin' : 'Docente'}</p>
      <h1>${isAdmin ? 'Todos los grupos' : 'Mis grupos'}</h1>
      <p class="lede">${isAdmin ? 'Los grupos de todos los docentes.' : 'Crea un grupo, comparte el código y sigue el avance de tus estudiantes.'}</p>
    </div>
    <div class="row" style="margin-bottom:16px">
      <button class="btn btn--accent" id="newGroup">${icon('plus', 16)} Crear grupo</button>
    </div>
    <div id="groups"></div>`;

  const host = el.querySelector('#groups');

  async function load() {
    host.innerHTML = `<div class="grid-3"><div class="skeleton" style="height:120px"></div><div class="skeleton" style="height:120px"></div></div>`;
    try {
      const r = await api.get('/teacher/groups');
      if (!r.groups.length) {
        host.innerHTML = `<div class="card card--pad center" style="padding:34px">
          <p class="muted" style="margin:0 0 12px">Aún no tienes grupos. Crea el primero para empezar.</p>
          <button class="btn btn--accent" id="newGroup2">Crear grupo</button></div>`;
        host.querySelector('#newGroup2')?.addEventListener('click', openNewGroup);
        return;
      }
      host.innerHTML = `<div class="grid-3">${r.groups
        .map(
          (g) => `
        <article class="card card--pad" style="display:flex;flex-direction:column;gap:8px">
          <div class="row row--between" style="gap:8px">
            <h3 style="font-size:18px">${esc(g.name)}</h3>
            ${g.students === 0 ? '<span class="chip small">Vacío</span>' : `<span class="chip small">${g.students} est.</span>`}
          </div>
          <div class="small muted">${esc(g.grade || 'Sin grado')}${isAdmin && g.teacher_name ? ' · ' + esc(g.teacher_name) : ''}</div>
          <div class="row" style="gap:6px;margin-top:4px">
            <span class="mono small" style="letter-spacing:.08em">${esc(g.code)}</span>
            <button class="btn btn--quiet btn--sm" data-copy="${esc(g.code)}" title="Copiar código">${icon('copy', 14)}</button>
          </div>
          <a class="btn btn--ghost btn--sm" href="#/${isAdmin ? 'admin/grupos' : 'docente'}/grupo/${g.id}" style="margin-top:auto">Entrar al panel</a>
        </article>`
        )
        .join('')}</div>`;

      host.querySelectorAll('[data-copy]').forEach((b) =>
        b.addEventListener('click', async (e) => {
          e.preventDefault();
          try {
            await navigator.clipboard.writeText(b.dataset.copy);
            toast('Código copiado', 'ok');
          } catch { toast('No se pudo copiar.'); }
        })
      );
    } catch (e) {
      host.innerHTML = `<div class="card card--pad"><p class="muted">${esc(e.message)}</p></div>`;
    }
  }

  function openNewGroup() { openCreateGroup(load); }

  el.querySelector('#newGroup').addEventListener('click', openNewGroup);
  load();
  return el;
}

/* ------------------------------ panel de grupo ---------------------------- */
export function viewGroupPanel({ params }) {
  const el = document.createElement('div');
  const groupId = Number(params.id);
  const base = store.role === 'superadmin' ? '#/admin/grupos' : '#/docente';

  el.innerHTML = `<div class="skeleton" style="height:180px"></div>`;
  let data = null;
  let tab = 'progreso';
  let sort = { key: 'name', dir: 1 };

  async function load() {
    try {
      data = await api.get(`/teacher/groups/${groupId}`);
    } catch (e) {
      el.innerHTML = `<div class="card card--pad"><h2>${esc(e.message)}</h2>
        <a class="btn btn--ghost" href="${base}" style="margin-top:12px">Volver</a></div>`;
      return;
    }
    render();
  }

  function render() {
    const g = data.group;
    const isOwner = store.role !== 'superadmin' || g.teacher_id === store.user.id;
    el.innerHTML = `
      <div class="row" style="margin-bottom:10px">
        <a class="btn btn--quiet btn--sm" href="${base}">${icon('chevron', 14)} Volver</a>
      </div>
      <div class="home-head" style="margin-bottom:16px">
        <p class="eyebrow">${esc(g.grade || 'Grupo')}</p>
        <h1>${esc(g.name)}</h1>
        <div class="row" style="gap:8px;margin-top:8px">
          <span class="chip">${icon('users', 14)} ${g.students} ${g.students === 1 ? 'estudiante' : 'estudiantes'}</span>
          <span class="chip chip--sage mono" style="letter-spacing:.08em">${esc(g.code)}</span>
          <button class="btn btn--quiet btn--sm" id="copyCode" title="Copiar código">${icon('copy', 14)}</button>
          <button class="btn btn--ghost btn--sm" id="sendMsg">${icon('mail', 15)} Enviar mensaje al grupo</button>
          ${g.teacher_id === store.user.id ? `<button class="btn btn--quiet btn--sm" id="archive">${icon('trash', 14)} Archivar grupo</button>` : ''}
        </div>
      </div>
      <div class="tabs" style="margin-bottom:16px">
        <button class="tab ${tab === 'progreso' ? 'on' : ''}" data-tab="progreso">Progreso</button>
        <button class="tab ${tab === 'detalle' ? 'on' : ''}" data-tab="detalle">Detalle por estudiante</button>
        <button class="tab ${tab === 'ranking' ? 'on' : ''}" data-tab="ranking">Ranking del grupo</button>
      </div>
      <div id="tabBody"></div>`;

    el.querySelectorAll('.tab').forEach((b) =>
      b.addEventListener('click', () => { tab = b.dataset.tab; render(); })
    );
    el.querySelector('#copyCode').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(g.code); toast('Código copiado', 'ok'); }
      catch { toast('No se pudo copiar.'); }
    });
    el.querySelector('#sendMsg').addEventListener('click', openMessageModal);
    el.querySelector('#archive')?.addEventListener('click', async () => {
      const yes = await confirmDialog({
        title: 'Archivar grupo',
        body: `¿Archivar ${esc(g.name)}? Dejará de aparecer en tu panel y sus estudiantes dejarán de verlo. No se borran los datos.`,
        confirmLabel: 'Archivar',
        danger: true,
      });
      if (!yes) return;
      await api.post(`/teacher/groups/${groupId}/archive`);
      toast('Grupo archivado', 'ok');
      location.hash = base;
    });

    const body = el.querySelector('#tabBody');
    if (tab === 'progreso') body.appendChild(progressTable());
    else if (tab === 'detalle') body.appendChild(detailTable());
    else body.appendChild(rankingBlock({ groupId, allowRange: true }));
  }

  function progressTable() {
    const wrap = document.createElement('div');
    const rows = [...data.students];
    const cmp = {
      name: (a, b) => a.name.localeCompare(b.name),
      points: (a, b) => a.points - b.points,
      badgeF: (a, b) => (a.factorizacion.badge || '').localeCompare(b.factorizacion.badge || ''),
      badgeR: (a, b) => (a.razon.badge || '').localeCompare(b.razon.badge || ''),
      pctF: (a, b) => a.factorizacion.pct - b.factorizacion.pct,
      pctR: (a, b) => a.razon.pct - b.razon.pct,
      last: (a, b) => String(a.last_seen).localeCompare(String(b.last_seen)),
    }[sort.key];
    if (cmp) rows.sort((a, b) => cmp(a, b) * sort.dir);

    if (!rows.length) {
      wrap.innerHTML = `<div class="card card--pad center" style="padding:30px"><p class="muted" style="margin:0">Todavía no hay estudiantes en este grupo. Comparte el código <strong>${esc(data.group.code)}</strong>.</p></div>`;
      return wrap;
    }

    wrap.innerHTML = `
      <div class="table-wrap"><table class="table">
        <thead><tr>
          <th data-s="name">Estudiante</th>
          <th data-s="points">Puntos</th>
          <th data-s="badgeF">Insignia F.</th>
          <th data-s="badgeR">Insignia R.</th>
          <th data-s="pctF">% Factorización</th>
          <th data-s="pctR">% Razón</th>
          <th data-s="last">Última conexión</th>
        </tr></thead>
        <tbody>
          ${rows.map((s) => `
            <tr data-student="${s.id}">
              <td data-label="Estudiante"><strong>${esc(s.name)}</strong></td>
              <td data-label="Puntos"><span class="mono">${s.points}</span></td>
              <td data-label="Insignia F.">${s.factorizacion.badge ? badgePill(s.factorizacion.badge) : '<span class="muted">—</span>'}</td>
              <td data-label="Insignia R.">${s.razon.badge ? badgePill(s.razon.badge) : '<span class="muted">—</span>'}</td>
              <td data-label="% Factorización">${s.factorizacion.pct}%</td>
              <td data-label="% Razón">${s.razon.pct}%</td>
              <td data-label="Última conexión"><span class="small muted">${fmtRelative(s.last_seen)}</span></td>
            </tr>`).join('')}
        </tbody>
      </table></div>
      <p class="small muted" style="margin-top:10px">Toca una fila para ver el detalle. Las columnas se ordenan al tocarlas.</p>`;

    wrap.querySelectorAll('th[data-s]').forEach((th) =>
      th.addEventListener('click', () => {
        const k = th.dataset.s;
        if (sort.key === k) sort.dir *= -1;
        else { sort.key = k; sort.dir = 1; }
        const host = wrap.parentElement;
        host.replaceChild(progressTable(), wrap);
      })
    );
    wrap.querySelectorAll('tr[data-student]').forEach((tr) =>
      tr.addEventListener('click', () => openStudent(Number(tr.dataset.student)))
    );
    return wrap;
  }

  function detailTable() {
    const wrap = document.createElement('div');
    if (!data.students.length) {
      wrap.innerHTML = `<div class="card card--pad center" style="padding:30px"><p class="muted" style="margin:0">No hay estudiantes todavía.</p></div>`;
      return wrap;
    }
    wrap.innerHTML = `
      <div class="stack">
        ${data.students.map((s) => `
          <article class="card card--pad" style="display:flex;gap:14px;align-items:center;flex-wrap:wrap">
            <div style="flex:1 1 220px">
              <strong>${esc(s.name)}</strong>
              <div class="small muted">${esc(s.email)}</div>
            </div>
            <div class="small muted" style="flex:0 1 auto">${fmtSeconds(s.total_seconds)} en la app</div>
            <button class="btn btn--ghost btn--sm" data-student="${s.id}">Ver detalle</button>
          </article>`).join('')}
      </div>`;
    wrap.querySelectorAll('[data-student]').forEach((b) =>
      b.addEventListener('click', () => openStudent(Number(b.dataset.student)))
    );
    return wrap;
  }

  async function openStudent(sid) {
    const m = modal({ title: 'Detalle del estudiante', body: `<div class="skeleton" style="height:140px"></div>`, wide: true });
    let d;
    try {
      d = await api.get(`/teacher/groups/${groupId}/students/${sid}`);
    } catch (e) {
      m.card.querySelector('.modal__body').innerHTML = `<p class="muted">${esc(e.message)}</p>`;
      return;
    }
    const s = d.student;
    const f = d.progress.factorizacion;
    const r = d.progress.razon;
    const retarAttempts = d.attempts.filter((a) => a.lab === 'factorizacion' && a.phase === 'retar');
    const openAnswers = d.attempts.filter((a) => a.phase === 'argumentar' && a.answer);

    m.card.querySelector('.modal__body').innerHTML = `
      <div class="grid-3" style="margin-bottom:16px">
        <div class="readout__cell"><div class="readout__k">Puntos</div><div class="readout__v">${s.points}</div></div>
        <div class="readout__cell"><div class="readout__k">Tiempo en la app</div><div class="readout__v">${fmtSeconds(s.total_seconds)}</div></div>
        <div class="readout__cell"><div class="readout__k">Última conexión</div><div class="readout__v" style="font-size:14px">${fmtRelative(s.last_seen)}</div></div>
      </div>
      <p class="small muted" style="margin:0 0 14px">${esc(s.email)} · registrado el ${fmtDate(s.created_at)}</p>

      <h3 style="margin-bottom:8px">Factorización</h3>
      <div class="card card--pad card--flat" style="margin-bottom:14px">
        ${f ? `
          <div class="row" style="gap:8px;margin-bottom:8px">
            ${f.badge ? badgePill(f.badge) : '<span class="chip">Sin insignia</span>'}
            <span class="chip">Mejor puntaje: ${f.best_score || 0}</span>
            <span class="chip">Fase actual: ${f.phase || 1}</span>
          </div>
          <div class="small muted" style="margin-bottom:8px">Reto ${(f.retar && f.retar.index != null ? f.retar.index + 1 : 0)} de 10 · pistas usadas: ${(f.retar && f.retar.hintsUsed) || 0}</div>
          ${retarAttempts.length ? `<div class="stack stack--sm">${retarAttempts.slice(0, 40).map((a) => `
            <div class="row" style="gap:8px;align-items:flex-start">
              <span class="chip" style="padding:2px 8px">${a.is_correct ? '✓' : '✕'}</span>
              <div style="flex:1">
                <div class="small"><strong>${esc(a.challenge_id)}</strong> → <span class="mono">${esc(a.answer || '—')}</span></div>
                <div class="tiny muted">intento ${a.attempt_no} · ${a.hints_used} pistas · ${a.points} pts</div>
              </div>
            </div>`).join('')}</div>` : '<p class="small muted" style="margin:0">Sin intentos registrados.</p>'}
        ` : '<p class="small muted" style="margin:0">Aún no ha entrado a este laboratorio.</p>'}
      </div>

      <h3 style="margin-bottom:8px">Razón y proporción</h3>
      <div class="card card--pad card--flat" style="margin-bottom:14px">
        ${r ? `
          <div class="row" style="gap:8px">
            ${r.badge ? badgePill(r.badge) : '<span class="chip">Sin insignia</span>'}
            <span class="chip">Mejor puntaje: ${r.best_score || 0}</span>
          </div>` : '<p class="small muted" style="margin:0">Aún no ha entrado a este laboratorio.</p>'}
      </div>

      <h3 style="margin-bottom:8px">Respuestas abiertas</h3>
      <div class="stack stack--sm" style="margin-bottom:14px">
        ${openAnswers.length
          ? openAnswers.slice(0, 8).map((a) => `<div class="feedback feedback--soft"><div class="tiny muted" style="margin-bottom:4px">${esc(a.challenge_id)}</div>${esc(a.answer)}</div>`).join('')
          : '<p class="small muted" style="margin:0">Sin respuestas abiertas.</p>'}
      </div>

      <h3 style="margin-bottom:8px">Historial de intentos</h3>
      <div class="table-wrap"><table class="table" style="min-width:0">
        <thead><tr><th>Fecha</th><th>Laboratorio</th><th>Fase</th><th>Reto</th><th>Puntos</th></tr></thead>
        <tbody>${d.attempts.slice(0, 40).map((a) => `<tr>
          <td data-label="Fecha"><span class="small">${fmtDate(a.created_at)}</span></td>
          <td data-label="Laboratorio">${esc(a.lab)}</td>
          <td data-label="Fase">${esc(a.phase)}</td>
          <td data-label="Reto">${esc(a.challenge_id)}</td>
          <td data-label="Puntos">${a.points}</td></tr>`).join('') || '<tr><td>Sin datos</td></tr>'}</tbody>
      </table></div>`;
  }

  function openMessageModal() {
    modal({
      title: 'Enviar mensaje al grupo',
      body: `
        <div class="field">
          <label class="label" for="mtitle">Título (opcional)</label>
          <input class="input" id="mtitle" maxlength="80" placeholder="Recordatorio">
        </div>
        <div class="field">
          <label class="label" for="mbody">Mensaje</label>
          <textarea class="textarea" id="mbody" maxlength="500" placeholder="Escribe el mensaje para el grupo…"></textarea>
          <div class="field-error" id="merr"></div>
          <div class="tiny muted"><span id="mcount">0</span>/500</div>
        </div>`,
      actions: [
        { label: 'Cancelar' },
        {
          label: 'Enviar',
          kind: 'primary',
          async onClick({ card }) {
            const title = card.querySelector('#mtitle').value.trim();
            const body = card.querySelector('#mbody').value.trim();
            const err = card.querySelector('#merr');
            if (!body) { err.textContent = 'Escribe el mensaje.'; return false; }
            try {
              await api.post(`/teacher/groups/${groupId}/messages`, { title, body });
              toast('Mensaje enviado al grupo', 'ok');
              return true;
            } catch (e) {
              err.textContent = e.message;
              return false;
            }
          },
        },
      ],
      onMount(card) {
        const ta = card.querySelector('#mbody');
        const c = card.querySelector('#mcount');
        ta.addEventListener('input', () => { c.textContent = ta.value.length; });
      },
    });
  }

  load();
  return el;
}
