/* ---------- views ---------- */
// Management › Money in holds three screens behind one tab; it reopens the last one used
var IN_SUBS = ['report', 'owed', 'inc'];
function showView(v) {
  if (v === 'in') v = IN_SUBS.indexOf(store('elbash-in')) >= 0 ? store('elbash-in') : 'report';
  var sub = MANAGE && IN_SUBS.indexOf(v) >= 0;
  if (sub) store('elbash-in', v);
  document.querySelectorAll('.tabs button').forEach(function (x) { x.classList.toggle('on', x.dataset.view === v || sub && x.dataset.view === 'report') });
  document.querySelectorAll('.subnav button').forEach(function (x) { x.classList.toggle('on', x.dataset.sub === v) });
  $('#orderView').style.display = v === 'order' ? '' : 'none';
  $('#ordersView').style.display = v === 'orders' ? 'block' : 'none';
  $('#owedView').style.display = v === 'owed' ? 'block' : 'none';
  $('#owedTView').style.display = v === 'owedt' ? 'block' : 'none';
  $('#reportView').style.display = v === 'report' ? 'block' : 'none';
  $('#overView').style.display = v === 'over' ? 'block' : 'none';
  $('#expView').style.display = v === 'exp' ? 'block' : 'none';
  $('#incView').style.display = v === 'inc' ? 'block' : 'none';
  $('#boxView').style.display = v === 'box' ? 'block' : 'none';
  $('#dashView').style.display = v === 'dash' ? 'block' : 'none';
  $('#siteView').style.display = v === 'site' ? 'block' : 'none';
  $('#recView').style.display = v === 'rec' ? 'block' : 'none';
  $('#homeView').style.display = v === 'home' ? 'block' : 'none';
  $('#stockView').style.display = v === 'stock' ? 'block' : 'none';
  $('#marketView').style.display = v === 'market' ? 'block' : 'none';
  $('#availView').style.display = v === 'avail' ? 'block' : 'none';
  if (v === 'orders') { drawOrders(); loadOrders() }
  if (v === 'owed') { drawOwed(); loadOwed() }
  if (v === 'owedt') { drawOwedToday(); loadRecent().then(function () { TD.err = ''; drawOwedToday() }, function (e) { TD.err = e.offline ? 'OFFLINE' : (e.message || String(e)); drawOwedToday() }) }
  if (v === 'report') showReport();
  if (v === 'over') showOverview();
  if (v === 'exp') showExpenses();
  if (v === 'inc') showIncome();
  if (v === 'box') showSandouk();
  if (v === 'dash') showDash();
  if (v === 'site') showWebsite();
  if (v === 'rec') showRecipes();
  if (v === 'home') showHub();
  if (v === 'stock') showStock();
  if (v === 'market') showMarket();
  if (v === 'avail') drawAvail();
}
document.querySelectorAll('.tabs button').forEach(function (b) { b.addEventListener('click', function () { showView(b.dataset.view) }) });
document.querySelectorAll('.subnav button').forEach(function (b) { b.addEventListener('click', function () { showView(b.dataset.sub) }) });

