/* ---------- home (developer): the links to everything the app is built from ----------
   Marketing uses the Drive folders, file icons and link tiles below too. */
var SITE = 'https://hananekalakesh.github.io/BachaSnackOrder/';
var HUB_FIXED = [
  ['⚙️', 'Apps Script', 'Apps Script', 'https://script.google.com/home', 'السكريبت اللي بيربط التطبيق بالشيت', 'The script linking the app to the sheet'],
  ['🐙', 'GitHub', 'GitHub', 'https://github.com/HananeKalakesh/BachaSnackOrder', 'كود الموقع والتطبيق', 'The website and app code'],
  ['🧮', 'شيت الكلفة', 'Costing sheet', 'https://docs.google.com/spreadsheets/d/1xIpuEHK0kfOqg6WFGBV-SBCLakFRj4bH0v4AjPa9Qlg/edit', 'الأسعار، الوصفات، كلفة كل صنف', 'Prices, recipes, what each item costs'],
  ['📗', 'شيت الطلبات والمبيعات', 'Orders & Sales sheet', 'https://docs.google.com/spreadsheets/d/1c286Sjxb7svai2OF6fjNIKaPnI3dt7JhKH78UDtvdgI/edit', 'كل البيانات', 'All the data'],
  ['📁', 'غوغل درايف', 'Google Drive', 'https://drive.google.com/drive/folders/1emJrOfqaE3bP1RGid38uyHoYBuPlB76R', 'مجلد El Bash', 'The El Bash folder'],
  ['🧪', 'تجربة', 'Demo', SITE + 'app/?demo', 'جرّب كل شي بدون ما يوصل عالشيت', 'Try everything, nothing reaches the sheet'],
  ['🎨', 'دليل الهوية', 'Brand guidelines', 'https://docs.google.com/document/d/1lMnkcyG8Bqlgfk4NDgfgmmrKdpoi_uYrUHM_UFs9GsI/edit', 'الألوان، الخطوط، اللوغو، طريقة الكلام', 'Colours, fonts, logo, voice'],
  ['✨', 'نظام التصميم', 'Design system', 'https://claude.ai/artifact/8pLbbZdLV1TekzQr6oJkJD', 'El Bash v4', 'El Bash v4'],
  ['📱', 'المنيو عالموقع', 'Website menu', SITE, 'اللي بيطلبو منو الزباين', 'Where customers order']
];
// The El Bash folder in Google Drive; until the script lists it, these folder links are shown
var DRIVE = 'https://drive.google.com/drive/folders/';
var DRIVE_FOLDERS = [['1emJrOfqaE3bP1RGid38uyHoYBuPlB76R', 'El Bash'], ['1s_Eap5z10Y85fMtv1NrMoYnqbuJpyohQ', '1 Menus & print'],
  ['1r_mRypOu2Spw6jLlydOMfnjcWTuLJTzp', '2 Social media & stories'], ['1Gxub86ScNlnYfbhwqAl2bJRP4xRIGIMS', '3 Brand & logos'],
  ['1_xdtMvb3CjPqzxq_rFLHayz9v4PYNwZO', '5 Recipes & documents'],
  ['1aq-gpsuNhII9uaaYYsRF_rNcz_hXYHbk', '6 Menu photos'], ['1iQqlCTVLk6DHYGuT-rYIE6Ye3T1Ai4A6', '7 Videos']];
var FOLDER_AR = {'El Bash': 'كل الملفات', 'Menus & print': 'المنيو والطباعة', 'Social media & stories': 'سوشال ميديا وستوريات', 'Brand & logos': 'الهوية واللوغو',
  'Photos': 'الصور', 'Recipes & documents': 'الوصفات والمستندات', 'Menu photos': 'صور الأصناف', 'Videos': 'فيديوهات'};
function folderLabel(name) { var n = String(name).replace(/^\d+\s*/, ''); return FOLDER_AR[n] ? bi(FOLDER_AR[n], n) : esc(n) }
function fileIcon(type) {
  return /pdf/.test(type) ? '📄' : /image/.test(type) ? '🖼' : /video/.test(type) ? '🎬' : /spreadsheet|excel/.test(type) ? '📗' :
    /presentation|powerpoint/.test(type) ? '📊' : /document|word|text/.test(type) ? '📝' : /folder/.test(type) ? '📁' : '📎';
}
function ago(t) {
  var d = Math.floor((Date.now() - t) / 864e5);
  return d < 1 ? T('اليوم', 'today') : d < 2 ? T('مبارح', 'yesterday') : d < 31 ? T('من ' + d + ' يوم', d + ' days ago') : new Date(t).toLocaleDateString(lang === 'ar' ? 'ar-LB' : 'en-GB');
}
function showHub() { drawHub() }

function hubTile(icon, name, note, url) {
  var off = !url;
  return '<div class="htile' + (off ? ' off' : '') + '">' + (off ? '<div class="hmain">' : '<a class="hmain" href="' + esc(url) + '" target="_blank" rel="noopener">') +
    '<span class="hicon">' + icon + '</span><span><b>' + name + '</b>' + (note ? '<small>' + note + '</small>' : '') + '</span>' + (off ? '</div>' : '</a>') +
    (off ? '' : '<button class="hcopy" data-hcopy="' + esc(url) + '" aria-label="' + T('انسخ الرابط', 'Copy link') + '">' + bi('نسخ', 'Copy') + '</button>') + '</div>';
}
function drawHub() {
  $('#hub').innerHTML = '<div class="shead"><h2 class="display">' + bi('أهلا بالباش', 'El Bash') + '</h2></div>' +
    '<div class="hgrid">' + HUB_FIXED.map(function (x) { return hubTile(x[0], bi(x[1], x[2]), bi(x[4], x[5]), x[3]) }).join('') + '</div>';
}

$('#hub').addEventListener('click', function (ev) {
  var b = ev.target.closest('button'); if (!b) return;
  if (b.dataset.hcopy) {
    var url = b.dataset.hcopy, ok = function () { toast('انسخ الرابط', 'Link copied') };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(ok, function () { prompt(T('انسخ الرابط', 'Copy the link'), url) });
    else prompt(T('انسخ الرابط', 'Copy the link'), url);
    return;
  }
});
