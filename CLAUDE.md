# El Bash: notes for Claude

The shop's website and app live here (see `app/README.md`). Its files and materials live in the **El Bash** folder in
Google Drive (`1emJrOfqaE3bP1RGid38uyHoYBuPlB76R`), which has a "Read me – what goes where" doc.

## Rule: every material you make is saved to the El Bash Drive folder

Whenever you create a material (a WhatsApp story or post, a menu, a flyer, a price list, a costing or recipe sheet,
a document, a photo or video edit…), save it to the right sub-folder of the El Bash folder, in the same task, and give
the owner the Drive link or say where it is:

| Sub-folder | What goes there |
|---|---|
| 1 Menus & print (`1s_Eap5z10Y85fMtv1NrMoYnqbuJpyohQ`) | menus, flyers, anything printed |
| 2 Social media & stories (`1r_mRypOu2Spw6jLlydOMfnjcWTuLJTzp`) | WhatsApp / Instagram stories and posts |
| 3 Brand & logos (`1Gxub86ScNlnYfbhwqAl2bJRP4xRIGIMS`) | logos, brand files |
| 4 Photos (`1-6ueNQhNUrjlI9ZTnvaO5Iv90151_2tx`) | photos |
| 5 Recipes & documents (`1_xdtMvb3CjPqzxq_rFLHayz9v4PYNwZO`) | recipes, costing, documents, sheets |
| 6 Menu photos (`1aq-gpsuNhII9uaaYYsRF_rNcz_hXYHbk`) | one photo per menu item |
| 7 Videos (`1iQqlCTVLk6DHYGuT-rYIE6Ye3T1Ai4A6`) | videos |

How:
- **Docs, sheets, text:** create them directly in the sub-folder with the Google Drive / Docs / Sheets connector.
- **Images and other files** (too big for the connector): commit the file to this repo (stories in `assets/stories/`,
  with the HTML it was rendered from), and add it to `app/assets.json` under `"drive"`, keyed by the sub-folder's exact
  name. Once the branch is merged and live, **Marketing › Copy to Drive** in the app copies it into that sub-folder
  (`copyAssets_` in `app/Code.gs`). Tell the owner to tap it, and also send them the file directly.
- Name files so they read well in Drive, e.g. `Story – new hours (1-4 PM, 6-11 PM).png`.
