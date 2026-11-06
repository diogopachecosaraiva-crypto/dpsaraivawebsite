// The vertical strokes between the Work filters and between EN and PT (as
// thick as the project list's lines, --stroke in styles.css) follow their
// words, so they rarely start on a whole pixel and would be drawn softer than
// the lines. Each one is
// nudged sideways onto the nearest pixel of the screen (by less than half a
// pixel, with translate, so nothing else moves). Again whenever the words can
// move: once the font is in, on resize, a language change or another filter
// turning bold.
(function () {
  function onPixel(x) {
    var ratio = window.devicePixelRatio || 1;
    return Math.round(x * ratio) / ratio - x;
  }

  function snap() {
    // the filters' strokes end their word's span (styles.css)
    document.querySelectorAll('.filter-types button:not(:last-child) > span, .filter-view button:not(:last-child) > span').forEach(function (span) {
      var width = parseFloat(getComputedStyle(span, '::after').width);
      span.style.setProperty('--nudge', onPixel(span.getBoundingClientRect().right - width) + 'px');
    });
    var sep = document.querySelector('.lang-sep');
    if (sep) {
      sep.style.translate = '';
      sep.style.translate = onPixel(sep.getBoundingClientRect().left) + 'px';
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    snap();
    if (document.fonts) document.fonts.ready.then(snap);
    window.addEventListener('resize', snap);
    document.addEventListener('langchange', snap);
    var filters = document.querySelector('.filters');
    if (filters) new MutationObserver(snap).observe(filters, { subtree: true, attributes: true, attributeFilter: ['aria-pressed'] });
  });
})();
