// Light/dark mode is set by each page in its HTML (data-theme on <html>): the
// Home is dark, Work and Info light, and on Work a project opened full size
// turns the page dark while it's open (work.js). Loaded in <head>.
// Also the change from one page to another: following a link to another page
// of the site, a plain block of the next page's background colour fades in
// over the whole page (html::after, styles.css), the next page opens under
// it, and it fades away to show that page's contents.
(function () {
  var root = document.documentElement;
  root.classList.add('js'); // lets CSS tell that scripts run (used by the Home poster shuffle)

  // the phone browser's bars in the page's colour (meta theme-color), also
  // when a project opened full size turns the Work page dark
  var bar = document.querySelector('meta[name="theme-color"]');
  if (bar && 'MutationObserver' in window) {
    new MutationObserver(function () {
      bar.content = root.dataset.theme === 'dark' ? '#000000' : '#ffffff';
    }).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  }

  var LEAVE = 600; // ms, the block fading in (as in styles.css)
  var HOLD = 300;  // ms, the block alone on the new page before it fades away
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // arriving: the page starts under the block (before it's first drawn)
  var covered = false;
  try {
    covered = sessionStorage.getItem('cover') === '1';
    sessionStorage.removeItem('cover');
  } catch (e) {}
  if (covered) {
    root.classList.add('is-covered');
    document.addEventListener('DOMContentLoaded', function () {
      setTimeout(function () { root.classList.remove('is-covered'); }, HOLD);
    });
  }

  // leaving: the Home is dark, every other page light
  document.addEventListener('click', function (e) {
    var link = e.target.closest && e.target.closest('a[href]');
    if (!link || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (link.origin !== location.origin || link.target === '_blank' || link.hasAttribute('download')) return;
    if (link.hash && link.pathname === location.pathname) return;
    e.preventDefault();
    root.dataset.next = /(^|\/)(index(\.html)?)?$/.test(link.pathname) ? 'dark' : 'light';
    root.classList.add('is-leaving');
    try { sessionStorage.setItem('cover', '1'); } catch (err) {}
    setTimeout(function () { location.href = link.href; }, LEAVE);
  });
  // back to a page kept by the browser as it was left: without the block
  window.addEventListener('pageshow', function (e) {
    if (e.persisted) root.classList.remove('is-leaving', 'is-covered');
  });
})();
