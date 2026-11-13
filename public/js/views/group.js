/* views/group.js — Mi grupo */
import { store } from '../store.js';
import { api } from '../api.js';
import { esc, icon, toast, setBusy, confirmDialog } from '../ui.js';
import { rerender } from '../app.js';
import { openLogin } from './login.js';

export function viewGroup() {
  const el = document.createElement('div');

  if (!store.user) {
    el.innerHTML = `
      <div class="home-head">
        <p class="eyebrow">Mi grupo</p>
        <h1>Necesitas una cuenta</h1>
        <p class="lede">Como invitado no puedes unirte a un grupo ni aparecer en el panel de tu profe. Inicia sesión para entrar con el código que te dio.</p>
      </div>
      <div class="row">
        <button class="btn btn--accent" id="login">${icon('user', 16)} Iniciar sesión</button>
        <a class="btn btn--ghost" href="#/">Volver al inicio</a>
      </div>`;
    el.querySelector('#login').addEventListener('click', () => openLogin());
    return el;
  }

  const g = store.group;

  if (g) {
    el.innerHTML = `
      <div class="home-head">
        <p class="eyebrow">Mi grupo</p>
        <h1>${esc(g.name)}</h1>
        <p class="lede">Estás en el grupo de ${esc(g.teacher_name)}${g.grade ? ` · ${esc(g.grade)}` : ''}. Tu profe ve tu avance aquí.</p>
      </div>
      <div class="grid-2">
        <div class="card card--pad">
          <p class="eyebrow">Código del grupo</p>
          <div class="row" style="gap:10px">
            <span class="mono" style="font-size:22px;letter-spacing:.1em">${esc(g.code || '—')}</span>
            <button class="btn btn--ghost btn--sm" id="copy">${icon('copy', 15)} Copiar</button>
          </div>
          <p class="small muted" style="margin-top:10px">Compártelo con un compañero para que se una.</p>
        </div>
        <div class="card card--pad">
          <p class="eyebrow">Tu avance</p>
          <p class="small muted">Los laboratorios, los puntos y las insignias están en tu Home.</p>
          <a class="btn btn--ghost btn--sm" href="#/">Ir al Home</a>
        </div>
      </div>
      <div class="card card--pad" style="margin-top:18px">
        <p class="eyebrow">Salir del grupo</p>
        <p class="small muted">Puedes salir cuando quieras. Tu progreso se conserva, pero dejarás de aparecer en el panel de tu profe.</p>
        <button class="btn btn--ghost btn--sm" id="leave">Salir del grupo</button>
      </div>`;

    el.querySelector('#copy')?.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(g.code);
        toast('Código copiado', 'ok');
      } catch {
        toast('No se pudo copiar. Escribe el código a mano.');
      }
    });
    el.querySelector('#leave')?.addEventListener('click', async () => {
      const yes = await confirmDialog({
        title: `¿Salir de ${g.name}?`,
        body: 'Tu progreso se conserva, pero dejarás de aparecer en el panel de tu profe.',
        confirmLabel: 'Sí, salir',
        cancelLabel: 'Cancelar',
        danger: true,
      });
      if (!yes) return;
      await api.post('/group/leave');
      await store.refresh();
      toast('Saliste del grupo');
      await rerender();
    });
    return el;
  }

  el.innerHTML = `
    <div class="home-head">
      <p class="eyebrow">Mi grupo</p>
      <h1>Únete con el código</h1>
      <p class="lede">Tu profe te da un código de 8 caracteres. Con él entras al grupo y tu avance aparece en su panel.</p>
    </div>
    <div class="card card--pad" style="max-width:520px">
      <div class="field">
        <label class="label" for="code">Código del grupo</label>
        <input class="input input--code" id="code" placeholder="LAB-7K2Q" maxlength="12" autocomplete="off" spellcheck="false">
        <div class="field-error" id="err"></div>
      </div>
      <button class="btn btn--accent btn--block" id="join">Unirme</button>
      <p class="small muted" style="margin:12px 0 0">Si no tienes código, pídeselo a tu profe. Mientras tanto puedes hacer los laboratorios igual.</p>
    </div>`;

  const input = el.querySelector('#code');
  const err = el.querySelector('#err');
  const btn = el.querySelector('#join');

  input.addEventListener('input', () => {
    err.textContent = '';
    input.value = input.value.toUpperCase();
  });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') btn.click(); });

  btn.addEventListener('click', async () => {
    const code = input.value.trim();
    err.textContent = '';
    if (!code) {
      err.textContent = 'Escribe el código que te dio tu profe.';
      input.focus();
      return;
    }
    setBusy(btn, true);
    try {
      const r = await api.post('/group/join', { code });
      await store.refresh();
      toast(`Listo, ahora estás en ${r.group.name}.`, 'ok');
      await rerender();
    } catch (e) {
      err.textContent = e.message;
      setBusy(btn, false);
    }
  });

  return el;
}
