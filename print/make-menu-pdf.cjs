// Builds print/menu-a3.pdf (one A3 landscape page) from the live menu data in ../index.html.
// Run: node print/make-menu-pdf.cjs   (needs Playwright + Chromium)
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('file://' + path.join(root, 'index.html'));

  // Pull sections, names (both languages) and prices from the page's own data and translators
  const menu = await page.evaluate(() => {
    const num = n => n.toLocaleString('en-US');
    const en = s => s, ar = s => inLang('ar', () => tName(s));
    const sections = [...document.querySelectorAll('section')].filter(s => s.id !== 'popular').map(sec => {
      const h = sec.querySelector('h2').dataset.en;
      const groups = [...sec.querySelectorAll('[id$=Grid]')].map(g => {
        const sub = g.previousElementSibling && g.previousElementSibling.classList.contains('subhead') ? g.previousElementSibling.dataset.en : '';
        return {sub, subAr: sub ? (AR.ui[sub] || sub) : '', items: data[g.id].map(([name, price, , type]) => ({
          en: en(name), ar: ar(name), pop: CONFIG.popular.includes(name),
          price: type === 'p' ? null : num(price) + (USD[name] ? ` ($${USD[name]})` : ''),
          pieces: type === 'p' ? Object.entries(CONFIG.pieces).map(([n, p]) => [n, num(p)]) : null
        }))};
      });
      return {id: sec.id, en: h, ar: AR.ui[h] || h, groups};
    });
    return {sections, phone: CONFIG.phoneDisplay};
  });

  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  const qr = fs.readFileSync(path.join(__dirname, 'qr.svg'), 'utf8').replace(/<\?xml[^>]*>/, '')
    .replace(/width="(\d+)" height="(\d+)"/, 'viewBox="0 0 $1 $2" shape-rendering="crispEdges"');
  const row = it => `<div class="row"><span class="en">${it.pop ? '<b class="star">★</b> ' : ''}${esc(it.en)}</span><span class="price">${it.price || ''}</span><span class="ar" lang="ar">${esc(it.ar)}</span></div>`
    + (it.pieces ? `<div class="pcs">${it.pieces.map(([n, p]) => `<span><b>${n} PCS</b> ${p}</span>`).join('')}</div>` : '');
  const COLUMNS = [['fries', 'meals', 'plates'], ['sandwiches', 'extras'], ['family', 'burgers', 'drinks']];
  const secHtml = s => `<div class="sec"><h2><span>${esc(s.en)}</span><span lang="ar">${esc(s.ar)}</span></h2>${
    s.groups.map(g => `<div class="grp">${g.sub ? `<h3><span>${esc(g.sub)}</span><span lang="ar">${esc(g.subAr)}</span></h3>` : ''}${g.items.map(row).join('')}</div>`).join('')}</div>`;
  const byId = Object.fromEntries(menu.sections.map(s => [s.id, s]));
  const body = COLUMNS.map(ids => `<div class="col">${ids.map(id => secHtml(byId[id])).join('')}</div>`).join('');

  const html = `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@75..100,700..900&family=Cairo:wght@500;700;800;900&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap" rel="stylesheet">
<style>
@page{size:A3 landscape;margin:0}
*{box-sizing:border-box}
html,body{margin:0;width:420mm;height:297mm;background:#fbf6ec;color:#1c1a15;font-family:'Plus Jakarta Sans',sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{width:420mm;height:297mm;display:flex;flex-direction:column}
header{position:relative;overflow:hidden;background:#1f4a37;color:#f5ecdc;padding:5.5mm 12mm;display:flex;align-items:center;gap:10mm}
header::before{content:'';position:absolute;inset:0;background:repeating-linear-gradient(135deg,#ffffff09 0 5mm,transparent 5mm 10mm)}
header>*{position:relative}
.logo{display:flex;align-items:flex-end;gap:7mm}
.logo h1{margin:0;font:900 22mm/.8 Archivo;font-stretch:75%;letter-spacing:-.5mm}
.logo .ar{font:900 16mm/1 Cairo;color:#f2a516}
.tag{margin-top:2mm;font:700 4.2mm Archivo;font-stretch:85%;letter-spacing:.9mm;text-transform:uppercase}
.info{flex:1;display:flex;flex-direction:column;align-items:center;gap:2.5mm;text-align:center}
.order{background:#f2a516;color:#1c1a15;border-radius:99mm;padding:2.6mm 8mm;font:800 6.2mm 'Plus Jakarta Sans'}
.order small{font-weight:700;font-size:4.2mm;margin-inline-start:2mm}
.hours{font-size:4.2mm;font-weight:600;line-height:1.5}
.hours [lang=ar]{font-family:Cairo}
.qr{display:flex;align-items:center;gap:4mm}
.qr .box{background:#fff;padding:2mm;border-radius:3mm;width:30mm;height:30mm}
.qr .box svg{width:100%;height:100%;display:block}
.qr p{margin:0;font:800 4.6mm/1.3 'Plus Jakarta Sans';width:36mm}
.qr p span{display:block;font:800 4.6mm Cairo;color:#f2a516}
main{flex:1;min-height:0;display:grid;grid-template-columns:repeat(3,1fr);gap:0 10mm;padding:5mm 12mm 0}
.col{min-height:0;overflow:hidden}
.col+.col{border-left:.3mm solid #1c1a1518;padding-left:10mm;margin-left:-5mm}
.sec{margin-bottom:var(--gap,5mm)}
h2{display:flex;justify-content:space-between;align-items:baseline;margin:0 0 1.6mm;padding-bottom:1.2mm;border-bottom:.7mm solid #1f4a37;font:900 var(--h,7.4mm)/1 Archivo;font-stretch:78%;text-transform:uppercase;color:#1f4a37}
h2 [lang=ar]{font:800 calc(var(--h,7.4mm)*.8) Cairo}
h3{display:flex;justify-content:space-between;margin:2mm 0 .6mm;font:800 var(--s,3.9mm) 'Plus Jakarta Sans';color:#c7361f;text-transform:uppercase;letter-spacing:.3mm}
h3 [lang=ar]{font-family:Cairo;letter-spacing:0}
.grp{break-inside:avoid}
.row{display:grid;grid-template-columns:minmax(0,1fr) calc(var(--f,4.1mm)*8.2) minmax(0,1fr);align-items:baseline;gap:2mm;padding:var(--pad,.75mm) 0;font-size:var(--f,4.1mm);line-height:1.2;border-bottom:.25mm dotted #1c1a1530}
.en{font-weight:700}
.star{color:#f2a516}
.price{font-weight:800;white-space:nowrap;text-align:center}
.ar{font:600 calc(var(--f,4.1mm)*1.02) Cairo;color:#3d382d;text-align:right}
.pcs{display:flex;justify-content:center;flex-wrap:wrap;gap:1mm 4mm;padding:.6mm 0 1.2mm;font-size:calc(var(--f,4.1mm)*.88);border-bottom:.25mm dotted #1c1a1530}
.pcs b{color:#1f4a37}
footer{display:flex;justify-content:space-between;align-items:center;gap:8mm;padding:2mm 12mm 4mm;font-size:3.6mm;color:#6b6455;font-weight:600}
footer [lang=ar]{font-family:Cairo}
footer .note{background:#efe5d2;border-radius:99mm;padding:1.2mm 5mm;color:#1c1a15}
</style></head><body><div class="page">
<header>
  <div><div class="logo"><h1>Basha</h1><div class="ar" lang="ar">باشا</div></div><div class="tag">Chicken &amp; Snack · <span style="font-family:Cairo;letter-spacing:0">تشيكن آند سناك</span></div></div>
  <div class="info">
    <div class="order">Order on WhatsApp ${esc(menu.phone)}<small lang="ar" style="font-family:Cairo">· اطلب عواتساب</small></div>
    <div class="hours">Daily 1:00 – 5:00 PM &amp; 7:00 – 11:30 PM · Closed on Mondays<br><span lang="ar">كل يوم من 1:00 لـ 5:00 بعد الضهر ومن 7:00 لـ 11:30 بالليل · مسكّرين يوم الاثنين</span></div>
  </div>
  <div class="qr"><div class="box">${qr}</div><p>Scan to see photos &amp; order<span lang="ar">امسح الرمز لتطلب</span></p></div>
</header>
<main>${body}</main>
<footer><span>★ Most popular · <span lang="ar">الأكثر طلباً</span></span><span class="note">Prices in L.L. · <span lang="ar">الأسعار بالليرة اللبنانية</span></span><span>Prices may change based on market rates · <span lang="ar">الأسعار ممكن تتغيّر حسب أسعار السوق</span></span></footer>
</div></body></html>`;

  await page.setViewportSize({width: 1588, height: 1123});   // A3 landscape at 96 dpi
  await page.setContent(html, {waitUntil: 'networkidle'});
  await page.evaluate(() => document.fonts.ready);
  // Shrink text a little at a time until everything fits on the one page
  const fit = await page.evaluate(() => {
    const cols = [...document.querySelectorAll('.col')], r = document.documentElement.style;
    let f = 6;
    const set = () => { r.setProperty('--f', f + 'mm'); r.setProperty('--h', (f * 1.7) + 'mm'); r.setProperty('--s', (f * .9) + 'mm'); r.setProperty('--pad', (f * .22) + 'mm'); r.setProperty('--gap', (f * 1.1) + 'mm') };
    set();
    while (cols.some(c => c.scrollHeight > c.clientHeight + 1) && f > 2.6) { f -= .05; set() }
    return f.toFixed(2);
  });
  fs.writeFileSync(path.join(__dirname, 'menu-a3.html'), html);
  await page.pdf({path: path.join(__dirname, 'menu-a3.pdf'), width: '420mm', height: '297mm', printBackground: true, pageRanges: '1'});
  await page.screenshot({path: path.join(__dirname, 'menu-a3-preview.png'), fullPage: false});
  console.log('text size', fit, 'mm');
  await browser.close();
})();
