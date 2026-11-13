/* views/share.js — Compartir el acceso con el aula */
import { store } from '../store.js';
import { api } from '../api.js';
import { esc, icon, toast } from '../ui.js';

function qrSvg(text) {
  if (!window.qrcode) return '';
  try {
    const qr = window.qrcode(0, 'M');
    qr.addData(text);
    qr.make();
    return qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
  } catch {
    return '';
  }
}

export function viewShare() {
  const el = document.createElement('div');

  if (!store.user || store.role === 'estudiante') {
    el.innerHTML = `
      <div class="home-head">
        <p class="eyebrow">Compartir</p>
        <h1>Solo docentes</h1>
        <p class="lede">Esta pantalla es para que el profe comparta el acceso con su grupo.</p>
      </div>
      <a class="btn btn--accent" href="#/">Volver al inicio</a>`;
    return el;
  }

  el.innerHTML = `
    <div class="home-head">
      <p class="eyebrow">Compartir</p>
      <h1>Lleva El Laboratorio al aula</h1>
      <p class="lede">Mientras este computador esté encendido y en la misma red, tus estudiantes entran desde su celular o portátil abriendo una dirección.</p>
    </div>
    <div id="host"><div class="skeleton" style="height:200px"></div></div>`;

  const host = el.querySelector('#host');

  (async () => {
    let net = { urls: [] };
    try { net = await api.get('/network'); } catch { /* seguimos con la del navegador */ }
    const current = location.origin;
    const urls = net.urls && net.urls.length ? net.urls : [current];
    const primary = urls[0];

    host.innerHTML = `
      <div class="grid-2" style="align-items:start">
        <div class="card card--pad">
          <p class="eyebrow">Dirección para tus estudiantes</p>
          <div class="row" style="gap:10px;flex-wrap:wrap">
            <code class="mono" id="urlText" style="font-size:17px">${esc(primary)}</code>
            <button class="btn btn--ghost btn--sm" id="copyUrl">${icon('copy', 15)} Copiar</button>
          </div>
          <div class="notice notice--info" style="margin-top:14px">
            ${icon('target', 16)}
            <div>Los dispositivos deben estar en la <strong>misma red Wi‑Fi</strong> que este computador.</div>
          </div>
          ${urls.length > 1 ? `<p class="small muted" style="margin:12px 0 0">Otras direcciones de esta máquina: ${urls.slice(1).map((u) => `<code class="mono">${esc(u)}</code>`).join(', ')}</p>` : ''}
          <p class="small muted" style="margin:12px 0 0">Si no abre, revisa el firewall de Windows (puerto 8099). Abajo tienes el comando exacto.</p>
        </div>
        <div class="card card--pad" style="text-align:center">
          <p class="eyebrow">Escanea con el celular</p>
          <div id="qrBox" style="display:grid;place-items:center;padding:6px 0">${qrSvg(primary)}</div>
          <p class="small muted" style="margin:8px 0 0">Abre la cámara y apunta al código.</p>
        </div>
      </div>

      <div class="card card--pad" style="margin-top:16px">
        <p class="eyebrow">Pasos para el estudiante</p>
        <ol class="small" style="margin:0;padding-left:20px;line-height:1.9">
          <li>Abre <code class="mono">${esc(primary)}</code> en el navegador.</li>
          <li>Toca <strong>Probar como invitado</strong> o <strong>Iniciar sesión</strong> para guardar el progreso.</li>
          <li>Entra a <strong>Mi grupo</strong> y escribe el código que le diste: <span class="chip mono">LAB-XXXX</span></li>
          <li>Ya aparece en tu panel y en el ranking del grupo.</li>
        </ol>
      </div>

      <div class="card card--pad" style="margin-top:16px">
        <div class="row row--between" style="gap:10px;flex-wrap:wrap">
          <div>
            <p class="eyebrow" style="margin-bottom:2px">Fuera de la red del colegio</p>
            <p class="small muted" style="margin:0">Si tus estudiantes están en casa, o el firewall bloquea el puerto, usa un túnel público.</p>
          </div>
          <span class="chip chip--gold">requiere internet</span>
        </div>
        <ol class="small" style="margin:12px 0 0;padding-left:20px;line-height:1.8">
          <li>Deja el servidor abierto con <code class="mono">iniciar.cmd</code>.</li>
          <li>Ejecuta <code class="mono">compartir-internet.cmd</code> (doble clic).</li>
          <li>Espera la línea con <code class="mono">https://algo.trycloudflare.com</code> y comparte ese enlace.</li>
        </ol>
        <div class="notice" style="margin-top:12px">
          ${icon('lock', 16)}
          <div>Mientras esa ventana esté abierta, cualquiera con el enlace puede entrar. Ciérrala al terminar la clase.</div>
        </div>
      </div>

      <div class="card card--pad" style="margin-top:16px">
        <p class="eyebrow">Si un estudiante no puede entrar</p>
        <div class="stack stack--sm">
          <div class="notice">
            ${icon('shield', 16)}
            <div><strong>Firewall.</strong> Windows puede bloquear el puerto. Ejecuta esto en PowerShell <em>como administrador</em> una sola vez:</div>
          </div>
          <pre class="mono small" style="background:var(--paper-2);padding:12px;border-radius:10px;overflow:auto;margin:0">New-NetFirewallRule -DisplayName "El Laboratorio" -Direction Inbound -LocalPort 8099 -Protocol TCP -Action Allow</pre>
          <div class="notice">
            ${icon('users', 16)}
            <div><strong>Red equivocada.</strong> El celular puede estar en datos móviles o en otra Wi‑Fi (por ejemplo, la de invitados del colegio).</div>
          </div>
          <div class="notice">
            ${icon('lock', 16)}
            <div><strong>Fuera del colegio.</strong> Esta dirección solo funciona en la red local. Para que entren desde casa hay que publicar la app en internet (ver el README).</div>
          </div>
        </div>
      </div>`;

    host.querySelector('#copyUrl').addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(primary);
        toast('Dirección copiada', 'ok');
      } catch { toast('No se pudo copiar. Selecciona el texto.'); }
    });
  })().catch((e) => {
    host.innerHTML = `<div class="card card--pad"><p class="muted">${esc(e.message)}</p></div>`;
  });

  return el;
}
