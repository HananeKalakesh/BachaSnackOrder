/* ---------- what each menu item costs (Management) ----------
   The Costs tab of the sheet brings in the Menu items tab of the El Bash costing worksheet (IMPORTRANGE): each item's
   price, what its ingredients and packaging cost, its share of the running costs (rent, staff, gas…), the food cost % and
   the profit after all of it. Prices and recipes are changed in the
   costing worksheet; this screen only shows them. */
var CS = {data: null, err: '', locked: false, group: '', sort: ''};
var COSTING_URL = 'https://docs.google.com/spreadsheets/d/1xIpuEHK0kfOqg6WFGBV-SBCLakFRj4bH0v4AjPa9Qlg/edit';
var COST_GROUP_AR = {'Fries': 'بطاطا', 'Appetizers': 'مقبلات', 'Meals': 'وجبات', 'Family meals': 'وجبات عائلية', 'Plates': 'صحون',
  'Sandwiches': 'ساندويشات', 'Burgers': 'برغر', 'Sauces & extras': 'صوصات وإضافات', 'Drinks': 'مشروبات'};

function costRows() {
  var r = CS.data || EB.cached('costs');
  if (!r) return null;
  var n = function (v) { return Number(String(v == null ? '' : v).replace(/[^0-9.\-]/g, '')) || 0 };
  return EB.rows(r.Costs).filter(function (x) { return x.Item && x['Costing group'] }).map(function (x) {
    var pct = n(x['Food cost %']);
    return {name: String(x.Item), ar: String(x.Arabic || ''), group: String(x['Costing group']), price: n(x['Price (L.L.)']), usd: n(x['Price ($)']),
      cost: n(x['Food & packaging ($)'] != null ? x['Food & packaging ($)'] : x['Cost ($)']), run: n(x['Running costs ($)']), pct: pct > 1.5 ? pct / 100 : pct, profit: n(x['Profit per item ($)']), missing: n(x['Still missing (count)']), target: n(x['Price for the target (L.L.)'])};
  });
}

function showCosts() {
  if (!SET.loaded) { $('#cost').innerHTML = '<p class="muted">' + bi('عم يحمّل…', 'Loading…') + '</p>'; return }
  if (SET.pin && !pinOk()) {
    CS.locked = true; var had = pin(); setPin('');
    return pinScreen(had ? bi('الرمز غلط', 'Wrong PIN') : '', '#cost', showCosts, bi('الكلفة', 'Costs'));
  }
  CS.locked = false;
  drawCosts();
  EB.read('costs', {'Costs': 0}).then(function (r) { CS.data = r; CS.err = ''; drawCosts() }, function (e) {
    CS.err = e.offline ? 'OFFLINE' : (e.message || String(e)); drawCosts();
  });
}

function drawCosts() {
  if (CS.locked) return;
  var rows = costRows(), h = '<div class="shead"><h2 class="display">' + bi('كلفة الأصناف', 'What each item costs') + '</h2>' +
    '<a class="ghost" href="' + COSTING_URL + '" target="_blank" rel="noopener">' + bi('شيت الكلفة ↗', 'Costing sheet ↗') + '</a></div>' +
    '<p class="muted xhint">' + bi('المواد = الأكل والتغليف. التشغيل = حصة الصنف من الإيجار والموظفين والغاز… الربح بعد كل شي. النسبة هي كلفة المواد: الأخضر لحد 35٪، الأصفر لحد 45٪، الأحمر فوق. الأرقام البرتقالية بشيت الكلفة تقديرات.',
      'Food = ingredients and packaging. Running = the item\'s share of rent, staff, gas… Profit is after all of it. % is the food cost: green up to 35%, yellow up to 45%, red above. Orange numbers in the costing sheet are estimates.') + '</p>';
  if (CS.err === 'OFFLINE') h += '<p class="offline">' + bi('ما في إنترنت: هيدي الأرقام من آخر مرة.', 'No internet: these are the numbers from last time.') + '</p>';
  else if (CS.err) h += '<p class="err">' + esc(CS.err) + '</p>';
  if (!rows) { $('#cost').innerHTML = h + '<p class="muted">' + bi('عم يحمّل…', 'Loading…') + '</p>'; return }
  var groups = []; rows.forEach(function (x) { if (groups.indexOf(x.group) < 0) groups.push(x.group) });
  var gName = function (g) { return COST_GROUP_AR[g] ? bi(COST_GROUP_AR[g], g) : esc(g) };
  var shown = rows.filter(function (x) { return !CS.group || x.group === CS.group });
  var costed = shown.filter(function (x) { return x.cost > 0 }), avg = costed.length ? costed.reduce(function (a, x) { return a + x.pct }, 0) / costed.length : 0;
  var over = costed.filter(function (x) { return x.pct > 0.45 }).length;
  h += '<div class="modes cmodes">' + [['', 'الكل', 'All']].concat(groups.map(function (g) { return [g, COST_GROUP_AR[g] || g, g] })).map(function (g) {
    return '<button data-cgroup="' + esc(g[0]) + '"' + (CS.group === g[0] ? ' class="on"' : '') + '>' + bi(g[1], g[2]) + '</button>' }).join('') + '</div>';
  h += '<div class="kpis">' +
    '<div class="kpi hero"><small>' + bi('معدّل كلفة المواد', 'Average food cost') + '</small><b class="usd num">' + Math.round(avg * 100) + '%</b></div>' +
    '<div class="kpi' + (over ? ' owed' : '') + '"><small>' + bi('فوق 45٪', 'Above 45%') + '</small><b class="usd num">' + over + '</b><small class="ll">' + bi('صنف', 'items') + '</small></div>' +
    '<div class="kpi"><small>' + bi('الأصناف', 'Items') + '</small><b class="usd num">' + shown.length + '</b></div></div>';
  var list = function (items) {
    if (CS.sort === 'pct') items = items.slice().sort(function (a, b) { return b.pct - a.pct });
    return '<table class="ctable"><tr><th></th><th class="r">' + bi('السعر', 'Price') + '</th><th class="r">' + bi('المواد', 'Food') + '</th><th class="r">' + bi('التشغيل', 'Running') + '</th>' +
      '<th class="r"><button class="hlink" data-csort="1">%' + (CS.sort === 'pct' ? ' ↓' : '') + '</button></th><th class="r">' + bi('الربح', 'Profit') + '</th></tr>' +
      items.map(function (x) {
        var cls = x.pct <= 0.35 ? 'ok' : x.pct <= 0.45 ? 'near' : 'over';
        return '<tr><td>' + bi(x.ar || x.name, x.name) + (x.missing ? '<div class="muted">⚠ ' + bi(x.missing + ' ناقص: الكلفة الحقيقية أعلى', x.missing + ' missing: real cost is higher') + '</div>' : '') + '</td>' +
          '<td class="r num"><b>' + usd(x.usd) + '</b><div class="muted">' + money(x.price) + '</div></td>' +
          '<td class="r num">' + (x.cost ? usd(x.cost) : '–') + '</td><td class="r num muted">' + (x.cost ? usd(x.run) : '–') + '</td>' +
          '<td class="r num">' + (x.cost ? '<b class="pct ' + cls + '">' + Math.round(x.pct * 100) + '%</b>' : '–') + '</td>' +
          '<td class="r num' + (x.cost && x.profit < 0.5 ? ' owe' : '') + '">' + (x.cost ? usd(x.profit) : '–') + '</td></tr>';
      }).join('') + '</table>';
  };
  h += (CS.group ? [CS.group] : groups).map(function (g) {
    return '<div class="card"><h3 class="display">' + gName(g) + '</h3>' + list(shown.filter(function (x) { return x.group === g })) + '</div>';
  }).join('');
  $('#cost').innerHTML = h;
}
$('#cost').addEventListener('click', function (e) {
  var b = e.target.closest('button'); if (!b || CS.locked) return;
  if (b.dataset.cgroup !== undefined) { CS.group = b.dataset.cgroup; return drawCosts() }
  if (b.dataset.csort) { CS.sort = CS.sort === 'pct' ? '' : 'pct'; return drawCosts() }
});
