// Phones: MENU + opens PROJECTS, ABOUT, EN / PT, the footer and, at the top,
// "Graphic Design and Illustration" over the page
// (styles.css), coming down in the page's colours inverted, and closes them
// again (going back up), as does Escape. While it's open the rest of the
// page is inert and doesn't scroll under it (Lenis leaves it alone). It's
// closed again when the screen grows past a phone's, on the browser's back,
// and on leaving the page (so it isn't open on coming back to it).
(function () {
  var header = document.querySelector('.site-header');
  var toggle = header && header.querySelector('.menu-toggle');
  if (!toggle) return;
  var items = document.getElementById(toggle.getAttribute('aria-controls'));
  var madeInert = [];
  // a copy of the footer at the menu's bottom (shown only there, on phones)
  var footer = document.querySelector('body > .site-footer');
  if (footer) items.appendChild(footer.cloneNode(true));
  // and at its top, what Diogo does: "Graphic Design and Illustration", as
  // the footer has it (with its Portuguese)
  var tagline = footer && footer.querySelector('p:nth-of-type(2)');
  if (tagline) {
    tagline = tagline.cloneNode(true);
    tagline.className = 'menu-tagline';
    items.insertBefore(tagline, items.firstChild);
  }
  // the phone browser's bars in the menu's colour while it's open (the page's
  // colours inverted), and back once it has gone up (styles.css)
  var bar = document.querySelector('meta[name="theme-color"]');
  var CLOSING = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 700;
  var barTimer = null;
  function paintBar(open) {
    if (!bar) return;
    var dark = document.documentElement.dataset.theme === 'dark';
    bar.content = dark === open ? '#ffffff' : '#000000';
  }

  function isOpen() { return header.classList.contains('is-open'); }
  function setOpen(open) {
    if (isOpen() === open) return;
    header.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    clearTimeout(barTimer);
    if (open) paintBar(true);
    else barTimer = setTimeout(function () { paintBar(false); }, CLOSING);
    if (open) {
      items.setAttribute('data-lenis-prevent', '');
      Array.prototype.forEach.call(document.body.children, function (el) {
        if (el !== header && !el.inert) { el.inert = true; madeInert.push(el); }
      });
    } else {
      items.removeAttribute('data-lenis-prevent');
      madeInert.forEach(function (el) { el.inert = false; });
      madeInert = [];
    }
  }

  toggle.addEventListener('click', function () { setOpen(!isOpen()); });
  // before Work's own Escape, which would close a project behind the menu
  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape' || !isOpen()) return;
    event.stopImmediatePropagation();
    setOpen(false);
    toggle.focus();
  }, true);
  var phone = matchMedia('(max-width: 640px)');
  function closeIfWide() { if (!phone.matches) setOpen(false); }
  phone.addEventListener('change', closeIfWide);
  window.addEventListener('resize', closeIfWide); // (where the change isn't reported)
  window.addEventListener('popstate', function () { setOpen(false); });
  window.addEventListener('pagehide', function () { setOpen(false); });
})();
