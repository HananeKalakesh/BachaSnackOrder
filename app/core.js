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
        // not data (e.g. Google's sign-in or permission page): kept and tried again, like no internet, so nothing is lost
        try { return JSON.parse(t) } catch (e) { throw offline('The sheet link did not answer properly. Check that the Apps Script is deployed and allowed.') }
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
  // One of those files as a File, ready to share (e.g. to a WhatsApp story)
  EB.file = function (id) {
    return remote({action: 'file', id: id}).then(function (r) {
      var bin = atob(r.data), bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return new File([bytes], r.name, {type: r.type});
    });
  };
  // Copies the website's menu photos and logos into the Drive folder (new ones only)
  EB.copyAssets = function () { return remote({action: 'copyAssets'}) };
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
    // the website's opening hours (rows "Opening hours", "Closed day", "Open anyway on"), with the changes made here
    s.hours = str(val('Opening hours')); s.closedDay = str(val('Closed day')); s.openDates = str(val('Open anyway on'));
    changes(r && r.at).forEach(function (c) { var f = c.effect || {}; if (f.t === 'setting') s[f.field] = f.value });
    return s;
  };
  // The Settings rows the app can change, by their label in column A (the label must stay as it is in the sheet)
  EB.SETTING_ROWS = {hours: 'Opening hours (website), e.g. 1 PM - 4 PM, 6 PM - 11 PM',
    closedDay: 'Closed day (website): a day name, e.g. Monday, or empty for none',
    openDates: 'Open anyway on (website): dates like 2026-12-25, comma between, e.g. a holiday on the closed day'};
  EB.setSetting = function (field, value) {
    EB.send([{op: 'update', tab: 'Settings', where: {'Settings': EB.SETTING_ROWS[field]}, set: {'Value': value}}], {t: 'setting', field: field, value: value});
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
        lang: str(o.Language) || 'ar', ready: str(o['Ready sent']),
        // a Not paid order paid on a later day: the money counts on that day
        paidLater: str(o['Paid later']).slice(0, 10),
        // paid partly by Whish and the rest cash (Payment "Split"): the Whish part
        whish: num(o['Whish part (L.L.)']),
        // sent to the kitchen: '-' saved but not sent yet, a time once sent; empty = an order from before this step (sent)
        sent: str(o['Kitchen sent']).replace(/^'/, ''),
        // the delivery fee goes to the driver: printed for the customer, never in the total, the sales or the cash box
        fee: num(o['Delivery fee (L.L.)'])};
      x.live = live(x);
      byKey[x.key] = x; list.push(x);
    });
    EB.rows(r && r['Order Items']).forEach(function (it) {
      var o = byKey[str(it.Date).slice(0, 10) + '#' + num(it['Order #'])]; if (!o) return;
      var m = info[str(it.Item)] || {};
      // marinated chicken and Other lines aren't menu items: they show on the kitchen screen too
      var oc = /^(Marinated Chicken|Other)$/.test(str(it.Category));
      o.items.push({name: str(it.Item), ar: m.ar || (str(it.Category) === 'Marinated Chicken' ? 'دجاج متبّل' : oc ? str(it.Item) : ''), cat: str(it.Category), station: m.station || (oc ? 'Kitchen' : ''), qty: num(it.Qty),
        price: num(it['Unit price (L.L.)']), sauces: str(it.Sauces) ? str(it.Sauces).split(', ') : [],
        sentQty: str(it['Sent qty']) === '' ? num(it.Qty) : num(it['Sent qty'])});   // how many of this line the kitchen has
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
      if (f.t === 'edit' && i >= 0) { var done = list[i].done, ready = list[i].ready; list[i] = JSON.parse(JSON.stringify(f.order)); list[i].done = done; list[i].ready = ready }
      if (f.t === 'done' && i >= 0) list[i].done = f.done;
      if (f.t === 'delete' && i >= 0) list.splice(i, 1);
      if (f.t === 'paid' && i >= 0) { list[i].payment = f.payment; list[i].received = f.payment === 'House' ? 0 : list[i].total; list[i].paidLater = f.later || ''; list[i].whish = f.whish || 0 }
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
        'Line total (L.L.)': F_LINE, 'Sauces': x.sauces.join(', '), 'Ref': o.uid, 'Sent qty': x.sentQty == null ? x.qty : x.sentQty};
    });
  }
  function orderCells(o) {
    var nopay = o.payment === 'Unpaid' || o.payment === 'House', usd = nopay ? 0 : o.paidUsd || 0;   // House: food for the owners' house, no money
    return {'Items': o.text, 'Item count': o.items.reduce(function (a, x) { return a + x.qty }, 0), 'Order total (L.L.)': o.total,
      'Payment': o.payment, 'Paid ($)': usd, 'Paid (L.L.)': nopay ? 0 : Math.max(0, o.total - usd * o.rate),
      'Note': o.note, 'Name': o.name, 'Pickup / Delivery': o.type,
      'Kitchen sent': o.sent === '-' ? '-' : o.sent ? "'" + o.sent : '', 'Delivery fee (L.L.)': o.fee || ''};
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
  // Send to the kitchen: the whole order, or the lines added since; it then shows on the kitchen screen
  EB.toKitchen = function (o, at) {
    var x = JSON.parse(JSON.stringify(o));
    x.sent = x.sent && x.sent !== '-' ? x.sent : at;
    x.items.forEach(function (it) { it.sentQty = it.qty });
    EB.update(x);
    return x;
  };
  // the lines (and extra quantities) the kitchen doesn't have yet
  EB.unsent = function (o) {
    return o.items.filter(function (x) { return x.qty > (x.sentQty == null ? x.qty : x.sentQty) }).map(function (x) {
      var y = JSON.parse(JSON.stringify(x)); y.qty = x.qty - (x.sentQty || 0); return y });
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
  // Busy mode for the website (Status tab, row "Website"): 'busy' with the extra wait in minutes, or 'paused' (no website
  // orders); ends by itself at until. mode '' turns it off.
  EB.setBusy = function (mode, wait, until) {
    EB.send([{op: 'append', tab: 'Status', unique: 'Key', rows: [{'Key': 'Website'}]},
      {op: 'update', tab: 'Status', where: {'Key': 'Website'}, set: {'Value': mode, 'Wait': wait || '', 'Until': until || '', 'Set at': "'" + ymd(new Date()) + ' ' + EB.hhmm()}}],
      {t: 'busy', mode: mode, wait: wait, until: until});
  };
  // The busy mode now: from the Status tab in a copy loaded at r.at, and the changes made since; null when off or over
  EB.busy = function (r) {
    var b = null;
    EB.rows(r && r.Status).forEach(function (x) { if (str(x.Key) === 'Website') b = {mode: str(x.Value), wait: num(x.Wait), until: num(x.Until)} });
    changes(r && r.at).forEach(function (c) { var f = c.effect || {}; if (f.t === 'busy') b = {mode: f.mode, wait: f.wait, until: f.until} });
    return b && b.mode && b.until > Date.now() ? b : null;
  };
  // A website order accepted (goes to the kitchen) or rejected
  EB.status = function (o, status) {
    EB.send([{op: 'update', tab: 'Orders', where: where(o), set: {'Status': status}}], {t: 'status', key: o.key, status: status});
  };
  // The order's stages: preparing → ready (for pickup) or out for delivery, kept as the time in "Ready sent" → done
  // ("Kitchen done": picked up, or delivered and paid). An empty time takes it back a stage.
  EB.ready = function (o, at) {
    EB.send([{op: 'update', tab: 'Orders', where: where(o), set: {'Ready sent': at ? "'" + at : ''}}], {t: 'ready', key: o.key, ready: at});
  };
  // The WhatsApp message for an order, in the customer's language: accepted, ready (pickup or delivery) or turned down
  EB.whatsapp = function (o, kind) {
    var ar = o.lang !== 'en', n = o.num, msg;
    // plain words, with "Tekram ya basha!" only at the end
    if (kind === 'confirm') msg = ar ? 'أهلا! وصلنا طلبك رقم ' + n + ' من الباش ✅ عم نحضّرو، ومنبعتلك رسالة أول ما ' + (o.type === 'Delivery' ? 'يطلع عالطريق' : 'يجهز') + '. تكرم يا باشا!'
      : 'Hi! We got your El Bash order #' + n + ' ✅ We\'re preparing it and will message you when it\'s ' + (o.type === 'Delivery' ? 'on the way' : 'ready') + '. Tekram ya basha!';
    else if (kind === 'reject') msg = ar ? 'أهلا، آسفين، ما منقدر ناخد طلبك رقم ' + n + ' هلّق. اتصل فينا أو ابعتلنا رسالة 🙏 تكرم يا باشا!'
      : 'Hi, sorry, we can\'t take your order #' + n + ' right now. Please call or message us 🙏 Tekram ya basha!';
    else if (o.type === 'Delivery') msg = ar ? 'طلبك رقم ' + n + ' من الباش جاهز، ومنبعتلك ياه بأسرع وقت! 🛵 تكرم يا باشا!'
      : 'Your El Bash order #' + n + ' is ready and on its way to you as soon as possible! 🛵 Tekram ya basha!';
    else msg = ar ? 'طلبك رقم ' + n + ' من الباش جاهز! 🍗 تفضّل استلمو. تكرم يا باشا!'
      : 'Your El Bash order #' + n + ' is ready! 🍗 You can come pick it up. Tekram ya basha!';
    // no number (an order taken at the counter or by phone): WhatsApp opens and asks who to send it to
    return 'https://wa.me/' + (o.phone || '') + '?text=' + encodeURIComponent(msg);
  };
  // A reminder to pay, for everything one customer owes (oldest first), in their language. Today's orders get a light
  // "when you get a chance"; earlier days' name the day. Same tone as the other messages: plain, "Tekram ya basha!" at the end.
  EB.payReminder = function (list, today, rate) {
    var o = list[list.length - 1], ar = o.lang !== 'en', sum = 0;
    var DA = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'], DE = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    var when = function (x) {
      if (x.day === today) return ar ? 'اليوم' : 'today';
      var d = new Date(x.day + 'T12:00'), dm = d.getDate() + '/' + (d.getMonth() + 1);
      return ar ? 'يوم ' + DA[d.getDay()] + ' ' + dm : 'on ' + DE[d.getDay()] + ' ' + dm;
    };
    var usd = function (lbp) { var v = lbp / (rate || 89500); return '$' + (v < 100 ? v.toFixed(2).replace(/\.00$/, '') : Math.round(v)) };
    var lbp = function (v) { return String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + ' L.L.' };
    list.forEach(function (x) { sum += x.total });
    var hi = o.name ? (ar ? 'أهلا ' + o.name + '! ' : 'Hi ' + o.name + '! ') : (ar ? 'أهلا! ' : 'Hi! ');
    var allToday = list.every(function (x) { return x.day === today }), msg;
    if (list.length === 1) {
      var x = list[0];
      msg = allToday
        ? (ar ? hi + 'بس تذكير صغير إنو طلبك رقم ' + x.num + ' من الباش اليوم لسا ما اندفع: ' + usd(x.total) + ' (' + lbp(x.total) + '). فيك تدفع كاش أو ويش، ع راحتك. شكراً! تكرم يا باشا!'
            : hi + 'Just a small reminder that your El Bash order #' + x.num + ' from today isn\'t paid yet: ' + usd(x.total) + ' (' + lbp(x.total) + '). You can pay cash or by Whish, whenever suits you. Thank you! Tekram ya basha!')
        : (ar ? hi + 'منذكّرك إنو طلبك رقم ' + x.num + ' من الباش ' + when(x) + ' لسا ما اندفع: ' + usd(x.total) + ' (' + lbp(x.total) + '). فيك تدفع كاش بالمحل أو ويش. شكراً كتير! تكرم يا باشا!'
            : hi + 'A reminder that your El Bash order #' + x.num + ' ' + when(x) + ' is still not paid: ' + usd(x.total) + ' (' + lbp(x.total) + '). You can pay cash at the shop or by Whish. Thanks a lot! Tekram ya basha!');
    } else {
      var lines = list.map(function (x) { return '• #' + x.num + ' ' + when(x) + ': ' + usd(x.total) }).join('\n');
      msg = ar ? hi + 'منذكّرك إنو في ' + list.length + ' طلبات من الباش لسا ما اندفعو:\n' + lines + '\nالمجموع: ' + usd(sum) + ' (' + lbp(sum) + '). فيك تدفع كاش بالمحل أو ويش. شكراً كتير! تكرم يا باشا!'
        : hi + 'A reminder that ' + list.length + ' of your El Bash orders are still not paid:\n' + lines + '\nTotal: ' + usd(sum) + ' (' + lbp(sum) + '). You can pay cash at the shop or by Whish. Thanks a lot! Tekram ya basha!';
    }
    return 'https://wa.me/' + (o.phone || '') + '?text=' + encodeURIComponent(msg);
  };
  // A Not paid order paid in full, Cash or Whish: on pickup / delivery the same day, or later (then the day it was paid)
  // Split: whish is the part paid by Whish (L.L.), the rest was cash
  EB.paid = function (o, payment, day, whish) {
    var later = day && day !== o.day && payment !== 'House' ? day : '', part = payment === 'Split' ? whish || 0 : '';
    EB.send([{op: 'update', tab: 'Orders', where: where(o), set: {'Payment': payment, 'Paid ($)': 0, 'Paid (L.L.)': payment === 'House' ? 0 : o.total, 'Paid later': later, 'Whish part (L.L.)': part}}],
      {t: 'paid', key: o.key, payment: payment, later: later, whish: part || 0});
  };

  /* ---------- reports: totals for the days from..to (yyyy-mm-dd) ---------- */
  // Orders, items and Not paid count on the day the order was placed. Sales are the money received: an order
  // paid later counts on the day it was paid (Paid later), so a Not paid order isn't in Sales until it is paid.
  EB.report = function (list, from, to) {
    var s = {orders: 0, items: 0, sales: 0, ordered: 0, cashOrders: 0, cashLbp: 0, whishOrders: 0, whishLbp: 0, unpaidOrders: 0, unpaidLbp: 0, houseOrders: 0, houseLbp: 0,
      laterOrders: 0, laterLbp: 0, marinatedLbp: 0};   // marinated chicken: raw chicken sold, in the sales but apart from the shop's food
    var days = {}, items = {}, orders = [], later = [];
    var day = function (d) { return days[d] = days[d] || {date: d, orders: 0, sales: 0} };
    var row = function (o) { return {num: o.num, date: o.day, time: o.time, at: o.at, items: o.text, total: o.total, payment: o.payment, name: o.name, type: o.type, paidLater: o.paidLater} };
    list.forEach(function (o) {
      if (!o.live) return;
      var placed = o.day >= from && o.day <= to, paidOn = o.payment === 'Unpaid' || o.payment === 'House' ? '' : o.paidLater || o.day, paid = paidOn >= from && paidOn <= to;
      if (placed) {
        s.orders++; s.ordered += o.total; day(o.day).orders++;
        if (o.payment === 'Unpaid') { s.unpaidOrders++; s.unpaidLbp += o.total }
        if (o.payment === 'House') { s.houseOrders++; s.houseLbp += o.total }   // the owners' house: items count, not sales
        o.items.forEach(function (x) {
          var it = items[x.name] = items[x.name] || {name: x.name, cat: x.cat || '', qty: 0, sales: 0};
          it.qty += x.qty; it.sales += x.qty * x.price; s.items += x.qty;
        });
        orders.push(row(o));
      }
      if (paid) {
        var got = o.received || o.total;
        s.sales += got; day(paidOn).sales += got;
        var mar = o.items.reduce(function (a, x) { return a + (x.cat === 'Marinated Chicken' ? x.qty * x.price : 0) }, 0);
        if (mar) s.marinatedLbp += Math.min(mar, got);
        if (o.payment === 'Whish') { s.whishOrders++; s.whishLbp += got }
        else if (o.payment === 'Split') { var w = Math.min(o.whish || 0, got); s.whishOrders++; s.whishLbp += w; s.cashOrders++; s.cashLbp += got - w }
        else { s.cashOrders++; s.cashLbp += got }
        if (paidOn !== o.day) { s.laterOrders++; s.laterLbp += got; later.push(row(o)) }
      }
    });
    orders.sort(function (a, b) { return b.at - a.at });
    later.sort(function (a, b) { return b.paidLater < a.paidLater ? -1 : b.paidLater > a.paidLater ? 1 : b.at - a.at });
    return {summary: s, days: Object.keys(days).sort().map(function (k) { return days[k] }),
      items: Object.keys(items).map(function (k) { return items[k] }).sort(function (a, b) { return b.qty - a.qty || b.sales - a.sales }), orders: orders, later: later};
  };

  return EB;
})();
