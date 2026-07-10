/**
 * Consent Logging — Google Apps Script Web App
 *
 * SETUP:
 * 1. Open a new Google Sheet.
 * 2. Extensions -> Apps Script.
 * 3. Delete the placeholder code and paste this whole file in.
 * 4. Click Deploy -> New deployment -> type "Web app".
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 5. Click Deploy, authorize when prompted, and copy the Web App URL.
 * 6. Paste that URL into tailwind_theme/privacy-config.js as logEndpoint.
 *
 * Each consent event (Accept / Reject / Save Preferences) appends one row:
 * Timestamp (CT) | Page | IP | Analytics | Marketing
 *
 * Times are stored in US Central (America/Chicago) — CST in winter, CDT in summer.
 */
var CENTRAL_TZ = 'America/Chicago';

function centralTime(isoOrMs) {
  var d = isoOrMs ? new Date(isoOrMs) : new Date();
  return Utilities.formatDate(d, CENTRAL_TZ, 'yyyy-MM-dd HH:mm:ss');
}

function sanitizeIp(ip) {
  if (!ip || typeof ip !== 'string') return '';
  ip = ip.trim();
  if (ip.length > 45) return '';
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(ip)) return ip;
  if (/^[0-9a-fA-F:]+$/.test(ip)) return ip;
  return '';
}

function ensureHeaders(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Timestamp (CT)', 'Page', 'IP', 'Analytics', 'Marketing']);
    return;
  }
  var headers = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 4)).getValues()[0];
  if (headers[2] !== 'IP') {
    sheet.insertColumnAfter(2);
    sheet.getRange(1, 3).setValue('IP');
  }
  if (headers[0] === 'Timestamp') {
    sheet.getRange(1, 1).setValue('Timestamp (CT)');
  }
}

function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = JSON.parse(e.postData.contents);

  ensureHeaders(sheet);

  sheet.appendRow([
    centralTime(data.timestamp),
    data.page || '',
    sanitizeIp(data.ip),
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
