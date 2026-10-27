/* ===================== APP ===================== */
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const order = {};               // { 'Item name [options]': {qty, price} }
let lang = 'en', selectedChoice = null, lastFocus = null, menuFailed = false;
const fmt = n => n.toLocaleString('en-US') + (lang === 'ar' ? ' ل.ل.' : ' L.L.');
const ITEMS = {};               // item name -> [name, price, desc, type]
const USD = {};                 // item name -> $ price, for items priced in $
// The sizes of each 'o' card: {label, item, price, usd, sauce, sold}; the card shows the smallest price
const OPTS = {};
function optCard(it) {   // the card's price ("From …") from its sizes
  const o = OPTS[it[0]].filter(x => !x.sold).length ? OPTS[it[0]].filter(x => !x.sold) : OPTS[it[0]], low = o.reduce((a, x) => x.price < a.price ? x : a, o[0]);
  it[1] = low.price; if (low.usd) USD[it[0]] = low.usd; else delete USD[it[0]];
}
const optOf = (card, label) => (OPTS[card] || []).find(o => o.label === label);

/* ---------- adjustments: free changes to an item (no lettuce, on Arabic bread, not spicy…) ----------
   Each item gets the changes that fit it, from its description: a "no …" for each thing in it that can be left out,
   another bread for sandwiches, spicy or not for zinger and crispy, another sauce instead of garlic for meals.
   In the order a change is a code after the item, 'Zinger Sandwich {no-lettuce,bread-arabic|ring the bell}'; the shop
   gets the Arabic words with the item (the same place as its sauces), so the kitchen and the receipt show them under it. */
const ADJ = {
  'no-garlic': ['No garlic', 'بلا ثوم'], 'no-pickles': ['No pickles', 'بلا كبيس'], 'no-coleslaw': ['No coleslaw', 'بلا سلطة'],
  'no-lettuce': ['No lettuce', 'بلا خس'], 'no-corn': ['No corn', 'بلا ذرة'], 'no-cocktail': ['No cocktail sauce', 'بلا كوكتيل'],
  'no-mayo': ['No mayo', 'بلا مايونيز'], 'no-ketchup': ['No ketchup', 'بلا كاتشاب'], 'no-fries': ['No fries inside', 'بلا بطاطا'],
  'no-tomato': ['No tomato', 'بلا بندورة'], 'no-onion': ['No onion', 'بلا بصل'], 'no-rocca': ['No rocca', 'بلا جرجير'],
  'no-mushroom': ['No mushroom', 'بلا فطر'], 'no-cheese': ['No cheese', 'بلا جبنة'], 'no-peppers': ['No peppers', 'بلا فليفلة'],
  'no-guacamole': ['No guacamole', 'بلا غواكامولي'],
  'bread-arabic': ['On Arabic bread', 'على عربي'], 'bread-sub': ['On sub bread', 'على فرنجي'], 'bread-tortilla': ['On tortilla', 'على تورتيلا'],
  'spicy': ['Spicy', 'حرّ'], 'not-spicy': ['Not spicy', 'بلا حرّ'], 'cocktail-not-garlic': ['Cocktail sauce instead of garlic', 'كوكتيل بدل الثوم'],
  'add-patty': ['Add a mozzarella patty', 'زيد باتي موزاريلا']
};
/* Changes that cost extra are items of their own in the Menu tab (the shop charges them like any item): the price and
   on/off come from there. 'bread-up' ("Bread Change") is charged when an Arabic-bread sandwich goes on sub bread or tortilla. */
const EXTRA = {'add-patty': {name: 'Extra Mozzarella Patty', price: 150000, on: true}, 'bread-up': {name: 'Bread Change', price: 50000, on: true}};
// the bread each sandwich is made on (from the costing worksheet), so the other breads are offered
const BREAD_OF = {'Shawarma Sandwich': 'arabic', 'Tawouk Sandwich': 'arabic', 'Chicken Kebab Sandwich': 'arabic', 'Broasted Sandwich': 'arabic',
  'Crispy Sandwich': 'sub', 'Escalope Sandwich': 'sub', 'Chicken Sub Sandwich': 'sub', 'Francisco Sandwich': 'sub', 'Mushroom Steak Sandwich': 'sub',
  'Vegetable Steak Sandwich': 'sub', 'Hausa Sandwich': 'sub', 'Fries Sandwich': 'sub', 'Zinger Sandwich': 'tender', 'Cordon Bleu Sandwich': 'tender',
  'Fajita Sandwich': 'fajita', 'Philadelphia Sandwich': 'fajita', 'Grilled Chicken Sandwich': 'brown'};
// what in the description can be left out: [words, code]
const ADJ_NO = [[/garlic (sauce|paste)/, 'no-garlic'], [/pickles/, 'no-pickles'], [/coleslaw/, 'no-coleslaw'], [/lettuce/, 'no-lettuce'],
  [/\bcorn\b/, 'no-corn'], [/cocktail sauce/, 'no-cocktail'], [/\bmayo\b/, 'no-mayo'], [/ketchup/, 'no-ketchup'], [/tomato/, 'no-tomato'],
  [/onion/, 'no-onion'], [/rocca/, 'no-rocca'], [/mushroom/, 'no-mushroom'], [/cheese|cheddar|mozzarella(?! patty)/, 'no-cheese'],
  [/peppers/, 'no-peppers'], [/guacamole/, 'no-guacamole']];
const ADJ_GROUPS = [['Without', /^no-/], ['Bread', /^bread-/], ['Sauce', /-not-/], ['Extras', /^add-/]];
const GRID_OF_ITEM = {};        // item name -> its grid, filled with the menu (applySheet)
function adjOptions(name) {
  const it = ITEMS[name], g = GRID_OF_ITEM[name] || '', d = String(it && it[2] || '').toLowerCase(), out = [];
  if (!it || !/meal|family|plate|sandwich|burger/i.test(g)) return out;
  const sandwich = /sandwich/i.test(g), burger = /burger/i.test(g);
  ADJ_NO.forEach(([re, code]) => { if (re.test(d) && !out.includes(code)) out.push(code) });
  if ((sandwich || burger) && /fries/.test(d)) out.push('no-fries');
  if (sandwich) {
    const has = 'bread-' + (BREAD_OF[name] || (/arabic bread/.test(d) ? 'arabic' : /submarine/.test(d) ? 'sub' : ''));
    ['bread-arabic', 'bread-sub', 'bread-tortilla'].forEach(b => { if (b !== has) out.push(b) });
  }
  if (burger && !/mozzarella patty/i.test(name + ' ' + d) && EXTRA['add-patty'].on) out.push('add-patty');
  // spicy / not spicy is not offered (owner, 24 Oct)
  if (/meal/i.test(g) && /garlic/.test(d) && !/sandwich/i.test(d)) out.push('cocktail-not-garlic');
  return out;
}
// 'Zinger Sandwich {no-lettuce,bread-arabic|note}' -> {base: 'Zinger Sandwich', codes: [...], note: 'note'}
function splitAdj(key) {
  const m = String(key).match(/^(.*?) \{([^}]*)\}$/);
  if (!m) return {base: key, codes: [], note: ''};
  const [c, ...n] = m[2].split('|');
  return {base: m[1], codes: c ? c.split(',').filter(x => ADJ[x]) : [], note: n.join('|')};
}
function adjKey(base, codes, note) {
  note = String(note || '').replace(/[{}|]/g, ' ').trim().slice(0, 60);
  return codes.length || note ? base + ' {' + codes.join(',') + (note ? '|' + note : '') + '}' : base;
}
const itemOf = base => { const m = base.match(/^(.*?) \[(.*)\]$/); return m ? m[1] : base };
// the paid extras a set of changes brings: ['add-patty', 'bread-up']
function adjExtras(item, codes) {
  const x = codes.filter(c => EXTRA[c] && EXTRA[c].on);
  if (BREAD_OF[item] === 'arabic' && codes.some(c => c === 'bread-sub' || c === 'bread-tortilla') && EXTRA['bread-up'].on) x.push('bread-up');
  return x;
}
function adjWords(key, l) {   // the changes in words, in l ('en' or 'ar', default the page's language)
  const a = splitAdj(key), ar = (l || lang) === 'ar';
  return a.codes.map(c => ADJ[c][ar ? 1 : 0]).concat(a.note ? [a.note] : []);
}
// "1/2 KG" -> "½ KG" / "نص كيلو", "7 PCS" -> "7 قطع"
function optLabel(l) {
  const m = String(l).match(/^(\d+(?:\/\d+)?)\s*(PCS|KG)$/i);
  if (!m) return l;
  if (/KG/i.test(m[2])) return m[1] === '1/2' ? (lang === 'ar' ? 'نص كيلو' : '½ KG') : m[1] + ' ' + unitWord('KG', m[1]);
  return m[1] + ' ' + pcsWord(m[1]);
}

/* ---------- the menu from the shop's sheet ----------
   A row ticked "On order screen" with a price shows; ticked "Sold out" too, greyed as "Not available"; any other row is
   hidden. Rows with the same Card are one card: sizes that are all "N PCS" without sauces are a choice of pieces ('p'),
   anything else a choice of sizes ('o', each size with its own sauces), cheapest first. A card's description and photo
   are its first row's. Category "Extras" (extra pieces, mozzarella stick…) is for the cashier only: not shown here. The
   mozzarella patty is offered on burgers through Adjust (EXTRA above), and Bread Change when a sandwich changes bread. */
const PIECES = {};              // 'Crispy Meal' -> {4: price, 5: price, ...}, from its "4 PCS" … "7 PCS" rows
const SOLD = new Set();         // cards sold out for now: shown greyed, "Not available"
const POPULAR = [];             // cards tagged "★ Popular" (Popular ticked), in the sheet's order
const piecesOf = name => PIECES[name] || {};
const SAUCE_TYPE = {'fries': 's', 'wings 1': 's1', 'wings 1-2': 's2'};   // the Sauces column
// 'Crispy Meal 4 PCS' -> 'Crispy Meal', and the same in Arabic ('وجبة كريسبي 4 قطع', '… قطعتين', '… نص كيلو')
const sizeLess = n => String(n).replace(/\s+(\d+(?:[-\/]\d+)?\s*\S+|قطعتين|نص كيلو)$/, '');
function applySheet(sheet) {
  // a copy from before the sheet had a Card column (kept on the phone) can't build the page
  if (!sheet || !Array.isArray(sheet.items) || !sheet.items.length || !('card' in sheet.items[0])) return false;
  const rate = sheet.rate || CONFIG.usdRate, cards = {}, list = [], named = new Set();
  Object.keys(data).forEach(id => data[id] = []);
  [ITEMS, USD, OPTS, PIECES, GRID_OF_ITEM].forEach(o => Object.keys(o).forEach(k => delete o[k]));
  SOLD.clear(); POPULAR.length = 0;
  const say = (en, ar) => { if (ar && !named.has(en)) { AR.names[en] = ar; named.add(en) } };
  sheet.items.forEach(r => {
    if (!r || !r.name) return;
    const m = r.name.match(/^(.*?)\s+\d+(?:-\d+)?\s*(PCS|PC|KG)$/i);
    say(m ? m[1] : r.name, m ? sizeLess(r.ar) : r.ar);
    if (r.card) say(r.card, sizeLess(r.ar));
    if (r.desc && r.descAr) AR.desc[r.desc] = r.descAr;
    const grid = GRID_OF[r.cat];
    if (!grid) return;
    if (r.card) {
      let c = cards[r.card];
      if (!c) list.push(c = cards[r.card] = {name: r.card, grid, desc: '', rows: [], popular: false});
      c.rows.push(r); c.desc = c.desc || r.desc || ''; c.popular = c.popular || r.popular;
      return;
    }
    const price = r.price || r.usd * rate;
    if (!price || !r.on && !r.soldOut) return;
    if (!r.on) SOLD.add(r.name);
    if (r.usd) USD[r.name] = r.usd;
    list.push({grid, popular: r.popular, item: [r.name, price, r.desc || '', SAUCE_TYPE[r.sauces] || '']});
  });
  list.forEach(c => {
    let it = c.item;
    if (!it) {
      const rows = c.rows.map(r => ({r, price: r.price || r.usd * rate})).filter(x => x.price && (x.r.on || x.r.soldOut));
      if (!rows.length) return;
      if (rows.every(x => /^\d+ PCS$/i.test(x.r.size) && !x.r.sauces)) {
        const on = rows.filter(x => x.r.on), pcs = PIECES[c.name] = {};
        on.forEach(x => pcs[parseInt(x.r.size)] = x.price);
        if (!on.length) SOLD.add(c.name);
        it = [c.name, Math.min(...(on.length ? on : rows).map(x => x.price)), c.desc, 'p'];
      } else {
        OPTS[c.name] = rows.sort((a, b) => a.price - b.price).map(x => ({label: x.r.size || x.r.name, item: x.r.name, price: x.price,
          usd: x.r.usd || 0, sauce: SAUCE_TYPE[x.r.sauces] || '', sold: !x.r.on}));
        if (OPTS[c.name].every(o => o.sold)) SOLD.add(c.name);
        it = [c.name, 0, c.desc, 'o']; optCard(it);
      }
    }
    data[c.grid].push(it); ITEMS[it[0]] = it; GRID_OF_ITEM[it[0]] = c.grid;
    if (c.popular) POPULAR.push(it[0]);
  });
  Object.values(EXTRA).forEach(x => { const r = sheet.items.find(i => i && i.name === x.name); x.on = !!(r && r.on && (r.price || r.usd)); if (x.on) x.price = r.price || r.usd * rate });
  return true;
}
// Photos added to the "6 Menu photos" folder in Drive, named after the item ("Crispy Meal.jpg", "Wings Meal 14 PCS.png"):
// they replace the page's own photo, and give one to new items
function applyPhotos(sheet) {
  if (!sheet || !sheet.photos) return;
  const norm = n => String(n).replace(/\s+\d+(?:[-/]\d+)?\s*(pcs|pc|kg)$/i, '').trim().toLowerCase();
  Object.values(data).flat().forEach(it => {
    const id = sheet.photos[norm(it[0])];
    if (id) CONFIG.photos[it[0]] = 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(id) + '&sz=w640';
  });
}

/* ---------- saved data (cart, customer details, last order) ---------- */
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)) } catch (e) { return null } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)) } catch (e) {} }
};
// The $ price of a cart key when its item is priced in dollars (the family meals), else 0
function baseUsd(key) {
  const a = splitAdj(key); if (a.codes.length) return 0;
  const m = a.base.match(/^(.*?) \[(.*)\]$/), item = ITEMS[m ? m[1] : a.base];
  if (!item || item[3] === 'p') return 0;
  if (item[3] === 'o') { const o = m && optOf(item[0], m[2].split(', ')[0]); return o && o.usd || 0 }
  return USD[item[0]] || 0;
}
// A line's price: $ for dollar items, L.L. for the rest
const lineMoney = (key, qty, lbp) => { const u = baseUsd(key); return u ? '$' + Math.round(u * qty * 100) / 100 : fmt(lbp) };
const usdAlso = lbp => '$' + (Math.round(lbp / CONFIG.usdRate * 100) / 100);
// Current price for a cart key, so saved carts always use today's menu prices
function priceOf(key) {
  const a = splitAdj(key), p = basePrice(a.base);
  return p && p + adjExtras(itemOf(a.base), a.codes).reduce((s, c) => s + EXTRA[c].price, 0);
}
function basePrice(key) {
  const m = key.match(/^(.*?) \[(.*)\]$/), item = ITEMS[m ? m[1] : key];
  if (!item || SOLD.has(item[0])) return null;
  if (item[3] === 'p') return m ? piecesOf(item[0])[parseInt(m[2])] || null : null;
  if (item[3] === 'o') { const o = m && optOf(item[0], m[2].split(', ')[0]); return o && !o.sold ? o.price : null }
  return item[1];
}
function orderQtys() { const o = {}; Object.entries(order).forEach(([k, x]) => o[k] = x.qty); return o }
function saveCart() { store.set('basha-cart', {at: Date.now(), items: orderQtys(), note: $('#custNote').value}) }
function saveCustomer() {
  store.set('basha-customer', {name: $('#custName').value, phone: $('#custPhone').value, otype: ($('input[name=otype]:checked') || {}).value || '', addr: $('#custAddr').value});
}
function fillOrder(items) {
  Object.entries(items || {}).forEach(([k, q]) => {
    const p = priceOf(k);
    if (p && q > 0) { order[k] ??= {qty: 0, price: p}; order[k].qty += q }
  });
}
function restore() {
  const c = store.get('basha-cart');
  if (c && Date.now() - c.at < CONFIG.cartHours * 3600e3) { fillOrder(c.items); $('#custNote').value = c.note || '' }
  const u = store.get('basha-customer');
  if (u) {
    $('#custName').value = u.name || '';
    $('#custPhone').value = u.phone || '';
    $('#custAddr').value = u.addr || '';
    const r = $(`input[name=otype][value="${u.otype}"]`);
    if (r) r.checked = true;
    $('#custAddr').hidden = u.otype !== 'Delivery';
  }
}

/* ---------- closed day + opening hours ---------- */
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_NAMES = {en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], ar: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']};
function beirutNow() {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', {timeZone: CONFIG.timeZone, weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit', hour: 'numeric', minute: 'numeric', hourCycle: 'h23'}).formatToParts(new Date()).map(x => [x.type, x.value]));
  return {day: DAYS.indexOf(p.weekday), min: +p.hour * 60 + +p.minute, date: p.year + '-' + p.month + '-' + p.day};
}
function isClosedToday() { const n = beirutNow(); return CONFIG.closedDay != null && n.day === CONFIG.closedDay && !(CONFIG.openDates || []).includes(n.date) }
const mins = hm => { const [h, m] = hm.split(':'); return +h * 60 + +m };
function timeText(hm) {
  let [h, m] = hm.split(':').map(Number); h = h % 24;
  const h12 = h % 12 || 12, mm = m ? ':' + String(m).padStart(2, '0') : '';
  return h12 + mm + (lang === 'ar' ? (h < 12 ? ' ص' : ' م') : (h < 12 ? ' AM' : ' PM'));
}
// "Open now · until 5 PM" / "Closed now · opens at 7 PM" / "Closed today · opens tomorrow at 1 PM"
// A day's hours can run past midnight ("6 PM - 12:30 AM" is 18:00-24:30): after midnight it is still that day's evening.
const hoursFor = d => (CONFIG.dayHours && CONFIG.dayHours[d]) || CONFIG.hours || [];
function isClosedOn(d, date) { return CONFIG.closedDay != null && d === CONFIG.closedDay && !(CONFIG.openDates || []).includes(date) }
function openStatus() {
  const {day, min, date} = beirutNow();
  if (!hoursFor(day).length) return null;
  // the closing time customers see (shownHours, e.g. 11 PM); past it, while the staff are still open, no time is given
  const until = ([a, b], m) => { const s = (CONFIG.shownHours || []).find(x => x[0] === a), end = s ? s[1] : b;
    return mins(end) > m ? t('Open now · until {t}').replace('{t}', timeText(end)) : t('Open now') };
  // yesterday's evening still open after midnight
  const prev = (day + 6) % 7, late = !isClosedOn(prev, '') && hoursFor(prev).find(([a, b]) => mins(b) > 1440 && min < mins(b) - 1440);
  if (late) return {open: true, text: until(late, min + 1440)};
  const closedDay = isClosedToday(), hours = hoursFor(day);
  if (!closedDay) {
    const now = hours.find(([a, b]) => min >= mins(a) && min < mins(b));
    if (now) return {open: true, text: until(now, min)};
    const later = hours.find(([a]) => mins(a) > min);
    if (later) return {open: false, text: t('Closed now · opens at {t}').replace('{t}', timeText(later[0]))};
  }
  let d = 1; while ((day + d) % 7 === CONFIG.closedDay) d++;
  const dayName = d === 1 ? t('tomorrow') : DAY_NAMES[lang][(day + d) % 7];
  return {open: false, text: t(closedDay ? 'Closed today · opens {d} at {t}' : 'Closed now · opens {d} at {t}').replace('{d}', dayName).replace('{t}', timeText(hoursFor((day + d) % 7)[0][0]))};
}
// The hours from the sheet: "13:00-16:00, 18:00-23:00" (or "1-4 pm, 6-11 pm"), a day name ("Monday", "الاثنين", or
// empty for none) and dates "2026-10-19, 2026-12-25". Anything that doesn't read well keeps the page's own.
function applyHours(sheet) {
  if (!sheet) return;
  // "13", "13:30", "1 pm", "1:30 م" -> "13:00" / "13:30"; a part without am/pm takes the one after it ("1-4 pm")
  const hm = (x, ap) => {
    const m = String(x).trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm|ص|م)?$/i); if (!m) return null;
    let h = +m[1]; const s = (m[3] || ap || '').toLowerCase();
    if ((s === 'pm' || s === 'م') && h < 12) h += 12; if ((s === 'am' || s === 'ص') && h === 12) h = 0;
    return h > 24 || +(m[2] || 0) > 59 ? null : String(h).padStart(2, '0') + ':' + (m[2] || '00');
  };
  // "1 PM - 4 PM, 6 PM - 12:30 AM": a closing time at or before its opening time is after midnight (24:30)
  const ranges = text => {
    const list = String(text).split(/[,،;]+/).filter(r => r.trim()).map(r => {
      const p = r.split(/\s*[-–—]\s*|\s+to\s+/i), ap = (String(p[1] || '').match(/am|pm|ص|م/i) || [''])[0];
      const a = hm(p[0], ap); let b = hm(p[1] || '');
      if (a && b && mins(b) <= mins(a)) b = String(+b.slice(0, 2) + 24) + b.slice(2);
      return a && b && mins(b) - mins(a) < 1440 ? [a, b] : null;
    });
    return list.length && list.every(Boolean) ? list : null;
  };
  const dayIdx = n => { n = n.trim().toLowerCase(); const i = [...DAY_NAMES.en, ...DAY_NAMES.ar].findIndex(x => x.toLowerCase() === n || /^[a-z]{3,}$/.test(n) && x.toLowerCase().startsWith(n.slice(0, 3))); return i < 0 ? -1 : i % 7 };
  if (sheet.hours) {
    // "1 PM - 4 PM, 6 PM - 12 AM | Friday Saturday Sunday: 1 PM - 4 PM, 6 PM - 12:30 AM"
    const parts = String(sheet.hours).split('|'), main = ranges(parts[0]), days = {};
    parts.slice(1).forEach(p => {
      const m = p.split(':'), names = m[0], list = ranges(m.slice(1).join(':'));
      if (list) names.split(/[\s,،]+/).filter(Boolean).map(dayIdx).forEach(i => { if (i >= 0) days[i] = list });
    });
    if (main) { CONFIG.hours = main; CONFIG.dayHours = days }
  }
  if (sheet.closedDay !== undefined) {
    const d = String(sheet.closedDay).trim(), i = [...DAY_NAMES.en, ...DAY_NAMES.ar].findIndex(n => n.toLowerCase() === d.toLowerCase() || n.slice(0, 3).toLowerCase() === d.slice(0, 3).toLowerCase() && /^[a-z]/i.test(d));
    if (!d || /^(none|no|لا)$/i.test(d)) CONFIG.closedDay = null; else if (i >= 0) CONFIG.closedDay = i % 7;
  }
  if (sheet.openDates !== undefined) CONFIG.openDates = String(sheet.openDates).match(/\d{4}-\d{2}-\d{2}/g) || [];
}
// "Daily 1 PM – 4 PM & 6 PM – 11 PM · Closed on Mondays"
function hoursLine() {
  const fmt = list => list.map(([a, b]) => lang === 'ar' ? 'من ' + timeText(a) + ' لـ ' + timeText(b) : timeText(a) + ' – ' + timeText(b)).join(lang === 'ar' ? ' و' : ' & ');
  const r = CONFIG.shownHours || CONFIG.hours || [];
  const off = CONFIG.closedDay == null ? '' : lang === 'ar' ? ' · مسكّرين يوم ' + DAY_NAMES.ar[CONFIG.closedDay] : ' · Closed on ' + DAY_NAMES.en[CONFIG.closedDay] + 's';
  return r.length ? (lang === 'ar' ? 'كل يوم ' + fmt(r) : 'Daily ' + fmt(r)) + off : '';
}
function updateStatus() {
  $('#hoursLine').textContent = hoursLine();
  if (CONFIG.closedDay != null) $('#closedBanner').textContent = t("We're closed today ({d}). You can still browse the menu.").replace('{d}', DAY_NAMES[lang][CONFIG.closedDay]);
  const st = openStatus(), el = $('#status');
  el.textContent = st ? (st.open ? '● ' : '') + st.text : '';
  el.classList.toggle('shut', !!st && !st.open);
  $('#closedBanner').hidden = !isClosedToday();
  const hn = $('#hoursNote');
  hn.textContent = t("We're closed right now. You can still send your order and we'll reply when we open.");
  hn.hidden = !st || st.open || isClosedToday();
}
setInterval(updateStatus, 60000);

/* ---------- busy mode, set by the cashier in the shop's app: a longer wait, or no website orders for a while ---------- */
let BUSY = null;
function busyNow() { return BUSY && BUSY.until > Date.now() ? BUSY : null }
function updateBusy() {
  const b = busyNow(), until = b && new Date(b.until).toLocaleTimeString('en-GB', {hour: '2-digit', minute: '2-digit', timeZone: CONFIG.timeZone});
  const msg = !b ? '' : b.mode === 'paused'
    ? t("We have a lot of orders right now, so we've paused online orders until {t}. Please try again then, or call us.").replace('{t}', until)
    : t('We have a lot of orders right now: expect about {m} extra minutes. Thanks for your patience!').replace('{m}', b.wait || 20);
  $('#busyBanner').textContent = msg; $('#busyBanner').hidden = !b;
  $('#busyNote').textContent = msg; $('#busyNote').hidden = !b;
}
setInterval(updateBusy, 60000);

/* ---------- translation ---------- */
const missing = new Set(), miss = x => { if (x) missing.add(x) };
function t(x) { if (lang !== 'ar' || !x) return x; const a = AR.ui[x]; if (a === undefined) { miss(x); return x } return a }
function unitWord(u, n) { return /^KG$/i.test(u) ? (lang === 'ar' ? 'كيلو' : 'KG') : pcsWord(n) }
function pcsWord(n) { const k = +String(n).split('-').pop(); return lang === 'ar' ? (k >= 3 && k <= 10 ? 'قطع' : 'قطعة') : 'PCS' }
function tSauce(x) { if (lang !== 'ar') return x; const a = AR.names[x]; if (a === undefined) { miss(x); return x } return a }
function tName(n) {
  if (lang !== 'ar') return n;
  const m = n.match(/^(.*?)\s+(\d+(?:-\d+)?)\s*(PCS|PC|KG)$/i), base = m ? m[1] : n, a = AR.names[base];
  if (a === undefined) { miss(n); return n }
  if (m && m[2] === '2' && !/^KG$/i.test(m[3])) return a + ' قطعتين';
  return m ? a + ' ' + m[2] + ' ' + unitWord(m[3], m[2]) : a;
}
function tKey(k) {
  const a = adjWords(k);
  return tKeyBase(splitAdj(k).base) + (a.length ? ' (' + a.join(lang === 'ar' ? '، ' : ', ') + ')' : '');
}
function tKeyBase(k) {
  if (lang !== 'ar') return k;
  const m = k.match(/^(.*?)\s*\[(.*)\]$/);
  if (!m) return tName(k);
  const inner = m[2].split(/\s*,\s*/).map(x => { const p = x.match(/^(\d+(?:-\d+)?)\s*PCS$/i); return p ? p[1] + ' ' + pcsWord(p[1]) : /^\d+(\/\d+)?\s*KG$/i.test(x) ? optLabel(x) : tSauce(x) }).join('، ');
  return tName(m[1]) + ' [' + inner + ']';
}
function tDesc(d) {
  if (lang !== 'ar' || !d) return d;
  if (AR.desc[d]) return AR.desc[d];
  let body = d, tail = '';
  const bm = body.match(/^(.*?)\s+on\s+((?:submarine |brown |arabic )?bread|burger bun)$/i);
  if (bm) { const b = AR.bread[bm[2].toLowerCase()]; if (b) { body = bm[1]; tail = ' على ' + b } }
  const out = body.split(/\s*,\s*|\s+and\s+|\s*&\s*/i).map(x => x.trim()).filter(Boolean).map(x => AR.ing[x.toLowerCase()]);
  if (!out.length || out.some(x => x === undefined)) { miss(d); return d }
  return (out.length > 1 ? out.slice(0, -1).join('، ') + ' و' + out[out.length - 1] : out[0]) + tail;
}
function inLang(l, f) { const o = lang; lang = l; try { return f() } finally { lang = o } }
function applyLang() {
  const ar = lang === 'ar', h = document.documentElement;
  missing.clear();
  h.lang = ar ? 'ar' : 'en'; h.dir = ar ? 'rtl' : 'ltr';
  if (typeof updateBusy === 'function') updateBusy();
  $$('[data-t]').forEach(e => e.textContent = t(e.dataset.en));
  $$('[data-tp]').forEach(e => e.placeholder = t(e.dataset.enp));
  $$('[data-ta]').forEach(e => e.setAttribute('aria-label', t(e.dataset.ta)));
  document.title = t('El Bash — Chicken & Snack | Menu');
  const b = $('#langBtn'); b.textContent = ar ? 'English' : 'عربي'; b.lang = ar ? 'en' : 'ar';
  render();
  updateStatus();
  if (ar && missing.size) console.warn('No Arabic translation yet for:', [...missing]);
}

/* ---------- menu cards ---------- */
function esc(s) { return String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c])) }
function qty(s) { return String(s).replace(/(\d+(?:-\d+)?\s*(?:PCS|PC|KG|KGS|قطعة|قطع|كيلو))/gi, '<span class="tag">$1</span>') }
function card([name, price, desc, type]) {
  const sold = SOLD.has(name), pick = type === 'p' || type === 'o', choice = !!type && !sold, label = esc(tName(name));
  const pcs = type === 'p' ? Object.keys(piecesOf(name)) : [];
  const choiceText = type === 'o' ? t('Choose') + ' ' + OPTS[name].map(o => optLabel(o.label)).join(' ' + t('or') + ' ')
    : type === 'p' ? t('Choose') + ' ' + (pcs.length > 1 ? pcs[0] + ' ' + t('or') + ' ' : '') + optLabel(pcs[pcs.length - 1] + ' PCS')
    : t({s2: 'Choose 1 or 2 sauces', s1: 'Choose 1 sauce', s: 'Choose your sauces'}[type] || '');
  const icon = /zinger|hausa|buffalo/i.test(name) ? ' 🌶️' : /grilled chicken (plate|sandwich)|vegetable steak/i.test(name) ? ' 🥗' : '';
  const search = [name, inLang('ar', () => tName(name)), desc, inLang('ar', () => tDesc(desc))].join(' ').toLowerCase();
  const pop = POPULAR.includes(name), src = CONFIG.photos[name];
  const photo = src ? `<div class="ph"><img class="photo" src="${esc(src)}" alt="${label}" loading="lazy" width="640" height="640">${pop ? `<span class="stamp">★ ${t('Popular')}</span>` : ''}</div>` : '';
  const controls = sold ? `<span class="na">${t('Not available')}</span>` : choice
    ? `<button class="add" type="button" aria-haspopup="dialog" aria-label="${esc(t('Choose options for'))} ${label}">+<span class="word">${t('Add')}</span></button>`
    : `<div class="stepper"><button class="dec" type="button" aria-label="${esc(t('Remove one'))}: ${label}">−</button><span class="qty">0</span><button class="inc" type="button" aria-label="${esc(t('Add one'))}: ${label}">+<span class="word">${t('Add')}</span></button></div>`;
  return `<div class="item${src ? ' has-photo' : ''}${choice ? ' choosable' : ''}${sold ? ' soldout' : ''}" data-name="${esc(name)}" data-price="${price}" data-type="${type || ''}" data-search="${esc(search)}">${photo}<div class="name">`
    + `<div class="title">${qty(label)}${icon}</div>`
    + `${desc ? `<div class="ingredients">${esc(tDesc(desc))}</div>` : ''}${pop && !src ? `<span class="tag pop">★ ${t('Popular')}</span>` : ''}`
    + `${choice ? `<span class="incart" hidden></span><div class="tag choose">${esc(choiceText)}</div>` : ''}</div>`
    + `<div class="actions"><div class="price">${pick ? t('From') + ' ' : ''}${USD[name] ? `<bdi dir="ltr">$${USD[name]}</bdi><span class="ll">${fmt(price)}</span>` : fmt(price)}</div>${controls}</div></div>`;
}
// All items show as cards, two per row; items with a photo come first so rows line up
// the offer banner shows the lowest family meal price it talks about (Shawarma, Tawouk, Fajita), from the sheet
function promoPrice() {
  const o = ['Shawarma Family Meal', 'Tawouk Family Meal', 'Fajita Family Meal'].flatMap(n => (OPTS[n] || []).filter(x => !x.sold));
  if (!o.length || !$('#promoPrice')) return;
  const low = o.reduce((a, x) => x.price < a.price ? x : a, o[0]);
  $('#promoPrice').textContent = low.usd ? '$' + low.usd : fmt(low.price);
}
function render() {
  promoPrice();
  Object.entries(data).forEach(([id, items]) => {
    const avail = items.filter(it => !SOLD.has(it[0])), sold = items.filter(it => SOLD.has(it[0]));   // not available last
    const sorted = [...avail.filter(it => CONFIG.photos[it[0]]), ...avail.filter(it => !CONFIG.photos[it[0]]), ...sold];
    $('#' + id).innerHTML = `<div class="pgrid">${sorted.map(card).join('')}</div>`;
  });
  $('#popularGrid').innerHTML = `<div class="pgrid">${POPULAR.map(n => ITEMS[n]).filter(Boolean).map(card).join('')}</div>`;
  // no menu yet: the first visit without internet, or the sheet not answering
  $('#menuMsg').hidden = Object.keys(ITEMS).length > 0;
  $('#menuMsg').textContent = t(menuFailed ? "We couldn't load the menu. Check your internet, or call us." : 'Loading the menu…');
  cart();
  filterMenu();
}

/* ---------- search ---------- */
function filterMenu() {
  const q = $('#search').value.trim().toLowerCase();
  $$('.item').forEach(i => i.hidden = !!q && !i.dataset.search.includes(q));
  $$('.subhead').forEach(h => h.hidden = !h.nextElementSibling.querySelector('.item:not([hidden])'));
  $$('section').forEach(sec => sec.hidden = !sec.querySelector('.item:not([hidden])'));
  if (q) $('#popular').hidden = true;   // avoid showing popular items twice in results
  $('#noResults').hidden = !q || !!$('.item:not([hidden])');
  $('#promo').hidden = !!q;
  $('#clearSearch').hidden = !q;
}
$('#search').addEventListener('input', () => { filterMenu(); spy() });
$('#search').addEventListener('focus', () => $('#search').closest('.hero-actions').scrollIntoView({behavior: 'smooth', block: 'start'}));
$('#clearSearch').onclick = () => { $('#search').value = ''; filterMenu(); $('#search').focus() };
$('#promo').onclick = () => document.getElementById($('#promo').dataset.target).scrollIntoView({behavior: 'smooth'});

