/* ---------- the receipt printer (Bluetooth, 80 mm, ESC/POS) ----------
   Safari can't reach Bluetooth, so on the iPad the app is opened in the Bluefy browser, which can.
   The ticket is drawn as a picture and sent as dots, so Arabic prints exactly as on screen.
   Settings on this device (localStorage elbash-printer): auto (print new orders), width in dots, chunk size and pause between chunks. */
var PRN = (function () {
  var KEY = 'elbash-printer';
  // services the common Bluetooth receipt printers use for their "write" line
  var SERVICES = ['000018f0-0000-1000-8000-00805f9b34fb', 'e7810a71-73ae-499d-8c15-faa9aef0c3f2', '49535343-fe7d-4ae5-8fa9-9fafd205e455',
    '0000ff00-0000-1000-8000-00805f9b34fb', '0000ffe0-0000-1000-8000-00805f9b34fb', '0000fee7-0000-1000-8000-00805f9b34fb',
    '0000ae30-0000-1000-8000-00805f9b34fb', '0000af30-0000-1000-8000-00805f9b34fb', '0000ae00-0000-1000-8000-00805f9b34fb'];
  var dev = null, ch = null, busy = Promise.resolve(), listeners = [];
  function opts() { var o = {}; try { o = JSON.parse(localStorage.getItem(KEY)) || {} } catch (e) {} return {auto: o.auto !== false, width: o.width || 576, chunk: o.chunk || 180, pause: o.pause == null ? 12 : o.pause, name: o.name || ''} }
  function setOpts(p) { var o = opts(); for (var k in p) o[k] = p[k]; try { localStorage.setItem(KEY, JSON.stringify(o)) } catch (e) {} changed() }
  function changed() { listeners.forEach(function (f) { f() }) }
  function can() { return !!(navigator.bluetooth && navigator.bluetooth.requestDevice) }
  function ready() { return !!(ch && dev && dev.gatt && dev.gatt.connected) }

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
    if (!can()) return Promise.reject(new Error('NO_BLUETOOTH'));
    if (dev && !ready()) return attach(dev);
    return navigator.bluetooth.requestDevice({acceptAllDevices: true, optionalServices: SERVICES}).then(attach);
  }
  // Opening the app again: reconnect to the printer it knew, without asking, where the browser allows it
  function resume() {
    if (!can() || !navigator.bluetooth.getDevices) return Promise.resolve(false);
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
    out.push(0x1b, 0x64, 4, 0x1d, 0x56, 0x42, 0);
    return new Uint8Array(out);
  }
  function send(data) {
    var o = opts(), wait = function (ms) { return new Promise(function (ok) { setTimeout(ok, ms) }) };
    var write = function (part) { return ch.writeValueWithoutResponse && ch.properties.writeWithoutResponse ? ch.writeValueWithoutResponse(part) : ch.writeValue(part) };
    var p = Promise.resolve();
    for (var i = 0; i < data.length; i += o.chunk) (function (part) { p = p.then(function () { return write(part) }).then(function () { return o.pause && wait(o.pause) }) })(data.slice(i, i + o.chunk));
    return p;
  }
  // One print at a time, reconnecting first if the printer dropped
  function printCanvas(canvas) {
    var job = busy.then(function () { return ready() ? null : dev ? attach(dev) : Promise.reject(new Error('NOT_CONNECTED')) })
      .then(function () { return send(bytesOf(canvas)) });
    busy = job.catch(function () {});
    return job;
  }

  /* ---------- the ticket ---------- */
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
      wrap(t, size + 'px ' + font, opt.max || W - 2 * M).forEach(function (line) {
        var yy = y + size; ops.push(function () { g.font = (opt.bold ? '800 ' : '600 ') + size + 'px ' + font; g.textAlign = align; g.direction = opt.rtl ? 'rtl' : 'ltr'; g.fillStyle = '#000'; g.fillText(line, x, yy) });
        y += Math.round(size * (opt.lh || 1.3));
      });
    }
    function rule(thick) { var yy = y + 6; ops.push(function () { g.fillStyle = '#000'; g.fillRect(M, yy, W - 2 * M, thick || 2) }); y += 14 }
    var kind = o.type === 'Delivery' ? 'توصيل · DELIVERY' : o.type === 'Pickup' ? 'استلام · PICKUP' : '';
    text('EL BASH · الباش', EN, 34, 'center', W / 2, {bold: true});
    text('Chicken & Snack', EN, 20, 'center', W / 2);
    rule(3);
    // the order number big, white on black
    var ny = y; ops.push(function () { g.fillStyle = '#000'; g.fillRect(M - 4, ny + 4, W - 2 * M + 8, 84); g.font = '800 64px ' + EN; g.textAlign = 'center'; g.direction = 'ltr'; g.fillStyle = '#fff'; g.fillText('#' + o.num, W / 2, ny + 68) });
    y += 92;
    y += 6;
    text((o.web ? '🌐 Website · ' : '') + o.day + '  ' + o.time, EN, 22, 'center', W / 2);
    if (kind) text(kind, AR, 28, 'center', W / 2, {bold: true});
    if (o.name || o.phone) text([o.name, o.phone ? '+' + o.phone : ''].filter(Boolean).join(' · '), AR, 26, 'center', W / 2, {bold: true});
    if (o.type === 'Delivery' && o.address) text('📍 ' + o.address, AR, 24, 'right', W - M, {rtl: true});
    rule(2);
    o.items.forEach(function (x) {
      var price = money ? money(x.price * x.qty) : '', yy = y + 30;
      text(x.qty + ' × ' + (x.ar || x.name), AR, 30, 'right', W - M, {bold: true, rtl: true, max: W - 2 * M - 110});
      if (price) ops.push(function () { g.font = '700 22px ' + EN; g.textAlign = 'left'; g.direction = 'ltr'; g.fillStyle = '#000'; g.fillText(price, M, yy) });
      if (x.ar && x.ar !== x.name) text(x.name, EN, 20, 'right', W - M, {max: W - 2 * M - 110});
      if (x.sauces && x.sauces.length) text('+ ' + x.sauces.join(' + '), AR, 22, 'right', W - M, {rtl: true});
      y += 6;
    });
    if (o.note) { rule(2); text('ملاحظة: ' + o.note, AR, 26, 'right', W - M, {bold: true, rtl: true}) }
    rule(3);
    var tot = money ? money(o.total) : String(o.total), ty = y + 34;
    ops.push(function () { g.font = '800 34px ' + EN; g.textAlign = 'left'; g.direction = 'ltr'; g.fillStyle = '#000'; g.fillText(tot, M, ty); g.textAlign = 'right'; g.font = '800 30px ' + AR; g.fillText('المجموع', W - M, ty) });
    y += 46;
    var pay = {Cash: 'كاش · Cash', Whish: 'ويش · Whish', Unpaid: 'ما دفع · NOT PAID'}[o.payment] || o.payment || '';
    if (pay) text(pay, AR, 26, 'center', W / 2, {bold: o.payment === 'Unpaid'});
    rule(1);
    text('شكراً يا باشا · Thank you', AR, 22, 'center', W / 2);
    y += 10;
    c.width = W; c.height = Math.ceil(y);
    g.fillStyle = '#fff'; g.fillRect(0, 0, W, c.height);
    ops.forEach(function (f) { f() });
    return c;
  }
  function print(o, money) { return printCanvas(ticket(o, money)) }

  return {can: can, ready: ready, connect: connect, resume: resume, forget: forget, print: print, ticket: ticket, bytesOf: bytesOf,
    opts: opts, setOpts: setOpts, name: function () { return dev ? dev.name || opts().name : opts().name }, on: function (f) { listeners.push(f) }};
})();
