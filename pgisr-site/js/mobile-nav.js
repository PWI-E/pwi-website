/**
 * Mobile navigation — open/close, body scroll lock, escape to close.
 */
(function () {
  'use strict';

  var btn = document.getElementById('mobile-toggle');
  var nav = document.getElementById('mobile-nav');
  if (!btn || !nav) return;

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function setOpen(open) {
    nav.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    document.documentElement.classList.toggle('mobile-nav-open', open);
    document.body.classList.toggle('mobile-nav-open', open);
    if (open && !reduced) {
      nav.classList.remove('is-animating');
      void nav.offsetWidth;
      nav.classList.add('is-animating');
    }
  }

  btn.addEventListener('click', function () {
    setOpen(!nav.classList.contains('open'));
  });

  nav.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', function () {
      setOpen(false);
    });
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && nav.classList.contains('open')) {
      setOpen(false);
      btn.focus();
    }
  });
}());
