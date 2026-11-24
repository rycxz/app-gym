// Lógica pura: sin DOM ni almacenamiento, para poder probarla con `npm test`.
export const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export const uid = () => {
  const b = crypto.getRandomValues(new Uint8Array(9));
  return Array.from(b, x => x.toString(36).padStart(2, '0')).join('');
};
export const norm = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').trim().replace(/\s+/g, ' ').toLowerCase();

export function parseNum(v) {
  const s = String(v ?? '').trim().replace(',', '.');
  return /^\d+(\.\d+)?$/.test(s) ? Number(s) : null;
}

export const emptyState = () => ({
  v: 1, routines: [], activeId: null, activeAt: 0, sessions: [], current: null, deleted: {},
  settings: { rest: 90, sound: true, accent: 'lima', name: '' },
});

/* ---------- Series y récords ---------- */
export const e1rm = (w, r) => (!w || !r ? 0 : r === 1 ? w : w * (1 + r / 30));
export const doneSets = ex => ex.sets.filter(s => s.done && s.r);
export const volume = s => s.exercises.reduce((t, e) => t + doneSets(e).reduce((a, x) => a + (x.w || 0) * x.r, 0), 0);

const newestFirst = ss => [...ss].sort((a, b) => b.start - a.start);

export function lastSets(sessions, name) {
  const n = norm(name);
  for (const s of newestFirst(sessions)) {
    const sets = s.exercises.filter(e => norm(e.name) === n).flatMap(doneSets);
    if (sets.length) return sets;
  }
  return [];
}

export function isRecord(sessions, name, set) {
  const n = norm(name);
  const prev = sessions.flatMap(s => s.exercises).filter(e => norm(e.name) === n).flatMap(doneSets);
  if (!prev.length || !set.r) return false;
  const score = e1rm(set.w, set.r);
  if (score) return prev.every(p => e1rm(p.w, p.r) < score);
  return prev.every(p => !p.w && p.r < set.r);
}

export function progress(sessions, name) {
  const n = norm(name);
  return newestFirst(sessions).reverse().flatMap(s => {
    const sets = s.exercises.filter(e => norm(e.name) === n).flatMap(doneSets);
    if (!sets.length) return [];
    return [{
      t: s.start,
      weight: Math.max(...sets.map(x => x.w || 0)),
      e1rm: Math.max(...sets.map(x => e1rm(x.w, x.r))),
      reps: Math.max(...sets.map(x => x.r)),
    }];
  });
}

export function suggest(last, plan, i) {
  const s = last[Math.min(i, last.length - 1)];
  if (s) return { w: s.w, r: s.r };
  const m = /\d+/.exec(plan?.reps ?? '');
  return { w: plan?.weight ?? null, r: m ? Number(m[0]) : null };
}

/* ---------- Calendario ---------- */
export const weekday = d => (d.getDay() + 6) % 7;
export const dayForDate = (routine, d) => routine?.days.find(x => x.weekdays.includes(weekday(d))) ?? null;

export function upcoming(routine, from, n) {
  const out = [];
  for (let i = 1; i <= 14 && out.length < n; i++) {
    const date = new Date(from.getFullYear(), from.getMonth(), from.getDate() + i);
    const day = dayForDate(routine, date);
    if (day) out.push({ day, date, inDays: i });
  }
  return out;
}

export function weekStart(t) {
  const d = new Date(t);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - weekday(d)).getTime();
}
const prevWeek = t => { const d = new Date(t); return new Date(d.getFullYear(), d.getMonth(), d.getDate() - 7).getTime(); };

export function weekStreak(sessions, now) {
  const weeks = new Set(sessions.map(s => weekStart(s.start)));
  let w = weekStart(now), n = 0;
  if (!weeks.has(w)) w = prevWeek(w);
  for (; weeks.has(w); w = prevWeek(w)) n++;
  return n;
}

/* ---------- Entreno ---------- */
export const newSet = () => ({ w: null, r: null, rir: null, done: false });
export const fmt = n => (n == null ? '' : String(Math.round(n * 100) / 100).replace('.', ','));

export const planText = e => `${e.sets}×${e.reps}${e.weight ? ` · ${fmt(e.weight)} kg` : ''}`;

export function sessionExercise(e) {
  return {
    id: uid(), name: e.name, target: planText(e), plan: { reps: e.reps, weight: e.weight }, note: e.note || '',
    sets: Array.from({ length: e.sets }, newSet),
  };
}
export function startSession(routineId, day, now) {
  return { id: uid(), routineId, dayId: day?.id ?? null, name: day?.name ?? 'Entreno libre', start: now, end: null, updatedAt: now, note: '', exercises: (day?.exercises ?? []).map(sessionExercise) };
}
export function finishSession(s, now) {
  const exercises = s.exercises.map(e => ({ ...e, sets: doneSets(e) })).filter(e => e.sets.length);
  return exercises.length ? { ...s, end: now, updatedAt: now, exercises } : null;
}

/* ---------- Bloc de notas → rutina ---------- */
const NDAYS = DAYS.map(norm);
const EX = /(\d+)\s*[x×*]\s*(\d+(?:\s*-\s*\d+)?|fallo|amrap)/i;

export function parseNotes(text) {
  const days = [];
  const addDay = (name, weekdays = []) => days.push({ id: uid(), name, weekdays, exercises: [] });
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/^\s*(?:[-*•·]|\d+[.)](?=\s))\s*/, '').trim();
    if (!line) continue;
    const m = EX.exec(line);
    const first = norm(line).split(/[^a-z]+/)[0];
    const wd = NDAYS.indexOf(first);
    if (!m && (wd >= 0 || line.endsWith(':'))) {
      const clean = line.replace(/:$/, '').trim();
      const rest = wd >= 0 ? clean.replace(/^\S+?(?=[\s:–-]|$)[\s:–-]*/, '').trim() : clean;
      addDay(rest || DAYS[wd], wd >= 0 ? [wd] : []);
      continue;
    }
    if (!days.length) addDay('Día 1');
    let weight = null, rest = line;
    if (m) rest = rest.replace(m[0], '\u0001');
    const kg = /(\d+(?:[.,]\d+)?)\s*(?:kgs?|kilos?)\b\.?/i.exec(rest) || (m && /\u0001\s*(?:@|a|con|-)?\s*(\d+(?:[.,]\d+)?)(?!\w)/.exec(rest));
    if (kg) { weight = parseNum(kg[1]); rest = rest.replace(kg[0], '\u0002'); }
    const [name, ...tail] = rest.split(/[\u0001\u0002]/).map(x => x.replace(/^[\s,:;@()–-]+|[\s,:;@()–-]+$/g, ''));
    days.at(-1).exercises.push({
      id: uid(), name: name || tail.find(Boolean) || 'Ejercicio', sets: m ? Math.min(20, Math.max(1, Number(m[1]))) : 3,
      reps: m ? m[2].replace(/\s/g, '') : '10', weight, note: name ? tail.filter(Boolean).join(' ') : '',
    });
  }
  return days;
}

/* ---------- Copias, compartir y sincronizar ---------- */
const isStr = x => typeof x === 'string';
const isNum = x => Number.isFinite(x);
const isArr = Array.isArray;
const numOrNull = x => x === null || isNum(x);
const exOk = e => e && isStr(e.name) && isNum(e.sets) && e.sets >= 1 && e.sets <= 20 && isStr(e.reps) && numOrNull(e.weight) && isStr(e.note ?? '');
const dayOk = d => d && isStr(d.id) && isStr(d.name) && isArr(d.weekdays) && d.weekdays.every(isNum) && isArr(d.exercises) && d.exercises.every(exOk);
const routineOk = r => r && isStr(r.id) && isStr(r.name) && isNum(r.updatedAt) && isArr(r.days) && r.days.every(dayOk);
const sessionOk = s => s && isStr(s.id) && isStr(s.name) && isNum(s.start) && isArr(s.exercises) &&
  s.exercises.every(e => e && isStr(e.name) && isArr(e.sets) && e.sets.every(x => x && numOrNull(x.w) && numOrNull(x.r)));

export function validateState(x) {
  if (!x || x.v !== 1 || !isArr(x.routines) || !isArr(x.sessions) || !x.routines.every(routineOk) || !x.sessions.every(sessionOk))
    throw new Error('El archivo no es una copia de RutinaGym');
  const base = emptyState();
  return {
    ...base, ...x,
    current: x.current && sessionOk(x.current) ? x.current : null,
    deleted: x.deleted && typeof x.deleted === 'object' ? x.deleted : {},
    settings: { ...base.settings, ...x.settings },
  };
}

function mergeList(a, b, deleted) {
  const map = new Map();
  for (const x of [...a, ...b]) {
    const old = map.get(x.id);
    if (!old || (x.updatedAt || 0) > (old.updatedAt || 0)) map.set(x.id, x);
  }
  return [...map.values()].filter(x => !(x.id in deleted));
}
export function merge(local, remote) {
  const deleted = { ...remote.deleted, ...local.deleted };
  const routines = mergeList(local.routines, remote.routines, deleted);
  const win = (remote.activeAt || 0) > (local.activeAt || 0) || (!local.activeId && !local.activeAt) ? remote : local;
  return {
    ...local, deleted, routines, sessions: mergeList(local.sessions, remote.sessions, deleted),
    activeId: routines.some(r => r.id === win.activeId) ? win.activeId : routines[0]?.id ?? null,
    activeAt: win.activeAt || 0,
  };
}

const PREFIX = 'RG1.';
export function encodeRoutine(r) {
  const bytes = new TextEncoder().encode(JSON.stringify({ name: r.name, days: r.days }));
  return PREFIX + btoa(Array.from(bytes, b => String.fromCharCode(b)).join('')).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function freshRoutine(name, days, now = Date.now()) {
  return { id: uid(), name, updatedAt: now, days: days.map(d => ({ ...d, id: uid(), exercises: d.exercises.map(e => ({ ...e, id: uid() })) })) };
}
export function decodeRoutine(code) {
  const m = /RG1\.([\w-]+)/.exec(code);
  if (!m) throw new Error('Código de rutina no válido');
  const bin = atob(m[1].replace(/-/g, '+').replace(/_/g, '/'));
  const x = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0))));
  if (!isStr(x.name) || !isArr(x.days) || !x.days.every(dayOk)) throw new Error('Código de rutina no válido');
  return freshRoutine(x.name, x.days);
}
