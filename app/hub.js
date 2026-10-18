/* ---------- home: the management app's first screen, one place with a link to everything the shop uses ----------
   The built-in links are below; the shop's own links (A3 menu, WhatsApp stories, photos…) are added from the screen
   and kept in the sheet's Links tab, so every device sees them. */
var SITE = 'https://hananekalakesh.github.io/BachaSnackOrder/';
var HUB_GROUPS = [['apps', 'التطبيقات', 'Apps'], ['menus', 'المنيو والطباعة', 'Menus & print'], ['social', 'سوشال ميديا', 'Social media'],
  ['brand', 'الهوية واللوغو والصور', 'Brand, logos & photos'], ['data', 'الشيت والإعدادات', 'Sheet & setup'], ['other', 'غير ذلك', 'Other']];
var HUB_FIXED = [
  ['apps', '🧾', 'تطبيق الكاشير', 'Cashier app', SITE + 'app/', 'الطلبات والدفع', 'Orders and payments'],
  ['apps', '📊', 'تطبيق الإدارة', 'Management app', SITE + 'app/manage.html', 'المبيعات، المصاريف، الوصفات', 'Sales, expenses, recipes'],
  ['apps', '👨‍🍳', 'شاشة المطبخ', 'Kitchen screen', '', 'قريباً', 'Coming later'],
  ['apps', '🧪', 'تجربة', 'Demo', SITE + 'app/manage.html?demo', 'جرّب كل شي بدون ما يوصل عالشيت', 'Try everything, nothing reaches the sheet'],
  ['menus', '📱', 'المنيو الرقمي', 'Digital menu', SITE, 'للزباين، مع الطلب عالواتساب', 'For customers, with WhatsApp ordering'],
  ['brand', '🎨', 'دليل الهوية El Bash v4', 'El Bash design system v4', 'https://claude.ai/artifact/8pLbbZdLV1TekzQr6oJkJD', 'الألوان والخطوط', 'Colors and fonts'],
  ['brand', '🟩', 'اللوغو (أخضر)', 'Logo (green)', SITE + 'assets/elbash/noar-green.svg', 'SVG', 'SVG'],
  ['brand', '🔴', 'الطربوش (أحمر وأخضر)', 'Fez (red & green)', SITE + 'assets/elbash/fez-redgreen.svg', 'SVG', 'SVG'],
  ['brand', '⬜', 'الطربوش (فاتح)', 'Fez (paper)', SITE + 'assets/elbash/fez-paper.svg', 'SVG', 'SVG'],
  ['data', '📗', 'شيت الطلبات والمبيعات', 'Orders & Sales sheet', 'https://docs.google.com/spreadsheets/d/1c286Sjxb7svai2OF6fjNIKaPnI3dt7JhKH78UDtvdgI/edit', 'كل البيانات', 'All the data'],
  ['data', '⚙️', 'Apps Script', 'Apps Script', 'https://script.google.com/home', 'السكريبت اللي بيربط التطبيق بالشيت', 'The script linking the app to the sheet'],
  ['data', '🛠', 'صفحة التركيب', 'Setup page', 'https://claude.ai/artifact/4hoVWEBZ71cGS8Hf4rDC2L', 'لصق السكريبت وتركيب الآيباد', 'Pasting the script, setting up iPads']
];
var HUB = {data: null, err: '', adding: false, group: 'menus'};

function hubLinks() {
  var r = HUB.data || EB.cached('links');
  var mine = r ? EB.rows(r.Links).filter(function (x) { return x.Ref && x.Link }).map(function (x) {
    return {key: String(x.Ref), group: String(x.Group || 'other'), name: String(x.Name || ''), note: String(x.Note || ''), url: String(x.Link)};
  }) : [];
  return EB.withPending(mine, r && r.at, 'link');
}

function showHub() {
  drawHub();
  EB.read('links', {'Links': 0}).then(function (r) { HUB.data = r; HUB.err = ''; drawHub() }, function (e) {
    HUB.err = /Unknown tab/.test(e.message) ? 'SCRIPT' : e.offline ? 'OFFLINE' : (e.message || String(e)); drawHub();
  });
}

function hubTile(icon, name, note, url, key) {
  var off = !url;
  return '<div class="htile' + (off ? ' off' : '') + '">' + (off ? '<div class="hmain">' : '<a class="hmain" href="' + esc(url) + '" target="_blank" rel="noopener">') +
    '<span class="hicon">' + icon + '</span><span><b>' + name + '</b>' + (note ? '<small>' + note + '</small>' : '') + '</span>' + (off ? '</div>' : '</a>') +
    (off ? '' : '<button class="hcopy" data-hcopy="' + esc(url) + '" aria-label="' + T('انسخ الرابط', 'Copy link') + '">' + bi('نسخ', 'Copy') + '</button>') +
    (key ? '<button class="del" data-hdel="' + esc(key) + '">' + bi('امسح', 'Delete') + '</button>' : '') + '</div>';
}
function hostOf(url) { try { return new URL(url).hostname.replace(/^www\./, '') } catch (e) { return '' } }

function drawHub() {
  var mine = hubLinks(), h = '<div class="shead"><h2 class="display">' + bi('أهلا بالباش', 'El Bash') + '</h2></div>';
  if (HUB.err === 'SCRIPT') h += '<p class="offline">' + bi('الروابط اللي بتزيدها محفوظة على هالجهاز لهلّق، وبتنبعت عالشيت لحالها بعد تحديث السكريبت.', 'Links you add are kept on this device for now, and go to the sheet once the script is updated.') + '</p>';
  h += HUB_GROUPS.map(function (g) {
    var fixed = HUB_FIXED.filter(function (x) { return x[0] === g[0] }), own = mine.filter(function (x) { return (HUB_GROUPS.some(function (y) { return y[0] === x.group }) ? x.group : 'other') === g[0] });
    if (!fixed.length && !own.length) return '';
    return '<div class="hgroup"><h3 class="display">' + bi(g[1], g[2]) + '</h3><div class="hgrid">' +
      fixed.map(function (x) { return hubTile(x[1], bi(x[2], x[3]), bi(x[5], x[6]), x[4]) }).join('') +
      own.map(function (x) { return hubTile('🔗', esc(x.name), esc(x.note || hostOf(x.url)), x.url, x.key) }).join('') + '</div></div>';
  }).join('');
  h += HUB.adding ? '<div class="card addx"><h3 class="display">' + bi('زيد رابط', 'Add a link') + '</h3><div class="xcats">' +
      HUB_GROUPS.filter(function (g) { return g[0] !== 'apps' }).map(function (g) { return '<button class="xcat' + (HUB.group === g[0] ? ' on' : '') + '" data-hgroup="' + g[0] + '" style="--c:var(--green)">' + bi(g[1], g[2]) + '</button>' }).join('') +
      '</div><div class="xform"><input id="hName" placeholder="' + esc(T('الاسم (مثلاً: منيو A3، ستوري واتساب)', 'Name (e.g. A3 menu, WhatsApp stories)')) + '" maxlength="60">' +
      '<input id="hUrl" type="url" inputmode="url" dir="ltr" placeholder="https://…">' +
      '<input id="hNote" placeholder="' + esc(T('ملاحظة (اختياري)', 'Note (optional)')) + '" maxlength="80" style="grid-column:1/-1">' +
      '<button class="save" id="hSave">' + bi('احفظ الرابط', 'Save link') + '</button><button class="ghost" id="hCancel">' + bi('إلغاء', 'Cancel') + '</button><div class="err" id="hErr"></div></div></div>'
    : '<button class="save radd" id="hAdd">+ ' + bi('زيد رابط (منيو A3، ستوريات، صور…)', 'Add a link (A3 menu, stories, photos…)') + '</button>';
  $('#hub').innerHTML = h;
}

$('#hub').addEventListener('click', function (ev) {
  var b = ev.target.closest('button'); if (!b) return;
  if (b.dataset.hcopy) {
    var url = b.dataset.hcopy, ok = function () { toast('انسخ الرابط', 'Link copied') };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(ok, function () { prompt(T('انسخ الرابط', 'Copy the link'), url) });
    else prompt(T('انسخ الرابط', 'Copy the link'), url);
    return;
  }
  if (b.id === 'hAdd') { HUB.adding = true; drawHub(); $('#hName').focus(); return }
  if (b.id === 'hCancel') { HUB.adding = false; return drawHub() }
  if (b.dataset.hgroup) {
    var keep = {name: $('#hName').value, url: $('#hUrl').value, note: $('#hNote').value};
    HUB.group = b.dataset.hgroup; drawHub(); $('#hName').value = keep.name; $('#hUrl').value = keep.url; $('#hNote').value = keep.note; return;
  }
  if (b.id === 'hSave') {
    var name = $('#hName').value.trim(), link = $('#hUrl').value.trim(), note = $('#hNote').value.trim(), err = function (ar, en) { $('#hErr').innerHTML = bi(ar, en) };
    if (!name) return err('اكتب الاسم', 'Enter a name');
    if (!/^https?:\/\/\S+\.\S+/.test(link)) { if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(link)) link = 'https://' + link; else return err('الرابط لازم يبلّش بـ https://', 'The link should start with https://') }
    var x = {key: 'ln' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), group: HUB.group, name: name, note: note, url: link};
    EB.send([{op: 'append', tab: 'Links', unique: 'Ref', rows: [{'Group': x.group, 'Name': x.name, 'Link': x.url, 'Note': x.note, 'Ref': x.key}]}], {t: 'save', kind: 'link', key: x.key, order: x});
    HUB.adding = false; toast('انحفظ الرابط', 'Link saved'); return drawHub();
  }
  if (b.dataset.hdel) {
    if (!confirm(T('تمسح هالرابط؟', 'Delete this link?'))) return;
    EB.send([{op: 'remove', tab: 'Links', where: {'Ref': b.dataset.hdel}}], {t: 'delete', kind: 'link', key: b.dataset.hdel});
    return drawHub();
  }
});
