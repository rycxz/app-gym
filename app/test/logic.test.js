import test from 'node:test';
import assert from 'node:assert/strict';
import * as L from '../www/js/logic.js';

const set = (w, r, done = true) => ({ w, r, rir: null, done });
const sesion = (id, start, name, sets) => ({ id, start, end: start + 3600000, updatedAt: start, dayId: 'd1', name: 'Día', exercises: [{ id: 'e' + id, name, sets }] });

test('parseNum acepta coma decimal, vacío y rechaza basura', () => {
  assert.equal(L.parseNum('62,5'), 62.5);
  assert.equal(L.parseNum(' 40.25 '), 40.25);
  assert.equal(L.parseNum(''), null);
  assert.equal(L.parseNum('abc'), null);
  assert.equal(L.parseNum('-3'), null);
});

test('e1rm usa Epley; una repetición es el propio peso', () => {
  assert.equal(L.e1rm(100, 1), 100);
  assert.equal(L.e1rm(60, 10), 80);
  assert.equal(L.e1rm(0, 10), 0);
});

test('lastSets ignora mayúsculas y tildes y toma la sesión más reciente', () => {
  const ss = [sesion('a', 1000, 'Jalon al pecho', [set(40, 10)]), sesion('b', 2000, 'Jalón al Pecho', [set(45, 8), set(45, 7, false)])];
  assert.deepEqual(L.lastSets(ss, 'jalón al pecho'), [set(45, 8)]);
  assert.deepEqual(L.lastSets(ss, 'otra cosa'), []);
});

test('isRecord solo si supera el mejor 1RM previo y ya había historial', () => {
  const ss = [sesion('a', 1000, 'Banca', [set(60, 10)])];
  assert.equal(L.isRecord(ss, 'Banca', set(65, 10)), true);
  assert.equal(L.isRecord(ss, 'Banca', set(60, 10)), false);
  assert.equal(L.isRecord([], 'Banca', set(60, 10)), false);
});

test('isRecord en peso corporal compara repeticiones', () => {
  const ss = [sesion('a', 1000, 'Dominadas', [set(0, 8)])];
  assert.equal(L.isRecord(ss, 'Dominadas', set(0, 9)), true);
  assert.equal(L.isRecord(ss, 'Dominadas', set(0, 8)), false);
});

test('volume suma solo series hechas', () => {
  assert.equal(L.volume(sesion('a', 1, 'x', [set(50, 10), set(50, 10, false), set(null, 5)])), 500);
});

test('series de progreso en orden cronológico con mejor serie del día', () => {
  const ss = [sesion('b', 2000, 'Banca', [set(60, 8), set(70, 3)]), sesion('a', 1000, 'Banca', [set(50, 10)])];
  const p = L.progress(ss, 'banca');
  assert.deepEqual(p.map(x => x.t), [1000, 2000]);
  assert.equal(p[1].weight, 70);
});

test('dayForDate elige el día programado (lunes = 0)', () => {
  const r = { days: [{ id: 'a', weekdays: [0, 3] }, { id: 'b', weekdays: [1] }] };
  assert.equal(L.dayForDate(r, new Date(2026, 10, 23)).id, 'a'); // lunes
  assert.equal(L.dayForDate(r, new Date(2026, 10, 24)).id, 'b');
  assert.equal(L.dayForDate(r, new Date(2026, 10, 25)), null);
  assert.equal(L.dayForDate(null, new Date()), null);
});

test('upcoming da los próximos entrenos sin contar hoy', () => {
  const r = { days: [{ id: 'a', weekdays: [0, 3] }, { id: 'b', weekdays: [1] }] };
  assert.deepEqual(L.upcoming(r, new Date(2026, 10, 24), 3).map(x => [x.day.id, x.inDays]), [['a', 2], ['a', 6], ['b', 7]]);
});

test('racha: semanas seguidas; la actual vacía no la rompe', () => {
  const W = 7 * 86400000, now = new Date(2026, 10, 24, 12).getTime();
  const s = n => sesion('s' + n, now - n * W, 'x', [set(1, 1)]);
  assert.equal(L.weekStreak([s(0), s(1), s(2), s(4)], now), 3);
  assert.equal(L.weekStreak([s(1), s(2)], now), 2);
  assert.equal(L.weekStreak([s(2)], now), 0);
});

test('parseNotes convierte un bloc de notas en días y ejercicios', () => {
  const d = L.parseNotes(`Lunes - Pecho\nPress banca 4x8-10 60kg\n- Aperturas 3 x 12 12,5 kg lento\n\nMIÉRCOLES: Espalda\n1. Dominadas 4x8\nRemo con barra 50kg 4x10\n`);
  assert.equal(d.length, 2);
  assert.deepEqual([d[0].name, d[0].weekdays], ['Pecho', [0]]);
  assert.deepEqual([d[1].name, d[1].weekdays], ['Espalda', [2]]);
  const p = e => [e.name, e.sets, e.reps, e.weight];
  assert.deepEqual(p(d[0].exercises[0]), ['Press banca', 4, '8-10', 60]);
  assert.deepEqual(p(d[0].exercises[1]), ['Aperturas', 3, '12', 12.5]);
  assert.equal(d[0].exercises[1].note, 'lento');
  assert.deepEqual(p(d[1].exercises[0]), ['Dominadas', 4, '8', null]);
  assert.deepEqual(p(d[1].exercises[1]), ['Remo con barra', 4, '10', 50]);
});

test('parseNotes: cabecera sin día de la semana y ejercicios sin cabecera', () => {
  const d = L.parseNotes('Sentadilla 5x5 80\nPierna:\nPrensa 3x12');
  assert.equal(d[0].name, 'Día 1');
  assert.equal(d[0].exercises[0].weight, 80);
  assert.equal(d[1].name, 'Pierna');
  assert.deepEqual(L.parseNotes('  \n'), []);
});

test('parseNotes: "Lunes" a secas usa el nombre del día', () => {
  assert.equal(L.parseNotes('Lunes\nCurl 3x10')[0].name, 'Lunes');
});

const est = o => ({ ...L.emptyState(), ...o });

test('merge conserva lo de ambos y gana lo más nuevo', () => {
  const a = est({ routines: [{ id: 'r', name: 'vieja', updatedAt: 1, days: [] }], sessions: [sesion('a', 1, 'x', [])] });
  const b = est({ routines: [{ id: 'r', name: 'nueva', updatedAt: 2, days: [] }], sessions: [sesion('b', 2, 'x', [])] });
  for (const m of [L.merge(a, b), L.merge(b, a)]) {
    assert.equal(m.routines[0].name, 'nueva');
    assert.deepEqual(m.sessions.map(s => s.id).sort(), ['a', 'b']);
  }
});

test('merge no resucita lo borrado', () => {
  const a = est({ deleted: { r: 5 } });
  const b = est({ routines: [{ id: 'r', name: 'x', updatedAt: 1, days: [] }], activeId: 'r' });
  const m = L.merge(a, b);
  assert.equal(m.routines.length, 0);
  assert.equal(m.activeId, null);
});

test('merge conserva el entreno en curso del propio móvil', () => {
  assert.equal(L.merge(est({ current: { id: 'mio' } }), est({ current: { id: 'otro' } })).current.id, 'mio');
});

test('validateState acepta una copia buena y rechaza archivos ajenos', () => {
  assert.equal(L.validateState(L.emptyState()).v, 1);
  for (const x of [null, {}, [], { v: 1, routines: 'x' }, { ...L.emptyState(), sessions: [{ id: 1 }] }, { ...L.emptyState(), routines: [{ id: 'a', name: 'b', updatedAt: 1, days: [{}] }] }])
    assert.throws(() => L.validateState(x));
});

test('compartir rutina: ida y vuelta con ids nuevos y sin historial', () => {
  const r = { id: 'r', name: 'Ñandú 💪', updatedAt: 1, days: [{ id: 'd', name: 'A', weekdays: [0], exercises: [{ id: 'e', name: 'Banca', sets: 3, reps: '10', weight: 60, note: '' }] }] };
  const x = L.decodeRoutine(L.encodeRoutine(r));
  assert.equal(x.name, r.name);
  assert.notEqual(x.id, 'r');
  assert.notEqual(x.days[0].id, 'd');
  assert.equal(x.days[0].exercises[0].name, 'Banca');
  assert.throws(() => L.decodeRoutine('RG1.basura'));
  assert.throws(() => L.decodeRoutine('hola'));
});

test('startSession copia el plan y prepara las series', () => {
  const day = { id: 'd', name: 'A', exercises: [{ id: 'e', name: 'Banca', sets: 2, reps: '8-10', weight: 60, note: 'n' }] };
  const s = L.startSession('r', day, 1000);
  assert.equal(s.exercises[0].sets.length, 2);
  assert.deepEqual(s.exercises[0].sets[0], { w: null, r: null, rir: null, done: false });
  assert.equal(s.exercises[0].target, '2×8-10 · 60 kg');
});

test('finishSession descarta series sin hacer y devuelve null si no hay nada', () => {
  const s = { id: 's', start: 1, exercises: [{ name: 'a', sets: [set(1, 1), set(2, 2, false)] }, { name: 'b', sets: [set(1, 1, false)] }] };
  const f = L.finishSession(s, 99);
  assert.deepEqual([f.end, f.exercises.length, f.exercises[0].sets.length], [99, 1, 1]);
  assert.equal(L.finishSession({ ...s, exercises: [] }, 9), null);
});

test('suggest: última vez primero, si no el plan', () => {
  assert.deepEqual(L.suggest([set(70, 6)], { weight: 60, reps: '8-10' }, 0), { w: 70, r: 6 });
  assert.deepEqual(L.suggest([set(70, 6)], { weight: 60, reps: '8-10' }, 3), { w: 70, r: 6 });
  assert.deepEqual(L.suggest([], { weight: 60, reps: '8-10' }, 0), { w: 60, r: 8 });
  assert.deepEqual(L.suggest([], { weight: null, reps: 'fallo' }, 0), { w: null, r: null });
});
