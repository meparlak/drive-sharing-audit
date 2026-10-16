/**
 * Drive Sharing Audit
 * https://github.com/meparlak/drive-sharing-audit  (MIT License)
 *
 * 1) sharingReport()   → Writes every file and folder you own that is shared by link or with specific people
 *                         to a new Google Sheet called "Sharing Report". Changes nothing.
 * 2) removeSelected()  → Removes sharing from the rows ticked in the "REMOVE" column of that report
 *                         (link access and people are removed, the item becomes "only me"). Ownership is unchanged.
 *
 * Requires: left menu "Services" (+) → "Drive API" → version v3 → Add.
 */

const REPORT_NAME = 'Sharing Report';
const ROOT_NAME = 'My Drive';   // How the root folder is shown in folder paths
const TIME_ZONE = Session.getScriptTimeZone();
const HEADERS = ['REMOVE', 'Type', 'Name', 'Folder path', 'Link access', 'Link role',
                 'Shared with', 'People', 'Open', 'Result', 'id', 'permissionIds'];

function sharingReport() {
  const rootId = DriveApp.getRootFolder().getId();
  const items = {};           // id -> {name, parent, isFolder}
  const shared = [];
  let pageToken = null;

  do {
    const response = Drive.Files.list({
      q: "'me' in owners and trashed = false",
      pageSize: 1000,
      pageToken: pageToken,
      fields: 'nextPageToken, files(id, name, mimeType, parents, shared, webViewLink, ' +
              'permissions(id, type, role, emailAddress, domain, displayName, allowFileDiscovery))'
    });
    (response.files || []).forEach(f => {
      items[f.id] = {name: f.name, parent: (f.parents || [])[0],
                     isFolder: f.mimeType === 'application/vnd.google-apps.folder'};
      const permissions = (f.permissions || []).filter(p => p.role !== 'owner');
      if (f.shared || permissions.length) shared.push({f: f, permissions: permissions});
    });
    pageToken = response.nextPageToken;
  } while (pageToken);

  const pathOf = id => {
    const parts = [];
    let p = items[id] && items[id].parent;
    for (let i = 0; p && i < 20; i++) {
      if (p === rootId) { parts.unshift(ROOT_NAME); break; }
      if (!items[p]) { parts.unshift("(someone else's folder)"); break; }
      parts.unshift(items[p].name);
      p = items[p].parent;
    }
    return parts.join(' / ');
  };

  const ROLE = {reader: 'Viewer', commenter: 'Commenter', writer: 'Editor', fileOrganizer: 'Editor'};
  const rows = shared.map(({f, permissions}) => {
    const link = permissions.find(p => p.type === 'anyone') || permissions.find(p => p.type === 'domain');
    const people = permissions.filter(p => p.type === 'user' || p.type === 'group');
    return [
      false,
      items[f.id].isFolder ? 'Folder' : 'File',
      f.name,
      pathOf(f.id),
      !link ? '—' : link.type === 'anyone'
        ? (link.allowFileDiscovery ? 'Public on the web' : 'Anyone with the link')
        : 'Organization: ' + link.domain,
      link ? (ROLE[link.role] || link.role) : '—',
      people.map(p => (p.emailAddress || p.displayName) + ' (' + (ROLE[p.role] || p.role) + ')').join(', '),
      people.length,
      f.webViewLink,
      '',
      f.id,
      JSON.stringify(permissions.map(p => p.id))
    ];
  });

  // Folders first, then items shared by link, then by path
  rows.sort((a, b) => (a[1] === b[1] ? 0 : a[1] === 'Folder' ? -1 : 1) ||
                      (a[4] === b[4] ? 0 : a[4] === '—' ? 1 : -1) ||
                      (a[3] + a[2]).localeCompare(b[3] + b[2]));

  const ss = SpreadsheetApp.create(REPORT_NAME + ' ' + Utilities.formatDate(new Date(), TIME_ZONE, 'yyyy-MM-dd HH:mm'));
  const sh = ss.getSheets()[0];
  sh.setName('Report');
  sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold').setBackground('#DDEBF7');
  if (rows.length) {
    sh.getRange(2, 1, rows.length, HEADERS.length).setValues(rows);
    sh.getRange(2, 1, rows.length, 1).insertCheckboxes();
  }
  sh.setFrozenRows(1);
  sh.hideColumns(11, 2);
  sh.setColumnWidth(1, 70); sh.setColumnWidth(3, 260); sh.setColumnWidth(4, 380);
  sh.setColumnWidth(5, 190); sh.setColumnWidth(7, 360); sh.setColumnWidth(10, 220);
  if (rows.length) sh.getRange(1, 1, rows.length + 1, HEADERS.length).createFilter();

  const summary = ss.insertSheet('Summary');
  const byLink = rows.filter(r => r[4] !== '—').length;
  const withPeople = rows.filter(r => r[7] > 0).length;
  const perPerson = {};
  rows.forEach(r => r[6] && r[6].split(', ').forEach(entry => {
    const who = entry.replace(/ \(.*\)$/, ''); perPerson[who] = (perPerson[who] || 0) + 1;
  }));
  summary.getRange(1, 1, 4, 2).setValues([
    ['Shared items', rows.length],
    ['Shared by link', byLink],
    ['Shared with specific people', withPeople],
    ['Items scanned (owned by you)', Object.keys(items).length]]);
  summary.getRange(6, 1, 1, 2).setValues([['Person / email', 'Items they can access']]).setFontWeight('bold');
  const list = Object.entries(perPerson).sort((a, b) => b[1] - a[1]);
  if (list.length) summary.getRange(7, 1, list.length, 2).setValues(list);
  summary.autoResizeColumns(1, 2);

  PropertiesService.getUserProperties().setProperty('SHARING_REPORT_ID', ss.getId());
  Logger.log('Report ready: ' + ss.getUrl() + '  |  shared items: ' + rows.length);
}

function removeSelected() {
  const id = PropertiesService.getUserProperties().getProperty('SHARING_REPORT_ID');
  if (!id) throw new Error('Run sharingReport() first.');
  const sh = SpreadsheetApp.openById(id).getSheetByName('Report');
  const n = sh.getLastRow() - 1;
  if (n < 1) return;
  const data = sh.getRange(2, 1, n, HEADERS.length).getValues();
  const started = Date.now();
  let removed = 0;

  // Folders first: removing access from a folder also removes the access its contents inherited.
  const order = data.map((r, i) => i).sort((a, b) => (data[a][1] === 'Folder' ? 0 : 1) - (data[b][1] === 'Folder' ? 0 : 1));
  for (const i of order) {
    const r = data[i];
    if (r[0] !== true || String(r[9]).startsWith('Removed')) continue;
    if (Date.now() - started > 5 * 60 * 1000) {
      Logger.log('Time limit reached; run removeSelected() again for the remaining rows.');
      break;
    }
    const errors = [];
    JSON.parse(r[11] || '[]').forEach(permissionId => {
      try {
        Drive.Permissions.remove(r[10], permissionId);
      } catch (e) {
        if (!/not ?found|404/i.test(String(e))) errors.push(String(e.message || e).slice(0, 120));
      }
    });
    const result = errors.length ? 'Error: ' + errors.join(' | ')
                                 : 'Removed ' + Utilities.formatDate(new Date(), TIME_ZONE, 'yyyy-MM-dd HH:mm');
    sh.getRange(i + 2, 10).setValue(result);
    if (!errors.length) removed++;
  }
  Logger.log('Items made private: ' + removed);
}
