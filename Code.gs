/**
 * El Bash order screen (iPad), kitchen screen and sales report.
 * Paste this whole file into the El Bash Orders project at script.google.com,
 * then Deploy > Manage deployments > edit > Version: New version > Deploy.
 * Leave the PIN in Settings empty for no lock, or type one to lock the Sales tab.
 * Orders are written to the Orders and Order Items tabs. Prices come from the Menu tab.
 * Sauces chosen with an item go in the Order Items "Sauces" column and after " — " in the order's Items text.
 *
 * Links (same deployment):
 *   …/exec                                        the order screen
 *   …/exec?screen=kitchen                         the kitchen screen (every item of every order)
 *   …/exec?screen=kitchen&station=Sandwiches      a screen for one station, if the Menu tab names stations
 */

// The screens live on GitHub, so they can be updated (or new ones added) without touching this script.
var PAGE_BASE = 'https://raw.githubusercontent.com/HananeKalakesh/BachaSnackOrder/pos/';
var TITLES = { order: 'El Bash Orders', kitchen: 'El Bash Kitchen' };

function doGet(e) {
  var screen = String((e && e.parameter.screen) || 'order').toLowerCase();
  if (!/^[a-z]+$/.test(screen)) screen = 'order';
  var file = screen === 'order' ? 'page.html' : screen + '.html';
  var page = UrlFetchApp.fetch(PAGE_BASE + file + '?v=' + Math.floor(Date.now() / 60000)).getContentText('UTF-8');
  return HtmlService.createHtmlOutput(page)
    .setTitle(TITLES[screen] || 'El Bash')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no');
}

var SHEET_ID = '1c286Sjxb7svai2OF6fjNIKaPnI3dt7JhKH78UDtvdgI';  // El Bash – Orders & Sales
function book_() { return SpreadsheetApp.openById(SHEET_ID) }
function tz_() { return book_().getSpreadsheetTimeZone() }
function settings_() {
  var v = book_().getSheetByName('Settings').getRange('B3:B9').getValues();
  return { rate: Number(v[0][0]) || 89500, pin: String(v[1][0]).trim(), yellow: Number(v[5][0]) || 10, red: Number(v[6][0]) || 20 };
}
function checkPin_(pin) {
  var real = settings_().pin;
  if (real && String(pin).trim() !== real) throw new Error('Wrong PIN');
}
function dayKey_(d) { return d instanceof Date ? Utilities.formatDate(d, tz_(), 'yyyy-MM-dd') : String(d) }

/** Items marked "On order screen" in the Menu tab. */
function getMenu() {
  var rows = book_().getSheetByName('Menu').getDataRange().getValues().slice(1);
  var items = rows.filter(function (r) { return r[1] && r[5] === true && Number(r[4]) > 0 })
    .map(function (r) { return { cat: String(r[0]), name: String(r[1]), ar: String(r[2]), price: Number(r[4]) } });
  return { rate: settings_().rate, items: items };
}

/** Saves one order. Prices are taken from the Menu tab, not from the iPad. */
function saveOrder(order) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var ss = book_(), orders = ss.getSheetByName('Orders'), lines = ss.getSheetByName('Order Items');
    var tz = tz_(), rate = settings_().rate;

    // An order resent after a dropped connection is saved only once.
    var last = orders.getLastRow();
    if (last > 1) {
      var from = Math.max(2, last - 199);
      var refs = orders.getRange(from, 14, last - from + 1, 1).getValues();
      for (var k = 0; k < refs.length; k++) if (refs[k][0] === order.uid) {
        var row = orders.getRange(from + k, 1, 1, 6).getValues()[0];
        return { num: row[0], total: row[5], duplicate: true };
      }
    }

    var menu = {};
    getMenu().items.forEach(function (it) { menu[it.name] = it });
    var items = (order.items || []).filter(function (x) { return x.qty > 0 });
    items.forEach(function (x) {
      x.sauces = (x.sauces || []).slice(0, 4).map(function (s) { return String(s).slice(0, 40) }).filter(String);
    });
    if (!items.length) throw new Error('The order is empty');
    items.forEach(function (x) { if (!menu[x.name]) throw new Error('"' + x.name + '" is not on the menu any more. Reopen the order screen.') });

    var when = order.at ? new Date(order.at) : new Date();
    var day = Utilities.formatDate(when, tz, 'yyyy-MM-dd');
    var time = Utilities.formatDate(when, tz, 'HH:mm');

    // Order numbers restart from 1 each day.
    var props = PropertiesService.getScriptProperties();
    var num = props.getProperty('day') === day ? Number(props.getProperty('num')) + 1 : 1;
    props.setProperties({ day: day, num: String(num) });

    var total = 0, count = 0;
    items.forEach(function (x) { total += x.qty * menu[x.name].price; count += x.qty });
    var text = items.map(function (x) { return x.qty + ' × ' + x.name + (x.sauces.length ? ' — ' + x.sauces.join(' + ') : '') }).join(', ');

    var r = orders.getLastRow() + 1;
    orders.getRange(r, 1, 1, 14).setValues([[
      num, day, "'" + time, text, count, total, order.payment === 'Whish' ? 'Whish' : 'Cash',
      0, total, rate,  // paid in full, at the menu total
      '=H' + r + '*J' + r + '+I' + r, '=K' + r + '-F' + r, order.note || '', order.uid || ''
    ]]);

    var l = lines.getLastRow() + 1;
    lines.getRange(l, 1, items.length, 8).setValues(items.map(function (x, i) {
      return [num, day, x.name, menu[x.name].cat, x.qty, menu[x.name].price, '=E' + (l + i) + '*F' + (l + i), x.sauces.join(', ')];
    }));
    return { num: num, total: total };
  } finally {
    lock.releaseLock();
  }
}

/* ---------- kitchen ---------- */

/** The Orders column "<station> done" (e.g. "Kitchen done"); 0 if it doesn't exist and create is false. */
function doneCol_(sheet, station, create) {
  var name = station + ' done', w = sheet.getLastColumn();
  var head = sheet.getRange(1, 1, 1, w).getValues()[0];
  for (var i = 0; i < head.length; i++) if (String(head[i]).trim() === name) return i + 1;
  if (!create) return 0;
  if (sheet.getMaxColumns() <= w) sheet.insertColumnAfter(w);
  sheet.getRange(1, w + 1).setValue(name);
  return w + 1;
}

/**
 * Open orders for one kitchen station, oldest first, with that station's items to make.
 * An item belongs to a station when the Menu tab's "Kitchen screen" column (G) names it;
 * if that column is empty everywhere, every item goes to every station.
 */
function getKitchen(station) {
  station = String(station || 'Kitchen');
  var ss = book_(), tz = tz_(), st = settings_(), now = Date.now();

  // Only orders placed after this station's screen was first opened, so old orders don't flood it.
  var props = PropertiesService.getScriptProperties(), since = Number(props.getProperty('since:' + station));
  if (!since) { since = now - 60000; props.setProperty('since:' + station, String(since)) }

  var info = {}, named = false;
  ss.getSheetByName('Menu').getDataRange().getValues().slice(1).forEach(function (r) {
    if (!r[1]) return;
    info[r[1]] = { ar: String(r[2] || ''), cat: String(r[0]), station: String(r[6] || '').trim() };
    if (info[r[1]].station) named = true;
  });
  function here(name) {
    var m = info[name]; if (!m) return false;
    return named ? m.station === station : true;
  }

  var orders = ss.getSheetByName('Orders'), last = orders.getLastRow(), list = [], open = {};
  if (last > 1) {
    var col = doneCol_(orders, station, false), from = Math.max(2, last - 299);
    orders.getRange(from, 1, last - from + 1, Math.max(14, col)).getValues().forEach(function (r) {
      if (r[0] === '' || (col && r[col - 1] !== '')) return;
      var day = dayKey_(r[1]), time = r[2] instanceof Date ? Utilities.formatDate(r[2], tz, 'HH:mm') : String(r[2]);
      var at = Utilities.parseDate(day + ' ' + time, tz, 'yyyy-MM-dd HH:mm').getTime();
      if (at < since - 60000 || now - at > 12 * 3600000) return;
      var o = { key: day + '#' + r[0], num: r[0], day: day, time: time, at: at, note: String(r[12] || ''), items: [], other: [] };
      open[o.key] = o; list.push(o);
    });
  }
  if (list.length) {
    var li = ss.getSheetByName('Order Items'), ll = li.getLastRow(), lf = Math.max(2, ll - 999);
    li.getRange(lf, 1, ll - lf + 1, 8).getValues().forEach(function (r) {
      var o = open[dayKey_(r[1]) + '#' + r[0]]; if (!o) return;
      var x = { name: String(r[2]), ar: (info[r[2]] || {}).ar || '', qty: Number(r[4]) || 0, sauces: r[7] ? String(r[7]).split(', ') : [] };
      (here(x.name) ? o.items : o.other).push(x);
    });
  }
  return { now: now, yellow: st.yellow, red: st.red, orders: list.filter(function (o) { return o.items.length }) };
}

/** Marks an order done for a station (writes the time), or clears it again when undo is true. */
function markDone(station, day, num, undo) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var orders = book_().getSheetByName('Orders'), col = doneCol_(orders, String(station || 'Kitchen'), true);
    var last = orders.getLastRow(), from = Math.max(2, last - 299);
    var v = orders.getRange(from, 1, last - from + 1, 2).getValues();
    for (var i = v.length - 1; i >= 0; i--) if (v[i][0] == num && dayKey_(v[i][1]) === day) {
      orders.getRange(from + i, col).setValue(undo ? '' : "'" + Utilities.formatDate(new Date(), tz_(), 'HH:mm'));
      return true;
    }
    return false;
  } finally {
    lock.releaseLock();
  }
}

/* ---------- sales ---------- */

/** Totals for a date range (dates as yyyy-mm-dd). */
function getReport(pin, from, to) {
  checkPin_(pin);
  var ss = book_(), rate = settings_().rate;
  var o = ss.getSheetByName('Orders').getDataRange().getValues().slice(1);
  var li = ss.getSheetByName('Order Items').getDataRange().getValues().slice(1);
  var inRange = function (d) { var k = dayKey_(d); return k >= from && k <= to };

  var s = { orders: 0, items: 0, sales: 0, paidUsd: 0, paidLbp: 0, received: 0, cashOrders: 0, cashLbp: 0, whishOrders: 0, whishLbp: 0 };
  var days = {}, list = [];
  o.forEach(function (r) {
    if (r[0] === '' || !inRange(r[1])) return;
    var day = dayKey_(r[1]), got = Number(r[10]) || 0;
    s.orders++; s.sales += Number(r[5]) || 0; s.paidUsd += Number(r[7]) || 0; s.paidLbp += Number(r[8]) || 0; s.received += got;
    if (r[6] === 'Whish') { s.whishOrders++; s.whishLbp += got } else { s.cashOrders++; s.cashLbp += got }
    days[day] = days[day] || { date: day, orders: 0, sales: 0 };
    days[day].orders++; days[day].sales += Number(r[5]) || 0;
    list.push({ num: r[0], date: day, time: String(r[2]), items: r[3], total: Number(r[5]) || 0, payment: r[6], paidUsd: Number(r[7]) || 0, paidLbp: Number(r[8]) || 0 });
  });
  var items = {};
  li.forEach(function (r) {
    if (r[0] === '' || !inRange(r[1])) return;
    var it = items[r[2]] = items[r[2]] || { name: r[2], qty: 0, sales: 0 };
    it.qty += Number(r[4]) || 0; it.sales += (Number(r[4]) || 0) * (Number(r[5]) || 0);
  });
  s.items = Object.keys(items).reduce(function (a, k) { return a + items[k].qty }, 0);

  var spanDays = (new Date(to) - new Date(from)) / 864e5;
  return {
    rate: rate, summary: s,
    items: Object.keys(items).map(function (k) { return items[k] }).sort(function (a, b) { return b.qty - a.qty || b.sales - a.sales }),
    days: Object.keys(days).sort().map(function (k) { return days[k] }),
    orders: spanDays <= 2 ? list.reverse() : null
  };
}

/** Removes an order (and its items) entered by mistake. */
function deleteOrder(pin, day, num) {
  checkPin_(pin);
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    [['Orders', 0, 1], ['Order Items', 0, 1]].forEach(function (t) {
      var sh = book_().getSheetByName(t[0]), v = sh.getDataRange().getValues();
      for (var i = v.length - 1; i >= 1; i--) if (v[i][0] === num && dayKey_(v[i][1]) === day) sh.deleteRow(i + 1);
    });
  } finally {
    lock.releaseLock();
  }
}
