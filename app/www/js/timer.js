// Descanso basado en hora de fin: sigue siendo exacto aunque la pantalla se apague.
import { state, save } from './store.js';
let audio, lock;

export function unlockAudio() {
  try { audio ??= new (window.AudioContext || window.webkitAudioContext)(); audio.resume(); } catch { /* sin sonido */ }
}
function beep() {
  navigator.vibrate?.([200, 100, 200]);
  if (!state.settings.sound || !audio) return;
  [0, 0.25, 0.5].forEach(t => {
    const o = audio.createOscillator(), g = audio.createGain();
    o.frequency.value = 880; g.gain.value = 0.25; o.connect(g).connect(audio.destination);
    o.start(audio.currentTime + t); o.stop(audio.currentTime + t + 0.15);
  });
}
export function startRest(sec) {
  if (!state.current || !sec) return;
  state.current.rest = { end: Date.now() + sec * 1000, total: sec }; save(); tick();
}
export function addRest(sec) {
  const r = state.current?.rest; if (!r) return;
  r.end += sec * 1000; r.total = Math.max(1, r.total + sec); save(); tick();
}
export function stopRest() { if (state.current) { delete state.current.rest; save(); } tick(); }

const mmss = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
export function elapsed(start) {
  const s = Math.max(0, Math.floor((Date.now() - start) / 1000));
  return s < 3600 ? mmss(s) : `${Math.floor(s / 3600)} h ${Math.floor(s % 3600 / 60)} min`;
}
export function tick() {
  const r = state.current?.rest, bar = document.getElementById('rest');
  bar.hidden = !r;
  document.body.classList.toggle('resting', !!r);
  if (r) {
    const left = Math.ceil((r.end - Date.now()) / 1000);
    if (left <= 0) { stopRest(); if (left > -4) beep(); return; }
    bar.querySelector('output').textContent = mmss(left);
    bar.style.setProperty('--p', Math.min(1, left / r.total));
  }
  const c = document.getElementById('clock');
  if (c && state.current) c.textContent = elapsed(state.current.start);
}
setInterval(tick, 500);

// Pantalla encendida mientras se entrena.
export async function wake() {
  const want = !!state.current && location.hash.startsWith('#/entreno') && document.visibilityState === 'visible';
  try {
    if (want && (!lock || lock.released)) lock = await navigator.wakeLock?.request('screen');
    if (!want && lock) { await lock.release(); lock = null; }
  } catch { /* no disponible o batería baja */ }
}
document.addEventListener('visibilitychange', () => { tick(); wake(); });
