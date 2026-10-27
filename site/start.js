/* ---------- Google: menu as structured data ---------- */
function addStructuredData() {
  const sections = Object.keys(data).map(id => {
    const g = $('#' + id), h = g.closest('section').querySelector('h2').dataset.en, sub = g.previousElementSibling;
    return {'@type': 'MenuSection', name: sub && sub.classList.contains('subhead') ? `${h} – ${sub.dataset.en}` : h,
      hasMenuItem: data[id].map(([n, p, d]) => Object.assign({'@type': 'MenuItem', name: n, offers: {'@type': 'Offer', price: p, priceCurrency: 'LBP'}}, d ? {description: d} : {}))};
  });
  const s = document.createElement('script');
  s.type = 'application/ld+json';
  s.textContent = JSON.stringify({'@context': 'https://schema.org', '@type': 'Restaurant', name: 'El Bash – Chicken & Snack', telephone: '+' + CONFIG.phone,
    servesCuisine: ['Lebanese', 'Fast food'], url: location.origin + location.pathname, hasMenu: {'@type': 'Menu', hasMenuSection: sections}});
  document.head.appendChild(s);
}

/* ---------- start ---------- */
$$('[data-t]').forEach(e => e.dataset.en = e.textContent.trim());
$$('[data-tp]').forEach(e => e.dataset.enp = e.placeholder);
$$('a[data-phone=tel]').forEach(a => { a.href = 'tel:+' + CONFIG.phone; if (!a.classList.contains('cbtn')) a.textContent = CONFIG.phoneDisplay });
$$('a[data-phone=wa]').forEach(a => a.href = 'https://wa.me/' + CONFIG.phone);
$('#langBtn').onclick = () => {
  lang = lang === 'ar' ? 'en' : 'ar';
  try { localStorage.setItem('basha-lang', lang) } catch (e) {}
  const u = new URL(location.href);
  if (u.searchParams.has('lang')) { u.searchParams.set('lang', lang); history.replaceState(null, '', u) }
  applyLang();
};
{
  const q = new URLSearchParams(location.search).get('lang');
  let sv = null; try { sv = localStorage.getItem('basha-lang') } catch (e) {}
  const phoneLang = ((navigator.languages && navigator.languages[0]) || navigator.language || '').toLowerCase();
  lang = q === 'ar' || q === 'en' ? q : sv === 'ar' || sv === 'en' ? sv : phoneLang.startsWith('ar') ? 'ar' : 'en';   // link > own choice > phone language
}
applySheet(store.get('basha-sheet-menu'));   // the last menu loaded from the sheet, so offline visits match it
applyHours(store.get('basha-sheet-menu'));
applyPhotos(store.get('basha-sheet-menu'));
restore();
applyLang();
if (Object.keys(ITEMS).length) addStructuredData();
spy();
if (CONFIG.menuUrl) {
  (DEMO ? demoServer().then(d => d.menu()) : fetch(CONFIG.menuUrl).then(r => r.json())).then(sheet => {
    BUSY = sheet && sheet.status || null; updateBusy();
    applyHours(sheet); updateStatus();
    const first = !Object.keys(ITEMS).length;
    if (!applySheet(sheet)) throw new Error('no menu');
    applyPhotos(sheet);
    store.set('basha-sheet-menu', sheet);
    Object.keys(order).forEach(k => { const p = priceOf(k); if (p) order[k].price = p; else delete order[k] });   // today's prices in the cart
    if (first) { restore(); addStructuredData() }   // nothing was on the phone yet: the saved cart now has its items
    render();
  }).catch(() => { menuFailed = true; render() });   // no connection: the menu above stays (or the message, if there is none)
}
