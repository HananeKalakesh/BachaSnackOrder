/* ---------- the cashier: busy mode for the website, and what's on the menu right now ----------
   Busy: the website tells customers to expect a longer wait, or stops taking orders; it ends by itself after an hour.
   Menu: switch an item off for now (sold out); it greys out on the order screen and shows as "Not available" on the website.
   A main item (crispy, zinger, wings…) switches off every menu item made with it at once. */
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

// Main items: closing one closes every menu item made with it (each item can still be brought back by hand)
var BASES = [['Crispy', 'كريسبي', /crispy|loaded fries/i], ['Zinger', 'زنجر', /zinger/i], ['Escalope', 'إسكالوب', /escalope/i],
  ['Cordon bleu', 'كوردون بلو', /cordon/i], ['Broasted', 'بروستد', /broasted/i], ['Wings', 'وينغز', /wings/i],
  ['Shawarma', 'شاورما', /shawarma/i], ['Tawouk', 'طاووق', /tawouk/i], ['Fajita', 'فاهيتا', /fajita/i],
  ['Francisco chicken', 'دجاج فرانسيسكو', /francisco|chicken sub/i], ['Boneless thighs', 'فخاد بلا عضم', /thighs/i],
  ['Grilled chicken', 'دجاج مشوي', /grilled chicken/i], ['Chicken kebab', 'كباب دجاج', /kebab/i],
  ['Steak', 'ستيك', /steak|philadelphia/i], ['Beef patty', 'باتي لحمة', /beef burger|basha burger|mushroom burger/i],
  ['Crunchy patty', 'باتي كرانشي', /crunchy/i], ['Mozzarella patty', 'باتي موزاريلا', /mozzarella patty/i],
  ['Nuggets', 'ناغتس', /nuggets|mix appetizer/i], ['Mozzarella sticks', 'موزاريلا ستيكس', /mozzarella sticks|mix appetizer/i],
  ['Onion rings', 'أونيون رينغز', /onion rings|mix appetizer/i]];
function baseItems(b, items) { return items.filter(function (m) { return b[2].test(m.name) }) }

// What's on the menu now: tap an item to take it off (sold out) or bring it back
function drawAvail() {
  var items = MENU_ALL.filter(function (m) { return (m.on || m.soldOut) && m.price > 0 }), off = items.filter(function (m) { return m.soldOut });
  var cats = []; items.forEach(function (m) { if (cats.indexOf(m.cat) < 0) cats.push(m.cat) });
  var h = '<div class="shead"><h2 class="display">' + bi('شو في عالمنيو هلّق', 'On the menu now') + '</h2>' +
    (off.length ? '<button class="ghost" data-avall="1">↩ ' + bi('رجّع الكل (' + off.length + ')', 'Bring all back (' + off.length + ')') + '</button>' : '') + '</div>' +
    '<p class="mkhow">' + bi('دق على صنف خلص لتطفيه: بيصير رمادي بشاشة الطلب، وعالموقع بيبيّن «مش متوفر هلّق». دق مرة تانية لترجّعو.',
      'Tap an item that ran out to switch it off: it greys out on the order screen and shows as "Not available" on the website. Tap again to bring it back.') + '</p>';
  if (!items.length) { $('#avail').innerHTML = h + '<p class="muted">' + bi('عم يحمّل…', 'Loading…') + '</p>'; return }
  h += '<h3 class="display">' + bi('الأساسيات: بتسكّر كل شي فيه', 'Main items: closes everything made with it') + '</h3><div class="bases">' +
    BASES.map(function (b, i) {
      var list = baseItems(b, items), n = list.filter(function (m) { return m.soldOut }).length; if (!list.length) return '';
      var st = n === list.length ? ' off' : n ? ' part' : '';
      return '<button class="base' + st + '" data-base="' + i + '">' + bi(b[1], b[0]) + '<small>' + (n === list.length ? bi('مسكّر', 'closed') : n ? bi(n + ' من ' + list.length + ' مسكّرين', n + ' of ' + list.length + ' closed') : bi(list.length === 1 ? 'صنف واحد' : list.length + ' أصناف', list.length + (list.length === 1 ? ' item' : ' items'))) + '</small></button>';
    }).join('') + '</div>';
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
  if (b.dataset.base) {   // all closed: open them all; otherwise close every item made with it
    var bs = BASES[+b.dataset.base], all = MENU_ALL.filter(function (m) { return (m.on || m.soldOut) && m.price > 0 }), list = baseItems(bs, all);
    var close = !list.every(function (m) { return m.soldOut });
    list.forEach(function (m) { if (m.soldOut !== close) EB.soldOut(m.name, close) });
    toast((close ? 'تسكّر كل شي فيه ' : 'رجع كل شي فيه ') + bs[1], (close ? 'Closed everything with ' : 'Brought back everything with ') + bs[0]);
    useMenu(EB.cached('menu')); drawAvail(); return;
  }
  if (!b.dataset.av && !b.dataset.avall) return;
  var list = b.dataset.avall ? MENU_ALL.filter(function (m) { return m.soldOut }) : MENU_ALL.filter(function (m) { return m.name === b.dataset.av });
  list.forEach(function (m) { EB.soldOut(m.name, b.dataset.avall ? false : !m.soldOut) });
  if (list.length === 1) toast(list[0].soldOut ? 'رجع ' + esc(list[0].ar || list[0].name) : 'خلص ' + esc(list[0].ar || list[0].name), list[0].name + (list[0].soldOut ? ' is back' : ' is sold out'));
  useMenu(EB.cached('menu')); drawAvail();
});
drawBusy();

/* ---------- the receipt printer: 🖨 in the top bar connects it; new orders print by themselves ---------- */
var BUILD = '22.10-4';   // shown in the printer sheet, to check a tablet runs the newest version
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
      (!PRN.ready() && PRN.err ? '<p class="err">' + bi('آخر محاولة: ', 'Last try: ') + esc(PRN.err) + '</p>' : '') +
      '<div class="busyopts">' + (PRN.ready() ? '<button data-prn="test">🧾 ' + bi('اطبع تجربة', 'Print a test') + '</button>' : '<button data-prn="connect">🔗 ' + bi('وصّل الطابعة', 'Connect the printer') + '</button>') + '</div>' +
      (PRN.android ? '<p class="muted">' + bi('إذا الطابعة ما بيّنت بالقايمة، جرّبو «عبر تطبيق RawBT».', 'If the printer isn\'t in the list, try "Through the RawBT app".') + '</p>' : '');
    h +=
      '<div class="prnrow"><label><input type="checkbox" id="prnAuto"' + (o.auto ? ' checked' : '') + '> ' + bi('اطبع كل طلب جديد لحالو', 'Print every new order by itself') + '</label></div>' +
      '<div class="prnrow"><label><input type="checkbox" id="prnArrive"' + (o.arrive ? ' checked' : '') + '> ' + bi('اطبع طلبات الموقع أول ما توصل (قبل القبول)', 'Print website orders as soon as they arrive (before Accept)') + '</label></div>' +
      '<div class="prnrow"><label>' + bi('عرض الورق', 'Paper width') + ' <select id="prnWidth"><option value="576"' + (o.width === 576 ? ' selected' : '') + '>80 mm · 72 mm print (576)</option><option value="512"' + (o.width === 512 ? ' selected' : '') + '>64 mm print (512)</option><option value="384"' + (o.width === 384 ? ' selected' : '') + '>58 mm · 48 mm print (384)</option></select></label>' +
      '<label>' + bi('سرعة', 'Speed') + ' <select id="prnSpeed"><option value="safe"' + (o.speed === 'safe' ? ' selected' : '') + '>' + bi('أكيد (الأفضل)', 'Safe (best)') + '</option><option value="180,12"' + (o.speed !== 'safe' && o.chunk === 180 ? ' selected' : '') + '>' + bi('سريع', 'Fast') + '</option><option value="100,30"' + (o.speed !== 'safe' && o.chunk === 100 ? ' selected' : '') + '>' + bi('بطيء (إذا طلع خربيط)', 'Slow (if it prints garbage)') + '</option><option value="20,15"' + (o.speed !== 'safe' && o.chunk === 20 ? ' selected' : '') + '>' + bi('بطيء كتير', 'Very slow') + '</option></select></label></div>' +
      '<div class="prnrow"><label>' + bi('ورق فاضي بالآخر (لتقطعو)', 'Blank paper at the end (to tear it)') + ' <select id="prnTail">' + [[80, '1 cm'], [160, '2 cm'], [240, '3 cm'], [320, '4 cm']].map(function (t) {
        return '<option value="' + t[0] + '"' + (o.tail === t[0] ? ' selected' : '') + '>' + t[1] + '</option>' }).join('') + '</select></label></div>' +
      (PRN.ready() && o.mode === 'ble' ? '<button class="ghost" data-prn="forget">' + bi('افصل', 'Disconnect') + '</button> ' : '');
  }
  var o2 = PRN.opts();
  h += '<p class="muted" style="font-size:12px;margin-top:10px">' + esc('v' + BUILD + ' · ' + (o2.mode === 'rawbt' ? 'RawBT' : 'Chrome') + ' · auto ' + (o2.auto ? 'on' : 'off') + ' · ' + (navigator.userAgent.match(/(SamsungBrowser|Chrome)\/[\d]+/) || [''])[0]) + '</p>';
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
    .catch(function (e) { PRN.err = e.message || String(e); if (!/cancel/i.test(e.message)) toast('ما وصلت الطابعة: ' + esc(e.message), 'Printer not connected: ' + e.message); prnSheet() });
}
$('#prnSheet').addEventListener('change', function (e) {
  if (e.target.id === 'prnAuto') PRN.setOpts({auto: e.target.checked});
  if (e.target.id === 'prnArrive') PRN.setOpts({arrive: e.target.checked});
  if (e.target.id === 'prnWidth') PRN.setOpts({width: +e.target.value});
  if (e.target.id === 'prnFmt') PRN.setOpts({rawfmt: e.target.value});
  if (e.target.id === 'prnTail') PRN.setOpts({tail: +e.target.value});
  if (e.target.id === 'prnSpeed') { var v = e.target.value.split(','); PRN.setOpts(v[0] === 'safe' ? {speed: 'safe'} : {speed: 'fixed', chunk: +v[0], pause: +v[1]}) }
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
// Orders already printed on this device, so a website order printed when it arrived isn't printed again on Accept
// (by each order's own code, not its number: numbers start again from #1, e.g. after old orders are cleared)
var PRINTED = (function () { try { return JSON.parse(localStorage.getItem('elbash-printed2')) || [] } catch (e) { return [] } })();
function printId(o) { return o.uid || o.key }
function wasPrinted(o) { return PRINTED.indexOf(printId(o)) >= 0 }
function markPrinted(o) { if (!wasPrinted(o)) PRINTED.push(printId(o)); PRINTED = PRINTED.slice(-300); try { localStorage.setItem('elbash-printed2', JSON.stringify(PRINTED)) } catch (e) {} }
function printerSet() { return ROLE === 'cashier' && PRN.can() && (PRN.opts().mode === 'rawbt' || PRN.opts().name) }
// fresh: an order just saved on this tablet always prints; an accepted website order prints unless it already did
function autoPrint(o, fresh) { if (printerSet() && PRN.opts().auto && (fresh || !wasPrinted(o))) { markPrinted(o); printOrder(o) } }
// Website orders the moment they arrive (no tap): one after another, a few seconds apart so the printer app keeps up
function arrivePrint(list) {
  if (!printerSet() || !PRN.opts().arrive) return;
  list.filter(function (o) { return !wasPrinted(o) }).forEach(function (o, i) {
    markPrinted(o); setTimeout(function () { printOrder(o) }, i * 5000);
  });
}
PRN.resume(); drawPrn();

/* ---------- keep the screen on while the cashier app is open (so orders and the chime are never missed) ---------- */
var WAKE = null;
function keepAwake() {
  if (ROLE !== 'cashier' || !('wakeLock' in navigator) || document.visibilityState !== 'visible' || (WAKE && !WAKE.released)) return;
  navigator.wakeLock.request('screen').then(function (l) { WAKE = l }, function () {});
}
// the browser lets go when the app goes to the back (or RawBT opens to print): take it again on return
document.addEventListener('visibilitychange', keepAwake);
document.addEventListener('click', keepAwake);
keepAwake();
