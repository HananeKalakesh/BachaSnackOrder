/* ---------- accounts: how the business is doing (Management) ----------
   Three boxes that are never added together: Profit (sales minus food, packaging, staff and bills), Sales (by day,
   best sellers, who still owes) and House (what went to the owners' house). Capital and the machines bought with it
   are one line at the bottom: they are not profit and not the money in the store (that is the Tonight tab).
   Uses the same data as Sales, Expenses and Other income; nothing is typed here. */
var AC = {p: 'month', locked: false, err: ''};

function showAccounts() {
  if (!SET.loaded) { $('#acc').innerHTML = '<p class="muted">' + bi('عم يحمّل…', 'Loading…') + '</p>'; return }
  if (SET.pin && !pinOk()) {
    AC.locked = true; var had = pin(); setPin('');
    return pinScreen(had ? bi('الرمز غلط', 'Wrong PIN') : '', '#acc', showAccounts, bi('الحسابات', 'Accounts'));
  }
  AC.locked = false;
  drawAccounts();
  var fail = function (e) { AC.err = e.offline ? 'OFFLINE' : (e.message || String(e)); drawAccounts() };
  EB.read('sales', {'Orders': 0, 'Order Items': 0}).then(function (r) { SALES = r; AC.err = ''; drawAccounts() }, fail);
  EB.read('purchases', {'Purchases': 0}).then(function (r) { EX.data = r; drawAccounts() }, function (e) { if (/Unknown tab/.test(e.message)) { EX.data = {Purchases: null, at: 0}; drawAccounts() } else fail(e) });
  EB.read('income', {'Income': 0}).then(function (r) { IN.data = r; drawAccounts() }, function (e) { if (/Unknown tab/.test(e.message)) { IN.data = {Income: null, at: 0}; drawAccounts() } });
}

function acRange() {
  var t = bizDate(), today = ymd(t);
  return AC.p === 'all' ? ['2000-01-01', today] : [monthKey(t.getFullYear(), t.getMonth()) + '-01', today];
}
// one line of a box: label on one side, amount on the other
function acRow(ar, en, lbp, sign, strong) {
  return '<div class="acrow' + (strong ? ' tot' : '') + '"><span>' + bi(ar, en) + '</span><span class="num">' + (sign || '') + $usd(Math.abs(lbp)) +
    '<small class="ll">' + ll(Math.abs(lbp)) + '</small></span></div>';
}

function drawAccounts() {
  if (AC.locked) return;
  var h = '<div class="shead"><div class="modes">' + [['month', 'هالشهر', 'This month'], ['all', 'كل الوقت', 'All time']].map(function (x) {
    return '<button data-acp="' + x[0] + '"' + (AC.p === x[0] ? ' class="on"' : '') + '>' + bi(x[1], x[2]) + '</button>' }).join('') + '</div>' +
    '<h2 class="display">' + bi('الحسابات', 'Accounts') + '</h2>' +
    '<a class="ghost" href="' + COSTING_URL + '" target="_blank" rel="noopener">' + bi('شيت الكلفة ↗', 'Costing sheet ↗') + '</a></div>';
  if (AC.err === 'OFFLINE') h += '<p class="offline">' + bi('ما في إنترنت: هيدي الأرقام من آخر مرة.', 'No internet: these are the numbers from last time.') + '</p>';
  else if (AC.err) h += '<p class="err">' + esc(AC.err) + '</p>';
  var list = purchases(), haveSales = !!(SALES || EB.cached('sales'));
  if (!list || !haveSales) { $('#acc').innerHTML = h + '<p class="muted">' + bi('عم يحمّل…', 'Loading…') + '</p>'; return }

  var r = acRange(), from = r[0], to = r[1], orders = salesOrders(), R = EB.report(orders, from, to), s = R.summary;
  var bought = list.filter(function (p) { return p.day >= from && p.day <= to }), t = tally(bought), other = incomeIn(from, to);
  var g = {food: 0, packaging: 0, running: 0};
  bought.forEach(function (p) { var k = catOf(p.cat)[3]; if (g[k] != null) g[k] += p.lbp });
  var profit = s.sales + other - g.food - g.packaging - g.running;

  // 1. Profit
  var box1 = '<div class="card acbox"><h3 class="display">' + bi('الربح', 'Profit') + '</h3>' +
    acRow('المبيعات', 'Sales', s.sales, '+ ') + (other ? acRow('دخل تاني', 'Other income', other, '+ ') : '') +
    acRow('أكل ومواد', 'Food & ingredients', g.food, '− ') + acRow('تغليف', 'Packaging', g.packaging, '− ') +
    acRow('موظفين وفواتير', 'Staff & bills', g.running, '− ') +
    '<div class="acrow tot' + (profit < 0 ? ' owe' : '') + '"><span>' + bi('الربح', 'Profit') + '</span><span class="num">' + (profit < 0 ? '−' : '') + $usd(Math.abs(profit)) +
      '<small class="ll">' + ll(Math.abs(profit)) + '</small></span></div>' +
    (t.owners ? '<p class="muted note2">' + bi('من الربح، أخدو الأصحاب ', 'Of the profit, the owners took ') + '<b class="num">' + $usd(t.owners) + '</b>' + bi(' (من الصندوق كل ليلة).', ' (from the cash box each night).') + '</p>' : '');
  if (AC.p === 'all') {   // month by month
    var months = {};
    EB.report(orders, '2000-01-01', to).days.forEach(function (d) { var k = d.date.slice(0, 7); (months[k] = months[k] || {i: 0, o: 0}).i += d.sales });
    (incomes() || []).forEach(function (x) { if (incCat(x.src)[2]) { var k = x.day.slice(0, 7); (months[k] = months[k] || {i: 0, o: 0}).i += x.lbp } });
    list.forEach(function (p) { var k3 = catOf(p.cat)[3]; if (k3 === 'food' || k3 === 'packaging' || k3 === 'running') { var k = p.day.slice(0, 7); (months[k] = months[k] || {i: 0, o: 0}).o += p.lbp } });
    var keys = Object.keys(months).sort().reverse();
    if (keys.length) box1 += '<table><tr><th></th><th class="r">' + bi('دخل', 'In') + '</th><th class="r">' + bi('طلع', 'Out') + '</th><th class="r">' + bi('الربح', 'Profit') + '</th></tr>' +
      keys.map(function (k) { var m = months[k], mi = +k.slice(5) - 1;
        return '<tr><td>' + bi(MONTHS_AR[mi], MONTHS_EN[mi]) + '</td><td class="r num">' + $usd(m.i) + '</td><td class="r num">' + $usd(m.o) + '</td><td class="r num"><b' + (m.i - m.o < 0 ? ' class="owe"' : '') + '>' + $usd(m.i - m.o) + '</b></td></tr>' }).join('') + '</table>';
  }
  box1 += '</div>';

  // 2. Sales
  var food = R.items.filter(function (x) { return !isSide(x.name) });
  var box2 = '<div class="card acbox"><h3 class="display">' + bi('المبيعات', 'Sales') + '</h3>' +
    acRow('كاش', 'Cash', s.cashLbp) + acRow('ويش', 'Whish', s.whishLbp) + acRow('المجموع', 'Total', s.sales, '', true) +
    '<p class="muted note2">' + fmt(s.orders) + ' ' + bi('طلب', 'orders') + (s.orders ? ' · ' + bi('معدّل الطلب ', 'average order ') + '<span class="num">' + $usd(s.ordered / s.orders) + '</span>' : '') + '</p>' +
    (food.length ? '<h4>' + bi('الأكتر مبيعاً', 'Best sellers') + '</h4>' + sellerBars(food.slice(0, 5)) : '') +
    '<div class="acowe' + (s.unpaidLbp ? ' owe' : '') + '"><span>' + bi('لسا ما دفعو', 'Still owed') + ': <b class="num">' + $usd(s.unpaidLbp) + '</b> · ' + fmt(s.unpaidOrders) + ' ' + bi('طلب', 'orders') + '</span>' +
      '<button class="ghost" data-acgo="owed">' + bi('مين؟', 'Who?') + '</button></div>' +
    '<button class="ghost wide" data-acgo="report">' + bi('المبيعات يوم بيوم', 'Sales day by day') + '</button></div>';

  // 3. House
  var house = {}, hn = 0, hv = 0;
  orders.forEach(function (o) {
    if (!o.live || o.payment !== 'House' || o.day < from || o.day > to) return;
    hn++; hv += o.total;
    o.items.forEach(function (x) { house[x.name] = (house[x.name] || 0) + x.qty });
  });
  var hk = Object.keys(house).sort(function (a, b) { return house[b] - house[a] });
  var box3 = '<div class="card acbox"><h3 class="display">🏠 ' + bi('للبيت', 'House') + '</h3>' +
    (hn ? acRow('قيمتو بأسعار المنيو', 'Worth at menu prices', hv) + '<p class="muted note2">' + fmt(hn) + ' ' + bi('طلب للبيت. مش محسوب مبيعات ولا دين.', 'orders for the house. Not counted as sales or as owed.') + '</p>' +
      '<div class="achouse">' + hk.map(function (k) { return '<span>' + bi(arName(k), k) + ' <b class="num">× ' + fmt(house[k]) + '</b></span>' }).join('') + '</div>'
      : '<p class="muted">' + bi('ما في طلبات للبيت بهالفترة.', 'No orders for the house in this period.') + '</p>') + '</div>';

  // capital: one line, all time
  var inc = incomes() || [], cap = inc.filter(function (x) { return !incCat(x.src)[2] }).reduce(function (a, x) { return a + x.lbp }, 0);
  var equip = list.filter(function (p) { return catOf(p.cat)[3] === 'investment' }).reduce(function (a, p) { return a + p.lbp }, 0);
  var foot = '<div class="card acfoot"><span>' + bi('رأس المال (من الأول): ', 'Capital (since the start): ') + '<b class="num">' + $usd(cap) + '</b> · ' +
    bi('معدّات انشرت: ', 'equipment bought: ') + '<b class="num">' + $usd(equip) + '</b></span>' +
    '<button class="ghost" data-acgo="inc">' + bi('زيد أو شوف', 'Add or see') + '</button>' +
    '<p class="muted note2">' + bi('مش ربح ومش من مصاري المحل اليومية.', 'Not profit, and not part of the store\'s daily money.') + '</p></div>';

  h += '<div class="acgrid">' + box1 + box2 + box3 + '</div>' + foot;
  $('#acc').innerHTML = h;
}
$('#acc').addEventListener('click', function (e) {
  var b = e.target.closest('button'); if (!b || AC.locked) return;
  if (b.dataset.acp) { AC.p = b.dataset.acp; drawAccounts() }
  if (b.dataset.acgo) showView(b.dataset.acgo);
});
