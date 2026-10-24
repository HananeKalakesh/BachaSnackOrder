/* ---------- the cash box (الصندوق): what is in the drawer and on Whish at the end of each day (Management) ----------
   Sheet tab "Sandouk" (made by itself the first time): Date, Cash (L.L.), Cash ($), Whish (L.L.), Whish ($), Total (L.L.), Owners %,
   Owners (L.L.), Left (L.L.), Note, Ref, Added. One row per day (Ref "sd-<date>"): saving the same day again changes it.
   Saving a day also records the owners' share (OWNERS_PCT of cash + Whish) as that day's Owners expense (ربح) in
   Purchases, Ref "own-<date>", so nobody types it in Expenses. If an Owners line was already typed by hand for that
   day, it is left alone and no second one is added. */
var OWNERS_PCT = 30;
var BX = {data: null, err: '', locked: false};

function boxes() {
  var r = BX.data || EB.cached('sandouk');
  if (!r) return null;
  var list = EB.rows(r.Sandouk).filter(function (x) { return x.Ref && x.Date }).map(function (x) {
    return {key: String(x.Ref), day: String(x.Date).slice(0, 10), cashLbp: Number(x['Cash (L.L.)']) || 0, cashUsd: Number(x['Cash ($)']) || 0,
      whish: Number(x['Whish (L.L.)']) || 0, whishUsd: Number(x['Whish ($)']) || 0, total: Number(x['Total (L.L.)']) || 0, pct: Number(x['Owners %']) || OWNERS_PCT,
      owners: Number(x['Owners (L.L.)']) || 0, left: Number(x['Left (L.L.)']) || 0, note: String(x.Note || '')};
  });
  return EB.withPending(list, r.at, 'sandouk');
}
// What the orders say came in on a day: cash and Whish (Split orders are shared between the two)
function boxSales(day) {
  if (!(SALES || EB.cached('sales'))) return null;
  var s = EB.report(salesOrders(), day, day).summary;
  return {cash: s.cashLbp, whish: s.whishLbp};
}
function boxCalc(cashLbp, cashUsd, whish, whishUsd) {
  var total = Math.round(cashLbp + cashUsd * RATE + whish + (whishUsd || 0) * RATE), owners = Math.round(total * OWNERS_PCT / 100);
  return {total: total, owners: owners, left: total - owners};
}
/* A counted day against the platform: the count is always what is kept (it replaces the orders' sales in the resto's
   money); the difference is only reported. Live, so an order marked paid later moves it. null until the orders load. */
function boxDiff(x) {
  var s = boxSales(x.day); if (!s) return null;
  var cash = Math.round(x.cashLbp + x.cashUsd * RATE), whish = Math.round(x.whish + (x.whishUsd || 0) * RATE);
  return {cash: cash, whish: whish, oCash: s.cash, oWhish: s.whish, orders: s.cash + s.whish, dCash: cash - s.cash, dWhish: whish - s.whish, diff: x.total - s.cash - s.whish};
}
function signed(v) { return '<b class="num' + (v < 0 ? ' owe' : '') + '">' + (v > 0 ? '+' : v < 0 ? '−' : '') + $usd(Math.abs(v)) + '</b>' }
function diffLine(d) {
  if (!d.diff && !d.dCash) return '<span class="okm">' + bi('مطابق للطلبات ✓', 'Matches the orders ✓') + '</span>';
  return bi('الفرق عن الطلبات ', 'Difference vs orders ') + signed(d.diff) + ' <span class="muted">(' + bi('كاش ', 'cash ') + signed(d.dCash) + ' · ' + bi('ويش ', 'Whish ') + signed(d.dWhish) + ')</span>';
}
// Owners lines typed by hand on a day (not the one the cash box records)
/* The money with the resto: every night 30% of the count goes to the owners and the rest stays with the resto (the
   chef pays the expenses from it); the drawer starts from zero the next day. So: all income + each past day's money (the
   count when there is one, else the orders' sales) − every purchase (the owners' share and equipment included).
   Today's money is still in the drawer: it joins only once tonight's count is saved (see drawerToday). Null until
   everything loads. */
function chefBalance() {
  var buys = purchases(), inc = incomes();
  if (!buys || !inc || !(SALES || EB.cached('sales'))) return null;
  var today = ymd(bizDate()), counted = {}; (boxes() || []).forEach(function (x) { counted[x.day] = x.total });
  var money = 0;
  EB.report(salesOrders(), '2000-01-01', today).days.forEach(function (d) { if (!(d.date in counted) && d.date !== today) money += d.sales });
  Object.keys(counted).forEach(function (d) { money += counted[d] });
  return inc.reduce(function (a, x) { return a + x.lbp }, 0) + money - buys.reduce(function (a, p) { return a + p.lbp }, 0);
}
// today's money not counted yet: paid sales split cash / Whish, and what is not paid. null until the orders load,
// {counted: true} once tonight's count is saved (it is then in the resto's balance)
function drawerToday() {
  if (!(SALES || EB.cached('sales'))) return null;
  var today = ymd(bizDate());
  if ((boxes() || []).some(function (x) { return x.day === today })) return {counted: true};
  var r = EB.report(salesOrders(), today, today), d = r.days.filter(function (x) { return x.date === today })[0], m = r.summary;
  return {sales: d ? d.sales : 0, cash: m.cashLbp, whish: m.whishLbp, unpaid: m.unpaidLbp, unpaidN: m.unpaidOrders};
}
function restoCard() {
  var bal = chefBalance(), d = drawerToday();
  var h = '<div class="card instore"><small>🏪 ' + bi('مع المطعم هلّق', 'With the resto now') + '</small>';
  if (bal == null || !d) return h + '<p class="muted">' + bi('عم يحمّل…', 'Loading…') + '</p></div>';
  var today = d.counted ? 0 : d.sales;
  h += amount(bal + today) + '<div class="kpis rsplit">' +
    '<div class="kpi"><small>' + bi('لآخر عدّ', 'Up to the last count') + '</small>' + amount(bal) + '</div>' +
    '<div class="kpi"><small>' + (d.counted ? bi('اليوم (انعدّ ✓)', 'Today (counted ✓)') : bi('اليوم بالجارور', 'Today in the drawer')) + '</small>' + amount(today) + '</div></div>';
  var tc = d.counted && (boxes() || []).filter(function (x) { return x.day === ymd(bizDate()) })[0], td = tc && boxDiff(tc);
  if (tc) h += '<div class="tcount"><p class="note2">📦 ' + bi('عدّ الليلة: ', 'Tonight\'s count: ') + '<b class="num">' + $usd(tc.total) + '</b>' + (td ? ' · ' + bi('الطلبات ', 'orders ') + '<b class="num">' + $usd(td.orders) + '</b>' : '') + '</p>' +
    (td ? '<p class="note2">' + diffLine(td) + '</p>' : '') +
    '<p class="note2">' + bi('ربح الأصحاب ', 'Owners ') + OWNERS_PCT + '٪ <b class="num">' + $usd(tc.owners) + '</b> · ' + bi('للمطعم ', 'to the resto ') + '<b class="num">' + $usd(tc.left) + '</b> ' + bi('(صار محسوب فوق)', '(already in the total above)') + '</p></div>';
  if (!d.counted) {
    h += '<div class="kpis rsplit r3">' +
      '<div class="kpi"><small>💵 ' + bi('كاش', 'Cash') + '</small>' + amount(d.cash) + '</div>' +
      '<div class="kpi"><small>📱 ' + bi('ويش', 'Whish') + '</small>' + amount(d.whish) + '</div>' +
      '<div class="kpi"><small>⏳ ' + bi('مش مدفوع', 'Not paid') + (d.unpaidN ? ' (' + d.unpaidN + ')' : '') + '</small>' + amount(d.unpaid) + '</div></div>';
    if (today) h += '<p class="muted note2">' + bi('بعد عدّ الليلة: ' + OWNERS_PCT + '٪ للأصحاب ', 'After tonight\'s count: owners\' ' + OWNERS_PCT + '% ') +
      '<b class="num">' + $usd(Math.round(today * OWNERS_PCT / 100)) + '</b> · ' + bi('بيبقى مع المطعم ', 'the resto keeps ') +
      '<b class="num">' + $usd(bal + today - Math.round(today * OWNERS_PCT / 100)) + '</b>' + bi(' (حسب الطلبات، العدّ هو اللي بيعتمد)', ' (from the orders; the count is what counts)') + '</p>';
  }
  return h + '<p class="muted note2">' + bi('كل الدخل والصناديق المعدودة ناقص كل المصاريف وربح الأصحاب، ومبيعات اليوم اللي لسا ما انعدّت. المش مدفوع مش محسوب.', 'All income and counted cash boxes minus every expense and the owners\' share, plus today\'s sales not counted yet. Not paid isn\'t included.') + '</p></div>';
}
function handOwners(day) {
  return (purchases() || []).filter(function (p) { return p.cat === 'Owners' && p.day === day && p.key.indexOf('own-') !== 0 });
}

function showSandouk() {
  if (!SET.loaded) { $('#box').innerHTML = '<p class="muted">' + bi('عم يحمّل…', 'Loading…') + '</p>'; return }
  if (SET.pin && pin() !== SET.pin && !(/^\d+$/.test(pin()) && Number(pin()) === Number(SET.pin))) {
    BX.locked = true; var had = pin(); setPin('');
    return pinScreen(had ? bi('الرمز غلط', 'Wrong PIN') : '', '#box', showSandouk, bi('اليوم', 'Tonight'));
  }
  BX.locked = false;
  drawSandouk();
  EB.read('sandouk', {'Sandouk': 0}).then(function (r) { BX.data = r; BX.err = ''; drawSandouk() }, function (e) {
    if (/Unknown tab/.test(e.message)) { BX.data = {Sandouk: null, at: 0}; BX.err = '' }
    else BX.err = e.offline ? 'OFFLINE' : (e.message || String(e));
    drawSandouk();
  });
  if (!SALES) EB.read('sales', {'Orders': 0, 'Order Items': 0}).then(function (r) { SALES = r; drawSandouk() }, function () {});
  if (!EX.data) EB.read('purchases', {'Purchases': 0}).then(function (r) { EX.data = r; drawSandouk() }, function () {});
  if (!IN.data) EB.read('income', {'Income': 0}).then(function (r) { IN.data = r; drawSandouk() }, function (e) { if (/Unknown tab/.test(e.message)) { IN.data = {Income: null, at: 0}; drawSandouk() } });
}

function boxDate(d) { return d.slice(8) + '/' + d.slice(5, 7) + '/' + d.slice(2, 4) }

// the live sums under the form, and what the orders say for that day
function drawBoxCalc() {
  if (!$('#bCalc')) return;
  var c = boxCalc(Number($('#bCash').value) || 0, Number($('#bUsd').value) || 0, Number($('#bWhish').value) || 0, Number($('#bWhishUsd').value) || 0), day = $('#bDate').value;
  var s = /^\d{4}-\d\d-\d\d$/.test(day) ? boxSales(day) : null, hand = day ? handOwners(day) : [];
  var h = '<div class="kpis">' +
    '<div class="kpi"><small>' + bi('المجموع (كاش + ويش)', 'Total (cash + Whish)') + '</small>' + amount(c.total) + '</div>' +
    '<div class="kpi"><small>' + bi('ربح الأصحاب ' + OWNERS_PCT + '٪', 'Owners\' ' + OWNERS_PCT + '%') + '</small>' + amount(c.owners) + '</div>' +
    '<div class="kpi hero"><small>' + bi('بيبقى مع المطعم', 'Left with the resto') + '</small>' + amount(c.left) + '</div></div>';
  if (s) {
    var d = boxDiff({day: day, cashLbp: Number($('#bCash').value) || 0, cashUsd: Number($('#bUsd').value) || 0, whish: Number($('#bWhish').value) || 0, whishUsd: Number($('#bWhishUsd').value) || 0, total: c.total});
    h += '<p class="muted xhint">' + bi('حسب الطلبات بهاليوم: كاش ', 'The orders that day: cash ') + '<b class="num">' + $usd(s.cash) + '</b> · ' + bi('ويش ', 'Whish ') + '<b class="num">' + $usd(s.whish) + '</b> = <b class="num">' + $usd(s.cash + s.whish) + '</b></p>';
    if (c.total) h += '<p class="xhint">' + diffLine(d) + '</p>' + (d.diff ? '<p class="muted xhint">' + bi('بينحسب المعدود مش الطلبات: الـ' + OWNERS_PCT + '٪ من المعدود، والباقي بيروح للمطعم. الفرق بينسجّل مع هاليوم.', 'The counted money is what counts, not the orders: the ' + OWNERS_PCT + '% is taken from the count and the rest goes to the resto. The difference is recorded with the day.') + '</p>' : '');
  }
  if (hand.length) h += '<p class="offline">' + bi('في ربح للأصحاب مكتوب باليد بهاليوم (', 'Owners\' pay was already typed by hand for this day (') +
    '<b class="num">' + $usd(hand.reduce(function (a, p) { return a + p.lbp }, 0)) + '</b>' +
    bi(')، ما رح ينزاد واحد تاني. امسحو من المصاريف إذا بدك الصندوق يسجّلو.', '), so no second one is added. Delete it in Expenses if the cash box should record it.') + '</p>';
  $('#bCalc').innerHTML = h;
}

function drawSandouk() {
  if (BX.locked) return;
  var today = ymd(bizDate()), list = boxes();
  var h = '<div class="shead"><h2 class="display">' + bi('اليوم · الصندوق', 'Tonight · cash box') + '</h2></div>' +
    (BX.err === 'OFFLINE' ? '<p class="offline">' + bi('ما في إنترنت: الصندوق بينحفظ وبينبعت لحالو.', 'No internet: the count is kept and sent by itself.') + '</p>'
      : BX.err ? '<p class="err">' + esc(BX.err) + '</p>' : '') +
    '<p class="muted xhint">' + bi('آخر الليل: عدّ الكاش بالجارور وشوف قدّيش بالويش. ' + OWNERS_PCT + '٪ للأصحاب (بينسجّل لحالو بالمصاريف)، والباقي بيبقى مع المطعم (الشيف بيدفع منو المصاريف). تاني يوم الجارور بيبلّش من صفر.',
      'At the end of the night: count the cash in the drawer and check Whish. ' + OWNERS_PCT + '% goes to the owners (recorded in Expenses by itself); the rest stays with the resto (the chef pays the expenses from it). The next day the drawer starts from zero.') + '</p>';
  var mine = list && list.filter(function (x) { return x.day === today })[0];
  // the money with the resto: up to the last count + today's drawer = the total, with today split for the count
  h += restoCard();
  h += '<div class="card addx"><div class="xform">' +
    '<input id="bDate" type="date" value="' + today + '">' +
    '<div class="xamt"><input id="bCash" type="number" inputmode="decimal" min="0" step="any" placeholder="' + esc(T('كاش بالليرة', 'Cash in L.L.')) + '"><span class="muted">' + bi('كاش', 'Cash') + ' L.L.</span></div>' +
    '<div class="xamt"><input id="bUsd" type="number" inputmode="decimal" min="0" step="any" placeholder="' + esc(T('كاش بالدولار', 'Cash in $')) + '"><span class="muted">' + bi('كاش', 'Cash') + ' $</span></div>' +
    '<div class="xamt"><input id="bWhish" type="number" inputmode="decimal" min="0" step="any" placeholder="' + esc(T('ويش بالليرة', 'Whish in L.L.')) + '"><span class="muted">' + bi('ويش', 'Whish') + ' L.L.</span></div>' +
    '<div class="xamt"><input id="bWhishUsd" type="number" inputmode="decimal" min="0" step="any" placeholder="' + esc(T('ويش بالدولار', 'Whish in $')) + '"><span class="muted">' + bi('ويش', 'Whish') + ' $</span></div>' +
    '<input id="bNote" class="wide" placeholder="' + esc(T('ملاحظة (اختياري)', 'Note (optional)')) + '" maxlength="80">' +
    '<div id="bCalc"></div>' +
    '<button class="save" id="bSave">' + bi('احفظ الصندوق', 'Save the cash box') + '</button><div class="err" id="bErr"></div></div></div>';
  if (!list) { $('#box').innerHTML = h + '<p class="muted">' + bi('عم يحمّل…', 'Loading…') + '</p>'; boxFill(mine); drawBoxCalc(); return }

  // every day, newest first
  var rows = list.slice().sort(function (a, b) { return a.day < b.day ? 1 : -1 });
  var month = today.slice(0, 7), dAll = 0, dMonth = 0, nDiff = 0;
  rows.forEach(function (x) { var d = boxDiff(x); if (d && d.diff) { dAll += d.diff; nDiff++; if (x.day.slice(0, 7) === month) dMonth += d.diff } });
  h += '<div class="card"><h3 class="display">' + bi('كل يوم', 'Day by day') + '</h3>' +
    (rows.length ? '<p class="muted note2">' + bi('فرق الصناديق عن الطلبات: هالشهر ', 'Cash box vs orders: this month ') + signed(dMonth) + ' · ' + bi('من الأول ', 'since the start ') + signed(dAll) +
      (nDiff ? ' <span class="muted">(' + nDiff + ' ' + bi('يوم فيه فرق', nDiff === 1 ? 'day with a difference' : 'days with a difference') + ')</span>' : '') + '</p>' : '') + (rows.length ? '<table><tr><th></th><th class="r">' + bi('كاش', 'Cash') + '</th><th class="r">' + bi('ويش', 'Whish') +
    '</th><th class="r">' + bi('ربح', 'Owners') + '</th><th class="r">' + bi('بقي', 'Left') + '</th><th></th></tr>' + rows.map(function (x) {
    var dd = boxDiff(x), diff = dd ? dd.diff : null;
    return '<tr><td class="num">' + boxDate(x.day) + (x.note ? '<div class="muted">' + esc(x.note) + '</div>' : '') + '</td>' +
      '<td class="r num">' + $usd(x.cashLbp + x.cashUsd * RATE) + '</td><td class="r num">' + $usd(x.whish + x.whishUsd * RATE) + '</td>' +
      '<td class="r num">' + $usd(x.owners) + '</td><td class="r"><b class="num">' + $usd(x.left) + '</b>' +
      (diff != null && diff !== 0 ? '<div class="muted num' + (diff < 0 ? ' owe' : '') + '">' + bi('الفرق عن الطلبات ', 'vs orders ') + (diff > 0 ? '+' : '−') + $usd(Math.abs(diff)) + '</div>' : '') + '</td>' +
      '<td><button class="del" data-bedit="' + esc(x.key) + '">' + bi('عدّل', 'Edit') + '</button> <button class="del" data-bdel="' + esc(x.key) + '">' + bi('امسح', 'Delete') + '</button></td></tr>';
  }).join('') + '</table>' : '<p class="muted">' + bi('لسا ما في صندوق محفوظ', 'No cash box saved yet') + '</p>') + '</div>';
  $('#box').innerHTML = h;
  boxFill(mine);
  drawBoxCalc();
}
// a day already counted: its numbers in the form, to change them
function boxFill(x) {
  if (!x || !$('#bDate')) return;
  $('#bDate').value = x.day; $('#bCash').value = x.cashLbp || ''; $('#bUsd').value = x.cashUsd || ''; $('#bWhish').value = x.whish || ''; $('#bWhishUsd').value = x.whishUsd || ''; $('#bNote').value = x.note;
}

$('#box').addEventListener('input', function (e) {
  if (e.target.id === 'bDate') { var x = (boxes() || []).filter(function (b) { return b.day === e.target.value })[0]; if (x) boxFill(x) }
  if (/^b(Cash|Usd|Whish|WhishUsd|Date)$/.test(e.target.id)) drawBoxCalc();
});
$('#box').addEventListener('click', function (e) {
  var b = e.target.closest('button'); if (!b || BX.locked) return;
  if (b.id === 'bSave') {
    var day = $('#bDate').value, cashLbp = Number($('#bCash').value) || 0, cashUsd = Number($('#bUsd').value) || 0, whish = Number($('#bWhish').value) || 0, whishUsd = Number($('#bWhishUsd').value) || 0;
    var err = function (ar, en) { $('#bErr').innerHTML = bi(ar, en) };
    if (!/^\d{4}-\d\d-\d\d$/.test(day)) return err('اختار التاريخ', 'Choose the date');
    if (cashLbp < 0 || cashUsd < 0 || whish < 0 || whishUsd < 0 || !(cashLbp + cashUsd + whish + whishUsd > 0)) return err('اكتب قدّيش في كاش وويش', 'Enter the cash and Whish amounts');
    var c = boxCalc(cashLbp, cashUsd, whish, whishUsd), key = 'sd-' + day, had = (boxes() || []).filter(function (x) { return x.key === key })[0];
    var x = {key: key, day: day, cashLbp: cashLbp, cashUsd: cashUsd, whish: whish, whishUsd: whishUsd, total: c.total, pct: OWNERS_PCT, owners: c.owners, left: c.left, note: $('#bNote').value.trim()};
    var cells = {'Date': day, 'Cash (L.L.)': cashLbp, 'Cash ($)': cashUsd, 'Whish (L.L.)': whish, 'Whish ($)': whishUsd, 'Total (L.L.)': c.total, 'Owners %': OWNERS_PCT,
      'Owners (L.L.)': c.owners, 'Left (L.L.)': c.left, 'Note': x.note};
    var sd = boxDiff(x);
    if (sd) { cells['Orders (L.L.)'] = sd.orders; cells['Difference (L.L.)'] = sd.diff }
    if (had) EB.send([{op: 'update', tab: 'Sandouk', where: {'Ref': key}, set: cells}], {t: 'edit', kind: 'sandouk', key: key, order: x});
    else {
      cells['Ref'] = key; cells['Added'] = "'" + EB.ymd(new Date()) + ' ' + EB.hhmm();
      EB.send([{op: 'append', tab: 'Sandouk', unique: 'Ref', rows: [cells]}], {t: 'save', kind: 'sandouk', key: key, order: x});
    }
    // the owners' share as that day's Owners expense, unless one was typed by hand
    if (!handOwners(day).length) {
      var pk = 'own-' + day, mineP = (purchases() || []).filter(function (p) { return p.key === pk })[0];
      var p = {key: pk, day: day, cat: 'Owners', sub: '', item: T('من الصندوق ' + OWNERS_PCT + '٪', 'From the cash box ' + OWNERS_PCT + '%'), amount: c.owners, cur: 'L.L.', lbp: c.owners, supplier: ''};
      var pc = {'Date': day, 'Category': 'Owners', 'Type': '', 'Item': p.item, 'Amount': c.owners, 'Currency': 'L.L.', 'Amount (L.L.)': c.owners, 'Supplier': ''};
      if (mineP) EB.send([{op: 'update', tab: 'Purchases', where: {'Ref': pk}, set: pc}], {t: 'edit', kind: 'purchase', key: pk, order: p});
      else {
        pc['Ref'] = pk; pc['Added'] = "'" + EB.ymd(new Date()) + ' ' + EB.hhmm();
        EB.send([{op: 'append', tab: 'Purchases', unique: 'Ref', rows: [pc]}], {t: 'save', kind: 'purchase', key: pk, order: p});
      }
    }
    toast('انحفظ الصندوق: ربح الأصحاب ' + $usd(c.owners) + (sd && sd.diff ? ' · الفرق ' + (sd.diff > 0 ? '+' : '−') + $usd(Math.abs(sd.diff)) : ''), 'Cash box saved: owners ' + $usd(c.owners) + (sd && sd.diff ? ' · difference ' + (sd.diff > 0 ? '+' : '−') + $usd(Math.abs(sd.diff)) : ''));
    return drawSandouk();
  }
  if (b.dataset.bedit) {
    var ed = (boxes() || []).filter(function (x) { return x.key === b.dataset.bedit })[0]; if (!ed) return;
    boxFill(ed); drawBoxCalc(); $('#box').scrollIntoView({behavior: 'smooth', block: 'start'});
    return;
  }
  if (b.dataset.bdel) {
    var gone = (boxes() || []).filter(function (x) { return x.key === b.dataset.bdel })[0]; if (!gone) return;
    if (!confirm(T('تمسح صندوق هاليوم؟ (وربح الأصحاب اللي سجّلو)', 'Delete this day\'s cash box? (and the owners\' pay it recorded)'))) return;
    var ops = [{op: 'remove', tab: 'Sandouk', where: {'Ref': gone.key}}];
    EB.send(ops, {t: 'delete', kind: 'sandouk', key: gone.key});
    if ((purchases() || []).some(function (p) { return p.key === 'own-' + gone.day }))
      EB.send([{op: 'remove', tab: 'Purchases', where: {'Ref': 'own-' + gone.day}}], {t: 'delete', kind: 'purchase', key: 'own-' + gone.day});
    return drawSandouk();
  }
});
