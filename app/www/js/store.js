import { emptyState, validateState } from './logic.js';

const KEY = 'rutinagym';
const BAD = 'rutinagym-danado';
let onError = () => {};
export const onSaveError = fn => { onError = fn; };

function load() {
  const raw = localStorage.getItem(KEY);
  if (!raw) return emptyState();
  try { return validateState(JSON.parse(raw)); } catch (e) {
    localStorage.setItem(BAD, raw); // nunca se pierde: queda apartado para poder recuperarlo
    console.error('Datos locales ilegibles; se guarda una copia en', BAD, e);
    return emptyState();
  }
}
export let state = load();

// localStorage es síncrono: cada serie queda guardada aunque el móvil cierre la app justo después.
export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { onError(e); }
}
export function replaceState(s) { state = s; save(); }
export function touch(x) { x.updatedAt = Date.now(); save(); }

// Con la app abierta en dos pestañas, manda la última que escribió.
addEventListener('storage', e => { if (e.key === KEY && e.newValue) { state = load(); dispatchEvent(new Event('state')); } });
