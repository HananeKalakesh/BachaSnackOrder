/* ---------- the cashier: busy mode for the website, and what's on the menu right now ----------
   Busy: the website tells customers to expect a longer wait, or stops taking orders; it ends by itself after an hour.
   Menu: switch an item off for now (sold out); it greys out on the order screen and disappears from the website. */
function busyNow() { return BUSY && BUSY.until > Date.now() ? BUSY : null }
function drawBusy() {
  var b = $('#busyBtn'), x = busyNow();
  if (ROLE !== 'cashier') { b.hidden = true; return }
  b.hidden = false;
  b.className = 'langbtn busybtn' + (x ? ' ' + x.mode : '');
  b.innerHTML = !x ? '⏳ ' + bi('ضغط؟', 'Busy?') : x.mode === 'paused' ? '⏸ ' + bi('الأونلاين موقّف', 'Online paused')
    : '⏳ ' + bi('ضغط · +' + x.wait + ' د', 'Busy · +' + x.wait + ' min');
}
setInterval(drawBusy, 60000);

function busySheet() {
  var x = busyNow(), on = function (mode, wait) { return x && x.mode === mode && (!wait || x.wait === wait) ? ' on' : '' };
  var left = x ? Math.max(1, Math.round((x.until - Date.now()) / 60000)) : 0;
  $('#busySheet').innerHTML = '<div class="paybox"><h3 class="display">' + bi('عنا ضغط بالطلبات؟', 'Busy with orders?') + '</h3>' +
    '<p class="muted">' + bi('بيبيّن للزباين عالموقع، وبيوقف لحالو بعد ساعة.', 'Customers see it on the website. It turns itself off after an hour.') +
      (x ? '<br><b>' + bi('شغّال، بيخلص بعد ' + left + ' د', 'On, ends in ' + left + ' min') + '</b>' : '') + '</p>' +
    '<div class="busyopts">' + [15, 30, 45].map(function (m) {
      return '<button class="' + on('busy', m).trim() + '" data-busy="busy" data-wait="' + m + '">⏳ ' + bi('الطلب بياخد حوالي ' + m + ' دقيقة زيادة', 'Orders take about ' + m + ' extra minutes') + '</button>';
    }).join('') +
    '<button class="stop' + on('paused') + '" data-busy="paused">⏸ ' + bi('وقّف الطلب من الموقع', 'Stop website orders') + '</button>' +
    (x ? '<button data-busy="">✓ ' + bi('رجعنا عادي', 'Back to normal') + '</button>' : '') + '</div>' +
    '<button class="ghost" data-busy="close">' + bi('رجوع', 'Back') + '</button></div>';
  $('#busySheet').hidden = false;
}
$('#busyBtn').addEventListener('click', busySheet);
$('#busySheet').addEventListener('click', function (e) {
  var b = e.target.closest('[data-busy]');
  if (!b) { if (e.target === this) this.hidden = true; return }
  var mode = b.dataset.busy;
  if (mode !== 'close') {
    var wait = +b.dataset.wait || 0, until = mode ? Date.now() + 60 * 60000 : 0;
    EB.setBusy(mode, wait, until);
    BUSY = mode ? {mode: mode, wait: wait, until: until} : null;
    drawBusy();
    toast(!mode ? 'رجعنا عادي' : mode === 'paused' ? 'الطلب من الموقع موقّف لساعة' : 'الموقع بيقول للزباين: ' + wait + ' دقيقة زيادة',
      !mode ? 'Back to normal' : mode === 'paused' ? 'Website orders stopped for an hour' : 'Website shows +' + wait + ' min wait');
  }
  this.hidden = true;
});

// What's on the menu now: tap an item to take it off (sold out) or bring it back
function drawAvail() {
  var items = MENU_ALL.filter(function (m) { return (m.on || m.soldOut) && m.price > 0 }), off = items.filter(function (m) { return m.soldOut });
  var cats = []; items.forEach(function (m) { if (cats.indexOf(m.cat) < 0) cats.push(m.cat) });
  var h = '<div class="shead"><h2 class="display">' + bi('شو في عالمنيو هلّق', 'On the menu now') + '</h2>' +
    (off.length ? '<button class="ghost" data-avall="1">↩ ' + bi('رجّع الكل (' + off.length + ')', 'Bring all back (' + off.length + ')') + '</button>' : '') + '</div>' +
    '<p class="mkhow">' + bi('دق على صنف خلص لتطفيه: بيصير رمادي بشاشة الطلب وبيختفي من الموقع. دق مرة تانية لترجّعو.',
      'Tap an item that ran out to switch it off: it greys out on the order screen and disappears from the website. Tap again to bring it back.') + '</p>';
  if (!items.length) { $('#avail').innerHTML = h + '<p class="muted">' + bi('عم يحمّل…', 'Loading…') + '</p>'; return }
  h += cats.map(function (c) {
    return '<div class="avsec"><h3 class="display">' + bi(CAT_AR[c] || c, c) + '</h3><div class="avgrid">' + items.filter(function (m) { return m.cat === c }).map(function (m) {
      return '<button class="avit' + (m.soldOut ? ' off' : '') + '" data-av="' + esc(m.name) + '"><b>' + bi(esc(m.ar || m.name), esc(m.name)) +
        (m.soldOut ? ' <small class="muted">· ' + bi('خلص', 'sold out') + '</small>' : '') + '</b><span class="sw"></span></button>';
    }).join('') + '</div></div>';
  }).join('');
  $('#avail').innerHTML = h;
}
$('#avail').addEventListener('click', function (e) {
  var b = e.target.closest('button'); if (!b) return;
  var list = b.dataset.avall ? MENU_ALL.filter(function (m) { return m.soldOut }) : MENU_ALL.filter(function (m) { return m.name === b.dataset.av });
  list.forEach(function (m) { EB.soldOut(m.name, b.dataset.avall ? false : !m.soldOut) });
  if (list.length === 1) toast(list[0].soldOut ? 'رجع ' + esc(list[0].ar || list[0].name) : 'خلص ' + esc(list[0].ar || list[0].name), list[0].name + (list[0].soldOut ? ' is back' : ' is sold out'));
  useMenu(EB.cached('menu')); drawAvail();
});
drawBusy();
