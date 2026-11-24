// html`...` escapa todo lo interpolado salvo lo que ya sea otro html`...`.
class Safe { constructor(s) { this.s = s; } toString() { return this.s; } }
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const put = v => v instanceof Safe ? v.s : Array.isArray(v) ? v.map(put).join('') : v == null || v === false ? '' : String(v).replace(/[&<>"']/g, c => ESC[c]);
export const html = (p, ...v) => new Safe(p.reduce((a, x, i) => a + put(v[i - 1]) + x));

const P = {
  hoy: '<path d="M6 7v10M3 9.5v5M18 7v10M21 9.5v5M6 12h12"/>',
  rutinas: '<path d="M8 6h12M8 12h12M8 18h12M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>',
  progreso: '<path d="M4 19V5M4 19h16M8 15l4-5 3 3 5-7"/>',
  ajustes: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>', plus: '<path d="M12 5v14M5 12h14"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>',
  up: '<path d="M6 15l6-6 6 6"/>', down: '<path d="M6 9l6 6 6-6"/>', back: '<path d="M15 5l-7 7 7 7"/>', next: '<path d="M9 5l7 7-7 7"/>',
  trash: '<path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/>', share: '<path d="M12 15V4M8 8l4-4 4 4M5 13v7h14v-7"/>',
};
export const icon = n => new Safe(`<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${P[n]}</svg>`);

let toastT;
export function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2800);
}

/** Muestra un <dialog> y devuelve {action, data}; action '' si se cierra sin elegir. */
export function dialog(title, body, buttons) {
  return new Promise(resolve => {
    const d = document.createElement('dialog');
    d.setAttribute('aria-labelledby', 'dlg-t');
    d.innerHTML = html`<form method="dialog"><h1 id="dlg-t">${title}</h1>${body}
      <div class="dlg-btns">${buttons.map(b => html`<button value="${b.value}" class="btn ${b.cls ?? ''}" ${b.cancel ? html`formnovalidate` : ''} ${b.focus ? html`autofocus` : ''}>${b.label}</button>`)}</div></form>`;
    document.body.append(d);
    d.addEventListener('close', () => {
      const r = { action: d.returnValue, data: Object.fromEntries(new FormData(d.querySelector('form'))) };
      d.remove(); resolve(r);
    });
    d.showModal();
  });
}
export const confirmar = async (title, text, yes) =>
  (await dialog(title, html`<p>${text}</p>`, [{ value: 'si', label: yes, cls: 'danger' }, { value: '', label: 'Cancelar', cls: 'ghost', cancel: true, focus: true }])).action === 'si';

const native = () => window.Capacitor?.isNativePlatform?.();
export async function exportFile(name, text) {
  if (native()) {
    const { Filesystem, Share } = window.Capacitor.Plugins;
    const { uri } = await Filesystem.writeFile({ path: name, data: text, directory: 'CACHE', encoding: 'utf8' });
    return Share.share({ title: name, files: [uri] });
  }
  const file = new File([text], name, { type: 'application/json' });
  if (matchMedia('(pointer: coarse)').matches && navigator.canShare?.({ files: [file] })) return navigator.share({ files: [file], title: name });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
export async function shareText(title, text) {
  if (native()) return window.Capacitor.Plugins.Share.share({ title, text });
  if (navigator.share) return navigator.share({ title, text });
  await navigator.clipboard.writeText(text);
  toast('Copiado. Pégalo en WhatsApp');
}
