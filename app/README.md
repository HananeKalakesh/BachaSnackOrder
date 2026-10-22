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

`AutoCopy.gs` sits next to `Code.gs` in the same Apps Script project: an hourly trigger (set up by running
`startAutoCopy` once) copies the files listed in `assets.json` into the El Bash Drive folder, new ones only.

`Code.gs` is the Apps Script behind the El Bash – Orders & Sales sheet. It reads the tabs, adds, changes or removes
rows (protected by the app key in the Settings tab), and takes orders from the menu website. All the shop's rules
live in core.js and the screens, so most changes don't need the Apps Script pasted again. Changes the deployed
script can't take yet (e.g. a new tab) wait on the iPad until it is updated.

The website's opening hours, day off and open-anyway dates are rows of the Settings tab ("Opening hours", "Closed day",
"Open anyway on"). Change them there or in the app (Management › Website); `menu_()` in `Code.gs`
sends them to the website with the menu. `assets/docs/packaging/` holds the box photos shown in the Packaging tab of
the costing worksheet.
Photos put in the "6 Menu photos" folder in Drive, named after the item ("Crispy Meal.jpg"), show on the website menu
(`menuPhotos_()` in `Code.gs` shares them by link and sends their ids with the menu; kept 10 minutes).
Management › Costs (`costs.js`) shows each item's price, cost, food cost % and profit from the sheet's Costs tab, which
brings in the Menu items tab of the El Bash costing worksheet (IMPORTRANGE).
