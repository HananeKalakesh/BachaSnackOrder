// Fun, type-led Basha applications: big cropped words, stickers, bursts, bilingual phrases.
// Run: node brand/identity/build-fun.cjs
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const OUT = path.join(__dirname, 'fun'), ROOT = path.join(__dirname, '..', '..');
const photo = f => 'data:image/jpeg;base64,' + fs.readFileSync(path.join(ROOT, 'photos', f)).toString('base64');
const C = {deep: '#8E1A12', red: '#E8402A', cream: '#FBF1DC', yellow: '#FFC226', ink: '#1C1A15', pink: '#FF9BB3', green: '#2F9E5B'};
const FONTS = '<link href="https://fonts.googleapis.com/css2?family=Shrikhand&family=Bagel+Fat+One&family=Fredoka:wght@600;700&family=Lalezar&family=Marhey:wght@700&display=swap" rel="stylesheet">';

// starburst badge
const burst = (cx, cy, r, fill, n = 14, inner = .8) => { let d = '';
  for (let i = 0; i < n * 2; i++) { const a = Math.PI * i / n, rr = i % 2 ? r * inner : r; d += (i ? 'L' : 'M') + (cx + rr * Math.cos(a)).toFixed(1) + ' ' + (cy + rr * Math.sin(a)).toFixed(1) }
  return `<path d="${d}Z" fill="${fill}" stroke="${C.ink}" stroke-width="8" stroke-linejoin="round"/>`; };
const pill = (x, y, w, h, txt, {rot = 0, fill = C.yellow, color = C.ink, font = "Bagel Fat One", size = h * .55} = {}) =>
  `<g transform="rotate(${rot} ${x + w / 2} ${y + h / 2})"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="${fill}" stroke="${C.ink}" stroke-width="7"/><text x="${x + w / 2}" y="${y + h / 2 + size * .36}" text-anchor="middle" font-family="${font}" font-size="${size}" fill="${color}">${txt}</text></g>`;
// the logo: BASHA + باشا sticker
const logo = (x, y, s = 1, letters = C.cream) => { let ext = ''; for (let i = 24; i >= 1; i--) ext += `<text x="${i * .75}" y="${i}" font-family="Bagel Fat One" font-size="330" fill="${C.deep}" stroke="${C.deep}" stroke-width="16" stroke-linejoin="round">BASHA</text>`;
  return `<g transform="translate(${x} ${y}) scale(${s})">${ext}<text x="0" y="0" font-family="Bagel Fat One" font-size="330" fill="${letters}" stroke="${C.deep}" stroke-width="16" stroke-linejoin="round" paint-order="stroke">BASHA</text>${pill(790, -330, 270, 136, 'باشا', {rot: 9, font: 'Lalezar', size: 104})}</g>`; };
const svg = (w, h, inner, bg) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" style="display:block">${bg ? `<rect width="${w}" height="${h}" fill="${bg}"/>` : ''}${inner}</svg>`;
const shadow = (txt, x, y, attrs, dx = 10, dy = 10) => `<text x="${x + dx}" y="${y + dy}" ${attrs} fill="${C.ink}">${txt}</text><text x="${x}" y="${y}" ${attrs}>${txt}</text>`;

const pieces = {
  // 1. CRISPY poster
  'post-crispy': svg(1080, 1350, `
    <text x="-30" y="330" font-family="Bagel Fat One" font-size="330" fill="none" stroke="${C.cream}" stroke-width="6" letter-spacing="-10">CRIS</text>
    ${shadow('CRISPY', -20, 640, `font-family="Bagel Fat One" font-size="330" letter-spacing="-12" fill="${C.cream}"`, 14, 14)}
    <text x="-30" y="950" font-family="Bagel Fat One" font-size="330" fill="none" stroke="${C.cream}" stroke-width="6" letter-spacing="-10">ISPY!</text>
    <text x="1040" y="1110" text-anchor="end" font-family="Lalezar" font-size="190" fill="${C.yellow}">مقرمش!</text>
    ${burst(870, 260, 150, C.yellow, 16)}<text x="870" y="245" text-anchor="middle" font-family="Bagel Fat One" font-size="54" fill="${C.ink}" transform="rotate(-10 870 260)">SO</text><text x="870" y="305" text-anchor="middle" font-family="Bagel Fat One" font-size="54" fill="${C.ink}" transform="rotate(-10 870 260)">GOOD</text>
    ${logo(60, 1290, .42)}`, C.red),
  // 2. YALLA EAT poster
  'post-yalla': svg(1080, 1350, `
    <text x="540" y="430" text-anchor="middle" font-family="Shrikhand" font-size="300" fill="${C.red}" stroke="${C.ink}" stroke-width="12" paint-order="stroke" transform="rotate(-8 540 380)">yalla</text>
    ${shadow('EAT!', 540, 760, `text-anchor="middle" font-family="Bagel Fat One" font-size="400" letter-spacing="-10" fill="${C.cream}" stroke="${C.ink}" stroke-width="10" paint-order="stroke"`, 16, 16)}
    <text x="540" y="1000" text-anchor="middle" font-family="Marhey" font-weight="700" font-size="170" fill="${C.ink}">يلا كول!</text>
    ${pill(90, 1110, 380, 120, 'BASHA', {rot: -6, fill: C.red, color: C.cream, size: 68})}
    ${pill(560, 1100, 430, 120, 'chicken & snack', {rot: 5, fill: C.cream, font: 'Fredoka', size: 56})}
    ${burst(910, 170, 110, C.pink, 12)}<text x="910" y="190" text-anchor="middle" font-family="Bagel Fat One" font-size="56" fill="${C.ink}" transform="rotate(12 910 170)">HOT!</text>`, C.yellow),
  // 3. Product post with photo + loud type
  'post-product': svg(1080, 1350, `
    <text x="540" y="230" text-anchor="middle" font-family="Bagel Fat One" font-size="250" letter-spacing="-8" fill="${C.yellow}">ZINGER</text>
    <clipPath id="ph"><rect x="90" y="280" width="900" height="760" rx="60"/></clipPath>
    <rect x="102" y="292" width="900" height="760" rx="60" fill="${C.ink}"/>
    <image href="${photo('zinger-sandwich.jpg')}" x="90" y="210" width="900" height="900" clip-path="url(#ph)" preserveAspectRatio="xMidYMid slice"/>
    <rect x="90" y="280" width="900" height="760" rx="60" fill="none" stroke="${C.ink}" stroke-width="10"/>
    <text x="540" y="1200" text-anchor="middle" font-family="Lalezar" font-size="150" fill="${C.cream}">ساندويش زنجر</text>
    ${burst(900, 400, 125, C.yellow, 16)}<text x="900" y="390" text-anchor="middle" font-family="Bagel Fat One" font-size="66" fill="${C.ink}" transform="rotate(-8 900 400)">500K</text><text x="900" y="440" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="34" fill="${C.ink}" transform="rotate(-8 900 400)">L.L.</text>
    ${pill(70, 1250, 300, 80, 'BASHA', {rot: -4, fill: C.cream, color: C.red, size: 46})}`, C.red),
  // 4. Bag covered in type
  'bag': svg(1080, 1080, `
    <ellipse cx="540" cy="1010" rx="350" ry="26" fill="#0002"/>
    <path d="M405 250 C405 110 675 110 675 250" stroke="${C.ink}" stroke-width="24" fill="none" stroke-linecap="round"/>
    <clipPath id="bagc"><path d="M240 240 h600 l50 760 h-700 z"/></clipPath>
    <path d="M240 240 h600 l50 760 h-700 z" fill="${C.red}"/>
    <g clip-path="url(#bagc)">
      <text x="150" y="560" font-family="Bagel Fat One" font-size="330" letter-spacing="-10" fill="${C.cream}">BA</text>
      <text x="150" y="860" font-family="Bagel Fat One" font-size="330" letter-spacing="-10" fill="${C.cream}">SHA</text>
      <text x="880" y="300" font-family="Fredoka" font-weight="700" font-size="40" fill="${C.ink}" transform="rotate(90 880 300)" letter-spacing="4">hot · crispy · saucy · yalla eat · </text>
      <text x="200" y="975" font-family="Lalezar" font-size="80" fill="${C.yellow}">طازة · سخن · طيب</text>
    </g>
    ${pill(560, 380, 250, 120, 'باشا', {rot: 10, font: 'Lalezar', size: 92})}
    <path d="M240 240 h600 l6 80 h-612 z" fill="#0002"/>`, C.cream),
  // 5. Cup
  'cup': svg(1080, 1080, `
    <ellipse cx="540" cy="985" rx="240" ry="24" fill="#0003"/>
    <clipPath id="cupc"><path d="M320 250 h440 l-52 730 h-336 z"/></clipPath>
    <path d="M320 250 h440 l-52 730 h-336 z" fill="${C.cream}"/>
    <g clip-path="url(#cupc)">
      <text x="300" y="600" font-family="Bagel Fat One" font-size="360" fill="${C.red}" transform="rotate(-10 540 520)">sip!</text>
      <text x="540" y="770" text-anchor="middle" font-family="Marhey" font-weight="700" font-size="110" fill="${C.ink}">برّد قلبك</text>
      <text x="540" y="900" text-anchor="middle" font-family="Bagel Fat One" font-size="76" fill="${C.red}" letter-spacing="-2">BASHA</text>
    </g>
    <rect x="290" y="200" width="500" height="64" rx="22" fill="${C.red}" stroke="${C.ink}" stroke-width="7"/>
    <rect x="370" y="168" width="340" height="44" rx="16" fill="${C.red}" stroke="${C.ink}" stroke-width="7"/>
    <rect x="610" y="40" width="26" height="170" rx="10" fill="${C.yellow}" stroke="${C.ink}" stroke-width="6" transform="rotate(12 623 125)"/>`, C.pink),
  // 6. Wrapping paper: words everywhere
  'wrap': (() => { const words = [['CRISPY', 'Bagel Fat One', C.cream], ['باشا', 'Lalezar', C.yellow], ['saucy!', 'Shrikhand', C.cream], ['يلا كول', 'Marhey', C.cream], ['YUM', 'Bagel Fat One', C.yellow], ['سخن', 'Lalezar', C.cream], ['BASHA', 'Bagel Fat One', C.yellow], ['HOT', 'Bagel Fat One', C.cream]];
    let t = '', k = 0;
    for (let y = 70; y < 1180; y += 135) for (let x = -60 + ((y / 135) % 2) * 170; x < 1100; x += 350) { const [w, f, c] = words[k++ % words.length]; t += `<text x="${x}" y="${y}" font-family="${f}" font-size="${f === 'Bagel Fat One' ? 62 : 74}" font-weight="700" fill="${c}" transform="rotate(${(k * 37) % 21 - 10} ${x} ${y})">${w}</text>` }
    return svg(1080, 1080, t, C.red); })(),
  // 7. Box seal sticker
  'seal': svg(1080, 1080, `
    ${burst(540, 540, 520, C.yellow, 24, .9)}
    <circle cx="540" cy="540" r="400" fill="${C.red}" stroke="${C.ink}" stroke-width="8"/>
    <defs><path id="ring" d="M540 210 a330 330 0 1 1 -0.1 0"/></defs>
    <text font-family="Bagel Fat One" font-size="60" fill="${C.cream}"><textPath href="#ring" textLength="2050" lengthAdjust="spacing">HOT · FRESH · CRISPY · SAUCY · HOT · FRESH · CRISPY · SAUCY ·</textPath></text>
    <text x="540" y="570" text-anchor="middle" font-family="Shrikhand" font-size="190" fill="${C.yellow}" stroke="${C.ink}" stroke-width="10" paint-order="stroke" transform="rotate(-8 540 540)">yum!</text>
    <text x="540" y="700" text-anchor="middle" font-family="Lalezar" font-size="100" fill="${C.cream}">طيب كتير</text>`),
  // 8. Menu board header strip
  'menu-header': svg(2160, 700, `
    <text x="-40" y="470" font-family="Bagel Fat One" font-size="470" letter-spacing="-16" fill="${C.cream}">MENU</text>
    <text x="1840" y="380" text-anchor="middle" font-family="Lalezar" font-size="250" fill="${C.yellow}" transform="rotate(-6 1840 300)">منيو</text>
    ${pill(1600, 470, 480, 140, 'BASHA', {rot: 6, fill: C.cream, color: C.red, size: 86})}
    ${burst(2040, 110, 95, C.pink, 12)}<text x="2040" y="128" text-anchor="middle" font-family="Bagel Fat One" font-size="44" fill="${C.ink}" transform="rotate(12 2040 110)">NEW!</text>
    <text x="40" y="650" font-family="Fredoka" font-weight="700" font-size="58" fill="${C.ink}">order on whatsapp · 76 075 724 · اطلب عواتساب</text>`, C.red),
};

(async () => {
  fs.mkdirSync(OUT, {recursive: true});
  const b = await chromium.launch(), p = await b.newPage({viewport: {width: 2200, height: 1400}});
  for (const [k, s] of Object.entries(pieces)) {
    await p.setContent(`<!doctype html><html><head><meta charset="utf-8">${FONTS}<style>body{margin:0;background:transparent}</style></head><body><div id="x" style="display:inline-block">${s}</div></body></html>`, {waitUntil: 'networkidle'});
    await p.evaluate(() => document.fonts.ready);
    await (await p.$('#x')).screenshot({path: path.join(OUT, k + '.png'), omitBackground: k === 'seal'});
  }
  await b.close(); console.log('done');
})();
