// Auto-set aria-current="page" on the matching nav link and product row links
(function() {
  var page = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.site-header a[href], a.rowlink[href]').forEach(function(a) {
    var href = a.getAttribute('href');
    if (href === page || (page === '' && href === 'index.html')) {
      a.setAttribute('aria-current', 'page');
    }
  });
})();
