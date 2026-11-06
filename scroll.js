// Smooth vertical scrolling (Lenis) for the Work and Info pages.
// Lenis skips smoothing on its own when the system asks for reduced motion.
(function () {
  var panes = Array.prototype.slice.call(document.querySelectorAll('[data-lenis-pane]'));
  if (!panes.length) {
    new Lenis({ autoRaf: true, anchors: true });
    return;
  }

  // Work and Info: on desktop each column (text, images) is its own scroll area
  // with its own Lenis, so they move independently; the wheel scrolls the column
  // under the cursor. The footer slides up only when the longer column reaches
  // its end. On tablet and phone the columns stack (styles.css), and the page
  // scrolls as a whole. Switches live when the window crosses the breakpoint.
  var twoColumns = matchMedia('(min-width: 1101px)');
  var footer = document.querySelector('.site-footer');
  var instances = [];
  var longest = null; // the Lenis of the column with more to scroll

  function updateFooter() {
    if (!longest) return;
    // as soon as the column is heading to its end (Lenis's target), without
    // waiting for the smooth scroll to finish easing in; or nothing to scroll
    var atEnd = longest.limit <= 2 || longest.targetScroll >= longest.limit - 2;
    document.body.classList.toggle('footer-visible', atEnd);
  }

  function measure() {
    if (!twoColumns.matches) return;
    // The footer's height is fractional (its spacing follows the window height),
    // so its room is rounded up, plus 1px for the smooth scroll stopping half a
    // pixel short of the end: the last line of the list always ends above the footer.
    var footerHeight = footer.getBoundingClientRect().height;
    var footerSpace = Math.ceil(footerHeight) + 1;
    document.body.style.setProperty('--footer-space', footerSpace + 'px');
    // and exactly, for the Gallery view, whose last line keeps a set distance from the footer's text
    document.body.style.setProperty('--footer-h', footerHeight + 'px');
    if (document.body.classList.contains('page-work')) sizeWorkImages();
    instances.forEach(function (lenis) { lenis.resize(); });
    longest = instances.reduce(function (a, b) { return b.limit > a.limit ? b : a; });
    updateFooter();
  }

  // Work only: each image as wide as the image column and as tall as its own
  // proportions (the exported images', 930:688), so none is ever cropped;
  // rounded down to whole pixels, like the list's rows, so it never comes out
  // wider than the column
  var SHOT_RATIO = 930 / 688;
  function sizeWorkImages() {
    var gallery = panes[1];
    var style = getComputedStyle(gallery);
    var width = gallery.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    document.body.style.setProperty('--shot-h', Math.floor(width / SHOT_RATIO) + 'px');
  }

  // Text columns start a little above their content box (padding-top in
  // styles.css), so the tops of the first line's letters aren't clipped while
  // the column rests at the top. As soon as it scrolls at all, that whole room is
  // clipped away, so nothing ever rises past the top of the content.
  function clipTop(pane, lenis) {
    var room = parseFloat(getComputedStyle(pane).paddingTop) || 0;
    var scrolled = lenis.scroll > 0.01 || lenis.targetScroll > 0.01;
    pane.style.clipPath = room && scrolled ? 'inset(' + room + 'px 0 0 0)' : '';
  }

  function setup() {
    instances.forEach(function (lenis) { lenis.destroy(); });
    panes.forEach(function (pane) { pane.style.clipPath = ''; });
    document.body.classList.remove('footer-visible');
    document.body.style.removeProperty('--footer-space');
    document.body.style.removeProperty('--footer-h');
    document.body.style.removeProperty('--shot-h');
    longest = null;
    if (twoColumns.matches) {
      instances = panes.map(function (pane) {
        var lenis = new Lenis({ wrapper: pane, content: pane.firstElementChild, autoRaf: true });
        lenis.on('scroll', function () {
          clipTop(pane, lenis);
          updateFooter();
        });
        return lenis;
      });
      measure();
    } else {
      instances = [new Lenis({ autoRaf: true, anchors: true })];
    }
  }

  setup();
  twoColumns.addEventListener('change', setup);
  // Work: when the image column changes (a project opened or closed, the list
  // filtered or sorted), it starts again from the top
  document.addEventListener('work:gallery', function () {
    if (twoColumns.matches && instances[1]) instances[1].scrollTo(0, { immediate: true });
  });
  // Work: switching between the Index and Full views (work.js) shows other
  // columns: measure again (which one is longer, the footer), from the top
  document.addEventListener('work:view', function () {
    if (!twoColumns.matches) return;
    measure();
    instances.forEach(function (lenis) { lenis.scrollTo(0, { immediate: true }); });
  });
  // Work: when the pointer is on an image whose project's row is out of view
  // (work.js), the list scrolls to show it: below, all the way to the list's
  // end; above, just enough to show the row with the 2px line above it (for
  // the first row, the line at the top of the list). Measured from where the
  // list is heading, in case it's still moving.
  document.addEventListener('work:hint', function (event) {
    if (!twoColumns.matches || !instances[0]) return;
    var list = panes[0];
    var lenis = instances[0];
    var box = list.getBoundingClientRect();
    var top = box.top + (parseFloat(getComputedStyle(list).paddingTop) || 0);
    var bottom = Math.min(box.bottom, footer.getBoundingClientRect().top);
    var ahead = lenis.targetScroll - lenis.scroll;
    var row = event.detail.getBoundingClientRect();
    var rowTop = row.top - 2 - ahead;
    var rowBottom = row.bottom - ahead;
    if (rowBottom > bottom) lenis.scrollTo(lenis.limit);
    else if (rowTop < top) lenis.scrollTo(lenis.targetScroll + rowTop - top);
  });
  // Work: a project opened low in the list (work.js, once its text has slid
  // open) makes the list scroll up just enough to show it whole, its line
  // 20px above the bottom of the list (or of the page, on tablet and phone),
  // never past its top
  document.addEventListener('work:opened', function (event) {
    var lenis = instances[0];
    if (!lenis) return;
    lenis.resize(); // the list just grew
    var top = 0;
    var bottom = innerHeight;
    if (twoColumns.matches) {
      var list = panes[0];
      var box = list.getBoundingClientRect();
      top = box.top + (parseFloat(getComputedStyle(list).paddingTop) || 0);
      bottom = Math.min(box.bottom, footer.getBoundingClientRect().top);
    }
    var ahead = lenis.targetScroll - lenis.scroll;
    var row = event.detail.getBoundingClientRect();
    var margin = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--gutter')) || 15;
    var over = Math.min(row.bottom - ahead - (bottom - margin), row.top - 2 - ahead - top);
    if (over > 0) lenis.scrollTo(lenis.targetScroll + over);
  });
  // which column is longer can change with the window size (and as images load)
  new ResizeObserver(measure).observe(document.querySelector('main'));
  panes.forEach(function (pane) { new ResizeObserver(measure).observe(pane.firstElementChild); });
})();
