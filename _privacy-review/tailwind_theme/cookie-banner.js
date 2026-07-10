/**
 * PWI Cookie Consent Banner
 * Stores consent in localStorage under key "pwi_cookie_consent"
 * Schema: { version, timestamp, necessary, analytics, marketing }
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'pwi_cookie_consent';
  var POLICY_VERSION = '1.1';
  var cfg = window.PWI_PRIVACY_CONFIG || {};
  var LOG_ENDPOINT = cfg.logEndpoint || '';

  function logConsent(record) {
    if (!LOG_ENDPOINT) return;
    try {
      fetch(LOG_ENDPOINT, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          timestamp: record.timestamp,
          page: location.href,
          analytics: record.analytics,
          marketing: record.marketing
        })
      });
    } catch (e) { /* fire-and-forget */ }
  }

  function getConsent() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch (e) { return null; }
  }

  function saveConsent(analytics, marketing) {
    var record = {
      version: POLICY_VERSION,
      timestamp: new Date().toISOString(),
      necessary: true,
      analytics: !!analytics,
      marketing: !!marketing
    };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(record)); } catch (e) {}
    applyConsent(record);
    logConsent(record);
    return record;
  }

  function applyConsent(record) {
    if (typeof gtag === 'function') {
      gtag('consent', 'update', {
        analytics_storage: record.analytics ? 'granted' : 'denied',
        ad_storage: record.marketing ? 'granted' : 'denied',
        ad_user_data: record.marketing ? 'granted' : 'denied',
        ad_personalization: record.marketing ? 'granted' : 'denied'
      });
    }

    document.dispatchEvent(new CustomEvent('pwi:consent', { detail: record }));
  }

  /* Apply stored consent as early as possible on repeat visits */
  (function applyStoredConsentEarly() {
    var existing = getConsent();
    if (existing && existing.version === POLICY_VERSION) {
      applyConsent(existing);
    }
  })();

  var _stylesInjected = false;
  function injectStyles() {
    if (_stylesInjected) return;
    _stylesInjected = true;
    var style = document.createElement('style');
    style.textContent = [
      '#pwi-cookie-banner{',
        'position:fixed;bottom:1.5rem;left:1.5rem;z-index:9999;',
        'background:#1e293b;color:#e2e8f0;',
        'border-radius:14px;',
        'box-shadow:0 8px 32px rgba(0,0,0,0.45);',
        'padding:20px 20px 18px;',
        'width:min(360px,calc(100vw - 2rem));',
        'font-family:Rubik,system-ui,sans-serif;font-size:14px;',
        'opacity:0;transform:translateY(12px);transition:opacity .35s ease,transform .35s ease;',
      '}',
      '#pwi-cookie-banner.pwi-cb-visible{opacity:1;transform:translateY(0);}',
      '#pwi-cb-close{',
        'position:absolute;top:12px;right:12px;',
        'background:none;border:none;cursor:pointer;',
        'color:#64748b;font-size:18px;line-height:1;padding:2px 6px;',
        'font-family:inherit;transition:color .2s;',
      '}',
      '#pwi-cb-close:hover{color:#e2e8f0;}',
      '#pwi-cb-text{margin-bottom:14px;padding-right:16px;}',
      '#pwi-cb-text p{margin:0;line-height:1.6;color:#cbd5e1;font-size:13.5px;}',
      '#pwi-cb-text a{color:#93c5fd;text-decoration:underline;}',
      '#pwi-cb-actions{display:grid;grid-template-columns:1fr;gap:8px;align-items:stretch;}',
      '#pwi-cb-accept,#pwi-cb-reject{',
        'width:100%;cursor:pointer;border:none;border-radius:999px;',
        'padding:10px 14px;font-size:13px;font-weight:600;white-space:nowrap;',
        'font-family:inherit;transition:background .2s;min-height:44px;',
      '}',
      '#pwi-cb-accept{background:#1e4ed8;color:#fff;}',
      '#pwi-cb-accept:hover{background:#1b46c4;}',
      '#pwi-cb-reject{background:rgba(255,255,255,0.1);color:#e2e8f0;}',
      '#pwi-cb-reject:hover{background:rgba(255,255,255,0.16);}',
      '#pwi-cb-prefs{',
        'justify-self:center;cursor:pointer;border:none;background:none;',
        'color:#93c5fd;font-size:12px;font-family:inherit;font-weight:500;',
        'text-decoration:none;padding:6px 2px 0;transition:color .2s;white-space:nowrap;',
        'min-height:28px;display:inline-flex;align-items:center;justify-content:center;',
      '}',
      '#pwi-cb-prefs:hover{color:#bfdbfe;text-decoration:underline;}',
      '#pwi-pref-overlay{',
        'display:none;position:fixed;inset:0;z-index:10000;',
        'background:rgba(0,0,0,.55);align-items:center;justify-content:center;',
      '}',
      '#pwi-pref-overlay.pwi-pref-open{display:flex;}',
      '#pwi-pref-modal{',
        'background:#1e293b;color:#e2e8f0;border-radius:10px;',
        'width:min(520px,calc(100vw - 32px));',
        'max-height:calc(100vh - 48px);overflow-y:auto;',
        'padding:28px 24px;',
        'font-family:Rubik,system-ui,sans-serif;font-size:14px;',
        'box-shadow:0 20px 60px rgba(0,0,0,.5);',
      '}',
      '#pwi-pref-modal h2{margin:0 0 6px;font-size:18px;color:#fff;}',
      '#pwi-pref-modal p.pwi-pm-sub{margin:0 0 20px;color:#94a3b8;line-height:1.5;}',
      '.pwi-pm-group{',
        'border:1px solid rgba(255,255,255,.1);border-radius:8px;',
        'padding:14px 16px;margin-bottom:12px;',
      '}',
      '.pwi-pm-group-head{display:flex;align-items:center;justify-content:space-between;gap:12px;}',
      '.pwi-pm-group-head strong{color:#f1f5f9;font-size:14px;}',
      '.pwi-pm-group p{margin:8px 0 0;color:#94a3b8;line-height:1.5;font-size:13px;}',
      '.pwi-toggle{position:relative;display:inline-block;width:42px;height:24px;flex-shrink:0;}',
      '.pwi-toggle input{opacity:0;width:0;height:0;}',
      '.pwi-toggle-track{',
        'position:absolute;inset:0;background:#334155;border-radius:24px;',
        'cursor:pointer;transition:background .25s;',
      '}',
      '.pwi-toggle input:checked~.pwi-toggle-track{background:#1e4ed8;}',
      '.pwi-toggle-track::after{',
        'content:"";position:absolute;',
        'top:3px;left:3px;width:18px;height:18px;',
        'background:#fff;border-radius:50%;transition:transform .25s;',
      '}',
      '.pwi-toggle input:checked~.pwi-toggle-track::after{transform:translateX(18px);}',
      '.pwi-toggle input:disabled~.pwi-toggle-track{opacity:.5;cursor:not-allowed;}',
      '#pwi-pref-footer{display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end;margin-top:20px;}',
      '#pwi-pref-footer button{',
        'cursor:pointer;border:none;border-radius:6px;',
        'padding:9px 18px;font-size:13px;font-weight:500;',
        'font-family:inherit;transition:opacity .2s;',
      '}',
      '#pwi-pref-footer button:hover{opacity:.85;}',
      '#pwi-pref-reject-all{background:rgba(255,255,255,.1);color:#e2e8f0;}',
      '#pwi-pref-save{background:#1e4ed8;color:#fff;}',
      '@media (max-width:430px){',
        '#pwi-cookie-banner{bottom:1rem;left:1rem;}',
        '#pwi-cb-close{min-width:44px;min-height:44px;padding:10px;display:inline-flex;align-items:center;justify-content:center;}',
        '#pwi-cb-actions{align-items:stretch;}',
      '}'
    ].join('');
    document.head.appendChild(style);
  }

  function createBanner() {
    var el = document.createElement('div');
    el.id = 'pwi-cookie-banner';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Cookie consent');
    el.innerHTML = [
      '<button id="pwi-cb-close" type="button" aria-label="Reject all cookies and close">&times;</button>',
      '<div id="pwi-cb-text">',
      '  <p>We use cookies to run this site. You can accept all cookies, reject optional cookies, or choose in cookie settings. Read our <a href="cookie-policy.html">Cookie Policy</a> and <a href="privacy-statement.html">Privacy Statement</a>.</p>',
      '</div>',
      '<div id="pwi-cb-actions">',
      '  <button id="pwi-cb-accept" type="button">Accept all cookies</button>',
      '  <button id="pwi-cb-reject" type="button">Reject all cookies</button>',
      '  <button id="pwi-cb-prefs" type="button">Cookie settings</button>',
      '</div>'
    ].join('');
    return el;
  }

  function createModal() {
    var el = document.createElement('div');
    el.id = 'pwi-pref-overlay';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-labelledby', 'pwi-pref-title');
    el.innerHTML = [
      '<div id="pwi-pref-modal" tabindex="-1">',
      '  <h2 id="pwi-pref-title">Cookie settings</h2>',
      '  <p class="pwi-pm-sub">Turn optional cookies on or off. Necessary cookies stay on so the site can work.</p>',
      '  <div class="pwi-pm-group">',
      '    <div class="pwi-pm-group-head">',
      '      <strong>Necessary</strong>',
      '      <label class="pwi-toggle" aria-label="Necessary cookies (always on)">',
      '        <input type="checkbox" checked disabled>',
      '        <span class="pwi-toggle-track"></span>',
      '      </label>',
      '    </div>',
      '    <p>Required for the site to function (navigation, form submissions, security). Cannot be disabled.</p>',
      '  </div>',
      '  <div class="pwi-pm-group">',
      '    <div class="pwi-pm-group-head">',
      '      <strong>Analytics</strong>',
      '      <label class="pwi-toggle" aria-label="Analytics cookies">',
      '        <input type="checkbox" id="pwi-toggle-analytics">',
      '        <span class="pwi-toggle-track"></span>',
      '      </label>',
      '    </div>',
      '    <p>Helps us understand which pages are visited and how visitors navigate. Data is aggregated.</p>',
      '  </div>',
      '  <div class="pwi-pm-group">',
      '    <div class="pwi-pm-group-head">',
      '      <strong>Marketing</strong>',
      '      <label class="pwi-toggle" aria-label="Marketing cookies">',
      '        <input type="checkbox" id="pwi-toggle-marketing">',
      '        <span class="pwi-toggle-track"></span>',
      '      </label>',
      '    </div>',
      '    <p>Used to measure advertising effectiveness. Not currently in active use.</p>',
      '  </div>',
      '  <div id="pwi-pref-footer">',
      '    <button id="pwi-pref-reject-all" type="button">Reject all cookies</button>',
      '    <button id="pwi-pref-save" type="button">Save my choices</button>',
      '  </div>',
      '</div>'
    ].join('');
    return el;
  }

  function hideBanner(banner) {
    banner.classList.remove('pwi-cb-visible');
    setTimeout(function () { banner.style.display = 'none'; }, 400);
  }

  function openModal(overlay) {
    var consent = getConsent();
    if (consent) {
      document.getElementById('pwi-toggle-analytics').checked = !!consent.analytics;
      document.getElementById('pwi-toggle-marketing').checked = !!consent.marketing;
    }
    overlay.classList.add('pwi-pref-open');
    var modal = overlay.querySelector('#pwi-pref-modal');
    modal.focus();
    if (!overlay._focusTrapWired) {
      trapFocus(overlay);
      overlay._focusTrapWired = true;
    }
  }

  function closeModal(overlay) { overlay.classList.remove('pwi-pref-open'); }

  function trapFocus(overlay) {
    overlay.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab' || !overlay.classList.contains('pwi-pref-open')) return;
      var modal = overlay.querySelector('#pwi-pref-modal');
      var focusable = Array.prototype.slice.call(
        modal.querySelectorAll('button:not([disabled]),input:not([disabled]),[tabindex]:not([tabindex="-1"])')
      );
      if (!focusable.length) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }

  function wireModal(overlay, banner) {
    document.getElementById('pwi-pref-reject-all').addEventListener('click', function () {
      document.getElementById('pwi-toggle-analytics').checked = false;
      document.getElementById('pwi-toggle-marketing').checked = false;
      saveConsent(false, false);
      closeModal(overlay);
      if (banner) hideBanner(banner);
    });

    document.getElementById('pwi-pref-save').addEventListener('click', function () {
      var a = document.getElementById('pwi-toggle-analytics').checked;
      var m = document.getElementById('pwi-toggle-marketing').checked;
      saveConsent(a, m);
      closeModal(overlay);
      if (banner) hideBanner(banner);
    });

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeModal(overlay);
    });
  }

  function init() {
    var existing = getConsent();
    if (existing && existing.version === POLICY_VERSION) {
      return;
    }

    var built = createBanner();
    var overlay = createModal();

    injectStyles();
    document.body.appendChild(built);
    document.body.appendChild(overlay);

    setTimeout(function () { built.classList.add('pwi-cb-visible'); }, 300);

    document.getElementById('pwi-cb-accept').addEventListener('click', function () {
      saveConsent(true, true);
      hideBanner(built);
    });

    document.getElementById('pwi-cb-reject').addEventListener('click', function () {
      saveConsent(false, false);
      hideBanner(built);
    });

    document.getElementById('pwi-cb-close').addEventListener('click', function () {
      saveConsent(false, false);
      hideBanner(built);
    });

    document.getElementById('pwi-cb-prefs').addEventListener('click', function () {
      openModal(overlay);
    });

    wireModal(overlay, built);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeModal(overlay);
    });
  }

  window.PWICookies = {
    getConsent: getConsent,
    openPreferences: function () {
      var overlay = document.getElementById('pwi-pref-overlay');
      if (overlay) { openModal(overlay); return; }
      var o = createModal();
      injectStyles();
      document.body.appendChild(o);
      openModal(o);
      wireModal(o, null);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
