/* ---------- other income: money the business got besides the orders (Management) ----------
   Sheet tab "Income" (made by itself the first time): Date, Source, Note, Amount, Currency, Amount (L.L.), Ref, Added.
   Starting money and capital are what the business had or was given: they add to the balance, not to the profit.
   Other income (e.g. catering, selling used oil) counts in the profit like the sales do (Expenses tab). */
// [name in the sheet, Arabic, counts in the profit]
var INC_CATS = [['Starting money', 'مصاري كانت بالمحل قبل النظام', false], ['Capital', 'رأس مال (مصاري انحطّت بالمحل)', false], ['Other income', 'دخل تاني (غير الأكل)', true]];
var IN = {src: '', cur: '$', data: null, err: '', locked: false};
function incCat(name) { return INC_CATS.filter(function (c) { return c[0] === name })[0] || INC_CATS[2] }

// Income from the sheet, with the ones added or deleted on this device that the copy doesn't have yet
function incomes() {
  var r = IN.data || EB.cached('income');
  if (!r) return null;
  var list = EB.rows(r.Income).filter(function (x) { return x.Ref && x.Date }).map(function (x) {
    return {key: String(x.Ref), day: String(x.Date).slice(0, 10), src: String(x.Source || ''), note: String(x.Note || ''), amount: Number(x.Amount) || 0,
      cur: String(x.Currency || '$'), lbp: Number(x['Amount (L.L.)']) || 0};
  });
  return EB.withPending(list, r.at, 'income');
}
// Other income between two days that counts in the profit (Expenses tab), or 0 before it loads
function incomeIn(from, to) {
  return (incomes() || []).filter(function (x) { return incCat(x.src)[2] && x.day >= from && x.day <= to }).reduce(function (a, x) { return a + x.lbp }, 0);
}

function showIncome() {
  if (!SET.loaded) { $('#inc').innerHTML = '<p class="muted">' + bi('عم يحمّل…', 'Loading…') + '</p>'; return }
  if (SET.pin && pin() !== SET.pin && !(/^\d+$/.test(pin()) && Number(pin()) === Number(SET.pin))) {
    IN.locked = true; var had = pin(); setPin('');
    return pinScreen(had ? bi('الرمز غلط', 'Wrong PIN') : '', '#inc', showIncome, bi('دخل تاني', 'Other income'));
  }
  IN.locked = false;
  drawIncome();
  EB.read('income', {'Income': 0}).then(function (r) { IN.data = r; IN.err = ''; drawIncome() }, function (e) {
    if (/Unknown tab/.test(e.message)) { IN.data = {Income: null, at: 0}; IN.err = 'SCRIPT' }
    else IN.err = e.offline ? 'OFFLINE' : (e.message || String(e));
    drawIncome();
  });
  // sales and expenses for the balance
  if (!SALES) EB.read('sales', {'Orders': 0, 'Order Items': 0}).then(function (r) { SALES = r; drawIncome() }, function () {});
  if (!EX.data) EB.read('purchases', {'Purchases': 0}).then(function (r) { EX.data = r; drawIncome() }, function () {});
}

function incNote() {
  if (IN.err === 'OFFLINE') return '<p class="offline">' + bi('ما في إنترنت: الدخل الجديد بينحفظ وبينبعت لحالو.', 'No internet: new income is kept and sent by itself.') + '</p>';
  if (IN.err === 'SCRIPT') return '<p class="offline">' + bi('الدخل محفوظ على هالجهاز لهلّق، وبينبعت عالشيت لحالو بعد تحديث السكريبت.',
    'Income is kept on this device for now, and goes to the sheet by itself once the script is updated.') + '</p>';
  return IN.err ? '<p class="err">' + esc(IN.err) + '</p>' : '';
}

function drawIncome() {
  if (IN.locked) return;
  var h = '<div class="shead"><h2 class="display">' + bi('دخل تاني', 'Other income') + '</h2></div>' + incNote() +
    '<p class="muted xhint">' + bi('مصاري دخلت عالمحل غير الطلبات: المصاري اللي كانت موجودة قبل ما بلّشنا بالنظام، رأس مال، أو أي دخل تاني.',
      'Money the business got besides the orders: what it had before this system started, capital put in, or any other income.') + '</p>';
  // the form
  h += '<div class="card addx"><div class="xcats">' + INC_CATS.map(function (c) {
    return '<button class="xcat' + (IN.src === c[0] ? ' on' : '') + '" data-isrc="' + esc(c[0]) + '" style="--c:' + (c[2] ? '#1F4A37' : '#F2B705') + '">' + bi(c[1], c[0]) + '</button>' }).join('') + '</div>' +
    (IN.src ? '<p class="muted xhint">' + (incCat(IN.src)[2] ? bi('بينحسب بالربح متل المبيعات.', 'Counts in the profit, like the sales.')
      : bi('بيزيد عالمصاري اللي معك، بس مش ربح.', 'Adds to the money the business has, but is not profit.')) + '</p>' : '') +
    '<div class="xform"><input id="nNote" class="wide" placeholder="' + esc(T('شو هو؟ (مثلاً: المصاري بالصندوق قبل 17 تشرين الأول)', 'What is it? (e.g. cash in the drawer before 17 October)')) + '" maxlength="80">' +
    '<div class="xamt"><input id="nAmount" type="number" inputmode="decimal" min="0" step="any" placeholder="' + esc(T('المبلغ', 'Amount')) + '">' +
    '<div class="xcur"><button data-ncur="$" class="' + (IN.cur === '$' ? 'on' : '') + '">$</button><button data-ncur="L.L." class="' + (IN.cur === 'L.L.' ? 'on' : '') + '">L.L.</button></div></div>' +
    '<input id="nDate" type="date" value="' + ymd(bizDate()) + '">' +
    '<button class="save" id="nSave">' + bi('احفظ الدخل', 'Save income') + '</button><div class="err" id="nErr"></div></div></div>';
  var list = incomes();
  if (!list) { $('#inc').innerHTML = h + '<p class="muted">' + bi('عم يحمّل…', 'Loading…') + '</p>'; return }

  // the money the business should have: everything that came in minus everything spent
  var today = ymd(bizDate()), all = list.reduce(function (a, x) { return a + x.lbp }, 0);
  var sales = (SALES || EB.cached('sales')) ? EB.report(salesOrders(), '2020-01-01', today).summary.sales : null;
  var spent = purchases() ? purchases().reduce(function (a, p) { return a + p.lbp }, 0) : null;
  h += '<div class="kpis">' +
    '<div class="kpi hero"><small>' + bi('الدخل التاني', 'Other income') + '</small>' + amount(all) + '<small class="ll">' + fmt(list.length) + ' ' + bi('دفعة', 'entries') + '</small></div>' +
    '<div class="kpi"><small>' + bi('المبيعات (كل الوقت)', 'Sales (all time)') + '</small>' + (sales == null ? '<b class="usd">…</b>' : amount(sales)) + '</div>' +
    '<div class="kpi"><small>' + bi('المصاريف (كل الوقت)', 'Expenses (all time)') + '</small>' + (spent == null ? '<b class="usd">…</b>' : amount(spent)) + '</div>' +
    '<div class="kpi' + (sales != null && spent != null && all + sales - spent < 0 ? ' owed' : '') + '"><small>' + bi('الرصيد', 'Balance') + '</small>' +
      (sales == null || spent == null ? '<b class="usd">…</b>' : amount(all + sales - spent)) + '<small class="ll">' + bi('الدخل + المبيعات − المصاريف', 'Income + sales − expenses') + '</small></div></div>';

  // every entry, newest first
  var rows = list.slice().sort(function (a, b) { return a.day < b.day ? 1 : a.day > b.day ? -1 : (a.key < b.key ? 1 : -1) });
  h += '<div class="card"><h3 class="display">' + bi('كل الدخل التاني', 'All other income') + '</h3>' + (rows.length ? '<table>' + rows.map(function (x) {
    var c = incCat(x.src);
    return '<tr><td class="num">' + x.day.slice(8) + '/' + x.day.slice(5, 7) + '/' + x.day.slice(2, 4) + '</td>' +
      '<td><span class="xtag" style="--c:' + (c[2] ? '#1F4A37' : '#B08600') + '">' + bi(c[1], c[0]) + '</span> ' + esc(x.note) + '</td>' +
      '<td class="r"><b class="num">' + (x.cur === '$' ? '$' + fmt2(x.amount) : fmt(x.amount) + ' L.L.') + '</b><div class="muted num">' + (x.cur === '$' ? ll(x.lbp) : $usd(x.lbp)) + '</div></td>' +
      '<td><button class="del" data-ndel="' + esc(x.key) + '">' + bi('امسح', 'Delete') + '</button></td></tr>';
  }).join('') + '</table>' : '<p class="muted">' + bi('لسا ما في دخل تاني', 'No other income yet') + '</p>') + '</div>';
  $('#inc').innerHTML = h;
}

$('#inc').addEventListener('click', function (e) {
  var b = e.target.closest('button'); if (!b || IN.locked) return;
  if (b.dataset.isrc || b.dataset.ncur) {
    var keep = {note: $('#nNote').value, amount: $('#nAmount').value, date: $('#nDate').value};
    if (b.dataset.isrc) IN.src = b.dataset.isrc; else IN.cur = b.dataset.ncur;
    drawIncome();
    $('#nNote').value = keep.note; $('#nAmount').value = keep.amount; $('#nDate').value = keep.date;
    return;
  }
  if (b.id === 'nSave') {
    var amount = Number($('#nAmount').value), day = $('#nDate').value, err = function (ar, en) { $('#nErr').innerHTML = bi(ar, en) };
    if (!IN.src) return err('اختار النوع', 'Choose what kind of income');
    if (!(amount > 0)) return err('اكتب المبلغ', 'Enter the amount');
    if (!/^\d{4}-\d\d-\d\d$/.test(day)) return err('اختار التاريخ', 'Choose the date');
    var x = {key: 'ix' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), day: day, src: IN.src, note: $('#nNote').value.trim(),
      amount: amount, cur: IN.cur, lbp: Math.round(IN.cur === '$' ? amount * RATE : amount)};
    EB.send([{op: 'append', tab: 'Income', unique: 'Ref', rows: [{'Date': x.day, 'Source': x.src, 'Note': x.note, 'Amount': x.amount, 'Currency': x.cur,
      'Amount (L.L.)': x.lbp, 'Ref': x.key, 'Added': "'" + EB.ymd(new Date()) + ' ' + EB.hhmm()}]}], {t: 'save', kind: 'income', key: x.key, order: x});
    toast('انحفظ الدخل', 'Income saved');
    IN.src = ''; IN.cur = '$';
    return drawIncome();
  }
  if (b.dataset.ndel) {
    var gone = (incomes() || []).filter(function (x) { return x.key === b.dataset.ndel })[0]; if (!gone) return;
    if (!confirm(T('تمسح هالدخل؟', 'Delete this income?'))) return;
    EB.send([{op: 'remove', tab: 'Income', where: {'Ref': gone.key}}], {t: 'delete', kind: 'income', key: gone.key});
    return drawIncome();
  }
});
