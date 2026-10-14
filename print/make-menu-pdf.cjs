// Builds one-page A3 landscape print menus from the menu data in ../index.html:
//   print/menu-a3-en.pdf (English) and print/menu-a3-ar.pdf (Arabic)
// Run: node print/make-menu-pdf.cjs   (needs Playwright + Chromium)
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');

const TEXT = {
  en: {order: 'Order on WhatsApp', tag: 'Chicken &amp; Snack', pcs: n => `${n} PCS`, scan: 'Scan to see photos &amp; order',
    hours: 'Daily 1:00 – 5:00 PM &amp; 7:00 – 11:30 PM · Closed on Mondays',
    currency: 'Prices in L.L.', market: 'Prices may change based on market rates'},
  ar: {order: 'اطلب عبر واتساب', tag: 'تشيكن آند سناك', pcs: n => `${n} قطع`, scan: 'امسح الرمز لتشوف الصور وتطلب',
    hours: 'كل يوم من 1:00 لـ 5:00 بعد الضهر ومن 7:00 لـ 11:30 بالليل · مسكّرين يوم الاثنين',
    currency: 'الأسعار بالليرة اللبنانية', market: 'الأسعار ممكن تتغيّر حسب أسعار السوق'}
};
// Sections split into three columns of about the same length
const COLUMNS = [['fries', 'meals', 'plates'], ['sandwiches', 'extras'], ['family', 'burgers', 'drinks']];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('file://' + path.join(root, 'index.html'));

  // Pull sections, names and prices from the page's own data and translators
  const menu = await page.evaluate(() => {
    const num = n => n.toLocaleString('en-US');
    const both = s => ({en: s, ar: AR.ui[s] || s});
    const sections = [...document.querySelectorAll('section')].filter(s => s.id !== 'popular').map(sec => ({
      id: sec.id, title: both(sec.querySelector('h2').dataset.en),
      groups: [...sec.querySelectorAll('[id$=Grid]')].map(g => {
        const prev = g.previousElementSibling, sub = prev && prev.classList.contains('subhead') ? prev.dataset.en : '';
        return {sub: sub ? both(sub) : null, items: data[g.id].map(([name, price, , type]) => ({
          name: {en: name, ar: inLang('ar', () => tName(name))}, pop: CONFIG.popular.includes(name),
          price: type === 'p' ? null : num(price) + (USD[name] ? ` ($${USD[name]})` : ''),
          pieces: type === 'p' ? Object.entries(CONFIG.pieces).map(([n, p]) => [n, num(p)]) : null
        }))};
      })
    }));
    return {sections, phone: CONFIG.phoneDisplay};
  });

  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  const qr = fs.readFileSync(path.join(__dirname, 'qr.svg'), 'utf8').replace(/<\?xml[^>]*>/, '')
    .replace(/width="(\d+)" height="(\d+)"/, 'viewBox="0 0 $1 $2" shape-rendering="crispEdges"');
  const byId = Object.fromEntries(menu.sections.map(s => [s.id, s]));

  function build(lang) {
    const T = TEXT[lang];
    const row = it => `<div class="row"><span class="name">${esc(it.name[lang])}</span><span class="dots"></span>${it.price ? `<span class="price">${it.price}</span>` : ''}</div>`
      + (it.pieces ? `<div class="pcs">${it.pieces.map(([n, p]) => `<span><b>${T.pcs(n)}</b> ${p}</span>`).join('')}</div>` : '');
    const sec = s => `<div class="sec"><h2>${esc(s.title[lang])}</h2>${s.groups.map(g =>
      `<div class="grp">${g.sub ? `<h3>${esc(g.sub[lang])}</h3>` : ''}${g.items.map(row).join('')}</div>`).join('')}</div>`;
    const body = COLUMNS.map(ids => `<div class="col">${ids.map(id => sec(byId[id])).join('')}</div>`).join('');
    return `<!doctype html><html lang="${lang}" dir="${lang === 'ar' ? 'rtl' : 'ltr'}"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@75..100,700..900&family=Cairo:wght@500;600;700;800;900&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap" rel="stylesheet">
<style>
@page{size:A3 landscape;margin:0}
*{box-sizing:border-box}
html,body{margin:0;width:420mm;height:297mm;background:#fbf6ec;color:#1c1a15;font-family:${lang === 'ar' ? 'Cairo' : "'Plus Jakarta Sans'"},sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{width:420mm;height:297mm;display:flex;flex-direction:column}
header{position:relative;overflow:hidden;background:#1f4a37;color:#f5ecdc;padding:5.5mm 12mm;display:flex;align-items:center;gap:10mm}
header::before{content:'';position:absolute;inset:0;background:repeating-linear-gradient(135deg,#ffffff09 0 5mm,transparent 5mm 10mm)}
header>*{position:relative}
.logo{display:flex;align-items:flex-end;gap:6mm;direction:ltr}
.logo h1{margin:0;font:900 22mm/.8 Archivo;font-stretch:75%;letter-spacing:-.5mm}
.logo .ar{font:900 16mm/1 Cairo;color:#f2a516}
.tag{margin-top:2.5mm;font:700 4.4mm ${lang === 'ar' ? 'Cairo' : 'Archivo'};font-stretch:85%;letter-spacing:${lang === 'ar' ? '0' : '.9mm'};text-transform:uppercase}
.info{flex:1;display:flex;flex-direction:column;align-items:center;gap:2.5mm;text-align:center}
.order{background:#f2a516;color:#1c1a15;border-radius:99mm;padding:2.4mm 9mm;font-weight:800;font-size:7mm}
.order bdi{font-family:'Plus Jakarta Sans'}
.hours{font-size:4.8mm;font-weight:600}
.qr{display:flex;align-items:center;gap:4mm}
.qr .box{background:#fff;padding:2mm;border-radius:3mm;width:30mm;height:30mm}
.qr .box svg{width:100%;height:100%;display:block}
.qr p{margin:0;font-weight:800;font-size:5mm;line-height:1.3;width:38mm;color:#f2a516}
main{flex:1;min-height:0;display:grid;grid-template-columns:repeat(3,1fr);gap:0 10mm;padding:6mm 12mm 0}
.col{min-height:0;overflow:hidden}
.col+.col{border-inline-start:.3mm solid #1c1a1518;padding-inline-start:10mm;margin-inline-start:-5mm}
.sec{margin-bottom:var(--gap)}
h2{margin:0 0 1.6mm;padding:1.2mm 4mm .9mm;border-radius:2.5mm;background:#c7361f;color:#fff;border-inline-start:2.2mm solid #f2a516;font:900 var(--h)/1.1 ${lang === 'ar' ? 'Cairo' : 'Archivo'};font-stretch:78%;text-transform:uppercase}
h3::after{content:'';flex:1;height:.6mm;background:#1f4a3740;border-radius:1mm}
h3{display:flex;align-items:center;gap:3mm;margin:2.2mm 0 .6mm;color:#1f4a37;font-weight:900;font-size:var(--s);text-transform:uppercase;letter-spacing:${lang === 'ar' ? '0' : '.3mm'}}
.row{display:flex;align-items:baseline;gap:2.5mm;padding:var(--pad) 0;font-size:var(--f);line-height:1.2}
.name{font-weight:700}
.dots{flex:1;min-width:6mm;border-bottom:.4mm dotted #1c1a1560;transform:translateY(-.25em)}
.price{font-weight:800;color:#c7361f;white-space:nowrap;font-family:'Plus Jakarta Sans';direction:ltr;unicode-bidi:isolate}
.pcs{display:grid;grid-template-columns:repeat(2,max-content);gap:.4mm 8mm;padding:0 0 var(--pad);padding-inline-start:4mm;font-size:calc(var(--f)*.8);font-family:'Plus Jakarta Sans'}
.pcs span{white-space:nowrap}
.pcs b{color:#c7361f;font-family:${lang === 'ar' ? 'Cairo' : 'inherit'}}
footer{display:flex;justify-content:space-between;align-items:center;gap:8mm;margin-top:3mm;padding:3mm 12mm;background:#c7361f;color:#fff;font-size:4.2mm;font-weight:700}
footer .note{background:#f2a516;border-radius:99mm;padding:1.2mm 6mm;color:#1c1a15}
</style></head><body><div class="page">
<header>
  <div><div class="logo"><h1>Basha</h1><div class="ar" lang="ar">باشا</div></div><div class="tag">${T.tag}</div></div>
  <div class="info"><div class="order">${T.order} <bdi dir="ltr">${esc(menu.phone)}</bdi></div><div class="hours">${T.hours}</div></div>
  <div class="qr"><div class="box">${qr}</div><p>${T.scan}</p></div>
</header>
<main>${body}</main>
<footer><span class="note">${T.currency}</span><span>${T.market}</span></footer>
</div></body></html>`;
  }

  await page.setViewportSize({width: 1588, height: 1123});   // A3 landscape at 96 dpi
  for (const lang of ['en', 'ar']) {
    await page.setContent(build(lang), {waitUntil: 'networkidle'});
    await page.evaluate(() => document.fonts.ready);
    // Start large and shrink until every column fits on the page
    const size = await page.evaluate(() => {
      const cols = [...document.querySelectorAll('.col')], r = document.documentElement.style;
      let f = 8;
      const set = () => { r.setProperty('--f', f + 'mm'); r.setProperty('--h', f * 1.6 + 'mm'); r.setProperty('--s', f * 1.05 + 'mm'); r.setProperty('--pad', f * .2 + 'mm'); r.setProperty('--gap', f * 1.05 + 'mm') };
      set();
      while (cols.some(c => c.scrollHeight > c.clientHeight + 1) && f > 3) { f -= .05; set() }
      return f.toFixed(2);
    });
    await page.pdf({path: path.join(__dirname, `menu-a3-${lang}.pdf`), width: '420mm', height: '297mm', printBackground: true, pageRanges: '1'});
    await page.screenshot({path: path.join(__dirname, `menu-a3-${lang}-preview.png`)});
    console.log(lang, 'item text size', size, 'mm');
  }
  await browser.close();
})();
