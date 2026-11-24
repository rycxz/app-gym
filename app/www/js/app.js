import * as L from './logic.js';
import { state, save, touch, replaceState, onSaveError } from './store.js';
import { html, icon, toast, dialog, confirmar, exportFile, shareText } from './ui.js';
import * as T from './timer.js';
import { EXERCISES, TEMPLATES } from './data.js';

const view = document.getElementById('view');
const $ = s => document.querySelector(s);
const { fmt } = L;

/* ---------- Utilidades ---------- */
const fecha = (t, o = { weekday: 'short', day: 'numeric', month: 'short' }) => new Date(t).toLocaleDateString('es-ES', o);
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const active = () => state.routines.find(r => r.id === state.activeId) ?? null;
const routine = id => state.routines.find(r => r.id === id);
const setText = s => `${s.w ? `${fmt(s.w)} kg × ` : ''}${s.r}${s.w ? '' : ' reps'}`;
const mins = s => Math.max(1, Math.round((s.end - s.start) / 60000));
const go = h => { if (location.hash === h) render(); else location.hash = h; };
const byDate = () => [...state.sessions].sort((a, b) => b.start - a.start);
const head = (title, back, extra) => html`<header class="head">${back && html`<a class="iconbtn" href="${back}" aria-label="Volver">${icon('back')}</a>`}<h1>${title}</h1>${extra}</header>`;
const when = n => (n === 1 ? 'Mañana' : null);

function exerciseNames() {
  const m = new Map();
  const add = n => { if (n && !m.has(L.norm(n))) m.set(L.norm(n), n); };
  state.sessions.forEach(s => s.exercises.forEach(e => add(e.name)));
  state.routines.forEach(r => r.days.forEach(d => d.exercises.forEach(e => add(e.name))));
  EXERCISES.forEach(add);
  return [...m.values()];
}

/* ---------- Hoy ---------- */
function vHoy() {
  const now = new Date(), r = active(), day = L.dayForDate(r, now);
  const doneToday = byDate().find(s => new Date(s.start).toDateString() === now.toDateString());
  const weekN = state.sessions.filter(s => s.start >= L.weekStart(now)).length;
  const goal = r ? new Set(r.days.flatMap(d => d.weekdays)).size : 0;
  const streak = L.weekStreak(state.sessions, now.getTime());
  return html`
  <header class="hero"><p class="over">${cap(fecha(now, { weekday: 'long', day: 'numeric', month: 'long' }))}</p>
    <h1>${state.settings.name ? `Hola, ${state.settings.name}` : 'A entrenar'}</h1></header>
  ${state.current ? html`<section class="card accent"><p class="over">Entreno en curso</p><h2>${state.current.name}</h2>
      <a class="btn big dark" href="#/entreno">Seguir entrenando</a></section>`
    : !r ? html`<section class="card"><h2>Empieza por tu rutina</h2><p class="muted">Pega la que ya tienes en el bloc de notas, usa una plantilla o hazla desde cero.</p>
      <button class="btn big" data-act="pasteNotes">Pegar mi bloc de notas</button>
      <a class="btn ghost" href="#/rutinas">Ver plantillas y crear</a>
      <button class="btn ghost" data-act="startFree">Entreno libre</button></section>`
    : day ? html`<section class="card accent"><p class="over">${doneToday ? 'Hoy ya has entrenado' : 'Toca hoy'}</p><h2>${day.name}</h2>
      <ul class="plain">${day.exercises.map(e => html`<li><span>${e.name}</span><b>${e.sets}×${e.reps}</b></li>`)}</ul>
      <button class="btn big dark" data-act="start" data-day="${day.id}">${doneToday ? 'Repetir entreno' : 'Iniciar entreno'}</button></section>`
    : html`<section class="card"><p class="over">Hoy</p><h2>Descanso</h2><p class="muted">No hay nada programado. Si te apetece, elige un día abajo.</p></section>`}
  <section class="stats">
    <div><b>${weekN}${goal ? html`<small>/${goal}</small>` : ''}</b><span>esta semana</span></div>
    <div><b>${streak}</b><span>${streak === 1 ? 'semana seguida' : 'semanas seguidas'}</span></div>
    <div><b>${state.sessions.length}</b><span>entrenos</span></div>
  </section>
  ${r && !state.current && html`<h2 class="sec">Próximos entrenos</h2><div class="list">
    ${L.upcoming(r, now, 4).map(u => html`<button class="row" data-act="start" data-day="${u.day.id}"><span><b>${u.day.name}</b><small>${when(u.inDays) ?? cap(fecha(u.date, { weekday: 'long', day: 'numeric', month: 'short' }))}</small></span>${icon('next')}</button>`)}
    ${r.days.filter(d => !d.weekdays.length).map(d => html`<button class="row" data-act="start" data-day="${d.id}"><span><b>${d.name}</b><small>Cuando quieras</small></span>${icon('next')}</button>`)}
    <button class="row" data-act="startFree"><span><b>Entreno libre</b><small>Sin plan, añade lo que hagas</small></span>${icon('next')}</button></div>`}`;
}

/* ---------- Rutinas ---------- */
function vRutinas() {
  return html`${head('Rutinas')}
  ${state.routines.length ? html`<div class="list">${state.routines.map(r => html`<a class="row" href="#/rutina/${r.id}"><span><b>${r.name}</b><small>${r.days.length} ${r.days.length === 1 ? 'día' : 'días'}</small></span>${r.id === state.activeId ? html`<em class="pill">Activa</em>` : icon('next')}</a>`)}</div>` : html`<p class="muted">Aún no tienes ninguna.</p>`}
  <div class="stack"><button class="btn big" data-act="newRoutine">${icon('plus')} Crear rutina</button>
  <button class="btn ghost" data-act="pasteNotes">Pegar mi bloc de notas</button>
  <button class="btn ghost" data-act="pasteCode">Tengo un código de rutina</button></div>
  <h2 class="sec">Plantillas</h2>
  <div class="list">${TEMPLATES.map((t, i) => html`<button class="row" data-act="useTemplate" data-i="${i}"><span><b>${t.name}</b><small>${t.about}</small></span>${icon('plus')}</button>`)}</div>`;
}

function vRutina(id) {
  const r = routine(id);
  if (!r) return html`${head('Rutina no encontrada', '#/rutinas')}`;
  const num = (d, e, k, label, v, mode) => html`<label>${label}<input inputmode="${mode}" autocomplete="off" data-in="ex" data-d="${d}" data-e="${e}" data-k="${k}" value="${v}"></label>`;
  return html`${head('Editar rutina', '#/rutinas', html`<button class="iconbtn" data-act="shareRoutine" data-id="${id}" aria-label="Compartir rutina">${icon('share')}</button>`)}
  <label class="field">Nombre<input data-in="rname" maxlength="60" value="${r.name}"></label>
  ${r.id === state.activeId ? html`<p class="pill">Rutina activa</p>` : html`<button class="btn" data-act="activate" data-id="${id}">Usar esta rutina</button>`}
  ${r.days.map((d, di) => html`<section class="card day">
    <div class="line"><input class="title" aria-label="Nombre del día" data-in="dname" data-d="${di}" maxlength="60" value="${d.name}">
      <button class="iconbtn" data-act="moveDay" data-d="${di}" aria-label="Subir día ${d.name}" ${di ? '' : html`disabled`}>${icon('up')}</button>
      <button class="iconbtn" data-act="delDay" data-d="${di}" aria-label="Eliminar día ${d.name}">${icon('trash')}</button></div>
    <div class="week" role="group" aria-label="Días de la semana">${L.DAYS.map((n, w) => html`<button data-act="toggleWd" data-d="${di}" data-w="${w}" aria-pressed="${d.weekdays.includes(w)}" aria-label="${n}">${n === 'Miércoles' ? 'X' : n[0]}</button>`)}</div>
    ${d.exercises.map((e, ei) => html`<div class="ex">
      <div class="line"><input class="exname" list="exs" aria-label="Ejercicio" placeholder="Ejercicio" data-in="ex" data-d="${di}" data-e="${ei}" data-k="name" maxlength="80" value="${e.name}">
        <button class="iconbtn" data-act="moveEx" data-d="${di}" data-e="${ei}" aria-label="Subir ${e.name}" ${ei ? '' : html`disabled`}>${icon('up')}</button>
        <button class="iconbtn" data-act="delEx" data-d="${di}" data-e="${ei}" aria-label="Quitar ${e.name}">${icon('x')}</button></div>
      <div class="three">${num(di, ei, 'sets', 'Series', e.sets, 'numeric')}${num(di, ei, 'reps', 'Reps', e.reps, 'text')}${num(di, ei, 'weight', 'Kg', fmt(e.weight), 'decimal')}</div>
      <input aria-label="Nota" placeholder="Nota (opcional)" data-in="ex" data-d="${di}" data-e="${ei}" data-k="note" maxlength="200" value="${e.note}"></div>`)}
    <button class="btn ghost" data-act="addEx" data-d="${di}">${icon('plus')} Ejercicio</button></section>`)}
  <div class="stack"><button class="btn" data-act="addDay">${icon('plus')} Añadir día</button>
  <button class="btn ghost" data-act="dupRoutine" data-id="${id}">Duplicar rutina</button>
  <button class="btn ghost red" data-act="delRoutine" data-id="${id}">Eliminar rutina</button></div>
  <p class="muted center">Los cambios se guardan solos.</p>`;
}

/* ---------- Entreno ---------- */
function vEntreno() {
  const c = state.current;
  if (!c) return html`${head('Sin entreno en curso', '#/')}<a class="btn" href="#/">Ir a Hoy</a>`;
  const total = c.exercises.reduce((n, e) => n + e.sets.length, 0);
  const done = c.exercises.reduce((n, e) => n + e.sets.filter(s => s.done).length, 0);
  return html`<header class="head work"><a class="iconbtn" href="#/" aria-label="Volver">${icon('back')}</a><div><h1>${c.name}</h1><p class="muted"><span id="clock">${T.elapsed(c.start)}</span> · ${done}/${total} series</p></div>
    <button class="btn" data-act="finish">Terminar</button></header>
  <progress max="${total || 1}" value="${done}" aria-label="Series hechas"></progress>
  ${c.exercises.map((e, ei) => {
    const last = L.lastSets(state.sessions, e.name);
    return html`<section class="card ${e.sets.length && e.sets.every(s => s.done) ? 'complete' : ''}">
    <div class="line"><a class="exlink" href="#/ejercicio/${encodeURIComponent(e.name)}">${e.name}</a>
      <button class="iconbtn" data-act="wUp" data-e="${ei}" aria-label="Subir ${e.name}" ${ei ? '' : html`disabled`}>${icon('up')}</button>
      <button class="iconbtn" data-act="wDel" data-e="${ei}" aria-label="Quitar ${e.name}">${icon('x')}</button></div>
    <p class="muted">${e.target ? html`Plan ${e.target}` : ''}${e.target && last.length ? ' · ' : ''}${last.length ? html`Última vez: ${last.map(setText).join(', ')}` : ''}</p>
    ${e.sets.length ? html`<div class="sets"><div class="shead" aria-hidden="true"><span></span><span>Kg</span><span>Reps</span><span>RIR</span><span></span></div>
    ${e.sets.map((s, si) => {
      const g = L.suggest(last, e.plan, si);
      const inp = (k, label, ph, mode) => html`<input inputmode="${mode}" autocomplete="off" maxlength="6" aria-label="${label}, serie ${si + 1} de ${e.name}" data-in="set" data-e="${ei}" data-s="${si}" data-k="${k}" placeholder="${ph}" value="${fmt(s[k])}">`;
      return html`<div class="set ${s.done ? 'done' : ''}"><span class="n">${s.pr ? html`<i class="pr" title="Récord">PR</i>` : si + 1}</span>${inp('w', 'Kilos', fmt(g.w) || '–', 'decimal')}${inp('r', 'Repeticiones', fmt(g.r) || '–', 'numeric')}${inp('rir', 'Repeticiones en recámara', '–', 'numeric')}
      <button class="chk" data-act="check" data-e="${ei}" data-s="${si}" aria-pressed="${s.done}" aria-label="Serie ${si + 1} de ${e.name} hecha">${icon('check')}</button></div>`;
    })}</div>` : ''}
    <div class="two"><button class="btn ghost" data-act="addSet" data-e="${ei}">${icon('plus')} Serie</button><button class="btn ghost" data-act="delSet" data-e="${ei}" ${e.sets.length ? '' : html`disabled`}>Quitar serie</button></div>
    <input aria-label="Nota de ${e.name}" placeholder="Nota" data-in="wnote" data-e="${ei}" maxlength="200" value="${e.note}"></section>`;
  })}
  <div class="stack"><button class="btn big" data-act="wAdd">${icon('plus')} Añadir ejercicio</button>
  <textarea aria-label="Notas del entreno" placeholder="Notas del entreno" data-in="snote" rows="2" maxlength="1000">${c.note}</textarea>
  <button class="btn ghost red" data-act="discard">Descartar entreno</button></div>`;
}

/* ---------- Progreso ---------- */
function chart(points) {
  if (points.length < 2) return html`<p class="muted">Haz este ejercicio un día más y verás aquí la gráfica.</p>`;
  const W = 340, H = 170, l = 38, r = 12, t = 14, b = 24;
  const vs = points.map(p => p.v), span = Math.max(...vs) - Math.min(...vs) || Math.max(...vs) * 0.1 || 1;
  const lo = Math.max(0, Math.min(...vs) - span * 0.15), hi = Math.max(...vs) + span * 0.15;
  const t0 = points[0].t, t1 = points.at(-1).t;
  const x = p => l + (p.t - t0) / (t1 - t0 || 1) * (W - l - r), y = v => t + (hi - v) / (hi - lo) * (H - t - b);
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(p).toFixed(1)} ${y(p.v).toFixed(1)}`).join('');
  const end = points.at(-1);
  return html`<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Evolución de ${fmt(vs[0])} a ${fmt(end.v)}">
    ${[0, 0.5, 1].map(f => { const v = lo + (hi - lo) * f; return html`<line x1="${l}" x2="${W - r}" y1="${y(v)}" y2="${y(v)}"/><text x="${l - 6}" y="${y(v) + 4}" text-anchor="end">${Math.round(v)}</text>`; })}
    <path d="${path}"/>${points.map(p => html`<circle cx="${x(p)}" cy="${y(p.v)}" r="3.5"/>`)}
    <text x="${l}" y="${H - 5}">${fecha(t0, { day: 'numeric', month: 'short' })}</text><text x="${W - r}" y="${H - 5}" text-anchor="end">${fecha(t1, { day: 'numeric', month: 'short' })}</text></svg>`;
}

function vProgreso() {
  const ss = byDate();
  if (!ss.length) return html`${head('Progreso')}<section class="card"><h2>Todavía no hay entrenos</h2><p class="muted">Cuando termines el primero verás aquí tus marcas, gráficas e historial.</p></section>`;
  const names = new Map();
  ss.forEach(s => s.exercises.forEach(e => { const k = L.norm(e.name); if (!names.has(k)) names.set(k, e.name); }));
  return html`${head('Progreso')}
  <h2 class="sec">Ejercicios</h2><div class="list">${[...names.values()].map(n => {
    const p = L.progress(ss, n); if (!p.length) return '';
    const best = Math.max(...p.map(x => x.weight)), a = p.at(-2), z = p.at(-1);
    const diff = a ? (z.weight || a.weight ? z.weight - a.weight : z.reps - a.reps) : 0;
    const unit = z.weight || a?.weight ? 'kg' : 'reps';
    return html`<a class="row" href="#/ejercicio/${encodeURIComponent(n)}"><span><b>${n}</b><small>${best ? `Mejor: ${fmt(best)} kg` : `Mejor: ${Math.max(...p.map(x => x.reps))} reps`}</small></span>${diff ? html`<em class="diff ${diff > 0 ? 'pos' : ''}">${diff > 0 ? '+' : '−'}${fmt(Math.abs(diff))} ${unit}</em>` : icon('next')}</a>`;
  })}</div>
  <h2 class="sec">Historial</h2><div class="list">${ss.map(s => html`<a class="row" href="#/sesion/${s.id}"><span><b>${s.name}</b><small>${cap(fecha(s.start))} · ${mins(s)} min · ${s.exercises.reduce((n, e) => n + e.sets.length, 0)} series${L.volume(s) ? ` · ${Math.round(L.volume(s)).toLocaleString('es-ES')} kg` : ''}</small></span>${icon('next')}</a>`)}</div>`;
}

function vEjercicio(name) {
  const p = L.progress(state.sessions, name), n = L.norm(name);
  const weighted = p.some(x => x.weight);
  const rows = byDate().filter(s => s.exercises.some(e => L.norm(e.name) === n));
  return html`${head(name, state.current ? '#/entreno' : '#/progreso')}
  ${p.length ? html`<section class="stats">
    ${weighted ? html`<div><b>${fmt(Math.max(...p.map(x => x.weight)))}</b><span>kg máximo</span></div><div><b>${fmt(Math.round(Math.max(...p.map(x => x.e1rm))))}</b><span>kg 1RM estimado</span></div>` : ''}
    <div><b>${Math.max(...p.map(x => x.reps))}</b><span>reps máximas</span></div><div><b>${p.length}</b><span>${p.length === 1 ? 'día' : 'días'}</span></div></section>
  <section class="card"><h2>${weighted ? 'Peso máximo por día (kg)' : 'Repeticiones máximas por día'}</h2>${chart(p.map(x => ({ t: x.t, v: weighted ? x.weight : x.reps })))}</section>
  <div class="list">${rows.map(s => html`<a class="row" href="#/sesion/${s.id}"><span><b>${cap(fecha(s.start))}</b><small>${s.exercises.filter(e => L.norm(e.name) === n).flatMap(L.doneSets).map(setText).join(', ')}</small></span>${icon('next')}</a>`)}</div>` : html`<p class="muted">Aún no lo has hecho ningún día.</p>`}`;
}

function vSesion(id) {
  const s = state.sessions.find(x => x.id === id);
  if (!s) return html`${head('Entreno no encontrado', '#/progreso')}`;
  return html`${head(s.name, '#/progreso')}<p class="muted">${cap(fecha(s.start, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))} · ${mins(s)} min</p>
  ${s.note && html`<p class="card">${s.note}</p>`}
  ${s.exercises.map((e, ei) => html`<section class="card"><h2>${e.name}</h2>${e.note && html`<p class="muted">${e.note}</p>`}<div class="sets"><div class="shead hist" aria-hidden="true"><span></span><span>Kg</span><span>Reps</span><span>RIR</span></div>${e.sets.map((x, si) => html`<div class="set hist"><span class="n">${x.pr ? html`<i class="pr">PR</i>` : si + 1}</span>${[['w', 'Kilos', 'decimal'], ['r', 'Repeticiones', 'numeric'], ['rir', 'Repeticiones en recámara', 'numeric']].map(([k, label, mode]) => html`<input inputmode="${mode}" maxlength="6" aria-label="${label}, serie ${si + 1} de ${e.name}" data-in="hist" data-id="${id}" data-e="${ei}" data-s="${si}" data-k="${k}" value="${fmt(x[k])}">`)}</div>`)}</div></section>`)}
  <p class="muted center">Si te equivocaste, toca un número y corrígelo.</p>
  <button class="btn ghost red" data-act="delSession" data-id="${id}">Eliminar entreno</button>`;
}

/* ---------- Ajustes ---------- */
const ACCENTS = { lima: '#c6f24e', coral: '#ff8f6b', rosa: '#ff8fc4', azul: '#7cc4ff' };
function vAjustes() {
  const s = state.settings, ios = /iPhone|iPad/.test(navigator.userAgent);
  const installed = matchMedia('(display-mode: standalone)').matches || navigator.standalone || window.Capacitor?.isNativePlatform?.();
  return html`${head('Ajustes')}
  ${!installed && html`<section class="card accent"><h2>Instálala en el móvil</h2><p>${ios ? 'En Safari: botón Compartir y «Añadir a pantalla de inicio».' : 'En Chrome: menú ⋮ y «Instalar aplicación». En iPhone: Safari, Compartir y «Añadir a pantalla de inicio».'}</p>${installEvt && html`<button class="btn dark" data-act="install">Instalar</button>`}</section>`}
  <section class="card"><label class="field">Tu nombre<input data-in="cfgname" maxlength="30" autocomplete="given-name" value="${s.name}"></label>
    <label class="field">Descanso entre series<select data-in="cfgrest">${[0, 30, 45, 60, 75, 90, 120, 150, 180, 240, 300].map(v => html`<option value="${v}" ${v === s.rest ? html`selected` : ''}>${v ? (v < 60 ? `${v} s` : `${Math.floor(v / 60)} min${v % 60 ? ` ${v % 60} s` : ''}`) : 'Sin temporizador'}</option>`)}</select></label>
    <label class="switch"><input type="checkbox" data-in="cfgsound" ${s.sound ? html`checked` : ''}> Sonido al acabar el descanso</label>
    <div class="accents" role="group" aria-label="Color">${Object.entries(ACCENTS).map(([k, c]) => html`<button data-act="accent" data-k="${k}" aria-label="Color ${k}" aria-pressed="${s.accent === k}" style="--c:${c}"></button>`)}</div></section>
  <section class="card"><h2>Copia de seguridad</h2><p class="muted">Tus datos viven solo en este móvil. Guarda una copia de vez en cuando y siempre antes de cambiar de móvil o desinstalar.</p>
    <button class="btn" data-act="backup">Guardar copia</button>
    <label class="btn ghost filebtn">Restaurar copia<input type="file" accept=".json,application/json" data-in="restore"></label></section>
  <button class="btn ghost red" data-act="wipe">Borrar todos los datos</button>`;
}

/* ---------- Router ---------- */
const TABS = [['#/', 'hoy', 'Hoy'], ['#/rutinas', 'rutinas', 'Rutinas'], ['#/progreso', 'progreso', 'Progreso'], ['#/ajustes', 'ajustes', 'Ajustes']];
const VIEWS = { '': vHoy, rutinas: vRutinas, rutina: vRutina, entreno: vEntreno, progreso: vProgreso, ejercicio: vEjercicio, sesion: vSesion, ajustes: vAjustes };
const TAB = { rutina: 'rutinas', ejercicio: 'progreso', sesion: 'progreso', entreno: 'hoy', '': 'hoy' };
let lastHash = null;

function parse() {
  const [, p = '', arg = ''] = location.hash.split('/');
  try { return [p, decodeURIComponent(arg)]; } catch { return ['', '']; }
}
function render() {
  const [p, arg] = parse(), y = scrollY, same = lastHash === location.hash;
  document.documentElement.style.setProperty('--ac', ACCENTS[state.settings.accent] ?? ACCENTS.lima);
  view.innerHTML = (VIEWS[p] ?? vHoy)(arg);
  const tab = TAB[p] ?? p;
  $('#nav').innerHTML = html`${TABS.map(([h, k, l]) => html`<a href="${h}" ${k === tab ? html`aria-current="page"` : ''}>${icon(k)}<span>${l}</span></a>`)}`;
  if (!same) $('#exs').innerHTML = html`${exerciseNames().map(n => html`<option value="${n}">`)}`;
  scrollTo(0, same ? y : 0);
  lastHash = location.hash;
  T.tick(); T.wake();
}
function keepFocus(sel) { render(); $(sel)?.focus({ preventScroll: true }); }

/* ---------- Acciones ---------- */
const cur = () => routine(parse()[1]);
const upd = r => { touch(r); render(); };
function addRoutine(r) {
  state.routines.push(r);
  if (!active()) { state.activeId = r.id; state.activeAt = Date.now(); }
  save(); go(`#/rutina/${r.id}`);
}
async function begin(s) {
  if (state.current && !await confirmar('Ya hay un entreno en curso', 'Si empiezas otro se descarta el actual.', 'Empezar otro')) return;
  state.current = s; save(); go('#/entreno');
}
const ask = (title, body, ok) => dialog(title, body, [{ value: 'ok', label: ok }, { value: '', label: 'Cancelar', cls: 'ghost', cancel: true }]);
const swap = (a, i) => { [a[i - 1], a[i]] = [a[i], a[i - 1]]; };

const ACT = {
  start: d => { const r = active(); const day = r?.days.find(x => x.id === d.day); if (day) return begin(L.startSession(r.id, day, Date.now())); },
  startFree: () => begin(L.startSession(null, null, Date.now())),

  newRoutine: () => addRoutine(L.freshRoutine('Mi rutina', [{ name: 'Día 1', weekdays: [], exercises: [] }])),
  useTemplate: d => { const t = TEMPLATES[d.i]; addRoutine(L.freshRoutine(t.name, t.days)); toast('Plantilla añadida. Cámbiala a tu gusto'); },
  async pasteNotes() {
    const { action, data } = await ask('Pega tu bloc de notas', html`<p class="muted">Un ejercicio por línea y el día como título. Luego podrás retocarlo.</p><textarea name="t" rows="9" required autofocus placeholder="Lunes - Pecho&#10;Press banca 4x8 60kg&#10;Aperturas 3x12 12,5kg&#10;&#10;Martes - Espalda&#10;Dominadas 4x8"></textarea>`, 'Convertir en rutina');
    if (action !== 'ok') return;
    const days = L.parseNotes(data.t);
    if (!days.length) return toast('No he encontrado ningún ejercicio');
    addRoutine(L.freshRoutine('Mi rutina', days));
    toast('Hecho. Repasa que esté todo bien');
  },
  async pasteCode(_, code = '') {
    const { action, data } = await ask('Código de rutina', html`<p class="muted">Pega el mensaje que te han mandado.</p><textarea name="t" rows="5" required>${code}</textarea>`, 'Añadir rutina');
    if (action !== 'ok') return;
    try { addRoutine(L.decodeRoutine(data.t)); toast('Rutina añadida'); } catch { toast('Ese código no es válido'); }
  },
  activate: d => { state.activeId = d.id; state.activeAt = Date.now(); save(); render(); toast('Rutina activa'); },
  shareRoutine: d => { const r = routine(d.id); return shareText(r.name, `Mi rutina «${r.name}» de RutinaGym. Cópialo entero y pégalo en Rutinas > Tengo un código:\n\n${L.encodeRoutine(r)}`); },
  dupRoutine: d => { const r = routine(d.id); addRoutine(L.freshRoutine(`${r.name} (copia)`, r.days)); toast('Duplicada'); },
  async delRoutine(d) {
    if (!await confirmar('¿Eliminar la rutina?', 'Los entrenos que ya hiciste se conservan.', 'Eliminar')) return;
    state.deleted[d.id] = Date.now();
    state.routines = state.routines.filter(r => r.id !== d.id);
    if (state.activeId === d.id) { state.activeId = state.routines[0]?.id ?? null; state.activeAt = Date.now(); }
    save(); go('#/rutinas');
  },
  addDay: () => { const r = cur(); r.days.push({ id: L.uid(), name: `Día ${r.days.length + 1}`, weekdays: [], exercises: [] }); upd(r); },
  moveDay: d => { const r = cur(); swap(r.days, +d.d); upd(r); },
  async delDay(d) { const r = cur(); if (r.days[d.d].exercises.length && !await confirmar('¿Eliminar este día?', 'Se quitan sus ejercicios de la rutina.', 'Eliminar')) return; r.days.splice(d.d, 1); upd(r); },
  toggleWd: d => {
    const r = cur(), w = +d.w, on = r.days[d.d].weekdays.includes(w);
    r.days.forEach(x => { x.weekdays = x.weekdays.filter(v => v !== w); }); // un solo entreno por día de la semana
    if (!on) r.days[d.d].weekdays.push(w);
    touch(r); keepFocus(`[data-act=toggleWd][data-d="${d.d}"][data-w="${w}"]`);
  },
  addEx: d => { const r = cur(), x = r.days[d.d].exercises; x.push({ id: L.uid(), name: '', sets: 3, reps: '10', weight: null, note: '' }); touch(r); keepFocus(`.exname[data-d="${d.d}"][data-e="${x.length - 1}"]`); },
  moveEx: d => { const r = cur(); swap(r.days[d.d].exercises, +d.e); upd(r); },
  delEx: d => { const r = cur(); r.days[d.d].exercises.splice(d.e, 1); upd(r); },

  check(d) {
    const c = state.current, e = c.exercises[d.e], s = e.sets[d.s];
    if (s.done) { s.done = false; delete s.pr; } else {
      const g = L.suggest(L.lastSets(state.sessions, e.name), e.plan, +d.s);
      s.w ??= g.w; s.r ??= g.r;
      if (!s.r) { $(`[data-in=set][data-e="${d.e}"][data-s="${d.s}"][data-k=r]`).focus(); return toast('Pon las repeticiones'); }
      s.done = true;
      // Récord frente a entrenos anteriores y frente a lo ya hecho hoy.
      const before = { exercises: [{ name: e.name, sets: e.sets.filter(x => x !== s) }], start: c.start };
      if (L.isRecord(state.sessions, e.name, s) && (!L.doneSets(before.exercises[0]).length || L.isRecord([before], e.name, s))) { s.pr = true; toast(`Nuevo récord: ${setText(s)}`); }
      T.unlockAudio(); T.startRest(state.settings.rest);
    }
    save(); keepFocus(`[data-act=check][data-e="${d.e}"][data-s="${d.s}"]`);
  },
  addSet: d => { state.current.exercises[d.e].sets.push(L.newSet()); save(); render(); },
  async delSet(d) {
    const sets = state.current.exercises[d.e].sets;
    if (sets.at(-1).done && !await confirmar('¿Quitar una serie hecha?', setText(sets.at(-1)), 'Quitar')) return;
    sets.pop(); save(); render();
  },
  wUp: d => { swap(state.current.exercises, +d.e); save(); render(); },
  async wDel(d) {
    const e = state.current.exercises[d.e];
    if (e.sets.some(s => s.done) && !await confirmar(`¿Quitar ${e.name}?`, 'Se pierden las series de hoy.', 'Quitar')) return;
    state.current.exercises.splice(d.e, 1); save(); render();
  },
  async wAdd() {
    const { action, data } = await ask('Añadir ejercicio', html`<label class="field">Ejercicio<input name="n" list="exs" maxlength="80" required autofocus></label>`, 'Añadir');
    if (action !== 'ok' || !data.n.trim()) return;
    state.current.exercises.push({ ...L.sessionExercise({ name: data.n.trim(), sets: 3, reps: '', weight: null }), target: '' });
    save(); render();
    view.querySelectorAll('section.card')[state.current.exercises.length - 1].scrollIntoView({ block: 'center' });
  },
  async finish() {
    const c = state.current, pend = c.exercises.flatMap(e => e.sets).filter(s => !s.done).length;
    const f = L.finishSession(c, Date.now());
    if (!f) return toast('Marca al menos una serie con ✓');
    if (pend && !await confirmar('¿Terminar el entreno?', `Quedan ${pend} series sin marcar; no se guardarán.`, 'Terminar')) return;
    delete f.rest;
    state.sessions.push(f); state.current = null; save();
    go(`#/sesion/${f.id}`);
    const prs = f.exercises.flatMap(e => e.sets).filter(s => s.pr).length;
    toast(prs ? `Entreno guardado con ${prs} ${prs === 1 ? 'récord' : 'récords'}` : 'Entreno guardado');
  },
  async discard() { if (await confirmar('¿Descartar el entreno?', 'Se pierde lo apuntado hoy.', 'Descartar')) { state.current = null; save(); go('#/'); } },
  restAdd: d => T.addRest(+d.s),
  restStop: () => T.stopRest(),

  async delSession(d) {
    if (!await confirmar('¿Eliminar el entreno?', 'Desaparece de tu historial y tus gráficas.', 'Eliminar')) return;
    state.deleted[d.id] = Date.now(); state.sessions = state.sessions.filter(s => s.id !== d.id); save(); go('#/progreso');
  },
  accent: d => { state.settings.accent = d.k; save(); render(); },
  backup: () => exportFile(`rutinagym-${new Date().toLocaleDateString('sv')}.json`, JSON.stringify(state)),
  async wipe() { if (await confirmar('¿Borrar todo?', 'Rutinas, entrenos y ajustes de este móvil. No se puede deshacer.', 'Borrar todo')) { replaceState(L.emptyState()); go('#/'); } },
  install: async () => { installEvt?.prompt(); installEvt = null; },
};

/* ---------- Campos ---------- */
function setField(s, k, v) {
  const n = L.parseNum(v);
  if (k === 'w') s.w = n; else s[k] = n == null ? null : Math.round(n);
}
const INPUT = {
  rname: (d, el) => { const r = cur(); r.name = el.value.trim() || 'Mi rutina'; touch(r); },
  dname: (d, el) => { const r = cur(); r.days[d.d].name = el.value.trim() || 'Día'; touch(r); },
  ex(d, el) {
    const r = cur(), e = r.days[d.d].exercises[d.e], v = el.value.trim();
    if (d.k === 'sets') e.sets = Math.min(20, Math.max(1, Math.round(L.parseNum(v) ?? 1)));
    else if (d.k === 'weight') e.weight = L.parseNum(v);
    else e[d.k] = v;
    touch(r);
  },
  set(d, el) { setField(state.current.exercises[d.e].sets[d.s], d.k, el.value); save(); },
  wnote: (d, el) => { state.current.exercises[d.e].note = el.value; save(); },
  snote: (d, el) => { state.current.note = el.value; save(); },
  hist(d, el) {
    const s = state.sessions.find(x => x.id === d.id), x = s.exercises[d.e].sets[d.s];
    if (d.k === 'r' && !L.parseNum(el.value)) return; // una serie guardada siempre tiene repeticiones
    setField(x, d.k, el.value); delete x.pr; touch(s);
  },
  cfgname: (d, el) => { state.settings.name = el.value.trim(); save(); },
  cfgrest: (d, el) => { state.settings.rest = +el.value; save(); },
  cfgsound: (d, el) => { state.settings.sound = el.checked; save(); },
};
async function restore(el) {
  const f = el.files[0]; el.value = '';
  if (!f) return;
  let x;
  try { x = L.validateState(JSON.parse(await f.text())); } catch { return toast('Ese archivo no es una copia de RutinaGym'); }
  const { action } = await dialog('Restaurar copia', html`<p>La copia tiene ${x.routines.length} rutinas y ${x.sessions.length} entrenos.</p>`, [{ value: 'merge', label: 'Juntar con lo que tengo' }, { value: 'all', label: 'Sustituir todo', cls: 'danger' }, { value: '', label: 'Cancelar', cls: 'ghost', focus: true }]);
  if (action === 'all') replaceState(x); else if (action === 'merge') replaceState(L.merge(state, x)); else return;
  render(); toast('Copia restaurada');
}

document.addEventListener('click', async e => {
  const b = e.target.closest('[data-act]');
  if (!b || b.disabled) return;
  try { await ACT[b.dataset.act]?.(b.dataset); } catch (err) { if (err?.name !== 'AbortError' && !/cancel/i.test(err?.message ?? '')) { console.error(err); toast('Algo ha fallado. Prueba otra vez'); } }
});
document.addEventListener('input', e => { const k = e.target.dataset.in; if (k && k !== 'restore') INPUT[k]?.(e.target.dataset, e.target); });
document.addEventListener('change', e => { if (e.target.dataset.in === 'restore') restore(e.target); });
document.addEventListener('focusin', e => { if (e.target.matches('.set input')) e.target.select(); });

let installEvt = null;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; if (parse()[0] === 'ajustes') render(); });
addEventListener('hashchange', render);
addEventListener('state', render);
onSaveError(() => toast('No se pudo guardar: el móvil no tiene espacio'));

render();
navigator.storage?.persist?.();
if ('serviceWorker' in navigator && !window.Capacitor?.isNativePlatform?.()) navigator.serviceWorker.register('sw.js').catch(console.error);
