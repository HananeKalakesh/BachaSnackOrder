/* ---------- marketing: the photos, videos, stories, logos and menus in the El Bash Drive folder, ready to share ----------
   Tap a photo or video, then Share: the device's share menu opens with the file, where WhatsApp › My status posts it as a
   story. (A web page can't open the WhatsApp status screen itself; the share menu is the way in.) */
var MK = {files: null, err: '', open: null, ready: null, busy: false, copy: ''};
var BRAND_DOC = 'https://docs.google.com/document/d/1lMnkcyG8Bqlgfk4NDgfgmmrKdpoi_uYrUHM_UFs9GsI/edit';
function thumb(id, w) { return 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(id) + '&sz=w' + (w || 400) }
function mkFile(id) {
  var r = MK.files || EB.cachedFiles(), hit = null;
  (r && r.folders || []).forEach(function (f) { f.files.forEach(function (x) { if (x.id === id) hit = x }) });
  return hit;
}

function showMarket() {
  drawMarket();
  EB.files().then(function (r) { MK.files = r; MK.err = ''; drawMarket() }, function (e) {
    MK.err = e.offline && !/answer properly/.test(e.message) ? 'OFFLINE' : e.message; drawMarket();
  });
}

function mkCard(x) {
  var media = /^(image|video)\//.test(x.type), video = /^video\//.test(x.type);
  return '<button class="mkcard" data-mk="' + esc(x.id) + '">' +
    (media ? '<span class="mkimg"><img loading="lazy" alt="" src="' + thumb(x.id) + '" onerror="this.parentNode.classList.add(\'noimg\')">' + (video ? '<span class="mkplay">▶</span>' : '') + '</span>'
      : '<span class="mkimg noimg"><span class="mkicon">' + fileIcon(x.type) + '</span></span>') +
    '<small>' + esc(x.name) + '</small></button>';
}

function drawMarket() {
  var r = MK.files || EB.cachedFiles(), menu = SITE;
  var h = '<div class="shead"><h2 class="display">' + bi('الماركتنغ', 'Marketing') + '</h2></div>' +
    '<p class="mkhow">' + bi('اكبس على صورة أو فيديو، بعدين «شارك» واختار واتساب › الحالة. هيك بتنزل ستوري.', 'Tap a photo or video, then Share, and pick WhatsApp › My status to post it as a story.') + '</p>' +
    '<div class="hgrid mklinks">' +
    hubTile('📱', bi('المنيو الرقمي', 'Digital menu'), bi('ابعتو للزباين', 'Send it to customers'), menu).replace('<button class="hcopy"', '<button class="hcopy" data-mkshare="' + menu + '"') +
    hubTile('🎨', bi('دليل الهوية', 'Brand guidelines'), bi('الألوان، الخطوط، اللوغو، طريقة الكلام', 'Colours, fonts, logo, voice'), BRAND_DOC) +
    hubTile('📁', bi('كل الملفات بالدرايف', 'All files in Drive'), bi('زيد صور وفيديوهات هون', 'Add photos and videos here'), DRIVE + DRIVE_FOLDERS[0][0]) + '</div>';
  if (MK.err === 'OFFLINE') h += '<p class="offline">' + bi('ما في إنترنت: هيدي الملفات من آخر مرة.', 'No internet: these are the files from last time.') + '</p>';
  if (!r || !r.folders) {
    h += (MK.err && MK.err !== 'OFFLINE' ? '<p class="err xhint" dir="ltr">Drive: ' + esc(MK.err) + '</p>' : '<p class="muted">' + bi('عم يحمّل…', 'Loading…') + '</p>') +
      '<div class="hgrid">' + DRIVE_FOLDERS.slice(1).map(function (f) { return hubTile('📁', folderLabel(f[1]), '', DRIVE + f[0]) }).join('') + '</div>';
  } else {
    // stories and videos first, then photos, then the rest
    var rank = function (n) { return /video|social|stor/i.test(n) ? 0 : /photo/i.test(n) ? 1 : /menu|print/i.test(n) ? 2 : 3 };
    r.folders.filter(function (f) { return f.files.length }).sort(function (a, b) { return rank(a.name) - rank(b.name) || (a.name < b.name ? -1 : 1) }).forEach(function (f) {
      h += '<div class="hgroup"><h3 class="display">' + (f.name ? folderLabel(f.name) : bi('بالمجلد الرئيسي', 'In the main folder')) +
        ' <a class="hlink" href="' + esc(f.url) + '" target="_blank" rel="noopener">' + bi('افتح ↗', 'Open ↗') + '</a></h3><div class="mkgrid">' + f.files.map(mkCard).join('') + '</div></div>';
    });
    var empty = r.folders.filter(function (f) { return f.name && !f.files.length });
    if (empty.length) h += '<div class="hgroup"><h3 class="display">' + bi('مجلدات فاضية', 'Empty folders') + '</h3><div class="hgrid">' +
      empty.map(function (f) { return hubTile('📁', folderLabel(f.name), bi('زيد ملفات', 'Add files'), f.url) }).join('') + '</div></div>';
  }
  h += '<div class="card mkcopy"><b>' + bi('صور الأصناف واللوغو من الموقع', 'Menu photos and logos from the website') + '</b><p class="muted xhint">' +
    bi('بينسخ صور الأصناف (كل صورة باسم الصنف) واللوغو على الدرايف. بس الجديد، فيك تكبسو كل ما زدنا صور.', 'Copies the menu item photos (each named after its item) and the logos into Drive. Only new ones, so tap it whenever photos are added.') + '</p>' +
    '<button class="ghost" id="mkCopy"' + (MK.copy === 'busy' ? ' disabled' : '') + '>' + (MK.copy === 'busy' ? bi('عم ينسخ… (دقيقة)', 'Copying… (a minute)') : bi('انسخ عالدرايف', 'Copy to Drive')) + '</button>' +
    (MK.copy && MK.copy !== 'busy' ? '<p class="xhint">' + MK.copy + '</p>' : '') + '</div>';
  if (MK.open) h += mkSheet(mkFile(MK.open));
  $('#market').innerHTML = h;
}

// One file: a big preview, and Share (once the file is on the device)
function mkSheet(x) {
  if (!x) return '';
  var media = /^(image|video)\//.test(x.type), ready = MK.ready && MK.ready.id === x.id, file = ready && MK.ready.file;
  var canShare = !!(file && navigator.canShare && navigator.canShare({files: [file]}));
  var big = x.size > 16 * 1024 * 1024 && /^video\//.test(x.type);
  return '<div class="mksheet" id="mkSheet"><div class="mkbox">' +
    '<button class="mkclose" data-mkclose="1" aria-label="' + T('سكّر', 'Close') + '">✕</button>' +
    (media ? '<img class="mkbig" alt="" src="' + thumb(x.id, 1200) + '">' + (/^video\//.test(x.type) ? '<div class="mkvid">▶ ' + bi('فيديو', 'Video') + '</div>' : '') : '<div class="mkbig noimg">' + fileIcon(x.type) + '</div>') +
    '<p class="mkname">' + esc(x.name) + '</p>' +
    (big ? '<p class="err xhint">' + bi('الفيديو أكبر من 16MB: واتساب ممكن ما يقبلو بالحالة.', 'Over 16 MB: WhatsApp may not take it as a status.') + '</p>' : '') +
    (!ready ? '<button class="save" data-mkget="' + esc(x.id) + '"' + (MK.busy ? ' disabled' : '') + '>' + (MK.busy ? bi('عم يحضّر…', 'Getting it ready…') : bi('جهّز للمشاركة', 'Get it ready to share')) + '</button>'
      : canShare ? '<button class="save mkgo" data-mkgo="1">📲 ' + bi('شارك (واتساب › الحالة)', 'Share (WhatsApp › My status)') + '</button>'
      : '<a class="save mkgo" download="' + esc(x.name) + '" href="' + URL.createObjectURL(file) + '">⬇ ' + bi('نزّل', 'Save') + '</a><p class="muted xhint">' +
        bi('هالجهاز ما بيقدر يشارك ملفات من المتصفح. نزّلو وانشرو من الصور.', 'This device can\'t share files from the browser. Save it, then post it from Photos.') + '</p>') +
    '<div class="mkmore"><a class="ghost" href="' + esc(x.url) + '" target="_blank" rel="noopener">' + bi('افتح بالدرايف', 'Open in Drive') + '</a>' +
    '<button class="ghost" data-hcopy="' + esc(x.url) + '">' + bi('انسخ الرابط', 'Copy link') + '</button></div></div></div>';
}

$('#market').addEventListener('click', function (ev) {
  var b = ev.target.closest('button'); if (!b) return;
  if (b.dataset.mkshare) {
    if (navigator.share) navigator.share({title: 'El Bash', text: T('منيو الباش، اطلب عالواتساب', 'El Bash menu, order on WhatsApp'), url: b.dataset.mkshare}).catch(function () {});
    else prompt(T('انسخ الرابط', 'Copy the link'), b.dataset.mkshare);
    return;
  }
  if (b.dataset.hcopy) {
    var url = b.dataset.hcopy;
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(function () { toast('انسخ الرابط', 'Link copied') }, function () { prompt(T('انسخ الرابط', 'Copy the link'), url) });
    else prompt(T('انسخ الرابط', 'Copy the link'), url);
    return;
  }
  if (b.dataset.mk) { MK.open = b.dataset.mk; if (!(MK.ready && MK.ready.id === MK.open)) MK.ready = null; return drawMarket() }
  if (b.dataset.mkclose) { MK.open = null; return drawMarket() }
  if (b.dataset.mkget) {
    MK.busy = true; drawMarket();
    var id = b.dataset.mkget;
    EB.file(id).then(function (f) { MK.busy = false; MK.ready = {id: id, file: f}; drawMarket() }, function (e) {
      MK.busy = false; drawMarket(); alert(T('ما قدرنا نجيب الملف: ', 'Could not get the file: ') + e.message);
    });
    return;
  }
  if (b.dataset.mkgo) {
    // straight from the tap, so the device allows the share menu
    navigator.share({files: [MK.ready.file]}).catch(function (e) { if (e && e.name !== 'AbortError') alert(e.message) });
    return;
  }
  if (b.id === 'mkCopy') {
    MK.copy = 'busy'; drawMarket();
    EB.copyAssets().then(function (r) {
      MK.copy = bi('انسخ ' + r.added + ' ملف جديد' + (r.kept ? '، و' + r.kept + ' كانو موجودين' : ''), r.added + ' new files copied' + (r.kept ? ', ' + r.kept + ' were already there' : ''));
      showMarket();
    }, function (e) { MK.copy = '<span class="err" dir="ltr">' + esc(e.message) + '</span>'; drawMarket() });
  }
});

/* ---------- the chef's stock for today: coming next ---------- */
function showStock() {
  $('#stock').innerHTML = '<div class="shead"><h2 class="display">' + bi('مخزون اليوم', 'Today\'s stock') + '</h2></div>' +
    '<div class="card"><p>' + bi('قريباً: كل يوم الصبح بتعدّو شو في بالبرّاد (كريسبي، زنجر، صوصات، خبز…)، والتطبيق بيقلّكن شو لازم تحضّرو، وبينبّه الكاشير لما شي يخلص.',
      'Coming next: each morning you count what is in the fridge (crispy, zinger, sauces, bread…), the app tells you what to prepare, and warns the cashier when something runs low.') + '</p>' +
    '<button class="ghost" data-view-go="rec">' + bi('شوف الوصفات', 'See the recipes') + '</button></div>';
}
$('#stock').addEventListener('click', function (e) { var b = e.target.closest('[data-view-go]'); if (b) showView(b.dataset.viewGo) });
