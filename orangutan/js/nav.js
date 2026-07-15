(function () {
  var nav = document.querySelector('.site-nav');
  var toggle = document.querySelector('.site-nav__toggle');
  var menu = document.querySelector('.site-nav__menu');

  function syncNavHeight() {
    if (!nav) return;
    var inner = nav.querySelector('.site-nav__inner');
    var height = inner ? inner.offsetHeight : nav.offsetHeight;
    document.documentElement.style.setProperty('--nav-height', height + 'px');
  }

  function syncScrollState() {
    if (!nav) return;
    nav.classList.toggle('is-scrolled', window.scrollY > 20);
  }

  function closeMenu() {
    if (!menu || !toggle) return;
    menu.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    syncNavHeight();
  }

  syncNavHeight();
  syncScrollState();
  window.addEventListener('resize', syncNavHeight);
  window.addEventListener('scroll', syncScrollState, { passive: true });

  if (toggle && menu) {
    toggle.addEventListener('click', function () {
      var open = menu.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open);
      syncNavHeight();
    });

    menu.addEventListener('click', function (e) {
      if (e.target.closest('.site-nav__link')) closeMenu();
    });
  }
})();
