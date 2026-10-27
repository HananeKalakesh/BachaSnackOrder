/* ---------- language ---------- */
function setLang(l) {
  lang = l === 'en' ? 'en' : 'ar'; store(LKEY, lang);
  document.body.className = 'lang-' + lang;
  document.documentElement.lang = lang; document.documentElement.dir = lang === 'en' ? 'ltr' : 'rtl';
  $('#note').placeholder = T('ملاحظة (اختياري)', 'Note (optional)');
  $('#cname').placeholder = T('الاسم (اختياري)', 'Name (optional)');
  if (TD.loaded) drawOrders();
  if (MENU.length) renderGrid();
}
$('#lang').addEventListener('click', function () { setLang(lang === 'en' ? 'ar' : 'en') });

function start() { loadMenu(); loadRecent().then(checkWeb, function () {}); if (MANAGE) loadOwed(); EB.flush() }   // Management: the Not paid badge
/* ---------- who uses this device ---------- */
// each user's tabs, in order; the first one opens
var ROLES = {cashier: [['order', 'orders', 'owedt', 'avail'], 'الكاشير', 'Cashier', '🧾'], chef: [['rec', 'stock', 'exp'], 'الشيف', 'Chef', '👨‍🍳'],
  marketing: [['market'], 'الماركتنغ', 'Marketing', '📣'], manage: [['box', 'report', 'exp', 'dash'], 'الإدارة', 'Management', '🔒'],
  developer: [['home', 'site'], 'المطوّر', 'Developer', '🛠']};
function roleTabs() {
  var r = ROLES[ROLE], tabs = $('.tabs');
  tabs.style.display = '';
  tabs.querySelectorAll('button').forEach(function (b) { b.style.display = 'none' });
  r[0].forEach(function (v) { var b = tabs.querySelector('[data-view="' + v + '"]'); b.style.display = ''; tabs.appendChild(b) });
  tabs.style.visibility = r[0].length > 1 ? '' : 'hidden';
  $('#roleBtn').innerHTML = r[3] + ' ' + bi(r[1], r[2]);
  document.documentElement.classList.add('tabsok');
}
function demoQ(sep) { return EB.demo ? sep + 'demo' : '' }
$('#roleBtn').addEventListener('click', function () {
  try { localStorage.removeItem('elbash-role') } catch (e) {}
  setPin(''); location.href = 'index.html' + demoQ('?');
});
$('#who').addEventListener('click', function (e) {
  var b = e.target.closest('[data-role]'); if (!b) return;
  try { localStorage.setItem('elbash-role', b.dataset.role) } catch (e) {}
  location.href = 'index.html?' + (b.dataset.role === 'manage' ? 'app=manage' : 'role=' + b.dataset.role) + demoQ('&');
});
$('#whoLang').addEventListener('click', function () { setLang(lang === 'en' ? 'ar' : 'en') });
// Management: the PIN once each time the app opens (Settings tab), before anything shows
function pinOk(p) { p = p == null ? pin() : p; return !SET.pin || p === SET.pin || (/^\d+$/.test(p) && p.length >= String(SET.pin).length && Number(p) === Number(SET.pin)) }
// the right PIN opens as soon as it's typed, without tapping Open
function autoOpen(inp, go) { inp.addEventListener('input', function () { if (SET.loaded && SET.pin && pinOk(inp.value)) go() }) }
function gate(msg) {
  if (!LOCKED || (SET.loaded && pinOk())) { $('#gate').hidden = true; return }
  $('#gate').hidden = false;
  if (!SET.loaded) { $('#gateBox').innerHTML = '<p>' + bi('عم يحمّل…', 'Loading…') + '</p>'; return }
  $('#gateBox').innerHTML = '<img class="wlogo" src="https://hananekalakesh.github.io/BachaSnackOrder/assets/elbash/noar-green.svg" alt="El Bash">' +
    '<h1 class="display">' + bi(ROLES[ROLE][1], ROLES[ROLE][2]) + '</h1><p>' + bi('اكتب الرمز', 'Enter the PIN') + '</p>' +
    '<input class="gatein" id="gateIn" type="password" inputmode="numeric" autocomplete="off"><div class="gateerr">' + (msg || '') + '</div>' +
    '<button class="gatego" id="gateGo">' + bi('افتح', 'Open') + '</button><button class="gateback" id="gateBack">' + bi('مستخدم تاني', 'Another user') + '</button>';
  var go = function () { setPin($('#gateIn').value); if (pinOk()) { $('#gate').hidden = true; showView(ROLES[ROLE][0][0]) } else gate(bi('الرمز غلط', 'Wrong PIN')) };
  $('#gateGo').onclick = go; $('#gateIn').onkeydown = function (e) { if (e.key === 'Enter') go() }; autoOpen($('#gateIn'), go); $('#gateIn').focus();
  $('#gateBack').onclick = function () { try { localStorage.removeItem('elbash-role') } catch (e) {} location.href = 'index.html' + demoQ('?') };
}

setLang(store(LKEY) || 'ar'); showNet(); updateSave();
if (!ROLE) { $('#who').hidden = false; $('.tabs').style.display = 'none' }   // nobody picked yet: no tabs behind the picker
else {
  roleTabs(); gate();
  if (EB.key()) start();
  else { var c = EB.cached('menu'); if (c) useMenu(c); askKey() }
  addEventListener('DOMContentLoaded', function () { showView(ROLES[ROLE][0][0]) });   // after recipes.js, hub.js and marketing.js
}
