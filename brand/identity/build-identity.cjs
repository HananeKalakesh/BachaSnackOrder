// Builds the Basha brand identity: logo files, applications and a brand guide PDF.
// Run: node brand/identity/build-identity.cjs   (needs Playwright + Chromium; fonts load from Google Fonts)
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const OUT = __dirname, ROOT = path.join(__dirname, '..', '..');
const photo = f => 'data:image/jpeg;base64,' + fs.readFileSync(path.join(ROOT, 'photos', f)).toString('base64');

const C = {red: '#E8402A', cream: '#FBF1DC', yellow: '#FFC226', ink: '#1C1A15', deep: '#8E1A12'};
const FONTS = '<link href="https://fonts.googleapis.com/css2?family=Bagel+Fat+One&family=Fredoka:wght@500;600;700&family=Lalezar&family=Cairo:wght@600;700&display=swap" rel="stylesheet">';

// ---------- the logo: BASHA on one line, باشا sticker on the last A, tagline below ----------
function lockup({letters = C.cream, shadow = C.deep, sticker = C.yellow, stickerText = C.ink, outline = C.ink, tag = C.ink, tagline = true, showSticker = true, w = '100%'} = {}) {
  const word = (x, y, fill, extra = '') => `<text x="${x}" y="${y}" text-anchor="middle" font-family="Bagel Fat One" font-size="330" fill="${fill}" ${extra}>BASHA</text>`;
  let ext = '';
  if (shadow) for (let i = 24; i >= 1; i--) ext += word(650 + i * .75, 392 + i, shadow, `stroke="${shadow}" stroke-width="16" stroke-linejoin="round"`);
  return `<svg viewBox="0 0 1300 ${tagline ? 570 : 440}" width="${w}" xmlns="http://www.w3.org/2000/svg" style="display:block;overflow:visible">
  ${ext}${word(650, 392, letters, shadow ? `stroke="${shadow}" stroke-width="16" stroke-linejoin="round" paint-order="stroke"` : '')}
  ${showSticker ? `<g transform="rotate(9 1120 150)"><rect x="985" y="82" width="270" height="136" rx="68" fill="${sticker}" stroke="${outline}" stroke-width="8"/>
  <text x="1120" y="186" text-anchor="middle" font-family="Lalezar" font-size="104" fill="${stickerText}">باشا</text></g>` : ''}
  ${tagline ? `<text x="650" y="528" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="72" letter-spacing="3" fill="${tag}">chicken &amp; snack</text>` : ''}
</svg>`;
}
// submark: a big B with a mini sticker (favicon, stamps, small spaces)
function submark({bg = C.red, letter = C.cream, round = false} = {}) {
  return `<svg viewBox="0 0 1000 1000" width="100%" style="display:block"><${round ? 'circle cx="500" cy="500" r="500"' : 'rect width="1000" height="1000" rx="0"'} fill="${bg}"/>
  ${Array.from({length: 30}, (_, i) => `<text x="${470 + (30 - i) * .8}" y="${740 + 30 - i}" text-anchor="middle" font-family="Bagel Fat One" font-size="700" fill="${C.deep}" stroke="${C.deep}" stroke-width="22" stroke-linejoin="round">B</text>`).join('')}<text x="470" y="740" text-anchor="middle" font-family="Bagel Fat One" font-size="700" fill="${letter}" stroke="${C.deep}" stroke-width="22" stroke-linejoin="round" paint-order="stroke">B</text>
  <g transform="rotate(9 700 745)"><rect x="560" y="680" width="290" height="140" rx="70" fill="${C.yellow}" stroke="${C.ink}" stroke-width="10"/>
  <text x="705" y="786" text-anchor="middle" font-family="Lalezar" font-size="106" fill="${C.ink}">باشا</text></g></svg>`;
}
// repeating pattern of the name in both languages
function pattern({bg = C.red, fg = C.cream, alt = C.yellow, size = 1600} = {}) {
  let rows = '';
  for (let i = 0; i < 14; i++) {
    const y = i * 130 - 40, off = (i % 2) * -210;
    let row = '';
    for (let j = 0; j < 8; j++) row += `<tspan fill="${fg}" font-family="Bagel Fat One">BASHA</tspan><tspan fill="${alt}" font-family="Lalezar" font-size="104" dx="34" dy="0">باشا</tspan><tspan dx="34"> </tspan>`;
    rows += `<text x="${off - 200}" y="${y}" font-size="96">${row}</text>`;
  }
  return `<svg viewBox="0 0 ${size} ${size}" width="100%" style="display:block"><rect width="${size}" height="${size}" fill="${bg}"/><g transform="rotate(-8 ${size / 2} ${size / 2}) translate(0 60)">${rows}</g></svg>`;
}
const page = (body, css = '') => `<!doctype html><html><head><meta charset="utf-8">${FONTS}<style>*{box-sizing:border-box;margin:0}body{font-family:Fredoka,sans-serif;color:${C.ink}}${css}</style></head><body>${body}</body></html>`;

// ---------- applications ----------
const qr = fs.readFileSync(path.join(ROOT, 'print', 'qr.svg'), 'utf8').replace(/<\?xml[^>]*>/, '').replace(/width="(\d+)" height="(\d+)"/, 'viewBox="0 0 $1 $2" width="100%" height="100%" shape-rendering="crispEdges"');
const LOGO = {
  red: {},
  cream: {letters: C.red},
  black: {shadow: C.red, tag: C.yellow, outline: C.yellow},
  yellow: {letters: C.red, sticker: C.cream},
  mono: {letters: C.ink, shadow: null, sticker: C.ink, stickerText: '#fff', tag: C.ink},
};
const BG = {red: C.red, cream: C.cream, black: C.ink, yellow: C.yellow, mono: '#fff'};

// ---------- extra applications ----------
const apps = {
  profile: `<div style="width:1080px;height:1080px;background:${C.red};display:grid;place-items:center"><div style="width:860px">${lockup()}</div></div>`,
  'card-front': `<div style="width:1050px;height:600px;background:${C.red};display:grid;place-items:center"><div style="width:720px">${lockup()}</div></div>`,
  'card-back': `<div style="width:1050px;height:600px;background:${C.cream};position:relative;font-family:Fredoka;color:${C.ink}">
    <div style="position:absolute;left:70px;top:70px;font:400 64px 'Bagel Fat One';color:${C.red}">yalla eat!</div>
    <div style="position:absolute;left:70px;top:170px;font:600 30px/1.6 Fredoka">WhatsApp <b>76 075 724</b><br>Daily 1–5 PM &amp; 7–11:30 PM<br>Closed Mondays</div>
    <div style="position:absolute;left:70px;bottom:60px;font:400 46px Lalezar;color:${C.red}">يلا كول!</div>
    <div style="position:absolute;right:70px;top:150px;width:300px;height:300px;background:#fff;border-radius:24px;padding:22px;border:6px solid ${C.ink}">${qr}</div>
    <div style="position:absolute;right:70px;top:470px;width:300px;text-align:center;font:700 24px Fredoka">scan for the menu</div></div>`,
  sign: `<div style="width:1400px;height:900px;background:#3a332c;position:relative;overflow:hidden">
    <div style="position:absolute;inset:0;background:repeating-linear-gradient(0deg,#0000 0 58px,#0003 58px 62px),repeating-linear-gradient(90deg,#0000 0 118px,#0002 118px 122px)"></div>
    <div style="position:absolute;left:150px;top:90px;width:1100px;height:330px;background:${C.red};border-radius:26px;border:12px solid ${C.ink};display:grid;place-items:center;box-shadow:0 30px 60px #0007"><div style="width:820px">${lockup()}</div></div>
    <div style="position:absolute;left:110px;top:470px;width:1180px;height:110px;background:repeating-linear-gradient(90deg,${C.red} 0 98px,${C.cream} 98px 196px);border-radius:0 0 40px 40px;box-shadow:0 20px 30px #0006"></div>
    <div style="position:absolute;left:260px;top:620px;width:880px;height:320px;background:#ffd98a33;border:12px solid ${C.ink};border-bottom:0"></div>
    <div style="position:absolute;left:440px;top:690px;padding:14px 40px;background:${C.yellow};border:6px solid ${C.ink};border-radius:99px;font:400 52px 'Bagel Fat One';transform:rotate(-4deg)">OPEN · فاتحين</div></div>`,
};

(async () => {
  const browser = await chromium.launch();
  const pg = await browser.newPage({viewport: {width: 1500, height: 1500}});
  const shot = async (html, file, {transparent = false} = {}) => {
    await pg.setContent(page(`<div id="x" style="display:inline-block">${html}</div>`, 'body{background:transparent}'), {waitUntil: 'networkidle'});
    await pg.evaluate(() => document.fonts.ready);
    await (await pg.$('#x')).screenshot({path: path.join(OUT, file), omitBackground: transparent});
  };
  for (const d of ['logos', 'applications']) fs.mkdirSync(path.join(OUT, d), {recursive: true});
  for (const f of fs.readdirSync(path.join(OUT, 'logos'))) fs.unlinkSync(path.join(OUT, 'logos', f));
  for (const f of fs.readdirSync(path.join(OUT, 'applications'))) fs.unlinkSync(path.join(OUT, 'applications', f));
  const L = (o, bg) => `<div style="width:1300px;padding:80px 0 70px;background:${bg || 'transparent'}"><div style="width:1100px;margin:auto">${lockup(o)}</div></div>`;
  for (const [k, o] of Object.entries(LOGO)) await shot(L(o, BG[k]), `logos/basha-logo-on-${k}.png`);
  await shot(L(LOGO.cream), 'logos/basha-logo-red-transparent.png', {transparent: true});
  await shot(L({tag: C.cream}), 'logos/basha-logo-cream-transparent.png', {transparent: true});
  await shot(L(LOGO.mono), 'logos/basha-logo-black-transparent.png', {transparent: true});
  await shot(`<div style="width:1080px">${submark()}</div>`, 'logos/basha-submark-B.png');
  await shot(`<div style="width:1080px">${submark({round: true})}</div>`, 'logos/basha-submark-B-round.png', {transparent: true});
  await shot(`<div style="width:1080px">${pattern({size: 1080})}</div>`, 'logos/basha-pattern.png');
  for (const [k, html] of Object.entries(apps)) await shot(html, `applications/${k}.png`);
  fs.copyFileSync(path.join(OUT, 'applications/profile.png'), path.join(OUT, 'logos/basha-whatsapp-profile.png'));

  // ---------- brand guide (A4 landscape) ----------
  const img = f => 'data:image/png;base64,' + fs.readFileSync(path.join(OUT, f)).toString('base64');
  const cmyk = hex => { const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255), k = 1 - Math.max(r, g, b);
    return [r, g, b].map(v => Math.round((1 - v - k) / (1 - k || 1) * 100)).concat(Math.round(k * 100)).join(' / '); };
  const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)).join(', ');
  let n = 0;
  const P = (inner, bg = C.cream, fg = C.ink) => `<section class="pg" style="background:${bg};color:${fg}">${inner}<div class="pn">${++n > 1 ? 'Basha brand guidelines · ' + n : ''}</div></section>`;
  const head = (k, t, sub) => `<div class="kick">${k}</div><h2>${t}</h2>${sub ? `<p class="lead">${sub}</p>` : ''}`;
  const tile = (inner, bg, cls = '') => `<div class="tile ${cls}" style="background:${bg}">${inner}</div>`;
  const sw = (name, hex, ink, role) => `<div class="sw"><div class="chip" style="background:${hex};color:${ink}"><b>${name}</b><span>${role}</span></div><dl><dt>HEX</dt><dd>${hex}</dd><dt>RGB</dt><dd>${rgb(hex)}</dd><dt>CMYK</dt><dd>${cmyk(hex)}</dd></dl></div>`;
  const fun = f => 'data:image/png;base64,' + fs.readFileSync(path.join(OUT, 'fun', f)).toString('base64');
  const ph = f => 'data:image/jpeg;base64,' + fs.readFileSync(path.join(ROOT, 'photos', f)).toString('base64');
  const fig = (src, cap, h = '60mm', fit = 'cover', bg = 'none', w = '') => `<figure style="${w ? 'width:' + w : ''}"><div class="tile img" style="height:${h};background:${bg}"><img src="${src}" style="object-fit:${fit}"></div><figcaption>${cap}</figcaption></figure>`;
  const dont = (inner, cap, bg = C.red, style = '') => `<figure><div class="tile" style="background:${bg};height:44mm;position:relative;overflow:hidden"><div style="width:72%;${style}">${inner}</div><span class="x">✕</span></div><figcaption>${cap}</figcaption></figure>`;
  const phrases = [['Yalla eat!', 'يلا كول!'], ['Crispy!', 'مقرمش!'], ['So good.', 'طيب كتير'], ['Hot & fresh', 'سخن وطازة'], ['Extra garlic?', 'زيادة توم؟'], ['Cool your heart', 'برّد قلبك']];

  const guide = page(`
${P(`<div style="position:absolute;inset:0;display:grid;place-items:center"><div style="width:64%">${lockup()}</div></div><div class="foot">Brand guidelines · 2026</div>`, C.red)}
${P(`${head('00', 'Hello, we’re Basha', 'A Lebanese chicken &amp; snack spot with big flavour and a big smile. Everything we make, from a sandwich to a sticker, should feel generous, fun and a little bit cheeky, in English and in Arabic.')}
  <div class="three">${[['Fun', 'We don’t take ourselves too seriously. Big letters, bright colours, a wink.', 'مهضومين'], ['Generous', 'Full sandwiches, extra sauce, friendly prices. No fine print.', 'كريمين'], ['Proudly Lebanese', 'We speak English and Arabic, often in the same sentence.', 'لبنانيين وعن جد']].map(([t, d, a]) => `<div class="card"><div class="big">${t}</div><div class="ar">${a}</div><p>${d}</p></div>`).join('')}</div>
  <h3>How we talk</h3><div class="phr">${phrases.map(([e, a]) => `<span><b>${e}</b><i>${a}</i></span>`).join('')}</div>
  <p class="small">Short, warm, like a friend at the counter. Mix languages freely. Never corporate (“Dear valued customer…”), never rude.</p>`)}
${P(`${head('01', 'The logo', 'BASHA in big, bubbly letters with a 3D shadow, and باشا stuck on like a sticker. It’s our signature. Please don’t redraw it; always use the files in the kit.')}
  <div class="row">${tile(`<div style="width:86%;outline:3px dashed ${C.cream}88;outline-offset:22px">${lockup()}</div>`, C.red, 'big')}
  <div class="notes"><h4>Anatomy</h4><p><b>Wordmark:</b> BASHA in Bagel Fat One, on one line, with a deep-red 3D shadow.</p><p><b>Sticker:</b> باشا in Lalezar on a yellow pill, tilted 9°, sitting on the last A.</p><p><b>Tagline:</b> “chicken &amp; snack” in Fredoka. It can be left off when space is tight.</p>
  <h4>Clear space</h4><p>Keep empty space around the logo at least as tall as the sticker (the dashed line).</p><h4>Minimum size</h4><p>Print: 30 mm wide. Screen: 160 px wide. Smaller than that? Use the “B” submark.</p></div></div>`)}
${P(`${head('02', 'Logo versions', 'Choose the version that stands out best on its background.')}
  <div class="grid3">${[['red', 'Primary · on tomato red'], ['cream', 'On cream, kraft or white'], ['black', 'On black / dark photos'], ['yellow', 'On sunshine yellow'], ['mono', 'One colour (stamps, receipts)']].map(([k, c]) => `<figure>${tile(`<div style="width:84%">${lockup(LOGO[k])}</div>`, BG[k], k === 'mono' || k === 'cream' ? 'bordered' : '')}<figcaption>${c}</figcaption></figure>`).join('')}
  <figure>${tile(`<div style="height:84%;aspect-ratio:1;border-radius:24%;overflow:hidden">${submark()}</div>`, '#fff', 'bordered')}<figcaption>Submark “B” (profile, icon, tiny sizes)</figcaption></figure></div>`)}
${P(`${head('03', 'Please don’t', 'Small changes break the magic. Keep the logo exactly as it comes.')}
  <div class="grid3">
  ${dont(lockup(), 'Stretch or squash it', C.red, 'transform:scaleX(1.35)')}
  ${dont(lockup({letters: '#2F9E5B', shadow: '#1D5E37'}), 'Change its colours', C.red)}
  ${dont(lockup({showSticker: false}), 'Remove or move the sticker', C.red)}
  ${dont(lockup(), 'Tilt or rotate it', C.red, 'transform:rotate(-14deg)')}
  ${dont(lockup(), 'Put it on a busy photo', `url(${ph('crispy-meal.jpg')}) center/cover`)}
  ${dont(lockup(), 'Add glows, outlines or effects', C.red, 'filter:drop-shadow(0 0 10px #6cf) drop-shadow(0 0 18px #6cf)')}</div>`)}
${P(`${head('04', 'Colours', 'Warm, loud and appetising. Tomato red leads; cream, sunshine and ink support it. Deep red is only for the 3D shadow; pink is for fun extras.')}
  <div class="sws six">${sw('Tomato Red', C.red, C.cream, 'Main · 55%')}${sw('Cream', C.cream, C.ink, 'Backgrounds · 25%')}${sw('Sunshine', C.yellow, C.ink, 'Stickers · 10%')}${sw('Ink', C.ink, C.cream, 'Text · 5%')}${sw('Deep Red', C.deep, C.cream, 'Logo shadow')}${sw('Bubblegum', '#FF9BB3', C.ink, 'Fun extras · 5%')}</div>
  <p class="small">CMYK values are a starting point. Ask the printer for a proof and match it to the red on screen.</p>`)}
${P(`${head('05', 'Typography', 'Free Google Fonts, so anyone can use them on any computer or in Canva.')}
  <div class="types">
  <div class="ty"><div class="spec" style="font:400 74px/1 'Bagel Fat One'">YALLA!</div><b>Bagel Fat One</b><span>Logo, headlines, big prices and offers. Short words only.</span></div>
  <div class="ty"><div class="spec" style="font:700 52px/1.1 Fredoka">chicken &amp; snack</div><b>Fredoka (SemiBold / Bold)</b><span>Taglines, menu items, captions, buttons and body text.</span></div>
  <div class="ty"><div class="spec" style="font:400 76px/1.1 Lalezar;direction:rtl">يلا كول · باشا</div><b>Lalezar</b><span>Arabic headlines and the sticker.</span></div>
  <div class="ty"><div class="spec" style="font:700 48px/1.4 Cairo;direction:rtl">ساندويش زنجر · ٥٠٠،٠٠٠</div><b>Cairo</b><span>Arabic menu items and body text.</span></div></div>
  <p class="small">Fun extras for social posts only: Shrikhand (“yum!”, “saucy!”) and Marhey (playful Arabic).</p>`)}
${P(`${head('06', 'Graphic elements', 'Our toolkit for making anything feel like Basha.')}
  <div class="row"><div class="tile img" style="flex:1;height:120mm"><img src="${img('logos/basha-pattern.png')}"></div>
  <div class="notes" style="flex:1.1"><h4>Stickers</h4><div class="stk">${['باشا', 'NEW!', 'HOT', 'جديد', '$15', 'yum!'].map((t, i) => `<span style="font-family:${/[a-z$!]/i.test(t) ? "'Bagel Fat One'" : 'Lalezar'};transform:rotate(${[9, -6, 5, -8, 7, -4][i]}deg);background:${i === 5 ? '#FF9BB3' : C.yellow}">${t}</span>`).join('')}</div>
  <p>Yellow pill, ink outline, slightly tilted. Use them for the Arabic name, “new”, prices and offers. One or two per design, not ten.</p>
  <h4>Starbursts</h4><p>For prices and shouts (“500K”, “SO GOOD”, “HOT!”). Yellow or pink with an ink outline.</p>
  <h4>The name pattern</h4><p>BASHA and باشا on a slant. Use it for wrapping paper, bag sides, menu backs and Instagram highlight covers.</p>
  <h4>Big cropped words</h4><p>Huge words that run off the edge (CRISPY, EAT!, MENU) make posts and packaging loud and fun.</p></div></div>`)}
${P(`${head('07', 'Photography', 'Real food, close up, on our red-and-white checkered paper. Messy in a good way.')}
  <div class="photos">${['zinger-sandwich.jpg', 'loaded-fries.jpg', 'crispy-meal.jpg', 'basha-burger.jpg', 'wings-meal.jpg', 'fajita-sandwich.jpg', 'mozzarella-sticks.jpg', 'shawarma-plate.jpg'].map(f => `<img src="${ph(f)}">`).join('')}</div>
  <div class="cols2"><div><h4>Do</h4><p>✓ Shoot in daylight, close to the food, from above or at a 45° angle.<br>✓ Show the sauce, the cheese pull, the crunch.<br>✓ Keep the checkered paper in the shot; it’s our backdrop.</p></div>
  <div><h4>Don’t</h4><p>✕ Dark or yellow kitchen light, flash.<br>✕ Cluttered backgrounds, hands with phones, other brands’ packaging.<br>✕ Heavy filters. A little warmth is enough.</p></div></div>`)}
${P(`${head('08', 'Social media', 'One big word, one great photo or one offer per post. Logo small in a corner. Mix English and Arabic.').replace('class="lead"', 'class="lead" style="margin-bottom:4mm"')}
  <div class="social">${fig(fun('post-crispy.png'), 'Word post: one big word + Arabic', '108mm', 'contain', C.red)}${fig(fun('post-yalla.png'), 'Mood post: phrase in both languages', '108mm', 'contain', C.yellow)}${fig(fun('post-product.png'), 'Product post: photo + name + price burst', '108mm', 'contain', C.red)}</div>`)}
${P(`${head('09', 'Packaging', 'Every bag, cup and box is a little billboard.')}
  <div class="grid4">${fig(fun('bag.png'), 'Takeaway bag', '62mm', 'cover')}${fig(fun('cup.png'), 'Drink cup', '62mm', 'cover')}${fig(fun('seal.png'), 'Box seal sticker', '62mm', 'contain', C.cream)}${fig(fun('wrap.png'), 'Wrapping paper', '62mm', 'cover')}</div>
  <p class="small">Cheapest first step: a round “yum!” sticker on plain kraft bags and boxes, plus the pattern printed on greaseproof wrapping paper.</p>`)}
${P(`${head('10', 'Print &amp; signage', 'Business cards, the shop sign and the menu all speak the same language.')}
  <div class="sign">${fig(img('applications/sign.png'), 'Shop sign with striped awning', '78mm', 'cover')}
  ${fig(img('applications/card-front.png'), 'Business card front (85 × 55 mm)', '37mm', 'contain', C.red)}${fig(img('applications/card-back.png'), 'Business card back, with QR to the online menu', '37mm', 'contain', C.cream)}</div>
  ${fig(fun('menu-header.png'), 'Menu board header', '42mm', 'contain', C.red, '136mm')}`)}
${P(`${head('11', 'Your brand kit', 'Everything in the Basha-identity.zip, and where to use it.')}
  <table class="kit">${[
    ['logos/basha-logo-on-red.png', 'Main logo, Instagram/WhatsApp posts, flyers'],
    ['logos/basha-logo-on-cream / -black / -yellow.png', 'The logo on other backgrounds'],
    ['logos/basha-logo-red-transparent.png', 'For printers: bags, cups, boxes, stickers on light colours'],
    ['logos/basha-logo-cream-transparent.png', 'For printers: on red or dark colours'],
    ['logos/basha-logo-black-transparent.png', 'One-colour printing: stamps, receipts, photocopies'],
    ['logos/basha-whatsapp-profile.png', 'WhatsApp, Instagram and Facebook profile picture'],
    ['logos/basha-submark-B.png / -round.png', 'Tiny sizes: app icon, website icon, stamps'],
    ['logos/basha-pattern.png', 'Wrapping paper, bag sides, menu backs, highlight covers'],
    ['fun/post-*.png', 'Ready-to-post Instagram designs (1080 × 1350)'],
    ['fun/bag, cup, seal, wrap, menu-header.png', 'Packaging and signage mock-ups to show printers'],
    ['applications/card-front / card-back.png', 'Business card artwork'],
    ['Basha-brand-guide.pdf', 'This guide: send it with any print or design job']].map(([f, u]) => `<tr><td>${f}</td><td>${u}</td></tr>`).join('')}</table>
  <p class="small">Fonts to install (free): Bagel Fat One, Fredoka, Lalezar, Cairo. Search them on fonts.google.com, or find them in Canva.</p>`)}
${P(`<div style="position:absolute;inset:0;display:grid;place-items:center;text-align:center"><div><div style="width:560px;margin:0 auto 40px">${lockup(LOGO.black)}</div>
  <p style="font:600 22px Fredoka;color:${C.cream};opacity:.85">WhatsApp 76 075 724 · Daily 1–5 PM &amp; 7–11:30 PM · Closed Mondays</p></div></div>`, C.ink, C.cream)}
`, `@page{size:297mm 210mm;margin:0}
.pg{width:297mm;height:210mm;position:relative;overflow:hidden;padding:15mm 18mm;page-break-after:always}
.pn{position:absolute;right:18mm;bottom:9mm;font:600 11px Fredoka;opacity:.5}
.foot{position:absolute;left:18mm;bottom:12mm;font:700 16px Fredoka;color:${C.ink}}
.kick{font:400 16px 'Bagel Fat One';color:${C.red}}
h2{font:400 44px/1 'Bagel Fat One';margin:3px 0 6px}
h3{font:400 22px 'Bagel Fat One';color:${C.red};margin:8mm 0 3mm}
.lead{font:500 16.5px/1.45 Fredoka;max-width:190mm;margin-bottom:7mm;opacity:.85}
.row{display:flex;gap:10mm;align-items:stretch}
.tile{border-radius:14px;padding:18px 26px;display:grid;place-items:center}
.tile.big{flex:1.35;padding:40px}.tile.bordered{border:1px solid #0002}
.tile.img{padding:0;overflow:hidden}.tile.img img{width:100%;height:100%;display:block}
.notes{flex:1;font:500 14px/1.5 Fredoka}.notes h4,.cols2 h4{font:400 17px 'Bagel Fat One';margin:9px 0 3px;color:${C.red}}.notes p{margin:2px 0}
.grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:6mm 9mm}.grid3 .tile{height:52mm}
.sign{display:grid;grid-template-columns:1.6fr 1fr;grid-template-rows:auto auto;gap:3mm 8mm;margin-bottom:3mm}.sign figure:first-child{grid-row:span 2}
.grid4{display:grid;grid-template-columns:repeat(4,1fr);gap:7mm}
.social{display:grid;grid-template-columns:repeat(3,92mm);justify-content:center;gap:9mm}.social figure .tile{border:1px solid #0001}
figure{margin:0}figcaption{font:600 12.5px Fredoka;margin-top:5px;opacity:.75}
.x{position:absolute;right:12px;top:8px;width:34px;height:34px;border-radius:50%;background:${C.ink};color:#fff;display:grid;place-items:center;font:700 20px Fredoka}
.sws{display:grid;gap:7mm}.sws.six{grid-template-columns:repeat(6,1fr)}
.chip{height:62mm;border-radius:14px;padding:14px;display:flex;flex-direction:column;justify-content:flex-end;border:1px solid #0001}.chip b{font:400 19px 'Bagel Fat One'}.chip span{font:600 12.5px Fredoka;opacity:.85}
dl{display:grid;grid-template-columns:auto 1fr;gap:2px 8px;margin-top:7px;font:500 12.5px Fredoka}dt{font-weight:700}
.small{margin-top:6mm;font:500 13px Fredoka;opacity:.7}
.types{display:grid;grid-template-columns:1fr 1fr;gap:8mm 12mm;margin-top:4mm}.ty{background:#fff9;border-radius:14px;padding:14px 20px;border:1px solid #0001}.ty b{display:block;font:400 17px 'Bagel Fat One';color:${C.red};margin-top:8px}.ty span{font:500 13.5px Fredoka;opacity:.8}
.spec{height:30mm;display:flex;align-items:center}
.three{display:grid;grid-template-columns:repeat(3,1fr);gap:8mm}.card{background:${C.red};color:${C.cream};border-radius:16px;padding:16px 20px}.card .big{font:400 30px 'Bagel Fat One'}.card .ar{font:400 26px Lalezar;color:${C.yellow}}.card p{font:500 14px/1.45 Fredoka;margin-top:6px}
.phr{display:flex;flex-wrap:wrap;gap:10px}.phr span{background:#fff;border:3px solid ${C.ink};border-radius:99px;padding:6px 18px;display:flex;gap:12px;align-items:baseline}.phr b{font:400 20px 'Bagel Fat One'}.phr i{font:400 22px Lalezar;font-style:normal;color:${C.red}}
.stk{display:flex;gap:14px;flex-wrap:wrap;margin:8px 0 12px}.stk span{border:4px solid ${C.ink};border-radius:99px;padding:4px 20px;font-size:26px}
.photos{display:grid;grid-template-columns:repeat(4,1fr);gap:4mm;width:205mm}.photos img{width:100%;aspect-ratio:1.5;object-fit:cover;border-radius:14px;display:block}
.cols2{display:grid;grid-template-columns:1fr 1fr;gap:10mm;font:500 14px/1.6 Fredoka;margin-top:5mm}
.kit{width:100%;border-collapse:collapse;font:500 13.5px Fredoka}.kit td{padding:6px 8px;border-bottom:1px solid #0002}.kit td:first-child{font-weight:700;color:${C.red};width:44%}`);
  await pg.setViewportSize({width: 1123, height: 794});
  await pg.setContent(guide, {waitUntil: 'networkidle'});
  await pg.evaluate(() => document.fonts.ready);
  await pg.pdf({path: path.join(OUT, 'Basha-brand-guide.pdf'), width: '297mm', height: '210mm', printBackground: true});
  const pages = await pg.$$('.pg');
  for (const f of fs.readdirSync(OUT)) if (/^guide-page-\d+\.png$/.test(f)) fs.unlinkSync(path.join(OUT, f));
  for (let i = 0; i < pages.length; i++) await pages[i].screenshot({path: path.join(OUT, `guide-page-${i + 1}.png`)});
  console.log('pages', pages.length);
  await browser.close();
})();
