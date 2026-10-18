/* El Bash app core, shared by the order screen (index.html) and the kitchen screen (kitchen.html).
   It talks to the El Bash – Orders & Sales sheet through the Apps Script, remembers what it last loaded,
   and keeps every change in an outbox on this iPad until the sheet has it, so the app keeps working offline.
   All the shop's rules (numbering, prices, business day, reports) live here, not in the Apps Script. */
var EB = (function () {
  var API = 'https://script.google.com/macros/s/AKfycby7dthEIW4d2EF90fH6-_lGJEK_kAtu0XVSdARQUmM8w4iFEvBIfab-6SR9JdZmWDSdcA/exec';
  var EB = {onChange: null, onError: null, onKey: null};
  // Demo mode (?demo in the link): a pretend sheet on this device (demo.js), kept apart from the real one
  var DEMO = /[?&]demo\b/.test(location.search), PRE = DEMO ? 'demo-' : '', HERE = (document.currentScript && document.currentScript.src || '').replace(/[^\/]*$/, '');
  EB.demo = DEMO;

  function get(k) { try { return JSON.parse(localStorage.getItem(PRE + k)) } catch (e) { return null } }
  function put(k, v) { try { localStorage.setItem(PRE + k, JSON.stringify(v)); return true } catch (e) { return false } }
  function pad(n) { return ('0' + n).slice(-2) }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) }
  function num(v) { return Number(String(v == null ? '' : v).replace(/[^0-9.\-]/g, '')) || 0 }
  function str(v) { return v == null ? '' : String(v).trim() }
  EB.ymd = ymd; EB.pad = pad;

  /* ---------- the app key, typed once on each iPad ---------- */
  EB.key = function (k) { if (DEMO) return 'demo'; if (k !== undefined) put('eb-key', String(k).trim()); return get('eb-key') || '' };

  /* ---------- talking to the sheet ---------- */
  // A network problem (or a busy sheet) is "offline": the change stays in the outbox and is tried again.
  function offline(msg) { var e = new Error(msg || 'offline'); e.offline = true; return e }
  function remote(req) {
    req.key = EB.key();
    var run = window.google && google.script && google.script.run, p;
    if (DEMO) {
      p = demo().then(function (d) { return JSON.parse(JSON.stringify(d.post(req))) });
    } else if (run && run.api) {
      p = new Promise(function (ok, fail) { run.withSuccessHandler(ok).withFailureHandler(function (e) { fail(offline(e && e.message)) }).api(req) });
    } else {
      p = fetch(API, {method: 'POST', body: JSON.stringify(req)}).then(function (r) {
        if (!r.ok) throw offline('HTTP ' + r.status);
        return r.text();
      }, function (e) { throw offline(e.message) }).then(function (t) {
        try { return JSON.parse(t) } catch (e) { throw new Error('The sheet link did not answer properly. Check that the Apps Script is deployed.') }
      });
    }
    return p.then(function (r) {
      if (r && r.error) {
        var e = new Error(r.error);
        if (/app key/i.test(r.error)) e.badKey = true;
        if (/lock|timed? ?out|too many|try again|server error|busy/i.test(r.error)) e.offline = true;
        throw e;
      }
      return r;
    });
  }

  var demoP = null;
  function demo() {
    return demoP || (demoP = new Promise(function (ok, fail) {
      var s = document.createElement('script'); s.src = HERE + 'demo.js';
      s.onload = function () { EBDemo.server().then(ok, function (e) { demoP = null; fail(offline(e.message)) }) };
      s.onerror = function () { demoP = null; fail(offline('demo.js')) };
      document.head.appendChild(s);
    }));
  }
  if (DEMO) addEventListener('DOMContentLoaded', function () {
    demo().then(function () {
      EBDemo.banner(function () {
        Object.keys(localStorage).forEach(function (k) { if (k.indexOf('demo-') === 0) localStorage.removeItem(k) });
        location.reload();
      });
    }, function () {});
  });

  /* ---------- reading: the newest copy, kept on the iPad for offline use ---------- */
  var clock = get('eb-clock') || 0;  // the sheet's clock minus this iPad's
  EB.now = function () { return Date.now() + clock };
  // tabs: {'Orders': 300, 'Menu': 0} = the last 300 rows of Orders, every row of Menu
  EB.read = function (name, tabs) {
    return remote({action: 'read', tabs: Object.keys(tabs).map(function (t) { return {tab: t, last: tabs[t] || undefined} })}).then(function (r) {
      r.at = Date.now(); clock = r.now - Date.now(); put('eb-clock', clock);
      put('eb-read-' + name, r);
      return r;
    });
  };
  EB.cached = function (name) { return get('eb-read-' + name) };
  // What is in the El Bash folder in Google Drive
  EB.files = function () { return remote({action: 'files'}).then(function (r) { r.at = Date.now(); put('eb-files', r); return r }) };
  EB.cachedFiles = function () { return get('eb-files') };
  EB.rows = function (t) {
    return t ? t.rows.map(function (r) { var o = {}; t.head.forEach(function (h, i) { o[h] = r[i] }); return o }) : [];
  };

  /* ---------- settings and menu ---------- */
  EB.settings = function (r) {
    var s = {rate: 89500, pin: '', yellow: 10, red: 20, dayEnd: 2}, t = r && r.Settings;
    if (!t) return s;
    var val = function (label) {
      for (var i = 0; i < t.rows.length; i++) if (str(t.rows[i][0]).indexOf(label) === 0) return t.rows[i][1];
      return '';
    };
    s.rate = num(val('USD rate')) || 89500;
    s.pin = str(val('PIN'));
    s.yellow = num(val('Kitchen screen: minutes until an order turns yellow')) || 10;
    s.red = num(val('Kitchen screen: minutes until an order turns red')) || 20;
    var d = val('Day ends');
    s.dayEnd = d === '' ? 2 : Math.max(0, Math.min(12, num(d)));
    s.target = num(val('Target food cost'));
    return s;
  };
  // Every Menu row; on = "On order screen" ticked; soldOut = taken off for now with the Sold out button
  // (a sold-out item is also unticked, which hides it from the menu website)
  EB.menu = function (r) {
    var list = EB.rows(r && r.Menu).filter(function (m) { return str(m.Item) }).map(function (m) {
      return {cat: str(m.Category), name: str(m.Item), ar: str(m['Arabic name']), usd: num(m['Price ($)']), price: num(m['Price (L.L.)']),
        on: m['On order screen'] === true, soldOut: m['Sold out'] === true, station: str(m['Kitchen screen'])};
    });
    changes(r && r.at).forEach(function (c) {
      var f = c.effect || {};
      if (f.t === 'soldout') list.forEach(function (m) { if (m.name === f.name) { m.soldOut = f.out; m.on = !f.out } });
    });
    return list;
  };

  /* ---------- the business day: until the hour in Settings (2 am), it is still the day before ---------- */
  EB.bizDay = function (dayEnd, t) { return ymd(new Date((t || EB.now()) - dayEnd * 3600000)) };
  // When an order was placed, from its day and HH:mm (after midnight is the next calendar day)
  EB.at = function (day, time, dayEnd) {
    var p = day.split('-'), h = num(String(time).slice(0, 2)), m = num(String(time).slice(3, 5));
    var d = new Date(+p[0], +p[1] - 1, +p[2], h, m);
    if (h < dayEnd) d.setDate(d.getDate() + 1);
    return d.getTime();
  };
  EB.hhmm = function (t) { var d = new Date(t || EB.now()); return pad(d.getHours()) + ':' + pad(d.getMinutes()) };

  /* ---------- orders, from the Orders and Order Items rows ---------- */
  EB.orders = function (r, menu, dayEnd) {
    var info = {}, byKey = {}, list = [];
    (menu || []).forEach(function (m) { info[m.name] = m });
    EB.rows(r && r.Orders).forEach(function (o) {
      if (str(o['Order #']) === '' || !str(o.Date)) return;
      var day = str(o.Date).slice(0, 10), time = str(o.Time).slice(0, 5), n = num(o['Order #']);
      var x = {key: day + '#' + n, num: n, day: day, time: time, at: EB.at(day, time, dayEnd),
        total: num(o['Order total (L.L.)']), payment: str(o.Payment) || 'Cash', paidUsd: num(o['Paid ($)']), rate: num(o['USD rate']),
        received: num(o['Paid total (L.L.)']), note: str(o.Note), uid: str(o.Ref), name: str(o.Name), type: str(o['Pickup / Delivery']),
        done: str(o['Kitchen done']), text: str(o.Items), items: [],
        // from the menu website: phone (WhatsApp), address, Status Waiting / Accepted / Rejected, the customer's language
        web: str(o.Source) === 'Website', phone: str(o.Phone).replace(/\D/g, ''), address: str(o.Address), status: str(o.Status),
        lang: str(o.Language) || 'ar', ready: str(o['Ready sent'])};
      x.live = live(x);
      byKey[x.key] = x; list.push(x);
    });
    EB.rows(r && r['Order Items']).forEach(function (it) {
      var o = byKey[str(it.Date).slice(0, 10) + '#' + num(it['Order #'])]; if (!o) return;
      var m = info[str(it.Item)] || {};
      o.items.push({name: str(it.Item), ar: m.ar || '', cat: str(it.Category), station: m.station || '', qty: num(it.Qty),
        price: num(it['Unit price (L.L.)']), sauces: str(it.Sauces) ? str(it.Sauces).split(', ') : []});
    });
    return list;
  };

  // An order that counts (kitchen, Sales, Not paid): not a website order still waiting, and not one turned down
  function live(o) { return o.status !== 'Waiting' && o.status !== 'Rejected' }

  /* ---------- the outbox: every change waits here until the sheet has it ---------- */
  // Each change has the sheet operations and an "effect", so the screens can show it before it is sent.
  function outbox() { return get('eb-outbox') || [] }
  function drop(id) { put('eb-outbox', outbox().filter(function (c) { return c.id !== id })) }
  function changed() { if (EB.onChange) EB.onChange() }
  // Changes the sheet can't take until its Apps Script is updated (e.g. expenses) wait on this iPad, without holding up the rest
  function held(c) { return c.held && Date.now() - c.held < 10 * 60e3 }
  function waitsForScript(e) { return /Unknown tab|Unknown action/i.test(e.message) }
  EB.pending = function () { return outbox().filter(function (c) { return !c.held }) };
  EB.held = function () { return outbox().filter(function (c) { return c.held }) };
  EB.send = function (ops, effect) {
    var q = outbox();
    q.push({id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7), ops: ops, effect: effect, at: Date.now()});
    if (!put('eb-outbox', q)) alert('This iPad is out of storage space: the change could not be kept.');
    changed(); EB.flush();
  };
  var flushing = false;
  EB.flush = function () {
    if (flushing) return;
    var q = outbox().filter(function (c) { return !held(c) }); if (!q.length) return;
    flushing = true;
    remote({action: 'write', ops: q[0].ops}).then(function () {
      drop(q[0].id); remember(q[0]); flushing = false; changed(); EB.flush();
    }, function (e) {
      flushing = false;
      if (e.offline) return changed();
      if (e.badKey) return EB.onKey && EB.onKey();
      if (waitsForScript(e)) {
        put('eb-outbox', outbox().map(function (c) { if (c.id === q[0].id) c.held = Date.now(); return c }));
        changed(); return EB.flush();
      }
      // The sheet refused it for good (not a connection problem): take it out so it doesn't hold up the rest.
      drop(q[0].id); changed();
      if (EB.onError) EB.onError(q[0], e);
      EB.flush();
    });
  };
  setInterval(EB.flush, 15000);
  addEventListener('online', EB.flush);
  // Changes already sent, kept for two days: a copy loaded before a change was sent doesn't know about it yet
  function remember(c) {
    var keep = (get('eb-sent') || []).filter(function (x) { return Date.now() - x.sent < 2 * 864e5 }).slice(-300);
    keep.push({sent: Date.now(), effect: c.effect}); put('eb-sent', keep);
  }
  // The changes a copy loaded at readAt doesn't have yet: those sent since then, and those still in the outbox
  function changes(readAt) { return (get('eb-sent') || []).filter(function (x) { return x.sent > (readAt || 0) }).concat(outbox()) }
  // Apply them to a list of orders (applying a change the list already has does nothing, so the order doesn't matter)
  // kind keeps lists apart: orders have none, purchases are 'purchase'
  EB.withPending = function (list, readAt, kind) {
    changes(readAt).forEach(function (c) {
      var f = c.effect || {}, i = -1;
      if ((f.kind || '') !== (kind || '')) return;
      list.forEach(function (o, k) { if (o.key === f.key) i = k });
      if (f.t === 'save' && i < 0) list.push(JSON.parse(JSON.stringify(f.order)));
      if (f.t === 'edit' && i >= 0) { var done = list[i].done; list[i] = JSON.parse(JSON.stringify(f.order)); list[i].done = done }
      if (f.t === 'done' && i >= 0) list[i].done = f.done;
      if (f.t === 'delete' && i >= 0) list.splice(i, 1);
      if (f.t === 'paid' && i >= 0) { list[i].payment = f.payment; list[i].received = list[i].total }
      if (f.t === 'status' && i >= 0) list[i].status = f.status;
      if (f.t === 'ready' && i >= 0) list[i].ready = f.ready;
    });
    list.forEach(function (o) { o.live = live(o) });
    return list;
  };

  /* ---------- the sheet changes for each action ---------- */
  var F_PAID = '=INDEX(H:H,ROW())*INDEX(J:J,ROW())+INDEX(I:I,ROW())', F_DIFF = '=INDEX(K:K,ROW())-INDEX(F:F,ROW())',
    F_LINE = '=INDEX(E:E,ROW())*INDEX(F:F,ROW())';
  function itemRows(o) {
    return o.items.map(function (x) {
      return {'Order #': o.num, 'Date': o.day, 'Item': x.name, 'Category': x.cat, 'Qty': x.qty, 'Unit price (L.L.)': x.price,
        'Line total (L.L.)': F_LINE, 'Sauces': x.sauces.join(', '), 'Ref': o.uid};
    });
  }
  function orderCells(o) {
    var usd = o.payment === 'Unpaid' ? 0 : o.paidUsd || 0;
    return {'Items': o.text, 'Item count': o.items.reduce(function (a, x) { return a + x.qty }, 0), 'Order total (L.L.)': o.total,
      'Payment': o.payment, 'Paid ($)': usd, 'Paid (L.L.)': o.payment === 'Unpaid' ? 0 : Math.max(0, o.total - usd * o.rate),
      'Note': o.note, 'Name': o.name, 'Pickup / Delivery': o.type};
  }
  function where(o) { return {'Date': o.day, 'Order #': o.num} }
  // "2 × Loaded Fries — Ketchup + Cheddar Sauce, 1 × Pepsi"
  EB.text = function (items) {
    return items.map(function (x) { return x.qty + ' × ' + x.name + (x.sauces.length ? ' — ' + x.sauces.join(' + ') : '') }).join(', ');
  };
  EB.save = function (o) {
    var row = orderCells(o);
    row['Order #'] = o.num; row['Date'] = o.day; row['Time'] = "'" + o.time; row['USD rate'] = o.rate; row['Ref'] = o.uid;
    row['Paid total (L.L.)'] = F_PAID; row['Difference (L.L.)'] = F_DIFF;
    EB.send([{op: 'append', tab: 'Orders', rows: [row], unique: 'Ref'}, {op: 'append', tab: 'Order Items', rows: itemRows(o), unique: 'Ref'}],
      {t: 'save', key: o.key, order: o});
  };
  EB.update = function (o) {
    EB.send([{op: 'update', tab: 'Orders', where: where(o), set: orderCells(o)}, {op: 'remove', tab: 'Order Items', where: where(o)},
      {op: 'append', tab: 'Order Items', rows: itemRows(o)}], {t: 'edit', key: o.key, order: o});
  };
  EB.done = function (o, done) {
    EB.send([{op: 'update', tab: 'Orders', where: where(o), set: {'Kitchen done': done ? "'" + done : ''}}], {t: 'done', key: o.key, done: done});
  };
  EB.remove = function (o) {
    EB.send([{op: 'remove', tab: 'Orders', where: where(o)}, {op: 'remove', tab: 'Order Items', where: where(o)}], {t: 'delete', key: o.key});
  };

  // Sold out for now (or back on): also unticks "On order screen", so the menu website hides it
  EB.soldOut = function (name, out) {
    EB.send([{op: 'update', tab: 'Menu', where: {'Item': name}, set: {'On order screen': !out, 'Sold out': out ? true : ''}}],
      {t: 'soldout', name: name, out: out});
  };
  // A website order accepted (goes to the kitchen) or rejected
  EB.status = function (o, status) {
    EB.send([{op: 'update', tab: 'Orders', where: where(o), set: {'Status': status}}], {t: 'status', key: o.key, status: status});
  };
  // When the "ready" WhatsApp message was sent
  EB.ready = function (o, at) {
    EB.send([{op: 'update', tab: 'Orders', where: where(o), set: {'Ready sent': "'" + at}}], {t: 'ready', key: o.key, ready: at});
  };
  // The WhatsApp message for an order, in the customer's language: accepted, ready (pickup or delivery) or turned down
  EB.whatsapp = function (o, kind) {
    var ar = o.lang !== 'en', n = o.num, msg;
    if (kind === 'confirm') msg = ar ? 'يا باشا، وصلنا طلبك رقم ' + n + ' من الباش ✅ عم نحضّرو، ومنبعتلك أول ما ' + (o.type === 'Delivery' ? 'يطلع عالطريق' : 'يجهز') + '. تكرم يا باشا!'
      : 'Ya Basha, we got your El Bash order #' + n + ' ✅ We\'re preparing it and will message you when it\'s ' + (o.type === 'Delivery' ? 'on the way' : 'ready') + '. Tekram ya basha!';
    else if (kind === 'reject') msg = ar ? 'يا باشا، آسفين، ما منقدر ناخد طلبيتك رقم ' + n + ' هلّق. اتصل فينا أو ابعتلنا رسالة 🙏'
      : 'Ya Basha, sorry, we can\'t take your order #' + n + ' right now. Please call or message us 🙏';
    else if (o.type === 'Delivery') msg = ar ? 'يا باشا، طلبيتك رقم ' + n + ' من الباش جاهزة وعالطريق لعندك! 🛵 تكرم يا باشا!'
      : 'Ya Basha, your El Bash order #' + n + ' is ready and on its way to you! 🛵 Tekram ya basha!';
    else msg = ar ? 'يا باشا، طلبيتك رقم ' + n + ' من الباش جاهزة! 🍗 تفضّل استلمها. تكرم يا باشا!'
      : 'Ya Basha, your El Bash order #' + n + ' is ready! 🍗 Come pick it up. Tekram ya basha!';
    return 'https://wa.me/' + o.phone + '?text=' + encodeURIComponent(msg);
  };
  // A Not paid order paid later, in full: Cash or Whish, and the day it was paid
  EB.paid = function (o, payment, day) {
    EB.send([{op: 'update', tab: 'Orders', where: where(o), set: {'Payment': payment, 'Paid ($)': 0, 'Paid (L.L.)': o.total, 'Paid later': day}}],
      {t: 'paid', key: o.key, payment: payment});
  };

  /* ---------- reports: totals for the days from..to (yyyy-mm-dd) ---------- */
  EB.report = function (list, from, to) {
    var s = {orders: 0, items: 0, sales: 0, cashOrders: 0, cashLbp: 0, whishOrders: 0, whishLbp: 0, unpaidOrders: 0, unpaidLbp: 0};
    var days = {}, items = {}, orders = [];
    list.forEach(function (o) {
      if (o.day < from || o.day > to || !o.live) return;
      var got = o.received || (o.payment === 'Unpaid' ? 0 : o.total);
      s.orders++; s.sales += o.total;
      if (o.payment === 'Whish') { s.whishOrders++; s.whishLbp += got }
      else if (o.payment === 'Unpaid') { s.unpaidOrders++; s.unpaidLbp += o.total }
      else { s.cashOrders++; s.cashLbp += got }
      days[o.day] = days[o.day] || {date: o.day, orders: 0, sales: 0};
      days[o.day].orders++; days[o.day].sales += o.total;
      o.items.forEach(function (x) {
        var it = items[x.name] = items[x.name] || {name: x.name, qty: 0, sales: 0};
        it.qty += x.qty; it.sales += x.qty * x.price; s.items += x.qty;
      });
      orders.push({num: o.num, date: o.day, time: o.time, at: o.at, items: o.text, total: o.total, payment: o.payment, name: o.name, type: o.type});
    });
    orders.sort(function (a, b) { return b.at - a.at });
    return {summary: s, days: Object.keys(days).sort().map(function (k) { return days[k] }),
      items: Object.keys(items).map(function (k) { return items[k] }).sort(function (a, b) { return b.qty - a.qty || b.sales - a.sales }), orders: orders};
  };

  return EB;
})();
