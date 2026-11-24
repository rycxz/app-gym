// Copia en la nube opcional: solo existe si la app la sirve el backend de Spring.
import { merge, validateState } from './logic.js';
import { state, replaceState } from './store.js';

export const cloud = { available: false, user: null };
const cookie = n => document.cookie.split('; ').find(c => c.startsWith(n + '='))?.slice(n.length + 1);

export async function api(method, path, body) {
  const r = await fetch('api/' + path, {
    method, credentials: 'same-origin',
    headers: { Accept: 'application/json', ...(body && { 'Content-Type': 'application/json' }), ...(method !== 'GET' && { 'X-XSRF-TOKEN': decodeURIComponent(cookie('XSRF-TOKEN') ?? '') }) },
    body: body && JSON.stringify(body),
  });
  const json = (r.headers.get('content-type') ?? '').includes('json') ? await r.json() : null;
  if (!r.ok) throw Object.assign(new Error(json?.error ?? 'No se pudo conectar con el servidor'), { status: r.status });
  return json;
}
export async function probe() {
  if (window.Capacitor?.isNativePlatform?.()) return;
  try {
    const me = await api('GET', 'me');
    cloud.available = !!me && 'usuario' in me;
    cloud.user = me?.usuario ?? null;
  } catch { cloud.available = false; }
}
export async function sync() {
  if (!cloud.user) return false;
  for (let i = 0; i < 3; i++) {
    const remote = await api('GET', 'sync');
    if (remote.datos) replaceState(merge(state, validateState(remote.datos)));
    try {
      await api('PUT', 'sync', { version: remote.version, datos: { ...state, current: null } });
      return true;
    } catch (e) { if (e.status !== 409) throw e; }
  }
  throw new Error('Hay otro móvil sincronizando. Prueba otra vez');
}
