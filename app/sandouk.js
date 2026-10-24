/* ---------- the cash box (الصندوق): what is in the drawer and on Whish at the end of each day (Management) ----------
   Sheet tab "Sandouk" (made by itself the first time): Date, Cash (L.L.), Cash ($), Whish (L.L.), Total (L.L.), Owners %,
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
      whish: Number(x['Whish (L.L.)']) || 0, total: Number(x['Total (L.L.)']) || 0, pct: Number(x['Owners %']) || OWNERS_PCT,
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
function boxCalc(cashLbp, cashUsd, whish) {
  var total = Math.round(cashLbp + cashUsd * RATE + whish), owners = Math.round(total * OWNERS_PCT / 100);
  return {total: total, owners: owners, left: total - owners};
}
// Owners lines typed by hand on a day (not the one the cash box records)
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
}

function boxDate(d) { return d.slice(8) + '/' + d.slice(5, 7) + '/' + d.slice(2, 4) }

// the live sums under the form, and what the orders say for that day
function drawBoxCalc() {
  if (!$('#bCalc')) return;
  var c = boxCalc(Number($('#bCash').value) || 0, Number($('#bUsd').value) || 0, Number($('#bWhish').value) || 0), day = $('#bDate').value;
  var s = /^\d{4}-\d\d-\d\d$/.test(day) ? boxSales(day) : null, hand = day ? handOwners(day) : [];
  var h = '<div class="kpis">' +
    '<div class="kpi"><small>' + bi('المجموع (كاش + ويش)', 'Total (cash + Whish)') + '</small>' + amount(c.total) + '</div>' +
    '<div class="kpi"><small>' + bi('ربح الأصحاب ' + OWNERS_PCT + '٪', 'Owners\' ' + OWNERS_PCT + '%') + '</small>' + amount(c.owners) + '</div>' +
    '<div class="kpi hero"><small>' + bi('بيبقى بالمحل', 'Left in the business') + '</small>' + amount(c.left) + '</div></div>';
  if (s) h += '<p class="muted xhint">' + bi('حسب طلبات هاليوم: كاش ', 'The orders that day: cash ') + '<b class="num">' + ll(s.cash) + '</b> · ' + bi('ويش ', 'Whish ') +
    '<b class="num">' + ll(s.whish) + '</b>' + (c.total ? ' · ' + bi('الفرق ', 'difference ') + '<b class="num' + (c.total - s.cash - s.whish < 0 ? ' owe' : '') + '">' +
      (c.total - s.cash - s.whish >= 0 ? '+' : '−') + ll(Math.abs(c.total - s.cash - s.whish)) + '</b>' : '') + '</p>';
  if (hand.length) h += '<p class="offline">' + bi('في ربح للأصحاب مكتوب باليد بهاليوم (', 'Owners\' pay was already typed by hand for this day (') +
    '<b class="num">' + $usd(hand.reduce(function (a, p) { return a + p.lbp }, 0)) + '</b>' +
    bi(')، ما رح ينزاد واحد تاني. امسحو من المصاريف إذا بدك الصندوق يسجّلو.', '), so no second one is added. Delete it in Money out if the cash box should record it.') + '</p>';
  $('#bCalc').innerHTML = h;
}

function drawSandouk() {
  if (BX.locked) return;
  var today = ymd(bizDate()), list = boxes();
  var h = '<div class="shead"><h2 class="display">' + bi('اليوم · الصندوق', 'Tonight · cash box') + '</h2></div>' +
    (BX.err === 'OFFLINE' ? '<p class="offline">' + bi('ما في إنترنت: الصندوق بينحفظ وبينبعت لحالو.', 'No internet: the count is kept and sent by itself.') + '</p>'
      : BX.err ? '<p class="err">' + esc(BX.err) + '</p>' : '') +
    '<p class="muted xhint">' + bi('آخر الليل: عدّ الكاش بالجارور وشوف قدّيش بالويش. ' + OWNERS_PCT + '٪ منن ربح للأصحاب، بينسجّل لحالو بالمصاريف، والباقي بيبقى بالمحل.',
      'At the end of the night: count the cash in the drawer and check Whish. ' + OWNERS_PCT + '% of it is the owners\' pay, recorded in Money out by itself; the rest stays in the business.') + '</p>';
  var mine = list && list.filter(function (x) { return x.day === today })[0];
  // the one number for the money in the store: the latest count, after the owners' share
  var last = list && list.slice().sort(function (a, b) { return a.day < b.day ? 1 : -1 })[0];
  if (last) {
    var since = (purchases() || []).filter(function (p) { return p.day > last.day && p.cat !== 'Owners' }).reduce(function (a, p) { return a + p.lbp }, 0);
    h += '<div class="card instore"><small>' + bi('بالمحل هلّق', 'In the store now') + '</small>' + amount(last.left) +
      '<p class="muted note2">' + bi('آخر عدّ: ', 'Last count: ') + dayName(last.day) + bi(' · بعد ربح الأصحاب', ' · after the owners\' share') + '</p>' +
      (since ? '<p class="muted note2">' + bi('من بعدها انكتب مصاريف ', 'Since then, expenses of ') + '<b class="num">' + $usd(since) + '</b>' +
        bi(': إذا اندفعت من الصندوق، بيكون فيه أقل.', ': if they were paid from the drawer, there is that much less.') + '</p>' : '') + '</div>';
  } else if (list) h += '<div class="card instore"><small>' + bi('بالمحل هلّق', 'In the store now') + '</small><p class="muted">' + bi('عدّ الصندوق الليلة وبيطلع الرقم هون.', 'Count the cash box tonight and the number shows here.') + '</p></div>';
  h += '<div class="card addx"><div class="xform">' +
    '<input id="bDate" type="date" value="' + today + '">' +
    '<div class="xamt"><input id="bCash" type="number" inputmode="decimal" min="0" step="any" placeholder="' + esc(T('كاش بالليرة', 'Cash in L.L.')) + '"><span class="muted">' + bi('كاش', 'Cash') + ' L.L.</span></div>' +
    '<div class="xamt"><input id="bUsd" type="number" inputmode="decimal" min="0" step="any" placeholder="' + esc(T('كاش بالدولار', 'Cash in $')) + '"><span class="muted">' + bi('كاش', 'Cash') + ' $</span></div>' +
    '<div class="xamt"><input id="bWhish" type="number" inputmode="decimal" min="0" step="any" placeholder="' + esc(T('ويش بالليرة', 'Whish in L.L.')) + '"><span class="muted">' + bi('ويش', 'Whish') + ' L.L.</span></div>' +
    '<input id="bNote" class="wide" placeholder="' + esc(T('ملاحظة (اختياري)', 'Note (optional)')) + '" maxlength="80">' +
    '<div id="bCalc"></div>' +
    '<button class="save" id="bSave">' + bi('احفظ الصندوق', 'Save the cash box') + '</button><div class="err" id="bErr"></div></div></div>';
  if (!list) { $('#box').innerHTML = h + '<p class="muted">' + bi('عم يحمّل…', 'Loading…') + '</p>'; boxFill(mine); drawBoxCalc(); return }

  // every day, newest first
  var rows = list.slice().sort(function (a, b) { return a.day < b.day ? 1 : -1 });
  h += '<div class="card"><h3 class="display">' + bi('كل يوم', 'Day by day') + '</h3>' + (rows.length ? '<table><tr><th></th><th class="r">' + bi('كاش', 'Cash') + '</th><th class="r">' + bi('ويش', 'Whish') +
    '</th><th class="r">' + bi('ربح', 'Owners') + '</th><th class="r">' + bi('بقي', 'Left') + '</th><th></th></tr>' + rows.map(function (x) {
    var s = boxSales(x.day), diff = s ? x.total - s.cash - s.whish : null;
    return '<tr><td class="num">' + boxDate(x.day) + (x.note ? '<div class="muted">' + esc(x.note) + '</div>' : '') + '</td>' +
      '<td class="r num">' + $usd(x.cashLbp + x.cashUsd * RATE) + '</td><td class="r num">' + $usd(x.whish) + '</td>' +
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
  $('#bDate').value = x.day; $('#bCash').value = x.cashLbp || ''; $('#bUsd').value = x.cashUsd || ''; $('#bWhish').value = x.whish || ''; $('#bNote').value = x.note;
}

$('#box').addEventListener('input', function (e) {
  if (e.target.id === 'bDate') { var x = (boxes() || []).filter(function (b) { return b.day === e.target.value })[0]; if (x) boxFill(x) }
  if (/^b(Cash|Usd|Whish|Date)$/.test(e.target.id)) drawBoxCalc();
});
$('#box').addEventListener('click', function (e) {
  var b = e.target.closest('button'); if (!b || BX.locked) return;
  if (b.id === 'bSave') {
    var day = $('#bDate').value, cashLbp = Number($('#bCash').value) || 0, cashUsd = Number($('#bUsd').value) || 0, whish = Number($('#bWhish').value) || 0;
    var err = function (ar, en) { $('#bErr').innerHTML = bi(ar, en) };
    if (!/^\d{4}-\d\d-\d\d$/.test(day)) return err('اختار التاريخ', 'Choose the date');
    if (cashLbp < 0 || cashUsd < 0 || whish < 0 || !(cashLbp + cashUsd + whish > 0)) return err('اكتب قدّيش في كاش وويش', 'Enter the cash and Whish amounts');
    var c = boxCalc(cashLbp, cashUsd, whish), key = 'sd-' + day, had = (boxes() || []).filter(function (x) { return x.key === key })[0];
    var x = {key: key, day: day, cashLbp: cashLbp, cashUsd: cashUsd, whish: whish, total: c.total, pct: OWNERS_PCT, owners: c.owners, left: c.left, note: $('#bNote').value.trim()};
    var cells = {'Date': day, 'Cash (L.L.)': cashLbp, 'Cash ($)': cashUsd, 'Whish (L.L.)': whish, 'Total (L.L.)': c.total, 'Owners %': OWNERS_PCT,
      'Owners (L.L.)': c.owners, 'Left (L.L.)': c.left, 'Note': x.note};
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
    toast('انحفظ الصندوق: ربح الأصحاب ' + ll(c.owners), 'Cash box saved: owners ' + ll(c.owners));
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
