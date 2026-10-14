// Builds the Basha brand identity: logo files, applications and a brand guide PDF.
// Run: node brand/identity/build-identity.cjs   (needs Playwright + Chromium; fonts load from Google Fonts)
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const OUT = __dirname, ROOT = path.join(__dirname, '..', '..');
const photo = f => 'data:image/jpeg;base64,' + fs.readFileSync(path.join(ROOT, 'photos', f)).toString('base64');

const C = {red: '#E8402A', cream: '#FBF1DC', yellow: '#FFC226', ink: '#1C1A15', deep: '#B92E1B'};
const FONTS = '<link href="https://fonts.googleapis.com/css2?family=Bowlby+One&family=Fredoka:wght@500;600;700&family=Lalezar&family=Cairo:wght@600;700&display=swap" rel="stylesheet">';

// ---------- the logo: BASHA on one line, باشا sticker on the last A, tagline below ----------
function lockup({letters = C.cream, sticker = C.yellow, stickerText = C.ink, outline = C.ink, tag = C.ink, tagline = true, w = '100%'} = {}) {
  return `<svg viewBox="0 0 1300 ${tagline ? 560 : 430}" width="${w}" xmlns="http://www.w3.org/2000/svg" style="display:block;overflow:visible">
  <text x="650" y="390" text-anchor="middle" font-family="Bowlby One" font-size="300" letter-spacing="-8" fill="${letters}">BASHA</text>
  <g transform="rotate(9 1120 150)"><rect x="985" y="82" width="270" height="136" rx="68" fill="${sticker}" stroke="${outline}" stroke-width="8"/>
  <text x="1120" y="186" text-anchor="middle" font-family="Lalezar" font-size="104" fill="${stickerText}">باشا</text></g>
  ${tagline ? `<text x="650" y="510" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="72" letter-spacing="3" fill="${tag}">chicken &amp; snack</text>` : ''}
</svg>`;
}
// submark: a big B with a mini sticker (favicon, stamps, small spaces)
function submark({bg = C.red, letter = C.cream, round = false} = {}) {
  return `<svg viewBox="0 0 1000 1000" width="100%" style="display:block"><${round ? 'circle cx="500" cy="500" r="500"' : 'rect width="1000" height="1000" rx="0"'} fill="${bg}"/>
  <text x="470" y="760" text-anchor="middle" font-family="Bowlby One" font-size="700" fill="${letter}">B</text>
  <g transform="rotate(9 700 745)"><rect x="560" y="680" width="290" height="140" rx="70" fill="${C.yellow}" stroke="${C.ink}" stroke-width="10"/>
  <text x="705" y="786" text-anchor="middle" font-family="Lalezar" font-size="106" fill="${C.ink}">باشا</text></g></svg>`;
}
// repeating pattern of the name in both languages
function pattern({bg = C.red, fg = C.cream, alt = C.yellow, size = 1600} = {}) {
  let rows = '';
  for (let i = 0; i < 14; i++) {
    const y = i * 130, off = (i % 2) * -210;
    let row = '';
    for (let j = 0; j < 8; j++) row += `<tspan fill="${fg}" font-family="Bowlby One">BASHA</tspan><tspan fill="${alt}" font-family="Lalezar" font-size="104" dx="34" dy="0">باشا</tspan><tspan dx="34"> </tspan>`;
    rows += `<text x="${off - 200}" y="${y}" font-size="96">${row}</text>`;
  }
  return `<svg viewBox="0 0 ${size} ${size}" width="100%" style="display:block"><rect width="${size}" height="${size}" fill="${bg}"/><g transform="rotate(-8 ${size / 2} ${size / 2}) translate(0 60)">${rows}</g></svg>`;
}
const page = (body, css = '') => `<!doctype html><html><head><meta charset="utf-8">${FONTS}<style>*{box-sizing:border-box;margin:0}body{font-family:Fredoka,sans-serif;color:${C.ink}}${css}</style></head><body>${body}</body></html>`;

// ---------- applications ----------
const apps = {
  profile: `<div style="width:1080px;height:1080px;background:${C.red};display:grid;place-items:center"><div style="width:880px">${lockup()}</div></div>`,
  seal: `<div style="width:1080px;height:1080px;display:grid;place-items:center;background:transparent"><svg viewBox="0 0 1080 1080" width="1080" height="1080">
    <circle cx="540" cy="540" r="530" fill="${C.red}"/><circle cx="540" cy="540" r="420" fill="none" stroke="${C.cream}" stroke-width="6" stroke-dasharray="2 18" stroke-linecap="round"/>
    <defs><path id="ringT" d="M540 70 a470 470 0 1 1 -0.1 0"/></defs>
    <text font-family="Bowlby One" font-size="58" fill="${C.cream}" letter-spacing="4"><textPath href="#ringT" textLength="2900" lengthAdjust="spacing">CHICKEN &amp; SNACK ✦ CHICKEN &amp; SNACK ✦ CHICKEN &amp; SNACK ✦</textPath></text>
    <g transform="translate(150 360) scale(.6)">${lockup({tagline: false}).replace('<svg ', '<svg width="1300" height="430" ')}</g>
    <text x="540" y="740" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="54" fill="${C.yellow}">freshly made · طازة</text></svg></div>`,
  post: `<div style="width:1080px;height:1080px;background:${C.red};position:relative;overflow:hidden;font-family:Fredoka">
    <div style="position:absolute;left:60px;top:56px;width:360px">${lockup({tagline: false})}</div>
    <div style="position:absolute;right:60px;top:70px;background:${C.yellow};color:${C.ink};font:400 46px 'Bowlby One';padding:14px 34px;border-radius:99px;border:6px solid ${C.ink};transform:rotate(6deg)">NEW!</div>
    <img src="${photo('crispy-meal.jpg')}" style="position:absolute;left:60px;top:230px;width:960px;height:560px;object-fit:cover;border-radius:40px;border:8px solid ${C.ink}">
    <div style="position:absolute;left:60px;bottom:70px;color:${C.cream};font:400 92px/0.95 'Bowlby One'">CRISPY<br>MEAL</div>
    <div style="position:absolute;right:60px;bottom:64px;width:250px;height:250px;border-radius:50%;background:${C.yellow};border:8px solid ${C.ink};display:grid;place-items:center;text-align:center;transform:rotate(-8deg)"><div style="font:400 30px 'Bowlby One'">from</div><div style="font:400 64px/1 'Bowlby One'">500K</div><div style="font:700 26px Fredoka">L.L.</div></div></div>`,
  bag: `<div style="width:1080px;height:1080px;background:${C.cream};display:grid;place-items:center"><svg viewBox="0 0 1080 1080" width="1080" height="1080">
    <ellipse cx="540" cy="1000" rx="330" ry="28" fill="#00000018"/>
    <path d="M410 250 C410 120 670 120 670 250" stroke="#8a6a44" stroke-width="22" fill="none" stroke-linecap="round"/>
    <path d="M250 240 h580 l50 750 h-680 z" fill="#c9a374"/><path d="M250 240 h580 l8 110 h-596 z" fill="#b8915f"/>
    <path d="M300 240 l-30 750 M780 240 l30 750" stroke="#b8915f" stroke-width="6"/>
    <g transform="translate(300 520) scale(.37)">${lockup({letters: C.red, sticker: C.yellow, tag: C.ink}).replace('<svg ', '<svg width="1300" height="560" ')}</g>
    <text x="540" y="900" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="30" fill="${C.ink}" opacity=".7">WhatsApp 76 075 724</text></svg></div>`,
  cup: `<div style="width:1080px;height:1080px;background:${C.yellow};display:grid;place-items:center"><svg viewBox="0 0 1080 1080" width="1080" height="1080">
    <ellipse cx="540" cy="975" rx="230" ry="24" fill="#00000022"/>
    <path d="M330 250 h420 l-50 720 h-320 z" fill="${C.red}"/>
    <rect x="300" y="205" width="480" height="60" rx="20" fill="${C.cream}" stroke="${C.ink}" stroke-width="6"/>
    <rect x="370" y="175" width="340" height="40" rx="16" fill="${C.cream}" stroke="${C.ink}" stroke-width="6"/>
    <g transform="translate(372 520) scale(.26)">${lockup({tagline: false}).replace('<svg ', '<svg width="1300" height="430" ')}</g>
    <text x="540" y="720" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="34" fill="${C.ink}">chicken &amp; snack</text></svg></div>`,
  wrap: `<div style="width:1080px;height:1080px">${pattern({size: 1080})}</div>`,
};

(async () => {
  const browser = await chromium.launch();
  const pg = await browser.newPage({viewport: {width: 1400, height: 1400}, deviceScaleFactor: 1});
  const shot = async (html, file, {transparent = false, scale = 1} = {}) => {
    await pg.setViewportSize({width: 1400, height: 1400});
    const p = scale === 1 ? pg : null;
    await pg.setContent(page(`<div id="x" style="display:inline-block">${html}</div>`, 'body{background:transparent}'), {waitUntil: 'networkidle'});
    await pg.evaluate(() => document.fonts.ready);
    await (await pg.$('#x')).screenshot({path: path.join(OUT, file), omitBackground: transparent});
  };
  fs.mkdirSync(path.join(OUT, 'logos'), {recursive: true});
  fs.mkdirSync(path.join(OUT, 'applications'), {recursive: true});
  const L = (o, bg) => `<div style="width:1300px;padding:70px 0;background:${bg || 'transparent'}"><div style="width:1100px;margin:auto">${lockup(o)}</div></div>`;
  await shot(L({}, C.red), 'logos/basha-logo-on-red.png');
  await shot(L({letters: C.red}, C.cream), 'logos/basha-logo-on-cream.png');
  await shot(L({tag: C.yellow, outline: C.yellow}, C.ink), 'logos/basha-logo-on-black.png');
  await shot(L({letters: C.red}), 'logos/basha-logo-red-transparent.png', {transparent: true});
  await shot(L({tag: C.cream}), 'logos/basha-logo-cream-transparent.png', {transparent: true});
  await shot(L({letters: C.ink, sticker: C.ink, stickerText: '#fff', outline: C.ink, tag: C.ink}), 'logos/basha-logo-black-one-colour.png', {transparent: true});
  await shot(`<div style="width:1080px">${submark()}</div>`, 'logos/basha-submark-B.png');
  await shot(`<div style="width:1080px">${pattern({size: 1080})}</div>`, 'logos/basha-pattern.png');
  for (const [k, html] of Object.entries(apps)) await shot(html, `applications/${k}.png`, {transparent: k === 'seal'});
  fs.copyFileSync(path.join(OUT, 'applications/profile.png'), path.join(OUT, 'logos/basha-whatsapp-profile.png'));

  // ---------- brand guide (A4 landscape) ----------
  const img = f => 'data:image/png;base64,' + fs.readFileSync(path.join(OUT, f)).toString('base64');
  const cmyk = hex => { const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255), k = 1 - Math.max(r, g, b);
    return [r, g, b].map(v => Math.round((1 - v - k) / (1 - k || 1) * 100)).concat(Math.round(k * 100)).join(' / '); };
  const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)).join(', ');
  const P = (inner, bg = C.cream, fg = C.ink, n = '') => `<section class="pg" style="background:${bg};color:${fg}">${inner}${n ? `<div class="pn">${n}</div>` : ''}</section>`;
  const head = (n, t, sub) => `<div class="kick">${n}</div><h2>${t}</h2>${sub ? `<p class="lead">${sub}</p>` : ''}`;
  const sw = (name, hex, ink, role) => `<div class="sw"><div class="chip" style="background:${hex};color:${ink}"><b>${name}</b><span>${role}</span></div><dl><dt>HEX</dt><dd>${hex}</dd><dt>RGB</dt><dd>${rgb(hex)}</dd><dt>CMYK</dt><dd>${cmyk(hex)}</dd></dl></div>`;
  const guide = page(`
${P(`<div style="position:absolute;inset:0;display:grid;place-items:center"><div style="width:62%">${lockup()}</div></div><div class="foot" style="color:${C.ink}">Brand guidelines · 2026</div>`, C.red)}
${P(`${head('01', 'The logo', 'Our name, loud and proud. BASHA in big friendly letters, with باشا stuck on like a sticker. It feels fun, bilingual and very us.')}
  <div class="row"><div class="tile" style="background:${C.red};flex:1.4">${lockup()}</div>
  <div class="notes"><h4>Anatomy</h4><p><b>Wordmark:</b> BASHA set in Bowlby One, always on one line.</p><p><b>Sticker:</b> باشا in Lalezar on a yellow pill, tilted 9°, overlapping the last A.</p><p><b>Tagline:</b> "chicken &amp; snack" in Fredoka, lowercase.</p>
  <h4>Rules</h4><p>✓ Keep space around the logo at least the height of the sticker.</p><p>✓ Smallest size: 30 mm wide in print, 160 px on screen.</p><p>✗ Don't stretch, outline, add shadows, or change the sticker tilt or colour.</p><p>✗ Don't put it on photos without a solid colour block behind it.</p></div></div>`, C.cream, C.ink, '2')}
${P(`${head('02', 'Logo versions', 'Pick the version that stands out best on its background.')}
  <div class="grid3"><figure><div class="tile" style="background:${C.red}">${lockup()}</div><figcaption>Primary · on red</figcaption></figure>
  <figure><div class="tile" style="background:${C.cream};border:1px solid #0001">${lockup({letters: C.red})}</div><figcaption>On cream / kraft / white</figcaption></figure>
  <figure><div class="tile" style="background:${C.ink}">${lockup({tag: C.yellow, outline: C.yellow})}</div><figcaption>On black</figcaption></figure>
  <figure><div class="tile" style="background:#fff;border:1px solid #0001">${lockup({letters: C.ink, sticker: C.ink, stickerText: '#fff', tag: C.ink})}</div><figcaption>One colour (stamps, receipts, fax)</figcaption></figure>
  <figure><div class="tile sq" style="background:#fff;border:1px solid #0001"><div style="width:46%"><img src="${img('logos/basha-whatsapp-profile.png')}" style="width:100%;border-radius:50%"></div></div><figcaption>Profile picture (WhatsApp, Instagram)</figcaption></figure>
  <figure><div class="tile sq" style="background:#fff;border:1px solid #0001"><div style="width:46%;border-radius:22%;overflow:hidden">${submark()}</div></div><figcaption>Submark "B" (app icon, stamps, tiny sizes)</figcaption></figure></div>`, C.cream, C.ink, '3')}
${P(`${head('03', 'Colours', 'Bold, warm and appetising. Tomato red leads; cream, sunshine yellow and ink support it.')}
  <div class="sws">${sw('Tomato Red', C.red, C.cream, 'Main colour · 60%')}${sw('Cream', C.cream, C.ink, 'Backgrounds · 25%')}${sw('Sunshine', C.yellow, C.ink, 'Highlights · 10%')}${sw('Ink', C.ink, C.cream, 'Text · 5%')}</div>
  <p class="small">CMYK values are a starting point. Ask the printer for a proof and match it to the red on screen.</p>`, C.cream, C.ink, '4')}
${P(`${head('04', 'Typography', 'Four free Google Fonts, so anyone can use them on any computer.')}
  <div class="types">
  <div class="ty"><div class="spec" style="font:400 76px/1 'Bowlby One'">BASHA</div><b>Bowlby One</b><span>Headlines, logo, big prices. Always UPPERCASE.</span></div>
  <div class="ty"><div class="spec" style="font:700 54px/1.1 Fredoka">chicken &amp; snack</div><b>Fredoka</b><span>Taglines, menu items, body text, buttons.</span></div>
  <div class="ty"><div class="spec" style="font:400 76px/1.1 Lalezar;direction:rtl">باشا · وجبات</div><b>Lalezar</b><span>Arabic headlines and the sticker.</span></div>
  <div class="ty"><div class="spec" style="font:700 52px/1.4 Cairo;direction:rtl">ساندويش زنجر</div><b>Cairo</b><span>Arabic menu items and body text.</span></div></div>`, C.cream, C.ink, '5')}
${P(`${head('05', 'Graphic elements', 'The sticker and the name pattern are our signature. Use them to make anything feel Basha.')}
  <div class="row"><div class="tile" style="flex:1;padding:0;overflow:hidden"><img src="${img('logos/basha-pattern.png')}" style="width:100%;display:block"></div>
  <div class="notes" style="flex:1"><h4>The sticker</h4><div style="display:flex;gap:18px;flex-wrap:wrap;margin:10px 0 20px">
  ${['باشا', 'NEW!', 'HOT', 'جديد', '$15'].map((t, i) => `<span style="background:${C.yellow};border:4px solid ${C.ink};border-radius:99px;padding:6px 24px;font:400 30px ${/[a-z$!]/i.test(t) ? "'Bowlby One'" : 'Lalezar'};transform:rotate(${[9, -6, 5, -8, 7][i]}deg)">${t}</span>`).join('')}</div>
  <p>Yellow pill, ink outline, slightly tilted. Use it for the Arabic name, "new", prices and offers.</p>
  <h4>The pattern</h4><p>BASHA and باشا repeated on a slant. Use it for wrapping paper, bag sides, the back of menus, and Instagram highlights.</p></div></div>`, C.cream, C.ink, '6')}
${P(`${head('06', 'In real life', 'How the identity comes together on everyday things.')}
  <div class="grid3 apps">${[['post', 'Instagram post'], ['bag', 'Takeaway bag'], ['cup', 'Drink cup'], ['seal', 'Box seal sticker'], ['wrap', 'Wrapping paper'], ['profile', 'WhatsApp profile']].map(([f, t]) =>
  `<figure><div class="tile sq" style="padding:0;overflow:hidden;background:${f === 'seal' ? C.cream : 'none'}"><img src="${img('applications/' + f + '.png')}" style="width:${f === 'seal' ? '80%' : '100%'};display:block;margin:auto;${f === 'profile' ? '' : ''}"></div><figcaption>${t}</figcaption></figure>`).join('')}</div>`, C.cream, C.ink, '7')}
${P(`<div style="position:absolute;inset:0;display:grid;place-items:center;text-align:center"><div><div style="width:520px;margin:0 auto 40px">${lockup({tag: C.yellow, outline: C.yellow})}</div>
  <p style="font:600 22px Fredoka;color:${C.cream};opacity:.85">WhatsApp 76 075 724 · Daily 1–5 PM &amp; 7–11:30 PM · Closed Mondays</p></div></div>`, C.ink, C.cream)}
`, `@page{size:297mm 210mm;margin:0}
.pg{width:297mm;height:210mm;position:relative;overflow:hidden;padding:16mm 18mm;page-break-after:always}
.pn{position:absolute;right:18mm;bottom:10mm;font:600 12px Fredoka;opacity:.5}
.foot{position:absolute;left:18mm;bottom:12mm;font:700 16px Fredoka}
.kick{font:400 16px 'Bowlby One';color:${C.red}}
h2{font:400 46px/1 'Bowlby One';text-transform:uppercase;margin:4px 0 8px}
.lead{font:500 17px/1.45 Fredoka;max-width:180mm;margin-bottom:9mm;opacity:.85}
.row{display:flex;gap:10mm;align-items:stretch}
.tile{border-radius:14px;padding:26px 34px;display:grid;place-items:center}
.tile.sq{aspect-ratio:1/1;padding:0}
.notes{flex:1;font:500 14.5px/1.5 Fredoka}.notes h4{font:400 17px 'Bowlby One';margin:8px 0 4px;color:${C.red}}.notes p{margin:3px 0}
.grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:7mm 9mm}
.grid3 figure .tile{height:56mm;padding:16px 26px}.grid3 figure .tile.sq{height:56mm;aspect-ratio:auto}
.grid3.apps{grid-template-columns:repeat(3,62mm);justify-content:center;gap:5mm 14mm}.apps figure .tile.sq{width:62mm;height:62mm}.apps img{height:100%;object-fit:contain}
figcaption{font:600 13px Fredoka;margin-top:6px;opacity:.75}
.sws{display:grid;grid-template-columns:repeat(4,1fr);gap:8mm}
.chip{height:70mm;border-radius:14px;padding:16px;display:flex;flex-direction:column;justify-content:flex-end;border:1px solid #0001}.chip b{font:400 24px 'Bowlby One'}.chip span{font:600 14px Fredoka;opacity:.85}
dl{display:grid;grid-template-columns:auto 1fr;gap:3px 10px;margin-top:8px;font:500 14px Fredoka}dt{font-weight:700}
.small{margin-top:8mm;font:500 13px Fredoka;opacity:.7}
.types{display:grid;grid-template-columns:1fr 1fr;gap:10mm 12mm;margin-top:6mm}.ty{background:#fff8;border-radius:14px;padding:16px 20px;border:1px solid #0001}.ty b{display:block;font:400 17px 'Bowlby One';color:${C.red};margin-top:10px}.ty span{font:500 14px Fredoka;opacity:.8}
.spec{height:34mm;display:flex;align-items:center}`);
  await pg.setViewportSize({width: 1123, height: 794});
  await pg.setContent(guide, {waitUntil: 'networkidle'});
  await pg.evaluate(() => document.fonts.ready);
  await pg.pdf({path: path.join(OUT, 'Basha-brand-guide.pdf'), width: '297mm', height: '210mm', printBackground: true});
  // page previews
  const n = await pg.$$eval('.pg', e => e.length);
  for (let i = 0; i < n; i++) await (await pg.$$('.pg'))[i].screenshot({path: path.join(OUT, `guide-page-${i + 1}.png`)});
  console.log('pages', n);
  await browser.close();
})();
