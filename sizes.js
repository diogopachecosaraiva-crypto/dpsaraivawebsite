// Responsive images: each <img> with a srcset (smaller copies made by
// _originais/tools/responsive.py) gets its sizes set to the width it's
// actually drawn at, so the browser loads the smallest copy that's still
// sharp on that screen. Kept up to date as images change size (a resize, the
// Index's images opening full size) and for the copies the Home and Work make
// of them. An image cropped to fill its frame (object-fit: cover) needs as
// many pixels as the frame cuts from, once its proportions are known.
// Lazy images load after this has run; the page's own sizes is a first guess.
(function () {
  function needed(img) {
    var box = img.getBoundingClientRect();
    var w = box.width;
    if (getComputedStyle(img).objectFit === 'cover' && img.naturalWidth && box.height) {
      w = Math.max(w, box.height * img.naturalWidth / img.naturalHeight);
    }
    return Math.ceil(w);
  }
  function update(img) {
    var w = needed(img);
    if (!w) return; // not shown (a hidden pane, a closed project)
    var value = w + 'px';
    if (img.getAttribute('sizes') !== value) img.setAttribute('sizes', value);
  }

  var sized = new ResizeObserver(function (entries) {
    entries.forEach(function (entry) { update(entry.target); });
  });
  function watch(img) {
    sized.observe(img);
    // once the proportions are known, a cropped image may need more
    img.addEventListener('load', function () { update(img); });
  }
  function watchAll(root) {
    if (root.matches && root.matches('img[srcset]')) watch(root);
    if (root.querySelectorAll) Array.prototype.forEach.call(root.querySelectorAll('img[srcset]'), watch);
  }

  watchAll(document);
  new MutationObserver(function (records) {
    records.forEach(function (record) {
      Array.prototype.forEach.call(record.addedNodes, function (node) {
        if (node.nodeType === 1) watchAll(node);
      });
    });
  }).observe(document.documentElement, { childList: true, subtree: true });
})();
