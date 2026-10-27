// The offline copy only works from the app's own link (GitHub Pages), not inside the Apps Script page
if ('serviceWorker' in navigator && !(window.google && google.script)) navigator.serviceWorker.register('sw.js').catch(function () {});
/* ---------- expenses: what the shop bought, and the profit (sales minus expenses) for each month ---------- */
// [name in the sheet, Arabic, what goes in it, group, types]. Equipment is an investment: shown on its own, not taken off the month's profit.
// Owners (ربح) is what the owners take: the profit is shown before it, then what is left in the business.
var EXP_CATS = [
  ['Chicken', 'دجاج', ['', ''], 'food'], ['Beef', 'لحمة', ['', ''], 'food'], ['Bread', 'خبز', ['', ''], 'food'],
  ['Vegetables', 'خضار', ['', ''], 'food'], ['Ingredients', 'مواد أولية', ['صوصات، مشروبات، زيت، جبنة… وأدوات التنظيف والمطبخ', 'sauces, drinks, oil, cheese… and cleaning & kitchen supplies'], 'food',
    [['Cooking', 'للطبخ'], ['Supplies', 'تنظيف ولوازم (كفوف…)']]],
  ['Packaging', 'تغليف', ['بلاستيك، علب، أكياس', 'plastics, boxes, bags'], 'packaging'],
  ['Salaries', 'رواتب', ['', ''], 'running', [['Staff', 'موظفين'], ['Cleaning', 'تنظيف']]],
  ['Utilities', 'فواتير', ['', ''], 'running', [['Gas', 'غاز'], ['Water', 'مي'], ['Internet', 'إنترنت']]],
  ['Other', 'غير ذلك', ['', ''], 'running'],
  ['Equipment', 'معدّات', ['استثمار، مش من مصروف الشهر', 'an investment, not the month\'s running costs'], 'investment', [['Machines', 'آلات'], ['Kitchen supplies', 'أدوات مطبخ']]],
  // what the owners take each week as their pay: shown apart, after the profit
  ['Owners', 'ربح', ['اللي بياخدو أصحاب المحل كل جمعة كمعاش', 'what the owners take each week as their pay'], 'owners']];
/* Expense groups: the calendar and the dashboard show these general groups; a day's details show the categories and
   their types. The add form shows every choice at once (category + type in one tap), under its group.
   [key, Arabic, English, colour, [[category, type, Arabic, English]…]] */
var EXP_GROUPS = [
  ['food', 'أكل', 'Food', '#1F4A37', [['Chicken', '', 'دجاج', 'Chicken'], ['Beef', '', 'لحمة', 'Beef'], ['Bread', '', 'خبز', 'Bread'], ['Vegetables', '', 'خضار', 'Vegetables'],
    ['Ingredients', 'Cooking', 'مواد أولية (زيت، صوصات، جبنة…)', 'Ingredients (oil, sauces, cheese…)']]],
  ['pack', 'تغليف ولوازم', 'Packaging & supplies', '#F2B705', [['Packaging', '', 'تغليف (علب، أكياس)', 'Packaging (boxes, bags)'], ['Ingredients', 'Supplies', 'تنظيف ولوازم (كفوف…)', 'Cleaning & supplies (gloves…)']]],
  ['staff', 'رواتب', 'Salaries', '#C8102E', [['Salaries', 'Staff', 'رواتب موظفين', 'Staff salaries'], ['Salaries', 'Cleaning', 'راتب تنظيف', 'Cleaning salary']]],
  ['bills', 'فواتير وغيرها', 'Bills & other', '#E0707C', [['Utilities', 'Gas', 'غاز', 'Gas'], ['Utilities', 'Water', 'مي', 'Water'], ['Utilities', 'Internet', 'إنترنت', 'Internet'], ['Other', '', 'غير ذلك', 'Other']]],
  ['equip', 'معدّات', 'Equipment', '#6B655C', [['Equipment', 'Machines', 'آلات', 'Machines'], ['Equipment', 'Kitchen supplies', 'أدوات مطبخ', 'Kitchen supplies']]],
  ['owners', 'ربح الأصحاب', 'Owners', '#8C5A00', [['Owners', '', 'ربح الأصحاب', 'Owners\' pay']]]];
function expGroup(p) {
  var hit = null;
  EXP_GROUPS.forEach(function (g) { g[4].forEach(function (c) { if (!hit && c[0] === p.cat && (c[1] === (p.sub || '') || !c[1] && !p.sub)) hit = g }) });
  if (!hit) EXP_GROUPS.forEach(function (g) { g[4].forEach(function (c) { if (!hit && c[0] === p.cat) hit = g }) });   // a type not listed: its category's first group
  return hit || EXP_GROUPS[3];
}
// Bars by group, biggest first; with cats, each group's categories under it (the dashboard)
function groupBars(list, none, cats) {
  var by = {}, inG = {}, all = 0;
  list.forEach(function (p) {
    var g = expGroup(p); by[g[0]] = (by[g[0]] || 0) + p.lbp; all += p.lbp;
    var lab = expLabel(catOf(p.cat), p.sub), m = inG[g[0]] = inG[g[0]] || {}; m[lab] = (m[lab] || 0) + p.lbp;
  });
  var gs = EXP_GROUPS.filter(function (g) { return by[g[0]] }).sort(function (a, b) { return by[b[0]] - by[a[0]] }), max = gs.length ? by[gs[0][0]] : 1;
  return '<div class="card"><h3 class="display">' + bi('حسب النوع', 'By group') + '</h3>' + (gs.length ? gs.map(function (g) {
    var v = by[g[0]];
    return '<div class="seller"><div class="tn">' + bi(g[1], g[2]) + (g[0] === 'equip' ? ' <small class="muted">' + bi('استثمار', 'investment') + '</small>' : '') +
      '<span class="tq num">' + $usd(v) + ' <small class="muted">' + Math.round(v / (all || 1) * 100) + '%</small></span></div>' +
      '<div class="tb"><i style="width:' + Math.max(3, v / max * 100) + '%;background:' + g[3] + '"></i></div><small class="ll num">' + ll(v) + '</small>' +
      (cats ? '<div class="xsplit">' + Object.keys(inG[g[0]]).sort(function (a, b) { return inG[g[0]][b] - inG[g[0]][a] }).map(function (k) {
        return '<span>' + k + ' <b class="num">' + $usd(inG[g[0]][k]) + '</b></span>' }).join('') + '</div>' : '') + '</div>';
  }).join('') + (cats ? '' : '<p class="muted note2">' + bi('دق على يوم لتشوف التفاصيل', 'Tap a day for the details') + '</p>') : '<p class="muted">' + none + '</p>') + '</div>';
}
// A purchase's label: the category, and its type when it has one (e.g. Utilities · Gas)
function subOf(c, name) { return (c[4] || []).filter(function (x) { return x[0] === name })[0] }
function expLabel(c, sub) { var t = subOf(c, sub); return t ? bi(c[1] + ' · ' + t[1], c[0] + ' · ' + t[0]) : bi(c[1], c[0]) }
var EXP_COLOR = {food: '#1F4A37', packaging: '#F2B705', running: '#C8102E', investment: '#6B655C', owners: '#8C5A00'};
var EX = {mode: 'add', sel: '', y: 0, m: 0, cat: '', sub: '', cur: '$', data: null, err: '', locked: false, edit: null};
function catOf(name) { return EXP_CATS.filter(function (c) { return c[0] === name })[0] || EXP_CATS[8] }

// Purchases from the sheet (and the ones added or deleted on this iPad that the copy doesn't have yet)
function purchases() {
  var r = EX.data || EB.cached('purchases');
  if (!r) return null;
  var list = EB.rows(r.Purchases).filter(function (p) { return p.Ref && p.Date }).map(function (p) {
    return {key: String(p.Ref), day: String(p.Date).slice(0, 10), cat: String(p.Category), sub: String(p.Type || ''), item: String(p.Item || ''), amount: Number(p.Amount) || 0,
      cur: String(p.Currency || 'L.L.'), lbp: Number(p['Amount (L.L.)']) || 0, supplier: String(p.Supplier || '')};
  });
  return EB.withPending(list, r.at, 'purchase');
}

function showExpenses() {
  if (!SET.loaded) { $('#exp').innerHTML = '<p class="muted">' + bi('عم يحمّل…', 'Loading…') + '</p>'; return }
  // the chef adds expenses without the PIN, and only sees the form and today's list
  if (ROLE !== 'chef' && SET.pin && pin() !== SET.pin && !(/^\d+$/.test(pin()) && Number(pin()) === Number(SET.pin))) {
    EX.locked = true; var had = pin(); setPin('');
    return pinScreen(had ? bi('الرمز غلط', 'Wrong PIN') : '', '#exp', showExpenses, bi('المصاريف', 'Expenses'));
  }
  EX.locked = false;
  if (!EX.y) { var t = bizDate(); EX.y = t.getFullYear(); EX.m = t.getMonth() }
  drawExpenses();
  EB.read('purchases', {'Purchases': 0}).then(function (r) { EX.data = r; EX.err = ''; drawExpenses() }, function (e) {
    // the sheet's script isn't updated yet: the purchases typed here wait on this iPad
    if (/Unknown tab/.test(e.message)) { EX.data = {Purchases: null, at: 0}; EX.err = 'SCRIPT' }
    else EX.err = e.offline ? 'OFFLINE' : (e.message || String(e));
    drawExpenses();
  });
  // sales for the profit, the same data as the Sales tab
  if (!SALES) EB.read('sales', {'Orders': 0, 'Order Items': 0}).then(function (r) { SALES = r; drawExpenses() }, function () {});
  // other income for the profit (Other income tab)
  if (!IN.data) EB.read('income', {'Income': 0}).then(function (r) { IN.data = r; drawExpenses() }, function () {});
}

// Totals for a list of purchases: running costs (taken off the profit), equipment (an investment, apart), by category and type
function tally(list) {
  var t = {spent: 0, invest: 0, owners: 0, byCat: {}, bySub: {}, count: list.length};
  list.forEach(function (p) {
    var g = catOf(p.cat)[3];
    if (g === 'investment') t.invest += p.lbp; else if (g === 'owners') t.owners += p.lbp; else t.spent += p.lbp;
    t.byCat[p.cat] = (t.byCat[p.cat] || 0) + p.lbp;
    if (subOf(catOf(p.cat), p.sub)) { var bs = t.bySub[p.cat] = t.bySub[p.cat] || {}; bs[p.sub] = (bs[p.sub] || 0) + p.lbp }
  });
  return t;
}
// Bars by category, biggest first, with each category's types under it
function catBars(t, none) {
  var cats = Object.keys(t.byCat).sort(function (a, b) { return t.byCat[b] - t.byCat[a] }), max = cats.length ? t.byCat[cats[0]] : 1, all = t.spent + t.invest + t.owners || 1;
  return '<div class="card"><h3 class="display">' + bi('حسب النوع', 'By category') + '</h3>' + (cats.length ? cats.map(function (k) {
    var cc = catOf(k), v = t.byCat[k];
    return '<div class="seller"><div class="tn">' + bi(cc[1], cc[0]) + (cc[3] === 'investment' ? ' <small class="muted">' + bi('استثمار', 'investment') + '</small>' : '') +
      '<span class="tq num">' + $usd(v) + ' <small class="muted">' + Math.round(v / all * 100) + '%</small></span></div>' +
      '<div class="tb"><i style="width:' + Math.max(3, v / max * 100) + '%;background:' + EXP_COLOR[cc[3]] + '"></i></div><small class="ll num">' + ll(v) + '</small>' +
      (t.bySub[k] ? '<div class="xsplit">' + Object.keys(t.bySub[k]).sort(function (a, b) { return t.bySub[k][b] - t.bySub[k][a] }).map(function (s) {
        var st = subOf(cc, s); return '<span>' + bi(st[1], st[0]) + ' <b class="num">' + $usd(t.bySub[k][s]) + '</b></span>' }).join('') + '</div>' : '') + '</div>';
  }).join('') : '<p class="muted">' + none + '</p>') + '</div>';
}
// A list of purchases with edit and delete
function purchaseTable(list, withDate) {
  return list.length ? '<table>' + list.map(function (p) {
    var cc = catOf(p.cat);
    return '<tr>' + (withDate ? '<td class="num">' + p.day.slice(8) + '/' + p.day.slice(5, 7) + '</td>' : '') +
      '<td><span class="xtag" style="--c:' + EXP_COLOR[cc[3]] + '">' + expLabel(cc, p.sub) + '</span> ' + esc(p.item) +
      (p.supplier ? '<div class="muted">' + esc(p.supplier) + '</div>' : '') + '</td><td class="r"><b class="num">' + (p.cur === '$' ? '$' + fmt2(p.amount) : fmt(p.amount) + ' L.L.') + '</b>' +
      '<div class="muted num">' + (p.cur === '$' ? ll(p.lbp) : $usd(p.lbp)) + '</div></td>' +
      '<td><button class="ghost xed" data-xedit="' + esc(p.key) + '">' + bi('عدّل', 'Edit') + '</button> <button class="del" data-xdel="' + esc(p.key) + '">' + bi('امسح', 'Delete') + '</button></td></tr>';
  }).join('') + '</table>' : '<p class="muted">–</p>';
}
// Sales between two days (the Sales tab's numbers), or null before they load
function salesIn(from, to) { return (SALES || EB.cached('sales')) ? EB.report(salesOrders(), from, to).summary.sales : null }
function profitKpis(sales, t, label, other) {
  other = other || 0;
  var profit = sales == null ? null : sales + other - t.spent, rest = profit == null ? null : profit - t.owners;
  var w = profit > 0 ? Math.max(0, Math.min(100, t.owners / profit * 100)) : 0;
  // the profit in one box: the owners' part (ربح) and what stays in the business
  var box = '<div class="card profitbox"><div class="pbhead"><div><small>' + bi('الربح', 'Profit') + label + '</small>' + (profit == null ? '<b class="usd">…</b>' : amount(profit)) +
      '<small class="ll">' + (other ? bi('المبيعات + الدخل التاني ناقص المصاريف', 'Sales + other income minus expenses') : bi('المبيعات ناقص المصاريف', 'Sales minus expenses')) + '</small></div></div>' +
    (profit == null ? '' : '<div class="split"><i class="cash" style="width:' + (100 - w) + '%"></i><i class="own" style="width:' + w + '%"></i></div>' +
      '<div class="pay2"><div><span class="dot cash"></span>' + bi('بقي للمحل', 'Kept by the business') + amount(rest) + '</div>' +
      '<div><span class="dot own"></span>' + bi('للأصحاب (ربح)', 'Owners (ربح)') + amount(t.owners) + '</div></div>') + '</div>';
  return box + '<div class="kpis">' +
    '<div class="kpi"><small>' + bi('المبيعات', 'Sales') + '</small>' + (sales == null ? '<b class="usd">…</b>' : amount(sales)) +
      (other ? '<small class="ll">+ ' + bi('دخل تاني ', 'other income ') + '<span class="num">' + $usd(other) + '</span></small>' : '') + '</div>' +
    '<div class="kpi"><small>' + bi('المصاريف', 'Expenses') + '</small>' + amount(t.spent) + '<small class="ll">' + fmt(t.count) + ' ' + bi('مصروف', 'expenses') + '</small></div>' +
    '<div class="kpi"><small>' + bi('معدّات (استثمار)', 'Equipment (investment)') + '</small>' + amount(t.invest) + '</div></div>';
}
function expModes() {
  // Management: the calendar is the page, Add opens the form in a pop-up (like Sales: one calendar per tab)
  return '<button class="xaddb" data-xadd="1">＋ ' + bi('زيد مصروف', 'Add expense') + '</button>';
  return '<div class="modes">' + [['add', 'زيد مصروف', 'Add'], ['cal', 'التقويم', 'Calendar']].map(function (x) {
    return '<button data-xmode="' + x[0] + '"' + (EX.mode === x[0] ? ' class="on"' : '') + '>' + bi(x[1], x[2]) + '</button>' }).join('') + '</div>';
}
function expNote() {
  if (EX.err === 'OFFLINE') return '<p class="offline">' + bi('ما في إنترنت: المصاريف الجديدة بتنحفظ وبتنبعت لحالها.', 'No internet: new expenses are kept and sent by themselves.') + '</p>';
  if (EX.err === 'SCRIPT') return '<p class="offline">' + bi('المصاريف محفوظة على هالآيباد لهلّق، وبتنبعت عالشيت لحالها بعد تحديث السكريبت.',
    'Expenses are kept on this iPad for now, and go to the sheet by themselves once the script is updated.') + '</p>';
  return EX.err ? '<p class="err">' + esc(EX.err) + '</p>' : '';
}

function drawExpenses() {
  if (EX.locked) return;
  var CHEF = ROLE === 'chef';
  EX.mode = CHEF ? 'add' : 'cal';
  var list = purchases();
  if (EX.mode === 'cal') return expCalendar(list);
  if (EX.mode === 'dash') EX.mode = 'add';   // the dashboard is its own tab now
  // Add: the form, then the latest purchases
  var h = expForm(CHEF);
  if (!list) { $('#exp').innerHTML = h + '<p class="muted">' + bi('عم يحمّل…', 'Loading…') + '</p>'; return }
  var today = ymd(bizDate()), tt = tally(list.filter(function (p) { return p.day === today }));
  var latest = list.filter(function (p) { return !CHEF || p.day === today && p.cat !== 'Owners' }).sort(function (a, b) { return a.day < b.day ? 1 : a.day > b.day ? -1 : (a.key < b.key ? 1 : -1) }).slice(0, CHEF ? 50 : 10);
  if (CHEF) tt = tally(latest);
  h += '<div class="card"><div class="chead"><h3 class="display">' + (CHEF ? bi('مصاريف اليوم', 'Today\'s expenses') : bi('آخر المصاريف', 'Latest expenses')) + '</h3>' +
    '<span class="tot">' + bi('اليوم: ', 'Today: ') + '<b class="num">' + $usd(tt.spent + tt.invest + tt.owners) + '</b></span></div>' + purchaseTable(latest, true) + '</div>';
  $('#exp').innerHTML = h;
}

// The add / edit form: the chef's page, and the pop-up over the Management calendar
function expForm(CHEF) {
  var c = EX.cat ? catOf(EX.cat) : null;
  var h = '<div class="shead"><h2 class="display">' + (EX.edit ? bi('عدّل المصروف', 'Edit expense') : bi('زيد مصروف', 'Add an expense')) + '</h2></div>' + expNote() +
    '<div class="card addx">' + EXP_GROUPS.filter(function (g) { return !CHEF || g[0] !== 'owners' }).map(function (g) {
      return '<div class="xgrp"><small style="color:' + g[3] + '">' + bi(g[1], g[2]) + '</small><div class="xcats">' + g[4].map(function (k) {
        var on = EX.cat === k[0] && (EX.sub || '') === k[1];
        return '<button class="xcat' + (on ? ' on' : '') + '" data-xpick="' + esc(k[0] + '|' + k[1]) + '" style="--c:' + g[3] + '">' + bi(k[2], k[3]) + '</button>' }).join('') + '</div></div>';
    }).join('') +
    (c && c[2][0] && (c[3] === 'investment' || c[3] === 'owners') ? '<p class="muted xhint">' + bi(c[2][0], c[2][1]) + '</p>' : '') +
    '<div class="xform"><input id="xItem" placeholder="' + esc(T('شو اشتريت؟ (مثلاً: 10 كيلو صدر دجاج)', 'What did you buy? (e.g. 10 kg chicken breast)')) + '" maxlength="80">' +
    '<div class="xamt"><input id="xAmount" type="number" inputmode="decimal" min="0" step="any" placeholder="' + esc(T('المبلغ', 'Amount')) + '">' +
    '<div class="xcur"><button data-xcur="$" class="' + (EX.cur === '$' ? 'on' : '') + '">$</button><button data-xcur="L.L." class="' + (EX.cur === 'L.L.' ? 'on' : '') + '">L.L.</button></div></div>' +
    '<input id="xSupplier" placeholder="' + esc(T('من وين؟ (اختياري)', 'Supplier (optional)')) + '" maxlength="60">' +
    '<input id="xDate" type="date" value="' + ymd(bizDate()) + '">' +
    '<button class="save" id="xSave">' + (EX.edit ? bi('احفظ التعديل', 'Save changes') : bi('احفظ المصروف', 'Save expense')) + '</button>' +
    (EX.edit || !CHEF ? '<button class="ghost" id="xCancel">' + bi('إلغاء', 'Cancel') + '</button>' : '') + '<div class="err" id="xErr"></div></div></div>';
  return h;
}
// Calendar: each day's spending, darker = more; tap a day for its details
function expCalendar(list) {
  var y = EX.y, m = EX.m, mk = monthKey(y, m), today = ymd(bizDate());
  var h = '<div class="shead">' + expModes() + '<button class="nav" data-xmv="-1" aria-label="' + T('الشهر الماضي', 'Previous month') + '"><span class="chev">‹</span></button>' +
    '<h2 class="display">' + bi(MONTHS_AR[m] + ' ' + y, MONTHS_EN[m] + ' ' + y) + '</h2>' +
    '<button class="nav" data-xmv="1" aria-label="' + T('الشهر الجاي', 'Next month') + '"><span class="chev">›</span></button></div>' + expNote();
  if (!list) { $('#exp').innerHTML = h + '<p class="muted">' + bi('عم يحمّل…', 'Loading…') + '</p>'; return }
  var month = list.filter(function (p) { return p.day.slice(0, 7) === mk }), t = tally(month), byDay = {}, maxD = 0, k;
  month.forEach(function (p) { byDay[p.day] = (byDay[p.day] || 0) + p.lbp });
  Object.keys(byDay).forEach(function (d) { if (byDay[d] > maxD) maxD = byDay[d] });
  var first = (new Date(y, m, 1).getDay() + 6) % 7;
  var cal = '<div class="card calcard"><div class="cal">' + WEEK_AR.map(function (w, i) { return '<span class="wd">' + bi(w, WEEK_EN[i]) + '</span>' }).join('');
  for (k = 0; k < first; k++) cal += '<span></span>';
  for (k = 1; k <= daysIn(y, m); k++) {
    var key = mk + '-' + pad(k), v = byDay[key] || 0, step = v ? Math.min(6, 1 + Math.floor(v / maxD * 5.999)) : 0;
    cal += '<button class="day xday x' + step + (key === today ? ' today' : '') + (key === EX.sel ? ' sel' : '') + (key > today ? ' future' : '') + '" data-xday="' + key + '">' +
      '<span class="dn num">' + k + '</span>' + (v ? '<b class="num">' + $usd(v) + '</b><small class="num">' + llShort(v) + ' L.L.</small>' : '') + '</button>';
  }
  cal += '</div><div class="legend">' + bi('أقل', 'Less') + '<i class="x1"></i><i class="x2"></i><i class="x3"></i><i class="x4"></i><i class="x5"></i><i class="x6"></i>' + bi('أكتر', 'More') +
    '<span class="hint">' + bi('دق على يوم لتشوف مصاريفو', 'Tap a day to see its expenses') + '</span></div></div>';
  h += '<div class="cols">' + cal + '<div>' + groupBars(month, bi('ما في مصاريف بهالشهر', 'No expenses this month'), false) + '</div></div>';
  if (EX.sel && EX.sel.slice(0, 7) === mk) {
    var day = month.filter(function (p) { return p.day === EX.sel }), dt = tally(day);
    h += '<section class="dayx" id="xDayCard"><div class="shead"><h2 class="display">' + dayName(EX.sel) + '</h2>' +
      '<button class="today" data-xclose="1">' + bi('سكّر', 'Close') + '</button></div>' +
      '<div class="kpis"><div class="kpi hero"><small>' + bi('مصاريف اليوم', 'Spent this day') + '</small>' + amount(dt.spent + dt.invest + dt.owners) + '<small class="ll">' + fmt(day.length) + ' ' + bi('مصروف', 'expenses') + '</small></div>' +
      '<div class="kpi"><small>' + bi('مبيعات اليوم', 'Sales this day') + '</small>' + (salesIn(EX.sel, EX.sel) == null ? '<b class="usd">…</b>' : amount(salesIn(EX.sel, EX.sel))) + '</div></div>' +
      '<div class="cols"><div class="card"><h3 class="display">' + bi('المصاريف', 'Expenses') + '</h3>' + purchaseTable(day, false) + '</div><div>' + catBars(dt, bi('ما في مصاريف بهاليوم', 'No expenses on this day')) + '</div></div></section>';
  }
  if (EX.adding || EX.edit) h += '<div class="sheet xsheet"><div class="box">' + expForm(false) + '</div></div>';
  $('#exp').innerHTML = h;
}

// Dashboard: everything so far, month by month, by category and by supplier
// Dashboard, expenses part: by category, by supplier and the monthly averages, since the first sale or purchase
function expAll(list, A) {
  var today = ymd(bizDate()), t = tally(list);
  var first = list.reduce(function (a, p) { return p.day < a ? p.day : a }, A && A.days.length ? A.days[0].date : today);
  var keys = [], y = +first.slice(0, 4), m = +first.slice(5, 7) - 1;
  while (monthKey(y, m) <= today.slice(0, 7)) { keys.push(monthKey(y, m)); if (++m > 11) { m = 0; y++ } }
  // the capital put in from outside the resto: what the owners want to get back
  var cap = (incomes() || []).filter(function (x) { return x.src === 'Capital' }).sort(function (a, b) { return a.day < b.day ? -1 : 1 }), capT = cap.reduce(function (a, x) { return a + x.lbp }, 0);
  var supCard = '<div class="card"><div class="chead"><h3 class="display">💼 ' + bi('رأس المال من برّا', 'Invested from outside') + '</h3>' +
    (cap.length ? '<span class="tot"><b class="num">' + $usd(capT) + '</b> <small class="muted num">' + ll(capT) + '</small></span>' : '') + '</div>' +
    (cap.length ? '<table>' + cap.map(function (x) {
      return '<tr><td class="num">' + x.day.slice(8) + '/' + x.day.slice(5, 7) + '/' + x.day.slice(2, 4) + '</td><td>' + esc(x.note || '') + '</td><td class="r"><b class="num">' + (x.cur === '$' ? '$' + fmt2(x.amount) : fmt(x.amount) + ' L.L.') + '</b></td></tr>' }).join('') + '</table>' +
      '<p class="muted note2">' + bi('المصاري اللي انحطّت بالمحل من برّا (مش من المبيعات): بدّن يرجعوها.', 'Money put into the resto from outside (not from the sales): to be paid back.') + '</p>'
      : '<p class="muted">' + bi('زيد رأس المال من «دخل تاني ورأس مال».', 'Add capital in "Other income & capital".') + '</p>') + '<div class="morelinks"><button data-goview="inc">' + bi('دخل تاني ورأس مال', 'Other income & capital') + '</button></div></div>';
  return '<div class="cols">' + groupBars(list, bi('لسا ما في مصاريف', 'No expenses yet'), true) + '<div>' + supCard +
    '<div class="card"><h3 class="display">' + bi('معدّل الشهر', 'Monthly average') + '</h3><p>' + bi('مصاريف', 'Expenses') + ': <b class="num">' +
    $usd(t.spent / Math.max(1, keys.length)) + '</b> · ' + bi('مبيعات', 'Sales') + ': <b class="num">' + (A ? $usd(A.summary.sales / Math.max(1, keys.length)) : '…') + '</b></p>' +
    '<p class="muted note2">' + bi('من ', 'Since ') + dayName(first) + ' <span class="num">' + first.slice(0, 4) + '</span></p></div></div></div>';
}

// Dashboard, middle: sales and expenses side by side for every month, the profit under each; tap one to open it in Sales
function monthsBoth(list, A) {
  var today = ymd(bizDate()), h = '';
  var first = (list || []).reduce(function (a, p) { return p.day < a ? p.day : a }, A && A.days.length ? A.days[0].date : today);
  // month by month: spent (bar) and profit (sales minus spent)
  var spentM = {}, salesM = {}, keys = [], y = +first.slice(0, 4), m = +first.slice(5, 7) - 1;
  (list || []).forEach(function (p) { if (catOf(p.cat)[3] === 'food' || catOf(p.cat)[3] === 'packaging' || catOf(p.cat)[3] === 'running') spentM[p.day.slice(0, 7)] = (spentM[p.day.slice(0, 7)] || 0) + p.lbp });
  if (A) A.days.forEach(function (d) { salesM[d.date.slice(0, 7)] = (salesM[d.date.slice(0, 7)] || 0) + d.sales });
  while (monthKey(y, m) <= today.slice(0, 7)) { keys.push(monthKey(y, m)); if (++m > 11) { m = 0; y++ } }
  var maxM = Math.max.apply(null, keys.map(function (k) { return Math.max(spentM[k] || 0, salesM[k] || 0) })) || 1;
  h += '<div class="card year"><div class="chead"><h3 class="display">' + bi('كل شهر', 'Month by month') + '</h3>' +
    '<span class="tot"><i class="key ks"></i>' + bi('المبيعات', 'Sales') + ' <i class="key kx"></i>' + bi('المصاريف', 'Expenses') + '</span></div><div class="months all">' +
    keys.map(function (k) {
      var s = salesM[k] || 0, x = spentM[k] || 0, mi = +k.slice(5) - 1, p = s - x;
      return '<button class="mo xmo" data-goto="' + k + '"><span class="track two"><i class="ks" style="height:' + (s ? Math.max(3, s / maxM * 100) : 0) + '%"></i><i class="kx" style="height:' + (x ? Math.max(3, x / maxM * 100) : 0) + '%"></i></span>' +
        '<span class="mn">' + bi(MONTHS_AR[mi], MONTHS_EN[mi].slice(0, 3)) + ' <span class="num">' + k.slice(2, 4) + '</span></span>' +
        '<b class="num">' + (s ? $usd(s) : '–') + '</b>' + (x ? '<small class="num xm">−' + $usd(x) + '</small>' : '') + '</button>';
    }).join('') + '</div><p class="muted note2">' + bi('تحت كل شهر: المبيعات، وتحتها المصاريف. دق على شهر لتفتح تقويمو.', 'Under each month: the sales, and under them the expenses. Tap a month to open its calendar.') + '</p></div>';
  return h;
}
$('#exp').addEventListener('click', function (e) {
  if (e.target.classList.contains('xsheet')) { EX.adding = false; EX.edit = null; EX.cat = ''; EX.sub = ''; return drawExpenses() }   // tap outside the pop-up
  var b = e.target.closest('button'); if (!b || EX.locked) return;
  if (b.dataset.xadd) { EX.adding = true; EX.edit = null; EX.cat = ''; EX.sub = ''; drawExpenses(); return }
  if (b.dataset.xmode) { EX.mode = b.dataset.xmode; return drawExpenses() }
  if (b.dataset.xmv) { EX.m += +b.dataset.xmv; if (EX.m < 0) { EX.m = 11; EX.y-- } if (EX.m > 11) { EX.m = 0; EX.y++ } EX.sel = ''; return drawExpenses() }
  if (b.dataset.xday) { EX.sel = b.dataset.xday; drawExpenses(); var c = $('#xDayCard'); if (c) c.scrollIntoView({behavior: 'smooth', block: 'start'}); return }
  if (b.dataset.xclose) { EX.sel = ''; return drawExpenses() }
  if (b.dataset.xgoto) { EX.mode = 'cal'; EX.y = +b.dataset.xgoto.slice(0, 4); EX.m = +b.dataset.xgoto.slice(5) - 1; EX.sel = ''; return drawExpenses() }
  if (b.dataset.xcat || b.dataset.xcur || b.dataset.xsub || b.dataset.xpick) {
    // keep what was typed while the form redraws
    var keep = {item: $('#xItem').value, amount: $('#xAmount').value, supplier: $('#xSupplier').value, date: $('#xDate').value};
    if (b.dataset.xpick) { var pk = b.dataset.xpick.split('|'); EX.cat = pk[0]; EX.sub = pk[1] || '' }
    else if (b.dataset.xcat) { if (EX.cat !== b.dataset.xcat) EX.sub = ''; EX.cat = b.dataset.xcat }
    else if (b.dataset.xsub) EX.sub = b.dataset.xsub; else EX.cur = b.dataset.xcur;
    drawExpenses();
    $('#xItem').value = keep.item; $('#xAmount').value = keep.amount; $('#xSupplier').value = keep.supplier; $('#xDate').value = keep.date;
    return;
  }
  if (b.dataset.xedit) {
    var ed = (purchases() || []).filter(function (x) { return x.key === b.dataset.xedit })[0]; if (!ed) return;
    EX.edit = ed; EX.adding = true; EX.cat = ed.cat; EX.sub = ed.sub; EX.cur = ed.cur === '$' ? '$' : 'L.L.';
    drawExpenses();
    $('#xItem').value = ed.item; $('#xAmount').value = ed.amount; $('#xSupplier').value = ed.supplier; $('#xDate').value = ed.day;
    if (ROLE === 'chef') $('#exp').scrollIntoView({behavior: 'smooth', block: 'start'});
    return;
  }
  if (b.id === 'xCancel') { EX.edit = null; EX.adding = false; EX.cat = ''; EX.sub = ''; EX.cur = '$'; return drawExpenses() }
  if (b.id === 'xSave') {
    var amount = Number($('#xAmount').value), day = $('#xDate').value, err = function (ar, en) { $('#xErr').innerHTML = bi(ar, en) };
    if (!EX.cat) return err('اختار النوع', 'Choose a category');
    if (catOf(EX.cat)[4] && !subOf(catOf(EX.cat), EX.sub)) return err('اختار شو بالزبط (' + catOf(EX.cat)[4].map(function (t) { return t[1] }).join('، ') + ')',
      'Choose which one (' + catOf(EX.cat)[4].map(function (t) { return t[0] }).join(', ') + ')');
    if (!(amount > 0)) return err('اكتب المبلغ', 'Enter the amount');
    if (!/^\d{4}-\d\d-\d\d$/.test(day)) return err('اختار التاريخ', 'Choose the date');
    var p = {key: EX.edit ? EX.edit.key : 'px' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), day: day, cat: EX.cat, sub: catOf(EX.cat)[4] ? EX.sub : '', item: $('#xItem').value.trim(),
      amount: amount, cur: EX.cur, lbp: Math.round(EX.cur === '$' ? amount * RATE : amount), supplier: $('#xSupplier').value.trim()};
    var cells = {'Date': p.day, 'Category': p.cat, 'Type': p.sub, 'Item': p.item, 'Amount': p.amount, 'Currency': p.cur, 'Amount (L.L.)': p.lbp, 'Supplier': p.supplier};
    if (EX.edit) {   // the same row, changed in place
      EB.send([{op: 'update', tab: 'Purchases', where: {'Ref': p.key}, set: cells}], {t: 'edit', kind: 'purchase', key: p.key, order: p});
      toast('انحفظ التعديل', 'Purchase updated'); EX.edit = null;
    } else {
      cells['Ref'] = p.key; cells['Added'] = "'" + EB.ymd(new Date()) + ' ' + EB.hhmm();
      EB.send([{op: 'append', tab: 'Purchases', unique: 'Ref', rows: [cells]}], {t: 'save', kind: 'purchase', key: p.key, order: p});
      toast('انحفظ المصروف', 'Purchase saved');
    }
    var d = p.day.split('-'); EX.y = +d[0]; EX.m = +d[1] - 1; EX.cat = ''; EX.sub = ''; EX.cur = '$'; EX.adding = false;
    if (ROLE !== 'chef') EX.sel = p.day;   // the calendar opens that day's expenses
    return drawExpenses();
  }
  if (b.dataset.xdel) {
    var gone = (purchases() || []).filter(function (x) { return x.key === b.dataset.xdel })[0]; if (!gone) return;
    if (!confirm(T('تمسح هالمصروف؟', 'Delete this expense?'))) return;
    EB.send([{op: 'remove', tab: 'Purchases', where: {'Ref': gone.key}}], {t: 'delete', kind: 'purchase', key: gone.key});
    return drawExpenses();
  }
});

