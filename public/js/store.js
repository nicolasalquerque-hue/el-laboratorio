/* store.js — estado global, sesión y progreso (invitado vs cuenta) */
import { api, getToken, setToken } from './api.js';

const GUEST_KEY = 'lab.guest';

export const store = {
  user: null,
  group: null,
  progress: {},
  badges: [],
  guest: false,
  sessionId: null,
  ready: false,
  preview: sessionStorage.getItem('lab.preview') === '1',
  freeRequest: null,
  _guestProgress: {},
  _guestBadges: [],
  _guestPoints: 0,

  get isAuthed() { return !!this.user; },
  get isGuest() { return this.guest && !this.user; },
  setPreview(v) {
    this.preview = !!v;
    if (v) sessionStorage.setItem('lab.preview', '1');
    else sessionStorage.removeItem('lab.preview');
  },

  get role() { return this.user ? this.user.role : this.guest ? 'invitado' : 'anon'; },

  async boot() {
    if (getToken()) {
      try {
        await this.refresh();
      } catch {
        setToken('');
      }
    }
    if (!this.user && sessionStorage.getItem(GUEST_KEY) === '1') this.guest = true;
    this.ready = true;
    return this;
  },

  async refresh() {
    const r = await api.get('/me');
    this.user = r.user;
    this.group = r.group;
    this.progress = r.progress || {};
    this.badges = r.badges || [];
    this.guest = false;
    sessionStorage.removeItem(GUEST_KEY);
    return r;
  },

  async login(email, name) {
    const r = await api.post('/auth/google', { email, name });
    setToken(r.token);
    this.sessionId = r.sessionId;
    this.user = r.user;
    this.guest = false;
    sessionStorage.removeItem(GUEST_KEY);
    this._guestProgress = {};
    this._guestBadges = [];
    await this.refresh();
    this.startHeartbeat();
    return this.user;
  },

  enterGuest() {
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
    this.user = null;
    this.group = null;
    this.guest = true;
    sessionStorage.setItem(GUEST_KEY, '1');
    this.progress = this._guestProgress;
    this.badges = this._guestBadges;
  },

  async logout() {
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
    try {
      if (this.user) await api.post('/auth/logout');
    } catch { /* da igual */ }
    setToken('');
    this.user = null;
    this.group = null;
    this.progress = {};
    this.badges = [];
    this.sessionId = null;
    this.enterGuest();
  },

  /* progreso: si es invitado, vive en memoria */
  getLab(lab) {
    const src = this.isGuest ? this._guestProgress : this.progress;
    return src[lab] || null;
  },

  async saveLab(lab, { data, bestScore = 0, badge = null, pct = 0 }) {
    if (this.isGuest) {
      const prev = this._guestProgress[lab] || { best_score: 0, badge: null };
      const order = { iniciante: 1, explorador: 2, constructor: 3, god: 4 };
      const best = Math.max(prev.best_score || 0, bestScore || 0);
      const finalBadge = (order[badge] || 0) > (order[prev.badge] || 0) ? badge : prev.badge;
      this._guestProgress[lab] = { data, best_score: best, badge: finalBadge, pct, updated_at: new Date().toISOString() };
      this.progress = this._guestProgress;
      this.recomputeGuestPoints();
      return this._guestProgress[lab];
    }
    const r = await api.post('/progress', { lab, data, bestScore, badge, pct });
    this.progress[lab] = r.progress;
    if (r.user) this.user = r.user;
    return r.progress;
  },

  async attempt(payload) {
    if (this.isGuest) return; // el invitado no deja rastro
    try {
      await api.post('/attempt', payload);
    } catch { /* no romper la experiencia */ }
  },

  async awardBadge(key, lab = null) {
    if (this.isGuest) {
      const exists = this._guestBadges.some((b) => b.key === key && (b.lab || null) === (lab || null));
      if (exists) return false;
      this._guestBadges.push({ key, lab });
      this.recomputeGuestPoints();
      return true;
    }
    try {
      const r = await api.post('/badge', { key, lab });
      if (r.user) this.user = r.user;
      if (r.isNew) {
        const r2 = await api.get('/me');
        this.badges = r2.badges || [];
        this.user = r2.user;
      }
      return r.isNew;
    } catch {
      return false;
    }
  },

  recomputeGuestPoints() {
    let base = 0;
    for (const p of Object.values(this._guestProgress)) base += p.best_score || 0;
    const globals = this._guestBadges.filter((b) =>
      ['primeros_pasos', 'racha_fuego', 'sin_ayudas', 'god_laboratorio'].includes(b.key)
    ).length;
    this._guestPoints = base + globals * 20;
  },

  get points() {
    return this.isGuest ? this._guestPoints : this.user ? this.user.points : 0;
  },

  hasBadge(key, lab = null) {
    const list = this.isGuest ? this._guestBadges : this.badges;
    return list.some((b) => b.key === key && (b.lab || null) === (lab || null));
  },

  /* tiempo en la app: latido cada 30 s mientras la pestaña esté visible */
  startHeartbeat() {
    if (this._timer) clearInterval(this._timer);
    if (!this.user) return;
    let last = Date.now();
    this._timer = setInterval(async () => {
      if (document.visibilityState !== 'visible') { last = Date.now(); return; }
      const secs = Math.round((Date.now() - last) / 1000);
      last = Date.now();
      if (secs < 1) return;
      try {
        const r = await api.post('/session/ping', { sessionId: this.sessionId, seconds: Math.min(secs, 60) });
        if (r && typeof r.added === 'number' && this.user) this.user.total_seconds += r.added;
      } catch { /* silencio */ }
    }, 30000);
  },
};
