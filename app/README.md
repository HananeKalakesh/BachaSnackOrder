# El Bash app

Served by GitHub Pages at https://hananekalakesh.github.io/BachaSnackOrder/app/ and installable on the home screen:

- `index.html`: the app, one link for every device. The first time, it asks who uses the device and remembers it
  (switched from the top bar): Cashier (new order, today's orders in stages, not paid today with payment reminders, `cashier.js`: the Menu tab to switch items
  off and the busy mode for the website), Kitchen (opens `kitchen.html`), Chef (today's stock, recipes without costs),
  Marketing (`marketing.js`: the El Bash Drive folder's photos and videos, shared to WhatsApp stories), Management (PIN, three tabs:
  Overview (`overview.js`: money in vs out, profit, where the money goes, month by month; its tiles open the screens), Money in (a switch between Sales, Not paid and Other income, `income.js`: money from before the app and capital) and Money out (expenses)) or Developer (PIN: `hub.js` home with every link and file, `recipes.js` with costs).
  `manage.html` and `?app=manage` open Management, `?role=…` the others. Marketing shows what is in the El Bash
  Drive folder (`files_()` in `Code.gs`); nothing is copied there from this repo.
  The page itself is only the markup: its styles are `app.css`, and each screen its own script: `order.js` (the order
  screen, ticket, saving), `views.js` (switching screens), `sales.js`, `dashboard.js`, `unpaid.js` (today's orders and
  not paid), `device.js` (language, who uses the device), `expenses.js`. A new file goes into `sw.js` FILES too.
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
Photos put in the "6 Menu photos" folder in Drive, named after the item ("Crispy Meal.jpg"), show on the website menu
(`menuPhotos_()` in `Code.gs` shares them by link and sends their ids with the menu; kept 10 minutes).
Item costs and prices are not in the app: Overview links to the El Bash costing worksheet. The sheet's Costs tab
(IMPORTRANGE of the costing worksheet's Menu items) stays for the vault's nightly copy.
