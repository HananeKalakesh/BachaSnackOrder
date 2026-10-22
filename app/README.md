# El Bash app

Served by GitHub Pages at https://hananekalakesh.github.io/BachaSnackOrder/app/ and installable on the home screen:

- `index.html`: the app, one link for every device. The first time, it asks who uses the device and remembers it
  (switched from the top bar): Cashier (new order, today's orders in stages, `cashier.js`: the Menu tab to switch items
  off and the busy mode for the website), Kitchen (opens `kitchen.html`), Chef (today's stock, recipes without costs),
  Marketing (`marketing.js`: the El Bash Drive folder's photos and videos, shared to WhatsApp stories), Management (PIN:
  sales, expenses, other income in `income.js`: money from before the app and capital) or Developer (PIN: `hub.js` home with every link and file, `recipes.js` with costs).
  `manage.html` and `?app=manage` open Management, `?role=…` the others. `assets.json` lists the website files the
  script copies into Drive (menu photos named by item, logos).
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

The website's opening hours, day off and open-anyway dates are rows of the Settings tab ("Opening hours", "Closed day",
"Open anyway on"). Change them there or in the app (Management › Website); `menu_()` in `Code.gs`
sends them to the website with the menu. `assets/docs/packaging/` holds the box photos shown in the Packaging tab of
the costing worksheet.
