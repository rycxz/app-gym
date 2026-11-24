// Recorrido completo en un navegador real. Uso:
//   npm i --no-save playwright-core && npx playwright-core install webkit
//   npm start   (en otra terminal)   y   node test/e2e.mjs [webkit|msedge] [carpeta-capturas]
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const pw = createRequire(process.env.PW_DIR ? process.env.PW_DIR + '/x.js' : import.meta.url)('playwright-core');
const [engine = 'msedge', shots] = process.argv.slice(2);
const URL_ = process.env.APP_URL ?? 'http://localhost:5173/';
const b = engine === 'webkit' ? await pw.webkit.launch() : await pw.chromium.launch({ channel: engine });
const ctx = await b.newContext({ ...pw.devices[engine === 'webkit' ? 'iPhone 13' : 'Pixel 7'], defaultBrowserType: undefined, colorScheme: 'dark' });
const p = await ctx.newPage();
const errors = [];
p.on('pageerror', e => errors.push(String(e)));
p.on('console', m => { if (m.type() === 'error' && !/404|Failed to load/.test(m.text())) errors.push(m.text()); });
const shot = async n => {
  if (shots) await p.screenshot({ path: `${shots}/${engine}-${n}.png` });
  assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `desborda a lo ancho: ${n}`);
};
const act = (a, extra = '') => p.locator(`[data-act=${a}]${extra}`).first();
const dlg = t => p.locator('dialog button', { hasText: t }).click();
const st = () => p.evaluate(() => JSON.parse(localStorage.getItem('rutinagym')));

await p.goto(URL_);
await shot('1-vacio');

// Bloc de notas con un intento de inyección en el nombre
const hoy = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][new Date().getDay()];
await act('pasteNotes').click();
await p.locator('dialog textarea').fill(`${hoy} - Pecho\nPress banca 2x8 60kg\n<img src=x onerror=window.hacked=1> 1x10 20kg`);
await dlg('Convertir');
await p.waitForSelector('.day');
await shot('2-editor');
await p.goto(URL_ + '#/');
await act('start').click();
await p.waitForSelector('.set');

// Marcar vacío usa lo planificado; coma decimal; temporizador
await act('check', '[data-e="0"][data-s="0"]').click();
await p.locator('[data-in=set][data-e="0"][data-s="1"][data-k=w]').fill('62,5');
await act('check', '[data-e="0"][data-s="1"]').click();
assert.ok(await p.locator('#rest').isVisible());
await act('check', '[data-e="1"][data-s="0"]').click();
await shot('3-entreno');

// Recargar a mitad no pierde nada
await p.reload();
let s = await st();
assert.deepEqual(s.current.exercises[0].sets.map(x => [x.w, x.r, x.done]), [[60, 8, true], [62.5, 8, true]]);
await act('finish').click();
await p.waitForURL(/sesion/);
s = await st();
assert.equal(s.current, null);
assert.equal(s.sessions.length, 1);

// Segundo día: récord
await p.evaluate(() => { const s = JSON.parse(localStorage.rutinagym); s.sessions[0].start -= 7 * 864e5; s.sessions[0].end -= 7 * 864e5; localStorage.rutinagym = JSON.stringify(s); });
await p.goto(URL_ + '#/'); await p.reload();
await act('start').click();
await p.locator('[data-in=set][data-e="0"][data-s="0"][data-k=w]').fill('70');
await act('check', '[data-e="0"][data-s="0"]').click();
assert.equal(await p.locator('.pr').count(), 1);
await act('finish').click();
await dlg('Terminar');
await p.waitForURL(/sesion/);
await shot('4-sesion');
await p.goto(URL_ + '#/'); await shot('5-hoy');
await p.goto(URL_ + '#/progreso'); await shot('6-progreso');
await p.goto(URL_ + '#/ejercicio/Press%20banca'); await p.waitForSelector('.chart'); await shot('7-ejercicio');
await p.goto(URL_ + '#/rutinas'); await shot('8-rutinas');
await p.goto(URL_ + '#/ajustes'); await shot('9-ajustes');

// Restaurar una copia ajena se rechaza; una buena se acepta
const file = t => ({ name: 'x.json', mimeType: 'application/json', buffer: Buffer.from(t) });
await p.locator('input[type=file]').setInputFiles(file('{"hola":1}'));
await p.getByText('no es una copia').waitFor();
await p.locator('input[type=file]').setInputFiles(file(JSON.stringify(await st())));
await dlg('Juntar');
assert.equal((await st()).sessions.length, 2);

// Compartir una rutina e importarla
const code = await p.evaluate(async () => { const L = await import('./js/logic.js'); return L.encodeRoutine(JSON.parse(localStorage.rutinagym).routines[0]); });
await p.goto(URL_ + '#/rutinas');
await act('pasteCode').click();
await p.locator('dialog textarea').fill('mira esto: ' + code);
await dlg('Añadir');
await p.waitForURL(/rutina\//);
assert.equal((await st()).routines.length, 2);

// Cerrar un diálogo con Esc no ejecuta nada
await act('delRoutine').click();
await p.keyboard.press('Escape');
assert.equal((await st()).routines.length, 2);

assert.equal(await p.evaluate(() => window.hacked), undefined, 'inyección HTML');

// Pantalla pequeña
await p.setViewportSize({ width: 320, height: 600 });
for (const h of ['', 'rutinas', 'progreso', 'ajustes']) { await p.goto(URL_ + '#/' + h); await shot('320-' + (h || 'hoy')); }

// Sin conexión
if (engine !== 'webkit') {
  await p.evaluate(() => navigator.serviceWorker.ready);
  await ctx.setOffline(true);
  await p.reload();
  await p.waitForSelector('#nav a');
}
assert.deepEqual(errors, []);
await b.close();
console.log(`e2e ${engine}: OK`);
