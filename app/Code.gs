/**
 * El Bash: the link between the app and the El Bash – Orders & Sales sheet.
 *
 * Paste this whole file into the El Bash Orders project at script.google.com, then
 * Deploy > Manage deployments > edit > Version: New version > Deploy.
 * This version is meant to stay: the app (on GitHub Pages) does all the work and only uses the fixed actions
 * below, so new features don't need pasting. Only a new kind of Google access (e.g. sending email) would.
 *
 * Actions, sent as JSON by POST (or google.script.run.api) with the app key from the Settings tab:
 *   {action: 'read', tabs: [{tab, last}]}
 *       the header and rows of those tabs (only the last N rows when last is given);
 *       dates come back as yyyy-mm-dd and times as HH:mm, in the sheet's time zone
 *   {action: 'webOrder', order: {...}}  NO key: an order from the menu website. Checked here against the Menu tab
 *       (prices come from the sheet), limited per phone number, and saved as Not paid with Status "Waiting"
 *       until staff accept it in the app
 *   {action: 'files'}                 what is in the El Bash folder in Google Drive, by sub-folder
 *   {action: 'file', id}              one file from that folder as data (to share it, e.g. to a WhatsApp story)
 *   {action: 'copyAssets'}            copies the website's menu photos, logos and materials (stories, menus…) into the folder (new ones only)
 *   {action: 'write', ops: [...]}     done in order, together, under a lock
 *       {op: 'append', tab, rows: [{Header: value}], unique: 'Header'}
 *           adds rows; a header the tab doesn't have yet becomes a new column;
 *           with unique, nothing is added if a row already has the first row's value in that column (a resent order)
 *       {op: 'update', tab, where: {Header: value}, set: {Header: value}}   every row matching all of where
 *       {op: 'remove', tab, where: {Header: value}}                         any tab but Menu and Settings
 * Links:
 *   …/exec                  the order screen (the app's own link on GitHub Pages also works offline)
 *   …/exec?screen=kitchen   the kitchen screen
 *   …/exec?format=menu      the menu as JSON for the menu website (no key needed)
 */

var SHEET_ID = '1c286Sjxb7svai2OF6fjNIKaPnI3dt7JhKH78UDtvdgI';  // El Bash – Orders & Sales
// The tabs the app uses today; a new feature can add its own tab (a plain English name) without pasting this again
var TABS = ['Orders', 'Order Items', 'Menu', 'Settings', 'Purchases', 'Ingredients', 'Recipes', 'Recipe Lines', 'Stock', 'Links'];
var APP_URL = 'https://hananekalakesh.github.io/BachaSnackOrder/app/';
var FOLDER_ID = '1emJrOfqaE3bP1RGid38uyHoYBuPlB76R';  // the El Bash folder in Google Drive (menus, stories, logos, photos…)
var SITE_URL = 'https://hananekalakesh.github.io/BachaSnackOrder/';
// Where the website's files are copied in Drive: its menu photos, and the logos
var COPY_TO = { menu: '1aq-gpsuNhII9uaaYYsRF_rNcz_hXYHbk', brand: '1Gxub86ScNlnYfbhwqAl2bJRP4xRIGIMS' };

function book_() { return SpreadsheetApp.openById(SHEET_ID) }

/** Run this once from the editor (choose allowDrive next to Run): Google asks to allow the script to use the El Bash
 *  folder in Drive and to fetch the website's files. Needed for the Marketing screen and "Copy to Drive". */
function allowDrive() {
  var name = DriveApp.getFolderById(FOLDER_ID).getName();
  UrlFetchApp.fetch(SITE_URL + 'app/assets.json');
  Logger.log('All set: the script can use the "' + name + '" folder in Drive.');
}

function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p.format === 'menu') return json_(menu_());
  // The screens themselves live on GitHub Pages; this link shows them too, for iPads set up with it.
  var file = p.screen === 'kitchen' ? 'kitchen.html' : 'index.html';
  var cache = CacheService.getScriptCache(), page;
  try {
    page = UrlFetchApp.fetch(APP_URL + file + '?v=' + Math.floor(Date.now() / 60000)).getContentText('UTF-8');
    try { cache.put('page:' + file, page, 21600) } catch (err) {}
  } catch (err) {
    page = cache.get('page:' + file);
    if (!page) throw err;
  }
  return HtmlService.createHtmlOutput(page).setTitle(p.screen === 'kitchen' ? 'El Bash Kitchen' : 'El Bash Orders')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no');
}

function doPost(e) {
  var out;
  try { out = handle_(JSON.parse(e.postData.contents)) } catch (err) { out = { error: String(err.message || err) } }
  return json_(out);
}

/** The same actions for screens opened through this script's own link (google.script.run). */
function api(req) {
  try { return handle_(req) } catch (err) { return { error: String(err.message || err) } }
}

function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON) }

function handle_(req) {
  var ss = book_();
  if (req.action === 'webOrder') return webOrder_(ss, req.order || {});
  var key = setting_(ss, 'App key');
  if (!key || String(req.key || '') !== key) throw new Error('Wrong app key');
  if (req.action === 'read') return read_(ss, req.tabs || []);
  if (req.action === 'write') return write_(ss, req.ops || []);
  if (req.action === 'files') return files_();
  if (req.action === 'file') return file_(String(req.id || ''));
  if (req.action === 'copyAssets') return copyAssets_();
  throw new Error('Unknown action');
}

/** What is in the El Bash Drive folder, by sub-folder, for the management app's Home screen (kept 5 minutes). */
function files_() {
  var cache = CacheService.getScriptCache(), hit = cache.get('files');
  if (hit) return JSON.parse(hit);
  var root = DriveApp.getFolderById(FOLDER_ID), out = { url: root.getUrl(), folders: [] };
  var list = function (folder) {
    var files = [], it = folder.getFiles();
    while (it.hasNext() && files.length < 60) {
      var f = it.next();
      files.push({ id: f.getId(), name: f.getName(), url: f.getUrl(), type: f.getMimeType(), size: f.getSize(), updated: f.getLastUpdated().getTime() });
    }
    return files.sort(function (a, b) { return b.updated - a.updated });
  };
  out.folders.push({ name: '', url: root.getUrl(), files: list(root) });
  var subs = root.getFolders();
  while (subs.hasNext()) { var s = subs.next(); out.folders.push({ name: s.getName(), url: s.getUrl(), files: list(s) }) }
  out.folders.sort(function (a, b) { return a.name < b.name ? -1 : 1 });
  try { cache.put('files', JSON.stringify(out), 60) } catch (err) {}
  return out;
}

/** One file from the El Bash folder (or one level below), as data, so the app can share it (e.g. to a WhatsApp story). */
function file_(id) {
  var f = DriveApp.getFileById(id), ok = false, parents = f.getParents();
  while (parents.hasNext()) {
    var p = parents.next();
    if (p.getId() === FOLDER_ID) ok = true;
    var up = p.getParents();
    while (up.hasNext()) if (up.next().getId() === FOLDER_ID) ok = true;
  }
  if (!ok) throw new Error('Only files in the El Bash folder can be shared');
  if (f.getSize() > 30 * 1024 * 1024) throw new Error('This file is too big to share from the app (over 30 MB). Open it in Drive instead.');
  return { name: f.getName(), type: f.getMimeType(), data: Utilities.base64Encode(f.getBlob().getBytes()) };
}

/** Copies the files listed in app/assets.json into the Drive folders, skipping any already there: the menu photos and
 *  logos (menu, brand), and under "drive" any material by the name of its sub-folder of the El Bash folder
 *  (e.g. "2 Social media & stories"), so new materials only need a line in assets.json. */
function copyAssets_() {
  var list = JSON.parse(UrlFetchApp.fetch(SITE_URL + 'app/assets.json').getContentText()), added = 0, kept = 0;
  var copy = function (folder, files) {
    var have = {}, it = folder.getFiles();
    while (it.hasNext()) have[it.next().getName()] = true;
    (files || []).forEach(function (x) {
      if (have[x.name] || !/^[\w\/.-]+$/.test(x.path)) { kept++; return }
      folder.createFile(UrlFetchApp.fetch(SITE_URL + x.path).getBlob().setName(x.name)); added++;
    });
  };
  Object.keys(COPY_TO).forEach(function (group) { copy(DriveApp.getFolderById(COPY_TO[group]), list[group]) });
  var root = DriveApp.getFolderById(FOLDER_ID);
  Object.keys(list.drive || {}).forEach(function (name) {
    var subs = root.getFoldersByName(name);
    copy(subs.hasNext() ? subs.next() : root.createFolder(name), list.drive[name]);
  });
  CacheService.getScriptCache().remove('files');
  return { added: added, kept: kept };
}

/** A value from the Settings tab, found by the start of its label in column A. */
function setting_(ss, label) {
  var v = ss.getSheetByName('Settings').getDataRange().getValues();
  for (var i = 0; i < v.length; i++) if (String(v[i][0]).indexOf(label) === 0) return String(v[i][1]).trim();
  return '';
}

/** Dates as yyyy-mm-dd, times (dates in 1899) as HH:mm, both in the sheet's time zone. */
function cell_(v, tz) {
  if (!(v instanceof Date)) return v;
  if (v.getFullYear() < 1900) return Utilities.formatDate(v, tz, 'HH:mm');
  var hm = Utilities.formatDate(v, tz, 'HH:mm');
  return Utilities.formatDate(v, tz, 'yyyy-MM-dd') + (hm === '00:00' ? '' : ' ' + hm);
}

function sheet_(ss, tab) {
  if (TABS.indexOf(tab) < 0 && !/^[A-Z][A-Za-z ]{1,39}$/.test(String(tab))) throw new Error('Unknown tab: ' + tab);
  return ss.getSheetByName(tab) || ss.insertSheet(tab);   // a new tab is made the first time it is used
}

function read_(ss, tabs) {
  var tz = ss.getSpreadsheetTimeZone(), out = { tz: tz, now: Date.now() };
  tabs.forEach(function (t) {
    var sh = sheet_(ss, t.tab), last = sh.getLastRow(), w = sh.getLastColumn();
    var head = w ? sh.getRange(1, 1, 1, w).getValues()[0].map(String) : [];
    var from = t.last ? Math.max(2, last - t.last + 1) : 2;
    var rows = last >= from && w ? sh.getRange(from, 1, last - from + 1, w).getValues().map(function (r) {
      return r.map(function (v) { return cell_(v, tz) });
    }) : [];
    out[t.tab] = { head: head, rows: rows };
  });
  return out;
}

/** Column numbers by header; missing headers are added as new columns when add is true. */
function columns_(sh, names, add) {
  var w = sh.getLastColumn(), head = w ? sh.getRange(1, 1, 1, w).getValues()[0].map(function (h) { return String(h).trim() }) : [], cols = {};
  names.forEach(function (n) {
    var i = head.indexOf(n);
    if (i < 0) {
      if (!add) throw new Error('No column "' + n + '" in ' + sh.getName());
      if (sh.getMaxColumns() <= head.length) sh.insertColumnAfter(head.length);
      sh.getRange(1, head.length + 1).setValue(n);
      head.push(n); i = head.length - 1;
    }
    cols[n] = i + 1;
  });
  return cols;
}

/** Row numbers whose cells equal every value in where (compared as text, dates as yyyy-mm-dd). */
function matches_(sh, where, tz) {
  var names = Object.keys(where);
  if (!names.length) throw new Error('A change needs a where');
  var cols = columns_(sh, names, false), last = sh.getLastRow(), found = [];
  if (last < 2) return found;
  var v = sh.getRange(2, 1, last - 1, sh.getLastColumn()).getValues();
  for (var r = 0; r < v.length; r++) {
    var ok = names.every(function (n) { return String(cell_(v[r][cols[n] - 1], tz)) === String(where[n]) });
    if (ok) found.push(r + 2);
  }
  return found;
}

function write_(ss, ops) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try { return apply_(ss, ops) } finally { lock.releaseLock() }
}

function apply_(ss, ops) {
  {
    var tz = ss.getSpreadsheetTimeZone(), results = ops.map(function (op) {
      var sh = sheet_(ss, op.tab);
      if (op.op === 'append') {
        var rows = op.rows || [];
        if (!rows.length) return { added: 0 };
        var names = [];
        rows.forEach(function (r) { Object.keys(r).forEach(function (n) { if (names.indexOf(n) < 0) names.push(n) }) });
        var cols = columns_(sh, names, true);
        if (op.unique && rows[0][op.unique] != null) {
          var w = {}; w[op.unique] = rows[0][op.unique];
          if (matches_(sh, w, tz).length) return { added: 0, duplicate: true };
        }
        var width = sh.getLastColumn(), start = sh.getLastRow() + 1;
        var grid = rows.map(function (r) {
          var line = []; for (var c = 0; c < width; c++) line.push('');
          Object.keys(r).forEach(function (n) { line[cols[n] - 1] = r[n] == null ? '' : r[n] });
          return line;
        });
        sh.getRange(start, 1, grid.length, width).setValues(grid);
        return { added: grid.length };
      }
      if (op.op === 'update') {
        var set = op.set || {}, setCols = columns_(sh, Object.keys(set), true), hit = matches_(sh, op.where || {}, tz);
        hit.forEach(function (row) { Object.keys(set).forEach(function (n) { sh.getRange(row, setCols[n]).setValue(set[n] == null ? '' : set[n]) }) });
        return { updated: hit.length };
      }
      if (op.op === 'remove') {
        if (op.tab === 'Menu' || op.tab === 'Settings') throw new Error('Rows can not be removed from Menu or Settings');
        var gone = matches_(sh, op.where || {}, tz);
        for (var i = gone.length - 1; i >= 0; i--) sh.deleteRow(gone[i]);
        return { removed: gone.length };
      }
      throw new Error('Unknown change: ' + op.op);
    });
    SpreadsheetApp.flush();
    return { results: results };
  }
}

/* ---------- orders from the menu website ---------- */

/** A WhatsApp number as digits with the country code (Lebanese numbers get 961), or '' if it doesn't look like one. */
function phone_(p) {
  var d = String(p || '').replace(/\D/g, '');
  if (d.indexOf('00') === 0) d = d.slice(2);
  if (d.indexOf('961') !== 0 && d.length >= 7 && d.length <= 8) d = '961' + d.replace(/^0/, '');
  return d.length >= 10 && d.length <= 15 ? d : '';
}

function webOrder_(ss, o) {
  var text = function (v, n) { return String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n) };
  var name = text(o.name, 40), phone = phone_(o.phone), type = o.type === 'Delivery' ? 'Delivery' : 'Pickup';
  var address = text(o.address, 200), note = text(o.note, 200), lang = o.lang === 'ar' ? 'ar' : 'en';
  if (!name) throw new Error('Please enter your name.');
  if (!phone) throw new Error('Please enter your WhatsApp number.');
  if (type === 'Delivery' && !address) throw new Error('Please enter your delivery address.');

  // Against spam: 3 orders per number every 10 minutes, 40 website orders an hour in all
  var cache = CacheService.getScriptCache(), mine = Number(cache.get('web:' + phone) || 0), all = Number(cache.get('web:all') || 0);
  if (mine >= 3) throw new Error('Too many orders from this number. Please call or WhatsApp us.');
  if (all >= 40) throw new Error('We are very busy right now. Please call or WhatsApp us.');
  var st = status_(ss);
  if (st && st.mode === 'paused') throw new Error('We are very busy right now. Please call or WhatsApp us.');

  // Items and prices only from the Menu tab, and only what is on the menu right now
  var menu = {}, head = [], rate = Number(String(setting_(ss, 'USD rate')).replace(/,/g, '')) || 89500;
  ss.getSheetByName('Menu').getDataRange().getValues().forEach(function (r, i) {
    if (!i) { head = r.map(String); return }
    var m = {}; head.forEach(function (h, k) { m[h] = r[k] });
    // the price in L.L., or the $ price at today's rate
    m.price = Number(m['Price (L.L.)']) || Math.round((Number(String(m['Price ($)'] || '').replace(/[^0-9.]/g, '')) || 0) * rate);
    if (m['Item'] && m['On order screen'] === true && m.price > 0) menu[String(m['Item']).trim()] = m;
  });
  var items = (o.items || []).slice(0, 30).map(function (x) {
    return { name: text(x.name, 80), qty: Math.min(50, Math.floor(Number(x.qty) || 0)),
      sauces: (x.sauces || []).slice(0, 4).map(function (v) { return text(v, 40) }).filter(String) };
  }).filter(function (x) { return x.qty > 0 });
  if (!items.length) throw new Error('Your order is empty.');
  var total = 0;
  items.forEach(function (x) {
    var m = menu[x.name];
    if (!m) throw new Error('"' + x.name + '" is not available right now. Please remove it and send again.');
    x.price = m.price; x.cat = String(m['Category']); total += x.qty * x.price;
  });
  var itemsText = items.map(function (x) { return x.qty + ' × ' + x.name + (x.sauces.length ? ' — ' + x.sauces.join(' + ') : '') }).join(', ');

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var tz = ss.getSpreadsheetTimeZone(), dayEnd = Number(setting_(ss, 'Day ends') || 2), now = new Date();
    var day = Utilities.formatDate(new Date(now.getTime() - dayEnd * 3600000), tz, 'yyyy-MM-dd'), time = Utilities.formatDate(now, tz, 'HH:mm');
    // the next number that business day
    var orders = ss.getSheetByName('Orders'), last = orders.getLastRow(), num = 1;
    if (last > 1) {
      var from = Math.max(2, last - 499);
      orders.getRange(from, 1, last - from + 1, 2).getValues().forEach(function (r) {
        if (r[0] !== '' && String(cell_(r[1], tz)) === day && Number(r[0]) >= num) num = Number(r[0]) + 1;
      });
    }
    var ref = 'web' + now.getTime().toString(36) + Math.random().toString(36).slice(2, 6);
    apply_(ss, [
      { op: 'append', tab: 'Orders', rows: [{ 'Order #': num, 'Date': day, 'Time': "'" + time, 'Items': itemsText,
        'Item count': items.reduce(function (a, x) { return a + x.qty }, 0), 'Order total (L.L.)': total, 'Payment': 'Unpaid', 'Paid ($)': 0, 'Paid (L.L.)': 0,
        'USD rate': rate,
        'Paid total (L.L.)': '=INDEX(H:H,ROW())*INDEX(J:J,ROW())+INDEX(I:I,ROW())', 'Difference (L.L.)': '=INDEX(K:K,ROW())-INDEX(F:F,ROW())',
        'Note': note, 'Ref': ref, 'Name': name, 'Pickup / Delivery': type, 'Source': 'Website', 'Phone': phone, 'Address': address,
        'Status': 'Waiting', 'Language': lang }] },
      { op: 'append', tab: 'Order Items', rows: items.map(function (x) {
        return { 'Order #': num, 'Date': day, 'Item': x.name, 'Category': x.cat, 'Qty': x.qty, 'Unit price (L.L.)': x.price,
          'Line total (L.L.)': '=INDEX(E:E,ROW())*INDEX(F:F,ROW())', 'Sauces': x.sauces.join(', '), 'Ref': ref };
      }) }]);
  } finally {
    lock.releaseLock();
  }
  cache.put('web:' + phone, String(mine + 1), 600);
  cache.put('web:all', String(all + 1), 3600);
  return { ok: true, num: num, total: total };
}

/** Busy mode, set by the cashier (Status tab, row "Website"): {mode: 'busy' (orders take longer, wait = extra minutes)
 *  or 'paused' (no website orders), until: when it ends by itself}, or null. */
function status_(ss) {
  var sh = ss.getSheetByName('Status');
  if (!sh || sh.getLastRow() < 2) return null;
  var v = sh.getDataRange().getValues(), head = v[0].map(String), out = null;
  v.slice(1).forEach(function (r) { var m = {}; head.forEach(function (h, k) { m[h] = r[k] }); if (String(m['Key']) === 'Website') out = m });
  if (!out || !out['Value'] || Number(out['Until']) < Date.now()) return null;
  return { mode: String(out['Value']), wait: Number(out['Wait']) || 0, until: Number(out['Until']) };
}

/** The photos in the "6 Menu photos" folder in Drive, by the item they are named after ("Crispy Meal.jpg",
 *  "Wings Meal 14 PCS.png"): {"crispy meal": fileId}, the newest file winning. Each is shared "anyone with the link" so
 *  customers' phones can show it. Kept 10 minutes, so a photo added in Drive shows on the website within 10 minutes. */
function menuPhotos_() {
  var cache = CacheService.getScriptCache(), hit = cache.get('menuPhotos');
  if (hit) return JSON.parse(hit);
  var out = {}, when = {};
  try {
    var it = DriveApp.getFolderById(COPY_TO.menu).getFiles();
    while (it.hasNext()) {
      var f = it.next();
      if (!/^image\//.test(f.getMimeType())) continue;
      var key = f.getName().replace(/\.[a-z0-9]+$/i, '').replace(/\s+\d+(?:[-\/]\d+)?\s*(pcs|pc|kg)$/i, '').trim().toLowerCase(), t = f.getLastUpdated().getTime();
      if (when[key] && when[key] > t) continue;
      if (f.getSharingAccess() !== DriveApp.Access.ANYONE_WITH_LINK) {
        try { f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW) } catch (err) { continue }
      }
      out[key] = f.getId(); when[key] = t;
    }
  } catch (err) { return {} }
  try { cache.put('menuPhotos', JSON.stringify(out), 600) } catch (err) {}
  return out;
}

/** Every Menu row for the website: on = shown ("On order screen" ticked), soldOut = shown greyed as not available,
 *  usd = the $ price when there is one; and the
 *  opening hours, day off and open-anyway dates from the Settings tab (rows starting "Opening hours", "Closed day",
 *  "Open anyway on"), which the website reads as it is. */
function menu_() {
  var ss = book_(), rows = ss.getSheetByName('Menu').getDataRange().getValues().slice(1), tz = ss.getSpreadsheetTimeZone();
  var raw = function (label) {   // the cell as typed: a date typed alone comes back as yyyy-mm-dd
    var v = ss.getSheetByName('Settings').getDataRange().getValues();
    for (var i = 0; i < v.length; i++) if (String(v[i][0]).indexOf(label) === 0) return v[i][1] instanceof Date ? Utilities.formatDate(v[i][1], tz, 'yyyy-MM-dd') : String(v[i][1]).trim();
    return undefined;
  };
  return { rate: Number(setting_(ss, 'USD rate').replace(/,/g, '')) || 89500, status: status_(ss),
    hours: raw('Opening hours'), closedDay: raw('Closed day'), openDates: raw('Open anyway on'), photos: menuPhotos_(),
    items: rows.filter(function (r) { return r[1] }).map(function (r) {
    return { cat: String(r[0]), name: String(r[1]).trim(), ar: String(r[2]).trim(), usd: Number(String(r[3]).replace(/[^0-9.]/g, '')) || 0,
      price: Number(r[4]) || 0, on: r[5] === true, soldOut: r[7] === true };
  }) };
}
