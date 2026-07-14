// PWI Website — Form Handler
// Deploy as Web App: Execute as Me, Who has access: Anyone
// After edits: Deploy > Manage deployments > Edit > New version > Deploy

var SHEET_TABS = {
  contact: 'Contact',
  quote: 'Quotes',
  newsletter: 'Newsletter'
};

var HEADERS = {
  contact: ['Timestamp', 'Name', 'Email', 'Phone', 'Company', 'Inquiry Type', 'Product', 'Heard About', 'Message'],
  quote: ['Timestamp', 'Name', 'Email', 'Phone', 'Company', 'Aircraft Model', 'Aircraft S/N', 'Product', 'Heard About', 'Message'],
  newsletter: ['Timestamp', 'Name', 'Email', 'Phone', 'Interests']
};

var INTEREST_LABELS = {
  'king-air-led': 'King Air LED Lighting',
  'led-lighting-system': 'LED Lighting, Other Aircraft',
  'led-ice-light': 'LED Ice Light',
  'led-reading-lights': 'LED Reading Lights',
  'fluorescent-lights': 'Fluorescent Lights',
  'coil-windings': 'Coil Windings',
  'engineering': 'Engineering Services',
  'magnetometers': 'Magnetometers'
};

var LOGO_URL = 'https://pwi-e.com/images/PWI-Color-Logo-2022-Dec-01-e1671049599525.png';

function doPost(e) {
  try {
    var p = (e && e.parameter) || {};

    if (p.website && p.website.length > 0) {
      return respond({ result: 'success' }, p);
    }

    var type = p.form_type || 'unknown';
    var validationError = validateSubmission(type, p);
    if (validationError) {
      return respond({ result: 'error', message: validationError }, p);
    }
    var subject, badge, details, row;

    if (type === 'contact') {
      subject = '[PWI Contact] ' + (p.inquiry_type || 'General Inquiry') + suffix(p.name, p.company);
      badge = 'Contact';
      details = [
        ['Inquiry Type', p.inquiry_type], ['Product', p.product],
        ['Heard About', p.hear_about]
      ];
      row = [now(), p.name || '', p.email || '', p.phone || '', p.company || '',
        p.inquiry_type || '', p.product || '', p.hear_about || '', p.message || ''];
      appendRow('contact', row);
      MailApp.sendEmail({
        to: 'sales@pwi-e.com', subject: subject,
        body: plainBody(p, details), htmlBody: htmlBody(p, badge, details),
        replyTo: p.email || ''
      });

    } else if (type === 'quote') {
      subject = '[PWI Quote Request] ' + (p.product || 'Product Inquiry') +
        (p.aircraft_model ? ' \u2014 ' + p.aircraft_model : '') + suffix(p.name, p.company);
      badge = 'Quote';
      details = [
        ['Aircraft Model', p.aircraft_model], ['Aircraft S/N', p.aircraft_serial],
        ['Product', p.product], ['Heard About', p.hear_about]
      ];
      row = [now(), p.name || '', p.email || '', p.phone || '', p.company || '',
        p.aircraft_model || '', p.aircraft_serial || '', p.product || '',
        p.hear_about || '', p.message || ''];
      appendRow('quote', row);
      MailApp.sendEmail({
        to: 'sales@pwi-e.com', subject: subject,
        body: plainBody(p, details), htmlBody: htmlBody(p, badge, details),
        replyTo: p.email || ''
      });

    } else if (type === 'newsletter') {
      var interestKeys = formatInterestKeys(p, e);
      var interestLabels = interestKeys.map(function (k) { return INTEREST_LABELS[k] || k; });
      var interestsText = interestLabels.join(', ');

      subject = '[PWI Newsletter] New signup \u2014 ' + (p.name || p.email || 'Unknown');
      badge = 'Newsletter';
      details = [['Interests', interestsText || 'None selected']];
      row = [now(), p.name || '', p.email || '', p.phone || '', interestsText || ''];
      appendRow('newsletter', row);

      MailApp.sendEmail({
        to: 'sales@pwi-e.com', subject: subject,
        body: plainBody(p, details), htmlBody: htmlBody(p, badge, details),
        replyTo: p.email || ''
      });

      if (p.email) {
        MailApp.sendEmail({
          to: p.email,
          subject: 'Welcome to PWI \u2014 you\u2019re on the list',
          body: welcomePlainBody(p, interestLabels),
          htmlBody: welcomeHtmlBody(p, interestLabels),
          replyTo: 'sales@pwi-e.com'
        });
      }

    } else {
      return respond({ result: 'error', message: 'Unknown form type' }, p);
    }

    return respond({ result: 'success' }, p);

  } catch (err) {
    return respond({ result: 'error', message: err.toString() }, (e && e.parameter) || {});
  }
}

function validateSubmission(type, p) {
  var requiredByType = {
    contact: ['name', 'email', 'phone', 'company', 'inquiry_type', 'message'],
    quote: ['name', 'email', 'phone', 'company', 'product', 'message'],
    newsletter: ['name', 'email']
  };
  var required = requiredByType[type];
  if (!required) return 'Unknown form type';

  for (var i = 0; i < required.length; i += 1) {
    if (!String(p[required[i]] || '').trim()) {
      return 'Please complete all required fields.';
    }
  }

  var email = String(p.email || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'Please enter a valid email address.';
  }

  if ((type === 'contact' || type === 'quote') &&
      !/^[0-9()+\-.\sx]{7,}$/i.test(String(p.phone || '').trim())) {
    return 'Please enter a valid phone number.';
  }

  return '';
}

function suffix(name, company) {
  if (!name && !company) return '';
  var who = name || '';
  if (company) who += (who ? ' (' + company + ')' : company);
  return ' \u2014 ' + who;
}

function plainBody(p, details) {
  var lines = details.map(function (f) { return f[0] + ': ' + (f[1] || '\u2014'); });
  return lines.join('\n') + '\n\nMessage:\n' + (p.message || '\u2014');
}

function logoHtml() {
  return '<div style="padding:16px 20px 8px;">' +
    '<img src="' + LOGO_URL + '" alt="PWI" style="height:36px;width:auto;display:block;">' +
  '</div>';
}

function htmlBody(p, badge, details) {
  var initial = esc((p.name || p.email || '?').trim().charAt(0).toUpperCase());
  var who = esc(p.name || 'Unknown') + (p.company ? ' \u2014 ' + esc(p.company) : '');
  var reach = [p.email ? esc(p.email) : '', p.phone ? esc(p.phone) : '']
    .filter(String).join(' &middot; ');

  var cells = details.map(function (d) {
    return '<td width="50%" style="padding:7px 10px 7px 0;vertical-align:top;">' +
      '<p style="margin:0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#94a3b8;">' + esc(d[0]) + '</p>' +
      '<p style="margin:2px 0 0;font-size:14px;color:' + (d[1] ? '#0f172a' : '#cbd5e1') + ';">' +
        (d[1] ? esc(d[1]) : '\u2014') + '</p></td>';
  });
  var detailRows = '';
  for (var i = 0; i < cells.length; i += 2) {
    detailRows += '<tr>' + cells[i] + (cells[i + 1] || '<td width="50%"></td>') + '</tr>';
  }

  return '' +
  '<div style="margin:0;padding:24px;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">' +
    '<div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e2e8f0;">' +
      logoHtml() +
      '<table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">' +
        '<tr>' +
          '<td style="padding:16px 0 16px 20px;width:42px;">' +
            '<div style="width:42px;height:42px;border-radius:50%;background:#0d1e40;color:#93c5fd;text-align:center;line-height:42px;font-size:16px;font-weight:700;">' + initial + '</div>' +
          '</td>' +
          '<td style="padding:16px 12px;">' +
            '<p style="margin:0;font-size:15px;font-weight:700;color:#0f172a;">' + who + '</p>' +
            '<p style="margin:2px 0 0;font-size:13px;color:#1d4ed8;">' + (reach || '\u2014') + '</p>' +
          '</td>' +
          '<td style="padding:16px 20px 16px 0;text-align:right;vertical-align:top;white-space:nowrap;">' +
            '<span style="background:#dbeafe;color:#1e40af;font-size:11px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;padding:4px 10px;border-radius:9999px;">' + esc(badge) + '</span>' +
          '</td>' +
        '</tr>' +
      '</table>' +
      '<div style="border-top:1px solid #e2e8f0;padding:12px 20px;">' +
        '<table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">' + detailRows + '</table>' +
      '</div>' +
      (p.message
        ? '<div style="padding:0 20px 16px;">' +
            '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:10px 12px;font-size:14px;color:#0f172a;white-space:pre-wrap;">' + esc(p.message) + '</div>' +
          '</div>'
        : '') +
      '<div style="padding:10px 20px;background:#f8fafc;border-top:1px solid #e2e8f0;">' +
        '<p style="margin:0;font-size:12px;color:#94a3b8;">Reply to this email to respond directly to the customer. Submission logged to the PWI Forms spreadsheet.</p>' +
      '</div>' +
    '</div>' +
  '</div>';
}

function welcomePlainBody(p, interestLabels) {
  var name = p.name || 'there';
  var interests = interestLabels.length ? interestLabels.join(', ') : 'None selected';
  return 'Welcome, ' + name + '.\n\n' +
    'Thanks for signing up. You will hear from PWI when we release new products, publish STC updates, or run a promotion.\n\n' +
    'Interests: ' + interests + '\n\n' +
    'Need something sooner? Reach our team at sales@pwi-e.com or request a quote at pwi-e.com.\n\n' +
    '---\nYou are receiving this because you signed up at pwi-e.com.\n' +
    'To unsubscribe, visit https://pwi-e.com/privacy-statement.html#privacy-request';
}

function welcomeHtmlBody(p, interestLabels) {
  var name = esc(p.name || 'there');
  var pills = interestLabels.map(function (label) {
    return '<span style="background:#eff6ff;color:#1e40af;font-size:12.5px;padding:5px 11px;border-radius:9999px;border:1px solid #dbeafe;display:inline-block;margin:0 6px 6px 0;">' + esc(label) + '</span>';
  }).join('');

  var initial = esc(name.charAt(0).toUpperCase());

  return '' +
  '<div style="margin:0;padding:24px;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">' +
    '<div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e2e8f0;">' +
      logoHtml() +
      '<table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">' +
        '<tr>' +
          '<td style="padding:16px 0 16px 20px;width:42px;">' +
            '<div style="width:42px;height:42px;border-radius:50%;background:#0d1e40;color:#93c5fd;text-align:center;line-height:42px;font-size:16px;font-weight:700;">' + initial + '</div>' +
          '</td>' +
          '<td style="padding:16px 12px;">' +
            '<p style="margin:0;font-size:15px;font-weight:700;color:#0f172a;">Welcome, ' + name + '</p>' +
            '<p style="margin:2px 0 0;font-size:13px;color:#1d4ed8;">' + esc(p.email || '') + '</p>' +
          '</td>' +
          '<td style="padding:16px 20px 16px 0;text-align:right;vertical-align:top;white-space:nowrap;">' +
            '<span style="background:#dbeafe;color:#1e40af;font-size:11px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;padding:4px 10px;border-radius:9999px;">Subscribed</span>' +
          '</td>' +
        '</tr>' +
      '</table>' +

      (pills
        ? '<div style="border-top:1px solid #e2e8f0;padding:14px 20px;">' +
            '<p style="margin:0 0 8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#94a3b8;">Interests</p>' +
            '<div>' + pills + '</div>' +
          '</div>'
        : '') +

      '<div style="padding:16px 20px 0;">' +
        '<div style="background:#f8fafc;border:1px solid #e2e8f0;padding:12px 14px;font-size:14px;color:#0f172a;">You\u2019ll hear from us on new product releases, STC updates, and promotions &mdash; nothing else.</div>' +
      '</div>' +

      '<div style="padding:16px 20px 0;">' +
        '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px 18px;">' +
          '<p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#0f172a;">Need something sooner?</p>' +
          '<p style="margin:0;font-size:13px;line-height:1.5;color:#64748b;">Reach our team any time at <a href="mailto:sales@pwi-e.com" style="color:#1d4ed8;text-decoration:none;">sales@pwi-e.com</a> or request a quote directly on our site.</p>' +
        '</div>' +
      '</div>' +

      '<div style="padding:16px 20px;text-align:center;">' +
        '<a href="https://pwi-e.com" style="display:inline-block;background:#1e4ed8;color:#ffffff;font-size:12px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;text-decoration:none;padding:11px 26px;border-radius:9999px;">Visit pwi-e.com</a>' +
      '</div>' +

      '<div style="padding:10px 20px;background:#f8fafc;border-top:1px solid #e2e8f0;">' +
        '<p style="margin:0;font-size:12px;color:#94a3b8;">You\u2019re receiving this because you signed up at pwi-e.com. <a href="https://pwi-e.com/privacy-statement.html#privacy-request" style="color:#94a3b8;text-decoration:underline;">Unsubscribe</a> &middot; <a href="https://pwi-e.com/privacy-statement.html" style="color:#94a3b8;text-decoration:underline;">Privacy Statement</a></p>' +
      '</div>' +
    '</div>' +
  '</div>';
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function doOptions() {
  return ContentService.createTextOutput('').setMimeType(ContentService.MimeType.TEXT);
}

function appendRow(type, row) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return;
  var sheet = ss.getSheetByName(SHEET_TABS[type]);
  if (!sheet) sheet = ss.insertSheet(SHEET_TABS[type]);
  if (sheet.getLastRow() === 0) sheet.appendRow(HEADERS[type]);
  sheet.appendRow(row);
}

function formatInterestKeys(p, e) {
  if (p.interests) return String(p.interests).split(',').map(function (s) { return s.trim(); });
  var vals = e.parameters['interests[]'];
  if (vals && vals.length) return vals;
  return [];
}

function now() {
  return new Date().toISOString();
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/** AJAX (fetch) clients get JSON; native form POSTs get a thank-you HTML page. */
function respond(obj, p) {
  if (p && String(p.ajax || '') === '1') return json(obj);
  return thankYouPage(obj);
}

function thankYouPage(obj) {
  var ok = obj && obj.result === 'success';
  var title = ok ? 'Thank you' : 'Something went wrong';
  var message = ok
    ? 'Your submission was received. We\u2019ll be in touch shortly.'
    : (obj && obj.message) || 'Please try again or email sales@pwi-e.com.';
  var html =
    '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<title>' + esc(title) + ' — PWI, Inc.</title>' +
    '<style>body{margin:0;font-family:system-ui,-apple-system,Segoe UI,sans-serif;background:#0b1b3a;color:#e2e8f0;}' +
    '.wrap{max-width:480px;margin:12vh auto;padding:2rem;background:#fff;color:#0f172a;border-radius:12px;}' +
    'h1{margin:0 0 .5rem;font-size:1.5rem;font-weight:600;}p{margin:0 0 1.25rem;line-height:1.5;color:#475569;}' +
    'a{display:inline-block;background:#1e4ed8;color:#fff;text-decoration:none;padding:.75rem 1.25rem;border-radius:9999px;font-size:.75rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;}</style></head><body>' +
    '<div class="wrap"><h1>' + esc(title) + '</h1><p>' + esc(message) + '</p>' +
    '<a href="https://pwi-e.com/">Back to pwi-e.com</a></div></body></html>';
  return HtmlService.createHtmlOutput(html)
    .setTitle(title + ' — PWI, Inc.')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
