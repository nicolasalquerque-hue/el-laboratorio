/* views/groupForm.js — formulario compartido para crear grupos */
import { api } from '../api.js';
import { modal, toast, esc } from '../ui.js';

/**
 * Abre el modal de creación de grupo.
 * @param {(group:object)=>void} [onDone] se llama si el grupo se creó
 */
export function openCreateGroup(onDone) {
  return modal({
    title: 'Crear grupo',
    body: `
      <p class="muted" style="margin-top:-4px">Al crearlo se genera un código de invitación para tus estudiantes.</p>
      <div class="field">
        <label class="label" for="gname">Nombre del grupo</label>
        <input class="input" id="gname" maxlength="60" placeholder="10°A - 2026">
        <div class="field-error" id="gerr"></div>
      </div>
      <div class="field">
        <label class="label" for="ggrade">Grado o curso (opcional)</label>
        <input class="input" id="ggrade" maxlength="40" placeholder="10°A">
      </div>`,
    actions: [
      { label: 'Cancelar' },
      {
        label: 'Crear grupo',
        kind: 'primary',
        async onClick({ card }) {
          const name = card.querySelector('#gname').value.trim();
          const grade = card.querySelector('#ggrade').value.trim();
          const err = card.querySelector('#gerr');
          if (!name) {
            err.textContent = 'Ponle un nombre al grupo.';
            return false;
          }
          try {
            const r = await api.post('/teacher/groups', { name, grade });
            toast(`Grupo creado. Código: ${r.group.code}`, 'ok');
            if (onDone) onDone(r.group);
            return true;
          } catch (e) {
            err.textContent = e.message;
            return false;
          }
        },
      },
    ],
  });
}
