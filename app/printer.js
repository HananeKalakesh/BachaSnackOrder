/* ---------- the receipt printer (Bluetooth, 80 mm, ESC/POS) ----------
   Chrome on Android talks to Bluetooth (BLE) printers directly; classic Bluetooth printers go through the RawBT app.
   Safari can't reach Bluetooth, so on an iPad the app is opened in the Bluefy browser, which can.
   The ticket is drawn as a picture and sent as dots, so Arabic prints exactly as on screen.
   Settings on this device (localStorage elbash-printer): auto (print new orders), width in dots, chunk size and pause between chunks. */
var PRN = (function () {
  var KEY = 'elbash-printer';
  // services the common Bluetooth receipt printers use for their "write" line
  var SERVICES = ['000018f0-0000-1000-8000-00805f9b34fb', 'e7810a71-73ae-499d-8c15-faa9aef0c3f2', '49535343-fe7d-4ae5-8fa9-9fafd205e455',
    '0000ff00-0000-1000-8000-00805f9b34fb', '0000ffe0-0000-1000-8000-00805f9b34fb', '0000fee7-0000-1000-8000-00805f9b34fb',
    '0000ae30-0000-1000-8000-00805f9b34fb', '0000af30-0000-1000-8000-00805f9b34fb', '0000ae00-0000-1000-8000-00805f9b34fb'];
  var dev = null, ch = null, busy = Promise.resolve(), listeners = [];
  var ANDROID = /Android/i.test(navigator.userAgent);
  // mode: 'ble' talks to the printer from the browser; 'rawbt' hands each ticket to the RawBT app (Android, classic Bluetooth printers)
  function opts() { var o = {}; try { o = JSON.parse(localStorage.getItem(KEY)) || {} } catch (e) {} return {auto: o.auto !== false, arrive: o.arrive === true, width: o.width || 576, chunk: o.chunk || 180, pause: o.pause == null ? 12 : o.pause, name: o.name || '', mode: o.mode === 'rawbt' && ANDROID ? 'rawbt' : 'ble', rawfmt: o.rawfmt === 'escpos' ? 'escpos' : 'image', tail: o.tail == null ? 160 : o.tail} }
  function setOpts(p) { var o = opts(); for (var k in p) o[k] = p[k]; try { localStorage.setItem(KEY, JSON.stringify(o)) } catch (e) {} changed() }
  function changed() { listeners.forEach(function (f) { f() }) }
  function rawbt() { return opts().mode === 'rawbt' }
  function ble() { return !!(navigator.bluetooth && navigator.bluetooth.requestDevice) }
  function can() { return rawbt() || ble() }
  function ready() { return rawbt() || !!(ch && dev && dev.gatt && dev.gatt.connected) }

  function attach(d) {
    dev = d;
    d.addEventListener('gattserverdisconnected', function () { ch = null; changed() });
    return d.gatt.connect().then(function (g) { return g.getPrimaryServices() }).then(function (list) {
      // the first characteristic we're allowed to write to
      return list.reduce(function (p, s) {
        return p.then(function (found) {
          return found || s.getCharacteristics().then(function (cs) {
            return cs.filter(function (c) { return c.properties.writeWithoutResponse || c.properties.write })[0] || null;
          }).catch(function () { return null });
        });
      }, Promise.resolve(null));
    }).then(function (c) {
      if (!c) throw new Error('This printer has no line we can write to');
      ch = c; setOpts({name: d.name || 'Printer'}); return d.name;
    });
  }
  // Tapping the button: pick the printer (needs a tap, browsers ask the user)
  function connect() {
    if (!ble()) return Promise.reject(new Error('NO_BLUETOOTH'));
    if (dev && !ready()) return attach(dev);
    return navigator.bluetooth.requestDevice({acceptAllDevices: true, optionalServices: SERVICES}).then(attach);
  }
  // Opening the app again: reconnect to the printer it knew, without asking, where the browser allows it
  function resume() {
    if (rawbt() || !ble() || !navigator.bluetooth.getDevices) return Promise.resolve(false);
    return navigator.bluetooth.getDevices().then(function (ds) {
      var d = ds.filter(function (x) { return x.name === opts().name })[0] || ds[0];
      return d ? attach(d).then(function () { changed(); return true }) : false;
    }).catch(function () { return false });
  }
  function forget() { try { if (dev && dev.gatt.connected) dev.gatt.disconnect() } catch (e) {} dev = null; ch = null; changed() }

  // ESC/POS: reset, the picture in bands of 24 dot rows, feed, cut
  function bytesOf(canvas) {
    var w = canvas.width, h = canvas.height, bw = w / 8, px = canvas.getContext('2d').getImageData(0, 0, w, h).data, out = [0x1b, 0x40];
    for (var y0 = 0; y0 < h; y0 += 24) {
      var rows = Math.min(24, h - y0);
      out.push(0x1d, 0x76, 0x30, 0, bw & 255, bw >> 8, rows & 255, rows >> 8);
      for (var y = y0; y < y0 + rows; y++) for (var xb = 0; xb < bw; xb++) {
        var b = 0;
        for (var bit = 0; bit < 8; bit++) {
          var i = (y * w + xb * 8 + bit) * 4, lum = px[i + 3] < 128 ? 255 : (px[i] * 299 + px[i + 1] * 587 + px[i + 2] * 114) / 1000;
          if (lum < 150) b |= 0x80 >> bit;
        }
        out.push(b);
      }
    }
    out.push(0x1d, 0x56, 0x42, 0);
    return new Uint8Array(out);
  }
  function send(data) {
    var o = opts(), wait = function (ms) { return new Promise(function (ok) { setTimeout(ok, ms) }) };
    var write = function (part) { return ch.writeValueWithoutResponse && ch.properties.writeWithoutResponse ? ch.writeValueWithoutResponse(part) : ch.writeValue(part) };
    var p = Promise.resolve();
    for (var i = 0; i < data.length; i += o.chunk) (function (part) { p = p.then(function () { return write(part) }).then(function () { return o.pause && wait(o.pause) }) })(data.slice(i, i + o.chunk));
    return p;
  }
  // RawBT: the ticket goes to the RawBT app, which prints it on the printer chosen there.
  // As a picture (RawBT turns it into dots with its own printer settings), or as ready ESC/POS bytes.
  var RAWBT = '#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end;';
  function sendRawbt(canvas) {
    if (opts().rawfmt !== 'escpos') { api.go('intent:' + canvas.toDataURL('image/png') + RAWBT); return Promise.resolve() }
    var data = bytesOf(canvas), s = '';
    for (var i = 0; i < data.length; i += 8192) s += String.fromCharCode.apply(null, data.subarray(i, i + 8192));
    api.go('intent:base64,' + btoa(s) + RAWBT);
    return Promise.resolve();
  }
  // One print at a time, reconnecting first if the printer dropped
  function printCanvas(canvas) {
    if (rawbt()) return sendRawbt(canvas);
    var job = busy.then(function () { return ready() ? null : dev ? attach(dev) : Promise.reject(new Error('NOT_CONNECTED')) })
      .then(function () { return send(bytesOf(canvas)) });
    busy = job.catch(function () {});
    return job;
  }

  /* ---------- the ticket ---------- */
  var SAUCES_AR = {'Cocktail Sauce': 'كوكتيل', 'Ketchup': 'كاتشاب', 'Barbecue Sauce': 'باربكيو', 'Cheddar Sauce': 'تشيدر', 'Buffalo Sauce': 'بوفالو', 'Honey Mustard Sauce': 'هني ماستارد', 'Garlic Sauce': 'توم'};
  var AR = 'Cairo, "Geeza Pro", sans-serif', EN = '"Plus Jakarta Sans", Helvetica, Arial, sans-serif';
  function ticket(o, money) {
    var W = opts().width, M = 14, c = document.createElement('canvas'), g = c.getContext('2d'), y = 0, ops = [];
    // drawn twice: once to measure the height, once for real
    function wrap(text, font, max) {
      g.font = font; var words = String(text).split(' '), lines = [], cur = '';
      words.forEach(function (w) { var t = cur ? cur + ' ' + w : w; if (cur && g.measureText(t).width > max) { lines.push(cur); cur = w } else cur = t });
      if (cur) lines.push(cur); return lines;
    }
    function text(t, font, size, align, x, opt) {
      opt = opt || {};
      wrap(t, (opt.bold ? '800 ' : '600 ') + size + 'px ' + font, opt.max || W - 2 * M).forEach(function (line) {
        var yy = y + size; ops.push(function () { g.font = (opt.bold ? '800 ' : '600 ') + size + 'px ' + font; g.textAlign = align; g.direction = opt.rtl ? 'rtl' : 'ltr'; g.fillStyle = '#000'; g.fillText(line, x, yy) });
        y += Math.round(size * (opt.lh || 1.3));
      });
    }
    function rule(thick) { var yy = y + 6; ops.push(function () { g.fillStyle = '#000'; g.fillRect(M, yy, W - 2 * M, thick || 2) }); y += 14 }
    // Arabic only, to keep the ticket short
    var kind = o.type === 'Delivery' ? 'توصيل' : o.type === 'Pickup' ? 'استلام' : '';
    text('الباش', AR, 34, 'center', W / 2, {bold: true, lh: 1.15});
    rule(3);
    // the order number big, white on black
    var ny = y; ops.push(function () { g.fillStyle = '#000'; g.fillRect(M - 4, ny + 4, W - 2 * M + 8, 84); g.font = '800 64px ' + EN; g.textAlign = 'center'; g.direction = 'ltr'; g.fillStyle = '#fff'; g.fillText('#' + o.num, W / 2, ny + 68) });
    y += 92;
    y += 6;
    text((o.web ? '🌐 من الموقع · ' : '') + o.day + '  ' + o.time, EN, 22, 'center', W / 2);
    if (kind) text(kind, AR, 28, 'center', W / 2, {bold: true});
    if (o.name || o.phone) text([o.name, o.phone ? '+' + o.phone : ''].filter(Boolean).join(' · '), AR, 26, 'center', W / 2, {bold: true});
    if (o.type === 'Delivery' && o.address) text('📍 ' + o.address, AR, 24, 'right', W - M, {rtl: true});
    rule(2);
    o.items.forEach(function (x) {
      var price = money ? money(x.price * x.qty).replace(' L.L.', '') : '', yy = y + 30;
      g.font = '700 22px ' + EN; var room = price ? g.measureText(price).width + 24 : 0;  // the price keeps its own space on the left
      text(x.qty + ' × ' + (x.ar || x.name), AR, 30, 'right', W - M, {bold: true, rtl: true, max: W - 2 * M - room});
      if (price) ops.push(function () { g.font = '700 22px ' + EN; g.textAlign = 'left'; g.direction = 'ltr'; g.fillStyle = '#000'; g.fillText(price, M, yy) });
      if (x.sauces && x.sauces.length) text('+ ' + x.sauces.map(function (s) { return SAUCES_AR[s] || s }).join(' + '), AR, 24, 'right', W - M, {rtl: true});
      y += 4;
    });
    if (o.note) { rule(2); text('ملاحظة: ' + o.note, AR, 26, 'right', W - M, {bold: true, rtl: true}) }
    rule(3);
    var tot = money ? money(o.total).replace(' L.L.', '') : String(o.total), ty = y + 34;
    ops.push(function () { g.font = '800 34px ' + EN; g.textAlign = 'left'; g.direction = 'ltr'; g.fillStyle = '#000'; g.fillText(tot, M, ty); g.textAlign = 'right'; g.direction = 'rtl'; g.font = '800 30px ' + AR; g.fillText('المجموع ل.ل.', W - M, ty) });
    y += 46;
    var pay = {Cash: 'كاش', Whish: 'ويش', Unpaid: 'ما دفع'}[o.payment] || o.payment || '';
    if (pay) text(pay, AR, 26, 'center', W / 2, {bold: o.payment === 'Unpaid'});
    rule(1);
    text('شكراً يا باشا', AR, 22, 'center', W / 2);
    // blank paper at the end, so the whole ticket is past the tear bar (about 2 cm above the print head)
    // (printer commands end with "feed to the cutter and cut", so only a picture sent to RawBT needs it)
    y += 10 + (rawbt() && opts().rawfmt === 'image' ? opts().tail : 0);
    c.width = W; c.height = Math.ceil(y);
    g.fillStyle = '#fff'; g.fillRect(0, 0, W, c.height);
    ops.forEach(function (f) { f() });
    return c;
  }
  function print(o, money) { return printCanvas(ticket(o, money)) }

  var api = {go: function (u) { location.href = u }, can: can, ble: ble, android: ANDROID, ready: ready, connect: connect, resume: resume, forget: forget, print: print, ticket: ticket, bytesOf: bytesOf,
    opts: opts, setOpts: setOpts, name: function () { return rawbt() ? 'RawBT' : dev ? dev.name || opts().name : opts().name }, on: function (f) { listeners.push(f) }};
  return api;
})();
