// Makes the A3 menu in two separate languages from the designed page menu-a3.html (which holds both):
//   menu-a3-ar.html / .pdf / .png (Arabic only) and menu-a3-en.html / .pdf / .png (English only).
// Each page's text sizes (--f, --h, --s, --pad, --gap) are fitted to fill the page and saved in it.
// Run: node split-menu.cjs   (needs Playwright). Edit menu-a3.html (items, prices, hours), then run this again.
const {chromium} = require('playwright'), fs = require('fs'), path = require('path');
const SRC = path.join(__dirname, 'menu-a3.html'), URL = 'hananekalakesh.github.io/BachaSnackOrder';

// runs inside the page: keeps one language
function onlyLang(lang) {
  const $$ = s => [...document.querySelectorAll(s)];
  const en = lang === 'en';
  document.documentElement.lang = lang; document.documentElement.dir = en ? 'ltr' : 'rtl';
  document.title = en ? 'El Bash menu' : 'منيو الباش';
  // headings with the other language in a span: keep one
  $$('h1, h2, h3').forEach(h => { const s = h.querySelector('span'); if (!s) return; if (en) h.textContent = s.textContent; else s.remove() });
  // item names: <b>Arabic</b><i>English</i>
  $$('.name').forEach(n => { const b = n.querySelector('b'), i = n.querySelector('i'); if (en && i) b.textContent = i.textContent; if (i) i.remove() });
  // sizes: <b>4 قطع<em>4 PCS</em></b>
  $$('.chips b').forEach(b => { const e = b.querySelector('em'); if (en && e) b.textContent = e.textContent; else if (e) e.remove() });
  // the header and footer lines
  const order = document.querySelector('.order');
  order.innerHTML = (en ? 'Order online from our menu' : 'اطلب أونلاين من المنيو') + ' <span class="url">' + '__URL__' + '</span>';
  const hours = document.querySelector('.hours'), he = hours.querySelector('.en');
  if (en) hours.textContent = he.textContent; else he.remove();
  const qr = document.querySelector('.qr p');
  qr.innerHTML = en ? 'Scan to see the photos and order<span class="call">Call 76 075 724</span>' : 'امسح الرمز لتشوف الصور وتطلب<span class="call">للاتصال <bdi>76 075 724</bdi></span>';
  $$('footer > span').forEach(s => { const e = s.querySelector('.en'); if (!e) return; if (en) s.textContent = e.textContent; else e.remove() });
  if (en) { const sig = document.querySelector('footer .sig'); sig.lastChild.textContent = 'Tekram ya basha!' }
  $$('.lockup').forEach(l => l.style.direction = 'ltr');
  // English: Latin fonts, and the names read left to right
  const css = document.createElement('style');
  css.textContent = (en
    ? 'body{font-family:"Plus Jakarta Sans",sans-serif}.info h1,h2{font:900 var(--h)/1.1 Archivo,sans-serif;font-stretch:80%;text-transform:uppercase}.info h1{font-size:13mm}' +
      'footer .sig{font:900 6mm Archivo,sans-serif;font-stretch:85%}.qr p{width:40mm}'
    : '') +
    '.order .url{font:700 3.8mm "Plus Jakarta Sans",sans-serif;direction:ltr;unicode-bidi:isolate;opacity:.95}.qr p .call{display:block;margin-top:2mm;font-size:4mm;color:#FAF5EC}' +
    '.qr p bdi{font-family:"Plus Jakarta Sans";font-weight:800}';
  document.head.appendChild(css);
}

(async () => {
  const b = await chromium.launch();
  for (const lang of ['ar', 'en']) {
    const p = await b.newPage({viewport: {width: 1587, height: 1123}, deviceScaleFactor: 4963 / 1587});
    await p.goto('file://' + SRC); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(2500);
    await p.evaluate(onlyLang, lang);
    await p.evaluate(u => { const s = document.querySelector('.order .url'); s.textContent = u }, URL);
    // the biggest text that still fits every column
    const set = f => p.evaluate(f => {
      const r = document.documentElement.style;
      r.setProperty('--f', f + 'mm'); r.setProperty('--h', (f * 1.9) + 'mm'); r.setProperty('--s', f + 'mm'); r.setProperty('--pad', (f * .12) + 'mm'); r.setProperty('--gap', (f * .8) + 'mm');
      return Math.max(...[...document.querySelectorAll('.col')].map(c => c.scrollHeight - c.clientHeight),
        ...[...document.querySelectorAll('.row')].map(x => x.scrollWidth - x.clientWidth));
    }, f);
    let lo = 2, hi = 8;
    for (let i = 0; i < 20; i++) { const m = (lo + hi) / 2; (await set(m)) <= 0 ? lo = m : hi = m }
    const f = Math.floor(lo * 20) / 20; await set(f);
    const html = '<!doctype html>\n' + await p.evaluate(() => document.documentElement.outerHTML);
    fs.writeFileSync(path.join(__dirname, `menu-a3-${lang}.html`), html);
    await p.waitForTimeout(500);
    await p.pdf({path: path.join(__dirname, `menu-a3-${lang}.pdf`), width: '420mm', height: '297mm', printBackground: true});
    await p.screenshot({path: path.join(__dirname, `menu-a3-${lang}.png`)});
    console.log(lang, 'text size', f + 'mm');
  }
  await b.close();
})();
