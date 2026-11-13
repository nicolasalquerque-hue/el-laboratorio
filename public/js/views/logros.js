/* views/logros.js — pantalla de Logros */
import { store } from '../store.js';
import { esc, icon, modal } from '../ui.js';
import { medalSVG, achievementCard, LAB_BADGES, BADGE_INFO } from '../badges.js';
import { openLogin } from './login.js';

const LAB_NAME = { factorizacion: 'Factorización', razon: 'Razón y proporción' };

export function viewLogros() {
  const el = document.createElement('div');

  if (!store.user) {
    el.innerHTML = `
      <div class="home-head">
        <p class="eyebrow">Logros</p>
        <h1>Tus insignias te esperan</h1>
        <p class="lede">Inicia sesión para guardar tus logros y verlos aquí.</p>
      </div>
      <button class="btn btn--accent" id="login">${icon('user', 16)} Iniciar sesión</button>`;
    el.querySelector('#login').addEventListener('click', () => openLogin());
    setTimeout(() => {
      modal({
        title: 'Necesitas una cuenta',
        body: `<p class="muted" style="margin:0 0 10px">Los logros se guardan en tu cuenta. Como invitado puedes jugar, pero tus insignias se pierden al cerrar la pestaña.</p>
          <div class="center">${medalSVG('god', 64)}</div>`,
        actions: [
          { label: 'Seguir explorando' },
          { label: 'Iniciar sesión', kind: 'primary', onClick: () => openLogin() },
        ],
      });
    }, 320);
    return el;
  }

  const list = store.badges || [];
  const has = (key, lab) => list.some((b) => b.key === key && (b.lab || null) === (lab || null));
  const when = (key, lab) => (list.find((b) => b.key === key && (b.lab || null) === (lab || null)) || {}).earned_at;

  let unlocked = 0;
  const total = 8 + 4;
  for (const lab of ['factorizacion', 'razon']) for (const t of LAB_BADGES) if (has(t, lab)) unlocked++;
  for (const k of ['primeros_pasos', 'racha_fuego', 'sin_ayudas', 'god_laboratorio']) if (has(k)) unlocked++;

  el.innerHTML = `
    <div class="home-head">
      <p class="eyebrow">Logros</p>
      <h1>Tu colección</h1>
      <p class="lede">${unlocked} de ${total} insignias desbloqueadas. Cada laboratorio tiene cuatro niveles y hay cuatro logros que cruzan toda la app.</p>
    </div>

    <div class="row" style="margin-bottom:22px;gap:8px">
      ${list.length
        ? list.slice(0, 8).map((b) => `<span class="medal-wrap">${medalSVG(b.key, 34)}</span>`).join('')
        : '<span class="small muted">Todavía no tienes insignias. Empieza por Factorización.</span>'}
    </div>

    <h2 style="font-size:20px;margin-bottom:10px">Factorización</h2>
    <div class="achievement-grid">
      ${LAB_BADGES.map((t) => achievementCard(t, {
        unlocked: has(t, 'factorizacion'),
        earnedAt: when(t, 'factorizacion'),
        how: BADGE_INFO[t].how,
      })).join('')}
    </div>

    <h2 style="font-size:20px;margin:26px 0 10px">Razón y proporción</h2>
    <div class="achievement-grid">
      ${LAB_BADGES.map((t) => achievementCard(t, {
        unlocked: has(t, 'razon'),
        earnedAt: when(t, 'razon'),
        how: BADGE_INFO[t].how,
      })).join('')}
    </div>

    <h2 style="font-size:20px;margin:26px 0 10px">Logros de toda la app</h2>
    <div class="achievement-grid">
      ${['primeros_pasos', 'racha_fuego', 'sin_ayudas', 'god_laboratorio'].map((k) => achievementCard(k, {
        unlocked: has(k),
        earnedAt: when(k),
      })).join('')}
    </div>`;

  return el;
}
