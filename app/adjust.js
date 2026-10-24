/* ---------- item changes on the cashier's ticket (no lettuce, on Arabic bread, + mozzarella patty…) ----------
   The same changes the menu website offers (index.html, "adjustments"): each item gets those that fit it, from its
   description. A change is written in Arabic with the item, in the same place as its sauces, so the kitchen screen and
   the receipt show it under the item. Paid changes are items of their own in the Menu tab and go on the ticket as a
   line: Extra Mozzarella Patty, and Bread Change when an Arabic-bread sandwich goes on sub bread or tortilla.
   ADJ_DESC is copied from the website's menu descriptions: when a description changes there, copy it here too. */
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
var ADJ_DESC = {"Crispy Meal": ["mealGrid", "Crispy chicken, fries, garlic sauce, pickles, coleslaw"], "Zinger Meal": ["mealGrid", "Spicy zinger chicken, fries, garlic sauce, pickles, coleslaw"], "Escalope Meal 3 PCS": ["mealGrid", "Escalope chicken, fries, garlic sauce, pickles, coleslaw"], "Cordon Bleu Meal 2 PCS": ["mealGrid", "Cheese stuffed chicken, fries, garlic sauce, pickles, coleslaw"], "Half Broasted Meal 5 PCS": ["mealGrid", "Broasted chicken, fries, garlic sauce, pickles, coleslaw"], "Wings Meal": ["mealGrid", "Chicken wings, fries, garlic sauce, pickles, coleslaw"], "Chicken Quesadilla": ["mealGrid", "Sandwich on tortilla bread cut into pieces, with fries and sauce"], "Tawouk Meal": ["mealGrid", "Tawouk chicken sandwich on tortilla bread cut into pieces, with fries, coleslaw, pickles and garlic sauce"], "Shawarma Meal": ["mealGrid", "Shawarma chicken sandwich on tortilla bread cut into pieces, with fries, pickles and garlic sauce"], "Escalope Family Meal 8 PCS": ["familyGrid", "Escalope chicken, fries, garlic sauce, pickles and coleslaw"], "Zinger Family Meal 20-22 PCS": ["familyGrid", "Zinger chicken, fries, garlic sauce, pickles and coleslaw"], "Crispy Family Meal 20-22 PCS": ["familyGrid", "Crispy chicken, fries, garlic sauce, pickles and coleslaw"], "Half & Half Family Meal 20-22 PCS": ["familyGrid", "10-11 zinger pieces and 10-11 crispy pieces, with fries, garlic sauce, pickles and coleslaw"], "Broasted Family Meal 10 PCS": ["familyGrid", "Broasted chicken, fries, garlic sauce, pickles and coleslaw"], "Shawarma Family Meal": ["familyGrid", "Chicken shawarma and fries"], "Tawouk Family Meal": ["familyGrid", "Tawouk chicken and fries"], "Fajita Family Meal": ["familyGrid", "Chicken fajita and fries"], "Wings Family Meal 1 KG": ["familyGrid", "Chicken wings and fries"], "Boneless Chicken Thighs Family Meal": ["familyGrid", "Boneless chicken thighs and fries"], "Shawarma Plate": ["plateGrid", "Shawarma chicken, fries, garlic sauce and pickles"], "Tawouk Plate": ["plateGrid", "Tawouk chicken, fries, coleslaw, garlic sauce and pickles"], "Grilled Chicken Plate": ["plateGrid", "Grilled chicken, grilled vegetables, lettuce, corn and pickles"], "Shawarma Sandwich": ["sandwichChickenGrid", "Chicken shawarma, garlic paste, pickles and fries"], "Tawouk Sandwich": ["sandwichChickenGrid", "Tawouk chicken, garlic paste, pickles, fries, coleslaw and ketchup"], "Crispy Sandwich": ["sandwichChickenGrid", "Crispy chicken, garlic paste, fries, coleslaw"], "Zinger Sandwich": ["sandwichChickenGrid", "Fried zinger chicken, cocktail sauce, pickles, lettuce, corn"], "Escalope Sandwich": ["sandwichChickenGrid", "Escalope chicken, garlic paste, pickles, fries, coleslaw and ketchup"], "Fajita Sandwich": ["sandwichChickenGrid", "Chicken fajita, guacamole, pickles, cocktail sauce, cheese"], "Chicken Sub Sandwich": ["sandwichChickenGrid", "Chicken, mayo, garlic paste, lettuce, pickles on submarine bread"], "Francisco Sandwich": ["sandwichChickenGrid", "Fresh chicken, cheese, garlic paste, lettuce, pickles and cocktail sauce on bread"], "Grilled Chicken Sandwich": ["sandwichChickenGrid", "Grilled chicken, garlic paste, lettuce, corn, pickles and cocktail sauce on brown bread"], "Chicken Kebab Sandwich": ["sandwichChickenGrid", "Chicken kebab, fries, pickles, garlic sauce on arabic bread"], "Broasted Sandwich": ["sandwichChickenGrid", "Broasted chicken, fries, pickles, coleslaw, ketchup, garlic paste on Arabic bread"], "Cordon Bleu Sandwich": ["sandwichChickenGrid", "Cheese stuffed chicken with cocktail sauce, lettuce, corn and pickles"], "Philadelphia Sandwich": ["sandwichBeefGrid", "Fillet steak, mixed peppers, onion, mozzarella, pickles and mayo on submarine bread"], "Mushroom Steak Sandwich": ["sandwichBeefGrid", "Fillet steak, mushroom, cheese, pickles and mayo on submarine bread"], "Vegetable Steak Sandwich": ["sandwichBeefGrid", "Steak, grilled onion, grilled tomato, pickles, mayo and rocca on submarine bread"], "Hausa Sandwich": ["sandwichBeefGrid", "Spicy beef with hausa spices, grilled tomato, grilled onion, rocca, mayo"], "Classic Chicken Burger": ["burgerChickenGrid", "Chicken burger, cocktail sauce, pickles, coleslaw, fries and ketchup"], "Mozzarella Patty Burger": ["burgerChickenGrid", "Chicken burger, mozzarella patty, cocktail sauce, pickles, coleslaw and fries"], "Crunchy Burger": ["burgerChickenGrid", "Fried chicken, cocktail sauce, pickles, lettuce, cheddar sauce on burger bun"], "Crunchy Burger with Mozzarella Patty": ["burgerChickenGrid", "Fried chicken, mozzarella patty, cocktail sauce, pickles, lettuce, cheddar"], "Classic Beef Burger": ["burgerBeefGrid", "Beef burger, fries, coleslaw, ketchup and cocktail sauce"], "Basha Burger": ["burgerBeefGrid", "Beef burger, caramelized onion, cheddar slice and cocktail sauce"], "Mushroom Burger": ["burgerBeefGrid", "Beef burger, mushroom sauce, cheese, cocktail sauce"]};

// [website group, description] for a ticket item ('Crispy Meal 7 PCS' -> the 'Crispy Meal' card)
function adjDesc(name) {
  return ADJ_DESC[name] || ADJ_DESC[name.replace(/ (\d+(-\d+)? PCS|1\/2 KG|1 KG)$/, '')] || ADJ_DESC[name.replace(/^Half /, '').replace(/ \d+ PCS$/, '')] || null;
}
function adjOptions(name) {
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
