# El Bash app

Served by GitHub Pages at https://hananekalakesh.github.io/BachaSnackOrder/app/ and installable on the home screen:

- `index.html`: the cashier app (new order, today's orders). With `?app=manage` (or `manage.html`) it is the
  management app instead (sales, expenses, orders), with its own home-screen icon (`manage.webmanifest`).
- `kitchen.html`: the kitchen screen.
- `core.js`: shared by all of them. `sw.js` keeps a copy on the iPad so the app opens without internet; unsent
  changes wait in an outbox (core.js).
- `demo.js`: add `?demo` to any link (app, manage, kitchen, the menu website) to try everything on a pretend sheet
  kept on that device, with the real menu and made-up orders. It runs `Code.gs` itself in the browser; nothing
  reaches the real sheet.

`Code.gs` is the Apps Script behind the El Bash – Orders & Sales sheet. It reads the tabs, adds, changes or removes
rows (protected by the app key in the Settings tab), and takes orders from the menu website. All the shop's rules
live in core.js and the screens, so most changes don't need the Apps Script pasted again. Changes the deployed
script can't take yet (e.g. a new tab) wait on the iPad until it is updated.
