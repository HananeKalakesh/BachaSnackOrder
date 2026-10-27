// MENU: items on the order screen; MENU_ALL: every Menu row; SET: the Settings tab (rate, PIN, kitchen times, day end)
var MENU = [], MENU_ALL = [], BUSY = null, SET = EB.settings(null), RATE = 89500, CATS = [], cart = {}, method = 'Unpaid';
var DAY_END = 2;  // the business day runs until 2 am (Settings tab), so a late night counts as one day
function bizDate() { return new Date(EB.now() - DAY_END * 3600000) }
var PKEY = 'elbash-pos-pin', LKEY = 'elbash-pos-lang';
var CAT_AR = {'All': 'الكل', 'Fries': 'بطاطا', 'Appetizers': 'مقبلات', 'Meals': 'وجبات', 'Family Meals': 'وجبات عائلية', 'Plates': 'صحون',
  'Chicken Sandwiches': 'ساندويشات دجاج', 'Beef Sandwiches': 'ساندويشات لحمة', 'Other Sandwiches': 'ساندويشات تانية',
  'Chicken Burgers': 'برغر دجاج', 'Beef Burgers': 'برغر لحمة', 'Sauces & Extras': 'صوصات', 'Extras': 'إضافات', 'Drinks': 'مشروبات'};
var PAY_AR = {Cash: 'كاش', Whish: 'ويش', Unpaid: 'ما دفع', Split: 'كاش + ويش', House: 'للبيت'};
// Paid partly by Whish, the rest cash: asks the Whish part ($, or L.L. for a big number); null when cancelled or not a part
function askSplit(o) {
  var a = prompt(T('قديش انْدفع ويش؟ الباقي كاش. (بالدولار، أو بالليرة)', 'How much was paid by Whish? The rest is cash. ($, or L.L.)') + '\n' + $usd(o.total) + ' · ' + ll(o.total));
  if (a == null) return null;
  var n = Number(String(a).replace(/[^0-9.]/g, '')), lbp = Math.round(n > 10000 ? n : n * RATE);
  if (!(lbp > 0 && lbp < o.total)) { alert(T('المبلغ لازم يكون أقل من الحساب', 'The Whish part must be less than the total')); return null }
  return lbp;
}
// Section colors, one El Bash color per food group
// [background, text on it, tint behind items already in the order]
var MUSTARD = ['#F2B705', '#1A1A17', '#FDF1CC'], RED = ['#C8102E', '#FFFFFF', '#FBE4E8'], GREEN = ['#1F4A37', '#FAF5EC', '#E2ECE6'],
  INK = ['#1A1A17', '#FAF5EC', '#E9E7E2'], SAND = ['#EFE6D6', '#1A1A17', '#F6EFE2'];
var CAT_COLOR = {'Fries': MUSTARD, 'Appetizers': MUSTARD, 'Meals': RED, 'Family Meals': RED, 'Plates': RED,
  'Chicken Sandwiches': GREEN, 'Beef Sandwiches': GREEN, 'Other Sandwiches': GREEN, 'Chicken Burgers': INK, 'Beef Burgers': INK,
  'Sauces & Extras': SAND, 'Extras': MUSTARD, 'Drinks': SAND};
function catColor(c) { return CAT_COLOR[c] || SAND }
function catVars(c) { var k = catColor(c); return '--c:' + k[0] + ';--f:' + k[1] + ';--t:' + k[2] }
// Words the colored section header already says are left off the menu buttons (the ticket keeps full names)
var SANDWICH = [/^ساندويش\s+/, /\s+Sandwich$/];
var TRIM = {'Family Meals': [/^وجبة عائلية\s+/, /\s+Family Meal/], 'Meals': [/^وجبة\s+/, /\s+Meal\b/], 'Plates': [/^صحن\s+/, /\s+Plate$/],
  'Chicken Sandwiches': SANDWICH, 'Beef Sandwiches': SANDWICH, 'Other Sandwiches': SANDWICH, 'Sauces & Extras': [/^صوص\s+/, /\s+Sauce$/], 'Extras': [/\s+إضافي(ة)?$/, /^Extra\s+/]};
function trim(text, cat, k) { var t = TRIM[cat]; return t ? text.replace(t[k], '') || text : text }
var lang = 'ar';
function T(ar, en) { return lang === 'en' ? en : ar }
function $(s) { return document.querySelector(s) }
function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c] }) }
function fmt(n) { return Math.round(n).toLocaleString('en-US') }
function short(n) { return n >= 1000 ? fmt(n / 1000) + 'K' : fmt(n) }  // 150,000 -> 150K on the menu buttons
function money(n) { return fmt(n) + ' L.L.' }
function usd(n) { return '$' + (Math.round(n * 100) / 100).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) }
function bi(ar, en) { return '<span class="ar">' + esc(ar) + '</span><span class="en">' + esc(en) + '</span>' }
function arName(en) { for (var i = 0; i < MENU.length; i++) if (MENU[i].name === en) return MENU[i].ar || en; return en }
function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v) } catch (e) { return null } }
function toast(arHtml, en) { var el = $('#toast'); el.innerHTML = '<span class="ar">' + arHtml + '</span><span class="en">' + esc(en) + '</span>'; el.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(function () { el.classList.remove('show') }, 2600) }

/* ---------- the app key (once per iPad) and problems the sheet reports ---------- */
function askKey(wrong) {
  var k = prompt((wrong ? T('المفتاح غلط. ', 'That key is wrong. ') : '') +
    T('اكتب مفتاح التطبيق (بصفحة Settings بالشيت، سطر App key)', 'Enter the app key (Settings tab of the sheet, row "App key")'), '');
  if (k) { EB.key(k); start() }
}
EB.onKey = function () { askKey(true) };
EB.onError = function (change, e) {
  var f = change.effect || {};
  alert(T('الشيت ما قبل هالتغيير: ', 'The sheet refused this change: ') + (e.message || e) + (f.order ? '\n\n#' + f.order.num + ' · ' + f.order.text : ''));
};
EB.onChange = function () { showNet(); if ($('#ordersView').style.display === 'block') drawOrders(); if ($('#owedView').style.display === 'block') drawOwed(); if ($('#owedTView').style.display === 'block') drawOwedToday() };

/* ---------- menu ---------- */
// Four fixed columns: sides with sauces and drinks under them, meals, family meals and burgers, sandwiches.
// A section not listed here joins the column with the fewest items.
var LAYOUT = [['Fries', 'Appetizers', 'Sauces & Extras', 'Drinks'], ['Meals', 'Plates', 'Extras'], ['Family Meals', 'Chicken Burgers', 'Beef Burgers'],
  ['Chicken Sandwiches', 'Beef Sandwiches', 'Other Sandwiches']];
var PAIRED = ['Sauces & Extras', 'Extras', 'Drinks'];  // short names: two buttons per row
/* Other sales: two buttons that aren't menu items, priced when tapped. Marinated chicken (raw, sold to cook at home)
   goes into the sales under its own category, apart from the shop's food; Other is anything not on the menu
   (an amendment, a special request): the name and price are typed. Each one is its own ticket line. */
var OPEN_SEC = 'Other sales';
var OPEN = {mar: {name: 'Marinated Chicken', ar: 'دجاج متبّل', cat: 'Marinated Chicken'}, oth: {name: 'Other', ar: 'غير', cat: 'Other'}};
var OPEN_CAT = {'Marinated Chicken': 'mar', 'Other': 'oth'};
var CUSTOM = {}, customN = 0;   // cart key ("c1") -> {name, ar, cat, price, usd, note, kind}
CAT_AR[OPEN_SEC] = 'مبيعات تانية'; CAT_COLOR[OPEN_SEC] = GREEN; PAIRED.push(OPEN_SEC); LAYOUT[1].push(OPEN_SEC);
// Items that come with sauces to choose, the same as on the website: [sauces, fewest, most]
var SAUCES = {fries: ['Cocktail Sauce', 'Ketchup', 'Barbecue Sauce', 'Cheddar Sauce'], wings: ['Buffalo Sauce', 'Barbecue Sauce', 'Honey Mustard Sauce']};
// from each item's Sauces in the Menu tab (fries, wings 1, wings 1-2), filled with the menu (useMenu)
var CHOICE = {}, CHOICE_OF = {'fries': ['fries', 1, 4], 'wings 1': ['wings', 1, 1], 'wings 1-2': ['wings', 1, 2]};
var SAUCE_AR = {'Cocktail Sauce': 'كوكتيل', 'Ketchup': 'كاتشاب', 'Barbecue Sauce': 'باربكيو', 'Cheddar Sauce': 'تشيدر', 'Buffalo Sauce': 'بوفالو', 'Honey Mustard Sauce': 'هني ماستارد'};
function sauceList(list) { return bi(list.map(function (s) { return SAUCE_AR[s] || s }).join('، '), list.map(function (s) { return s.replace(/ Sauce$/, '') }).join(', ')) }

// The menu and settings this iPad last loaded show straight away (also offline), then the sheet's newest copy
function loadMenu() {
  var c = EB.cached('menu'); if (c) useMenu(c);
  EB.read('menu', {'Menu': 0, 'Settings': 0, 'Status': 0}).catch(function (e) {
    // a script that doesn't know the Status tab yet (busy mode): the menu without it
    if (/Unknown tab/.test(e.message)) return EB.read('menu', {'Menu': 0, 'Settings': 0});
    throw e;
  }).then(useMenu, function (e) {
    if (e.badKey) return askKey(true);
    if (!MENU.length) $('#grid').innerHTML = '<div class="err" style="padding:20px">' + bi('ما قدرنا نحمّل المنيو. تأكد من الإنترنت وجرّب مرة تانية.', 'Could not load the menu. Check the internet and reload.') + '<br><small>' + esc(e.message || e) + '</small></div>';
  });
}
function useMenu(r) {
  var first = !SET.loaded;
  SET = EB.settings(r); SET.loaded = true; RATE = SET.rate; DAY_END = SET.dayEnd; S.rate = RATE;
  MENU_ALL = EB.menu(r); BUSY = EB.busy(r);
  CHOICE = {}; MENU_ALL.forEach(function (m) { if (CHOICE_OF[m.sauces]) CHOICE[m.name] = CHOICE_OF[m.sauces] }); if (typeof drawBusy === 'function') drawBusy(); if (typeof drawPrn === 'function') drawPrn();
  // Sales and Expenses waited for the Settings (the PIN is there)
  if (first && $('#reportView').style.display === 'block') showReport();
  if (first && $('#expView').style.display === 'block') showExpenses();
  if (first && $('#incView').style.display === 'block') showIncome();
  if (first && $('#overView').style.display === 'block') showOverview();
  if (first && $('#siteView').style.display === 'block') showWebsite();
  if (first && $('#recView').style.display === 'block') showRecipes();
  if (first) gate();
  // sold-out items stay on the screen (greyed) so they can be brought back
  var next = MENU_ALL.filter(function (m) { return (m.on || m.soldOut) && m.price > 0 }), old = MENU;
  // keep what's already in the order, by item name, in case the menu changed
  var moved = {};
  Object.keys(cart).forEach(function (k) {
    if (CUSTOM[k]) return moved[k] = cart[k];
    var p = String(k).split('|'), it = old[+p[0]], i = -1;
    next.forEach(function (m, j) { if (it && m.name === it.name) i = j });
    if (i >= 0) moved[i + (p[1] ? '|' + p[1] : '')] = cart[k];
  });
  MENU = next; cart = moved;
  CATS = []; MENU.forEach(function (it) { if (CATS.indexOf(it.cat) < 0) CATS.push(it.cat) }); CATS.push(OPEN_SEC);
  renderGrid(); renderCart();
}
// The last 400 orders (enough for today and numbering), kept on the iPad too
var RECENT = null;
function loadRecent() { return EB.read('recent', {'Orders': 400, 'Order Items': 2500}).then(function (r) { RECENT = r; return r }) }
function knownOrders() { var r = RECENT || EB.cached('recent'); return EB.withPending(EB.orders(r, MENU_ALL, DAY_END), r && r.at) }
function nextNum(day) { var n = 0; knownOrders().forEach(function (o) { if (o.day === day && o.num > n) n = o.num }); return n + 1 }
/* The cart is {key: qty}; the key is the item's index in MENU, plus "|sauce+sauce" when sauces were chosen */
function lineOf(k) {
  if (CUSTOM[k]) return {i: -1, it: CUSTOM[k], sauces: CUSTOM[k].note ? ['✎ ' + CUSTOM[k].note] : []};
  var p = String(k).split('|'); return {i: +p[0], it: MENU[+p[0]], sauces: p[1] ? p[1].split('+') : []};
}
function qtyOf(i) { var q = 0; for (var k in cart) if (lineOf(k).i === i) q += cart[k]; return q }

function section(c) {
  if (c === OPEN_SEC) return '<div class="sec paired" style="' + catVars(c) + '"><h3 class="display">' + bi(CAT_AR[c], c) + '</h3><div class="rows">' + ['mar', 'oth'].map(function (k) {
    var q = 0; for (var key in CUSTOM) if (CUSTOM[key].kind === k && cart[key]) q += cart[key];
    return '<button class="tile' + (q ? ' has' : '') + '" data-open="' + k + '">' + (q ? '<span class="q">' + q + '</span>' : '') + '<b>' + bi(OPEN[k].ar, OPEN[k].name) + '</b><span class="pr">' + bi('اكتب السعر', 'Type the price') + '</span></button>';
  }).join('') + '</div></div>';
  var h = '<div class="sec' + (PAIRED.indexOf(c) >= 0 ? ' paired' : '') + '" style="' + catVars(c) + '"><h3 class="display">' + bi(CAT_AR[c] || c, c) + '</h3><div class="rows">';
  MENU.forEach(function (it, i) {
    if (it.cat !== c) return;
    var q = qtyOf(i);
    h += '<button class="tile' + (q ? ' has' : '') + (it.soldOut ? ' out' : '') + '" data-i="' + i + '">' + (q ? '<span class="q">' + q + '</span>' : '') +
      '<b>' + bi(trim(it.ar || it.name, c, 0), trim(it.name, c, 1)) + '</b>' +
      (it.soldOut ? '<span class="gone">' + bi('نفد', 'Sold out') + '</span>' : '<span class="pr num">' + (it.usd ? '$' + usdTxt(it.usd) : short(it.price)) + '</span>') + '</button>';
  });
  return h + '</div></div>';
}
function renderGrid() {
  var grid = $('#grid'), top = grid.scrollTop, w = grid.clientWidth - 20;
  lastW = grid.clientWidth;
  // Hidden (loading, user picker, another tab): no width to measure yet, so draw once it shows
  if (lastW <= 0) { grid.innerHTML = ''; return }
  var cols = LAYOUT.map(function (col) { return col.filter(function (c) { return CATS.indexOf(c) >= 0 }) });
  var count = function (col) { return col.reduce(function (a, c) { return a + MENU.filter(function (it) { return it.cat === c }).length }, 0) };
  CATS.forEach(function (c) {
    if (cols.some(function (col) { return col.indexOf(c) >= 0 })) return;
    cols.reduce(function (a, b) { return count(b) < count(a) ? b : a }).push(c);
  });
  if (w >= 4 * 165) {
    grid.innerHTML = '<div class="flow">' + cols.map(function (col) { return '<div>' + col.map(section).join('') + '</div>' }).join('') + '</div>';
  } else {
    // Narrow screen: the same order, split into as many balanced columns as fit
    var n = Math.max(1, Math.floor((w + 10) / 190));
    grid.innerHTML = '<div class="flow">' + new Array(n + 1).join('<div></div>') + '</div>';
    var holders = [].slice.call(grid.firstChild.children);
    holders[0].innerHTML = [].concat.apply([], cols).map(section).join('');
    var secs = [].slice.call(holders[0].children), hs = secs.map(function (el) { return el.offsetHeight + 8 });
    var cut = function (limit) { var out = [[]], sum = 0; hs.forEach(function (h, k) { if (sum + h > limit && out[out.length - 1].length) { out.push([]); sum = 0 } out[out.length - 1].push(secs[k]); sum += h }); return out };
    var lo = Math.max.apply(null, hs), hi = hs.reduce(function (a, b) { return a + b }, 0);
    while (lo < hi) { var mid = Math.floor((lo + hi) / 2); if (cut(mid).length <= n) hi = mid; else lo = mid + 1 }
    cut(lo).forEach(function (list, k) { list.forEach(function (el) { holders[k].appendChild(el) }) });
  }
  grid.scrollTop = top;
}
var lastW = 0;
function regrid() { var g = $('#grid'), w = g ? g.clientWidth : 0; if (MENU.length && w > 0 && w !== lastW) renderGrid() }
window.addEventListener('resize', regrid);
if (window.ResizeObserver) new ResizeObserver(regrid).observe($('#grid'));
$('#grid').addEventListener('click', function (e) {
  var b = e.target.closest('.tile'); if (!b) return;
  if (b.dataset.open) return askOpen(b.dataset.open);
  var i = +b.dataset.i, it = MENU[i];
  if (it.soldOut) return toast('نفد ' + esc(it.ar || it.name), it.name + ' is sold out');
  if (CHOICE[it.name]) return askSauces(i);
  add(String(i));
});
function add(key) { cart[key] = (cart[key] || 0) + 1; renderGrid(); renderCart() }

/* ---------- sauce picker ---------- */
var picking = null;  // {i, chosen: []}
function askSauces(i) {
  var rule = CHOICE[MENU[i].name];
  picking = {i: i, chosen: []};
  $('#shT').innerHTML = bi(MENU[i].ar || MENU[i].name, MENU[i].name);
  $('#shH').innerHTML = rule[2] === 1 ? bi('اختار صوص واحد', 'Choose 1 sauce') : rule[2] === 2 ? bi('اختار صوص أو تنين', 'Choose 1 or 2 sauces') : bi('اختار صوص أو أكتر', 'Choose one or more sauces');
  drawSauces();
  $('#sheet').hidden = false;
}
function drawSauces() {
  var rule = CHOICE[MENU[picking.i].name];
  $('#shC').innerHTML = SAUCES[rule[0]].map(function (s) {
    return '<button class="chip' + (picking.chosen.indexOf(s) >= 0 ? ' on' : '') + '" data-s="' + esc(s) + '">' + sauceList([s]) + '</button>';
  }).join('');
  $('#shOk').disabled = picking.chosen.length < rule[1];
}
$('#shC').addEventListener('click', function (e) {
  var b = e.target.closest('.chip'); if (!b) return;
  var s = b.dataset.s, max = CHOICE[MENU[picking.i].name][2], at = picking.chosen.indexOf(s);
  if (at >= 0) picking.chosen.splice(at, 1);
  else if (max === 1) picking.chosen = [s];
  else if (picking.chosen.length < max) picking.chosen.push(s);
  drawSauces();
});
$('#shX').addEventListener('click', function () { $('#sheet').hidden = true; picking = null });
$('#sheet').addEventListener('click', function (e) { if (e.target.id === 'sheet') { $('#sheet').hidden = true; picking = null } });
$('#shOk').addEventListener('click', function () {
  var list = SAUCES[CHOICE[MENU[picking.i].name][0]].filter(function (s) { return picking.chosen.indexOf(s) >= 0 });  // menu order, so equal choices share a line
  $('#sheet').hidden = true; add(picking.i + '|' + list.join('+')); picking = null;
});

/* ---------- other sales: marinated chicken and items not on the menu, priced by hand ---------- */
var OPEN_ON = null;   // {kind, cur}
function askOpen(kind) {
  OPEN_ON = {kind: kind, cur: OPEN_ON && OPEN_ON.cur || 'L.L.'};
  $('#opT').innerHTML = bi(OPEN[kind].ar, OPEN[kind].name);
  $('#opH').innerHTML = kind === 'mar' ? bi('دجاج نيّ متبّل للبيع: بينحسب بالمبيعات لحالو، مش مع أكل المحل.', 'Raw marinated chicken sold to take home: counted in the sales on its own, apart from the shop\'s food.')
    : bi('صنف أو تعديل مش عالمنيو: اكتب شو هو وسعرو.', 'An item or change that isn\'t on the menu: type what it is and its price.');
  $('#opName').value = ''; $('#opPrice').value = ''; $('#opErr').innerHTML = '';
  $('#opName').placeholder = kind === 'mar' ? T('شو هو؟ (اختياري، مثلاً: 2 كيلو طاووق)', 'What is it? (optional, e.g. 2 kg tawouk)') : T('شو الصنف؟ (مثلاً: خبز زيادة)', 'What is it? (e.g. extra bread)');
  $('#opPrice').placeholder = T('السعر', 'Price');
  drawOpenCur();
  $('#openSheet').hidden = false; setTimeout(function () { $(kind === 'mar' ? '#opPrice' : '#opName').focus() }, 50);
}
function drawOpenCur() { $('#opCur').querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', b.dataset.cur === OPEN_ON.cur) }) }
$('#opCur').addEventListener('click', function (e) { var b = e.target.closest('[data-cur]'); if (b) { OPEN_ON.cur = b.dataset.cur; drawOpenCur() } });
$('#opX').addEventListener('click', function () { $('#openSheet').hidden = true; OPEN_ON = null });
$('#openSheet').addEventListener('click', function (e) { if (e.target.id === 'openSheet') { $('#openSheet').hidden = true; OPEN_ON = null } });
$('#opOk').addEventListener('click', function () {
  var k = OPEN_ON.kind, name = $('#opName').value.replace(/[|+,]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 40), n = Number($('#opPrice').value) || 0;
  var price = OPEN_ON.cur === '$' ? Math.round(n * RATE) : Math.round(n);
  if (k === 'oth' && !name) return $('#opErr').innerHTML = bi('اكتب شو الصنف', 'Type what it is');
  if (!(price > 0)) return $('#opErr').innerHTML = bi('اكتب السعر', 'Type the price');
  var key = 'c' + (++customN);
  CUSTOM[key] = k === 'mar' ? {name: OPEN.mar.name, ar: OPEN.mar.ar, cat: OPEN.mar.cat, price: price, usd: OPEN_ON.cur === '$' ? n : 0, note: name, kind: k}
    : {name: name, ar: name, cat: OPEN.oth.cat, price: price, usd: OPEN_ON.cur === '$' ? n : 0, note: '', kind: k};
  $('#openSheet').hidden = true; OPEN_ON = null;
  add(key);
});

/* ---------- ticket ---------- */
// items priced in dollars (the family meals) show their $ price: $25, $7.5
function usdTxt(v) { return String(Math.round(v * 100) / 100) }
function total() { var t = 0; for (var k in cart) t += cart[k] * lineOf(k).it.price; return t }
function renderCart() {
  var keys = Object.keys(cart);
  $('#lines').innerHTML = keys.length ? keys.map(function (k) {
    var l = lineOf(k), it = l.it;
    return '<div class="line" style="' + catVars(it.cat) + '"><i></i><span class="n">' + bi(it.ar || it.name, it.name) +
      (l.sauces.length ? '<small class="sauces">' + sauceList(l.sauces) + '</small>' : '') +
      (/drink|sauce|extra/i.test(it.cat) || CUSTOM[k] ? '' : '<a class="adjb" role="button" tabindex="0" data-adj="' + esc(k) + '">✎ ' + bi('تعديل', 'Change') + '</a>') + '</span><span class="lt num">' + (it.usd ? '$' + usdTxt(cart[k] * it.usd) : fmt(cart[k] * it.price)) + '</span>' +
      '<div class="stepper"><button data-d="1" data-k="' + esc(k) + '" aria-label="+1">+</button><span class="num">' + cart[k] + '</span><button data-d="-1" data-k="' + esc(k) + '" aria-label="-1">−</button>' +
      '<small>' + bi('الواحد', 'each') + ' <span class="num">' + (it.usd ? '$' + usdTxt(it.usd) : fmt(it.price)) + '</span></small></div></div>';
  }).join('') : '<div class="empty">' + bi('دق على الأصناف لتنضاف عالطلب.', 'Tap items to add them.') + '</div>';
  var t = total();
  $('#tot').textContent = money(t); $('#totUsd').textContent = usd(t / RATE); drawFee();
  if (typeof drawLowBar === 'function') drawLowBar();
  updateSave();
}
$('#lines').addEventListener('click', function (e) {
  var a = e.target.closest('[data-adj]'); if (a) return askAdjust(a.dataset.adj);
  var b = e.target.closest('button[data-d]'); if (!b) return;
  var k = b.dataset.k; cart[k] += +b.dataset.d; if (cart[k] <= 0) delete cart[k];
  renderGrid(); renderCart();
});
$('#clear').addEventListener('click', function () { if (!Object.keys(cart).length || confirm(T('تمسح هالطلب؟', 'Clear this order?'))) resetOrder() });
function resetOrder() { cart = {}; CUSTOM = {}; fee = 0; method = ''; $('#note').value = ''; $('#cname').value = ''; setKind(''); setMethod(''); renderGrid(); renderCart() }
// Pickup or Delivery is optional: tap the chosen one again to clear it
var kind = '';
function setKind(k) { kind = k; document.querySelectorAll('.kind button').forEach(function (b) { b.classList.toggle('on', b.dataset.k === k) }); drawFee() }
/* Delivery fee: for the driver. Printed for the customer to pay with the order, never in the order total, the sales,
   the cash box or the owners' share. */
var fee = 0, FEES = [0, 100000, 150000, 200000];
function drawFee() {
  var d = $('#dfee'); if (!d) return;
  d.hidden = kind !== 'Delivery';
  if (d.hidden) return;
  var other = fee && FEES.indexOf(fee) < 0;
  d.innerHTML = '<div class="dfh"><b>🛵 ' + bi('رسوم التوصيل', 'Delivery fee') + '</b><small>' + bi('للسائق · مش من المبيعات', 'For the driver · not a sale') + '</small></div>' +
    '<div class="dch">' + FEES.map(function (v) { return '<button type="button" data-fee="' + v + '"' + (fee === v ? ' class="on"' : '') + '>' + (v ? short(v) : bi('بلا', 'None')) + '</button>' }).join('') +
    '<button type="button" data-fee="other"' + (other ? ' class="on"' : '') + '>' + (other ? short(fee) : bi('غير…', 'Other…')) + '</button></div>' +
    (fee ? '<div class="dcol"><span>' + bi('عالزبون يدفع', 'Customer pays') + '</span><b class="num">' + money(total() + fee) + '</b></div>' : '');
}
$('#dfee').addEventListener('click', function (e) {
  var b = e.target.closest('[data-fee]'); if (!b) return;
  if (b.dataset.fee === 'other') {
    var a = prompt(T('قدّيش رسوم التوصيل؟ (بالليرة، أو بالدولار)', 'How much is the delivery fee? (L.L., or $)'), fee || '');
    if (a == null) return;
    var n = Number(String(a).replace(/[^0-9.]/g, '')); fee = Math.round(n > 1000 ? n : n * RATE);
  } else fee = Number(b.dataset.fee);
  drawFee();
});
document.querySelectorAll('.kind button').forEach(function (b) { b.addEventListener('click', function () { setKind(kind === b.dataset.k ? '' : b.dataset.k) }) });

// How they paid is chosen in Today's orders, when the order is picked up or delivered; a new order starts "not paid yet"
function setMethod(m) { method = m || 'Unpaid'; updateSave() }
function updateSave() {
  var t = total();
  $('#save').disabled = !t;
  $('#save').innerHTML = EDIT ? bi('احفظ التعديل على #' + EDIT.num, 'Save changes to #' + EDIT.num) : bi('احفظ الطلب', 'Save order');
  $('#editbar').hidden = !EDIT;
  if (EDIT) $('#editNum').textContent = '#' + EDIT.num;
}

/* ---------- changing a saved order: it opens here, on the order screen ---------- */
var EDIT = null;  // {day, num} while a saved order is open for changes
function editOrder(o) {
  cart = {}; CUSTOM = {}; var gone = [];
  o.items.forEach(function (x) {
    var i = -1; MENU.forEach(function (it, k) { if (it.name === x.name) i = k });
    if (i < 0 && OPEN_CAT[x.cat]) {
      var ck = 'c' + (++customN), note = (x.sauces.filter(function (t) { return /^✎ /.test(t) })[0] || '').slice(2);
      CUSTOM[ck] = {name: x.name, ar: x.cat === 'Other' ? x.name : OPEN.mar.ar, cat: x.cat, price: x.price, note: note, kind: OPEN_CAT[x.cat]};
      return cart[ck] = x.qty;
    }
    if (i < 0) return gone.push(x.name);
    var key = String(i) + (x.sauces.length ? '|' + x.sauces.join('+') : '');
    cart[key] = (cart[key] || 0) + x.qty;
  });
  EDIT = {day: o.day, num: o.num, order: o}; fee = o.fee || 0;
  $('#note').value = o.note || ''; $('#cname').value = o.name || ''; setKind(o.type || ''); setMethod(o.payment);
  showView('order'); renderGrid(); renderCart();
  if (gone.length) alert(T('هالأصناف مش عالمنيو هلّق، رح تنشال إذا حفظت: ', 'These items are no longer on the menu and will be removed if you save: ') + gone.join(', '));
}
$('#editCancel').addEventListener('click', function () { EDIT = null; resetOrder(); showView('orders') });

/* ---------- saving: the order goes into the outbox and reaches the sheet as soon as it can ---------- */
function showNet() {
  var n = EB.pending().length;
  $('#net').innerHTML = n ? bi(n + ' ناطر ينبعت', n + (n > 1 ? ' changes' : ' change') + ' waiting to send') : '';
}
function cartItems() {
  return Object.keys(cart).map(function (k) {
    var l = lineOf(k);
    return {name: l.it.name, ar: l.it.ar, cat: l.it.cat, station: l.it.station || '', qty: cart[k], price: l.it.price, sauces: l.sauces};
  });
}
$('#save').addEventListener('click', function () {
  var items = cartItems(), t = total(), o;
  if (EDIT) {
    o = JSON.parse(JSON.stringify(EDIT.order));
    // the kitchen keeps what it already had: each line's sent quantity carries over, anything more waits to be sent
    var had = {};
    (EDIT.order.items || []).forEach(function (x) { var k = x.name + '|' + x.sauces.join('+'); had[k] = (had[k] || 0) + (x.sentQty == null ? x.qty : x.sentQty) });
    items.forEach(function (x) { var k = x.name + '|' + x.sauces.join('+'), n = Math.min(x.qty, had[k] || 0); x.sentQty = n; had[k] = (had[k] || 0) - n });
    o.items = items; o.text = EB.text(items); o.total = t; o.payment = method;
    o.note = $('#note').value.trim(); o.name = $('#cname').value.trim(); o.type = kind; o.fee = kind === 'Delivery' ? fee : 0;
    if (!o.rate) o.rate = RATE;
    EB.update(o);
    toast('انحفظ التعديل على الطلب #' + o.num, 'Order #' + o.num + ' updated');
    EDIT = null; resetOrder(); showView('orders');
    return;
  }
  var now = EB.now(), day = EB.bizDay(DAY_END, now), time = EB.hhmm(now), n = nextNum(day);
  o = {key: day + '#' + n, num: n, day: day, time: time, at: EB.at(day, time, DAY_END), uid: now.toString(36) + Math.random().toString(36).slice(2, 7),
    items: items.map(function (x) { x.sentQty = 0; return x }), text: EB.text(items), total: t, payment: method, paidUsd: 0, rate: RATE, received: method === 'Unpaid' ? 0 : t,
    note: $('#note').value.trim(), name: $('#cname').value.trim(), type: kind, done: '', sent: '-', fee: kind === 'Delivery' ? fee : 0};
  EB.save(o);   // it waits in Today's orders until "Send to kitchen" (which prints the two tickets)
  resetOrder();
  toast('انحفظ الطلب رقم <span class="num">' + n + '</span> · <span class="num">' + money(t) + '</span>', 'Order #' + n + ' saved');
});

