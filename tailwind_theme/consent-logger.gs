/**
 * Consent Logging — Google Apps Script Web App
 *
 * SETUP:
 * 1. Open the Consent logs Google Sheet.
 * 2. Extensions -> Apps Script.
 * 3. Replace the script with this file.
 * 4. Deploy -> Manage deployments -> Edit -> New version -> Deploy
 *    (or New deployment: Web app, Execute as Me, Who has access: Anyone)
 * 5. Paste the Web App URL into tailwind_theme/privacy-config.js as logEndpoint.
 *
 * Each consent event appends one row:
 * Timestamp | Page | Analytics | Marketing
 *
 * Run deleteExtraColumnsOnce() once from the Apps Script editor to remove
 * any leftover columns E/F from an older logger version.
 */
function ensureHeaders(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Timestamp', 'Page', 'Analytics', 'Marketing']);
  }
}

function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = JSON.parse(e.postData.contents);

  ensureHeaders(sheet);

  sheet.appendRow([
    data.timestamp || new Date().toISOString(),
    data.page || '',
    !!data.analytics,
    !!data.marketing
  ]);

  return ContentService.createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doOptions() {
  return ContentService.createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT);
}

/** Run once from the editor (Run → deleteExtraColumnsOnce) to drop columns E+. */
function deleteExtraColumnsOnce() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var lastCol = sheet.getLastColumn();
  if (lastCol > 4) {
    sheet.deleteColumns(5, lastCol - 4);
  }
}
