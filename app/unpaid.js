/* ---------- today's orders: every order today, oldest first, done ones at the bottom ---------- */
var TD = {list: [], loaded: false, err: ''};
function loadOrders() {
  loadRecent().then(function () { TD.err = ''; drawOrders() }, function (e) {
    TD.err = e.offline ? 'OFFLINE' : (e.message || String(e)); drawOrders();
  });
}
/* ---------- Not paid: orders picked up or delivered without paying, today's apart from earlier days' ---------- */
var OWED = null, OWED_ERR = '';
function loadOwed() {
  EB.read('owed', {'Orders': 0}).then(function (r) { OWED = r; OWED_ERR = ''; drawOwed() }, function (e) {
    OWED_ERR = e.offline ? 'OFFLINE' : (e.message || String(e)); drawOwed();
  });
}
function owedOrders() {
  var r = OWED || EB.cached('owed');
  if (!r) return null;
  return EB.withPending(EB.orders(r, MENU_ALL, DAY_END), r.at).filter(function (o) { return o.live && o.payment === 'Unpaid' && (o.done || o.day < EB.bizDay(DAY_END)) }).sort(function (a, b) { return a.at - b.at });
}
// everything the same customer owes (same phone, or same name when there's no phone), oldest first
function sameCustomer(o, list) {
  return list.filter(function (x) { return o.phone ? x.phone === o.phone : o.name && x.name.toLowerCase() === o.name.toLowerCase() || x.key === o.key });
}
// one order someone owes: a WhatsApp reminder, and buttons for when they pay
function owedCard(o, today) {
  return '<div class="ord owed">' +
    '<div class="onum"><b class="num">#' + o.num + '</b>' + (o.day === today ? '' : '<span>' + dayName(o.day) + '</span>') + '<span class="num">' + t12(o.time) + '</span></div>' +
    '<div class="obody">' + who(o) + '<div class="oitems"><span>' + bi(itemsAr(o.text), o.text) + '</span></div>' + (o.note ? '<div class="onote">' + esc(o.note) + '</div>' : '') + '</div>' +
    '<div class="oside">' + amount(o.total) + '</div>' +
    '<div class="oacts"><button class="readyb" data-remind="' + esc(o.key) + '">📲 ' + bi('ذكّرو بالدفع', 'Payment reminder') + '</button>' +
      (OWED_DISC === o.key ? '<div class="discbox"><b>🏷️ ' + bi('خصم', 'Discount') + '</b><input class="odPaid" inputmode="decimal" placeholder="' + esc(T('قدّيش دفعو؟ ($ أو ليرة) أو خصم متل 10%', 'How much did they pay? ($ or L.L.) or a discount like 10%')) + '">' +
        '<input class="odWhy" maxlength="40" placeholder="' + esc(T('ليش؟ (عيلة، صاحب…) اختياري', 'Why? (family, friend…) optional')) + '"><small class="muted">' + bi('بعدين دق دفع كاش أو ويش', 'then tap Paid cash or Paid Whish') + '</small></div>'
        : '<button class="splitl" data-paid="' + esc(o.key) + '" data-odisc="1">🏷️ ' + bi('في خصم', 'There\'s a discount') + '</button>') +
      '<button class="payb cash" data-paid="' + esc(o.key) + '" data-how="Cash">' + bi('دفع كاش', 'Paid cash') + '</button>' +
      '<button class="payb whish" data-paid="' + esc(o.key) + '" data-how="Whish">' + bi('دفع ويش', 'Paid Whish') + '</button>' +
      '<button class="splitl" data-paid="' + esc(o.key) + '" data-how="Split">' + bi('جزء كاش وجزء ويش', 'Part cash, part Whish') + '</button>' +
      '<button class="splitl" data-paid="' + esc(o.key) + '" data-how="House">🏠 ' + bi('كان للبيت', 'It was for the house') + '</button></div></div>';
}
var REMIND_HINT = ['📲 بيفتح واتساب مع رسالة تذكير بالدفع، وإنت بتبعتها.', '📲 opens WhatsApp with a payment reminder written for you to send.'];
function drawOwed() {
  var list = owedOrders(), today = EB.bizDay(DAY_END);
  var total = function (l) { return l.reduce(function (a, o) { return a + o.total }, 0) };
  var h = '<div class="shead"><h2 class="display">' + bi('ما دفعو', 'Not paid') + '</h2>' + (list && list.length ? '<span class="since">' + bi('المجموع ', 'Total owed ') +
    '<b class="num owe">' + $usd(total(list)) + '</b> · <span class="num">' + ll(total(list)) + '</span></span>' : '') + '</div>' +
    '<p class="muted xhint">' + bi(REMIND_HINT[0], REMIND_HINT[1]) + '</p>';
  if (OWED_ERR === 'OFFLINE') h += '<p class="offline">' + bi('ما في إنترنت: هيدي اللائحة من آخر مرة.', 'No internet: this list is from last time.') + '</p>';
  else if (OWED_ERR) h += '<p class="err">' + esc(OWED_ERR) + '</p>';
  if (!list) { $('#owe').innerHTML = h + '<p class="muted">' + bi('عم يحمّل…', 'Loading…') + '</p>'; return }
  owedBadge(list);
  var card = function (o) { return owedCard(o, today) };
  var part = function (l, ar, en, none) {
    return '<h3 class="display owedh">' + bi(ar, en) + (l.length ? ' <small class="num">' + l.length + ' ' + bi('طلب', l.length > 1 ? 'orders' : 'order') + ' · ' + $usd(total(l)) + ' · ' + ll(total(l)) + '</small>' : '') + '</h3>' +
      (l.length ? '<div class="olist">' + l.map(card).join('') + '</div>' : '<p class="muted">' + none + '</p>');
  };
  h += part(list.filter(function (o) { return o.day === today }), 'اليوم', 'Today', bi('ما حدا عليه شي من اليوم. 👌', 'Nobody owes anything from today. 👌')) +
    part(list.filter(function (o) { return o.day !== today }).reverse(), 'من أيام قبل', 'From earlier days', bi('ما في دين من أيام قبل. 👌', 'Nothing owed from earlier days. 👌'));
  $('#owe').innerHTML = h;
}
// how many orders are not paid, on the Money in tab and its Not paid switch
function owedBadge(list) {
  var n = list ? list.length : 0;
  ['#inBadge'].concat([].slice.call(document.querySelectorAll('[data-owed]'))).forEach(function (b) {
    b = typeof b === 'string' ? $(b) : b; if (!b) return; b.textContent = n; b.hidden = !n;
  });
}
// Remind or mark paid; list(): the orders this tab shows, draw(): redraws it
var OWED_DISC = null;   // the not-paid order whose discount box is open
function owedClicks(where, list, draw) {
  $(where).addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    var o = (list() || []).filter(function (x) { return x.key === (b.dataset.paid || b.dataset.remind) })[0]; if (!o) return;
    if (b.dataset.remind) {
      var url = EB.payReminder(sameCustomer(o, list()), EB.bizDay(DAY_END), RATE), w = window.open(url, '_blank'); if (!w) location.href = url;
      return;
    }
    if (b.dataset.odisc) { OWED_DISC = o.key; draw(); var inp = $(where).querySelector('.odPaid'); if (inp) inp.focus(); return }
    var disc = 0, why = '', card = b.closest('.ord');
    if (OWED_DISC === o.key && b.dataset.how !== 'House' && card && card.querySelector('.odPaid')) {
      disc = discOf(o, card.querySelector('.odPaid').value); why = card.querySelector('.odWhy').value.trim();
      if (disc == null) return toast('اكتب قدّيش دفعو (أقل من الحساب) أو نسبة الخصم', 'Type what they paid (less than the total) or the discount %');
    }
    var part = b.dataset.how === 'Split' ? askSplit({total: o.total - disc}) : null;
    if (b.dataset.how === 'Split' && part == null) return;
    OWED_DISC = null;
    EB.paid(o, b.dataset.how, EB.bizDay(DAY_END), part, disc, why);
    if (disc) toast('الطلب #' + o.num + ' انْدفع بخصم ' + $usd(disc), 'Order #' + o.num + ' paid with a discount of ' + $usd(disc)); else
    if (b.dataset.how === 'House') toast('الطلب #' + o.num + ': للبيت', 'Order #' + o.num + ': for the house'); else toast('الطلب #' + o.num + ' انْدفع', 'Order #' + o.num + ' marked paid');
    draw();
  });
}
owedClicks('#owe', owedOrders, drawOwed);

/* ---------- Not paid today (cashier): today's orders picked up or delivered without paying, to remind them at the end of the shift ---------- */
function owedToday() {
  if (!(RECENT || EB.cached('recent'))) return null;
  var today = EB.bizDay(DAY_END);
  return knownOrders().filter(function (o) { return o.live && o.day === today && o.payment === 'Unpaid' && o.done }).sort(function (a, b) { return a.at - b.at });
}
function drawOwedToday() {
  var list = owedToday(), today = EB.bizDay(DAY_END);
  var total = (list || []).reduce(function (a, o) { return a + o.total }, 0);
  var h = '<div class="shead"><h2 class="display">' + bi('ما دفعو اليوم', 'Not paid today') + '</h2>' + (list && list.length ? '<span class="since"><b class="num owe">' + list.length + '</b> ' +
    bi('طلب', list.length > 1 ? 'orders' : 'order') + ' · <b class="num owe">' + $usd(total) + '</b> · <span class="num">' + ll(total) + '</span></span>' : '') + '</div>' +
    '<p class="muted xhint">' + bi('آخر الشيفت: ذكّر كل واحد ما دفع. ', 'End of shift: remind everyone who hasn\'t paid. ') + bi(REMIND_HINT[0], REMIND_HINT[1]) + '</p>';
  if (TD.err === 'OFFLINE') h += '<p class="offline">' + bi('ما في إنترنت: هيدي الطلبات اللي بيعرفها هالآيباد.', 'No internet: these are the orders this iPad knows.') + '</p>';
  else if (TD.err) h += '<p class="err">' + esc(TD.err) + '</p>';
  if (!list) h += '<p class="muted">' + bi('عم يحمّل…', 'Loading…') + '</p>';
  else h += list.length ? '<div class="olist" style="margin-top:14px">' + list.map(function (o) { return owedCard(o, today) }).join('') + '</div>'
    : '<p class="muted" style="margin-top:14px">' + bi('كل اللي أخدو طلب اليوم دفعو. 👌', 'Everyone who got an order today has paid. 👌') + '</p>';
  $('#oweT').innerHTML = h;
}
owedClicks('#oweT', owedToday, drawOwedToday);

function drawOrders() {
  var now = EB.now(), today = EB.bizDay(DAY_END, now);
  TD.loaded = !!(RECENT || EB.cached('recent'));
  var all = knownOrders().filter(function (o) { return o.day === today && o.status !== 'Rejected' });
  var waiting = all.filter(function (o) { return o.status === 'Waiting' }).sort(function (a, b) { return a.at - b.at });
  TD.list = all.filter(function (o) { return o.live });
  TD.waiting = waiting;
  TD.yellow = SET.yellow; TD.red = SET.red;
  var byTime = function (a, b) { return a.at - b.at || a.num - b.num };
  var open = TD.list.filter(function (o) { return !o.done }).sort(byTime), done = TD.list.filter(function (o) { return o.done }).sort(byTime);
  var unpaid = TD.list.filter(function (o) { return o.payment === 'Unpaid' && o.done }).length, nReady = open.filter(function (o) { return o.ready }).length;
  var h = '<div class="shead">' +
    (TD.loaded ? '<span class="since"><b class="num">' + (open.length - nReady) + '</b> ' + bi('عم يتحضّر', 'preparing') + ' · <b class="num">' + nReady + '</b> ' + bi('جاهز', 'ready') +
      ' · <b class="num">' + done.length + '</b> ' + bi('خلص', 'done') +
      (unpaid ? ' · <b class="num owe">' + unpaid + '</b> <span class="owe">' + bi('ما دفع', 'not paid') + '</span>' : '') + '</span><span class="hint2">' + bi('دق على طلب لتغيّر فيه', 'Tap an order to change it') + '</span>' : '') + '</div>';
  if (TD.err === 'OFFLINE') h += '<p class="offline">' + bi('ما في إنترنت: هيدي الطلبات اللي بيعرفها هالآيباد. التغييرات بتنبعت لحالها.', 'No internet: these are the orders this iPad knows. Changes send by themselves.') + '</p>';
  else if (TD.err) h += '<p class="err">' + bi('ما قدرنا نحمّل الطلبات', 'Could not load the orders') + ' · <small>' + esc(TD.err) + '</small></p>';
  if (typeof lowBar === 'function') h += lowBar();   // things running low (chef's stock)
  if (!TD.loaded) { $('#ord').innerHTML = h + '<p class="muted">' + bi('عم يحمّل…', 'Loading…') + '</p>'; return }
  if (waiting.length) h += '<div class="webq"><h3>🌐 ' + bi('طلبات من الموقع، ناطرة موافقتك', 'Website orders waiting for you') + '</h3>' + waiting.map(function (o) {
    return '<div class="ord web">' +
      '<div class="onum"><b class="num">🌐 #' + o.num + '</b><span class="num">' + t12(o.time) + '</span></div>' +
      '<div class="obody">' + who(o) + '<div class="oitems">' + itemsOf(o) + '</div>' + (o.note ? '<div class="onote">' + esc(o.note) + '</div>' : '') + '</div>' +
      '<div class="oside">' + amount(o.total) + typeTag(o) + '</div>' +
      '<div class="oacts"><button class="payb cash" data-accept="' + esc(o.key) + '">' + bi('قبول ✓', 'Accept ✓') + '</button>' +
        '<button class="odel" data-reject="' + esc(o.key) + '">' + bi('رفض', 'Reject') + '</button></div></div>';
  }).join('') + '</div>';
  if (!TD.list.length) { $('#ord').innerHTML = h + (waiting.length ? '' : '<p class="muted">' + bi('لسا ما في طلبات اليوم', 'No orders yet today') + '</p>'); return }
  h += '<div class="olist">' + open.concat(done).map(function (o) {
    var m = Math.max(0, Math.floor((now - o.at) / 60000)), del = o.type === 'Delivery';
    var cls = o.done ? 'done' : o.ready ? 'ready' : m >= TD.red ? 'over' : m >= TD.yellow ? 'late' : 'fresh';
    // where the order is: preparing → ready for pickup / out for delivery → done
    var stage = o.done ? '<span class="stage s3">✓ ' + bi('خلص ' + o.done, 'Done ' + o.done) + '</span>'
      : o.ready ? '<span class="stage s2">' + (del ? '🛵 ' + bi('طلع للتوصيل ' + o.ready, 'Out for delivery ' + o.ready) : '✅ ' + bi('جاهز للاستلام ' + o.ready, 'Ready for pickup ' + o.ready)) + '</span>'
      : o.sent === '-' ? '<span class="stage s0">📝 ' + bi('جديد · لسا ما انبعت عالمطبخ', 'New · not sent to the kitchen yet') + '</span>'
      : '<span class="stage s1">🔥 ' + (o.sent ? bi('عم يتحضّر · من ', 'Preparing · since ') + '<span class="num">' + t12(o.sent) + '</span>' : bi('عم يتحضّر', 'Preparing')) + '</span>';
    var fresh = EB.unsent(o);
    var acts = o.done ? '<button class="backb" data-step="back" data-k="' + esc(o.key) + '">↩ ' + bi('رجّعو', 'Undo') + '</button>'
      : o.ready ? '<button class="stepb go" data-step="done" data-k="' + esc(o.key) + '">✓ ' + (del ? bi('وصل وانقبض', 'Delivered & paid') : bi('استلمو', 'Picked up')) + '</button>' +
          '<button class="readyb" data-msg="' + esc(o.key) + '">📲 ' + bi('ابعت تحديث', 'Send update') + '</button>' +
          '<button class="backb" data-step="back" data-k="' + esc(o.key) + '">↩ ' + bi('رجّعو', 'Undo') + '</button>'
      // printing sends it to the kitchen (no printer set up: a plain Send to kitchen button)
      : o.sent === '-' ? (PRN.can() ? '<button class="stepb go" data-print="' + esc(o.key) + '">🖨 ' + bi('اطبع', 'Print') + '</button>' +
            '<button class="prtb" data-step="kitchen" data-k="' + esc(o.key) + '">➜ ' + bi('كمّل بلا طباعة', 'Go on without printing') + '</button>'
          : '<button class="stepb go" data-step="kitchen" data-k="' + esc(o.key) + '">👨‍🍳 ' + bi('ابعت عالمطبخ', 'Send to kitchen') + '</button>')
      : (fresh.length ? (PRN.can() ? '<button class="stepb go" data-print="' + esc(o.key) + '">🖨 ' + bi('اطبع الجديد', 'Print the new items') + '</button>' +
            '<button class="prtb" data-step="kitchen" data-k="' + esc(o.key) + '">➜ ' + bi('كمّل بلا طباعة', 'Go on without printing') + '</button>'
          : '<button class="stepb go" data-step="kitchen" data-k="' + esc(o.key) + '">👨‍🍳 ' + bi('ابعت الجديد عالمطبخ', 'Send the new items') + '</button>') : '') +
        '<button class="stepb" data-step="ready" data-k="' + esc(o.key) + '">' + (del ? '🛵 ' + bi('طلع للتوصيل', 'Out for delivery') : '✅ ' + bi('جاهز للاستلام', 'Ready for pickup')) + '</button>';
    var owes = o.payment === 'Unpaid' && o.done, later = o.payment === 'Unpaid' && !o.done;
    return '<div class="ord ' + cls + (owes ? ' owes' : '') + '" data-key="' + esc(o.key) + '">' +
      '<div class="onum"><b class="num">' + (o.web ? '🌐 ' : '') + '#' + o.num + '</b><span class="num">' + t12(o.time) + '</span>' +
        (o.done || o.ready ? '' : '<small>' + bi(m < 1 ? 'هلّق' : 'من ' + m + ' د', m < 1 ? 'just now' : m + ' min') + '</small>') + '</div>' +
      '<div class="obody">' + stage + who(o) + '<div class="oitems">' + itemsOf(o, !o.done && !o.ready && o.sent !== '-' && fresh.length) + '</div>' +
        (o.note ? '<div class="onote">' + esc(o.note) + '</div>' : '') + '</div>' +
      '<div class="oside">' + amount(o.total) + '<span class="tags"><button class="pill paychg ' + (later ? 'Later' : esc(o.payment)) + '" data-paychg="' + esc(o.key) + '" title="' + esc(T('غيّر طريقة الدفع', 'Change the payment')) + '">' +
        (later ? bi('لسا ما دفع', 'Not paid yet') : bi(PAY_AR[o.payment] || o.payment, o.payment)) + ' ✎</button>' +
        typeTag(o) + '</span>' + (o.disc ? '<span class="feetag disc">🏷️ ' + bi('خصم ', 'Discount ') + '<b class="num">' + $usd(o.disc) + '</b>' + (o.discWhy ? ' · ' + esc(o.discWhy) : '') + '</span>' : '') + (o.fee ? '<span class="feetag">🛵 ' + bi('توصيل ', 'Delivery ') + '<b class="num">' + short(o.fee) + '</b> ' + bi('للسائق', 'for the driver') +
          '<br>' + bi('عالزبون: ', 'Customer pays: ') + '<b class="num">' + money(o.total + o.fee) + '</b></span>' : '') + '</div>' +
      '<div class="oacts">' + acts + (PRN.can() && !(o.sent === '-' && !o.done && !o.ready) && !(fresh.length && !o.done && !o.ready) ? '<button class="prtb" data-print="' + esc(o.key) + '" title="' + esc(T('اطبع مرة تانية', 'Print again')) + '">🖨 ' + bi('اطبع', 'Print') + '</button>' : '') +
        '<button class="odel" data-del="' + esc(o.key) + '">' + bi('امسح', 'Delete') + '</button></div></div>';
  }).join('') + '</div>';
  // WhatsApp or not, after Accept / Ready
  if (TD.wa) h += '<div class="paysheet"><div class="paybox"><h3 class="display">📲 ' + bi('رسالة واتساب للزبون؟', 'WhatsApp the customer?') + '</h3>' +
    '<p>' + bi('الطلب #' + TD.wa.o.num + (TD.wa.kind === 'confirm' ? ': إنو انقبل طلبو وعم نحضّرو' : TD.wa.o.type === 'Delivery' ? ': إنو طلع للتوصيل' : ': إنو جاهز'),
      'Order #' + TD.wa.o.num + (TD.wa.kind === 'confirm' ? ': it was accepted and is being prepared' : TD.wa.o.type === 'Delivery' ? ': it is on the way' : ': it is ready')) + '</p>' +
    '<div class="paybtns"><button class="payb cash" data-wa="send">📲 ' + bi('ابعت واتساب', 'Send WhatsApp') + '</button><button class="payb whish" data-wa="skip">' + bi('تجاهل', 'Skip') + '</button></div></div></div>';
  // Done on an order not paid yet: how it was paid
  var pf = TD.payFor && TD.list.filter(function (x) { return x.key === TD.payFor })[0];
  if (pf) h += '<div class="paysheet" id="paySheet"><div class="paybox"><h3 class="display">' + (TD.chg ? bi('الطلب #' + pf.num + ': غيّر الدفع', 'Order #' + pf.num + ': change the payment') : bi('الطلب #' + pf.num + ': الحساب', 'Order #' + pf.num + ': payment')) + '</h3>' +
    (TD.chg ? '<p class="muted">' + bi('هلّق: ', 'Now: ') + '<b>' + bi(PAY_AR[pf.payment] || pf.payment, pf.payment) + '</b>' + (pf.disc ? ' · ' + bi('خصم ', 'discount ') + $usd(pf.disc) : '') + '</p>' : '') +
    '<p>' + bi('كيف انْدفع؟', 'How was it paid?') + ' <b class="num">' + $usd(pf.total) + '</b> <small class="muted num">' + ll(pf.total) + '</small></p>' +
    (TD.disc ? '<div class="discbox"><b>🏷️ ' + bi('خصم', 'Discount') + '</b><input id="discPaid" inputmode="decimal" value="' + (TD.chg && pf.disc ? pf.total - pf.disc : '') + '" placeholder="' + esc(T('قدّيش دفعو؟ ($ أو ليرة) أو خصم متل 10%', 'How much did they pay? ($ or L.L.) or a discount like 10%')) + '">' +
      '<input id="discWhy" maxlength="40" value="' + (TD.chg && pf.disc ? esc(pf.discWhy || '') : '') + '" placeholder="' + esc(T('ليش؟ (عيلة، صاحب…) اختياري', 'Why? (family, friend…) optional')) + '"><div id="discShow" class="muted"></div></div>'
      : '<button class="splitl" data-disc="1">🏷️ ' + bi('في خصم', 'There\'s a discount') + '</button>') +
    '<div class="paybtns"><button class="payb cash" data-payhow="Cash">' + bi('كاش', 'Cash') + '</button><button class="payb whish" data-payhow="Whish">' + bi('ويش', 'Whish') + '</button></div>' +
    '<button class="splitl" data-payhow="Split">' + bi('جزء كاش وجزء ويش', 'Part cash, part Whish') + '</button>' +
    '<button class="splitl" data-payhow="House">🏠 ' + bi('للبيت (أكل لبيت الأصحاب، ما بينحسب مبيعات)', 'House (food for the owners, not a sale)') + '</button>' +
    '<button class="ghost" data-payhow="Unpaid">' + bi('لسا ما دفع', 'Still not paid') + '</button> <button class="ghost" data-payhow="cancel">' + bi('رجوع', 'Back') + '</button></div></div>';
  $('#ord').innerHTML = h;
}
function hhmmNow() { return EB.hhmm() }
// what was typed in the discount box -> the discount in L.L.: "10%" off the total, else what they paid ($ for a small
// number, L.L. for a big one); null when it doesn't make sense, 0 when empty
function discOf(o, text) {
  var t = String(text || '').trim(); if (!t) return 0;
  var n = Number(t.replace(/[^0-9.]/g, '')); if (!(n > 0)) return null;
  if (/%/.test(t)) return n < 100 ? Math.round(o.total * n / 100) : null;
  var paid = Math.round(n > 10000 ? n : n * RATE);
  return paid < o.total ? o.total - paid : null;
}
// tickets sent to the kitchen whose second copy hasn't been printed yet: order key -> ticket
// After Accept and Ready: ask before opening WhatsApp, so skipping it keeps the cashier in the app
function askWhatsapp(o, kind) { if (o && o.phone) { TD.wa = {o: o, kind: kind}; } }
function who(o) {
  var bits = (o.name ? '<b>' + esc(o.name) + '</b>' : '') + (o.phone ? '<span class="num ph">+' + esc(o.phone) + '</span>' : '');
  return (bits ? '<div class="ohead">' + bits + '</div>' : '') + (o.type === 'Delivery' && o.address ? '<div class="addr">📍 ' + esc(o.address) + '</div>' : '');
}
// marks: after items were added to an order already in the kitchen, which lines it has and which are new
function itemsOf(o, marks) {
  return o.items.map(function (x) {
    var sent = x.sentQty == null ? x.qty : x.sentQty, mark = !marks ? '' : sent >= x.qty ? '<i class="senti">✓ ' + bi('انبعت', 'sent') + '</i>'
      : '<i class="newi">' + (sent ? bi((x.qty - sent) + ' جديد · لسا ما انبعت', (x.qty - sent) + ' new · not sent') : bi('جديد · لسا ما انبعت', 'new · not sent')) + '</i>';
    return '<span>' + bi(x.qty + ' × ' + (x.ar || x.name), x.qty + ' × ' + x.name) + (x.sauces.length ? ' <small>(' + sauceList(x.sauces) + ')</small>' : '') + mark + '</span>';
  }).join('');
}
function typeTag(o) { return o.type ? '<span class="otype">' + (o.type === 'Delivery' ? bi('توصيل', 'Delivery') : bi('استلام', 'Pickup')) + '</span>' : '' }
// Opens WhatsApp with the message written; staff press send
function whatsapp(o, kind) { var w = window.open(EB.whatsapp(o, kind), '_blank'); if (!w) location.href = EB.whatsapp(o, kind) }
$('#ord').addEventListener('input', function (e) {
  if (e.target.id !== 'discPaid') return;
  var q = TD.list.filter(function (x) { return x.key === TD.payFor })[0]; if (!q) return;
  var d = discOf(q, e.target.value);
  $('#discShow').innerHTML = d ? bi('خصم ', 'Discount ') + '<b class="num">' + $usd(d) + '</b> · ' + bi('بيدفعو ', 'they pay ') + '<b class="num">' + $usd(q.total - d) + '</b> <span class="num">' + ll(q.total - d) + '</span>'
    : d === null ? '<span class="owe">' + bi('لازم يكون أقل من الحساب', 'Must be less than the total') + '</span>' : '';
});
$('#ord').addEventListener('click', function (e) {
  var b = e.target.closest('button');
  if (b && (b.dataset.accept || b.dataset.reject)) {
    var w = (TD.waiting || []).filter(function (x) { return x.key === (b.dataset.accept || b.dataset.reject) })[0]; if (!w) return;
    // accepted: it joins the orders, and WhatsApp opens with the confirmation for the customer (the cashier taps send)
    if (b.dataset.accept) {
      // it waits as New until 🖨 Print sends it to the kitchen, like the orders typed here
      EB.status(w, 'Accepted'); EB.notSent(w); toast('انقبل الطلب #' + w.num, 'Order #' + w.num + ' accepted');
      askWhatsapp(w, 'confirm');
    }
    else if (confirm(T('ترفض الطلب #' + w.num + '؟', 'Reject order #' + w.num + '?'))) {
      EB.status(w, 'Rejected');
      if (w.phone && confirm(T('تبعتلو رسالة إنو ما منقدر ناخد الطلب؟', 'Send them a message that we can\'t take the order?'))) whatsapp(w, 'reject');
    }
    return drawOrders();
  }
  // the stages: ready (a website order's customer gets the WhatsApp message straight away), done, or one step back
  // Print: one ticket each tap. An order not sent yet goes to the kitchen (Preparing) as it prints; items added since
  // print on their own ticket (إضافة على الطلب) and go to the kitchen too; otherwise it's a reprint of the whole order.
  if (b && b.dataset.print) {
    var pr = TD.list.filter(function (x) { return x.key === b.dataset.print })[0]; if (!pr) return;
    var news = !pr.done && !pr.ready && pr.sent !== '-' ? EB.unsent(pr) : [];
    if (!pr.done && !pr.ready && (pr.sent === '-' || news.length)) {
      var so = EB.toKitchen(pr, hhmmNow()), tk = so;
      if (news.length) { tk = JSON.parse(JSON.stringify(so)); tk.items = news; tk.extra = true; tk.total = news.reduce(function (a2, x) { return a2 + x.qty * x.price }, 0) }
      markPrinted(so); printOrder(tk);
      return drawOrders();
    }
    printOrder(pr); return;
  }
  if (b && b.dataset.step) {
    var s = TD.list.filter(function (x) { return x.key === b.dataset.k })[0]; if (!s) return;
    if (b.dataset.step === 'kitchen') {
      // the whole order the first time, then only what was added; two tickets print (one for the kitchen, one for the bag)
      var add = s.sent === '-' ? null : EB.unsent(s);
      var sentO = EB.toKitchen(s, hhmmNow());
      var tk = add ? JSON.parse(JSON.stringify(sentO)) : sentO;
      if (add) { tk.items = add; tk.extra = true; tk.total = add.reduce(function (a2, x) { return a2 + x.qty * x.price }, 0) }
      markPrinted(sentO);   // no printer set up: sent without a ticket
      toast((add ? 'انبعت الجديد عالمطبخ #' : 'انبعت عالمطبخ #') + s.num, (add ? 'New items sent to the kitchen #' : 'Sent to the kitchen #') + s.num);
      return drawOrders();
    }
    if (b.dataset.step === 'ready') {
      EB.ready(s, hhmmNow()); askWhatsapp(s, 'ready');
      toast(s.type === 'Delivery' ? 'الطلب #' + s.num + ' طلع للتوصيل' : 'الطلب #' + s.num + ' جاهز', 'Order #' + s.num + (s.type === 'Delivery' ? ' out for delivery' : ' ready'));
    }
    if (b.dataset.step === 'done') { if (s.payment === 'Unpaid') { TD.payFor = s.key; TD.disc = false; TD.chg = false; return drawOrders() } EB.done(s, hhmmNow()) }
    if (b.dataset.step === 'back') { if (s.done) EB.done(s, ''); else EB.ready(s, '') }
    return drawOrders();
  }
  if (b && b.dataset.wa) { var wa = TD.wa; TD.wa = null; if (wa && b.dataset.wa === 'send') whatsapp(wa.o, wa.kind); return drawOrders() }
  if (b && b.dataset.msg) { var u = TD.list.filter(function (x) { return x.key === b.dataset.msg })[0]; if (u) whatsapp(u, 'ready'); return }
  // the payment tag: change how an order was paid (a mistake, Whish that was really cash…)
  if (b && b.dataset.paychg) { var pc = TD.list.filter(function (x) { return x.key === b.dataset.paychg })[0]; if (!pc) return; TD.payFor = pc.key; TD.chg = true; TD.disc = !!pc.disc; return drawOrders() }
  if (b && b.dataset.disc) { TD.disc = true; drawOrders(); var di = $('#discPaid'); if (di) di.focus(); return }
  if (b && b.dataset.payhow) {
    var q = TD.list.filter(function (x) { return x.key === TD.payFor })[0], part = null, disc = 0, why = '';
    if (q && TD.disc && ['Cash', 'Whish', 'Split'].indexOf(b.dataset.payhow) >= 0) {
      disc = discOf(q, $('#discPaid').value); why = $('#discWhy').value.trim();
      if (disc == null) { $('#discShow').innerHTML = '<span class="owe">' + bi('اكتب قدّيش دفعو (أقل من الحساب) أو نسبة الخصم', 'Type what they paid (less than the total) or the discount %') + '</span>'; return }
    }
    if (q && b.dataset.payhow === 'Split' && (part = askSplit({total: q.total - disc})) == null) return;
    var chg = TD.chg; TD.payFor = null; TD.disc = false; TD.chg = false;
    if (q && chg && b.dataset.payhow !== 'cancel') {
      // keeps the day it was paid on; an order not paid before counts as paid today
      var same = b.dataset.payhow === q.payment && disc === (q.disc || 0) && (b.dataset.payhow !== 'Split' || part === q.whish);
      if (!same) {
        EB.paid(q, b.dataset.payhow, q.payment === 'Unpaid' ? EB.bizDay(DAY_END) : q.paidLater || q.day, part, disc, why);
        toast('#' + q.num + ': ' + (PAY_AR[b.dataset.payhow] || b.dataset.payhow), '#' + q.num + ': ' + b.dataset.payhow);
      }
      return drawOrders();
    }
    if (q && b.dataset.payhow !== 'cancel') {
      if (b.dataset.payhow !== 'Unpaid') EB.paid(q, b.dataset.payhow, EB.bizDay(DAY_END), part, disc, why);
      if (disc) toast('خصم ' + $usd(disc) + ' على #' + q.num, 'Discount ' + $usd(disc) + ' on #' + q.num);
      EB.done(q, hhmmNow());
    }
    return drawOrders();
  }
  if (!b && e.target.closest('#paySheet')) return;
  if (!b) {
    var row = e.target.closest('.ord'); if (!row) return;
    var picked = TD.list.filter(function (x) { return x.key === row.dataset.key })[0];
    if (picked) editOrder(picked);
    return;
  }
  var key = b.dataset.del, o = TD.list.filter(function (x) { return x.key === key })[0]; if (!o) return;
  if (!confirm(T('تمسح الطلب رقم ' + o.num + '؟ بينمسح من كل مكان.', 'Delete order #' + o.num + '? It is removed everywhere.'))) return;
  EB.remove(o); toast('انمسح الطلب', 'Order deleted');
});
/* Every 15 seconds: new website orders, on any tab (a badge on Today's orders and a sound) */
var seenWeb = null, audio = null;
function chime() {
  if (!audio) return;
  try {
    var t = audio.currentTime;
    [660, 880, 1175].forEach(function (f, i) {
      var o = audio.createOscillator(), g = audio.createGain();
      o.type = 'sine'; o.frequency.value = f; o.connect(g); g.connect(audio.destination);
      g.gain.setValueAtTime(0.0001, t + i * 0.18); g.gain.exponentialRampToValueAtTime(0.6, t + i * 0.18 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.18 + 0.4);
      o.start(t + i * 0.18); o.stop(t + i * 0.18 + 0.45);
    });
  } catch (e) {}
}
// iPads only allow sound after a tap: the first tap anywhere turns it on
document.addEventListener('click', function () { if (!audio) try { audio = new (window.AudioContext || window.webkitAudioContext)() } catch (e) {} }, {once: true});
function checkWeb() {
  var today = EB.bizDay(DAY_END), waiting = knownOrders().filter(function (o) { return o.day === today && o.status === 'Waiting' });
  var badge = $('#webBadge'); badge.hidden = !waiting.length; badge.textContent = '🌐 ' + waiting.length;
  var fresh = seenWeb ? waiting.filter(function (o) { return !seenWeb[o.key] }) : [];
  seenWeb = {}; waiting.forEach(function (o) { seenWeb[o.key] = 1 });
  if (fresh.length && ROLE === 'cashier') { chime(); toast('🌐 طلب جديد من الموقع', 'New website order'); arrivePrint(fresh) }
}
function poll() {
  if (EB.pending().length || !EB.key() || ROLE !== 'cashier') return;
  loadRecent().then(function () { checkWeb(); if ($('#ordersView').style.display === 'block') drawOrders() }, function () {});
}
setInterval(poll, 15000);
setInterval(function () { if ($('#ordersView').style.display === 'block' && TD.loaded) drawOrders() }, 30000);

