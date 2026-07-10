// PWI Website — Form Handler
// Deploy as: Web App > Execute as: Me > Who has access: Anyone
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

function doPost(e) {
  try {
    var p = e.parameter;

    if (p.website && p.website.length > 0) {
      return json({ result: 'success' });
    }

    var type = p.form_type || 'unknown';
    var subject, body, row;

    if (type === 'contact') {
      subject = '[PWI Contact] ' + (p.inquiry_type || 'General Inquiry') + ' — ' + (p.name || 'Unknown');
      body = buildEmail([
        header('CONTACT FORM'),
        section('Contact', [
          line('Name', p.name),
          line('Email', p.email),
          line('Phone', p.phone),
          line('Company', p.company)
        ]),
        section('Inquiry', [
          line('Type', p.inquiry_type),
          line('Product / part', p.product)
        ]),
        section('Message', [
          block(p.message)
        ]),
        section('Source', [
          line('How they heard about PWI', p.hear_about)
        ])
      ]);
      row = [
        now(),
        p.name || '',
        p.email || '',
        p.phone || '',
        p.company || '',
        p.inquiry_type || '',
        p.product || '',
        p.hear_about || '',
        p.message || ''
      ];
      appendRow('contact', row);

    } else if (type === 'quote') {
      subject = '[PWI Quote] ' + (p.product || 'Product inquiry') + ' — ' + (p.name || 'Unknown');
      body = buildEmail([
        header('QUOTE REQUEST'),
        section('Contact', [
          line('Name', p.name),
          line('Email', p.email),
          line('Phone', p.phone),
          line('Company', p.company)
        ]),
        section('Aircraft & product', [
          line('Aircraft model', p.aircraft_model),
          line('Aircraft serial number', p.aircraft_serial),
          line('Product / part', p.product)
        ]),
        section('Message', [
          block(p.message)
        ]),
        section('Source', [
          line('How they heard about PWI', p.hear_about)
        ])
      ]);
      row = [
        now(),
        p.name || '',
        p.email || '',
        p.phone || '',
        p.company || '',
        p.aircraft_model || '',
        p.aircraft_serial || '',
        p.product || '',
        p.hear_about || '',
        p.message || ''
      ];
      appendRow('quote', row);

    } else if (type === 'newsletter') {
      var interests = formatInterests(p, e);
      subject = '[PWI Newsletter] ' + (p.name || 'New signup');
      body = buildEmail([
        header('NEWSLETTER SIGNUP'),
        section('Subscriber', [
          line('Name', p.name),
          line('Email', p.email),
          line('Phone', p.phone)
        ]),
        section('Interests', [
          block(interests || 'None selected')
        ])
      ]);
      row = [
        now(),
        p.name || '',
        p.email || '',
        p.phone || '',
        interests || ''
      ];
      appendRow('newsletter', row);

    } else {
      return json({ result: 'error', message: 'Unknown form type' });
    }

    MailApp.sendEmail({
      to: 'sales@pwi-e.com',
      subject: subject,
      body: body,
      replyTo: p.email || ''
    });

    return json({ result: 'success' });

  } catch (err) {
    return json({ result: 'error', message: err.toString() });
  }
}

function buildEmail(parts) {
  return parts.filter(function (p) { return p; }).join('\n\n');
}

function header(title) {
  return title + '\n' + submittedAt();
}

function submittedAt() {
  return 'Submitted: ' + Utilities.formatDate(new Date(), 'America/Chicago', 'MMM d, yyyy h:mm a z');
}

function section(title, lines) {
  var content = lines.filter(function (l) { return l; }).join('\n');
  if (!content) return '';
  return title.toUpperCase() + '\n' + rule() + '\n' + content;
}

function rule() {
  return '----------------------------------------';
}

function line(label, value) {
  var v = clean(value);
  if (!v) return '';
  return label + ': ' + v;
}

function block(value) {
  return clean(value) || '(none)';
}

function clean(value) {
  return value ? String(value).trim() : '';
}

function doOptions() {
  return ContentService.createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT);
}

function appendRow(type, row) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return;
  var tabName = SHEET_TABS[type];
  var sheet = ss.getSheetByName(tabName);
  if (!sheet) sheet = ss.insertSheet(tabName);
  if (sheet.getLastRow() === 0) sheet.appendRow(HEADERS[type]);
  sheet.appendRow(row);
}

function formatInterests(p, e) {
  if (p.interests) return String(p.interests).split(',').join(', ');
  var vals = e.parameters['interests[]'];
  if (vals && vals.length) return vals.join(', ');
  return '';
}

function now() {
  return new Date().toISOString();
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
