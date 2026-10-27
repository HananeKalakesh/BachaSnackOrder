/* ---------- cart ---------- */
function add(key, price, q = 1) {
  order[key] ??= {qty: 0, price};
  order[key].qty += q;
  if (order[key].qty <= 0) delete order[key];
  saveCart(); cart();
}
function cart() {
  $$('.item').forEach(r => {
    const q = r.querySelector('.qty'), b = r.querySelector('.incart');
    if (q) { q.textContent = Object.entries(order).reduce((s, [k, x]) => s + (splitAdj(k).base === r.dataset.name ? x.qty : 0), 0); r.classList.toggle('in', +q.textContent > 0) }
    if (b) {   // items with options: count every variant of this item in the order
      const n = Object.entries(order).reduce((s, [k, x]) => s + (k.startsWith(r.dataset.name + ' [') ? x.qty : 0), 0);
      b.textContent = '✓ ' + n + ' ' + t('in order'); b.hidden = !n;
    }
  });
  const entries = Object.entries(order);
  const total = entries.reduce((s, [, x]) => s + x.qty * x.price, 0), count = entries.reduce((s, [, x]) => s + x.qty, 0);
  const last = store.get('basha-last');
  $('#cartItems').innerHTML = entries.length
    ? entries.map(([n, x]) => {
        const nm = esc(tKeyBase(splitAdj(n).base)), k = esc(n), aw = adjWords(n), can = adjOptions(itemOf(splitAdj(n).base)).length;
        const adj = aw.length || can ? `<div class="ladj">${aw.length ? `<span class="atags">${esc(aw.join(' · '))}</span>` : ''}${can ? `<button class="adjb" type="button" data-act="adj" data-key="${k}">✎ ${t('Adjust')}</button>` : ''}</div>` : '';
        return `<div class="line"><div class="lname">${nm}</div>${adj}<div class="stepper"><button class="ldec" type="button" data-act="dec" data-key="${k}" aria-label="${esc(t('Remove one'))}: ${nm}">−</button><span class="qty">${x.qty}</span><button class="linc" type="button" data-act="inc" data-key="${k}" aria-label="${esc(t('Add one'))}: ${nm}">+</button></div><em>${lineMoney(n, x.qty, x.qty * x.price)}</em><button class="remove" type="button" data-act="rm" data-key="${k}" aria-label="${esc(t('Remove'))}: ${nm}">×</button></div>`;
      }).join('') + upsell()
    : '<div class="note">' + t('No items selected yet.') + '</div>' + (last && Object.keys(last).length ? `<button class="reorder" type="button" data-act="reorder">↻ ${t('Reorder last order')}</button>` : '');
  $('#total').textContent = fmt(total) + (total ? ' · ' + usdAlso(total) : '');
  // empty basket: the button shows only to reorder the last order (it opens the basket with Reorder in it)
  const again = !count && last && Object.keys(last).length;
  $('#cartFab').innerHTML = count ? `<span>${t('View Order')} (${count})</span><b>${fmt(total)}</b>` : `<span>↻ ${t('Reorder last order')}</span>`;
  $('#cartFab').hidden = !count && !again;
  const dn = $('#deliveryNote'), dnText = CONFIG.deliveryNote[lang] || CONFIG.deliveryNote.en;
  dn.textContent = dnText; dn.hidden = !dnText;
}

// Suggest drinks in the cart when the order has none
function upsell() {
  const drinks = data.drinkGrid.filter(([n]) => !SOLD.has(n));
  if (!drinks.length || data.drinkGrid.some(([n]) => order[n])) return '';
  return `<div class="upsell"><p>🥤 ${t('Add a drink?')}</p><div>${drinks.map(([n, p]) => `<button type="button" data-act="drink" data-key="${esc(n)}">+ ${esc(tName(n))} · ${fmt(p)}</button>`).join('')}</div></div>`;
}
// Short "Added" message + cart button bump after adding from the menu
let toastTimer;
function added(name) {
  const el = $('#toast'), fab = $('#cartFab');
  el.textContent = '✓ ' + t('Added') + ': ' + tKey(name);
  el.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 1800);
  fab.classList.remove('bump'); void fab.offsetWidth; fab.classList.add('bump');
}

/* ---------- popups (cart panel + choice modal) ---------- */
function openLayer(el, opener) {
  lastFocus = opener || document.activeElement;
  el.classList.add('open'); $('#backdrop').classList.add('open'); $('#toast').classList.remove('show');
  document.documentElement.classList.add('lock');
  const f = el.querySelector('input,button,textarea');
  if (f) f.focus({preventScroll: true});
}
function closeLayers() {
  $('#choiceModal').classList.remove('open'); $('#sendModal').classList.remove('open'); $('#cartPanel').classList.remove('open'); $('#backdrop').classList.remove('open');
  document.documentElement.classList.remove('lock');
  $$('#choiceModal input').forEach(i => i.checked = false);
  selectedChoice = null;
  if (lastFocus && document.contains(lastFocus)) lastFocus.focus({preventScroll: true});
  lastFocus = null;
}
document.addEventListener('keydown', e => {
  const layer = $('.choice-modal.open') || $('.panel.open');
  if (!layer) return;
  if (e.key === 'Escape') { closeLayers(); return }
  if (e.key !== 'Tab') return;               // keep keyboard focus inside the open popup
  const f = [...layer.querySelectorAll('button,input,textarea,a[href]')].filter(x => !x.disabled && x.offsetParent !== null);
  if (!f.length) return;
  if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus() }
  else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus() }
});

function renderChoiceOptions() {
  const ty = selectedChoice.type, box = (v, label) => `<label><input type="checkbox" value="${esc(v)}"> <span>${label}</span></label>`;
  if (ty !== 'adj') $('#choiceFor').textContent = tName(selectedChoice.name);
  $('#choiceErr').textContent = '';
  $('#choiceTitle').textContent = t(ty === 'p' ? 'Choose number of pieces' : ty === 'o' ? 'Choose the size' : 'Choose your sauces');
  selectedChoice.sauce = '';
  $('#confirmChoice').textContent = t(ty === 'adj' ? 'Done' : 'Add to order');
  $('#choiceOptions').classList.toggle('chipset', ty === 'adj');
  if (ty === 'adj') {
    const k = selectedChoice.key, a = splitAdj(k), opts = adjOptions(itemOf(a.base)), q = order[k].qty;
    $('#choiceFor').textContent = tKeyBase(a.base);
    $('#choiceTitle').textContent = t('Adjust the item');
    $('#choiceHint').textContent = t('Tap what to change.');
    const extra = c => { const x = adjExtras(itemOf(a.base), [c]).reduce((s, e) => s + EXTRA[e].price, 0); return x ? ' +' + fmt(x) : '' };
    const chip = c => `<label><input type="checkbox" value="${c}"${a.codes.includes(c) ? ' checked' : ''}> <span>${esc(ADJ[c][lang === 'ar' ? 1 : 0] + extra(c))}</span></label>`;
    $('#choiceOptions').innerHTML = ADJ_GROUPS.map(([g, re]) => { const c = opts.filter(x => re.test(x)); return c.length ? `<p class="choice-sub">${t(g)}</p><div class="chips">${c.map(chip).join('')}</div>` : '' }).join('') +
      `<input class="adjnote" id="adjNote" maxlength="60" placeholder="${esc(t('Something else? (optional)'))}" value="${esc(a.note)}">` +
      (q > 1 ? `<p class="choice-sub">${t('Change')}</p><div class="chips"><label><input type="radio" name="adjn" value="1" checked> <span>${t('Only one')}</span></label><label><input type="radio" name="adjn" value="all"> <span>${t('All {n}').replace('{n}', q)}</span></label></div>` : '');
    return;
  }
  if (ty === 'o') {
    $('#choiceHint').textContent = t('Choose one.');
    $('#choiceOptions').innerHTML = OPTS[selectedChoice.name].map(o => `<label${o.sold ? ' class="off"' : ''}><input type="radio" name="opt" value="${esc(o.label)}"${o.sold ? ' disabled' : ''}> <span>${esc(optLabel(o.label))} — ${o.sold ? t('Not available') : o.usd ? `<bdi dir="ltr">$${o.usd}</bdi> (${fmt(o.price)})` : fmt(o.price)}</span></label>`).join('') +
      '<div id="optSauces"></div>';
  } else if (ty === 'p') {
    $('#choiceHint').textContent = t('Choose one.');
    $('#choiceOptions').innerHTML = Object.entries(piecesOf(selectedChoice.name)).map(([n, pr]) => `<label><input type="radio" name="pcs" value="${n}"> <span>${n} ${pcsWord(n)} — ${fmt(pr)}</span></label>`).join('');
  } else if (ty === 's') {
    $('#choiceHint').textContent = t('Select one or more sauces.');
    $('#choiceOptions').innerHTML = SAUCES.fries.map(v => box(v, tSauce(v))).join('');
  } else {
    $('#choiceHint').textContent = t(ty === 's1' ? 'Choose 1 sauce.' : 'Choose 1 or 2 sauces.');
    $('#choiceOptions').innerHTML = SAUCES.wings.map(v => box(v, tSauce(v) + (v === 'Buffalo Sauce' ? ' 🌶️' : ''))).join('');
  }
}
$('#choiceOptions').onchange = e => {   // limit how many sauces can be ticked
  if (selectedChoice && selectedChoice.type === 'adj') {   // one bread, and spicy or not, at a time
    const v = e.target.value, one = re => { if (re.test(v) && e.target.checked) $$('#choiceOptions input[type=checkbox]').forEach(b => { if (b !== e.target && re.test(b.value)) b.checked = false }) };
    one(/^bread-/); one(/spicy/);
    return;
  }
  if (e.target.name === 'opt') {          // a size with sauces (wings): its sauces under it
    const o = optOf(selectedChoice.name, e.target.value), box = (v, label) => `<label><input type="checkbox" value="${esc(v)}"> <span>${label}</span></label>`;
    selectedChoice.sauce = o.sauce;
    $('#optSauces').innerHTML = o.sauce ? `<p class="choice-sub">${esc(t(o.sauce === 's1' ? 'Choose 1 sauce.' : 'Choose 1 or 2 sauces.'))}</p>` +
      SAUCES.wings.map(v => box(v, tSauce(v) + (v === 'Buffalo Sauce' ? ' 🌶️' : ''))).join('') : '';
  }
  const ty = selectedChoice && (selectedChoice.sauce || selectedChoice.type), max = ty === 's2' ? 2 : ty === 's1' ? 1 : 99;
  const boxes = $$('#choiceOptions input[type=checkbox]'), n = boxes.filter(b => b.checked).length;
  boxes.forEach(b => { const off = n >= max && !b.checked; b.disabled = off; b.parentElement.classList.toggle('off', off) });
  $('#choiceErr').textContent = '';
};
$('#confirmChoice').onclick = () => {
  if (!selectedChoice) return;
  if (selectedChoice.type === 'adj') {   // move the item (one of them, or all) to a line with these changes
    const k = selectedChoice.key, line = order[k], a = splitAdj(k);
    if (line) {
      const codes = $$('#choiceOptions input[type=checkbox]:checked').map(x => x.value), nk = adjKey(a.base, codes, $('#adjNote').value);
      const n = (($$('#choiceOptions input[name=adjn]:checked')[0] || {}).value === 'all') ? line.qty : 1;
      if (nk !== k) { line.qty -= n; if (line.qty <= 0) delete order[k]; order[nk] ??= {qty: 0, price: priceOf(nk) || line.price}; order[nk].qty += n; saveCart() }
    }
    $('#choiceModal').classList.remove('open'); selectedChoice = null; cart();
    return;
  }
  const checked = $$('#choiceModal input:checked'), err = m => $('#choiceErr').textContent = t(m);
  if (selectedChoice.type === 'o') {
    const size = $$('#choiceModal input[name=opt]:checked')[0], sauces = $$('#choiceModal input[type=checkbox]:checked').map(x => x.value);
    if (!size) return err('Please choose the size.');
    const o = optOf(selectedChoice.name, size.value);
    if (o.sauce && !sauces.length) return err(o.sauce === 's1' ? 'Please choose 1 sauce.' : 'Please choose at least one sauce.');
    const key = selectedChoice.name + ' [' + [o.label].concat(sauces).join(', ') + ']';
    add(key, o.price);
    added(key);
  } else if (selectedChoice.type === 'p') {
    if (!checked.length) return err('Please choose the number of pieces.');
    const n = checked[0].value;
    add(selectedChoice.name + ' [' + n + ' PCS]', piecesOf(selectedChoice.name)[n]);
    added(selectedChoice.name + ' [' + n + ' PCS]');
  } else {
    if (!checked.length) return err(selectedChoice.type === 's1' ? 'Please choose 1 sauce.' : 'Please choose at least one sauce.');
    const key = selectedChoice.name + ' [' + checked.map(x => x.value).join(', ') + ']';
    add(key, selectedChoice.price);
    added(key);
  }
  closeLayers();
};
$('#cancelChoice').onclick = () => { if (selectedChoice && selectedChoice.type === 'adj') { $('#choiceModal').classList.remove('open'); selectedChoice = null } else closeLayers() };   // Adjust opens over the basket: Cancel goes back to it
$('#backdrop').onclick = closeLayers;
$('.close').onclick = closeLayers;
$('#cartFab').onclick = e => { cart(); openLayer($('#cartPanel'), e.currentTarget) };

/* ---------- clicks on menu cards ---------- */
document.addEventListener('click', e => {
  const r = e.target.closest('.item');
  if (!r || r.classList.contains('soldout')) return;
  // items with options open the popup from anywhere on the card; others only react to their buttons
  const b = e.target.closest('button') || (r.classList.contains('choosable') ? r.querySelector('.add') : null);
  if (!b) return;
  const name = r.dataset.name, price = +r.dataset.price;
  if (b.classList.contains('inc')) { add(name, price, 1); added(name) }
  else if (b.classList.contains('dec')) {
    const k = order[name] ? name : Object.keys(order).reverse().find(x => splitAdj(x).base === name);
    if (k) add(k, order[k].price, -1);
  }
  else if (b.classList.contains('add')) {
    selectedChoice = {name, price, type: r.dataset.type};
    renderChoiceOptions();
    openLayer($('#choiceModal'), b);
  }
});

/* ---------- clicks inside the cart ---------- */
$('#cartItems').onclick = e => {
  const b = e.target.closest('button[data-act]');
  if (!b) return;
  const a = b.dataset.act;
  if (a === 'reorder') { fillOrder(store.get('basha-last')); saveCart(); cart(); return }
  if (a === 'drink') { add(b.dataset.key, ITEMS[b.dataset.key][1]); return }
  const k = b.dataset.key;
  if (!order[k]) return;
  if (a === 'adj') { selectedChoice = {type: 'adj', key: k}; renderChoiceOptions(); $('#choiceModal').classList.add('open'); $('#choiceModal input').focus({preventScroll: true}); return }
  if (a === 'rm') { delete order[k]; saveCart(); cart() }
  else add(k, order[k].price, a === 'inc' ? 1 : -1);
};
// "Clear order" needs a second tap within 3 seconds, so an order isn't wiped by accident
let clearTimer;
function disarmClear() { const c = $('.clear'); clearTimeout(clearTimer); c.classList.remove('armed'); c.textContent = t('Clear order') }
$('.clear').onclick = () => {
  const c = $('.clear');
  if (!Object.keys(order).length) return;
  if (!c.classList.contains('armed')) {
    c.classList.add('armed'); c.textContent = t('Tap again to clear');
    clearTimer = setTimeout(disarmClear, 3000);
    return;
  }
  disarmClear();
  Object.keys(order).forEach(k => delete order[k]); $('#custNote').value = ''; saveCart(); cart();
};
$$('input[name=otype]').forEach(r => r.onchange = () => { $('#custAddr').hidden = r.value !== 'Delivery' });
$('.form').addEventListener('input', () => { $('#formErr').textContent = ''; saveCustomer(); saveCart() });
$('.form').addEventListener('change', saveCustomer);

/* ---------- demo mode (?demo): orders go to a pretend sheet on this device (app/demo.js), shared with the app opened with ?demo ---------- */
const DEMO = /[?&]demo\b/.test(location.search);
let demoP = null;
function demoServer() {
  return demoP ||= new Promise((ok, fail) => {
    const s = document.createElement('script'); s.src = 'app/demo.js';
    s.onload = () => EBDemo.server().then(d => { EBDemo.banner(null, true); ok(d) }, fail); s.onerror = fail;
    document.head.appendChild(s);
  });
}
if (DEMO) demoServer();

/* ---------- send the order: straight to the shop's order screen, or on WhatsApp if that doesn't work ---------- */
// A cart key as the sheet names it: 'Crispy Meal [5 PCS]' -> 'Crispy Meal 5 PCS'; 'Loaded Fries [Ketchup, Cheddar Sauce]' -> its sauces
function sheetItem(key, qty) {
  const x = sheetBase(splitAdj(key).base, qty), w = adjWords(key, 'ar'), parts = [];
  w.forEach(s => { const l = parts[parts.length - 1]; if (l && (l + '، ' + s).length <= 40) parts[parts.length - 1] = l + '، ' + s; else parts.push(s.slice(0, 40)) });
  x.sauces = x.sauces.concat(parts).slice(0, 4);
  return x;
}
function sheetBase(key, qty) {
  const m = key.match(/^(.*?) \[(.*)\]$/);
  if (!m) return {name: key, qty, sauces: []};
  const item = ITEMS[m[1]];
  if (item && item[3] === 'p') return {name: m[1] + ' ' + parseInt(m[2]) + ' PCS', qty, sauces: []};
  if (item && item[3] === 'o') { const p = m[2].split(', '), o = optOf(m[1], p[0]); return {name: o ? o.item : key, qty, sauces: p.slice(1)} }
  return {name: m[1], qty, sauces: m[2].split(', ')};
}
function whatsappText(entries, name, phone, type, addr, note) {
  let total = 0, msg = t('Hi El Bash, I would like to place an order:') + '\n\n';
  entries.forEach(([n, it]) => { total += it.qty * it.price; msg += `• ${it.qty}${lang === 'ar' ? '×' : 'x'} ${tKey(n)} - ${lineMoney(n, it.qty, it.qty * it.price)}\n` });
  msg += '\n*' + t('Total') + ':* ' + fmt(total) + ' (' + usdAlso(total) + ')\n\n*' + t('Name') + ':* ' + name + '\n*' + t('Phone') + ':* ' + phone + '\n*' + t('Order type') + ':* ' + t(type);
  if (type === 'Delivery') msg += '\n*' + t('Address') + ':* ' + addr;
  if (note) msg += '\n*' + t('Notes') + ':* ' + note;
  return msg;
}
function viaWhatsApp(msg, num) {
  $('#sendNum').hidden = !num; $('#sendNum').textContent = num ? t('Order #{n}').replace('{n}', num) : '';
  pendingUrl = `https://wa.me/${CONFIG.phone}?text=${encodeURIComponent(msg)}`;
  $('#sendModal').classList.add('open');
  $('#goWhatsApp').focus({preventScroll: true});
}
// In the shop's app now: the cart is emptied (sending again would make a second order), and the WhatsApp message
// carries the number so the shop knows it's already in the app (WhatsApp keeps the conversation with the customer)
function sentOrder(num, msg) {
  Object.keys(order).forEach(k => delete order[k]); $('#custNote').value = ''; saveCart(); cart();
  viaWhatsApp(t('🌐 Order #{n} (already in the app)').replace('{n}', num) + '\n' + msg, num);
}
let sending = false;
$('.send').onclick = () => {
  const err = $('#formErr'), fail = m => { err.textContent = t(m); err.scrollIntoView({block: 'nearest'}) };
  err.textContent = '';
  if (sending) return;
  const entries = Object.entries(order);
  if (!entries.length) return fail('Your order is empty. Add some items first.');
  if (isClosedToday()) return fail("We're closed today. Please send your order another day.");
  if (busyNow() && busyNow().mode === 'paused') { updateBusy(); err.textContent = $('#busyBanner').textContent; return }
  const name = $('#custName').value.trim(), phone = $('#custPhone').value.trim(), type = ($('input[name=otype]:checked') || {}).value,
    addr = $('#custAddr').value.trim(), note = $('#custNote').value.trim();
  if (!name) return fail('Please enter your name.');
  if ((phone.match(/\d/g) || []).length < 7) return fail('Please enter your WhatsApp number.');
  if (!type) return fail('Please choose Delivery or Pickup.');
  if (type === 'Delivery' && !addr) return fail('Please enter your delivery address.');
  store.set('basha-last', orderQtys()); saveCustomer();   // next time, this device fills in the same name and number
  const msg = whatsappText(entries, name, phone, type, addr, note);
  if (!CONFIG.orderUrl && !DEMO) return viaWhatsApp(msg);   // the demo always goes to the pretend app
  const btn = $('.send'), offer = () => { err.textContent = t("We couldn't send it to the shop. Send it on WhatsApp instead:"); viaWhatsApp(msg) };
  sending = true; btn.disabled = true; btn.textContent = t('Sending…');
  const ctl = 'AbortController' in window ? new AbortController() : null, timer = ctl && setTimeout(() => ctl.abort(), 20000);
  const done = () => { clearTimeout(timer); sending = false; btn.disabled = false; btn.textContent = t('Send order') };
  const body = JSON.stringify({action: 'webOrder', order: {name, phone, type, address: addr, note, lang, items: entries.flatMap(([k, it]) => [sheetItem(k, it.qty)].concat(adjExtras(itemOf(splitAdj(k).base), splitAdj(k).codes).map(c => ({name: EXTRA[c].name, qty: it.qty, sauces: []}))))}});
  (DEMO ? demoServer().then(d => d.post(JSON.parse(body))) : fetch(CONFIG.orderUrl, {method: 'POST', headers: {'Content-Type': 'text/plain;charset=utf-8'}, body, signal: ctl && ctl.signal})
    .then(r => r.json())).then(res => {
      done();
      if (res && res.ok) return sentOrder(res.num, msg);
      // the shop said no: say why when it's something the customer can fix, otherwise offer WhatsApp
      const e = String(res && res.error || '');
      if (/not available/.test(e)) return fail('Some items are not available right now. Please remove them and send again.');
      if (/^(Too many|We are very busy|Please)/.test(e)) return fail(e);
      if (/app key|Unknown action/i.test(e)) return viaWhatsApp(msg);   // the shop's script doesn't take website orders yet: WhatsApp, as before
      offer();
    }).catch(() => { done(); offer() });
};
// Many people think the order is sent once WhatsApp opens, so remind them to press send there
let pendingUrl = null;
$('#goWhatsApp').onclick = () => {
  $('#sendModal').classList.remove('open');
  const w = window.open(pendingUrl, '_blank');
  if (!w) location.href = pendingUrl;   // popup blocked (e.g. Instagram / Facebook in-app browser)
};
$('#backSend').onclick = () => { $('#sendModal').classList.remove('open'); $('.send').focus({preventScroll: true}) };

/* ---------- section navigation ---------- */
$$('.pill').forEach(btn => btn.onclick = () => document.getElementById(btn.dataset.target).scrollIntoView({behavior: 'smooth'}));
const secs = $$('section'), navEl = $('.nav');
function spy() {
  let cur = secs[0];
  secs.forEach(sec => { if (!sec.hidden && sec.getBoundingClientRect().top <= 110) cur = sec });
  if (innerHeight + scrollY >= document.body.scrollHeight - 4) cur = secs[secs.length - 1];
  $$('.pill').forEach(p => {
    const on = p.dataset.target === cur.id;
    if (on && !p.classList.contains('active')) {
      const pr = p.getBoundingClientRect(), nr = navEl.getBoundingClientRect();
      navEl.scrollBy({left: pr.left + pr.width / 2 - (nr.left + nr.width / 2), behavior: 'smooth'});
    }
    p.classList.toggle('active', on);
  });
}
addEventListener('scroll', spy, {passive: true});

