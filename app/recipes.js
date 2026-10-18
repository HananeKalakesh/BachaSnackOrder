/* ---------- recipes: what goes into each menu item and preparation, and what it costs ----------
   Sheet tabs: Ingredients (what the shop buys, with the pack price), Recipes (one row per menu item or preparation,
   with what it makes and the steps) and Recipe Lines (what each recipe uses, in the used item's unit).
   The management app shows costs, food cost % and a suggested price; the cashier app shows staff the recipes only. */
var RC = {mode: 'menu', open: null, draft: null, data: null, err: '', locked: false};
var UNITS = [['g', 'غ', 'g'], ['ml', 'مل', 'ml'], ['piece', 'حبة', 'piece']];
function unitName(u) { var x = UNITS.filter(function (k) { return k[0] === u })[0]; return x ? bi(x[1], x[2]) : esc(u || '') }

// Ingredients and recipes from the sheet, with the changes made here that the copy doesn't have yet
function recData() {
  var r = RC.data || EB.cached('recipes');
  if (!r) return null;
  var ing = EB.withPending(EB.rows(r.Ingredients).filter(function (x) { return x.Ref && x.Name }).map(function (x) {
    return {key: String(x.Ref), name: String(x.Name).trim(), ar: String(x.Arabic || ''), unit: String(x.Unit || 'g'), pack: String(x.Pack || ''),
      size: Number(x['Pack size']) || 0, price: Number(x['Pack price']) || 0, cur: String(x.Currency || '$'), supplier: String(x.Supplier || '')};
  }), r.at, 'ingredient');
  var lines = {};
  EB.rows(r['Recipe Lines']).forEach(function (l) {
    if (!l.Recipe || !l.Uses) return;
    (lines[l.Recipe] = lines[l.Recipe] || []).push({use: String(l.Uses).trim(), qty: Number(l.Qty) || 0, n: Number(l.Line) || 0});
  });
  var rec = EB.withPending(EB.rows(r.Recipes).filter(function (x) { return x.Ref && x.Name }).map(function (x) {
    return {key: String(x.Ref), name: String(x.Name).trim(), ar: String(x.Arabic || ''), type: String(x.Type) === 'Prep' ? 'Prep' : 'Menu item',
      makes: Number(x.Makes) || 1, unit: String(x.Unit || 'piece'), steps: String(x.Steps || ''),
      lines: (lines[x.Ref] || []).sort(function (a, b) { return a.n - b.n }).map(function (l) { return {use: l.use, qty: l.qty} })};
  }), r.at, 'recipe');
  return {ing: ing, rec: rec};
}

/* ---------- costs (in L.L.) ---------- */
function packLbp(i) { return i.cur === '$' ? i.price * RATE : i.price }
// The cost of one unit (g, ml or piece) of an ingredient or a preparation; null when something in it has no price
function unitCost(d, name, seen) {
  var i = d.ing.filter(function (x) { return x.name === name })[0];
  if (i) return i.size > 0 && i.price > 0 ? packLbp(i) / i.size : null;
  var p = d.rec.filter(function (x) { return x.type === 'Prep' && x.name === name })[0];
  if (!p || (seen || []).indexOf(name) >= 0) return null;
  var c = recipeCost(d, p, (seen || []).concat(name));
  return c.missing.length ? null : c.total / (p.makes || 1);
}
function recipeCost(d, r, seen) {
  var total = 0, missing = [];
  r.lines.forEach(function (l) {
    var u = unitCost(d, l.use, seen || [r.name]);
    if (u == null) missing.push(l.use); else total += u * l.qty;
  });
  return {total: total, missing: missing};
}
function usedUnit(d, name) {
  var i = d.ing.filter(function (x) { return x.name === name })[0];
  if (i) return i.unit;
  var p = d.rec.filter(function (x) { return x.type === 'Prep' && x.name === name })[0];
  return p ? p.unit : '';
}
function usedAr(d, name) {
  var x = d.ing.concat(d.rec).filter(function (y) { return y.name === name })[0];
  return x && x.ar ? x.ar : name;
}
function priceOfItem(m) { return m.price || Math.round((m.usd || 0) * RATE) }
// Target: ingredients as a share of the selling price (Settings "Target food cost %", or what was set on this device)
function target() {
  var t = Number(store('elbash-target')) || Number(SET.target) || 30;
  return Math.max(5, Math.min(80, t));
}
// The price that meets the target, rounded up to 10,000 L.L.
function suggested(cost) { return Math.ceil(cost / (target() / 100) / 10000) * 10000 }
function pctClass(p) { return p <= target() ? 'ok' : p <= target() + 5 ? 'near' : 'over' }

/* ---------- the screen ---------- */
function showRecipes() {
  if (MANAGE && SET.pin) {
    if (!SET.loaded) { $('#rec').innerHTML = '<p class="muted">' + bi('عم يحمّل…', 'Loading…') + '</p>'; return }
    if (pin() !== SET.pin && !(/^\d+$/.test(pin()) && Number(pin()) === Number(SET.pin))) {
      RC.locked = true; var had = pin(); setPin('');
      return pinScreen(had ? bi('الرمز غلط', 'Wrong PIN') : '', '#rec', showRecipes, bi('الوصفات', 'Recipes'));
    }
  }
  RC.locked = false;
  drawRecipes();
  EB.read('recipes', {'Ingredients': 0, 'Recipes': 0, 'Recipe Lines': 0}).then(function (r) { RC.data = r; RC.err = ''; if (!RC.draft) drawRecipes() }, function (e) {
    if (/Unknown tab/.test(e.message)) { RC.data = {at: 0}; RC.err = 'SCRIPT' } else RC.err = e.offline ? 'OFFLINE' : (e.message || String(e));
    if (!RC.draft) drawRecipes();
  });
}

function recNote() {
  if (RC.err === 'SCRIPT') return '<p class="offline">' + bi('الوصفات محفوظة على هالجهاز لهلّق، وبتنبعت عالشيت لحالها بعد تحديث السكريبت.', 'Recipes are kept on this device for now, and go to the sheet by themselves once the script is updated.') + '</p>';
  if (RC.err === 'OFFLINE') return '<p class="offline">' + bi('ما في إنترنت: هيدي الوصفات من آخر مرة.', 'No internet: these are the recipes from last time.') + '</p>';
  if (RC.err) return '<p class="err">' + esc(RC.err) + '</p>';
  return '';
}

function drawRecipes() {
  if (RC.locked) return;
  var d = recData();
  if (RC.draft) return drawEditor(d);
  if (RC.open) return drawRecipe(d);
  var modes = [['menu', 'الأصناف', 'Menu items'], ['prep', 'التحضيرات', 'Preparations']].concat(MANAGE ? [['ing', 'المواد', 'Ingredients']] : []);
  var h = '<div class="shead"><h2 class="display">' + bi('الوصفات', 'Recipes') + '</h2></div>' + recNote() +
    '<div class="modes rmodes">' + modes.map(function (m) { return '<button data-rmode="' + m[0] + '"' + (RC.mode === m[0] ? ' class="on"' : '') + '>' + bi(m[1], m[2]) + '</button>' }).join('') + '</div>';
  if (!d) { $('#rec').innerHTML = h + '<p class="muted">' + bi('عم يحمّل…', 'Loading…') + '</p>'; return }
  if (RC.mode === 'menu') h += menuList(d);
  else if (RC.mode === 'prep') h += prepList(d);
  else h += ingList(d);
  $('#rec').innerHTML = h;
}

// Every menu item: its cost, price, food cost % and suggested price (management), or just whether it has a recipe (staff)
function menuList(d) {
  var items = MENU_ALL.filter(function (m) { return priceOfItem(m) > 0 }), h = '';
  if (MANAGE) h += '<div class="card rtarget"><label>' + bi('الهدف: كلفة المواد من سعر البيع', 'Target: ingredients as a share of the price') +
    ' <input id="rTarget" type="number" inputmode="numeric" min="5" max="80" value="' + target() + '"> %</label>' +
    '<small class="muted">' + bi('أخضر = ضمن الهدف · أصفر = قريب · أحمر = الكلفة عالية، فكّر تغيّر السعر', 'Green = on target · yellow = close · red = costs too much for its price') + '</small></div>';
  var cats = [];
  items.forEach(function (m) { if (cats.indexOf(m.cat) < 0) cats.push(m.cat) });
  h += cats.map(function (c) {
    return '<div class="card"><h3 class="display">' + esc(c) + '</h3><table class="rtable">' + (MANAGE ? '<tr><th></th><th class="r">' + bi('الكلفة', 'Cost') + '</th><th class="r">' + bi('السعر', 'Price') +
      '</th><th class="r">%</th><th class="r">' + bi('السعر المقترح', 'Suggested') + '</th></tr>' : '') +
      items.filter(function (m) { return m.cat === c }).map(function (m) {
        var r = d.rec.filter(function (x) { return x.type === 'Menu item' && x.name === m.name })[0];
        var name = '<td>' + bi(esc(m.ar || m.name), esc(m.name)) + (r ? '' : ' <small class="muted">· ' + bi('ما في وصفة', 'no recipe') + '</small>') + '</td>';
        if (!MANAGE) return '<tr class="rrow" data-ropen="' + esc(m.name) + '|Menu item">' + name + '</tr>';
        var cost = r ? recipeCost(d, r) : null, price = priceOfItem(m), p = cost && !cost.missing.length && cost.total ? cost.total / price * 100 : null;
        return '<tr class="rrow" data-ropen="' + esc(m.name) + '|Menu item">' + name +
          '<td class="r num">' + (cost ? (cost.missing.length ? '<span class="muted" title="' + esc(cost.missing.join(', ')) + '">?</span>' : $usd(cost.total)) : '–') + '</td>' +
          '<td class="r num">' + $usd(price) + '</td>' +
          '<td class="r num">' + (p == null ? '–' : '<b class="pct ' + pctClass(p) + '">' + Math.round(p) + '%</b>') + '</td>' +
          '<td class="r num">' + (p == null ? '–' : (p > target() ? '<b>' + $usd(suggested(cost.total)) + '</b><div class="muted">' + ll(suggested(cost.total)) + '</div>' : '<span class="muted">✓</span>')) + '</td></tr>';
      }).join('') + '</table></div>';
  }).join('');
  return h || '<p class="muted">' + bi('ما في أصناف بالمنيو', 'No menu items') + '</p>';
}

function prepList(d) {
  var preps = d.rec.filter(function (x) { return x.type === 'Prep' }).sort(function (a, b) { return a.name < b.name ? -1 : 1 });
  var h = MANAGE ? '<button class="save radd" data-rnew="Prep">+ ' + bi('تحضير جديد (صوص، تتبيلة، خلطة…)', 'New preparation (sauce, marinade, breading…)') + '</button>' : '';
  return h + '<div class="card"><table class="rtable">' + (preps.length ? preps.map(function (p) {
    var u = MANAGE ? unitCost(d, p.name) : null;
    return '<tr class="rrow" data-ropen="' + esc(p.name) + '|Prep"><td>' + bi(esc(p.ar || p.name), esc(p.name)) + '<div class="muted">' + bi('بيطلع ', 'Makes ') + '<span class="num">' + fmt(p.makes) + '</span> ' + unitName(p.unit) + '</div></td>' +
      (MANAGE ? '<td class="r num">' + (u == null ? '<span class="muted">?</span>' : costPer(u, p.unit)) + '</td>' : '') + '</tr>';
  }).join('') : '<tr><td class="muted">' + bi('لسا ما في تحضيرات', 'No preparations yet') + '</td></tr>') + '</table></div>';
}
// "$0.45 / 100 g" reads better than a cost per gram
function costPer(u, unit) {
  if (unit === 'piece') return $usd(u) + ' <small class="muted">/ ' + bi('حبة', 'piece') + '</small>';
  return $usd(u * 100) + ' <small class="muted">/ 100 ' + unitName(unit) + '</small>';
}

function ingList(d) {
  var e = RC.ingEdit || {}, h = '<div class="card addx"><h3 class="display">' + (e.key ? bi('عدّل المادة', 'Edit ingredient') : bi('زيد مادة', 'Add an ingredient')) + '</h3>' +
    '<div class="xform"><input id="iName" placeholder="' + esc(T('الاسم بالإنكليزي (مثلاً: Mayonnaise)', 'Name (e.g. Mayonnaise)')) + '" value="' + esc(e.name || '') + '">' +
    '<input id="iAr" placeholder="' + esc(T('الاسم بالعربي (مثلاً: مايونيز)', 'Arabic name')) + '" value="' + esc(e.ar || '') + '">' +
    '<div class="xamt"><input id="iSize" type="number" inputmode="decimal" min="0" step="any" placeholder="' + esc(T('الكمية بالعلبة/الكيس', 'Amount in one pack')) + '" value="' + (e.size || '') + '">' +
    '<div class="xcur">' + UNITS.map(function (u) { return '<button data-iunit="' + u[0] + '" class="' + ((e.unit || 'g') === u[0] ? 'on' : '') + '">' + bi(u[1], u[2]) + '</button>' }).join('') + '</div></div>' +
    '<div class="xamt"><input id="iPrice" type="number" inputmode="decimal" min="0" step="any" placeholder="' + esc(T('سعر العلبة/الكيس', 'Price of one pack')) + '" value="' + (e.price || '') + '">' +
    '<div class="xcur"><button data-icur="$" class="' + ((e.cur || '$') === '$' ? 'on' : '') + '">$</button><button data-icur="L.L." class="' + (e.cur === 'L.L.' ? 'on' : '') + '">L.L.</button></div></div>' +
    '<input id="iPack" placeholder="' + esc(T('شو العلبة؟ (مثلاً: سطل 4 كيلو) اختياري', 'What is the pack? (e.g. 4 kg tub) optional')) + '" value="' + esc(e.pack || '') + '">' +
    '<input id="iSupplier" placeholder="' + esc(T('من وين؟ (اختياري)', 'Supplier (optional)')) + '" value="' + esc(e.supplier || '') + '">' +
    '<p class="muted xhint" style="grid-column:1/-1">' + bi('مثلاً: مايونيز، سطل 4000 غ بـ 12$. الكيلو = 1000 غ، الليتر = 1000 مل.', 'e.g. Mayonnaise: a 4000 g tub for $12. 1 kg = 1000 g, 1 L = 1000 ml.') + '</p>' +
    '<button class="save" id="iSave">' + (e.key ? bi('احفظ التعديل', 'Save changes') : bi('احفظ المادة', 'Save ingredient')) + '</button>' +
    (e.key ? '<button class="ghost" id="iCancel">' + bi('إلغاء', 'Cancel') + '</button>' : '') + '<div class="err" id="iErr"></div></div></div>';
  var list = d.ing.slice().sort(function (a, b) { return a.name < b.name ? -1 : 1 });
  h += '<div class="card"><table class="rtable">' + (list.length ? '<tr><th></th><th>' + bi('العلبة', 'Pack') + '</th><th class="r">' + bi('الكلفة', 'Cost') + '</th><th></th></tr>' + list.map(function (i) {
    var u = i.size > 0 ? packLbp(i) / i.size : null;
    return '<tr class="rrow" data-iedit="' + esc(i.key) + '"><td>' + bi(esc(i.ar || i.name), esc(i.name)) + (i.supplier ? '<div class="muted">' + esc(i.supplier) + '</div>' : '') + '</td>' +
      '<td><span class="num">' + fmt(i.size) + '</span> ' + unitName(i.unit) + ' · <b class="num">' + (i.cur === '$' ? '$' + fmt2(i.price) : fmt(i.price) + ' L.L.') + '</b>' + (i.pack ? '<div class="muted">' + esc(i.pack) + '</div>' : '') + '</td>' +
      '<td class="r num">' + (u == null ? '?' : costPer(u, i.unit)) + '</td><td><button class="del" data-idel="' + esc(i.key) + '">' + bi('امسح', 'Delete') + '</button></td></tr>';
  }).join('') : '<tr><td class="muted">' + bi('لسا ما في مواد', 'No ingredients yet') + '</td></tr>') + '</table></div>';
  return h;
}
function fmt2(n) { return n % 1 ? n.toFixed(2) : fmt(n) }

// One recipe: what it uses and how to make it (staff see no costs)
function findRec(d, open) {
  var p = open.split('|'), r = d && d.rec.filter(function (x) { return x.name === p[0] && x.type === p[1] })[0];
  return {name: p[0], type: p[1], r: r};
}
function drawRecipe(d) {
  if (!d) return;
  var f = findRec(d, RC.open), r = f.r, m = MENU_ALL.filter(function (x) { return x.name === f.name })[0];
  var title = r ? (r.ar ? bi(esc(r.ar), esc(r.name)) : esc(r.name)) : m ? bi(esc(m.ar || m.name), esc(m.name)) : esc(f.name);
  var h = '<div class="shead"><button class="nav" data-rback="1" aria-label="' + T('رجوع', 'Back') + '"><span class="chev">›</span></button><h2 class="display">' + title + '</h2>' +
    (MANAGE ? '<button class="save redit" data-redit="1">' + (r ? bi('عدّل', 'Edit') : bi('اكتب الوصفة', 'Write the recipe')) + '</button>' : '') + '</div>';
  if (!r) { $('#rec').innerHTML = h + '<div class="card"><p class="muted">' + bi('لسا ما في وصفة لهالصنف.', 'No recipe for this yet.') + '</p></div>'; return }
  var cost = MANAGE ? recipeCost(d, r) : null;
  h += '<div class="cols"><div class="card"><h3 class="display">' + bi('المكوّنات', 'What goes in') + (r.type === 'Prep' ? ' <small class="muted">· ' + bi('بيطلع ', 'makes ') + '<span class="num">' + fmt(r.makes) + '</span> ' + unitName(r.unit) + '</small>' : '') + '</h3>' +
    '<table class="rtable">' + r.lines.map(function (l) {
      var u = MANAGE ? unitCost(d, l.use) : null, isPrep = d.rec.some(function (x) { return x.type === 'Prep' && x.name === l.use });
      return '<tr' + (isPrep ? ' class="rrow" data-ropen="' + esc(l.use) + '|Prep"' : '') + '><td>' + bi(esc(usedAr(d, l.use)), esc(l.use)) + (isPrep ? ' <small class="muted">↗</small>' : '') + '</td>' +
        '<td class="r"><b class="num">' + fmt2(l.qty) + '</b> ' + unitName(usedUnit(d, l.use)) + '</td>' +
        (MANAGE ? '<td class="r num">' + (u == null ? '<span class="muted">?</span>' : $usd(u * l.qty)) + '</td>' : '') + '</tr>';
    }).join('') + '</table>' +
    (MANAGE ? '<div class="rsum">' + bi('الكلفة', 'Cost') + ': <b class="num">' + $usd(cost.total) + '</b> <small class="muted num">' + ll(cost.total) + '</small>' +
      (r.type === 'Prep' && r.makes ? ' · <span class="num">' + costPer(cost.total / r.makes, r.unit) + '</span>' : '') +
      (r.type === 'Menu item' && m ? ' · ' + bi('السعر', 'Price') + ' <b class="num">' + $usd(priceOfItem(m)) + '</b> · <b class="pct ' + pctClass(cost.total / priceOfItem(m) * 100) + '">' + Math.round(cost.total / priceOfItem(m) * 100) + '%</b>' : '') +
      (cost.missing.length ? '<div class="err">' + bi('ناقص سعر: ', 'No price yet for: ') + esc(cost.missing.join(', ')) + '</div>' : '') + '</div>' : '') + '</div>' +
    '<div class="card"><h3 class="display">' + bi('طريقة التحضير', 'How to make it') + '</h3>' + (r.steps ? '<ol class="steps">' + r.steps.split(/\n+/).filter(function (x) { return x.trim() }).map(function (x) { return '<li>' + esc(x.replace(/^\s*\d+[.)-]\s*/, '')) + '</li>' }).join('') + '</ol>' : '<p class="muted">–</p>') + '</div></div>';
  $('#rec').innerHTML = h;
}

/* ---------- writing a recipe (management) ---------- */
function startEdit(d, f) {
  var r = f.r, m = MENU_ALL.filter(function (x) { return x.name === f.name })[0];
  RC.draft = r ? JSON.parse(JSON.stringify(r)) : {key: '', name: f.name, ar: f.type === 'Menu item' && m ? m.ar : '', type: f.type, makes: f.type === 'Prep' ? 1000 : 1, unit: f.type === 'Prep' ? 'g' : 'piece', steps: '', lines: []};
  if (!RC.draft.lines.length) RC.draft.lines.push({use: '', qty: ''});
  drawEditor(d);
}
function readDraft() {
  var x = RC.draft; if (!x || !$('#eSteps')) return;
  if ($('#eName')) x.name = $('#eName').value.trim();
  x.ar = $('#eAr').value.trim(); x.steps = $('#eSteps').value;
  if ($('#eMakes')) x.makes = Number($('#eMakes').value) || 0;
  x.lines = Array.prototype.map.call(document.querySelectorAll('.eline'), function (row) {
    return {use: row.querySelector('select').value, qty: row.querySelector('input').value};
  });
}
function drawEditor(d) {
  var x = RC.draft, isPrep = x.type === 'Prep';
  var opts = function (sel) {
    var ings = d ? d.ing.slice().sort(function (a, b) { return a.name < b.name ? -1 : 1 }) : [], preps = d ? d.rec.filter(function (p) { return p.type === 'Prep' && p.name !== x.name }) : [];
    return '<option value="">' + T('اختار…', 'Choose…') + '</option>' +
      (preps.length ? '<optgroup label="' + T('تحضيرات', 'Preparations') + '">' + preps.map(function (p) { return '<option' + (p.name === sel ? ' selected' : '') + ' value="' + esc(p.name) + '">' + esc(lang === 'ar' && p.ar ? p.ar + ' · ' + p.name : p.name) + '</option>' }).join('') + '</optgroup>' : '') +
      '<optgroup label="' + T('مواد', 'Ingredients') + '">' + ings.map(function (i) { return '<option' + (i.name === sel ? ' selected' : '') + ' value="' + esc(i.name) + '">' + esc(lang === 'ar' && i.ar ? i.ar + ' · ' + i.name : i.name) + '</option>' }).join('') + '</optgroup>' +
      (sel && !ings.concat(preps).some(function (y) { return y.name === sel }) ? '<option selected value="' + esc(sel) + '">' + esc(sel) + '</option>' : '');
  };
  var h = '<div class="shead"><button class="nav" data-rcancel="1" aria-label="' + T('إلغاء', 'Cancel') + '"><span class="chev">›</span></button><h2 class="display">' +
    (isPrep ? (x.key ? bi('عدّل التحضير', 'Edit preparation') : bi('تحضير جديد', 'New preparation')) : bi('وصفة: ', 'Recipe: ') + esc(x.name)) + '</h2></div>' +
    '<div class="card addx"><div class="xform">' +
    (isPrep ? '<input id="eName" placeholder="' + esc(T('الاسم بالإنكليزي (مثلاً: Garlic sauce)', 'Name (e.g. Garlic sauce)')) + '" value="' + esc(x.name) + '">' : '') +
    '<input id="eAr" placeholder="' + esc(T('الاسم بالعربي', 'Arabic name')) + '" value="' + esc(x.ar) + '">' +
    (isPrep ? '<div class="xamt"><input id="eMakes" type="number" inputmode="decimal" min="0" step="any" placeholder="' + esc(T('قدّيش بيطلع؟', 'How much does it make?')) + '" value="' + (x.makes || '') + '">' +
      '<div class="xcur">' + UNITS.map(function (u) { return '<button data-eunit="' + u[0] + '" class="' + (x.unit === u[0] ? 'on' : '') + '">' + bi(u[1], u[2]) + '</button>' }).join('') + '</div></div>' : '') +
    '</div><h3 class="display" style="margin-top:16px">' + bi('المكوّنات', 'What goes in') + '</h3><p class="muted xhint">' + bi('الكمية بوحدة المادة: غرام، مل أو حبة.', 'Amounts in the item\'s own unit: grams, ml or pieces.') + '</p>' +
    x.lines.map(function (l, i) {
      return '<div class="eline"><select>' + opts(l.use) + '</select><input type="number" inputmode="decimal" min="0" step="any" placeholder="' + esc(T('الكمية', 'Amount')) + '" value="' + esc(String(l.qty)) + '">' +
        '<span class="eunit">' + (d && l.use ? unitName(usedUnit(d, l.use)) : '') + '</span><button class="del" data-eline="' + i + '" aria-label="' + T('شيل', 'Remove') + '">✕</button></div>';
    }).join('') +
    '<button class="ghost" data-eadd="1">+ ' + bi('زيد مكوّن', 'Add a line') + '</button>' +
    '<p class="muted xhint">' + bi('مش لاقي المادة؟ زيدها بـ «المواد» أو اعمل تحضير جديد.', 'Missing something? Add it under Ingredients, or make it a preparation.') + '</p>' +
    '<h3 class="display" style="margin-top:16px">' + bi('طريقة التحضير', 'How to make it') + '</h3>' +
    '<textarea id="eSteps" rows="7" placeholder="' + esc(T('كل خطوة بسطر…', 'One step per line…')) + '">' + esc(x.steps) + '</textarea>' +
    '<div class="rsum" id="eCost"></div>' +
    '<button class="save" id="eSave">' + bi('احفظ الوصفة', 'Save recipe') + '</button><div class="err" id="eErr"></div>' +
    (x.key ? '<button class="del" id="eDel" style="margin-top:8px">' + bi('امسح هالوصفة', 'Delete this recipe') + '</button>' : '') + '</div>';
  $('#rec').innerHTML = h;
  draftCost(d);
}
// The cost while typing
function draftCost(d) {
  if (!d || !$('#eCost')) return;
  readDraft();
  var x = RC.draft, lines = x.lines.filter(function (l) { return l.use && Number(l.qty) > 0 }).map(function (l) { return {use: l.use, qty: Number(l.qty)} });
  var c = recipeCost(d, {name: x.name, lines: lines}), m = MENU_ALL.filter(function (y) { return y.name === x.name })[0];
  var h = bi('الكلفة', 'Cost') + ': <b class="num">' + $usd(c.total) + '</b> <small class="muted num">' + ll(c.total) + '</small>';
  if (x.type === 'Prep' && x.makes) h += ' · <span class="num">' + costPer(c.total / x.makes, x.unit) + '</span>';
  if (x.type === 'Menu item' && m && c.total) {
    var p = c.total / priceOfItem(m) * 100;
    h += ' · ' + bi('السعر', 'Price') + ' <b class="num">' + $usd(priceOfItem(m)) + '</b> · <b class="pct ' + pctClass(p) + '">' + Math.round(p) + '%</b>' +
      (p > target() ? ' · ' + bi('المقترح ', 'suggested ') + '<b class="num">' + $usd(suggested(c.total)) + '</b>' : '');
  }
  if (c.missing.length) h += '<div class="err">' + bi('ناقص سعر: ', 'No price yet for: ') + esc(c.missing.join(', ')) + '</div>';
  $('#eCost').innerHTML = h;
}

function saveDraft(d) {
  readDraft();
  var x = RC.draft, err = function (ar, en) { $('#eErr').innerHTML = bi(ar, en) };
  var lines = x.lines.filter(function (l) { return l.use && Number(l.qty) > 0 }).map(function (l) { return {use: l.use, qty: Number(l.qty)} });
  if (!x.name) return err('اكتب الاسم', 'Enter the name');
  if (x.type === 'Prep' && !(x.makes > 0)) return err('اكتب قدّيش بيطلع', 'Enter how much it makes');
  if (x.type === 'Prep' && !/^[A-Za-z]/.test(x.name)) return err('الاسم بالإنكليزي لازم يبلّش بحرف', 'The English name should start with a letter');
  if (x.type === 'Prep' && d && d.ing.concat(d.rec.filter(function (r) { return r.type === 'Prep' })).some(function (y) { return y.name.toLowerCase() === x.name.toLowerCase() && y.key !== x.key }))
    return err('في شي بنفس الاسم', 'Something already has this name');
  var isNew = !x.key, old = !isNew && d && d.rec.filter(function (r) { return r.key === x.key })[0]; if (isNew) x.key = 'rc' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  var rec = {key: x.key, name: x.name, ar: x.ar, type: x.type, makes: x.type === 'Prep' ? x.makes : 1, unit: x.type === 'Prep' ? x.unit : 'piece', steps: x.steps.trim(), lines: lines};
  var row = {'Name': rec.name, 'Arabic': rec.ar, 'Type': rec.type, 'Makes': rec.makes, 'Unit': rec.unit, 'Steps': rec.steps, 'Ref': rec.key};
  var lineRows = lines.map(function (l, i) { return {'Recipe': rec.key, 'Recipe name': rec.name, 'Uses': l.use, 'Qty': l.qty, 'Unit': d ? usedUnit(d, l.use) : '', 'Line': i + 1} });
  var ops = isNew ? [{op: 'append', tab: 'Recipes', rows: [row], unique: 'Ref'}]
    : [{op: 'update', tab: 'Recipes', where: {'Ref': rec.key}, set: row}, {op: 'remove', tab: 'Recipe Lines', where: {'Recipe': rec.key}}];
  if (lineRows.length) ops.push({op: 'append', tab: 'Recipe Lines', rows: lineRows});
  // renamed: the recipes that use it follow
  if (old && old.name !== rec.name) ops.push({op: 'update', tab: 'Recipe Lines', where: {'Uses': old.name}, set: {'Uses': rec.name}});
  EB.send(ops, {t: isNew ? 'save' : 'edit', kind: 'recipe', key: rec.key, order: rec});
  toast('انحفظت الوصفة', 'Recipe saved');
  RC.draft = null; RC.open = rec.name + '|' + rec.type; RC.mode = rec.type === 'Prep' ? 'prep' : 'menu';
  drawRecipes();
}

function saveIng(d) {
  var e = RC.ingEdit || {}, err = function (ar, en) { $('#iErr').innerHTML = bi(ar, en) };
  var i = {key: e.key || 'in' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name: $('#iName').value.trim(), ar: $('#iAr').value.trim(),
    unit: e.unit || 'g', size: Number($('#iSize').value) || 0, price: Number($('#iPrice').value) || 0, cur: e.cur || '$', pack: $('#iPack').value.trim(), supplier: $('#iSupplier').value.trim()};
  if (!/^[A-Za-z]/.test(i.name)) return err('اكتب الاسم بالإنكليزي', 'Enter the name in English');
  if (d.ing.concat(d.rec.filter(function (r) { return r.type === 'Prep' })).some(function (y) { return y.name.toLowerCase() === i.name.toLowerCase() && y.key !== i.key })) return err('في شي بنفس الاسم', 'Something already has this name');
  if (!(i.size > 0)) return err('اكتب الكمية بالعلبة', 'Enter how much is in one pack');
  if (!(i.price > 0)) return err('اكتب السعر', 'Enter the price');
  var row = {'Name': i.name, 'Arabic': i.ar, 'Unit': i.unit, 'Pack': i.pack, 'Pack size': i.size, 'Pack price': i.price, 'Currency': i.cur, 'Supplier': i.supplier, 'Ref': i.key,
    'Updated': "'" + EB.ymd(new Date())};
  var old = e.key && d.ing.filter(function (y) { return y.key === e.key })[0];
  if (e.key) EB.send([{op: 'update', tab: 'Ingredients', where: {'Ref': i.key}, set: row}].concat(old && old.name !== i.name ?
    [{op: 'update', tab: 'Recipe Lines', where: {'Uses': old.name}, set: {'Uses': i.name, 'Unit': i.unit}}] : []), {t: 'edit', kind: 'ingredient', key: i.key, order: i});
  else EB.send([{op: 'append', tab: 'Ingredients', rows: [row], unique: 'Ref'}], {t: 'save', kind: 'ingredient', key: i.key, order: i});
  toast('انحفظت المادة', 'Ingredient saved');
  RC.ingEdit = null; drawRecipes();
}

$('#rec').addEventListener('click', function (ev) {
  if (RC.locked) return;
  var b = ev.target.closest('button,[data-ropen],[data-iedit]'); if (!b) return;
  var d = recData();
  if (b.dataset.rmode) { RC.mode = b.dataset.rmode; return drawRecipes() }
  if (b.dataset.idel) {
    var gone = d.ing.filter(function (x) { return x.key === b.dataset.idel })[0];
    var used = d.rec.filter(function (r) { return r.lines.some(function (l) { return l.use === gone.name }) }).map(function (r) { return r.name });
    if (!confirm(T('تمسح ' + (gone.ar || gone.name) + '؟', 'Delete ' + gone.name + '?') + (used.length ? '\n' + T('مستعملة ب: ', 'Used in: ') + used.join(', ') : ''))) return;
    EB.send([{op: 'remove', tab: 'Ingredients', where: {'Ref': gone.key}}], {t: 'delete', kind: 'ingredient', key: gone.key});
    return drawRecipes();
  }
  if (b.dataset.iedit) { RC.ingEdit = JSON.parse(JSON.stringify(d.ing.filter(function (x) { return x.key === b.dataset.iedit })[0])); drawRecipes(); $('#rec').scrollIntoView(); return }
  if (b.dataset.iunit || b.dataset.icur) {
    var keep = {name: $('#iName').value, ar: $('#iAr').value, size: $('#iSize').value, price: $('#iPrice').value, pack: $('#iPack').value, supplier: $('#iSupplier').value};
    RC.ingEdit = Object.assign(RC.ingEdit || {}, keep, b.dataset.iunit ? {unit: b.dataset.iunit} : {cur: b.dataset.icur});
    return drawRecipes();
  }
  if (b.id === 'iSave') return saveIng(d);
  if (b.id === 'iCancel') { RC.ingEdit = null; return drawRecipes() }
  if (b.dataset.ropen) { RC.open = b.dataset.ropen; drawRecipes(); return $('#recView').scrollTo(0, 0) }
  if (b.dataset.rback) { RC.open = null; return drawRecipes() }
  if (b.dataset.rnew) return startEdit(d, {name: '', type: 'Prep', r: null});
  if (b.dataset.redit) return startEdit(d, findRec(d, RC.open));
  if (b.dataset.rcancel) { RC.draft = null; return drawRecipes() }
  if (b.dataset.eunit) { readDraft(); RC.draft.unit = b.dataset.eunit; return drawEditor(d) }
  if (b.dataset.eadd) { readDraft(); RC.draft.lines.push({use: '', qty: ''}); drawEditor(d); var s = document.querySelectorAll('.eline select'); s[s.length - 1].focus(); return }
  if (b.dataset.eline) { readDraft(); RC.draft.lines.splice(+b.dataset.eline, 1); return drawEditor(d) }
  if (b.id === 'eSave') return saveDraft(d);
  if (b.id === 'eDel') {
    if (!confirm(T('تمسح هالوصفة؟', 'Delete this recipe?'))) return;
    EB.send([{op: 'remove', tab: 'Recipes', where: {'Ref': RC.draft.key}}, {op: 'remove', tab: 'Recipe Lines', where: {'Recipe': RC.draft.key}}], {t: 'delete', kind: 'recipe', key: RC.draft.key});
    RC.draft = null; RC.open = null; return drawRecipes();
  }
});
$('#rec').addEventListener('input', function (ev) {
  if (ev.target.id === 'rTarget') { var v = Number(ev.target.value); if (v >= 5 && v <= 80) { store('elbash-target', String(v)); clearTimeout(RC.t); RC.t = setTimeout(drawRecipes, 600) } return }
  if (RC.draft) draftCost(recData());
});
$('#rec').addEventListener('change', function (ev) {
  // a new line item: show its unit
  if (RC.draft && ev.target.matches('.eline select')) { readDraft(); drawEditor(recData()) }
});
