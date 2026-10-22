/**
 * Copies the approved materials into the El Bash Drive folder by itself, every hour, so nobody taps
 * "Copy to Drive". It copies what app/assets.json lists (copyAssets_ in Code.gs), new files only.
 * Add this as a second script file next to Code.gs, then run startAutoCopy once from the editor
 * (choose startAutoCopy next to Run) and allow it when Google asks.
 */
function startAutoCopy() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'autoCopy') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('autoCopy').timeBased().everyHours(1).create();
  var r = copyAssets_();
  Logger.log('All set: approved files copy to Drive every hour. Just now: ' + r.added + ' new, ' + r.kept + ' already there.');
}

function autoCopy() {
  copyAssets_();
}
