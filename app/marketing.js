/* ---------- marketing: links to share or copy ----------
   On top the digital menu and the A3 print menus, then the Drive folders (print, stories, videos, product photos,
   brand), each a link to copy. Approved designs reach Drive by themselves (autoCopy in AutoCopy.gs, every hour). */
var BRAND_DOC = 'https://docs.google.com/document/d/1lMnkcyG8Bqlgfk4NDgfgmmrKdpoi_uYrUHM_UFs9GsI/edit';
// [icon, Arabic, English, link, Arabic note, English note]
var MK_LINKS = [
  ['🖨', 'المنيو A3', 'A3 menu', SITE + 'assets/print/menu-a3.pdf', 'للطباعة، PDF', 'For printing, PDF']];
var MK_FOLDERS = [
  ['📄', 'المنيو المطبوع', 'Print menus', DRIVE + '1s_Eap5z10Y85fMtv1NrMoYnqbuJpyohQ', 'منيو، فلايرز', 'Menus, flyers'],
  ['📲', 'الستوريات', 'Stories', DRIVE + '1r_mRypOu2Spw6jLlydOMfnjcWTuLJTzp', 'ستوريات وبوستات', 'Stories and posts'],
  ['🎬', 'الفيديوهات', 'Videos', DRIVE + '1iQqlCTVLk6DHYGuT-rYIE6Ye3T1Ai4A6', '', ''],
  ['🍗', 'صور الأصناف', 'Product photos', DRIVE + '1aq-gpsuNhII9uaaYYsRF_rNcz_hXYHbk', 'صورة لكل صنف', 'One photo per item'],
  ['🎨', 'دليل الهوية', 'Brand guidelines', BRAND_DOC, 'الألوان، الخطوط، طريقة الكلام', 'Colours, fonts, voice'],
  ['🟩', 'اللوغو وملفات الهوية', 'Logos & brand files', DRIVE + '1Gxub86ScNlnYfbhwqAl2bJRP4xRIGIMS', '', '']];
var mkTile = function (x) { return hubTile(x[0], bi(x[1], x[2]), x[4] ? bi(x[4], x[5]) : '', x[3]) };

function showMarket() { drawMarket() }
function drawMarket() {
  var h = '<div class="shead"><h2 class="display">' + bi('الماركتنغ', 'Marketing') + '</h2></div>' +
    '<div class="hgrid mklinks">' +
    hubTile('📱', bi('المنيو الرقمي', 'Digital menu'), bi('ابعتو للزباين', 'Send it to customers'), SITE).replace('<button class="hcopy"', '<button class="hcopy" data-mkshare="' + SITE + '"') +
    MK_LINKS.map(mkTile).join('') + '</div>' +
    '<div class="hgroup"><h3 class="display">' + bi('بالدرايف', 'In Drive') + '</h3><div class="hgrid">' + MK_FOLDERS.map(mkTile).join('') + '</div></div>';
  $('#market').innerHTML = h;
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
});

/* ---------- the chef's stock for today: coming next ---------- */
function showStock() {
  $('#stock').innerHTML = '<div class="shead"><h2 class="display">' + bi('مخزون اليوم', 'Today\'s stock') + '</h2></div>' +
    '<div class="card"><p>' + bi('قريباً: كل يوم الصبح بتعدّو شو في بالبرّاد (كريسبي، زنجر، صوصات، خبز…)، والتطبيق بيقلّكن شو لازم تحضّرو، وبينبّه الكاشير لما شي يخلص.',
      'Coming next: each morning you count what is in the fridge (crispy, zinger, sauces, bread…), the app tells you what to prepare, and warns the cashier when something runs low.') + '</p>' +
    '<button class="ghost" data-view-go="rec">' + bi('شوف الوصفات', 'See the recipes') + '</button></div>';
}
$('#stock').addEventListener('click', function (e) { var b = e.target.closest('[data-view-go]'); if (b) showView(b.dataset.viewGo) });
