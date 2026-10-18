/* Demo mode (?demo in the link): the real Apps Script (Code.gs) runs here in the browser on a pretend sheet kept on this
   device, filled with the real menu and made-up orders and purchases. Nothing reaches the real sheet.
   The app, the kitchen screen and the menu website share the pretend sheet when opened on the same device. */
var EBDemo = (function () {
  var BASE = (document.currentScript && document.currentScript.src || location.href).replace(/[^\/]*$/, '');
  var MENU_URL = 'https://script.google.com/macros/s/AKfycby7dthEIW4d2EF90fH6-_lGJEK_kAtu0XVSdARQUmM8w4iFEvBIfab-6SR9JdZmWDSdcA/exec?format=menu';
  var KEY = 'eb-demo-sheet';
  function pad(n) { return ('0' + n).slice(-2) }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) }

  /* ---------- a pretend spreadsheet, enough for Code.gs ---------- */
  function parseIn(v) {
    if (typeof v !== 'string') return v;
    if (v[0] === "'") return {text: v.slice(1)};
    if (/^\d{4}-\d\d-\d\d$/.test(v)) { var p = v.split('-'); return new Date(+p[0], p[1] - 1, +p[2]) }
    return v;
  }
  function Sheet(name, rows) { this.name = name; this.d = rows; this.maxCols = Math.max.apply(null, rows.map(function (r) { return r.length }).concat([1])) }
  Sheet.prototype = {
    getName: function () { return this.name },
    getLastRow: function () { var n = 0; this.d.forEach(function (r, i) { if (r.some(function (c) { return c !== '' && c != null })) n = i + 1 }); return n },
    getLastColumn: function () { var n = 0; this.d.forEach(function (r) { r.forEach(function (c, j) { if (c !== '' && c != null) n = Math.max(n, j + 1) }) }); return n },
    getMaxColumns: function () { return this.maxCols },
    insertColumnAfter: function (n) { this.maxCols++; this.d.forEach(function (r) { r.splice(n, 0, '') }) },
    deleteRow: function (r) { this.d.splice(r - 1, 1) },
    getDataRange: function () { return this.getRange(1, 1, Math.max(1, this.getLastRow()), Math.max(1, this.getLastColumn())) },
    getRange: function (r, c, nr, nc) { return new Range(this, r, c, nr || 1, nc || 1) },
    raw: function (r, c) { var row = this.d[r - 1]; return row && row[c - 1] !== undefined ? row[c - 1] : '' },
    set: function (r, c, v) {
      while (this.d.length < r) this.d.push([]);
      var row = this.d[r - 1]; while (row.length < c) row.push('');
      row[c - 1] = parseIn(v); if (c > this.maxCols) this.maxCols = c;
    },
    value: function (r, c) {
      var v = this.raw(r, c);
      if (v && v.text !== undefined) return v.text;
      if (typeof v === 'string' && v[0] === '=') return this.calc(v, r);
      return v;
    },
    // only the formulas the app writes: INDEX(X:X,ROW()) joined with * + -
    calc: function (f, r) {
      var self = this, expr = f.slice(1).replace(/INDEX\(([A-Z]):\1,ROW\(\)\)/g, function (_, L) { return String(Number(self.value(r, L.charCodeAt(0) - 64)) || 0) });
      var toks = expr.match(/\d+(\.\d+)?|[*+\-]/g) || ['0'], terms = [], cur = Number(toks[0]);
      for (var i = 1; i < toks.length; i += 2) {
        var n = Number(toks[i + 1]);
        if (toks[i] === '*') cur *= n; else { terms.push(cur); cur = toks[i] === '-' ? -n : n }
      }
      terms.push(cur); return terms.reduce(function (a, b) { return a + b }, 0);
    }
  };
  function Range(s, r, c, nr, nc) { this.s = s; this.r = r; this.c = c; this.nr = nr; this.nc = nc }
  Range.prototype = {
    getValues: function () { var out = []; for (var i = 0; i < this.nr; i++) { var row = []; for (var j = 0; j < this.nc; j++) row.push(this.s.value(this.r + i, this.c + j)); out.push(row) } return out },
    setValues: function (g) { var self = this; g.forEach(function (row, i) { row.forEach(function (v, j) { self.s.set(self.r + i, self.c + j, v) }) }) },
    setValue: function (v) { this.s.set(this.r, this.c, v) }
  };

  // Kept on the device: dates as {d: 'yyyy-mm-dd'}
  function save(sheets) {
    var out = {};
    Object.keys(sheets).forEach(function (n) { out[n] = sheets[n].d.map(function (r) { return r.map(function (v) { return v instanceof Date ? {d: ymd(v)} : v }) }) });
    localStorage.setItem(KEY, JSON.stringify(out));
  }
  function load() {
    var raw; try { raw = JSON.parse(localStorage.getItem(KEY)) } catch (e) {}
    if (!raw) return null;
    var sheets = {};
    Object.keys(raw).forEach(function (n) {
      sheets[n] = new Sheet(n, raw[n].map(function (r) { return r.map(function (v) { return v && v.d ? parseIn(v.d) : v }) }));
    });
    return sheets;
  }

  /* ---------- made-up orders and purchases on the real menu ---------- */
  var OH = ['Order #', 'Date', 'Time', 'Items', 'Item count', 'Order total (L.L.)', 'Payment', 'Paid ($)', 'Paid (L.L.)', 'USD rate', 'Paid total (L.L.)',
    'Difference (L.L.)', 'Note', 'Ref', 'Kitchen done', 'Name', 'Pickup / Delivery', 'Paid later', 'Source', 'Phone', 'Address', 'Status', 'Language', 'Ready sent'];
  var F_PAID = '=INDEX(H:H,ROW())*INDEX(J:J,ROW())+INDEX(I:I,ROW())', F_DIFF = '=INDEX(K:K,ROW())-INDEX(F:F,ROW())', F_LINE = '=INDEX(E:E,ROW())*INDEX(F:F,ROW())';
  var NAMES = ['Rami', 'Maya', 'Ali', 'Nour', 'Hadi', 'Lara', '', '', '', ''];
  function seed(menu) {
    var seedN = 7, rnd = function () { seedN = (seedN * 16807) % 2147483647; return (seedN - 1) / 2147483646 };
    var pick = function (a) { return a[Math.floor(rnd() * a.length)] };
    var rate = menu.rate || 89500, items = menu.items.filter(function (m) { return m.on && (m.price || m.usd) });
    var priced = function (m) { return m.price || Math.round(m.usd * rate) };
    var orders = [OH], lines = [['Order #', 'Date', 'Item', 'Category', 'Qty', 'Unit price (L.L.)', 'Line total (L.L.)', 'Sauces', 'Ref']];
    var now = new Date(), today = new Date(now - 2 * 3600e3), ref = 0;
    function order(day, time, o) {
      var pickN = o.items || (function () { var n = 1 + Math.floor(rnd() * 3), a = []; while (n--) a.push({m: pick(items), q: rnd() < .2 ? 2 : 1}); return a })();
      var total = 0, text = [], count = 0, r = 'demo' + (++ref);
      pickN.forEach(function (x) {
        total += priced(x.m) * x.q; count += x.q; text.push(x.q + ' × ' + x.m.name);
        lines.push([o.num, day, x.m.name, x.m.cat, x.q, priced(x.m), F_LINE, '', r]);
      });
      var pay = o.payment || (rnd() < .62 ? 'Cash' : rnd() < .9 ? 'Whish' : 'Unpaid');
      orders.push([o.num, day, "'" + time, text.join(', '), count, total, pay, 0, pay === 'Unpaid' ? 0 : total, rate, F_PAID, F_DIFF, '', r,
        o.done === undefined ? "'" + time : o.done, o.name !== undefined ? o.name : pick(NAMES), o.type || (rnd() < .3 ? 'Delivery' : 'Pickup'), '',
        o.source || '', o.phone || '', o.address || '', o.status || '', o.lang || '', '']);
    }
    // the last 40 days (not today)
    for (var back = 40; back >= 1; back--) {
      var d = new Date(today); d.setDate(d.getDate() - back);
      if (d.getDay() === 1) continue;   // closed on Mondays
      var n = 8 + Math.floor(rnd() * 14), day = ymd(d);
      for (var k = 1; k <= n; k++) { var h = 13 + Math.floor((k - 1) / n * 10); order(day, pad(h) + ':' + pad(Math.floor(rnd() * 60)), {num: k}) }
    }
    // today: some done, some still cooking, two website orders waiting to be accepted
    var at = function (min) { var t = new Date(now - min * 60e3); return pad(t.getHours()) + ':' + pad(t.getMinutes()) }, td = ymd(today);
    [95, 80, 62, 41, 30].forEach(function (m, i) { order(td, at(m), {num: i + 1}) });
    order(td, at(14), {num: 6, done: ''}); order(td, at(4), {num: 7, done: '', payment: 'Cash'});
    var byName = function (re) { return items.filter(function (m) { return re.test(m.name) })[0] || pick(items) };
    order(td, at(3), {num: 8, done: '', payment: 'Unpaid', source: 'Website', status: 'Waiting', name: 'Maya', type: 'Delivery', phone: '9613123456',
      address: 'Hamra, Bliss St, bldg 4, 2nd floor', lang: 'ar', items: [{m: byName(/Zinger Sandwich/), q: 2}, {m: byName(/Loaded Fries/), q: 1}]});
    order(td, at(1), {num: 9, done: '', payment: 'Unpaid', source: 'Website', status: 'Waiting', name: 'Sam', type: 'Pickup', phone: '96170999888',
      lang: 'en', items: [{m: byName(/Crispy Meal/), q: 1}, {m: byName(/Pepsi/), q: 2}]});
    // this month's purchases
    var P = [['Date', 'Category', 'Type', 'Item', 'Amount', 'Currency', 'Amount (L.L.)', 'Supplier', 'Note', 'Ref', 'Added']], pr = 0;
    var buy = function (daysAgo, cat, item, amount, cur, supplier, type) {
      var d = new Date(today); d.setDate(d.getDate() - daysAgo);
      if (d.getMonth() !== today.getMonth()) return;
      P.push([ymd(d), cat, type || '', item, amount, cur, cur === '$' ? amount * rate : amount, supplier || '', '', 'pxdemo' + (++pr), '']);
    };
    for (var w = 0; w < 31; w += 3) { buy(w, 'Chicken', '20 kg breast', 90, '$', 'Hawa Chicken'); buy(w + 1, 'Bread', 'Saj bread', 1500000, 'L.L.') }
    for (var v = 0; v < 31; v += 4) { buy(v, 'Vegetables', 'Lettuce, tomatoes, pickles', 1800000, 'L.L.'); buy(v + 2, 'Ingredients', 'Sauces, oil, cheddar', 45, '$') }
    buy(2, 'Beef', '10 kg burger meat', 85, '$'); buy(9, 'Beef', '10 kg burger meat', 85, '$');
    buy(5, 'Packaging', 'Boxes, bags, cups', 60, '$'); buy(12, 'Packaging', 'Plastic containers', 2700000, 'L.L.');
    buy(1, 'Salaries', 'First half of the month', 400, '$', '', 'Staff'); buy(8, 'Salaries', 'Weekly cleaning', 40, '$', '', 'Cleaning');
    buy(3, 'Utilities', 'Gas cylinder', 35, '$', '', 'Gas'); buy(5, 'Utilities', 'Water tank', 1800000, 'L.L.', '', 'Water'); buy(6, 'Utilities', 'Monthly', 25, '$', '', 'Internet');
    buy(4, 'Other', 'Cleaning products', 900000, 'L.L.'); buy(7, 'Equipment', 'New fryer', 450, '$', '', 'Machines'); buy(2, 'Equipment', 'Knives and tongs', 30, '$', '', 'Kitchen supplies');

    var menuTab = [['Category', 'Item', 'Arabic name', 'Price ($)', 'Price (L.L.)', 'On order screen', 'Kitchen screen', 'Sold out']].concat(menu.items.map(function (m) {
      return [m.cat, m.name, m.ar, m.usd ? '$' + m.usd : '', m.price || '', m.on, '', ''];
    }));
    var settings = [['Settings'], ['Demo sheet: nothing here is real.'], ['USD rate (L.L. per $1)', rate], ['PIN to lock the Sales screen', "'0000"], [''], [''], [''],
      ['Kitchen screen: minutes until an order turns yellow', 10], ['Kitchen screen: minutes until an order turns red', 20], ['Day ends at (hour, 0-12)', 2], ['App key', 'demo']];
    var tabs = {Settings: settings, Menu: menuTab, Orders: orders, 'Order Items': lines, Purchases: P}, sheets = {};
    Object.keys(tabs).forEach(function (n) { sheets[n] = new Sheet(n, tabs[n].map(function (r) { return r.map(parseIn) })) });
    return sheets;
  }

  /* ---------- the real Code.gs, run against the pretend sheet ---------- */
  var ready = null, cur = null, cache = {};
  function server() {
    return ready || (ready = Promise.all([
      fetch(BASE + 'Code.gs', {cache: 'no-store'}).then(function (r) { if (!r.ok) throw new Error('Code.gs ' + r.status); return r.text() }),
      load() ? null : fetch(MENU_URL).then(function (r) { return r.json() })
    ]).then(function (got) {
      if (got[1]) save(seed(got[1]));
      var ss = {getSheetByName: function (n) { return cur[n] }, insertSheet: function (n) { return (cur[n] = new Sheet(n, [[]])) }, getSpreadsheetTimeZone: function () { return 'local' }};
      var env = {
        SpreadsheetApp: {openById: function () { return ss }, getActiveSpreadsheet: function () { return ss }, flush: function () {}},
        LockService: {getScriptLock: function () { return {waitLock: function () {}, releaseLock: function () {}} }},
        Utilities: {formatDate: function (d, tz, f) { return f === 'HH:mm' ? pad(d.getHours()) + ':' + pad(d.getMinutes()) : ymd(d) }},
        ContentService: {MimeType: {JSON: 'json'}, createTextOutput: function (s) { return {body: s, setMimeType: function () { return this }} }},
        CacheService: {getScriptCache: function () { return {get: function (k) { return cache[k] === undefined ? null : cache[k] }, put: function (k, v) { cache[k] = v }} }},
        HtmlService: {}, UrlFetchApp: {}
      };
      var names = Object.keys(env);
      var gs = new Function(names.join(','), got[0] + '\nreturn {doPost: doPost, doGet: doGet};').apply(null, names.map(function (n) { return env[n] }));
      // each call: the newest pretend sheet (another tab may have changed it), then keep the result
      var run = function (f) { cur = load(); try { return JSON.parse(f().body) } finally { save(cur) } };
      return {
        post: function (req) { return run(function () { return gs.doPost({postData: {contents: JSON.stringify(req)}}) }) },
        menu: function () { return run(function () { return gs.doGet({parameter: {format: 'menu'}}) }) }
      };
    }));
  }
  function reset() { localStorage.removeItem(KEY) }

  // A strip at the top of every page in demo mode
  function banner(onReset, top) {
    var b = document.createElement('div');
    b.setAttribute('style', 'position:fixed;left:50%;' + (top ? 'top:8px' : 'bottom:10px') + ';transform:translateX(-50%);z-index:9999;background:#F2B705;color:#1A1A17;font:700 14px "Plus Jakarta Sans",Cairo,sans-serif;' +
      'padding:6px 8px 6px 14px;border-radius:999px;box-shadow:0 4px 14px rgba(0,0,0,.18);display:flex;gap:10px;align-items:center;white-space:nowrap');
    b.innerHTML = '<span>تجربة · DEMO: nothing reaches the real sheet</span><button type="button" style="font:inherit;border:0;border-radius:999px;padding:4px 10px;background:#1A1A17;color:#fff">Reset</button>';
    b.querySelector('button').onclick = function () { if (confirm('Start the demo again with fresh made-up orders?')) { reset(); (onReset || function () { location.reload() })() } };
    (document.body || document.documentElement).appendChild(b);
  }
  return {server: server, reset: reset, banner: banner};
})();
