/* ---------- Dashboard (Management): everything all time in one place ---------- */
var DS = {locked: false};
function showDash() {
  if (!SET.loaded) { $('#dash').innerHTML = '<p class="muted">' + bi('عم يحمّل…', 'Loading…') + '</p>'; return }
  if (SET.pin && pin() !== SET.pin && !(/^\d+$/.test(pin()) && Number(pin()) === Number(SET.pin))) {
    DS.locked = true; var had = pin(); setPin('');
    return pinScreen(had ? bi('الرمز غلط', 'Wrong PIN') : '', '#dash', showDash, bi('الملخّص', 'Dashboard'));
  }
  DS.locked = false; S.all = {}; S.rate = RATE;
  drawDash();
  EB.read('sales', {'Orders': 0, 'Order Items': 0}).then(function (r) { SALES = r; S.all = {}; S.years = {}; S.months = {}; S.days = {}; S.err = ''; drawDash() }, function (e) {
    S.err = e.offline ? (EB.cached('sales') ? 'OFFLINE' : 'OFFLINE_EMPTY') : (e.message || String(e)); drawDash();
  });
  EB.read('purchases', {'Purchases': 0}).then(function (r) { EX.data = r; drawDash() }, function () {});
  EB.read('sandouk', {'Sandouk': 0}).then(function (r) { BX.data = r; drawDash() }, function (e) { if (/Unknown tab/.test(e.message)) { BX.data = {Sandouk: null, at: 0}; drawDash() } });
  if (!IN.data) EB.read('income', {'Income': 0}).then(function (r) { IN.data = r; drawDash() }, function (e) { if (/Unknown tab/.test(e.message)) { IN.data = {Income: null, at: 0}; drawDash() } });
}
function drawDash() {
  if (DS.locked || $('#dashView').style.display !== 'block') return;
  var today = ymd(bizDate()), wait = '<p class="muted">' + bi('عم يحمّل…', 'Loading…') + '</p>';
  fetchR('all', 'all', '2020-01-01', today);
  var A = S.all.all, list = purchases();
  var h = '<div class="shead"><h2 class="display">' + bi('الملخّص · كل الوقت', 'Dashboard · all time') + '</h2>' +
    (A && A.days.length ? '<span class="since">' + bi('من ', 'Since ') + dayName(A.days[0].date) + ' <span class="num">' + A.days[0].date.slice(0, 4) + '</span></span>' : '') + '</div>' + salesNote();
  if (!A) { $('#dash').innerHTML = h + wait; return }
  try { h += dashMoney(A.summary.sales, today) } catch (e) { h += '<p class="offline">' + bi('سكّر التطبيق وافتحو من جديد ليحمّل آخر نسخة.', 'Close and reopen the app to load the latest version.') + '</p>' }
  h += monthsBoth(list, A);
  h += '<h2 class="display dsec">📈 ' + bi('المبيعات', 'Sales') + '</h2>' + salesAll(A);
  h += '<h2 class="display dsec">📉 ' + bi('المصاريف', 'Expenses') + '</h2>' + (list ? expAll(list, A) : wait);
  $('#dash').innerHTML = h;
  var strip = document.querySelector('#dash .months.all');  // open the month strip on the latest months
  if (strip && strip.lastElementChild) strip.lastElementChild.scrollIntoView({block: 'nearest', inline: 'nearest'});
}
$('#dash').addEventListener('click', function (e) {
  if (DS.locked) return;
  var g = e.target.closest('[data-goview]'); if (g) return showView(g.dataset.goview);
  var b = e.target.closest('[data-goto]');
  if (b) { S.mode = 'month'; S.y = +b.dataset.goto.slice(0, 4); S.m = +b.dataset.goto.slice(5) - 1; S.sel = monthDay(); showView('report') }
});

function drawSales() {
  if (S.locked) return;
  if (S.mode !== 'month') S.mode = 'month';
  var y = S.y, m = S.m, mk = monthKey(y, m), today = ymd(bizDate());
  fetchR('years', y, y + '-01-01', y + '-12-31');
  fetchR('months', mk, mk + '-01', mk + '-' + pad(daysIn(y, m)));
  if (S.sel) fetchR('days', S.sel, S.sel, S.sel);
  if (S.locked) return;
  var Y = S.years[y], M = S.months[mk], D = S.sel && S.days[S.sel], wait = '<p class="muted">' + bi('عم يحمّل…', 'Loading…') + '</p>';

  // daily totals for the whole year come from one call; the month and the year strip are built from them
  var byDay = {}, byMonth = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  if (Y) Y.days.forEach(function (d) { byDay[d.date] = d; byMonth[+d.date.slice(5, 7) - 1] += d.sales });
  var mSales = 0, mOrders = 0, best = null;
  for (var k = 1; k <= daysIn(y, m); k++) {
    var d = byDay[mk + '-' + pad(k)]; if (!d) continue;
    mSales += d.sales; mOrders += d.orders; if (!best || d.sales > best.sales) best = d;
  }

  var h = '<div class="shead">' + modeSwitch() +
    '<button class="nav" data-mv="-1" aria-label="' + T('الشهر الماضي', 'Previous month') + '"><span class="chev">‹</span></button>' +
    '<h2 class="display">' + bi(MONTHS_AR[m] + ' ' + y, MONTHS_EN[m] + ' ' + y) + '</h2>' +
    '<button class="nav" data-mv="1" aria-label="' + T('الشهر الجاي', 'Next month') + '"><span class="chev">›</span></button>' +
    (mk !== today.slice(0, 7) ? '<button class="today" data-today="1">' + bi('هالشهر', 'This month') + '</button>' : '') + '</div>';
  h += salesNote();

  // the month calendar, Monday first; each day shaded by its sales (one green, darker = more)
  var first = (new Date(y, m, 1).getDay() + 6) % 7, maxD = 0;
  for (k = 1; k <= daysIn(y, m); k++) { d = byDay[mk + '-' + pad(k)]; if (d && d.sales > maxD) maxD = d.sales }
  var cal = '<div class="card calcard"><div class="cal">' + WEEK_AR.map(function (w, i) { return '<span class="wd">' + bi(w, WEEK_EN[i]) + '</span>' }).join('');
  for (k = 0; k < first; k++) cal += '<span></span>';
  for (k = 1; k <= daysIn(y, m); k++) {
    var key = mk + '-' + pad(k); d = byDay[key];
    var step = d && d.sales ? Math.min(6, 1 + Math.floor(d.sales / maxD * 5.999)) : 0;
    cal += '<button class="day s' + step + (key === today ? ' today' : '') + (key === S.sel ? ' sel' : '') + (key > today ? ' future' : '') + '" data-d="' + key + '">' +
      '<span class="dn num">' + k + '</span>' + (d && d.sales ? '<b class="num">' + $usd(d.sales) + '</b><small class="num">' + llShort(d.sales) + ' L.L.</small>' : '') + '</button>';
  }
  cal += '</div><div class="legend">' + bi('أقل', 'Less') + '<i class="s1"></i><i class="s2"></i><i class="s3"></i><i class="s4"></i><i class="s5"></i><i class="s6"></i>' + bi('أكتر', 'More') +
    '<span class="hint">' + bi('دق على يوم لتشوف طلباتو', 'Tap a day to see its orders') + '</span></div></div>';

  h += '<div class="cols">' + cal + '<div>' + salesCats(M) + '</div></div>';

  // the selected day: total, sales by hour, every order
  if (S.sel) {
    h += '<section class="dayx" id="dayCard"><div class="shead"><h2 class="display">' + dayName(S.sel) + '</h2>' +
      '</div>' +
      (D ? dayView(D, bi('ما في طلبات بهاليوم', 'No orders on this day'), S.sel) : wait) + '</section>';
  }
  $('#rep').innerHTML = h;
}

$('#rep').addEventListener('click', function (e) {
  var g = e.target.closest('[data-goview]'); if (g && !S.locked) return showView(g.dataset.goview);
  var b = e.target.closest('button'); if (!b || S.locked) return;
  if (b.dataset.mv) { moveMonth(+b.dataset.mv); return }
  if (b.dataset.mode) { S.mode = b.dataset.mode; S.err = ''; if (!S.sel) S.sel = monthDay(); drawSales(); return }
  if (b.dataset.goto) { S.mode = 'month'; S.y = +b.dataset.goto.slice(0, 4); S.m = +b.dataset.goto.slice(5) - 1; S.sel = monthDay(); drawSales(); return }
  if (b.dataset.close) { S.sel = ''; drawSales(); return }
  if (b.dataset.today) { var t = bizDate(); S.y = t.getFullYear(); S.m = t.getMonth(); S.sel = ymd(t); drawSales(); return }
  if (b.dataset.m) { S.m = +b.dataset.m; S.sel = monthDay(); drawSales(); return }
  if (b.dataset.h) { S.hour = +b.dataset.h === S.hour ? -1 : +b.dataset.h; drawSales(); return }
  if (b.dataset.d && b.classList.contains('day')) {
    S.sel = b.dataset.d; S.hour = -1; drawSales();
    var c = $('#dayCard'); if (c) c.scrollIntoView({behavior: 'smooth', block: 'start'});
    return;
  }
  if (b.classList.contains('del')) {
    if (!confirm(T('تمسح الطلب رقم ' + b.dataset.n + ' (' + b.dataset.d + ')؟', 'Delete order #' + b.dataset.n + ' (' + b.dataset.d + ')?'))) return;
    var gone = salesOrders().filter(function (o) { return o.day === b.dataset.d && o.num === +b.dataset.n })[0];
    if (gone) { EB.remove(gone); toast('انمسح الطلب', 'Order deleted'); S.years = {}; S.months = {}; S.days = {}; S.all = {}; drawSales() }
  }
});
// the day shown under the calendar when a month opens: today in this month, else the 1st
function monthDay() { var t = ymd(bizDate()), mk = monthKey(S.y, S.m); return t.slice(0, 7) === mk ? t : mk + '-01' }
function moveMonth(k) { S.m += k; if (S.m < 0) { S.m = 11; S.y-- } if (S.m > 11) { S.m = 0; S.y++ } S.sel = monthDay(); S.hour = -1; drawSales() }
// swipe the calendar sideways to change month
(function () {
  var x0 = null, y0 = 0;
  $('#rep').addEventListener('touchstart', function (e) { x0 = e.target.closest('.cal') ? e.touches[0].clientX : null; y0 = e.touches[0].clientY }, {passive: true});
  $('#rep').addEventListener('touchend', function (e) {
    if (x0 === null) return; var dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0; x0 = null;
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) moveMonth((dx < 0) === (lang === 'ar') ? -1 : 1);
  });
})();
function itemsAr(text) {
  // "2 × Loaded Fries — Ketchup + Cheddar Sauce, 1 × Pepsi"
  return String(text).split(', ').map(function (p) {
    var m = p.match(/^(\d+) × (.*?)(?: — (.*))?$/); if (!m) return p;
    return m[1] + ' × ' + arName(m[2]) + (m[3] ? ' (' + m[3].split(' + ').map(function (s) { return SAUCE_AR[s] || s }).join('، ') + ')' : '');
  }).join('، ');
}

