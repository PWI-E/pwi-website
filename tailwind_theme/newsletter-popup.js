/**
 * PWI newsletter signup popup
 * Remembers subscribe / dismiss in localStorage (per browser).
 * Always waits for cookie consent before showing.
 */
(function () {
  'use strict';

  var STORAGE_SUBSCRIBED = 'pwi_newsletter_subscribed';
  var STORAGE_DISMISSED = 'pwi_newsletter_dismissed';
  var STORAGE_SNOOZED = 'pwi_newsletter_snoozed'; // sessionStorage: cleared when the browser closes
  var CONSENT_KEY = 'pwi_cookie_consent';
  var CONSENT_VERSION = '1.1';
  var DISMISS_MS = 90 * 24 * 60 * 60 * 1000; // legacy timestamp dismissals
  var SHOW_DELAY_MS = 3000;
  var POST_CONSENT_DELAY_MS = 1500;
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var SKIP_PAGES = {
    'newsletter-signup.html': true,
    'contact-form.html': true,
    'request-quote.html': true,
    '404.html': true
  };

  var overlay = null;
  var showTimer = null;
  var cookiesHandled = false;
  var stylesInjected = false;

  function pageName() {
    var p = location.pathname.split('/').pop();
    if (!p || p === '') return 'index.html';
    return p;
  }

  function blocked() {
    return SKIP_PAGES[pageName()] || isSubscribed() || isDismissed() || isSnoozed();
  }

  function isSubscribed() {
    try { return localStorage.getItem(STORAGE_SUBSCRIBED) === '1'; } catch (e) { return false; }
  }

  function isDismissed() {
    try {
      var raw = localStorage.getItem(STORAGE_DISMISSED);
      if (!raw) return false;
      if (raw === '1' || raw === 'forever') return true;
      var ts = parseInt(raw, 10);
      if (!ts || isNaN(ts)) return false;
      return (Date.now() - ts) < DISMISS_MS;
    } catch (e) { return false; }
  }

  function markSubscribed() {
    try {
      localStorage.setItem(STORAGE_SUBSCRIBED, '1');
      localStorage.removeItem(STORAGE_DISMISSED);
    } catch (e) {}
    hidePopup();
  }

  function markDismissed() {
    // Explicit "No thanks" — never show again.
    try { localStorage.setItem(STORAGE_DISMISSED, 'forever'); } catch (e) {}
    hidePopup();
  }

  function isSnoozed() {
    try { return sessionStorage.getItem(STORAGE_SNOOZED) === '1'; } catch (e) { return false; }
  }

  function markSnoozed() {
    // Backdrop click, Escape, or close button — hide for the rest of this visit only.
    try { sessionStorage.setItem(STORAGE_SNOOZED, '1'); } catch (e) {}
    hidePopup();
  }

  function hasCookieConsent() {
    try {
      var c = JSON.parse(localStorage.getItem(CONSENT_KEY));
      return !!(c && c.version === CONSENT_VERSION);
    } catch (e) { return false; }
  }

  /** True while cookie banner or cookie settings modal needs attention. */
  function isCookieUiBlocking() {
    var banner = document.getElementById('pwi-cookie-banner');
    if (banner && banner.style.display !== 'none') return true;
    var pref = document.getElementById('pwi-pref-overlay');
    if (pref && pref.classList.contains('pwi-pref-open')) return true;
    if (!hasCookieConsent()) return true;
    return false;
  }

  function injectStyles() {
    if (stylesInjected) return;
    stylesInjected = true;
    var style = document.createElement('style');
    style.textContent = [
      '#pwi-nl-popup-overlay{',
        'display:none;position:fixed;inset:0;z-index:9980;',
        'background:rgba(2,8,23,0.62);align-items:center;justify-content:center;padding:1rem;',
      '}',
      '#pwi-nl-popup-overlay.pwi-nl-open{display:flex;}',
      '#pwi-nl-popup{',
        'position:relative;',
        'background:#0d1e40;color:#e2e8f0;',
        'border-radius:14px;text-align:left;',
        'width:min(500px,calc(100vw - 2rem));',
        'padding:20px 22px 14px;',
        'border:1px solid rgba(96,165,250,0.25);',
        'box-shadow:0 20px 48px rgba(0,0,0,0.4);',
        'font-family:Rubik,system-ui,sans-serif;',
        'opacity:0;transform:translateY(10px) scale(0.98);',
        'transition:opacity .3s ease,transform .3s ease;',
      '}',
      '#pwi-nl-popup-overlay.pwi-nl-open #pwi-nl-popup{opacity:1;transform:none;}',
      '#pwi-nl-popup-close{',
        'position:absolute;top:10px;right:10px;border:none;background:none;',
        'cursor:pointer;color:#64748b;font-size:22px;line-height:1;padding:6px;',
        'font-family:inherit;transition:color .2s;',
      '}',
      '#pwi-nl-popup-close:hover{color:#e2e8f0;}',
      '#pwi-nl-popup-eyebrow{',
        'margin:0 0 6px;font-size:0.6875rem;font-weight:700;letter-spacing:0.1em;',
        'text-transform:uppercase;color:#60a5fa;',
      '}',
      '#pwi-nl-popup h2{',
        'margin:0 0 6px;padding-right:1.75rem;font-size:1.05rem;',
        'font-weight:600;color:#f1f5f9;line-height:1.3;letter-spacing:-0.01em;',
        'text-wrap:pretty;',
      '}',
      '#pwi-nl-popup-lede{margin:0 0 14px;font-size:0.8rem;line-height:1.45;color:#94a3b8;text-wrap:pretty;}',
      '#pwi-nl-popup-form{',
        'display:grid;grid-template-columns:1fr auto;column-gap:8px;row-gap:0;margin-bottom:0;',
      '}',
      '#pwi-nl-popup-email{',
        'grid-column:1;grid-row:1;',
        'flex:1;min-width:0;border:1px solid rgba(148,163,184,0.22);outline:none;border-radius:9999px;',
        'background:rgba(15,23,42,0.35);color:#cbd5e1;font-size:0.8125rem;padding:0.6rem 0.9rem;font-family:inherit;',
      '}',
      '#pwi-nl-popup-email::placeholder{color:#64748b;opacity:1;font-size:0.8125rem;}',
      '#pwi-nl-popup-email:focus{border-color:rgba(96,165,250,0.45);background:rgba(15,23,42,0.5);}',
      '#pwi-nl-popup-submit{',
        'grid-column:2;grid-row:1;align-self:center;',
        'flex-shrink:0;width:auto;cursor:pointer;border:none;border-radius:9999px;background:#1e4ed8;color:#fff;',
        'padding:0.6rem 1rem;font-size:0.6875rem;font-weight:700;letter-spacing:0.12em;',
        'text-transform:uppercase;font-family:inherit;transition:background .18s ease;white-space:nowrap;',
      '}',
      '#pwi-nl-popup-submit:hover{background:#1b46c4;}',
      '#pwi-nl-popup-actions{grid-column:1/-1;grid-row:2;margin-top:10px;text-align:center;}',
      '#pwi-nl-popup-dismiss{',
        'cursor:pointer;border:none;background:transparent;',
        'color:#64748b;font-size:0.75rem;font-weight:500;font-family:inherit;padding:4px 8px;',
        'transition:color .2s ease;',
      '}',
      '#pwi-nl-popup-dismiss:hover{color:#94a3b8;text-decoration:underline;}',
      '#pwi-nl-popup-fine{margin:12px 0 0;font-size:0.72rem;line-height:1.45;color:#94a3b8;text-wrap:pretty;}',
      '#pwi-nl-popup-fine a{color:#93c5fd;text-decoration:underline;text-underline-offset:2px;}',
      '#pwi-nl-popup-fine a:hover{color:#bfdbfe;}',
      '@media (max-width:430px){',
        '#pwi-nl-popup{width:min(100%,calc(100vw - 1.5rem));padding:18px 16px 12px;}',
        '#pwi-nl-popup-form{grid-template-columns:1fr;}',
        '#pwi-nl-popup-email{grid-row:1;}',
        '#pwi-nl-popup-submit{grid-column:1;grid-row:2;width:100%;padding:0.7rem;}',
        '#pwi-nl-popup-actions{grid-row:3;margin-top:10px;}',
      '}',
      '@media (prefers-reduced-motion:reduce){',
        '#pwi-nl-popup{transition:none;}',
      '}'
    ].join('');
    document.head.appendChild(style);
  }

  function createPopup() {
    if (overlay) return;
    injectStyles();
    overlay = document.createElement('div');
    overlay.id = 'pwi-nl-popup-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'pwi-nl-popup-title');
    overlay.innerHTML = [
      '<div id="pwi-nl-popup" tabindex="-1">',
      '  <button id="pwi-nl-popup-close" type="button" aria-label="Close newsletter signup">&times;</button>',
      '  <p id="pwi-nl-popup-eyebrow">Stay Updated</p>',
      '  <h2 id="pwi-nl-popup-title">Product updates &amp; company&nbsp;news</h2>',
      '  <p id="pwi-nl-popup-lede">New product releases, STC&nbsp;updates, and promotions for aircraft&nbsp;lighting, windings, magnetometers, and&nbsp;engineering.</p>',
      '  <form id="pwi-nl-popup-form" novalidate>',
      '    <label class="sr-only" for="pwi-nl-popup-email">Email address</label>',
      '    <input id="pwi-nl-popup-email" type="email" name="email" autocomplete="email" placeholder="Your email" required/>',
      '    <button id="pwi-nl-popup-submit" type="submit">Continue</button>',
      '    <div id="pwi-nl-popup-actions">',
      '      <button id="pwi-nl-popup-dismiss" type="button">No&nbsp;thanks</button>',
      '    </div>',
      '  </form>',
      '  <p id="pwi-nl-popup-fine">Continue on the next&nbsp;page to confirm your&nbsp;interests. Unsubscribe&nbsp;anytime. <a href="privacy-statement.html">Privacy&nbsp;Statement</a></p>',
      '</div>'
    ].join('');
    document.body.appendChild(overlay);

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) markSnoozed();
    });

    document.getElementById('pwi-nl-popup-close').addEventListener('click', markSnoozed);
    document.getElementById('pwi-nl-popup-dismiss').addEventListener('click', markDismissed);

    document.getElementById('pwi-nl-popup-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var input = document.getElementById('pwi-nl-popup-email');
      var raw = String(input && input.value || '').trim();
      if (!raw || !EMAIL_RE.test(raw)) {
        if (input) input.focus();
        return;
      }
      try {
        sessionStorage.setItem('pwi_newsletter_email', raw);
        sessionStorage.setItem('pwi_newsletter_from', 'popup');
      } catch (err) {}
      window.location.href = 'newsletter-signup.html';
    });

    document.addEventListener('keydown', function onKey(e) {
      if (e.key === 'Escape' && overlay && overlay.classList.contains('pwi-nl-open')) {
        markSnoozed();
      }
    });
  }

  function showPopup() {
    if (blocked() || !hasCookieConsent() || isCookieUiBlocking()) {
      queuePopup();
      return;
    }
    if (!document.body) {
      queuePopup();
      return;
    }
    createPopup();
    overlay.classList.add('pwi-nl-open');
    var modal = overlay.querySelector('#pwi-nl-popup');
    var input = document.getElementById('pwi-nl-popup-email');
    if (modal) modal.focus();
    if (input) requestAnimationFrame(function () { input.focus(); });
  }

  function hidePopup() {
    if (showTimer) {
      clearTimeout(showTimer);
      showTimer = null;
    }
    if (overlay) overlay.classList.remove('pwi-nl-open');
  }

  function queuePopup() {
    if (showTimer || blocked()) return;
    showTimer = setTimeout(function () {
      showTimer = null;
      showPopup();
    }, 400);
  }

  function schedulePopup() {
    if (blocked() || !hasCookieConsent() || isCookieUiBlocking()) return;
    if (showTimer) return;
    showTimer = setTimeout(function () {
      showTimer = null;
      showPopup();
    }, SHOW_DELAY_MS);
  }

  function onCookiesResolved() {
    if (blocked()) return;
    cookiesHandled = true;
    setTimeout(function () {
      if (blocked() || !hasCookieConsent() || isCookieUiBlocking()) {
        waitForCookiesThenShow();
        return;
      }
      schedulePopup();
    }, POST_CONSENT_DELAY_MS);
  }

  function waitForCookiesThenShow() {
    var tries = 0;
    var poll = setInterval(function () {
      tries += 1;
      if (blocked()) {
        clearInterval(poll);
        return;
      }
      if (!hasCookieConsent() || isCookieUiBlocking()) return;
      cookiesHandled = true;
      clearInterval(poll);
      schedulePopup();
      if (tries >= 120) clearInterval(poll);
    }, 250);
  }

  function init() {
    if (blocked()) return;
    if (hasCookieConsent() && !isCookieUiBlocking()) {
      onCookiesResolved();
      return;
    }
    waitForCookiesThenShow();
  }

  document.addEventListener('pwi:consent', onCookiesResolved);

  window.PWINewsletter = {
    markSubscribed: markSubscribed,
    markDismissed: markDismissed,
    isSubscribed: isSubscribed
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
