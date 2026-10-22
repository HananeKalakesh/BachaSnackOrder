/* ---------- overview: how the business is doing (Management, first tab) ----------
   Money in (sales + other income) against money out (purchases), the profit, where the money goes, the days, month by
   month, and the food that sells most. Uses the same data as Sales, Expenses and Other income; nothing is typed here. */
var OV = {p: 'month'};

function showOverview() {
  if (!SET.loaded) { $('#ovr').innerHTML = '<p class="muted">' + bi('عم يحمّل…', 'Loading…') + '</p>'; return }
  if (SET.pin && !pinOk()) {
    OV.locked = true; var had = pin(); setPin('');
    return pinScreen(had ? bi('الرمز غلط', 'Wrong PIN') : '', '#ovr', showOverview, bi('نظرة عامة', 'Overview'));
  }
  OV.locked = false;
  drawOverview();
  var fail = function (e) { OV.err = e.offline ? 'OFFLINE' : (e.message || String(e)); drawOverview() };
  EB.read('sales', {'Orders': 0, 'Order Items': 0}).then(function (r) { SALES = r; OV.err = ''; drawOverview() }, fail);
  EB.read('purchases', {'Purchases': 0}).then(function (r) { EX.data = r; drawOverview() }, function (e) { if (/Unknown tab/.test(e.message)) { EX.data = {Purchases: null, at: 0}; drawOverview() } else fail(e) });
  EB.read('income', {'Income': 0}).then(function (r) { IN.data = r; drawOverview() }, function (e) { if (/Unknown tab/.test(e.message)) { IN.data = {Income: null, at: 0}; drawOverview() } });
}

// The days the period covers: this month, last month or everything
function ovRange() {
  var t = bizDate(), y = t.getFullYear(), m = t.getMonth(), today = ymd(t);
  if (OV.p === 'last') { if (--m < 0) { m = 11; y-- } return [monthKey(y, m) + '-01', monthKey(y, m) + '-' + pad(daysIn(y, m))] }
  if (OV.p === 'all') return ['2000-01-01', today];
  return [monthKey(y, m) + '-01', today];
}

function drawOverview() {
  if (OV.locked) return;
  var h = '<div class="shead"><div class="modes">' + [['month', 'هالشهر', 'This month'], ['last', 'الشهر الماضي', 'Last month'], ['all', 'كل الوقت', 'All time']].map(function (x) {
    return '<button data-ovp="' + x[0] + '"' + (OV.p === x[0] ? ' class="on"' : '') + '>' + bi(x[1], x[2]) + '</button>' }).join('') + '</div>' +
    '<h2 class="display">' + bi('نظرة عامة', 'Overview') + '</h2></div>';
  if (OV.err === 'OFFLINE') h += '<p class="offline">' + bi('ما في إنترنت: هيدي الأرقام من آخر مرة.', 'No internet: these are the numbers from last time.') + '</p>';
  else if (OV.err) h += '<p class="err">' + esc(OV.err) + '</p>';
  var list = purchases(), haveSales = !!(SALES || EB.cached('sales'));
  if (!list || !haveSales) { $('#ovr').innerHTML = h + '<p class="muted">' + bi('عم يحمّل…', 'Loading…') + '</p>'; return }

  var r = ovRange(), from = r[0], to = r[1], R = EB.report(salesOrders(), from, to), s = R.summary;
  var bought = list.filter(function (p) { return p.day >= from && p.day <= to }), t = tally(bought);
  var other = incomeIn(from, to), moneyIn = s.sales + other, profit = moneyIn - t.spent;
  // purchases by kind: food and ingredients, packaging, staff and bills (running)
  var g = {food: 0, packaging: 0, running: 0};
  bought.forEach(function (p) { var k = catOf(p.cat)[3]; if (g[k] != null) g[k] += p.lbp });
  var pctOf = function (v) { return moneyIn ? Math.round(v / moneyIn * 100) : 0 };

  h += '<div class="kpis">' +
    '<div class="kpi"><small>' + bi('اللي دخل', 'Money in') + '</small>' + amount(moneyIn) +
      '<small class="ll">' + bi('مبيعات', 'sales') + ' <span class="num">' + $usd(s.sales) + '</span>' + (other ? ' + ' + bi('دخل تاني', 'other') + ' <span class="num">' + $usd(other) + '</span>' : '') + '</small></div>' +
    '<div class="kpi"><small>' + bi('اللي طلع', 'Money out') + '</small>' + amount(t.spent) + '<small class="ll">' + fmt(t.count) + ' ' + bi('مصروف', 'purchases') + '</small></div>' +
    '<div class="kpi ' + (profit < 0 ? 'owed' : 'hero') + '"><small>' + bi('الربح', 'Profit') + '</small>' + amount(profit) +
      '<small class="ll">' + (moneyIn ? '<span class="num">' + pctOf(profit) + '%</span> ' + bi('من اللي دخل', 'of the money in') : '') + '</small></div>' +
    '<div class="kpi' + (s.unpaidLbp ? ' owed' : '') + '"><small>' + bi('ما دفعو', 'Not paid') + '</small>' + amount(s.unpaidLbp) +
      '<small class="ll">' + fmt(s.unpaidOrders) + ' ' + bi('طلب', 'orders') + '</small></div></div>';

  // where each dollar that came in went
  var bar = function (cls, v, col) { return v > 0 ? '<i style="width:' + (v / Math.max(moneyIn, t.spent, 1) * 100) + '%;background:' + col + '"></i>' : '' };
  var row = function (col, ar, en, v) {
    return '<div><span class="dot" style="background:' + col + '"></span>' + bi(ar, en) + ' <small class="muted num">' + pctOf(v) + '%</small>' + amount(v) + '</div>';
  };
  var where = '<div class="card"><h3 class="display">' + bi('وين راحت المصاري', 'Where the money went') + '</h3>' +
    (moneyIn || t.spent ? '<div class="split">' + bar('', g.food, EXP_COLOR.food) + bar('', g.packaging, EXP_COLOR.packaging) + bar('', g.running, EXP_COLOR.running) +
      bar('', Math.max(0, profit), '#8FBF9F') + '</div><div class="pay2 ovsplit">' +
      row(EXP_COLOR.food, 'أكل ومواد', 'Food & ingredients', g.food) + row(EXP_COLOR.packaging, 'تغليف', 'Packaging', g.packaging) +
      row(EXP_COLOR.running, 'موظفين وفواتير', 'Staff & bills', g.running) + row('#8FBF9F', 'ربح', 'Profit', Math.max(0, profit)) + '</div>' +
      '<p class="muted note2">' + bi('النسبة من اللي دخل. الأكل المشترى مش دايماً انباع بنفس الفترة.', 'Shares of the money in. Food bought isn\'t always sold in the same period.') + '</p>'
      : '<p class="muted">–</p>') +
    (t.invest || t.owners ? '<p class="note2">' + (t.invest ? bi('معدّات (استثمار، مش محسوبة): ', 'Equipment (investment, not counted): ') + '<b class="num">' + $usd(t.invest) + '</b>' : '') +
      (t.invest && t.owners ? ' · ' : '') + (t.owners ? bi('ربح للأصحاب: ', 'Owners\' pay: ') + '<b class="num">' + $usd(t.owners) + '</b> · ' +
        bi('بيبقى بالمحل ', 'left in the business ') + '<b class="num' + (profit - t.owners < 0 ? ' owe' : '') + '">' + $usd(profit - t.owners) + '</b>' : '') + '</p>' : '') + '</div>';

  // a normal day: sales, what it costs to run, and the day that sold most
  var days = R.days.filter(function (d) { return d.sales > 0 }), n = days.length, best = null;
  days.forEach(function (d) { if (!best || d.sales > best.sales) best = d });
  var perDay = '<div class="card"><h3 class="display">' + bi('باليوم', 'Per day') + '</h3>' + (n ? '<div class="pay2 ovsplit">' +
    '<div>' + bi('مبيعات باليوم', 'Sales a day') + amount(s.sales / n) + '<small class="ll">' + fmt(n) + ' ' + bi('يوم شغل', 'open days') + '</small></div>' +
    '<div>' + bi('مصاريف باليوم', 'Spent a day') + amount(t.spent / n) + '</div>' +
    '<div>' + bi('ربح باليوم', 'Profit a day') + amount(profit / n) + '</div>' +
    '<div>' + bi('معدّل الطلب', 'Average order') + amount(s.orders ? s.ordered / s.orders : 0) + '<small class="ll">' + fmt(s.orders) + ' ' + bi('طلب', 'orders') + '</small></div></div>' +
    (best ? '<p class="note2">' + bi('أحسن يوم: ', 'Best day: ') + dayName(best.date) + ' · <b class="num">' + $usd(best.sales) + '</b></p>' : '')
    : '<p class="muted">' + bi('ما في مبيعات بهالفترة', 'No sales in this period') + '</p>') + '</div>';

  // month by month, all time
  var allBought = list, first = allBought.reduce(function (a, p) { return p.day < a ? p.day : a }, ymd(bizDate()));
  var A = EB.report(salesOrders(), '2000-01-01', ymd(bizDate()));
  if (A.days.length && A.days[0].date < first) first = A.days[0].date;
  var inM = {}, outM = {}, keys = [], y = +first.slice(0, 4), m = +first.slice(5, 7) - 1;
  A.days.forEach(function (d) { var k = d.date.slice(0, 7); inM[k] = (inM[k] || 0) + d.sales });
  (incomes() || []).forEach(function (x) { if (incCat(x.src)[2]) { var k = x.day.slice(0, 7); inM[k] = (inM[k] || 0) + x.lbp } });
  allBought.forEach(function (p) { var k3 = catOf(p.cat)[3]; if (k3 === 'food' || k3 === 'packaging' || k3 === 'running') { var k = p.day.slice(0, 7); outM[k] = (outM[k] || 0) + p.lbp } });
  while (monthKey(y, m) <= ymd(bizDate()).slice(0, 7)) { keys.push(monthKey(y, m)); if (++m > 11) { m = 0; y++ } }
  var months = '<div class="card"><h3 class="display">' + bi('كل شهر', 'Month by month') + '</h3><table><tr><th></th><th class="r">' + bi('دخل', 'In') + '</th><th class="r">' + bi('طلع', 'Out') + '</th><th class="r">' + bi('الربح', 'Profit') + '</th></tr>' +
    keys.slice().reverse().map(function (k) {
      var i = inM[k] || 0, o = outM[k] || 0, mi = +k.slice(5) - 1;
      return '<tr><td>' + bi(MONTHS_AR[mi], MONTHS_EN[mi]) + ' <span class="num muted">' + k.slice(0, 4) + '</span></td><td class="r num">' + $usd(i) + '</td><td class="r num">' + $usd(o) + '</td>' +
        '<td class="r num"><b' + (i - o < 0 ? ' class="owe"' : '') + '>' + $usd(i - o) + '</b></td></tr>';
    }).join('') + '</table></div>';

  // the food that sells most (no drinks or sauces)
  var food = R.items.filter(function (x) { return !isSide(x.name) });
  var sellers = '<div class="card"><h3 class="display">' + bi('الأكتر مبيعاً', 'Best sellers') + '</h3>' + (food.length ? sellerBars(food.slice(0, 6)) : '<p class="muted">–</p>') + sidesLine(R.items) + '</div>';

  // the money the business should have: everything that came in minus everything spent, all time
  var cash = (incomes() || []).reduce(function (a, x) { return a + x.lbp }, 0) + A.summary.sales - allBought.reduce(function (a, p) { return a + p.lbp }, 0);
  var bal = '<div class="card"><h3 class="display">' + bi('المصاري بالمحل', 'Money in the business') + '</h3>' + amount(cash) +
    '<p class="muted note2">' + bi('كل الدخل والمبيعات ناقص كل المصاريف (مع المعدّات وربح الأصحاب)، من الأول.', 'All income and sales minus every purchase (equipment and owners\' pay too), since the start.') + '</p></div>';

  h += '<div class="cols"><div>' + where + perDay + months + '</div><div>' + sellers + bal + '</div></div>';
  $('#ovr').innerHTML = h;
}
$('#ovr').addEventListener('click', function (e) {
  var b = e.target.closest('button'); if (!b || OV.locked) return;
  if (b.dataset.ovp) { OV.p = b.dataset.ovp; drawOverview() }
});
