/* ---------- today's stock (chef): what was prepared, what's left, and a warning when something runs low ----------
   Each morning the chef counts what is left from yesterday and types what he prepared (pieces for pieces, grams for the
   rest). Every order then takes away what its items use, from the costing worksheet: the sheet brings its "Item lines"
   and "Base lines" in with IMPORTRANGE as the tabs Kitchen items and Kitchen bases. The list of things counted, their
   unit and their warning level are in the tab "Prep items"; the morning counts go in the tab "Prep" (one row per
   thing per day, Ref "prep-<date>-<thing>"). The cashier sees a warning bar when something is under its level. */
var ST = {data: null, err: '', groups: [['Fried', 'مقلي', 'Fried'], ['Patties', 'باتي', 'Patties'], ['Grill', 'متبّل ومشوي', 'Marinated & grilled'], ['Sauces', 'صوصات وسلطة', 'Sauces & coleslaw']]};

function stockData() { return ST.data || EB.cached('prep') }
function stockLoad(then) {
  return EB.read('prep', {'Prep': 0, 'Prep items': 0, 'Kitchen items': 0, 'Kitchen bases': 0}).then(function (r) { ST.data = r; ST.err = ''; if (then) then() },
    function (e) { ST.err = e.offline ? 'OFFLINE' : (e.message || String(e)); if (then) then() });
}
function prevDay(d) { var t = new Date(d + 'T12:00'); t.setDate(t.getDate() - 1); return ymd(t) }
function stockSlug(name) { return String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') }
// 1250 g -> "1.25 كغ", 300 g -> "300 غ", 12 pieces -> "12"
function stockQty(v, unit) {
  v = Math.round(v);
  if (unit !== 'g') return '<b class="num">' + fmt(v) + '</b>';
  return Math.abs(v) >= 1000 ? '<b class="num">' + (Math.round(v / 100) / 10) + '</b> ' + bi('كغ', 'kg') : '<b class="num">' + fmt(v) + '</b> ' + bi('غ', 'g');
}

// Everything worked out for one day: each thing with what's left, made, used by the orders, in stock now, low or not
function stockModel(day) {
  var r = stockData(); if (!r) return null;
  var rows = function (t) { return t && t.rows ? t.rows.filter(function (x) { return x[0] !== '' && x[0] != null }) : [] };
  var items = rows(r['Prep items']).map(function (x) {
    return {name: String(x[0]), ar: String(x[1] || ''), unit: /^g/i.test(String(x[2] || '')) ? 'g' : 'piece', low: Number(x[3]) || 0, group: String(x[4] || ''),
      counts: String(x[5] || x[0]).split(/\s*,\s*/).filter(Boolean)};
  });
  var of = {}; items.forEach(function (it) { it.counts.forEach(function (c) { of[c.toLowerCase()] = it }) });
  var bases = {}, lines = {};
  rows(r['Kitchen bases']).forEach(function (x) { (bases[x[0]] = bases[x[0]] || []).push([String(x[1]), Number(x[2]) || 0]) });
  rows(r['Kitchen items']).forEach(function (x) { (lines[x[0]] = lines[x[0]] || []).push([String(x[1]), Number(x[2]) || 0]) });
  // what one menu item takes from each thing counted (its lines, and the lines of its bases: meal sides…)
  var memo = {};
  var uses = function (name) {
    if (memo[name]) return memo[name];
    var u = {}, add = function (what, q) { var it = of[String(what).toLowerCase()]; if (it) u[it.name] = (u[it.name] || 0) + q };
    (lines[name] || []).forEach(function (l) { if (bases[l[0]]) bases[l[0]].forEach(function (b) { add(b[0], b[1] * l[1]) }); else add(l[0], l[1]) });
    return memo[name] = u;
  };
  var orders = typeof knownOrders === 'function' ? knownOrders() : [];
  var usedOn = function (d) {
    var u = {};
    orders.forEach(function (o) {
      if (o.day !== d || o.status === 'Rejected' || o.status === 'Waiting') return;   // the owners' house food uses stock too
      o.items.forEach(function (x) { var m = uses(x.name); for (var k in m) u[k] = (u[k] || 0) + m[k] * x.qty });
    });
    return u;
  };
  var list = rows(r.Prep).map(function (x) { return {key: String(x[4] || ''), day: String(x[0]).slice(0, 10), item: String(x[1]), left: x[2] === '' ? null : Number(x[2]), made: Number(x[3]) || 0} });
  list = EB.withPending(list, r.at, 'prep');
  var log = {}; list.forEach(function (x) { (log[x.day] = log[x.day] || {})[x.item] = x });
  var yd = prevDay(day), uT = usedOn(day), uY = usedOn(yd);
  return items.map(function (it) {
    var t = (log[day] || {})[it.name], y = (log[yd] || {})[it.name], used = uT[it.name] || 0;
    var expected = y && (y.left != null || y.made) ? Math.max(0, (y.left || 0) + y.made - (uY[it.name] || 0)) : null;   // what should be left this morning
    var start = t && t.left != null ? t.left : expected;
    var now = start == null && !(t && t.made) ? null : (start || 0) + (t ? t.made : 0) - used;
    return {it: it, today: t || null, expected: expected, used: used, now: now, low: now != null && now < it.low,
      waste: t && t.left != null && expected != null ? expected - t.left : null};
  });
}
function lowStock() { var m = stockModel(EB.bizDay(DAY_END)); return m ? m.filter(function (x) { return x.low }) : [] }
// the cashier's warning: on the order screen and on Today's orders
function lowBar() {
  var low = lowStock(); if (!low.length) return '';
  return '<div class="lowbar">⚠️ ' + bi('عم يخلص: ', 'Running low: ') + low.map(function (x) {
    return bi(esc(x.it.ar || x.it.name), esc(x.it.name)) + ' ' + stockQty(Math.max(0, x.now), x.it.unit) }).join(' · ') + '</div>';
}
function drawLowBar() { var el = $('#lowbar'); if (el) el.innerHTML = lowBar() }

/* ---------- the chef's screen ---------- */
function showStock() {
  drawStock();
  stockLoad(drawStock);
  loadRecent().then(drawStock, function () {});
}
function drawStock() {
  var day = EB.bizDay(DAY_END), m = stockModel(day);
  var h = '<div class="shead"><h2 class="display">' + bi('مخزون اليوم', 'Today\'s stock') + '</h2><span class="since">' + dayName(day) + '</span></div>' +
    (ST.err === 'OFFLINE' ? '<p class="offline">' + bi('ما في إنترنت: هيدي الأرقام من آخر مرة.', 'No internet: these numbers are from last time.') + '</p>' : ST.err ? '<p class="err">' + esc(ST.err) + '</p>' : '') +
    '<p class="muted xhint">' + bi('كل يوم الصبح: عدّ شو بقي من مبارح واكتب شو حضّرت (قطع للقطع، وغرام للباقي). الطلبات بتنقص لحالها، والكاشير بيشوف تنبيه لما شي يقلّ.',
      'Each morning: count what is left from yesterday and type what you prepared (pieces for pieces, grams for the rest). Orders take away by themselves, and the cashier sees a warning when something runs low.') + '</p>';
  if (!m) { $('#stock').innerHTML = h + '<p class="muted">' + bi('عم يحمّل…', 'Loading…') + '</p>'; return }
  ST.groups.forEach(function (g) {
    var mine = m.filter(function (x) { return x.it.group === g[0] }); if (!mine.length) return;
    h += '<div class="card stockc"><h3 class="display">' + bi(g[1], g[2]) + '</h3><table class="stockt"><tr><th></th><th>' + bi('بقي من مبارح', 'Left from yesterday') + '</th><th>' + bi('حضّرت اليوم', 'Made today') +
      '</th><th class="r">' + bi('انباع', 'Used') + '</th><th class="r">' + bi('بالمخزن هلّق', 'In stock now') + '</th></tr>' + mine.map(function (x) {
      var t = x.today, u = x.it.unit === 'g' ? T('غرام', 'grams') : T('قطع', 'pieces');   // placeholders: plain text
      return '<tr' + (x.low ? ' class="low"' : '') + '><td><b>' + bi(esc(x.it.ar || x.it.name), esc(x.it.name)) + '</b><div class="muted">' + bi('ينبّه تحت ', 'warns under ') + stockQty(x.it.low, x.it.unit) + '</div></td>' +
        '<td><input class="stL" data-st="' + esc(x.it.name) + '" type="number" inputmode="decimal" min="0" step="any" value="' + (t && t.left != null ? t.left : '') + '" placeholder="' +
          esc(x.expected != null ? T('مفروض ' + Math.round(x.expected), 'should be ' + Math.round(x.expected)) : u) + '">' +
          (x.waste ? '<div class="' + (x.waste > 0 ? 'owe' : 'muted') + ' small">' + (x.waste > 0 ? bi('ناقص ', 'missing ') : bi('زايد ', 'extra ')) + stockQty(Math.abs(x.waste), x.it.unit) + '</div>' : '') + '</td>' +
        '<td><input class="stM" data-st="' + esc(x.it.name) + '" type="number" inputmode="decimal" min="0" step="any" value="' + (t && t.made ? t.made : '') + '" placeholder="' + esc(u) + '"></td>' +
        '<td class="r">' + stockQty(x.used, x.it.unit) + '</td>' +
        '<td class="r">' + (x.now == null ? '<span class="muted">–</span>' : '<span class="stnow' + (x.low ? ' low' : '') + '">' + (x.low ? '⚠️ ' : '') + stockQty(Math.max(0, x.now), x.it.unit) + '</span>') + '</td></tr>';
    }).join('') + '</table></div>';
  });
  h += '<button class="save" id="stSave">' + bi('احفظ', 'Save') + '</button><div class="err" id="stErr"></div>';
  $('#stock').innerHTML = h;
}
$('#stock').addEventListener('click', function (e) {
  var b = e.target.closest('button'); if (!b || b.id !== 'stSave') return;
  var day = EB.bizDay(DAY_END), m = stockModel(day) || [], n = 0;
  m.forEach(function (x) {
    var L = document.querySelector('#stock .stL[data-st="' + CSS.escape(x.it.name) + '"]'), M = document.querySelector('#stock .stM[data-st="' + CSS.escape(x.it.name) + '"]');
    if (!L || !M) return;
    var left = L.value === '' ? null : Number(L.value), made = Number(M.value) || 0, t = x.today;
    if (left == null && !made && !t) return;   // nothing typed for it
    if (t && t.left === left && t.made === made) return;   // unchanged
    var key = 'prep-' + day + '-' + stockSlug(x.it.name), row = {key: key, day: day, item: x.it.name, left: left, made: made};
    var cells = {'Date': day, 'Item': x.it.name, 'Left (counted in the morning)': left == null ? '' : left, 'Made': made};
    if (t) EB.send([{op: 'update', tab: 'Prep', where: {'Ref': key}, set: cells}], {t: 'edit', kind: 'prep', key: key, order: row});
    else { cells['Ref'] = key; cells['Added'] = "'" + EB.ymd(new Date()) + ' ' + EB.hhmm(); EB.send([{op: 'append', tab: 'Prep', unique: 'Ref', rows: [cells]}], {t: 'save', kind: 'prep', key: key, order: row}) }
    n++;
  });
  toast(n ? 'انحفظ المخزون' : 'ما في شي جديد', n ? 'Stock saved' : 'Nothing new to save');
  drawStock(); drawLowBar();
});

// the cashier and the chef keep the stock fresh (every 5 minutes) for the warning
if (ROLE === 'cashier' || ROLE === 'chef') {
  setTimeout(function () { if (EB.key()) stockLoad(drawLowBar) }, 4000);
  setInterval(function () { if (EB.key()) stockLoad(drawLowBar) }, 5 * 60000);
}
