/* ---------- recipes (chef): the kitchen recipes, each for 1 kg of chicken / beef (sauces for one batch) ----------
   Kept in the El Bash costing worksheet (Preparations, Preparation lines, Ingredients); the sheet brings them in with
   IMPORTRANGE as the tabs Kitchen recipes, Kitchen lines and Kitchen ingredients. Recipes are changed in the costing
   worksheet; this screen shows them and multiplies them (x2, x5…) for a bigger batch. */
var RC = {data: null, err: '', open: null, mult: 1, group: ''};
var RMULTS = [0.5, 1, 2, 3, 5, 10];
// recipe name -> group; anything else is under "Other"
var RGROUPS = [
  ['fried', 'مقلي (كريسبي وغيرو)', 'Fried', /crispy|zinger|escalope|broasted|wing|crunchy|nugget|cordon/i],
  ['grill', 'متبّل ومشوي', 'Marinated & grilled', /shawarma|tawouk|fajita|francisco|grilled|steak|kebab/i],
  ['patty', 'باتي', 'Patties', /patty/i],
  ['sauce', 'صوصات وخلطات', 'Sauces & mixes', /sauce|coleslaw|mix|seasoning/i]];
var STEP_AR = {'Marinade': 'التتبيلة', 'Breading': 'التغميس', 'Honey mustard (50 g)': 'هني ماستارد (50 غ)'};
function fmt2(n) { return n % 1 ? n.toFixed(2) : fmt(n) }

function recData() {
  var r = RC.data || EB.cached('kitchen');
  if (!r) return null;
  var cell = function (t) { return t ? t.rows.filter(function (x) { return x[0] }) : [] };
  var ar = {}, unit = {}, lines = {};
  cell(r['Kitchen ingredients']).forEach(function (x) { ar[x[0]] = String(x[1] || ''); unit[x[0]] = String(x[4] || 'g') });
  cell(r['Kitchen lines']).forEach(function (x) {
    var q = Number(String(x[2]).replace(/[^0-9.]/g, ''));
    if (x[1] && q) (lines[x[0]] = lines[x[0]] || []).push({use: String(x[1]), ar: ar[x[1]] || '', qty: q, unit: String(x[3] || unit[x[1]] || 'g'), step: String(x[6] || '')});
  });
  // portions (one thing, e.g. "Fries, meal portion") aren't recipes
  return cell(r['Kitchen recipes']).map(function (x) {
    var name = String(x[0]);
    var g = RGROUPS.filter(function (k) { return k[3].test(name) })[0];
    return {name: name, ar: String(x[1] || ''), unit: String(x[2] || 'g'), makes: Number(String(x[3]).replace(/[^0-9.]/g, '')) || 0,
      note: String(x[6] || ''), lines: lines[name] || [], group: g ? g[0] : 'other'};
  }).filter(function (x) { return x.lines.length > 1 });
}

function showRecipes() {
  drawRecipes();
  EB.read('kitchen', {'Kitchen recipes': 0, 'Kitchen lines': 0, 'Kitchen ingredients': 0}).then(function (r) { RC.data = r; RC.err = ''; drawRecipes() }, function (e) {
    RC.err = e.offline ? 'OFFLINE' : /Unknown tab|No sheet/i.test(e.message) ? '' : (e.message || String(e)); drawRecipes();
  });
}

// 1250 g -> "1.25 kg", 54 ml -> "54 ml", 0.8 piece -> "0.8"
function qty(n, u) {
  var r = function (v, d) { var p = Math.pow(10, d); return String(Math.round(v * p) / p) };
  if (u === 'piece') return '<b class="num">' + r(n, 1) + '</b>';
  if (n >= 1000) return '<b class="num">' + r(n / 1000, 2) + '</b> ' + (u === 'ml' ? bi('ليتر', 'L') : bi('كغ', 'kg'));
  return '<b class="num">' + r(n, n < 10 ? 1 : 0) + '</b> ' + (u === 'ml' ? bi('مل', 'ml') : bi('غ', 'g'));
}
function recTitle(x) { return bi(esc(x.ar || x.name), esc(x.name)) }
// what the recipe is for: its first line, e.g. "1 kg chicken breast"
function recBase(x, m) { var b = x.lines[0]; return qty(b.qty * m, b.unit) + ' ' + bi(esc(b.ar || b.use), esc(b.use)) }
function recMakes(x, m) {
  return x.unit === 'piece' ? '<b class="num">' + Math.floor(x.makes * m * 10) / 10 + '</b> ' + bi('قطعة', 'pieces') : qty(x.makes * m, 'g');
}

function drawRecipes() {
  var list = recData();
  if (RC.open && list) { var x = list.filter(function (y) { return y.name === RC.open })[0]; if (x) return drawRecipe(x) }
  var h = '<div class="shead"><h2 class="display">' + bi('الوصفات', 'Recipes') + '</h2></div>' +
    (RC.err === 'OFFLINE' ? '<p class="offline">' + bi('ما في إنترنت: هيدي الوصفات من آخر مرة.', 'No internet: these are the recipes from last time.') + '</p>' : RC.err ? '<p class="err">' + esc(RC.err) + '</p>' : '');
  if (!list) { $('#rec').innerHTML = h + '<p class="muted">' + bi('عم يحمّل…', 'Loading…') + '</p>'; return }
  var groups = RGROUPS.concat([['other', 'غير', 'Other']]).filter(function (g) { return list.some(function (x) { return x.group === g[0] }) });
  h += '<p class="muted xhint">' + bi('كل وصفة دجاج أو لحمة لكيلو واحد. افتح وصفة واختار ×2، ×5… لطبخة أكبر.',
    'Every chicken or beef recipe is for 1 kg. Open one and pick x2, x5… for a bigger batch.') + '</p>' +
    '<div class="modes rmodes">' + [['', 'الكل', 'All']].concat(groups).map(function (g) {
      return '<button data-rgroup="' + g[0] + '"' + (RC.group === g[0] ? ' class="on"' : '') + '>' + bi(g[1], g[2]) + '</button>' }).join('') + '</div>';
  h += groups.filter(function (g) { return !RC.group || RC.group === g[0] }).map(function (g) {
    return '<h3 class="display rgh">' + bi(g[1], g[2]) + '</h3><div class="rgrid">' + list.filter(function (x) { return x.group === g[0] }).map(function (x) {
      return '<button class="rcard" data-ropen="' + esc(x.name) + '"><b>' + recTitle(x) + '</b><small>' + recBase(x, 1) + ' → ' + recMakes(x, 1) + '</small></button>';
    }).join('') + '</div>';
  }).join('');
  $('#rec').innerHTML = h;
}

function drawRecipe(x) {
  var m = RC.mult;
  var h = '<div class="shead"><button class="nav" data-rback="1" aria-label="' + T('رجوع', 'Back') + '"><span class="chev">›</span></button><h2 class="display">' + recTitle(x) + '</h2></div>' +
    '<div class="card rhead"><div class="rmult">' + RMULTS.map(function (k) {
      return '<button data-rmult="' + k + '"' + (k === m ? ' class="on"' : '') + '>×' + (k === 0.5 ? '½' : k) + '</button>' }).join('') +
      '<label class="rcustom">×<input id="rMult" type="number" inputmode="decimal" min="0.1" step="0.5" value="' + (RMULTS.indexOf(m) < 0 ? m : '') + '" placeholder="…"></label></div>' +
    '<div class="rfor"><span>' + bi('لـ', 'For') + ' ' + recBase(x, m) + '</span><span>' + bi('بتطلع', 'Makes') + ' ' + recMakes(x, m) + '</span></div></div>';
  // the lines, by step: the main things first, then the marinade, the breading…
  var steps = [];
  x.lines.forEach(function (l) { if (steps.indexOf(l.step) < 0) steps.push(l.step) });
  h += steps.map(function (s) {
    return '<div class="card">' + (s ? '<h3 class="display">' + bi(STEP_AR[s] || esc(s), esc(s)) + '</h3>' : '') + '<table class="rtable rlines">' +
      x.lines.filter(function (l) { return l.step === s }).map(function (l) {
        return '<tr><td>' + bi(esc(l.ar || l.use), esc(l.use)) + '</td><td class="r">' + qty(l.qty * m, l.unit) + '</td></tr>';
      }).join('') + '</table></div>';
  }).join('');
  if (x.note) h += '<div class="card"><h3 class="display">' + bi('ملاحظات', 'Notes') + '</h3><p class="rnote" dir="ltr">' + esc(x.note) + '</p></div>';
  $('#rec').innerHTML = h;
}

$('#rec').addEventListener('click', function (ev) {
  var b = ev.target.closest('button'); if (!b) return;
  if (b.dataset.rgroup !== undefined) { RC.group = b.dataset.rgroup; return drawRecipes() }
  if (b.dataset.ropen) { RC.open = b.dataset.ropen; RC.mult = 1; $('#recView').scrollTop = 0; return drawRecipes() }
  if (b.dataset.rback) { RC.open = null; return drawRecipes() }
  if (b.dataset.rmult) { RC.mult = Number(b.dataset.rmult); return drawRecipes() }
});
$('#rec').addEventListener('change', function (ev) {
  if (ev.target.id !== 'rMult') return;
  var v = Number(ev.target.value); if (v > 0 && v <= 100) { RC.mult = v; drawRecipes() }
});
