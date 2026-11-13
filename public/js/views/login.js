/* views/login.js — acceso con Google (simulado localmente) y modo invitado */
import { store } from '../store.js';
import { modal, toast, icon, esc } from '../ui.js';
import { api } from '../api.js';
import { navigate } from '../router.js';
import { renderTopbar } from '../app.js';

function home_for(role) {
  if (role === 'docente') return '/docente';
  if (role === 'superadmin') return '/admin/grupos';
  return '/';
}

export async function openLogin() {
  let cfg = { google: false };
  try { cfg = await api.get('/config'); } catch { /* sin conexión */ }
  if (cfg.google) return modalGoogle();

  const m = modal({
    title: 'Entra a El Laboratorio',
    body: `
      <p class="muted" style="margin-top:-4px">Guarda tu progreso, sube en el ranking de tu grupo y recibe mensajes de tu profe.</p>
      <div class="login-art">
        <button class="google-btn" id="gbtn">
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.9 2.5 30.4 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.2C12.4 13.3 17.7 9.5 24 9.5Z"/>
            <path fill="#4285F4" d="M46.1 24.6c0-1.6-.1-2.8-.4-4.1H24v8.4h12.6c-.3 2.1-1.6 5.2-4.6 7.3l7.7 6c4.5-4.2 6.4-10.3 6.4-17.6Z"/>
            <path fill="#FBBC05" d="M10.5 28.6A14.6 14.6 0 0 1 9.7 24c0-1.6.3-3.2.8-4.6l-7.9-6.2A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.2Z"/>
            <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.8-5.8l-7.7-6c-2.1 1.4-4.9 2.4-8.1 2.4-6.3 0-11.6-3.8-13.5-9.1l-7.9 6.2C6.5 42.6 14.6 48 24 48Z"/>
          </svg>
          Continuar con Google
        </button>
      </div>
      <p class="tiny muted center" style="margin:-6px 0 10px">
        Este servidor no tiene Google OAuth configurado: el acceso se registra localmente con tu correo.
      </p>
      <div class="notice notice--warn" style="margin-bottom:12px">
        ${icon('lock', 16)}
        <div>Al iniciar sesión, tu progreso de invitado no se conservará.</div>
      </div>
      <p class="center small" style="margin:0">
        <a href="#" id="guestLink">o probar como invitado</a>
      </p>`,
    onMount(card, close) {
      card.querySelector('#gbtn').addEventListener('click', () => {
        close();
        askAccount();
      });
      card.querySelector('#guestLink').addEventListener('click', (e) => {
        e.preventDefault();
        close();
        store.enterGuest();
        renderTopbar();
        navigate('/');
        toast('Modo invitado. Tu progreso no se guardará.');
      });
    },
  });
  return m;
}

function askAccount() {
  const saved = localStorage.getItem('lab.lastEmail') || '';
  modal({
    title: '¿Con qué cuenta entras?',
    body: `
      <p class="muted" style="margin-top:-4px">Escribe el correo de tu cuenta de Google y tu nombre. En esta versión el acceso es local, sin redirección a Google.</p>
      <div class="field">
        <label class="label" for="accEmail">Correo</label>
        <input class="input" id="accEmail" type="email" inputmode="email" autocomplete="email"
               placeholder="tunombre@gmail.com" value="${esc(saved)}">
        <div class="field-error" id="accErr"></div>
      </div>
      <div class="field">
        <label class="label" for="accName">¿Cómo te llamas?</label>
        <input class="input" id="accName" type="text" autocomplete="name" placeholder="Tu nombre completo" maxlength="60">
      </div>`,
    actions: [
      { label: 'Cancelar' },
      {
        label: 'Entrar',
        kind: 'primary',
        async onClick({ card }) {
          const email = card.querySelector('#accEmail').value.trim();
          const name = card.querySelector('#accName').value.trim();
          const err = card.querySelector('#accErr');
          if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
            err.textContent = 'Escribe un correo válido.';
            card.querySelector('#accEmail').focus();
            return false;
          }
          if (name.length < 2) {
            err.textContent = 'Escribe tu nombre.';
            card.querySelector('#accName').focus();
            return false;
          }
          try {
            const user = await store.login(email, name);
            localStorage.setItem('lab.lastEmail', email);
            renderTopbar();
            toast(`Hola, ${user.name.split(' ')[0]}`, 'ok');
            navigate(home_for(user.role));
            return true;
          } catch (e) {
            err.textContent = e.message || 'No pudimos entrar.';
            return false;
          }
        },
      },
    ],
    onMount(card) {
      const email = card.querySelector('#accEmail');
      if (saved) card.querySelector('#accName').focus();
      else email.focus();
    },
  });
}


function modalGoogle() {
  return modal({
    title: 'Entra a El Laboratorio',
    body: `
      <p class="muted" style="margin-top:-4px">Usaremos tu cuenta de Google para guardar tu progreso.</p>
      <div class="login-art">
        <button class="google-btn" id="realG">
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.9 2.5 30.4 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.2C12.4 13.3 17.7 9.5 24 9.5Z"/>
            <path fill="#4285F4" d="M46.1 24.6c0-1.6-.1-2.8-.4-4.1H24v8.4h12.6c-.3 2.1-1.6 5.2-4.6 7.3l7.7 6c4.5-4.2 6.4-10.3 6.4-17.6Z"/>
            <path fill="#FBBC05" d="M10.5 28.6A14.6 14.6 0 0 1 9.7 24c0-1.6.3-3.2.8-4.6l-7.9-6.2A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.2Z"/>
            <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.8-5.8l-7.7-6c-2.1 1.4-4.9 2.4-8.1 2.4-6.3 0-11.6-3.8-13.5-9.1l-7.9 6.2C6.5 42.6 14.6 48 24 48Z"/>
          </svg>
          Continuar con Google
        </button>
      </div>
      <div class="notice notice--warn">
        ${icon('lock', 16)}
        <div>Al iniciar sesión, tu progreso de invitado no se conservará.</div>
      </div>`,
    onMount(card) {
      card.querySelector('#realG').addEventListener('click', () => {
        window.location.href = '/api/auth/google/start';
      });
    },
  });
}
