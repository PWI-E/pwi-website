/**
 * QR landing pages — fire qr_scan only when analytics consent was granted elsewhere.
 */
(function () {
  'use strict';
  try {
    var c = JSON.parse(localStorage.getItem('pwi_cookie_consent'));
    if (!c || !c.analytics || typeof gtag !== 'function') return;
    var product = document.documentElement.getAttribute('data-qr-product');
    if (!product) return;
    gtag('consent', 'update', { analytics_storage: 'granted' });
    gtag('event', 'qr_scan', {
      product: product,
      event_category: 'qr',
      event_label: product
    });
  } catch (e) { /* ignore */ }
})();
