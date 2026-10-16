# Drive Sharing Audit

[Türkçe](README.tr.md) | English

Over the years I shared a lot of files and folders from my Google Drive, and at some point I realized I had no idea who could still open what. Drive has no "shared by me" list; to see who has access to a file you have to open its sharing dialog one by one. This small Google Apps Script solves that in two steps:

1. **Report:** It scans every file and folder you own and writes the ones that are shared by link or with specific people to a Google Sheet, together with who has access and at what level. It does not change anything.
2. **Remove:** It removes sharing from the rows you tick in that sheet, so those files become "only me" again.

The script runs entirely inside your own Google account. No data is sent to any other server and no external libraries are used.

## What the report shows

Columns on the "Report" sheet:

- **REMOVE:** a checkbox for the rows whose sharing you want to remove.
- **Type, Name, Folder path:** what the item is and where it sits in your Drive.
- **Link access:** "Anyone with the link", "Public on the web", "Organization: domain" or "—" (no link sharing).
- **Link role:** Viewer, Commenter or Editor.
- **Shared with:** email addresses and the role of each person.
- **People:** how many people the item is shared with.
- **Open:** the Drive link of the item.
- **Result:** after removal, "Removed" or the error message.

The "Summary" sheet shows the totals and how many items each person can access. Folders are listed first, then items shared by link.

## Setup (once, about 3 minutes)

1. Go to [script.google.com](https://script.google.com) and create a **New project**.
2. Delete the sample code in the editor, paste the contents of [`DriveSharingAudit.gs`](DriveSharingAudit.gs) and save.
3. In the left menu, click **+** next to **Services**, pick **Drive API**, keep version **v3** and click **Add**.

Instead of step 3 you can open **Project Settings → Show "appsscript.json" manifest file in editor** and replace that file with the contents of [`appsscript.json`](appsscript.json). This enables the Drive API as well.

## Usage

### 1. Create the report

1. Select `sharingReport` in the function list at the top and click **Run**.
2. On the first run Google asks for permission: **Review permissions** → choose your account. If you see "Google hasn't verified this app", click **Advanced** → **Go to (project name) (unsafe)** → **Allow**. The warning appears because you created the script yourself.
3. When it finishes, the execution log shows the link to the report. The sheet is created in your Drive as "Sharing Report YYYY-MM-DD HH:MM".

### 2. Remove sharing

1. In the report, tick **REMOVE** for the rows you want to make private. To select all, select the column and press the space bar.
2. Go back to the editor, select `removeSelected` and click **Run**.
3. The **Result** column of each row shows what happened. If there are many rows the script stops after 5 minutes; run it again and it continues where it left off.

## Things to know

- Removing sharing cannot be undone automatically. If you remove someone by mistake you have to share the file with them again. They are not notified; they simply lose access.
- When you remove sharing from a folder, the access that its files inherited from that folder is removed too. This is why the script handles folders first.
- Ownership does not change, and nothing is deleted or moved.
- The report is a snapshot. If you share new files later, run the report again.
- The root folder appears as "My Drive" in the paths. You can change `ROOT_NAME` at the top of the script to match your Drive's language.
- Dates in the report name use the script's time zone. The included `appsscript.json` sets it to Europe/Istanbul; change `timeZone` there or in Project Settings if you are elsewhere.

## How it works

`sharingReport` calls `files.list` from the Drive API v3 to fetch everything you own that is not in the trash, 1000 items per page. The permissions of each item come back in the same call, so even tens of thousands of files are scanned in a few minutes. Items that are marked `shared` or have any permission other than the owner's are written to the report.

`removeSelected` deletes the permission IDs of the ticked rows with `permissions.delete`. Permissions that are already gone (for example removed earlier through a parent folder) are not counted as errors.

## License

[MIT](LICENSE)
