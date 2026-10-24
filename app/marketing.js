/* ---------- marketing: share the stories, videos and menu photos in the El Bash Drive folder ----------
   On top the digital menu, then the A3 print menus as pictures (shared like the stories, with the PDF for printing). Then the stories, videos and menu photos from Drive as pictures: tap one,
   then Share, and the device's share menu opens with the file, where WhatsApp › My status posts it as a story. (A web
   page can't open the WhatsApp status screen itself; the share menu is the way in.) Then links to the other folders.
   Approved designs reach Drive by themselves (autoCopy in AutoCopy.gs, every hour). */
var MK = {files: null, err: '', open: null, ready: null, busy: false};
var BRAND_DOC = 'https://docs.google.com/document/d/1lMnkcyG8Bqlgfk4NDgfgmmrKdpoi_uYrUHM_UFs9GsI/edit';
function thumb(id, w) { return 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(id) + '&sz=w' + (w || 400) }
// The printed A3 menus, from this website: shown and shared as pictures, with the PDF for printing
var MK_PRINT = [['a3-ar', 'Menu A3 – Arabic', 'menu-a3-ar'], ['a3-en', 'Menu A3 – English', 'menu-a3-en']].map(function (m) {
  return {id: m[0], name: m[1] + '.png', type: 'image/png', src: SITE + 'assets/print/' + m[2] + '.png', pdf: SITE + 'assets/print/' + m[2] + '.pdf'};
});
function mkFile(id) {
  var r = MK.files || EB.cachedFiles(), hit = MK_PRINT.filter(function (x) { return x.id === id })[0] || null;
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
    (media ? '<span class="mkimg"><img loading="lazy" alt="" src="' + (x.src || thumb(x.id)) + '" onerror="this.parentNode.classList.add(\'noimg\')">' + (video ? '<span class="mkplay">▶</span>' : '') + '</span>'
      : '<span class="mkimg noimg"><span class="mkicon">' + fileIcon(x.type) + '</span></span>') +
    '<small>' + esc(x.name) + '</small></button>';
}

// The folders shown as pictures, in order: stories and posts, videos, menu photos. The others only as links.
var MK_SHOW = [/stor|social/i, /video/i, /menu photo/i];
function drawMarket() {
  var r = MK.files || EB.cachedFiles();
  var h = '<div class="shead"><h2 class="display">' + bi('الماركتنغ', 'Marketing') + '</h2></div>' +
    '<div class="hgrid mklinks">' +
    hubTile('📱', bi('المنيو الرقمي', 'Digital menu'), bi('ابعتو للزباين', 'Send it to customers'), SITE).replace('<button class="hcopy"', '<button class="hcopy" data-mkshare="' + SITE + '"') +
    '</div>' +
    '<div class="hgroup"><h3 class="display">' + bi('المنيو A3', 'A3 menu') + '</h3><div class="mkgrid wide">' + MK_PRINT.map(mkCard).join('') + '</div></div>' +
    '<p class="mkhow">' + bi('اكبس على صورة أو فيديو، بعدين «شارك» واختار واتساب › الحالة. هيك بتنزل ستوري.', 'Tap a photo or video, then Share, and pick WhatsApp › My status to post it as a story.') + '</p>';
  if (MK.err === 'OFFLINE') h += '<p class="offline">' + bi('ما في إنترنت: هيدي الملفات من آخر مرة.', 'No internet: these are the files from last time.') + '</p>';
  var shown = function (name) { return MK_SHOW.some(function (re) { return re.test(name) }) };
  if (!r || !r.folders) {
    h += MK.err && MK.err !== 'OFFLINE' ? '<p class="err xhint" dir="ltr">Drive: ' + esc(MK.err) + '</p>' : '<p class="muted">' + bi('عم يحمّل…', 'Loading…') + '</p>';
  } else {
    MK_SHOW.forEach(function (re) {
      r.folders.filter(function (f) { return f.name && re.test(f.name) }).forEach(function (f) {
        h += '<div class="hgroup"><h3 class="display">' + folderLabel(f.name) + ' <a class="hlink" href="' + esc(f.url) + '" target="_blank" rel="noopener">' + bi('افتح ↗', 'Open ↗') + '</a></h3>' +
          (f.files.length ? '<div class="mkgrid' + (/stor|social/i.test(f.name) ? ' tall' : '') + '">' + f.files.map(mkCard).join('') + '</div>' : '<p class="muted">' + bi('لسا فاضي', 'Empty for now') + '</p>') + '</div>';
      });
    });
  }
  // the rest: links to Drive only
  h += '<div class="hgroup"><h3 class="display">' + bi('روابط الدرايف', 'Drive links') + '</h3><div class="hgrid">' +
    DRIVE_FOLDERS.filter(function (f) { return !shown(f[1]) }).map(function (f) { return hubTile('📁', folderLabel(f[1]), '', DRIVE + f[0]) }).join('') +
    hubTile('🎨', bi('دليل الهوية', 'Brand guidelines'), bi('الألوان، الخطوط، طريقة الكلام', 'Colours, fonts, voice'), BRAND_DOC) + '</div></div>';
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
    (media ? '<img class="mkbig" alt="" src="' + (x.src || thumb(x.id, 1200)) + '">' + (/^video\//.test(x.type) ? '<div class="mkvid">▶ ' + bi('فيديو', 'Video') + '</div>' : '') : '<div class="mkbig noimg">' + fileIcon(x.type) + '</div>') +
    '<p class="mkname">' + esc(x.name) + '</p>' +
    (big ? '<p class="err xhint">' + bi('الفيديو أكبر من 16MB: واتساب ممكن ما يقبلو بالحالة.', 'Over 16 MB: WhatsApp may not take it as a status.') + '</p>' : '') +
    (!ready ? '<button class="save" data-mkget="' + esc(x.id) + '"' + (MK.busy ? ' disabled' : '') + '>' + (MK.busy ? bi('عم يحضّر…', 'Getting it ready…') : bi('جهّز للمشاركة', 'Get it ready to share')) + '</button>'
      : canShare ? '<button class="save mkgo" data-mkgo="1">📲 ' + bi('شارك (واتساب › الحالة)', 'Share (WhatsApp › My status)') + '</button>'
      : '<a class="save mkgo" download="' + esc(x.name) + '" href="' + URL.createObjectURL(file) + '">⬇ ' + bi('نزّل', 'Save') + '</a><p class="muted xhint">' +
        bi('هالجهاز ما بيقدر يشارك ملفات من المتصفح. نزّلو وانشرو من الصور.', 'This device can\'t share files from the browser. Save it, then post it from Photos.') + '</p>') +
    (x.pdf ? '<div class="mkmore"><a class="ghost" href="' + esc(x.pdf) + '" target="_blank" rel="noopener">🖨 ' + bi('PDF للطباعة', 'PDF for printing') + '</a></div></div></div>'
      : '<div class="mkmore"><a class="ghost" href="' + esc(x.url) + '" target="_blank" rel="noopener">' + bi('افتح بالدرايف', 'Open in Drive') + '</a>' +
    '<button class="ghost" data-hcopy="' + esc(x.url) + '">' + bi('انسخ الرابط', 'Copy link') + '</button></div></div></div>');
}

$('#market').addEventListener('click', function (ev) {
  var b = ev.target.closest('button'); if (!b) return;
  if (b.dataset.mkshare) {
    if (navigator.share) navigator.share({title: 'El Bash', text: T('منيو الباش، اطلب أونلاين من هون', 'El Bash menu: order online here'), url: b.dataset.mkshare}).catch(function () {});
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
    var id = b.dataset.mkget, pr = MK_PRINT.filter(function (x) { return x.id === id })[0];
    // the A3 menus come from this website; the rest from Drive through the sheet's script
    (pr ? fetch(pr.src).then(function (r) { if (!r.ok) throw new Error(r.status); return r.blob() }).then(function (bl) { return new File([bl], pr.name, {type: pr.type}) }) : EB.file(id)).then(function (f) { MK.busy = false; MK.ready = {id: id, file: f}; drawMarket() }, function (e) {
      MK.busy = false; drawMarket(); alert(T('ما قدرنا نجيب الملف: ', 'Could not get the file: ') + e.message);
    });
    return;
  }
  if (b.dataset.mkgo) {
    // straight from the tap, so the device allows the share menu
    navigator.share({files: [MK.ready.file]}).catch(function (e) { if (e && e.name !== 'AbortError') alert(e.message) });
  }
});

/* the chef's stock for today: stock.js */
