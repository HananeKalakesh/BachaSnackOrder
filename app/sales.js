/* ---------- sales: month calendar, year strip, month and day details; amounts in $ with L.L. under them ---------- */
var MONTHS_AR = ['كانون الثاني', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران', 'تموز', 'آب', 'أيلول', 'تشرين الأول', 'تشرين الثاني', 'كانون الأول'];
var MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
var WEEK_AR = ['الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت', 'الأحد'], WEEK_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
// y, m (0-11): the month shown; sel: the day opened below the calendar; years / months / days: report data by period
var S = {mode: 'month', y: 0, m: 0, sel: '', rate: 89500, years: {}, months: {}, days: {}, all: {}, busy: {}, locked: false, err: '', hour: -1};

function pad(n) { return ('0' + n).slice(-2) }
// "14:05" → 2:05 PM (2:05 م in Arabic); the sheet keeps 24-hour times
function t12(t) {
  var m = /^(\d{1,2}):(\d{2})/.exec(String(t || '')); if (!m) return esc(t || '');
  return ampm(+m[1], ':' + m[2]);
}
// an hour on its own: 2 PM (2 م); the Arabic reads right to left, so م sits on the left of the time
function h12(h) { return ampm(h, '') }
function ampm(h, mm) { h = h % 24; var t = (h % 12 || 12) + mm; return '<span class="ar" dir="rtl">' + t + ' ' + (h < 12 ? 'ص' : 'م') + '</span><span class="en">' + t + ' ' + (h < 12 ? 'AM' : 'PM') + '</span>' }
function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) }
function monthKey(y, m) { return y + '-' + pad(m + 1) }
function daysIn(y, m) { return new Date(y, m + 1, 0).getDate() }
function usdOf(lbp) { return lbp / S.rate }
function $usd(lbp) { if (lbp < 0) return '−' + $usd(-lbp); var v = usdOf(lbp); return '$' + (v > 0 && v < 100 ? v.toFixed(2) : fmt(v)) }
function ll(lbp) { return fmt(lbp) + ' L.L.' }
function llShort(lbp) { return lbp >= 1e6 ? (Math.round(lbp / 1e5) / 10) + 'M' : fmt(lbp / 1000) + 'K' }
function amount(lbp) { return '<b class="usd num">' + $usd(lbp) + '</b><small class="ll num">' + ll(lbp) + '</small>' }
function dayName(d) { var w = (new Date(d + 'T12:00').getDay() + 6) % 7, k = +d.slice(8), m = +d.slice(5, 7) - 1; return bi(WEEK_AR[w] + ' ' + k + ' ' + MONTHS_AR[m], WEEK_EN[w] + ' ' + k + ' ' + MONTHS_EN[m]) }

function pin() { try { return sessionStorage.getItem(PKEY) || '' } catch (e) { return '' } }
function setPin(p) { try { sessionStorage.setItem(PKEY, p) } catch (e) {} }
function pinScreen(msg, where, after, title) {
  where = where || '#rep'; after = after || showReport;
  $(where).innerHTML = '<div class="pin"><h2 class="display" style="color:var(--green);font-size:34px;margin:0">' + (title || bi('المبيعات', 'Sales')) + '</h2><p class="muted">' + bi('اكتب الرمز', 'Enter the PIN') + '</p>' +
    '<input id="pinIn" type="password" inputmode="numeric" autocomplete="off"><div class="err">' + msg + '</div><button id="pinGo">' + bi('افتح', 'Open') + '</button></div>';
  var go = function () { setPin($('#pinIn').value); after() };
  $('#pinGo').onclick = go; $('#pinIn').onkeydown = function (e) { if (e.key === 'Enter') go() }; autoOpen($('#pinIn'), go); $('#pinIn').focus();
}

// No internet: Sales shows what this iPad loaded last time
function salesNote() {
  if (S.err === 'OFFLINE') {
    var c = EB.cached('sales'), when = EB.ymd(new Date(c.at)) + ' ' + t12(EB.hhmm(c.at));
    return '<p class="offline">' + bi('ما في إنترنت: هيدي الأرقام من ' + when, 'No internet: these numbers are from ' + when) + '</p>';
  }
  if (S.err === 'OFFLINE_EMPTY') return '<p class="offline">' + bi('ما في إنترنت، والمبيعات بدها إنترنت أول مرة.', 'No internet: Sales needs the internet the first time.') + '</p>';
  if (S.err) return '<p class="err">' + bi('ما قدرنا نحمّل المبيعات', 'Could not load the report') + ' · <small>' + esc(S.err) + '</small></p>';
  return '';
}
/* Every order, loaded when the Sales tab opens; each period's totals are worked out here from them */
var SALES = null;
function salesOrders() { var r = SALES || EB.cached('sales'); return EB.withPending(EB.orders(r, MENU_ALL, DAY_END), r && r.at) }
function fetchR(kind, key, from, to) {
  if (S[kind][key] || !(SALES || EB.cached('sales'))) return;
  S[kind][key] = EB.report(salesOrders(), from, to);
}
function showReport() {
  if (!SET.loaded) { $('#rep').innerHTML = '<p class="muted">' + bi('عم يحمّل…', 'Loading…') + '</p>'; return }
  S.years = {}; S.months = {}; S.days = {}; S.all = {}; S.err = ''; S.locked = false; S.rate = RATE;
  if (SET.pin && pin() !== SET.pin && !(/^\d+$/.test(pin()) && Number(pin()) === Number(SET.pin))) {
    S.locked = true; var had = pin(); setPin('');
    return pinScreen(had ? bi('الرمز غلط', 'Wrong PIN') : '');
  }
  if (!S.y || !S.sel) { var t = bizDate(); S.y = t.getFullYear(); S.m = t.getMonth(); S.sel = ymd(t) }
  drawSales();
  EB.read('sandouk', {'Sandouk': 0}).then(function (r) { BX.data = r; drawSales() }, function (e) { if (/Unknown tab/.test(e.message)) { BX.data = {Sandouk: null, at: 0}; drawSales() } });
  EB.read('purchases', {'Purchases': 0}).then(function (r) { EX.data = r; drawSales() }, function () {});
  if (!IN.data) EB.read('income', {'Income': 0}).then(function (r) { IN.data = r; drawSales() }, function () {});
  EB.read('sales', {'Orders': 0, 'Order Items': 0}).then(function (r) {
    SALES = r; S.years = {}; S.months = {}; S.days = {}; S.all = {}; S.err = ''; drawSales();
  }, function (e) {
    S.err = e.offline ? (EB.cached('sales') ? 'OFFLINE' : 'OFFLINE_EMPTY') : (e.message || String(e)); drawSales();
  });
}

// One day's numbers, sales by hour and every order (a day picked in the calendar, or the Today view)
function dayBody(D) {
  var h = '', k;
  // hours are counted from the start of the business day, so 00:00 and 01:00 come after 23:00
  var hours = {}, lo = 24, hi = -1, clock = function (k) { return (k + DAY_END) % 24 };
  D.orders.forEach(function (o) { var hr = +String(o.time).slice(0, 2); if (isNaN(hr)) return; hr = (hr + 24 - DAY_END) % 24; hours[hr] = hours[hr] || {sales: 0, orders: 0}; hours[hr].sales += o.total; hours[hr].orders++; lo = Math.min(lo, hr); hi = Math.max(hi, hr) });
  var maxH = 0; for (k = lo; k <= hi; k++) if (hours[k] && hours[k].sales > maxH) maxH = hours[k].sales;
  var pick = S.hour >= lo && S.hour <= hi ? S.hour : -1;
  if (hi >= lo) {
    h += '<h4>' + bi('المبيعات حسب الساعة', 'Sales by hour') + '</h4><div class="readout">' + (pick >= 0 && hours[pick] ?
      '<b class="num">' + h12(clock(pick)) + ' – ' + h12(clock(pick + 1)) + '</b> · <b class="num">' + $usd(hours[pick].sales) + '</b> <small class="num">' + ll(hours[pick].sales) + '</small> · ' + fmt(hours[pick].orders) + ' ' + bi('طلب', 'orders')
      : '<span class="muted">' + bi('دق على ساعة لتشوف رقمها', 'Tap an hour to see its numbers') + '</span>') + '</div><div class="hours">';
    for (k = lo; k <= hi; k++) {
      var v = hours[k] ? hours[k].sales : 0;
      h += '<button class="hr' + (k === pick ? ' on' : '') + '" data-h="' + k + '"><span class="track">' + (v === maxH && v ? '<em class="num">' + $usd(v) + '</em>' : '') + '<i style="height:' + (v ? Math.max(3, v / maxH * 100) : 0) + '%"></i></span><span class="num">' + h12(clock(k)) + '</span></button>';
    }
    h += '</div>';
  }
  h += '<h4>' + bi('الطلبات', 'Orders') + '</h4><table><tr><th>#</th><th>' + bi('الأصناف', 'Items') + '</th><th class="r">' + bi('المجموع', 'Total') + '</th><th></th></tr>' +
    D.orders.map(function (o) {
      return '<tr><td><b class="num">' + o.num + '</b><div class="muted num">' + t12(o.time) + '</div></td><td>' + bi(itemsAr(o.items), o.items) + '<div><span class="pill ' + o.payment + '">' + bi(PAY_AR[o.payment] || o.payment, o.payment) + '</span>' +
        (o.paidLater ? ' <small class="muted">' + bi('انْدفع ', 'paid on ') + dayName(o.paidLater) + '</small>' : '') + '</div></td>' +
        '<td class="r">' + amount(o.total) + '</td><td><button class="del" data-d="' + o.date + '" data-n="' + o.num + '">' + bi('امسح', 'Delete') + '</button></td></tr>';
    }).join('') + '</table>';
  return h;
}

// Orders from earlier days paid in this period: their money counts here, on the day it was paid
function laterBody(D) {
  if (!D.later || !D.later.length) return '';
  return '<h4>' + bi('دين انْدفع (طلبات من أيام قبل)', 'Paid for earlier orders') + '</h4><table>' + D.later.map(function (o) {
    return '<tr><td><b class="num">' + o.num + '</b><div class="muted">' + dayName(o.date) + '</div></td><td>' + bi(itemsAr(o.items), o.items) +
      '<div><span class="pill ' + o.payment + '">' + bi(PAY_AR[o.payment] || o.payment, o.payment) + '</span> <small class="muted">' + bi('انْدفع ', 'paid on ') + dayName(o.paidLater) + '</small></div></td>' +
      '<td class="r">' + amount(o.total) + '</td></tr>';
  }).join('') + '</table>';
}

// The views, side by side at the top of the tab
function modeSwitch() {
  return '';   // the Sales tab is the calendar only: all time lives in the Dashboard tab
  return '<div class="modes"><button data-mode="month"' + (S.mode === 'month' ? ' class="on"' : '') + '>' + bi('التقويم', 'Calendar') + '</button>' +
    '<button data-mode="all"' + (S.mode === 'all' ? ' class="on"' : '') + '>' + bi('الملخّص', 'Dashboard') + '</button></div>';
}
// Cash vs Whish and the 4 best sellers, for whatever period R covers
// Cash, Whish and not paid, and the best sellers (4, or every item for a single day), for whatever period R covers
function sideCards(R, none, every) {
  var wait = '<p class="muted">' + bi('عم يحمّل…', 'Loading…') + '</p>';
  var side = '<div class="card"><div class="chead"><h3 class="display">' + bi('الدفع', 'Payments') + '</h3>' +
    (R && R.summary.sales ? '<span class="tot">' + bi('المجموع ', 'Total ') + '<b class="num">' + $usd(R.summary.cashLbp + R.summary.whishLbp) + '</b> <small class="muted num">' + ll(R.summary.cashLbp + R.summary.whishLbp) + '</small></span>' : '') + '</div>';
  if (R && (R.summary.orders || R.summary.sales)) {
    var s = R.summary, owed = s.unpaidLbp || 0, all = (s.cashLbp + s.whishLbp + owed) || 1;
    var part = function (cls, ar, en, lbp, n) {
      return '<div><span class="dot ' + cls + '"></span>' + bi(ar, en) + ' <small class="muted num">' + Math.round(lbp / all * 100) + '%</small>' + amount(lbp) + '<small class="ll">' + fmt(n) + ' ' + bi('طلب', 'orders') + '</small></div>';
    };
    side += '<div class="split"><i class="cash" style="width:' + (s.cashLbp / all * 100) + '%"></i><i class="whish" style="width:' + (s.whishLbp / all * 100) + '%"></i>' +
      (owed ? '<i class="unpaid" style="width:' + (owed / all * 100) + '%"></i>' : '') + '</div>' +
      '<div class="pay2' + (owed ? ' three' : '') + '">' + part('cash', 'كاش', 'Cash', s.cashLbp, s.cashOrders) + part('whish', 'ويش', 'Whish', s.whishLbp, s.whishOrders) +
      (owed ? part('unpaid', 'ما دفع', 'Not paid', owed, s.unpaidOrders) : '') + '</div>' +
      (s.discLbp ? '<p class="muted note2">🏷️ ' + bi('خصومات: ', 'Discounts: ') + '<b class="num">' + $usd(s.discLbp) + '</b> <span class="num">' + ll(s.discLbp) + '</span> · ' + fmt(s.discOrders) + ' ' + bi('طلب', s.discOrders === 1 ? 'order' : 'orders') + ' ' + bi('(مش محسوبة بالمبيعات)', '(not in the sales)') + '</p>' : '');
  } else side += R ? '<p class="muted">' + none + '</p>' : wait;
  side += '</div><div class="card"><h3 class="display">' + (every ? bi('الأكل المباع', 'Food sold') : bi('الأكتر مبيعاً', 'Best sellers')) + '</h3>';
  var food = R ? R.items.filter(function (x) { return !isSide(x.name) && !OPEN_CAT[x.cat] }) : [];
  side += R ? (food.length ? sellerBars(every ? food : food.slice(0, 4)) : '<p class="muted">–</p>') + sidesLine(R.items) : wait;
  return side + '</div>';
}
// Drinks and sauces are sides: the best sellers show the food, the sides only as one line under it
function isSide(name) {
  for (var i = 0; i < MENU_ALL.length; i++) if (MENU_ALL[i].name === name) return /drink|sauce|extra/i.test(MENU_ALL[i].cat);
  return false;
}
function sellerBars(list) {
  var maxQ = list[0].qty;
  return list.map(function (x) {
    return '<div class="seller"><div class="tn">' + bi(arName(x.name), x.name) + '<span class="tq num">' + fmt(x.qty) + '</span></div>' +
      '<div class="tb"><i style="width:' + Math.max(3, x.qty / maxQ * 100) + '%"></i></div><small class="ll num">' + $usd(x.sales) + ' · ' + ll(x.sales) + '</small></div>';
  }).join('');
}
function sidesLine(items) {
  var q = 0, v = 0, mq = 0, mv = 0, oq = 0, ov = 0;
  items.forEach(function (x) {
    if (x.cat === 'Marinated Chicken') { mq += x.qty; mv += x.sales } else if (x.cat === 'Other') { oq += x.qty; ov += x.sales }
    else if (isSide(x.name)) { q += x.qty; v += x.sales }
  });
  var extra = (mq ? '<p class="muted note2">🍗 ' + bi('دجاج متبّل (بيع نيّ): ', 'Marinated chicken (raw, sold): ') + '<b class="num">' + fmt(mq) + '</b> · <span class="num">' + $usd(mv) + '</span></p>' : '') +
    (oq ? '<p class="muted note2">✏️ ' + bi('غير (مش عالمنيو): ', 'Other (not on the menu): ') + '<b class="num">' + fmt(oq) + '</b> · <span class="num">' + $usd(ov) + '</span></p>' : '');
  return extra + (q ? '<p class="muted note2">' + bi('مشروبات وصوصات (مش محسوبين فوق): ', 'Drinks and sauces (not counted above): ') + '<b class="num">' + fmt(q) + '</b> · <span class="num">' + $usd(v) + '</span></p>' : '');
}

// A whole day: headline numbers, sales by hour and every order, payments and every item sold
// a day's money besides the orders: the cash box count, the owners' share and every expense
function dayMoney(day) {
  if (!day) return '';
  var bx = (boxes() || []).filter(function (x) { return x.day === day })[0], buys = (purchases() || []).filter(function (p) { return p.day === day });
  var own = buys.filter(function (p) { return p.cat === 'Owners' }).reduce(function (a, p) { return a + p.lbp }, 0);   // the day's expenses are in the Expenses tab
  var h = '<div class="daymoney"><div class="card"><h3 class="display">📦 ' + bi('الصندوق', 'Cash box') + '</h3>' + (bx ?
    '<div class="pay2 three"><div>' + bi('كاش', 'Cash') + amount(bx.cashLbp + bx.cashUsd * S.rate) + '</div><div>' + bi('ويش', 'Whish') + amount(bx.whish + (bx.whishUsd || 0) * S.rate) + '</div><div>' + bi('للمطعم', 'To the resto') + amount(bx.left) + '</div></div>' + (typeof boxDiff === 'function' && boxDiff(bx) ? '<p class="note2">' + diffLine(boxDiff(bx)) + '</p>' : '')
    : '<p class="muted">' + bi('ما انعدّ الصندوق بهاليوم.', 'The cash box was not counted this day.') + '</p>') +
    '<p class="note2">💰 ' + bi('ربح الأصحاب: ', 'Owners\' share: ') + '<b class="num">' + $usd(own) + '</b> <small class="muted num">' + ll(own) + '</small></p></div>' + '</div>';
  return h;
}
function dayView(D, empty, day) {
  var s = D.summary;
  var h = '<div class="kpis three">' +
    '<div class="kpi hero"><small>' + bi('المبيعات', 'Sales') + '</small>' + amount(s.sales) +
      (s.laterLbp ? '<small class="ll">' + bi('منها ', 'incl. ') + '<span class="num">' + $usd(s.laterLbp) + '</span> ' + bi('دين انْدفع', 'paid for earlier orders') + '</small>' : '') +
      (s.marinatedLbp ? '<small class="ll">🍗 ' + bi('منها دجاج متبّل ', 'incl. marinated chicken ') + '<span class="num">' + $usd(s.marinatedLbp) + '</span></small>' : '') + '</div>' +
    '<div class="kpi"><small>' + bi('الطلبات', 'Orders') + '</small><b class="usd num">' + fmt(s.orders) + '</b>' +
      (s.orders ? '<small class="ll">' + bi('معدّل الطلب', 'Average order') + ' <span class="num">' + $usd(s.ordered / s.orders) + '</span></small>' : '') + '</div>' +
    '<div class="kpi"><small>' + bi('الأصناف', 'Items') + '</small><b class="usd num">' + fmt(s.items) + '</b></div></div>';   // cash, Whish and not paid: in Payments
  return h + '<div class="cols"><div class="card dayc">' + (s.orders ? dayBody(D) : '<p class="muted">' + empty + '</p>') + laterBody(D) + '</div>' +
    '<div>' + dayMoney(day) + sideCards(D, empty, true) + '</div></div>';   // the cash box beside payments and food sold
}

/* Today: today's numbers, sales by hour, cash and Whish, best sellers and every order */
function drawToday() {
  var today = ymd(bizDate());
  fetchR('days', today, today, today);
  if (S.locked) return;
  var D = S.days[today];
  var h = '<div class="shead">' + modeSwitch() + '<h2 class="display">' + bi('اليوم', 'Today') + '</h2><span class="since">' + dayName(today) + '</span></div>';
  h += salesNote();
  if (!D) { $('#rep').innerHTML = h + '<p class="muted">' + bi('عم يحمّل…', 'Loading…') + '</p>'; return }
  $('#rep').innerHTML = h + dayView(D, bi('لسا ما في طلبات اليوم', 'No orders yet today'), today);
}

/* All time: the same numbers for every order so far, by month and by day of the week */
// Dashboard, top: the money with the chef, then cash box, income and expenses, then the profit in one box (owners + business)
function dashMoney(sales, today) {
  // a device that still has yesterday's sandouk.js (GitHub keeps files up to 10 minutes) must still open the dashboard
  var bxs = typeof boxes === 'function' ? boxes() : null, buys = purchases(), wait = '<b class="usd">…</b>', bal = typeof chefBalance === 'function' ? chefBalance() : null, drw = typeof drawerToday === 'function' ? drawerToday() : null;
  var counted = bxs ? bxs.reduce(function (a, x) { return a + x.total }, 0) : 0, t = buys ? tally(buys) : null, other = incomeIn('2000-01-01', today);
  var h = '<div class="kpis four">' +
    '<div class="kpi hero" data-goview="box"><small>🏪 ' + bi('مع المطعم هلّق', 'With the resto now') + '</small>' + (bal == null || !drw ? wait : amount(bal + (drw.counted ? 0 : drw.sales))) + '<small class="ll">' + (bal == null || !drw || drw.counted ? bi('لآخر عدّ', 'up to the last count') : bi('لآخر عدّ ', 'last count ') + $usd(bal) + ' + ' + bi('اليوم ', 'today ') + $usd(drw.sales)) + '</small></div>' +
    '<div class="kpi own"><small>💰 ' + bi('أخدو الأصحاب', 'Taken by the owners') + '</small>' + (t ? amount(t.owners) : wait) + '<small class="ll">' + (bxs ? bi(OWNERS_PCT + '٪ من ' + fmt(bxs.length) + ' صندوق معدود', OWNERS_PCT + '% of ' + fmt(bxs.length) + ' counted cash boxes') : '') + '</small></div>' +
    '<div class="kpi"><small>📈 ' + bi('الدخل', 'Income') + '</small>' + amount(sales + other) + (other ? '<small class="ll">' + bi('منها دخل تاني ', 'incl. other income ') + '<span class="num">' + $usd(other) + '</span></small>' : '') + '</div>' +
    '<div class="kpi owedk" data-goview="exp"><small>📉 ' + bi('المصاريف', 'Expenses') + '</small>' + (t ? amount(t.spent) : wait) + (t && t.invest ? '<small class="ll">' + bi('ومعدّات ', '+ equipment ') + '<span class="num">' + $usd(t.invest) + '</span></small>' : '') + '</div></div>';
  // no profit card: the money with the resto is the real number (owner, 24 Oct); discounts given, as a note
  var disc = (SALES || EB.cached('sales')) ? EB.report(salesOrders(), '2000-01-01', today).summary.discLbp : 0;
  if (disc) h += '<p class="muted note2">🏷️ ' + bi('خصومات من الأول ', 'Discounts since the start ') + '<b class="num">' + $usd(disc) + '</b> ' + bi('(مش محسوبة بالمبيعات)', '(not in the sales)') + '</p>';
  return h + '<div class="morelinks"><button data-goview="owed">' + bi('ما دفعو', 'Not paid') + '</button><button data-goview="inc">' + bi('دخل تاني ورأس مال', 'Other income & capital') + '</button></div>';
}
/* Dashboard: the profit in one compact card — what the owners took and the resto's part side by side with their %,
   then one line that links the resto's profit to the money it has now, so the two numbers never look like they clash */
function profitBox(sales, t, other, now, today) {
  var profit = sales + other - t.spent, own = t.owners, rest = profit - own, pw = profit > 0 ? Math.max(0, Math.min(100, Math.round(own / profit * 100))) : 0;
  var put = (incomes() || []).filter(function (x) { return !incCat(x.src)[2] }).reduce(function (a, x) { return a + x.lbp }, 0);   // capital + starting money
  var disc = (SALES || EB.cached('sales')) ? EB.report(salesOrders(), '2000-01-01', today).summary.discLbp : 0;
  var part = function (cls, icon, ar, en, v, pct) { return '<div class="pbpart ' + cls + '"><small>' + icon + ' ' + bi(ar, en) + '</small><b class="num">' + $usd(v) + '</b><span class="pct num">' + pct + '%</span><small class="ll num">' + ll(v) + '</small></div>' };
  var h = '<div class="card pbox2"><div class="pbrow"><div class="pbmain"><small>📈 ' + bi('الربح من الأول', 'Profit since the start') + '</small><b class="num">' + $usd(profit) + '</b>' +
      '<small class="ll">' + bi(other ? 'المبيعات والدخل التاني ناقص المصاريف' : 'المبيعات ناقص المصاريف', other ? 'Sales and other income minus expenses' : 'Sales minus expenses') + '</small></div>' +
    part('own', '💰', 'أخدو الأصحاب', 'Taken by the owners', own, pw) + part('keep', '🏪', 'ربح المطعم', 'The resto\'s profit', rest, 100 - pw) + '</div>' +
    '<div class="split"><i class="cash" style="width:' + (100 - pw) + '%"></i><i class="own" style="width:' + pw + '%"></i></div>';
  if (now != null) {
    var gap = now - (rest + put - t.invest);
    h += '<p class="pbeq">🏪 ' + bi('مع المطعم هلّق ', 'With the resto now ') + '<b class="num">' + $usd(now) + '</b> = ' + bi('ربح المطعم ', 'its profit ') + '<b class="num">' + $usd(rest) + '</b>' +
      (put ? ' + ' + bi('رأس المال ومصاري البداية ', 'capital & starting money ') + '<b class="num">' + $usd(put) + '</b>' : '') +
      (t.invest ? ' − ' + bi('المعدّات ', 'equipment ') + '<b class="num">' + $usd(t.invest) + '</b>' : '') +
      (Math.abs(gap) >= RATE ? (gap > 0 ? ' + ' : ' − ') + bi('فرق الصناديق المعدودة ', 'cash box differences ') + '<b class="num">' + $usd(Math.abs(gap)) + '</b>' : '') + '</p>';
  }
  if (disc) h += '<p class="pbeq muted">🏷️ ' + bi('خصومات من الأول ', 'Discounts since the start ') + '<b class="num">' + $usd(disc) + '</b> ' + bi('(مش محسوبة بالمبيعات)', '(not in the sales)') + '</p>';
  return h + '</div>';
}
// Dashboard, sales part: totals, average by weekday and by hour, payments and best sellers, for every order so far
function salesAll(A) {
  var today = ymd(bizDate());
  var s = A.summary, best = null, months = {}, wk = [0, 0, 0, 0, 0, 0, 0], wkDays = [0, 0, 0, 0, 0, 0, 0];
  A.days.forEach(function (d) {
    if (!best || d.sales > best.sales) best = d;
    months[d.date.slice(0, 7)] = (months[d.date.slice(0, 7)] || 0) + d.sales;
    var w = (new Date(d.date + 'T12:00').getDay() + 6) % 7; wk[w] += d.sales; wkDays[w]++;
  });
  var h = '<div class="kpis">' +
    '<div class="kpi"><small>' + bi('كل المبيعات', 'All sales') + '</small>' + amount(s.sales) + '</div>' +
    '<div class="kpi"><small>' + bi('الطلبات', 'Orders') + '</small><b class="usd num">' + fmt(s.orders) + '</b>' +
      (s.orders ? '<small class="ll">' + bi('معدّل الطلب', 'Average order') + ' <span class="num">' + $usd(s.ordered / s.orders) + '</span></small>' : '') + '</div>' +
    '<div class="kpi"><small>' + bi('أحسن يوم', 'Best day') + '</small>' + (best ? '<b class="usd num">' + $usd(best.sales) + '</b><small class="ll">' + dayName(best.date) + ' <span class="num">' + best.date.slice(0, 4) + '</span></small>' : '<b class="usd">–</b>') + '</div>' +
    '<div class="kpi"><small>' + bi('الأصناف المباعة', 'Items sold') + '</small><b class="usd num">' + fmt(s.items) + '</b></div></div>';

  // average sales on each day of the week (days with orders only)
  var avg = wk.map(function (v, i) { return wkDays[i] ? v / wkDays[i] : 0 }), maxW = Math.max.apply(null, avg) || 1;
  var week = '<div class="card"><h3 class="display">' + bi('معدّل المبيعات حسب أيام الأسبوع', 'Average sales by day of the week') + '</h3><div class="months week">' +
    avg.map(function (v, i) {
      return '<div class="mo"><span class="track"><i style="height:' + (v ? Math.max(4, v / maxW * 100) : 0) + '%"></i></span><span class="mn">' + bi(WEEK_AR[i], WEEK_EN[i]) + '</span><b class="num">' + (v ? $usd(v) : '–') + '</b></div>';
    }).join('') + '</div><p class="muted note2">' + bi('معدّل الأيام اللي فيها طلبات', 'Average of days with orders') + '</p></div>';
  // average sales in each hour of the business day (the same days), so 00:00 and 01:00 come after 23:00
  var hrs = {}, lo = 24, hi = -1, clock = function (k) { return (k + DAY_END) % 24 };
  A.orders.forEach(function (o) { var hr = +String(o.time).slice(0, 2); if (isNaN(hr)) return; hr = (hr + 24 - DAY_END) % 24; hrs[hr] = (hrs[hr] || 0) + o.total; lo = Math.min(lo, hr); hi = Math.max(hi, hr) });
  var nDays = A.days.length || 1, hourly = '';
  if (hi >= lo) {
    var cols = [], maxHr = 0, k;
    for (k = lo; k <= hi; k++) { cols.push(k); maxHr = Math.max(maxHr, (hrs[k] || 0) / nDays) }
    hourly = '<div class="card"><h3 class="display">' + bi('معدّل المبيعات حسب الساعة', 'Average sales by hour') + '</h3><div class="months week hrs" style="grid-template-columns:repeat(' + cols.length + ',minmax(0,1fr))">' +
      cols.map(function (k) {
        var v = (hrs[k] || 0) / nDays;
        return '<div class="mo"><span class="track"><i style="height:' + (v ? Math.max(4, v / (maxHr || 1) * 100) : 0) + '%"></i></span><span class="mn"><b class="num">' + (clock(k) % 12 || 12) + '</b><br>' + bi(clock(k) < 12 ? 'ص' : 'م', clock(k) < 12 ? 'AM' : 'PM') + '</span><b class="num">' + (v ? $usd(v) : '–') + '</b></div>';
      }).join('') + '</div><p class="muted note2">' + bi('معدّل الساعة بالأيام اللي فيها طلبات', 'Average per hour on days with orders') + '</p></div>';
  }
  h += '<div class="cols"><div>' + week + hourly + '</div><div>' + sideCards(A, bi('لسا ما في طلبات', 'No orders yet')) + '</div></div>';
  return h;
}


// The month's sales by menu group, like the expenses by category next to their calendar (ordered value of the items)
var SALES_GROUPS = [['Appetizers', 'مقبلات وبطاطا', /^(Fries|Appetizers)$/, 'Fries'], ['Meals', 'وجبات وصحون', /^(Meals|Plates)$/, 'Meals'],
  ['Family Meals', 'وجبات عائلية', /^Family Meals$/, 'Family Meals'], ['Sandwiches', 'ساندويشات', /Sandwiches$/, 'Chicken Sandwiches'],
  ['Burgers', 'برغر', /Burgers$/, 'Chicken Burgers'], ['Drinks', 'مشروبات', /^Drinks$/, '#2E6FB5'],
  ['Sauces & extras', 'صوصات وإضافات', /^(Sauces & Extras|Extras)$/, '#6B655C'],
  ['Marinated chicken', 'دجاج متبّل', /^Marinated Chicken$/, OPEN_SEC], ['Other', 'غير', /./, '#9A8F80']];
function salesCats(R) {
  var h = '<div class="card"><h3 class="display">' + bi('حسب الصنف', 'By category') + '</h3>';
  if (!R) return h + '<p class="muted">' + bi('عم يحمّل…', 'Loading…') + '</p></div>';
  var by = {}, all = 0;
  R.items.forEach(function (x) {
    var cat = x.cat || (MENU_ALL.filter(function (m) { return m.name === x.name })[0] || {}).cat || '';
    var g = SALES_GROUPS.filter(function (k) { return k[2].test(cat) })[0] || SALES_GROUPS[SALES_GROUPS.length - 1];
    by[g[0]] = (by[g[0]] || 0) + x.sales; all += x.sales;
  });
  var list = SALES_GROUPS.filter(function (g) { return by[g[0]] }).sort(function (a, b) { return by[b[0]] - by[a[0]] }), max = list.length ? by[list[0][0]] : 1;
  return h + (list.length ? list.map(function (g) {
    var v = by[g[0]];
    return '<div class="seller"><div class="tn">' + bi(g[1], g[0]) + '<span class="tq num">' + $usd(v) + ' <small class="muted">' + Math.round(v / (all || 1) * 100) + '%</small></span></div>' +
      '<div class="tb"><i style="width:' + Math.max(3, v / max * 100) + '%;background:' + (g[3].charAt(0) === '#' ? g[3] : catColor(g[3])[0]) + '"></i></div><small class="ll num">' + ll(v) + '</small></div>';
  }).join('') + '<p class="muted note2">' + bi('قيمة الأصناف بطلبات هالشهر', 'The value of the items in this month\'s orders') + '</p>' : '<p class="muted">' + bi('ما في طلبات بهالشهر', 'No orders this month') + '</p>') + '</div>';
}

