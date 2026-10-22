# El Bash: notes for Claude

The shop's website and app live here (see `app/README.md`). Its files and materials live in the **El Bash** folder in
Google Drive (`1emJrOfqaE3bP1RGid38uyHoYBuPlB76R`), which has a "Read me – what goes where" doc.

## Rule: materials go to the El Bash Drive folder only when the owner says to save them

When you create a material (a WhatsApp story or post, a menu, a flyer, a price list, a costing or recipe sheet,
a document, a photo or video edit…), send it to the owner to approve and **don't save it to Drive yet**. Save it only
when the owner says so ("save these to Drive"), so Drive holds only approved final versions, without copies or older
versions. When you save a newer version of something already in Drive (e.g. the A3 menu), move the older one to the
trash so only the new one is left. Save it to the right sub-folder of the El Bash folder and give the owner the Drive
link or say where it is:

| Sub-folder | What goes there |
|---|---|
| 1 Menus & print (`1s_Eap5z10Y85fMtv1NrMoYnqbuJpyohQ`) | menus, flyers, anything printed |
| 2 Social media & stories (`1r_mRypOu2Spw6jLlydOMfnjcWTuLJTzp`) | WhatsApp / Instagram stories and posts |
| 3 Brand & logos (`1Gxub86ScNlnYfbhwqAl2bJRP4xRIGIMS`) | logos, brand files |
| 5 Recipes & documents (`1_xdtMvb3CjPqzxq_rFLHayz9v4PYNwZO`) | recipes, costing, documents, sheets |
| 6 Menu photos (`1aq-gpsuNhII9uaaYYsRF_rNcz_hXYHbk`) | product photos: one per menu item |
| 7 Videos (`1iQqlCTVLk6DHYGuT-rYIE6Ye3T1Ai4A6`) | videos |

How:
- **Docs, sheets, text:** create them directly in the sub-folder with the Google Drive / Docs / Sheets connector.
- **Images and other files** (too big for the connector): commit the file to this repo (stories in `assets/stories/`, print menus in `assets/print/`,
  with the HTML it was rendered from), and add it to `app/assets.json` under `"drive"`, keyed by the sub-folder's exact
  name. Once the branch is merged and live, the script copies it into that sub-folder by itself within the hour
  (`autoCopy` in `app/AutoCopy.gs`, an hourly trigger, runs `copyAssets_` in `app/Code.gs`); there is no button to tap.
  It copies everything listed there that Drive doesn't have yet, so list a file under `"drive"` only once the owner
  has approved saving it. It skips a name Drive already has: to replace a file, trash the old one in Drive first
  (Drive connector `trash_file`). Check Drive within the hour and tell the owner when it's there.
- Name files so they read well in Drive, e.g. `Story – new hours (1-4 PM, 6-11 PM).png`.

## Rule: marketing materials send people to the website, not WhatsApp

Stories, posts, flyers and menus never mention WhatsApp: they say to order online from the menu and give the phone
number only for calls. Printed materials show the address (`hananekalakesh.github.io/BachaSnackOrder`) and a QR code.
Stories and posts don't show the address: the owner pastes the link under them, so they say "الرابط تحت · Link below". The website itself keeps
WhatsApp: after an order is sent, the customer sends it on WhatsApp too, so the shop can track it and talk to them.

## Rule: Arabic first, English as the second language

Materials (stories, posts, menus, flyers) are built in Arabic, with English as the smaller second line. A catchy title
or slogan may lead in English when an Arabic line goes with it. Never make a page that is only in English, and never
make a separate English copy of an Arabic material: one design carries both languages.
