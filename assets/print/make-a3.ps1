# Makes the printed A3 menu from the Menu tab of the sheet, in one go:
#   powershell -ExecutionPolicy Bypass -File assets\print\make-a3.ps1
# It gets today's menu, lets menu-a3.html fit the text as big as it goes, and saves "Menu A3 – Arabic.pdf" and
# "Menu A3 – Arabic.png" (4963 × 3512) into the El Bash Drive folder, "1 Menus & print", replacing the old ones.
# -Out another folder saves them there instead (to look at them before they go to Drive); -Menu a saved menu (.json,
# as the sheet sends it) instead of today's.
param([string]$Out = "G:\My Drive\El Bash\1 Menus & print", [string]$Menu = '')
$ErrorActionPreference = 'Stop'
$chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$menuUrl = 'https://script.google.com/macros/s/AKfycby7dthEIW4d2EF90fH6-_lGJEK_kAtu0XVSdARQUmM8w4iFEvBIfab-6SR9JdZmWDSdcA/exec?format=menu'
$data = Join-Path $PSScriptRoot 'menu-data.js'
$work = Join-Path $env:TEMP ('elbash-a3-' + [guid]::NewGuid().ToString('N').Substring(0, 8))
New-Item -ItemType Directory -Force $work | Out-Null

# today's menu, next to the page (menu-data.js is not kept: .gitignore)
if ($Menu) { $json = [IO.File]::ReadAllText($Menu, [Text.Encoding]::UTF8) }
else { $json = [Text.Encoding]::UTF8.GetString((New-Object Net.WebClient).DownloadData($menuUrl)) }
if ($json -notmatch '"items"') { throw "The sheet didn't send the menu: $($json.Substring(0, [Math]::Min(200, $json.Length)))" }
[IO.File]::WriteAllText($data, "window.MENU_DATA = $json;", (New-Object Text.UTF8Encoding($false)))

$page = 'file:///' + ((Join-Path $PSScriptRoot 'menu-a3.html') -replace '\\', '/')
$common = @('--headless=new', '--disable-gpu', '--hide-scrollbars', '--disable-extensions', '--log-level=3', "--user-data-dir=$work\profile", '--virtual-time-budget=20000')
try {
  Start-Process $chrome -Wait -ArgumentList ($common + @('--no-pdf-header-footer', "--print-to-pdf=$work\a3.pdf", $page))
  Start-Process $chrome -Wait -ArgumentList ($common + @('--window-size=1587,1123', '--force-device-scale-factor=3.12728', "--screenshot=$work\a3.png", $page))
  foreach ($f in 'a3.pdf', 'a3.png') { if (-not (Test-Path "$work\$f")) { throw "Chrome made no $f" } }
  New-Item -ItemType Directory -Force $Out | Out-Null
  Copy-Item "$work\a3.pdf" (Join-Path $Out 'Menu A3 – Arabic.pdf') -Force
  Copy-Item "$work\a3.png" (Join-Path $Out 'Menu A3 – Arabic.png') -Force
  Write-Output "Saved Menu A3 – Arabic.pdf and .png in $Out"
} finally {
  Remove-Item $data -ErrorAction SilentlyContinue
  Remove-Item $work -Recurse -Force -ErrorAction SilentlyContinue
}
