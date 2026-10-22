/* ---------- the website's ordering hours (Management) ----------
   Kept in the Settings tab of the sheet (rows "Opening hours", "Closed day", "Open anyway on"), as 12-hour text like
   "1 PM - 4 PM, 6 PM - 11 PM". Changed here or in the sheet; the website reads them each time it opens. */
var WS = {slots: null, locked: false};
var DAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], DAYS_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

// "1 PM - 4 PM, 6:30 PM - 11 PM" (or "13:00-16:00", "1-4 pm") -> [[780, 960], [1110, 1380]] in minutes; null if it doesn't read
function parseHours(text) {
  var hm = function (x, ap) {
    var m = String(x).trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm|ص|م)?$/i); if (!m) return null;
    var h = +m[1], s = (m[3] || ap || '').toLowerCase();
    if ((s === 'pm' || s === 'م') && h < 12) h += 12; if ((s === 'am' || s === 'ص') && h === 12) h = 0;
    return h > 24 || +(m[2] || 0) > 59 ? null : h * 60 + +(m[2] || 0);
  };
  var out = String(text || '').split(/[,،;]+/).filter(function (r) { return r.trim() }).map(function (r) {
    var p = r.split(/\s*[-–—]\s*|\s+to\s+/i), ap = (String(p[1] || '').match(/am|pm|ص|م/i) || [''])[0];
    var a = hm(p[0], ap), b = hm(p[1] || '');
    return a != null && b != null && a < b ? [a, b] : null;
  });
  return out.length && out.every(Boolean) ? out : null;
}
// 780 -> "1 PM", 1110 -> "6:30 PM"
function clock12(m) { var h = Math.floor(m / 60) % 24, mm = m % 60; return (h % 12 || 12) + (mm ? ':' + pad(mm) : '') + (h < 12 ? ' AM' : ' PM') }
function clockAr(m) { var h = Math.floor(m / 60) % 24, mm = m % 60; return (h % 12 || 12) + (mm ? ':' + pad(mm) : '') + (h < 12 ? ' ص' : ' م') }

function showWebsite() {
  if (!SET.loaded) { $('#site').innerHTML = '<p class="muted">' + bi('عم يحمّل…', 'Loading…') + '</p>'; return }
  if (SET.pin && !pinOk()) {
    WS.locked = true; var had = pin(); setPin('');
    return pinScreen(had ? bi('الرمز غلط', 'Wrong PIN') : '', '#site', showWebsite, bi('الموقع', 'Website'));
  }
  WS.locked = false; WS.slots = null;
  drawWebsite();
}
function drawWebsite() {
  if (WS.locked) return;
  if (!WS.slots) WS.slots = parseHours(SET.hours) || [[780, 960], [1080, 1380]];
  var day = DAYS_EN.filter(function (d) { return d.toLowerCase() === String(SET.closedDay || '').toLowerCase() })[0] || '';
  var times = '';   // every half hour, 12-hour clock
  for (var m = 0; m < 24 * 60; m += 30) times += '<option value="' + m + '">' + T(clockAr(m), clock12(m)) + '</option>';
  var pick = function (v, cls) { return '<select class="' + cls + '">' + times.replace('value="' + v + '"', 'value="' + v + '" selected') + '</select>' };
  var h = '<div class="shead"><h2 class="display">' + bi('أوقات الطلب عالموقع', 'Website ordering hours') + '</h2></div>' +
    '<div class="card hrsx"><p class="muted">' + bi('الموقع بيوخدن أول ما حدا يفتحو. فيك كمان تغيّرن بتاب Settings بالشيت.',
      'The website uses them the next time someone opens it. You can also change them in the Settings tab of the sheet.') + '</p>' +
    '<h3 class="display">' + bi('الساعات', 'Hours') + '</h3>' + WS.slots.map(function (sl, i) {
      return '<div class="slot"><span>' + bi('من', 'From') + '</span>' + pick(sl[0], 'sFrom') + '<span>' + bi('لـ', 'to') + '</span>' + pick(sl[1], 'sTo') +
        (WS.slots.length > 1 ? '<button class="del" data-sdel="' + i + '" aria-label="' + T('شيل', 'Remove') + '">✕</button>' : '') + '</div>';
    }).join('') +
    '<button class="ghost" data-sadd="1">+ ' + bi('زيد وقت', 'Add a time') + '</button>' +
    '<div class="xform"><label>' + bi('يوم العطلة', 'Day off') + '<select id="hDay"><option value="">' + T('ولا يوم', 'None') + '</option>' + DAYS_EN.map(function (d, i) {
      return '<option value="' + d + '"' + (d === day ? ' selected' : '') + '>' + T(DAYS_AR[i], d) + '</option>' }).join('') + '</select></label>' +
    '<label>' + bi('فاتحين استثنائياً بـ (تواريخ)', 'Open anyway on (dates)') + '<input id="hDates" dir="ltr" value="' + esc(SET.openDates || '') + '" placeholder="2026-12-25"></label>' +
    '<button class="save" id="hSave">' + bi('احفظ الأوقات', 'Save hours') + '</button><div class="err" id="hErr"></div></div></div>';
  $('#site').innerHTML = h;
}
function readSlots() {
  var f = document.querySelectorAll('#site .sFrom'), t = document.querySelectorAll('#site .sTo');
  WS.slots = Array.prototype.map.call(f, function (x, i) { return [+x.value, +t[i].value] });
}
$('#site').addEventListener('click', function (e) {
  var b = e.target.closest('button'); if (!b || WS.locked) return;
  if (b.dataset.sadd) { readSlots(); var last = WS.slots[WS.slots.length - 1]; WS.slots.push([Math.min(last[1] + 60, 1380), Math.min(last[1] + 180, 1410)]); return drawWebsite() }
  if (b.dataset.sdel) { readSlots(); WS.slots.splice(+b.dataset.sdel, 1); return drawWebsite() }
  if (b.id !== 'hSave') return;
  readSlots();
  var err = function (ar, en) { $('#hErr').innerHTML = bi(ar, en) }, day = $('#hDay').value, dates = $('#hDates').value.trim();
  var sl = WS.slots.slice().sort(function (a, b) { return a[0] - b[0] });
  for (var i = 0; i < sl.length; i++) {
    if (sl[i][0] >= sl[i][1]) return err('وقت الفتح لازم يكون قبل وقت السكّير', 'Each opening time must be before its closing time');
    if (i && sl[i][0] < sl[i - 1][1]) return err('في وقتين فوق بعض', 'Two times overlap');
  }
  if (dates && !/^\s*\d{4}-\d\d-\d\d(\s*,\s*\d{4}-\d\d-\d\d)*\s*$/.test(dates)) return err('اكتب التواريخ متل: 2026-12-25', 'Write the dates like: 2026-12-25');
  var hours = sl.map(function (x) { return clock12(x[0]) + ' - ' + clock12(x[1]) }).join(', ');
  if (hours !== SET.hours) EB.setSetting('hours', hours);
  if (day.toLowerCase() !== String(SET.closedDay || '').toLowerCase()) EB.setSetting('closedDay', day);
  if (dates !== (SET.openDates || '')) EB.setSetting('openDates', dates);
  SET.hours = hours; SET.closedDay = day; SET.openDates = dates; WS.slots = sl;
  toast('انحفظت الأوقات', 'Hours saved');
  drawWebsite();
});
