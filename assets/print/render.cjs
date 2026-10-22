// Turns menu-a3-en.html / menu-a3-ar.html into A3 PDFs and PNG previews. Run: node render.cjs (needs Playwright)
const {chromium} = require('playwright'), path = require('path');
(async () => {
  const b = await chromium.launch(), p = await b.newPage({viewport: {width: 1587, height: 1123}, deviceScaleFactor: 2});
  for (const lang of ['en', 'ar']) {
    await p.goto('file://' + path.join(__dirname, `menu-a3-${lang}.html`)); await p.waitForTimeout(2500);
    const over = await p.evaluate(() => [...document.querySelectorAll('.col')].map(c => c.scrollHeight - c.clientHeight));
    console.log(lang, 'overflow per column (px):', over.join(', '));
    await p.pdf({path: path.join(__dirname, `menu-a3-${lang}.pdf`), width: '420mm', height: '297mm', printBackground: true});
    await p.screenshot({path: path.join(__dirname, `menu-a3-${lang}.png`)});
  }
  await b.close();
})();
