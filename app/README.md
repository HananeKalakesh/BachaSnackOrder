# El Bash app

The iPad order screen (`index.html`), kitchen screen (`kitchen.html`) and their shared core (`core.js`), served by
GitHub Pages at https://hananekalakesh.github.io/BachaSnackOrder/app/ and installable on the home screen.
`sw.js` keeps a copy on the iPad so the app opens without internet; unsent changes wait in an outbox (core.js).

`Code.gs` is the Apps Script behind the El Bash – Orders & Sales sheet. It only reads the four tabs and adds,
changes or removes rows, protected by the app key in the Settings tab. All the shop's rules live in core.js and the
screens, so changes here don't need the Apps Script pasted again.
