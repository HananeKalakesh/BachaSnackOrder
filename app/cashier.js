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

/* ---------- the receipt printer: 🖨 in the top bar connects it; new orders print by themselves ---------- */
var BLUEFY = 'https://apps.apple.com/app/bluefy-web-ble-browser/id1492822055';
function drawPrn() {
  var b = $('#prnBtn');
  if (ROLE !== 'cashier') { b.hidden = true; return }
  b.hidden = false;
  b.className = 'langbtn prnbtn' + (PRN.ready() ? ' on' : PRN.can() ? ' off' : ' off');
  b.innerHTML = '🖨 ' + (PRN.ready() ? '✓' : PRN.can() && PRN.opts().name ? bi('وصّل', 'Connect') : '');
}
PRN.on(drawPrn);
function prnSheet() {
  var o = PRN.opts(), h = '<div class="paybox"><h3 class="display">🖨 ' + bi('الطابعة', 'Printer') + '</h3>';
  if (!PRN.can()) {
    h += '<div class="prnhelp">' + bi('سفاري ما بيقدر يحكي مع طابعة بلوتوث. افتحو التطبيق بـ Bluefy:', 'Safari can\'t talk to a Bluetooth printer. Open the app in Bluefy:') +
      '<ol><li>' + bi('نزّلو Bluefy من الـ App Store (مجاني)', 'Get Bluefy from the App Store (free)') + '</li>' +
      '<li>' + bi('افتحو فيه هالرابط واعملو Add to Home Screen', 'Open this link in it and Add to Home Screen') + '</li>' +
      '<li>' + bi('دقو 🖨 واختارو الطابعة', 'Tap 🖨 and pick the printer') + '</li></ol></div>' +
      '<div class="busyopts"><button data-prn="bluefy">⬇ ' + bi('نزّل Bluefy', 'Get Bluefy') + '</button><button data-prn="link">📋 ' + bi('انسخ رابط التطبيق', 'Copy the app link') + '</button></div>';
  } else {
    // Android: straight from Chrome (BLE printers) or through the RawBT app (classic Bluetooth printers)
    if (PRN.android) h += '<div class="busyopts"><button class="' + (o.mode === 'ble' ? 'on' : '') + '" data-prn="mode-ble">📶 ' + bi('مباشرة من كروم', 'Straight from Chrome') + '</button>' +
      '<button class="' + (o.mode === 'rawbt' ? 'on' : '') + '" data-prn="mode-rawbt">📲 ' + bi('عبر تطبيق RawBT', 'Through the RawBT app') + '</button></div>';
    if (o.mode === 'rawbt') h += '<div class="prnhelp"><ol><li>' + bi('نزّلو RawBT من Google Play (مجاني)', 'Get RawBT from Google Play (free)') + '</li>' +
      '<li>' + bi('بـ RawBT: اختارو الطابعة (Bluetooth) وعرض الورق 80mm', 'In RawBT: pick the printer (Bluetooth) and 80 mm paper') + '</li>' +
      '<li>' + bi('ارجعو لهون ودقو «اطبع تجربة»', 'Come back here and tap Print a test') + '</li></ol></div>' +
      '<div class="busyopts"><button data-prn="test">🧾 ' + bi('اطبع تجربة', 'Print a test') + '</button><button data-prn="getrawbt">⬇ ' + bi('نزّل RawBT', 'Get RawBT') + '</button></div>' +
      '<div class="prnrow"><label>' + bi('طريقة الإرسال', 'Send as') + ' <select id="prnFmt"><option value="image"' + (o.rawfmt === 'image' ? ' selected' : '') + '>' + bi('صورة (الأفضل)', 'Picture (best)') + '</option>' +
        '<option value="escpos"' + (o.rawfmt === 'escpos' ? ' selected' : '') + '>' + bi('أوامر الطابعة', 'Printer commands') + '</option></select></label></div>';
    else h += '<p class="muted">' + (PRN.ready() ? bi('موصولة: ', 'Connected: ') + '<b>' + esc(PRN.name()) + '</b>' : bi('مش موصولة', 'Not connected')) + '</p>' +
      '<div class="busyopts">' + (PRN.ready() ? '<button data-prn="test">🧾 ' + bi('اطبع تجربة', 'Print a test') + '</button>' : '<button data-prn="connect">🔗 ' + bi('وصّل الطابعة', 'Connect the printer') + '</button>') + '</div>' +
      (PRN.android ? '<p class="muted">' + bi('إذا الطابعة ما بيّنت بالقايمة، جرّبو «عبر تطبيق RawBT».', 'If the printer isn\'t in the list, try "Through the RawBT app".') + '</p>' : '');
    h +=
      '<div class="prnrow"><label><input type="checkbox" id="prnAuto"' + (o.auto ? ' checked' : '') + '> ' + bi('اطبع كل طلب جديد لحالو', 'Print every new order by itself') + '</label></div>' +
      '<div class="prnrow"><label>' + bi('عرض الورق', 'Paper width') + ' <select id="prnWidth"><option value="576"' + (o.width === 576 ? ' selected' : '') + '>80 mm · 72 mm print (576)</option><option value="512"' + (o.width === 512 ? ' selected' : '') + '>64 mm print (512)</option><option value="384"' + (o.width === 384 ? ' selected' : '') + '>58 mm · 48 mm print (384)</option></select></label>' +
      '<label>' + bi('سرعة', 'Speed') + ' <select id="prnSpeed"><option value="180,12"' + (o.chunk === 180 ? ' selected' : '') + '>' + bi('عادي', 'Normal') + '</option><option value="100,30"' + (o.chunk === 100 ? ' selected' : '') + '>' + bi('بطيء (إذا طلع خربيط)', 'Slow (if it prints garbage)') + '</option><option value="20,15"' + (o.chunk === 20 ? ' selected' : '') + '>' + bi('بطيء كتير', 'Very slow') + '</option></select></label></div>' +
      '<div class="prnrow"><label>' + bi('ورق فاضي بالآخر (لتقطعو)', 'Blank paper at the end (to tear it)') + ' <select id="prnTail">' + [[80, '1 cm'], [160, '2 cm'], [240, '3 cm'], [320, '4 cm']].map(function (t) {
        return '<option value="' + t[0] + '"' + (o.tail === t[0] ? ' selected' : '') + '>' + t[1] + '</option>' }).join('') + '</select></label></div>' +
      (PRN.ready() && o.mode === 'ble' ? '<button class="ghost" data-prn="forget">' + bi('افصل', 'Disconnect') + '</button> ' : '');
  }
  $('#prnSheet').innerHTML = h + '<button class="ghost" data-prn="close">' + bi('رجوع', 'Back') + '</button></div>';
  $('#prnSheet').hidden = false;
}
$('#prnBtn').addEventListener('click', function () {
  // one tap connects when the printer is known; otherwise the sheet
  if (PRN.can() && !PRN.ready() && PRN.opts().name) return prnConnect();
  prnSheet();
});
function prnConnect() {
  return PRN.connect().then(function (n) { toast('الطابعة موصولة', 'Printer connected: ' + n); if (!$('#prnSheet').hidden) prnSheet() })
    .catch(function (e) { if (!/cancel/i.test(e.message)) toast('ما وصلت الطابعة: ' + esc(e.message), 'Printer not connected: ' + e.message); prnSheet() });
}
$('#prnSheet').addEventListener('change', function (e) {
  if (e.target.id === 'prnAuto') PRN.setOpts({auto: e.target.checked});
  if (e.target.id === 'prnWidth') PRN.setOpts({width: +e.target.value});
  if (e.target.id === 'prnFmt') PRN.setOpts({rawfmt: e.target.value});
  if (e.target.id === 'prnTail') PRN.setOpts({tail: +e.target.value});
  if (e.target.id === 'prnSpeed') { var v = e.target.value.split(','); PRN.setOpts({chunk: +v[0], pause: +v[1]}) }
});
$('#prnSheet').addEventListener('click', function (e) {
  var b = e.target.closest('[data-prn]');
  if (!b) { if (e.target === this) this.hidden = true; return }
  var a = b.dataset.prn;
  if (a === 'bluefy') return window.open(BLUEFY, '_blank');
  if (a === 'getrawbt') return window.open('https://play.google.com/store/apps/details?id=ru.a402d.rawbtprinter', '_blank');
  if (a === 'mode-ble' || a === 'mode-rawbt') { PRN.setOpts({mode: a.slice(5)}); return prnSheet() }
  if (a === 'link') { var u = location.href.split('#')[0]; (navigator.clipboard ? navigator.clipboard.writeText(u) : Promise.reject()).then(function () { toast('انْسخ الرابط', 'Link copied') }, function () { prompt('Copy:', u) }); return }
  if (a === 'connect') return prnConnect();
  if (a === 'forget') { PRN.forget(); return prnSheet() }
  if (a === 'test') this.hidden = true;
  if (a === 'test') return printOrder({num: 0, day: EB.bizDay(DAY_END), time: EB.hhmm(), type: 'Pickup', name: 'تجربة · Test', payment: 'Cash',
    items: [{qty: 1, name: 'Zinger Sandwich', ar: 'ساندويش زنجر', price: 500000, sauces: []}, {qty: 2, name: 'Pepsi', ar: 'بيبسي', price: 70000, sauces: []}],
    total: 640000, note: 'بلا بصل'});
  this.hidden = true;
});
function printOrder(o) {
  if (!PRN.can()) return prnSheet();
  toast('عم يطبع #' + o.num, 'Printing #' + o.num);
  return PRN.print(o, money).catch(function (e) {
    toast(e.message === 'NOT_CONNECTED' ? 'الطابعة مش موصولة: دق 🖨' : 'ما طبع: ' + esc(e.message), e.message === 'NOT_CONNECTED' ? 'Printer not connected: tap 🖨' : 'Didn\'t print: ' + e.message);
    drawPrn();
  });
}
function autoPrint(o) { if (ROLE === 'cashier' && PRN.can() && PRN.opts().auto && PRN.opts().name) printOrder(o) }
PRN.resume(); drawPrn();
