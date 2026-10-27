/* ---------- item changes on the cashier's ticket (no lettuce, on Arabic bread, + mozzarella patty…) ----------
   The same changes the menu website offers (index.html, "adjustments"): each item gets those that fit it, from its
   description. A change is written in Arabic with the item, in the same place as its sauces, so the kitchen screen and
   the receipt show it under the item. Paid changes are items of their own in the Menu tab and go on the ticket as a
   line: Extra Mozzarella Patty, and Bread Change when an Arabic-bread sandwich goes on sub bread or tortilla.
   The descriptions are the Menu tab's (Description), the same the website shows. */
var ADJ = {
  'no-garlic': ['No garlic', 'بلا ثوم'], 'no-pickles': ['No pickles', 'بلا كبيس'], 'no-coleslaw': ['No coleslaw', 'بلا سلطة'],
  'no-lettuce': ['No lettuce', 'بلا خس'], 'no-corn': ['No corn', 'بلا ذرة'], 'no-cocktail': ['No cocktail sauce', 'بلا كوكتيل'],
  'no-mayo': ['No mayo', 'بلا مايونيز'], 'no-ketchup': ['No ketchup', 'بلا كاتشاب'], 'no-fries': ['No fries inside', 'بلا بطاطا'],
  'no-tomato': ['No tomato', 'بلا بندورة'], 'no-onion': ['No onion', 'بلا بصل'], 'no-rocca': ['No rocca', 'بلا جرجير'],
  'no-mushroom': ['No mushroom', 'بلا فطر'], 'no-cheese': ['No cheese', 'بلا جبنة'], 'no-peppers': ['No peppers', 'بلا فليفلة'],
  'no-guacamole': ['No guacamole', 'بلا غواكامولي'],
  'bread-arabic': ['On Arabic bread', 'على عربي'], 'bread-sub': ['On sub bread', 'على فرنجي'], 'bread-tortilla': ['On tortilla', 'على تورتيلا'],
  'cocktail-not-garlic': ['Cocktail sauce instead of garlic', 'كوكتيل بدل الثوم'],
  'add-patty': ['Add a mozzarella patty', 'زيد باتي موزاريلا']
};
var ADJ_PAID = {'add-patty': 'Extra Mozzarella Patty', 'bread-up': 'Bread Change'};
var ADJ_BREAD = {'Shawarma Sandwich': 'arabic', 'Tawouk Sandwich': 'arabic', 'Chicken Kebab Sandwich': 'arabic', 'Broasted Sandwich': 'arabic',
  'Crispy Sandwich': 'sub', 'Escalope Sandwich': 'sub', 'Chicken Sub Sandwich': 'sub', 'Francisco Sandwich': 'sub', 'Mushroom Steak Sandwich': 'sub',
  'Vegetable Steak Sandwich': 'sub', 'Hausa Sandwich': 'sub', 'Fries Sandwich': 'sub', 'Zinger Sandwich': 'tender', 'Cordon Bleu Sandwich': 'tender',
  'Fajita Sandwich': 'fajita', 'Philadelphia Sandwich': 'fajita', 'Grilled Chicken Sandwich': 'brown'};
var ADJ_NO = [[/garlic (sauce|paste)/, 'no-garlic'], [/pickles/, 'no-pickles'], [/coleslaw/, 'no-coleslaw'], [/lettuce/, 'no-lettuce'],
  [/\bcorn\b/, 'no-corn'], [/cocktail sauce/, 'no-cocktail'], [/\bmayo\b/, 'no-mayo'], [/ketchup/, 'no-ketchup'], [/tomato/, 'no-tomato'],
  [/onion/, 'no-onion'], [/rocca/, 'no-rocca'], [/mushroom/, 'no-mushroom'], [/cheese|cheddar|mozzarella(?! patty)/, 'no-cheese'],
  [/peppers/, 'no-peppers'], [/guacamole/, 'no-guacamole']];
var ADJ_GROUPS = [['بلا', 'Without', /^no-/], ['الخبز', 'Bread', /^bread-/], ['الصوص', 'Sauce', /-not-/], ['إضافات', 'Extras', /^add-/]];
// the website's group of each menu category (index.html, GRID_OF): which changes fit is decided from it
var ADJ_GROUP = {'Meals': 'mealGrid', 'Family Meals': 'familyGrid', 'Plates': 'plateGrid', 'Chicken Sandwiches': 'sandwichChickenGrid',
  'Beef Sandwiches': 'sandwichBeefGrid', 'Other Sandwiches': 'sandwichOtherGrid', 'Chicken Burgers': 'burgerChickenGrid', 'Beef Burgers': 'burgerBeefGrid'};

// [website group, description] for a ticket item, from the Menu tab: its own Description, or its card's
// ('Crispy Meal 7 PCS' -> the first "Crispy Meal" row that has one)
function adjDesc(name) {
  var all = MENU_ALL || [], me = null, d = '';
  all.forEach(function (m) { if (m.name === name) me = m });
  if (!me || !ADJ_GROUP[me.cat]) return null;
  var key = me.card || me.name;
  all.forEach(function (m) { if (!d && (m.card || m.name) === key && m.desc) d = m.desc });
  return d ? [ADJ_GROUP[me.cat], d] : null;
}function adjOptions(name) {
  var d0 = adjDesc(name), out = [];
  if (!d0) return out;
  var g = d0[0], d = d0[1].toLowerCase(), sandwich = /sandwich/i.test(g), burger = /burger/i.test(g);
  ADJ_NO.forEach(function (x) { if (x[0].test(d) && out.indexOf(x[1]) < 0) out.push(x[1]) });
  if ((sandwich || burger) && /fries/.test(d)) out.push('no-fries');
  if (sandwich) {
    var has = 'bread-' + (ADJ_BREAD[name] || (/arabic bread/.test(d) ? 'arabic' : /submarine/.test(d) ? 'sub' : ''));
    ['bread-arabic', 'bread-sub', 'bread-tortilla'].forEach(function (b) { if (b !== has) out.push(b) });
  }
  if (burger && !/mozzarella patty/i.test(name + ' ' + d) && adjMenuIndex(ADJ_PAID['add-patty']) >= 0) out.push('add-patty');
  if (/meal/i.test(g) && /garlic/.test(d) && !/sandwich/i.test(d)) out.push('cocktail-not-garlic');
  return out;
}
function adjMenuIndex(name) { for (var i = 0; i < MENU.length; i++) if (MENU[i].name === name && !MENU[i].soldOut) return i; return -1 }
var ADJ_WORDS = {}; Object.keys(ADJ).forEach(function (c) { ADJ_WORDS[ADJ[c][1]] = c });
// a ticket line's sauces split into real sauces, change codes and a free note ('ملاحظة: …')
function adjSplit(sauces) {
  var r = {sauces: [], codes: [], note: ''};
  sauces.forEach(function (s) { if (ADJ_WORDS[s]) r.codes.push(ADJ_WORDS[s]); else if (/^✎ /.test(s)) r.note = s.slice(2); else r.sauces.push(s) });
  return r;
}

/* ---------- the change sheet ---------- */
var ADJ_ON = null;   // {key, codes: [], all: true}
function askAdjust(key) {
  var l = lineOf(key), opts = adjOptions(l.it.name), cur = adjSplit(l.sauces);
  ADJ_ON = {key: key, codes: cur.codes.slice(), opts: opts, all: true};
  $('#ajT').innerHTML = bi(l.it.ar || l.it.name, l.it.name);
  $('#ajNote').value = cur.note;
  $('#ajQty').innerHTML = cart[key] > 1 ? '<button class="chip' + (ADJ_ON.all ? '' : ' on') + '" data-one="1">' + bi('واحد بس', 'Only one') + '</button><button class="chip' + (ADJ_ON.all ? ' on' : '') + '" data-one="0">' + bi('الـ ' + cart[key] + ' كلّن', 'All ' + cart[key]) + '</button>' : '';
  drawAdjust();
  $('#adjSheet').hidden = false;
}
function drawAdjust() {
  var o = ADJ_ON;
  $('#ajC').innerHTML = o.opts.length ? ADJ_GROUPS.map(function (g) {
    var mine = o.opts.filter(function (c) { return g[2].test(c) }); if (!mine.length) return '';
    return '<div class="ajg"><b>' + bi(g[0], g[1]) + '</b><div class="chips">' + mine.map(function (c) {
      return '<button class="chip' + (o.codes.indexOf(c) >= 0 ? ' on' : '') + '" data-c="' + c + '">' + bi(ADJ[c][1], ADJ[c][0]) + '</button>' }).join('') + '</div></div>';
  }).join('') : '<p class="muted">' + bi('ما في تغييرات جاهزة لهالصنف: اكتب ملاحظة.', 'No ready changes for this item: write a note.') + '</p>';
  $('#ajQty').querySelectorAll('[data-one]').forEach(function (b) { b.classList.toggle('on', (b.dataset.one === '0') === o.all) });
}
document.addEventListener('DOMContentLoaded', function () {
  $('#ajC').addEventListener('click', function (e) {
    var b = e.target.closest('[data-c]'); if (!b) return;
    var c = b.dataset.c, o = ADJ_ON, at = o.codes.indexOf(c);
    if (at >= 0) o.codes.splice(at, 1);
    else { if (/^bread-/.test(c)) o.codes = o.codes.filter(function (x) { return !/^bread-/.test(x) }); o.codes.push(c) }
    drawAdjust();
  });
  $('#ajQty').addEventListener('click', function (e) { var b = e.target.closest('[data-one]'); if (b) { ADJ_ON.all = b.dataset.one === '0'; drawAdjust() } });
  $('#ajX').addEventListener('click', function () { $('#adjSheet').hidden = true; ADJ_ON = null });
  $('#adjSheet').addEventListener('click', function (e) { if (e.target.id === 'adjSheet') { $('#adjSheet').hidden = true; ADJ_ON = null } });
  $('#ajOk').addEventListener('click', function () {
    var o = ADJ_ON, l = lineOf(o.key), cur = adjSplit(l.sauces), n = o.all ? cart[o.key] : 1;
    var note = $('#ajNote').value.replace(/[|+]/g, ' ').trim().slice(0, 40);
    var order = o.opts.filter(function (c) { return o.codes.indexOf(c) >= 0 });   // the changes in the menu's order
    var sauces = cur.sauces.concat(order.map(function (c) { return ADJ[c][1] })).concat(note ? ['✎ ' + note] : []);
    var nk = l.i + (sauces.length ? '|' + sauces.join('+') : '');
    // paid changes added now (not those the line already had)
    var paid = [];
    if (order.indexOf('add-patty') >= 0 && cur.codes.indexOf('add-patty') < 0) paid.push(ADJ_PAID['add-patty']);
    var arabicBefore = ADJ_BREAD[l.it.name] === 'arabic', upNow = order.some(function (c) { return c === 'bread-sub' || c === 'bread-tortilla' }),
      upBefore = cur.codes.some(function (c) { return c === 'bread-sub' || c === 'bread-tortilla' });
    if (arabicBefore && upNow && !upBefore) paid.push(ADJ_PAID['bread-up']);
    if (nk !== o.key) {
      cart[o.key] -= n; if (cart[o.key] <= 0) delete cart[o.key];
      cart[nk] = (cart[nk] || 0) + n;
    }
    paid.forEach(function (name) { var i = adjMenuIndex(name); if (i >= 0) cart[String(i)] = (cart[String(i)] || 0) + n });
    $('#adjSheet').hidden = true; ADJ_ON = null;
    renderGrid(); renderCart();
  });
});
